const STORAGE_KEY = 'phd-os-github-pages-v1';
const SECTIONS = {
  home: { title: '总览', subtitle: '今日执行、专注、打卡、时间块，以及毕业时间进度。' },
  projects: { title: '项目与任务', subtitle: '项目管理长期目标，任务承接具体动作，保持一条线到底。' },
  thesis: { title: '论文进度', subtitle: '把论文推进、毕业时间轴和章节完成度放进一个系统。' },
  submissions: { title: '投稿管理', subtitle: '记录 stage、期限和推进日志，最后一键导出 Markdown。' },
  health: { title: '健康管理', subtitle: '习惯、饮食、体重放在一页，更适合博士阶段长期跟踪。' },
  care: { title: '心灵关怀', subtitle: '记录压力、能量、自我关怀与边界，让恢复成为系统的一部分。' },
  mentor: { title: '导师沟通', subtitle: '向上管理不是对抗，而是降低不确定性。' },
  review: { title: '每日复盘', subtitle: '把成果、拖延分析、洞见和明日计划写清楚。' },
  achievements: { title: '成就', subtitle: '用小型里程碑强化长期反馈。' },
  dashboard: { title: '数据看板', subtitle: '用简洁可视化看过去 8 周的趋势和结构。' },
  settings: { title: '设置与数据', subtitle: '导出、导入、清空数据，以及 GitHub Pages 部署说明。' }
};
const STAGES = ['Idea','Drafting','Internal Review','Submitted','Revision','Accepted','Published'];
const TASK_STATUS_META = {
  planned: { label: '计划中', cls: 'badge' },
  todo: { label: '未开始', cls: 'badge warn' },
  active: { label: '进行中', cls: 'badge' },
  done: { label: '已完成', cls: 'badge success' }
};
const QUADRANT_META = {
  q1: '重要且紧急',
  q2: '重要不紧急',
  q3: '紧急不重要',
  q4: '不紧急不重要'
};
const MOOD_META = {
  overloaded: { emoji: '😣', label: '超载' },
  tense: { emoji: '😕', label: '紧绷' },
  steady: { emoji: '😐', label: '平稳' },
  lighter: { emoji: '🙂', label: '轻松' },
  energized: { emoji: '😊', label: '充沛' }
};
const MENTOR_META = {
  preparing: { emoji: '🧭', label: '准备沟通' },
  waiting: { emoji: '⏳', label: '等待反馈' },
  clarified: { emoji: '✅', label: '已明确' },
  blocked: { emoji: '🧱', label: '被卡住' }
};
let currentSection = 'home';
let editContext = null;

const $ = (id) => document.getElementById(id);
const uid = (prefix='id') => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
const pad = (n) => String(n).padStart(2,'0');
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
};
const nowIso = () => new Date().toISOString();
const escapeHtml = (s='') => String(s).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const deepClone = (v) => JSON.parse(JSON.stringify(v));
function dateLabel(dateStr){
  if(!dateStr) return '未设定';
  const d = new Date(dateStr + 'T00:00:00');
  if(Number.isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function minutesBetween(a, b){
  const start = new Date(a).getTime();
  const end = new Date(b).getTime();
  return Math.max(0, Math.round((end - start) / 60000));
}
function formatMinutes(n){
  const min = Math.max(0, Math.round(Number(n) || 0));
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}小时${m}分` : `${m}分钟`;
}
function formatDateTime(iso){
  if(!iso) return '—';
  const d = new Date(iso);
  if(Number.isNaN(d.getTime())) return iso;
  return `${dateLabel(iso.slice(0,10))} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function isoDate(iso){ return String(iso || '').slice(0,10); }
function weekStart(date = new Date()){
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() - day + 1);
  return d;
}
function getISOWeekInfo(date = new Date()){
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return { year: d.getUTCFullYear(), week: weekNo };
}
function isoWeeksInYear(year){
  const dec28 = new Date(Date.UTC(year, 11, 28));
  return getISOWeekInfo(dec28).week;
}
function clamp(v,min,max){ return Math.min(max, Math.max(min, v)); }
function percent(a,b){ return b <= 0 ? 0 : clamp((a / b) * 100, 0, 100); }
function sum(arr, fn = (x)=>x){ return arr.reduce((s, x) => s + Number(fn(x) || 0), 0); }
function compareDescBy(key){ return (a,b) => String(b[key]||'').localeCompare(String(a[key]||'')); }
function downloadText(filename, content, type='text/plain;charset=utf-8'){
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
function defaultState(){
  return {
    prefs: { sidebarHidden: false },
    attendance: { workLogs: [], leaves: [] },
    focus: { active: null, sessions: [] },
    projects: [],
    tasks: [],
    schedule: [],
    thesis: {
      meta: { title:'', version:'', note:'', enrollmentDate:'', graduationDate:'', defenseDate:'' },
      milestones: [],
      chapters: [],
      logs: []
    },
    submissions: [],
    submissionLogs: [],
    health: { habits: [], foods: [], weights: [] },
    care: {},
    mentor: {},
    reviewDaily: {}
  };
}
function normalizeState(raw){
  const base = defaultState();
  const x = raw && typeof raw === 'object' ? raw : {};
  return {
    prefs: { sidebarHidden: !!x?.prefs?.sidebarHidden },
    attendance: {
      workLogs: Array.isArray(x?.attendance?.workLogs) ? x.attendance.workLogs : [],
      leaves: Array.isArray(x?.attendance?.leaves) ? x.attendance.leaves : []
    },
    focus: {
      active: x?.focus?.active || null,
      sessions: Array.isArray(x?.focus?.sessions) ? x.focus.sessions : []
    },
    projects: Array.isArray(x.projects) ? x.projects : [],
    tasks: Array.isArray(x.tasks) ? x.tasks : [],
    schedule: Array.isArray(x.schedule) ? x.schedule : [],
    thesis: {
      meta: { ...base.thesis.meta, ...(x?.thesis?.meta || {}) },
      milestones: Array.isArray(x?.thesis?.milestones) ? x.thesis.milestones : [],
      chapters: Array.isArray(x?.thesis?.chapters) ? x.thesis.chapters : [],
      logs: Array.isArray(x?.thesis?.logs) ? x.thesis.logs : []
    },
    submissions: Array.isArray(x.submissions) ? x.submissions : [],
    submissionLogs: Array.isArray(x.submissionLogs) ? x.submissionLogs : [],
    health: {
      habits: Array.isArray(x?.health?.habits) ? x.health.habits : [],
      foods: Array.isArray(x?.health?.foods) ? x.health.foods : [],
      weights: Array.isArray(x?.health?.weights) ? x.health.weights : []
    },
    care: x.care && typeof x.care === 'object' ? x.care : {},
    mentor: x.mentor && typeof x.mentor === 'object' ? x.mentor : {},
    reviewDaily: x.reviewDaily && typeof x.reviewDaily === 'object' ? x.reviewDaily : {}
  };
}
function loadState(){
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return normalizeState(parsed);
  } catch {
    return defaultState();
  }
}
let state = loadState();
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

function activeTask(){ return state.tasks.find(t => t.status === 'active') || null; }
function todayWorkLogs(){ return state.attendance.workLogs.filter(x => isoDate(x.start) === todayStr()); }
function todayLeaves(){ return state.attendance.leaves.filter(x => x.date === todayStr()); }
function todayFocusSessions(){ return state.focus.sessions.filter(x => isoDate(x.start) === todayStr()); }
function todaySchedule(){ return state.schedule.filter(x => x.date === todayStr()).sort((a,b) => a.start.localeCompare(b.start)); }
function todayTaskCandidates(){
  const today = todayStr();
  return state.tasks.filter(t => t.status !== 'done' && (!t.dueDate || t.dueDate <= today || t.status === 'active')).concat(
    state.tasks.filter(t => t.status !== 'done' && t.dueDate > today).slice(0,6)
  ).filter((v,i,arr) => arr.findIndex(x => x.id === v.id) === i);
}
function projectById(id){ return state.projects.find(p => p.id === id) || null; }
function submissionById(id){ return state.submissions.find(s => s.id === id) || null; }
function taskMinutesForProject(projectId){
  return sum(state.tasks.filter(t => t.projectId === projectId), t => Number(t.loggedMinutes) || 0);
}
function todayHabitCompletion(){
  const habits = state.health.habits.filter(h => h.active !== false);
  if(!habits.length) return 0;
  const date = todayStr();
  const done = habits.filter(h => habitIsDone(h, date)).length;
  return Math.round(percent(done, habits.length));
}
function habitValueForDate(habit, date){
  return habit.records?.[date];
}
function habitIsDone(habit, date){
  const value = habitValueForDate(habit, date);
  if(habit.mode === 'checkbox') return !!value;
  if(habit.mode === 'count' || habit.mode === 'duration') return Number(value || 0) > 0;
  if(habit.mode === 'text') return !!String(value || '').trim();
  return false;
}
function allMinutesLast8Weeks(){
  const out = [];
  const now = new Date();
  for(let i = 7; i >= 0; i--){
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    const start = weekStart(d);
    const end = new Date(start); end.setDate(end.getDate() + 7);
    const startIso = start.toISOString(); const endIso = end.toISOString();
    const labelInfo = getISOWeekInfo(start);
    const focus = sum(state.focus.sessions.filter(s => s.start >= startIso && s.start < endIso), s => s.minutes);
    const thesis = sum(state.thesis.logs.filter(s => s.at >= startIso && s.at < endIso), s => s.minutes);
    out.push({ label: `${labelInfo.year}W${labelInfo.week}`, minutes: focus + thesis });
  }
  return out;
}
function thesisOverallProgress(){
  const milestonePart = state.thesis.milestones.length ? percent(state.thesis.milestones.filter(m => m.done).length, state.thesis.milestones.length) : 0;
  const chapterPart = state.thesis.chapters.length ? sum(state.thesis.chapters, c => Number(c.progress) || 0) / state.thesis.chapters.length : 0;
  return Math.round((milestonePart + chapterPart) / 2);
}
function thesisTypeBreakdown(){
  const counts = { writing: 0, revise: 0, experiment: 0, meeting: 0, other: 0 };
  state.thesis.logs.forEach(l => counts[l.type] = (counts[l.type] || 0) + 1);
  return counts;
}
function taskStatusBreakdown(){
  const counts = { planned:0, todo:0, active:0, done:0 };
  state.tasks.forEach(t => counts[t.status] = (counts[t.status] || 0) + 1);
  return counts;
}
function runningSubmissionCount(){
  return state.submissions.filter(s => !['Accepted','Published'].includes(s.stage)).length;
}
function graduationProgressData(){
  const meta = state.thesis.meta;
  const start = meta.enrollmentDate ? new Date(meta.enrollmentDate + 'T00:00:00') : null;
  const grad = meta.graduationDate ? new Date(meta.graduationDate + 'T00:00:00') : null;
  const defense = meta.defenseDate ? new Date(meta.defenseDate + 'T00:00:00') : null;
  const now = new Date();
  const currentWeekInfo = getISOWeekInfo(now);
  const weeksInYear = isoWeeksInYear(currentWeekInfo.year);
  const yearProgress = percent(currentWeekInfo.week, weeksInYear);
  const yearRemain = Math.max(0, weeksInYear - currentWeekInfo.week);

  let totalWeeks = 0, elapsedWeeks = 0, gradProgress = 0, gradRemain = 0;
  if(start && grad && grad > start){
    totalWeeks = Math.max(1, Math.ceil((grad - start) / (7 * 86400000)));
    elapsedWeeks = clamp(Math.ceil((now - start) / (7 * 86400000)), 0, totalWeeks);
    gradProgress = percent(elapsedWeeks, totalWeeks);
    gradRemain = Math.max(0, totalWeeks - elapsedWeeks);
  }

  let defenseTotalWeeks = 0, defenseElapsedWeeks = 0, defenseProgress = 0, defenseRemain = 0;
  if(start && defense && defense > start){
    defenseTotalWeeks = Math.max(1, Math.ceil((defense - start) / (7 * 86400000)));
    defenseElapsedWeeks = clamp(Math.ceil((now - start) / (7 * 86400000)), 0, defenseTotalWeeks);
    defenseProgress = percent(defenseElapsedWeeks, defenseTotalWeeks);
    defenseRemain = Math.max(0, defenseTotalWeeks - defenseElapsedWeeks);
  }

  return {
    year: { label: '本年度周进度', pct: yearProgress, primary:`第 ${currentWeekInfo.week}/${weeksInYear} 周`, secondary:`剩余 ${yearRemain} 周` },
    graduation: { label: '毕业时间进度', pct: gradProgress, primary: totalWeeks ? `${elapsedWeeks}/${totalWeeks} 周` : '未设置', secondary: totalWeeks ? `剩余 ${gradRemain} 周` : '请先设置入学与毕业时间' },
    defense: { label: '答辩时间进度', pct: defenseProgress, primary: defenseTotalWeeks ? `${defenseElapsedWeeks}/${defenseTotalWeeks} 周` : '未设置', secondary: defenseTotalWeeks ? `剩余 ${defenseRemain} 周` : '请先设置入学与答辩时间' }
  };
}
function renderRingCard(item, large=false){
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamp(item.pct,0,100)/100);
  return `
    <div class="ring-card">
      <svg class="ring-svg ${large ? 'large' : ''}" viewBox="0 0 120 120" aria-hidden="true">
        <defs>
          <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#88aaff"></stop>
            <stop offset="100%" stop-color="#66e0c2"></stop>
          </linearGradient>
        </defs>
        <circle class="ring-bg" cx="60" cy="60" r="42"></circle>
        <circle class="ring-fg" cx="60" cy="60" r="42" stroke-dasharray="${circumference.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}"></circle>
        <text class="ring-text" x="60" y="62">${Math.round(item.pct)}%</text>
      </svg>
      <div class="ring-label">
        <h4>${escapeHtml(item.label)}</h4>
        <p>${escapeHtml(item.primary)}</p>
        <p>${escapeHtml(item.secondary)}</p>
      </div>
    </div>`;
}
function renderDonut(targetId, data, palette){
  const entries = Object.entries(data).filter(([,v]) => v > 0);
  const el = $(targetId);
  if(!el){ return; }
  if(!entries.length){
    el.innerHTML = `<div class="mini-card">暂无数据</div>`;
    return;
  }
  const total = sum(entries, ([,v]) => v);
  let acc = 0;
  const radius = 52; const c = 2 * Math.PI * radius;
  const circles = entries.map(([k,v], idx) => {
    const pct = v / total;
    const len = c * pct;
    const dash = `${len} ${c - len}`;
    const offset = -acc * c;
    acc += pct;
    return `<circle cx="70" cy="70" r="${radius}" fill="none" stroke="${palette[idx % palette.length]}" stroke-width="16" stroke-dasharray="${dash}" stroke-dashoffset="${offset}" transform="rotate(-90 70 70)"></circle>`;
  }).join('');
  const legend = entries.map(([k,v], idx) => `
    <div class="legend-row">
      <div class="legend-left"><span class="legend-dot" style="background:${palette[idx % palette.length]}"></span><span>${escapeHtml(k)}</span></div>
      <span>${v}</span>
    </div>`).join('');
  el.innerHTML = `
    <div class="donut-wrap">
      <svg viewBox="0 0 140 140" width="160" height="160" aria-hidden="true">
        <circle cx="70" cy="70" r="52" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="16"></circle>
        ${circles}
        <text x="70" y="67" text-anchor="middle" fill="white" font-size="24" font-weight="800">${total}</text>
        <text x="70" y="89" text-anchor="middle" fill="#a8b4d1" font-size="12">总数</text>
      </svg>
      <div class="donut-legend">${legend}</div>
    </div>`;
}
function saveAndRender(){ saveState(); renderAll(); }

function addWorkLogStart(){
  state.attendance.workLogs.push({ id: uid('work'), start: nowIso(), end: null });
  saveAndRender();
}
function endWorkLog(){
  const open = [...state.attendance.workLogs].reverse().find(x => !x.end);
  if(!open) return alert('没有未结束的工作段。');
  open.end = nowIso();
  saveAndRender();
}
function addLeave(){
  state.attendance.leaves.push({ id: uid('leave'), type: $('leaveTypeInput').value, date: todayStr(), at: nowIso() });
  saveAndRender();
}
function addProject(){
  const title = $('projectTitleInput').value.trim();
  if(!title) return alert('请输入项目名。');
  state.projects.unshift({
    id: uid('project'),
    title,
    outcome: $('projectOutcomeInput').value.trim(),
    area: $('projectAreaInput').value,
    startDate: $('projectStartInput').value,
    deadline: $('projectDeadlineInput').value,
    createdAt: nowIso()
  });
  ['projectTitleInput','projectOutcomeInput','projectStartInput','projectDeadlineInput'].forEach(id => $(id).value='');
  saveAndRender();
}
function addTask(titleOverride=''){
  const title = (titleOverride || $('taskTitleInput').value).trim();
  if(!title) return alert('请输入任务标题。');
  state.tasks.unshift({
    id: uid('task'),
    title,
    projectId: $('taskProjectInput').value || null,
    quadrant: $('taskQuadrantInput').value,
    status: $('taskStatusInput').value,
    dueDate: $('taskDueInput').value,
    createdAt: nowIso(),
    loggedMinutes: 0,
    lastStartedAt: null,
    completedAt: null
  });
  $('taskTitleInput').value='';
  saveAndRender();
}
function addQuickTask(){
  const title = $('quickTaskInput').value.trim();
  if(!title) return alert('请输入任务标题。');
  state.tasks.unshift({
    id: uid('task'), title, projectId:null, quadrant:'q2', status:'todo', dueDate:todayStr(),
    createdAt: nowIso(), loggedMinutes:0, lastStartedAt:null, completedAt:null
  });
  $('quickTaskInput').value='';
  saveAndRender();
}
function startTask(id){
  state.tasks.forEach(t => { if(t.status === 'active' && t.id !== id){ t.status = 'todo'; } });
  const task = state.tasks.find(t => t.id === id);
  if(!task) return;
  task.status = 'active';
  task.lastStartedAt = nowIso();
  if(!state.focus.active){
    state.focus.active = {
      id: uid('focusrun'), title: task.title, category:'research', note:'',
      start: nowIso(), taskId: task.id
    };
  }
  saveAndRender();
}
function finishTask(id){
  const task = state.tasks.find(t => t.id === id);
  if(!task) return;
  if(task.lastStartedAt){
    task.loggedMinutes = (Number(task.loggedMinutes) || 0) + minutesBetween(task.lastStartedAt, nowIso());
  }
  task.status = 'done';
  task.completedAt = nowIso();
  task.lastStartedAt = null;
  if(state.focus.active?.taskId === task.id){ stopFocus(true); }
  if(task.projectId){
    const p = projectById(task.projectId);
    if(p){
      state.thesis.logs.unshift({
        id: uid('thesislog'),
        at: nowIso(),
        date: todayStr(),
        type: p.area === 'writing' ? 'writing' : p.area === 'research' ? 'experiment' : 'other',
        minutes: task.loggedMinutes || 0,
        words: 0,
        note: `任务完成：${task.title}`
      });
    }
  }
  saveAndRender();
}
function setTaskStatus(id, status){
  const task = state.tasks.find(t => t.id === id);
  if(!task) return;
  task.status = status;
  if(status !== 'active') task.lastStartedAt = null;
  if(status === 'done' && !task.completedAt) task.completedAt = nowIso();
  saveAndRender();
}
function removeById(list, id){
  const idx = list.findIndex(x => x.id === id);
  if(idx >= 0) list.splice(idx, 1);
  saveAndRender();
}
function addScheduleBlock(){
  const title = ($('scheduleTitleInput').value || $('scheduleTaskSelect').selectedOptions[0]?.textContent || '').trim();
  if(!title) return alert('请选择任务或填写标题。');
  const start = $('scheduleStartInput').value;
  const end = $('scheduleEndInput').value;
  if(!start || !end || end <= start) return alert('请正确填写开始和结束时间。');
  state.schedule.push({
    id: uid('block'), date: todayStr(), title, start, end, taskId: $('scheduleTaskSelect').value || null
  });
  $('scheduleTitleInput').value='';
  saveAndRender();
}
function startFocus(){
  if(state.focus.active) return alert('当前已有进行中的专注。');
  const task = activeTask();
  state.focus.active = {
    id: uid('focusrun'),
    title: $('focusTitleInput').value.trim() || task?.title || '未命名专注',
    category: $('focusCategoryInput').value,
    note: $('focusNoteInput').value.trim(),
    start: nowIso(),
    taskId: task?.id || null
  };
  saveAndRender();
}
function stopFocus(silent=false){
  const run = state.focus.active;
  if(!run){ if(!silent) alert('当前没有进行中的专注。'); return; }
  const end = nowIso();
  const minutes = minutesBetween(run.start, end);
  state.focus.sessions.unshift({ ...run, end, minutes });
  if(run.taskId){
    const task = state.tasks.find(t => t.id === run.taskId);
    if(task){ task.loggedMinutes = (Number(task.loggedMinutes) || 0) + minutes; }
  }
  state.focus.active = null;
  saveAndRender();
}
function discardFocus(){
  state.focus.active = null;
  saveAndRender();
}
function saveThesisMeta(){
  state.thesis.meta = {
    title: $('thesisTitleInput').value.trim(),
    version: $('thesisVersionInput').value.trim(),
    note: $('thesisNoteInput').value.trim(),
    enrollmentDate: $('enrollmentDateInput').value,
    graduationDate: $('graduationDateInput').value,
    defenseDate: $('defenseDateInput').value
  };
  saveAndRender();
}
function addMilestone(){
  const name = $('milestoneNameInput').value.trim();
  if(!name) return alert('请输入里程碑。');
  state.thesis.milestones.unshift({ id: uid('milestone'), name, dueDate: $('milestoneDueInput').value, done:false });
  $('milestoneNameInput').value=''; $('milestoneDueInput').value='';
  saveAndRender();
}
function toggleMilestone(id){
  const m = state.thesis.milestones.find(x => x.id === id); if(!m) return;
  m.done = !m.done; saveAndRender();
}
function addChapter(){
  const name = $('chapterNameInput').value.trim();
  if(!name) return alert('请输入章节名。');
  state.thesis.chapters.unshift({ id: uid('chapter'), name, status: $('chapterStatusInput').value, progress: $('chapterStatusInput').value === 'done' ? 100 : $('chapterStatusInput').value === 'revise' ? 65 : 20 });
  $('chapterNameInput').value=''; saveAndRender();
}
function setChapterProgress(id, progress){
  const c = state.thesis.chapters.find(x => x.id === id); if(!c) return;
  c.progress = clamp(Number(progress) || 0, 0, 100);
  c.status = c.progress >= 100 ? 'done' : c.progress >= 60 ? 'revise' : 'draft';
  saveAndRender();
}
function addThesisLog(){
  const minutes = Number($('thesisLogMinutesInput').value || 0);
  const words = Number($('thesisLogWordsInput').value || 0);
  state.thesis.logs.unshift({
    id: uid('thesislog'),
    date: $('thesisLogDateInput').value || todayStr(),
    at: nowIso(),
    type: $('thesisLogTypeInput').value,
    minutes, words,
    note: $('thesisLogNoteInput').value.trim()
  });
  ['thesisLogMinutesInput','thesisLogWordsInput','thesisLogNoteInput'].forEach(id => $(id).value='');
  saveAndRender();
}
function addSubmission(){
  const title = $('submissionTitleInput').value.trim();
  if(!title) return alert('请输入投稿标题。');
  state.submissions.unshift({
    id: uid('submission'),
    title,
    venue: $('submissionVenueInput').value.trim(),
    deadline: $('submissionDeadlineInput').value,
    stage: $('submissionStageInput').value,
    type: $('submissionTypeInput').value,
    notes: $('submissionNotesInput').value.trim(),
    createdAt: nowIso()
  });
  ['submissionTitleInput','submissionVenueInput','submissionDeadlineInput','submissionNotesInput'].forEach(id => $(id).value='');
  saveAndRender();
}
function cycleSubmissionStage(id){
  const item = submissionById(id); if(!item) return;
  const idx = STAGES.indexOf(item.stage);
  item.stage = STAGES[Math.min(STAGES.length - 1, idx + 1)];
  saveAndRender();
}
function addSubmissionLog(){
  const submissionId = $('submissionLogProjectInput').value;
  if(!submissionId) return alert('请先选择投稿项目。');
  state.submissionLogs.unshift({
    id: uid('sublog'), submissionId,
    date: $('submissionLogDateInput').value || todayStr(),
    type: $('submissionLogTypeInput').value,
    minutes: Number($('submissionLogMinutesInput').value || 0),
    note: $('submissionLogNoteInput').value.trim(),
    at: nowIso()
  });
  ['submissionLogMinutesInput','submissionLogNoteInput'].forEach(id => $(id).value='');
  saveAndRender();
}
function addHabit(){
  const name = $('habitNameInput').value.trim();
  if(!name) return alert('请输入习惯名。');
  state.health.habits.unshift({
    id: uid('habit'), name, icon: $('habitIconInput').value.trim() || '✓', mode: $('habitModeInput').value, active: true, records: {}
  });
  ['habitNameInput','habitIconInput'].forEach(id => $(id).value='');
  saveAndRender();
}
function updateHabitRecord(id, value){
  const habit = state.health.habits.find(h => h.id === id); if(!habit) return;
  habit.records ||= {};
  if(habit.mode === 'checkbox') habit.records[todayStr()] = !!value;
  else habit.records[todayStr()] = value;
  saveAndRender();
}
function addFood(){
  const text = $('foodTextInput').value.trim(); if(!text) return alert('请输入饮食内容。');
  state.health.foods.unshift({ id: uid('food'), date: todayStr(), meal: $('foodMealInput').value, text, at: nowIso() });
  $('foodTextInput').value=''; saveAndRender();
}
function addWeight(){
  const value = Number($('weightValueInput').value || 0); if(value <= 0) return alert('请输入体重数值。');
  state.health.weights.unshift({ id: uid('weight'), date: todayStr(), value, unit: $('weightUnitInput').value, at: nowIso() });
  $('weightValueInput').value=''; saveAndRender();
}
function saveCare(){
  state.care[todayStr()] = {
    mood: $('careMoodInput').value,
    stress: Number($('careStressInput').value),
    energy: Number($('careEnergyInput').value),
    challenge: $('careChallengeInput').value.trim(),
    selfCare: $('careSelfCareInput').value.trim(),
    gratitude: $('careGratitudeInput').value.trim(),
    support: $('careSupportInput').value.trim(),
    note: $('careNoteInput').value.trim(),
    updatedAt: nowIso()
  };
  saveAndRender();
}
function saveMentor(){
  state.mentor[todayStr()] = {
    status: $('mentorStatusInput').value,
    pressure: Number($('mentorPressureInput').value),
    clarity: Number($('mentorClarityInput').value),
    prepared: $('mentorPreparedInput').value.trim(),
    ask: $('mentorAskInput').value.trim(),
    feedback: $('mentorFeedbackInput').value.trim(),
    commitment: $('mentorCommitmentInput').value.trim(),
    next: $('mentorNextInput').value.trim(),
    updatedAt: nowIso()
  };
  saveAndRender();
}
function saveReview(){
  const tomorrow = $('reviewTomorrowInput').value.split('；').map(x => x.trim()).filter(Boolean);
  state.reviewDaily[todayStr()] = {
    energy: Number($('reviewEnergyInput').value),
    energyNote: $('reviewEnergyNoteInput').value.trim(),
    accomplishments: $('reviewAccomplishmentsInput').value.trim(),
    unfinished: $('reviewUnfinishedInput').value.trim(),
    insights: $('reviewInsightsInput').value.trim(),
    obstacles: $('reviewObstaclesInput').value.trim(),
    tomorrow,
    updatedAt: nowIso()
  };
  saveAndRender();
}
function exportJson(){ downloadText(`phd-os-backup-${todayStr()}.json`, JSON.stringify(state, null, 2), 'application/json;charset=utf-8'); }
async function copyJson(){
  await navigator.clipboard.writeText(JSON.stringify(state, null, 2));
  alert('JSON 已复制到剪贴板。');
}
function importJson(){
  const raw = $('importJsonInput').value.trim();
  if(!raw) return alert('请粘贴 JSON。');
  try {
    state = normalizeState(JSON.parse(raw));
    saveAndRender();
    alert('导入成功。');
  } catch {
    alert('JSON 格式不正确。');
  }
}
function clearAll(){
  if(!confirm('确定清空全部本地数据吗？此操作不可撤销。')) return;
  localStorage.removeItem(STORAGE_KEY);
  state = defaultState();
  saveAndRender();
}
function downloadSubmissionMd(){
  const grouped = state.submissions.map(sub => {
    const logs = state.submissionLogs.filter(l => l.submissionId === sub.id).sort(compareDescBy('date'));
    return [sub, logs];
  });
  const lines = ['# Submission Logs', ''];
  grouped.forEach(([sub, logs]) => {
    lines.push(`## ${sub.title}`);
    lines.push(`- Venue: ${sub.venue || '—'}`);
    lines.push(`- Stage: ${sub.stage}`);
    lines.push(`- Deadline: ${sub.deadline || '—'}`);
    lines.push('');
    logs.forEach(log => lines.push(`- ${log.date} | ${log.type} | ${log.minutes || 0} min | ${log.note || ''}`));
    lines.push('');
  });
  downloadText(`submission-logs-${todayStr()}.md`, lines.join('\n'), 'text/markdown;charset=utf-8');
}

function renderSidebarClock(){
  const d = new Date();
  $('sidebarDate').textContent = `${d.getFullYear()}年${pad(d.getMonth()+1)}月${pad(d.getDate())}日 周${'日一二三四五六'[d.getDay()]}`;
  $('sidebarTime').textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function renderSidebar(){
  const openWork = state.attendance.workLogs.filter(x => !x.end).length;
  const todayFocusMin = sum(todayFocusSessions(), x => x.minutes) + (state.focus.active ? minutesBetween(state.focus.active.start, nowIso()) : 0);
  $('sidebarStats').innerHTML = `
    <div class="stat-card"><div class="small">今日专注</div><div class="value">${formatMinutes(todayFocusMin)}</div></div>
    <div class="stat-card"><div class="small">进行中任务</div><div class="value">${escapeHtml(activeTask()?.title || '无')}</div></div>
    <div class="stat-card"><div class="small">习惯完成度</div><div class="value">${todayHabitCompletion()}%</div></div>
    <div class="stat-card"><div class="small">未结束工作段</div><div class="value">${openWork}</div></div>
    <div class="stat-card"><div class="small">投稿进行中</div><div class="value">${runningSubmissionCount()}</div></div>`;
  $('appShell').classList.toggle('sidebar-hidden', !!state.prefs.sidebarHidden);
}
function renderSectionMeta(){
  const meta = SECTIONS[currentSection] || SECTIONS.home;
  $('sectionTitle').textContent = meta.title;
  $('sectionSubtitle').textContent = meta.subtitle;
}
function renderHome(){
  const grad = graduationProgressData();
  $('graduationProgressHome').innerHTML = [grad.year, grad.graduation].map(x => renderRingCard(x)).join('');

  const todayWorkMin = sum(todayWorkLogs().filter(x => x.end), x => minutesBetween(x.start, x.end));
  const stats = [
    { label:'今日工作时长', value: formatMinutes(todayWorkMin) },
    { label:'今日专注次数', value: String(todayFocusSessions().length) },
    { label:'今日请假记录', value: String(todayLeaves().length) },
    { label:'论文总体进度', value: `${thesisOverallProgress()}%` }
  ];
  $('homeStats').innerHTML = stats.map(s => `<div class="card card-stat"><div class="small">${s.label}</div><div class="value">${escapeHtml(s.value)}</div></div>`).join('');

  const attendanceLines = [
    ...todayWorkLogs().map(w => `
      <div class="item">
        <div class="item-head"><strong>工作段</strong><span class="badge">${w.end ? formatMinutes(minutesBetween(w.start, w.end)) : '进行中'}</span></div>
        <div class="item-meta">${formatDateTime(w.start)} → ${w.end ? formatDateTime(w.end) : '未结束'}</div>
      </div>`),
    ...todayLeaves().map(l => `
      <div class="item"><div class="item-head"><strong>${escapeHtml(l.type)}</strong><span class="badge warn">请假</span></div><div class="item-meta">${l.date}</div></div>`)
  ];
  $('attendanceSummary').innerHTML = attendanceLines.length ? attendanceLines.join('') : `<div class="item">今天还没有打卡或请假记录。</div>`;

  const todayActive = state.focus.active;
  $('focusSummary').innerHTML = todayActive
    ? `<div class="item"><div class="item-head"><strong>${escapeHtml(todayActive.title)}</strong><span class="badge">进行中</span></div><div class="item-meta">开始于 ${formatDateTime(todayActive.start)}${todayActive.taskId ? ' · 已关联任务' : ''}</div></div>`
    : `<div class="item">当前没有进行中的专注。</div>`;

  const tasks = todayTaskCandidates();
  $('todayTaskList').innerHTML = tasks.length ? tasks.map(renderTaskCard).join('') : `<div class="item">今天还没有待办任务。</div>`;
  renderScheduleSelects();
  const blocks = todaySchedule();
  $('scheduleTimeline').innerHTML = blocks.length ? blocks.map(b => `
    <div class="timeline-item">
      <div class="timeline-head"><strong>${escapeHtml(b.title)}</strong><span class="badge">${b.start} - ${b.end}</span></div>
      <div class="actions"><button class="btn ghost" data-remove="schedule:${b.id}">删除</button></div>
    </div>`).join('') : `<div class="item">今天还没有时间块。</div>`;
}
function renderProjectSection(){
  const selectedProject = $('taskProjectInput').value;
  const selectedProjectFilter = $('taskProjectFilterInput').value || 'all';
  const projectOptions = ['<option value="">未归属项目</option>'].concat(state.projects.map(p => `<option value="${p.id}">${escapeHtml(p.title)}</option>`));
  $('taskProjectInput').innerHTML = projectOptions.join('');
  $('taskProjectInput').value = selectedProject;
  $('taskProjectFilterInput').innerHTML = ['<option value="all">全部项目</option>'].concat(state.projects.map(p => `<option value="${p.id}">${escapeHtml(p.title)}</option>`)).join('');
  $('taskProjectFilterInput').value = selectedProjectFilter;
  $('projectList').innerHTML = state.projects.length ? state.projects.map(p => `
    <div class="project-card">
      <div class="project-head">
        <div>
          <strong>${escapeHtml(p.title)}</strong>
          <div class="item-meta">${escapeHtml(p.outcome || '未写结果产出')} · ${escapeHtml(p.area)}</div>
        </div>
        <span class="badge">${taskMinutesForProject(p.id)} min</span>
      </div>
      <div class="small">开始：${dateLabel(p.startDate)} ｜ 截止：${dateLabel(p.deadline)}</div>
      <div class="actions"><button class="btn ghost" data-edit="project:${p.id}">编辑</button><button class="btn ghost danger" data-remove="project:${p.id}">删除</button></div>
    </div>`).join('') : `<div class="item">还没有项目。</div>`;

  const filter = $('taskFilterInput').value;
  const projectFilter = $('taskProjectFilterInput').value;
  let tasks = [...state.tasks];
  if(filter === 'today') tasks = todayTaskCandidates();
  else if(filter !== 'all') tasks = tasks.filter(t => t.quadrant === filter);
  if(projectFilter && projectFilter !== 'all') tasks = tasks.filter(t => t.projectId === projectFilter);
  const columns = [
    { key:'planned', label:'计划中' },
    { key:'todo', label:'未开始' },
    { key:'active', label:'进行中' },
    { key:'done', label:'已完成' }
  ];
  $('taskBoard').innerHTML = columns.map(col => `
    <div class="kanban-col">
      <h4>${col.label}</h4>
      ${tasks.filter(t => t.status === col.key).map(renderTaskCard).join('') || '<div class="item">暂无</div>'}
    </div>`).join('');
}
function renderTaskCard(task){
  const meta = TASK_STATUS_META[task.status] || TASK_STATUS_META.todo;
  const project = task.projectId ? projectById(task.projectId) : null;
  return `
    <div class="task-card">
      <div class="task-head">
        <div>
          <strong>${escapeHtml(task.title)}</strong>
          <div class="item-meta">${escapeHtml(QUADRANT_META[task.quadrant] || '')}${project ? ` · ${escapeHtml(project.title)}` : ''}${task.dueDate ? ` · 截止 ${task.dueDate}` : ''}</div>
        </div>
        <span class="${meta.cls}">${meta.label}</span>
      </div>
      <div class="small">累计投入：${formatMinutes(task.loggedMinutes || 0)}</div>
      <div class="actions">
        ${task.status !== 'active' && task.status !== 'done' ? `<button class="btn ghost" data-task-action="start:${task.id}">开始</button>` : ''}
        ${task.status !== 'done' ? `<button class="btn ghost" data-task-action="done:${task.id}">完成</button>` : ''}
        ${task.status === 'active' ? `<button class="btn ghost" data-task-action="todo:${task.id}">暂停</button>` : ''}
        <button class="btn ghost" data-edit="task:${task.id}">编辑</button>
        <button class="btn ghost danger" data-remove="task:${task.id}">删除</button>
      </div>
    </div>`;
}
function renderThesis(){
  const meta = state.thesis.meta;
  $('thesisTitleInput').value = meta.title || '';
  $('thesisVersionInput').value = meta.version || '';
  $('thesisNoteInput').value = meta.note || '';
  $('enrollmentDateInput').value = meta.enrollmentDate || '';
  $('graduationDateInput').value = meta.graduationDate || '';
  $('defenseDateInput').value = meta.defenseDate || '';
  const grad = graduationProgressData();
  $('graduationProgressThesis').innerHTML = [grad.graduation, grad.defense, grad.year].map(x => renderRingCard(x, true)).join('');
  $('thesisOverallPanel').innerHTML = `
    <div class="stat-card"><div class="small">总体进度</div><div class="value">${thesisOverallProgress()}%</div></div>
    <div class="item-meta">里程碑完成率与章节平均进度各占 50%。</div>
    <div class="stat-card"><div class="small">论文日志</div><div class="value">${state.thesis.logs.length}</div></div>
    <div class="stat-card"><div class="small">总投入</div><div class="value">${formatMinutes(sum(state.thesis.logs, l => l.minutes))}</div></div>`;

  $('milestoneList').innerHTML = state.thesis.milestones.length ? state.thesis.milestones.map(m => `
    <div class="item">
      <div class="item-head"><strong>${escapeHtml(m.name)}</strong><span class="${m.done ? 'badge success' : 'badge warn'}">${m.done ? '已完成' : '进行中'}</span></div>
      <div class="item-meta">截止：${dateLabel(m.dueDate)}</div>
      <div class="actions"><button class="btn ghost" data-toggle="milestone:${m.id}">${m.done ? '标记未完成' : '标记完成'}</button><button class="btn ghost danger" data-remove="milestone:${m.id}">删除</button></div>
    </div>`).join('') : `<div class="item">还没有里程碑。</div>`;

  $('chapterList').innerHTML = state.thesis.chapters.length ? state.thesis.chapters.map(c => `
    <div class="item">
      <div class="item-head"><strong>${escapeHtml(c.name)}</strong><span class="badge">${c.progress}%</span></div>
      <div class="item-meta">状态：${escapeHtml(c.status)}</div>
      <input type="range" min="0" max="100" value="${c.progress}" data-chapter-progress="${c.id}" />
      <div class="actions"><button class="btn ghost danger" data-remove="chapter:${c.id}">删除</button></div>
    </div>`).join('') : `<div class="item">还没有章节。</div>`;

  $('thesisLogList').innerHTML = state.thesis.logs.length ? state.thesis.logs.sort(compareDescBy('date')).map(l => `
    <div class="log-item">
      <div class="item-head"><strong>${escapeHtml(l.type)}</strong><span class="badge">${l.date}</span></div>
      <div class="item-meta">${formatMinutes(l.minutes || 0)}${l.words ? ` · ${l.words} 字` : ''}</div>
      <div>${escapeHtml(l.note || '—')}</div>
      <div class="actions"><button class="btn ghost danger" data-remove="thesislog:${l.id}">删除</button></div>
    </div>`).join('') : `<div class="item">还没有论文推进日志。</div>`;
}
function renderSubmissions(){
  const selectedStage = $('submissionStageInput').value || STAGES[0];
  const selectedFilterStage = $('submissionFilterStageInput').value || '';
  const selectedLogProject = $('submissionLogProjectInput').value || '';
  $('submissionStageInput').innerHTML = STAGES.map(s => `<option value="${s}">${s}</option>`).join('');
  $('submissionStageInput').value = selectedStage;
  $('submissionFilterStageInput').innerHTML = ['<option value="">全部阶段</option>'].concat(STAGES.map(s => `<option value="${s}">${s}</option>`)).join('');
  $('submissionFilterStageInput').value = selectedFilterStage;
  $('submissionLogProjectInput').innerHTML = ['<option value="">选择投稿项目</option>'].concat(state.submissions.map(s => `<option value="${s.id}">${escapeHtml(s.title)}</option>`)).join('');
  $('submissionLogProjectInput').value = selectedLogProject;
  const q = $('submissionFilterQueryInput').value.trim().toLowerCase();
  const stageFilter = $('submissionFilterStageInput').value;
  const subs = state.submissions.filter(s => (!q || `${s.title} ${s.venue}`.toLowerCase().includes(q)) && (!stageFilter || s.stage === stageFilter));
  $('submissionArchive').innerHTML = state.submissions.length ? state.submissions.map(s => `
    <div class="item">
      <div class="item-head"><strong>${escapeHtml(s.title)}</strong><span class="badge ${['Accepted','Published'].includes(s.stage) ? 'success' : 'warn'}">${s.stage}</span></div>
      <div class="item-meta">${escapeHtml(s.venue || '未填写 venue')} · ${escapeHtml(s.type)}${s.deadline ? ` · 截止 ${s.deadline}` : ''}</div>
      <div>${escapeHtml(s.notes || '—')}</div>
      <div class="actions"><button class="btn ghost" data-cycle-submission="${s.id}">推进阶段</button><button class="btn ghost" data-edit="submission:${s.id}">编辑</button><button class="btn ghost danger" data-remove="submission:${s.id}">删除</button></div>
    </div>`).join('') : `<div class="item">还没有投稿项目。</div>`;
  $('submissionBoard').innerHTML = STAGES.map(stage => `
    <div class="kanban-col">
      <h4>${stage}</h4>
      ${(subs.filter(s => s.stage === stage).map(s => `
        <div class="task-card">
          <div class="task-head"><strong>${escapeHtml(s.title)}</strong><span class="badge">${escapeHtml(s.type)}</span></div>
          <div class="item-meta">${escapeHtml(s.venue || '未填写 venue')}</div>
          <div class="small">${s.deadline ? `截止 ${s.deadline}` : '未设截止日期'}</div>
          <div class="actions"><button class="btn ghost" data-cycle-submission="${s.id}">下一阶段</button></div>
        </div>`).join('')) || '<div class="item">暂无</div>'}
    </div>`).join('');
  $('submissionLogList').innerHTML = state.submissionLogs.length ? state.submissionLogs.sort(compareDescBy('date')).map(l => `
    <div class="item">
      <div class="item-head"><strong>${escapeHtml(submissionById(l.submissionId)?.title || '未知项目')}</strong><span class="badge">${l.date}</span></div>
      <div class="item-meta">${escapeHtml(l.type)} · ${formatMinutes(l.minutes || 0)}</div>
      <div>${escapeHtml(l.note || '—')}</div>
      <div class="actions"><button class="btn ghost danger" data-remove="submissionlog:${l.id}">删除</button></div>
    </div>`).join('') : `<div class="item">还没有投稿推进日志。</div>`;
}
function renderHealth(){
  $('habitList').innerHTML = state.health.habits.length ? state.health.habits.filter(h => h.active !== false).map(h => {
    const value = habitValueForDate(h, todayStr());
    const input = h.mode === 'checkbox'
      ? `<label class="badge success"><input type="checkbox" ${value ? 'checked' : ''} data-habit-check="${h.id}" /> 今日完成</label>`
      : h.mode === 'count'
      ? `<input type="number" min="0" value="${Number(value || 0)}" data-habit-value="${h.id}" />`
      : h.mode === 'duration'
      ? `<input type="number" min="0" value="${Number(value || 0)}" data-habit-value="${h.id}" placeholder="分钟" />`
      : `<input value="${escapeHtml(value || '')}" data-habit-text="${h.id}" placeholder="记录内容" />`;
    return `
      <div class="item">
        <div class="item-head"><strong>${escapeHtml(h.icon || '✓')} ${escapeHtml(h.name)}</strong><span class="badge">${escapeHtml(h.mode)}</span></div>
        ${input}
        <div class="actions"><button class="btn ghost danger" data-remove="habit:${h.id}">删除</button></div>
      </div>`;
  }).join('') : `<div class="item">还没有习惯。</div>`;

  const foods = state.health.foods.filter(x => x.date === todayStr());
  const weights = state.health.weights.filter(x => x.date === todayStr());
  $('healthSummary').innerHTML = [
    ...foods.map(f => `<div class="item"><div class="item-head"><strong>${escapeHtml(f.meal)}</strong><span class="badge">饮食</span></div><div>${escapeHtml(f.text)}</div><div class="actions"><button class="btn ghost danger" data-remove="food:${f.id}">删除</button></div></div>`),
    ...weights.map(w => `<div class="item"><div class="item-head"><strong>${w.value} ${escapeHtml(w.unit)}</strong><span class="badge">体重</span></div><div class="actions"><button class="btn ghost danger" data-remove="weight:${w.id}">删除</button></div></div>`)
  ].join('') || '<div class="item">今天还没有饮食或体重记录。</div>';
}
function renderCare(){
  const entries = Object.entries(state.care).sort((a,b) => b[0].localeCompare(a[0]));
  $('careList').innerHTML = entries.length ? entries.map(([date, c]) => {
    const mood = MOOD_META[c.mood] || MOOD_META.steady;
    return `<div class="item"><div class="item-head"><strong>${date}</strong><span class="badge">${mood.emoji} ${mood.label}</span></div><div class="item-meta">压力 ${c.stress}/5 · 能量 ${c.energy}/5</div><div>${escapeHtml(c.challenge || '—')}</div><div class="small">自我关怀：${escapeHtml(c.selfCare || '—')}</div><div class="actions"><button class="btn ghost danger" data-remove="care:${date}">删除</button></div></div>`;
  }).join('') : `<div class="item">还没有心灵关怀记录。</div>`;
}
function renderMentor(){
  const entries = Object.entries(state.mentor).sort((a,b) => b[0].localeCompare(a[0]));
  $('mentorList').innerHTML = entries.length ? entries.map(([date, m]) => {
    const meta = MENTOR_META[m.status] || MENTOR_META.preparing;
    return `<div class="item"><div class="item-head"><strong>${date}</strong><span class="badge">${meta.emoji} ${meta.label}</span></div><div class="item-meta">压力 ${m.pressure}/5 · 清晰度 ${m.clarity}/5</div><div>${escapeHtml(m.ask || '—')}</div><div class="small">下一步：${escapeHtml(m.next || '—')}</div><div class="actions"><button class="btn ghost danger" data-remove="mentor:${date}">删除</button></div></div>`;
  }).join('') : `<div class="item">还没有导师沟通记录。</div>`;
}
function renderReview(){
  const entries = Object.entries(state.reviewDaily).sort((a,b) => b[0].localeCompare(a[0]));
  $('reviewList').innerHTML = entries.length ? entries.map(([date, r]) => `
    <div class="item">
      <div class="item-head"><strong>${date}</strong><span class="badge">能量 ${r.energy}/5</span></div>
      <div class="small">成果：${escapeHtml(r.accomplishments || '—')}</div>
      <div class="small">洞见：${escapeHtml(r.insights || '—')}</div>
      <div class="small">明日：${escapeHtml((r.tomorrow || []).join('；') || '—')}</div>
      <div class="actions"><button class="btn ghost danger" data-remove="review:${date}">删除</button></div>
    </div>`).join('') : `<div class="item">还没有每日复盘。</div>`;
}
function getAchievements(){
  const focusMinutes = sum(state.focus.sessions, x => x.minutes);
  const finishedTasks = state.tasks.filter(t => t.status === 'done').length;
  const thesisLogs = state.thesis.logs.length;
  const reviews = Object.keys(state.reviewDaily).length;
  const habits = state.health.habits.length;
  const submissions = state.submissions.length;
  return [
    { id:'first_focus', name:'第一段专注', desc:'累计专注至少 30 分钟', unlocked: focusMinutes >= 30 },
    { id:'deep_work', name:'深度推进', desc:'累计专注至少 20 小时', unlocked: focusMinutes >= 1200 },
    { id:'task_runner', name:'任务执行者', desc:'完成至少 10 个任务', unlocked: finishedTasks >= 10 },
    { id:'thesis_builder', name:'论文建造中', desc:'写下至少 10 条论文日志', unlocked: thesisLogs >= 10 },
    { id:'reflector', name:'稳定复盘', desc:'完成至少 7 天复盘', unlocked: reviews >= 7 },
    { id:'habit_gardener', name:'习惯园丁', desc:'添加至少 3 个健康习惯', unlocked: habits >= 3 },
    { id:'submitter', name:'投稿启动', desc:'创建至少 1 个投稿项目', unlocked: submissions >= 1 },
    { id:'planner', name:'项目经理', desc:'创建至少 3 个项目', unlocked: state.projects.length >= 3 }
  ];
}
function renderAchievements(){
  $('achievementGrid').innerHTML = getAchievements().map(a => `
    <div class="achievement-card ${a.unlocked ? '' : 'locked'}">
      <div class="item-head"><strong>${escapeHtml(a.name)}</strong><span class="${a.unlocked ? 'badge success' : 'badge warn'}">${a.unlocked ? '已解锁' : '未解锁'}</span></div>
      <div class="item-meta">${escapeHtml(a.desc)}</div>
    </div>`).join('');
}
function renderDashboard(){
  const data = allMinutesLast8Weeks();
  const max = Math.max(1, ...data.map(x => x.minutes));
  $('weeklyBars').innerHTML = data.map(x => `
    <div class="bar-row">
      <div>${escapeHtml(x.label)}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${percent(x.minutes, max)}%"></div></div>
      <div>${formatMinutes(x.minutes)}</div>
    </div>`).join('');
  renderDonut('taskStatusDonut', taskStatusBreakdown(), ['#88aaff','#ffd08a','#66e0c2','#ff8ca2']);
  renderDonut('thesisDonut', thesisTypeBreakdown(), ['#88aaff','#66e0c2','#ffd08a','#ff8ca2','#d5dfff']);
  renderDonut('habitDonut', { 完成: todayHabitCompletion(), 未完成: 100 - todayHabitCompletion() }, ['#66e0c2','#2c3551']);
  const grad = graduationProgressData();
  $('graduationDashboard').innerHTML = [grad.graduation, grad.defense, grad.year].map(x => renderRingCard(x)).join('');
}
function renderSettings(){
  $('deployGuide').innerHTML = `
    <p>把这三个文件上传到 GitHub 仓库根目录：<code>index.html</code>、<code>styles.css</code>、<code>app.js</code>。</p>
    <p>然后在仓库中打开 <strong>Settings → Pages</strong>，把 Source 设为 <code>Deploy from a branch</code>，Branch 选择 <code>main</code> / <code>root</code>。</p>
    <p>GitHub Pages 是静态托管，所以这个版本完全本地运行，不需要后端。数据默认保存在浏览器 <code>localStorage</code> 中，因此请定期导出 JSON 备份。</p>
    <p>如果你想绑定自定义域名，可再添加 <code>CNAME</code> 文件。</p>`;
}
function renderScheduleSelects(){
  $('scheduleTaskSelect').innerHTML = ['<option value="">从今日任务选择</option>'].concat(todayTaskCandidates().map(t => `<option value="${t.id}">${escapeHtml(t.title)}</option>`)).join('');
}
function renderFocusClock(){
  const active = state.focus.active;
  if(!active){ $('focusClock').textContent = '00:00:00'; return; }
  const sec = Math.max(0, Math.floor((Date.now() - new Date(active.start).getTime()) / 1000));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  $('focusClock').textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
}
function renderFormDefaults(){
  $('projectStartInput').value ||= todayStr();
  $('thesisLogDateInput').value ||= todayStr();
  $('submissionLogDateInput').value ||= todayStr();
}
function renderAll(){
  renderSidebarClock();
  renderSidebar();
  renderSectionMeta();
  renderHome();
  renderProjectSection();
  renderThesis();
  renderSubmissions();
  renderHealth();
  renderCare();
  renderMentor();
  renderReview();
  renderAchievements();
  renderDashboard();
  renderSettings();
  renderFocusClock();
  renderFormDefaults();
}

function openEditor(kind, id){
  const dialog = $('editDialog');
  const body = $('editDialogBody');
  const titleEl = $('editDialogTitle');
  let record = null;
  let fields = [];
  let onSave = null;
  let onDelete = null;
  if(kind === 'project'){
    record = state.projects.find(x => x.id === id);
    titleEl.textContent = '编辑项目';
    fields = [
      { key:'title', label:'项目名', value: record.title },
      { key:'outcome', label:'结果产出', value: record.outcome },
      { key:'area', label:'领域', type:'select', value: record.area, options: ['research','writing','submission','admin','life','other'] },
      { key:'startDate', label:'开始日期', type:'date', value: record.startDate },
      { key:'deadline', label:'截止日期', type:'date', value: record.deadline }
    ];
    onSave = data => Object.assign(record, data);
    onDelete = () => removeById(state.projects, id);
  } else if(kind === 'task'){
    record = state.tasks.find(x => x.id === id);
    titleEl.textContent = '编辑任务';
    fields = [
      { key:'title', label:'任务标题', value: record.title },
      { key:'quadrant', label:'象限', type:'select', value: record.quadrant, options: Object.keys(QUADRANT_META) },
      { key:'status', label:'状态', type:'select', value: record.status, options: Object.keys(TASK_STATUS_META) },
      { key:'dueDate', label:'截止日期', type:'date', value: record.dueDate }
    ];
    onSave = data => Object.assign(record, data);
    onDelete = () => removeById(state.tasks, id);
  } else if(kind === 'submission'){
    record = state.submissions.find(x => x.id === id);
    titleEl.textContent = '编辑投稿';
    fields = [
      { key:'title', label:'题目', value: record.title },
      { key:'venue', label:'Venue', value: record.venue },
      { key:'stage', label:'阶段', type:'select', value: record.stage, options: STAGES },
      { key:'deadline', label:'截止日期', type:'date', value: record.deadline },
      { key:'notes', label:'备注', type:'textarea', value: record.notes }
    ];
    onSave = data => Object.assign(record, data);
    onDelete = () => removeById(state.submissions, id);
  }
  if(!record) return;
  body.innerHTML = fields.map(f => {
    if(f.type === 'textarea') return `<label><div class="small">${f.label}</div><textarea data-field="${f.key}" rows="4">${escapeHtml(f.value || '')}</textarea></label>`;
    if(f.type === 'select') return `<label><div class="small">${f.label}</div><select data-field="${f.key}">${f.options.map(v => `<option value="${v}" ${String(v)===String(f.value) ? 'selected' : ''}>${v}</option>`).join('')}</select></label>`;
    return `<label><div class="small">${f.label}</div><input data-field="${f.key}" type="${f.type || 'text'}" value="${escapeHtml(f.value || '')}" /></label>`;
  }).join('');
  editContext = { onSave, onDelete };
  dialog.showModal();
}
function handleEditDialog(result){
  if(!editContext) return;
  if(result === 'delete') {
    editContext.onDelete?.();
    editContext = null;
    return;
  }
  if(result === 'save'){
    const inputs = $('editDialogBody').querySelectorAll('[data-field]');
    const data = {};
    inputs.forEach(el => data[el.dataset.field] = el.value);
    editContext.onSave?.(data);
    saveAndRender();
  }
  editContext = null;
}
function navTo(section){
  currentSection = section;
  document.querySelectorAll('.section').forEach(el => el.classList.toggle('active', el.id === `section-${section}`));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.section === section));
  renderSectionMeta();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function bindEvents(){
  document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => navTo(btn.dataset.section)));
  document.querySelectorAll('[data-go]').forEach(btn => btn.addEventListener('click', () => navTo(btn.dataset.go)));
  $('toggleSidebarBtn').addEventListener('click', () => { state.prefs.sidebarHidden = !state.prefs.sidebarHidden; saveAndRender(); });
  $('jumpTodayBtn').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  $('startWorkBtn').addEventListener('click', addWorkLogStart);
  $('endWorkBtn').addEventListener('click', endWorkLog);
  $('addLeaveBtn').addEventListener('click', addLeave);
  $('addProjectBtn').addEventListener('click', addProject);
  $('addTaskBtn').addEventListener('click', () => addTask());
  $('addQuickTaskBtn').addEventListener('click', addQuickTask);
  $('addScheduleBtn').addEventListener('click', addScheduleBlock);
  $('focusStartBtn').addEventListener('click', startFocus);
  $('focusStopBtn').addEventListener('click', () => stopFocus(false));
  $('focusDiscardBtn').addEventListener('click', discardFocus);
  $('saveThesisMetaBtn').addEventListener('click', saveThesisMeta);
  $('addMilestoneBtn').addEventListener('click', addMilestone);
  $('addChapterBtn').addEventListener('click', addChapter);
  $('addThesisLogBtn').addEventListener('click', addThesisLog);
  $('addSubmissionBtn').addEventListener('click', addSubmission);
  $('addSubmissionLogBtn').addEventListener('click', addSubmissionLog);
  $('downloadSubmissionMdBtn').addEventListener('click', downloadSubmissionMd);
  $('addHabitBtn').addEventListener('click', addHabit);
  $('addFoodBtn').addEventListener('click', addFood);
  $('addWeightBtn').addEventListener('click', addWeight);
  $('saveCareBtn').addEventListener('click', saveCare);
  $('saveMentorBtn').addEventListener('click', saveMentor);
  $('saveReviewBtn').addEventListener('click', saveReview);
  $('exportJsonBtn').addEventListener('click', exportJson);
  $('copyJsonBtn').addEventListener('click', copyJson);
  $('importJsonBtn').addEventListener('click', importJson);
  $('clearAllBtn').addEventListener('click', clearAll);
  $('taskFilterInput').addEventListener('change', renderProjectSection);
  $('taskProjectFilterInput').addEventListener('change', renderProjectSection);
  $('submissionFilterQueryInput').addEventListener('input', renderSubmissions);
  $('submissionFilterStageInput').addEventListener('change', renderSubmissions);
  $('editDialog').addEventListener('close', () => handleEditDialog($('editDialog').returnValue));
  $('editDeleteBtn').addEventListener('click', () => $('editDialog').close('delete'));

  document.body.addEventListener('click', (e) => {
    const taskAction = e.target.closest('[data-task-action]')?.dataset.taskAction;
    const removeAction = e.target.closest('[data-remove]')?.dataset.remove;
    const editAction = e.target.closest('[data-edit]')?.dataset.edit;
    const toggleAction = e.target.closest('[data-toggle]')?.dataset.toggle;
    const cycle = e.target.closest('[data-cycle-submission]')?.dataset.cycleSubmission;
    if(taskAction){
      const [action, id] = taskAction.split(':');
      if(action === 'start') startTask(id);
      else if(action === 'done') finishTask(id);
      else setTaskStatus(id, action);
      return;
    }
    if(removeAction){
      const [kind, id] = removeAction.split(':');
      if(kind === 'project') removeById(state.projects, id);
      else if(kind === 'task') removeById(state.tasks, id);
      else if(kind === 'schedule') removeById(state.schedule, id);
      else if(kind === 'milestone') removeById(state.thesis.milestones, id);
      else if(kind === 'chapter') removeById(state.thesis.chapters, id);
      else if(kind === 'thesislog') removeById(state.thesis.logs, id);
      else if(kind === 'submission') removeById(state.submissions, id);
      else if(kind === 'submissionlog') removeById(state.submissionLogs, id);
      else if(kind === 'habit') removeById(state.health.habits, id);
      else if(kind === 'food') removeById(state.health.foods, id);
      else if(kind === 'weight') removeById(state.health.weights, id);
      else if(kind === 'care') { delete state.care[id]; saveAndRender(); }
      else if(kind === 'mentor') { delete state.mentor[id]; saveAndRender(); }
      else if(kind === 'review') { delete state.reviewDaily[id]; saveAndRender(); }
      return;
    }
    if(editAction){
      const [kind, id] = editAction.split(':');
      openEditor(kind, id);
      return;
    }
    if(toggleAction){
      const [kind, id] = toggleAction.split(':');
      if(kind === 'milestone') toggleMilestone(id);
      return;
    }
    if(cycle){ cycleSubmissionStage(cycle); }
  });
  document.body.addEventListener('input', (e) => {
    if(e.target.matches('[data-chapter-progress]')) setChapterProgress(e.target.dataset.chapterProgress, e.target.value);
    if(e.target.matches('[data-habit-value]')) updateHabitRecord(e.target.dataset.habitValue, Number(e.target.value || 0));
    if(e.target.matches('[data-habit-text]')) updateHabitRecord(e.target.dataset.habitText, e.target.value);
  });
  document.body.addEventListener('change', (e) => {
    if(e.target.matches('[data-habit-check]')) updateHabitRecord(e.target.dataset.habitCheck, e.target.checked);
  });
}

function bootstrap(){
  bindEvents();
  renderAll();
  setInterval(() => {
    renderSidebarClock();
    renderFocusClock();
  }, 1000);
}

bootstrap();
