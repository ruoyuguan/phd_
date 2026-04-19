# PhD OS · GitHub Pages Edition

A clean-room, static, local-first PhD workspace designed for GitHub Pages.

## What it includes

- Overview dashboard
- Work attendance / leave log
- Focus timer with task linkage
- Project and task board
- Thesis milestones, chapters, and writing logs
- Submission pipeline and log export
- Health habits, food, weight tracking
- Care, mentor communication, and daily review pages
- Achievement system
- Dashboard visualizations
- **Graduation DDL progress rings** based on:
  - enrollment date
  - expected graduation date
  - expected defense date
  - current ISO week / total ISO weeks in the year

## Deployment to GitHub Pages

1. Create a new GitHub repository.
2. Upload these files to the repository root:
   - `index.html`
   - `styles.css`
   - `app.js`
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose:
   - **Source:** `Deploy from a branch`
   - **Branch:** `main`
   - **Folder:** `/ (root)`
5. Save and wait for GitHub Pages to publish.

## Data model

This app is **fully static** and stores data in the browser using `localStorage`.

That means:
- no backend is required
- it works well on GitHub Pages
- your data is browser-local by default
- you should regularly export JSON backups

## Copyright / clean-room note

This version is a **clean-room reimplementation** of a workflow concept.
It does **not** copy the original source code, styling code, or UI implementation details line-for-line.
It reproduces the **functional idea** using a newly written architecture suitable for public GitHub deployment.
