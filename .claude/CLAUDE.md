# CLAUDE.md — Project Workflow & Instructions

<!--
  CLAUDE.md is the main instruction file for Claude Code.
  It's loaded into every conversation and tells Claude how your project works.
  Customize each section below for your project.
-->

## Project

<!-- Describe your project in one line. Include the tech stack. -->
Your Project Name — brief description.
Frontend framework + Backend framework + Database + other services.

## Branching Strategy (3-Tier)

```
feature-branch  →  dev  →  main
   (work)         (test)   (production)
```

**Rules:**
- `main` is production. Never commit directly to `main`. Never merge feature branches into `main`.
- `dev` is the integration/testing branch. All feature branches merge here first via PR.
- Feature branches are always created from `dev` (not `main`).
- Changes are promoted from `dev` to `main` only after testing in `dev` is complete — via a PR (`dev` → `main`, merge commit, no squash).
- After promoting to `main`, sync `dev` back: `git checkout dev && git merge main`.

**Branch naming:** `<your-username>/<prefix>-<N>-<slug>` (from your issue tracker ticket number).

---

## Phase Lifecycle

Each development phase follows a strict 9-step pipeline. Run each step in order.

---

### Step 1: Pick Up a Phase

Identify the next phase from your development plan document.

<!-- Example: docs/product_development_plan/PHASES.md -->

Read the relevant module doc to understand scope.

---

### Step 2: Explore & Plan (`/explore` then `/create-plan`)

**Explore first:**
```
/explore <phase description> @docs/MODULE_XX.md
```
- Understand scope, ask clarifying questions, identify dependencies
- Do NOT implement yet

**Then create the plan:**
```
/create-plan <phase description>
```
- Produces a tracking doc at `docs/PHASE<N>_TRACKING.md`
- Tasks with status emojis, overall progress percentage

---

### Step 3: Create Issue Tracker Epic & Tickets

<!-- If using Linear, replace IDs below with your workspace values.
     If using GitHub Issues, Jira, etc., adapt the commands accordingly. -->

Use your issue tracker's MCP tools to create project tracking.

**Workspace details (customize these):**
- Team: `YourTeam` (ID: `YOUR_TEAM_ID`)
- Labels: `Feature`, `Bug`, `Improvement`
- Statuses: `Backlog` → `Todo` → `In Progress` → `In Review` → `Done`
- Assignee: `Your Name` (ID: `YOUR_ASSIGNEE_ID`)

Create the epic, then create child tickets (one per task from the tracking doc).

---

### Step 4: Execute (`/execute`)

Create a feature branch from `dev` and implement:

```bash
git checkout dev && git pull origin dev
git checkout -b <your-username>/<prefix>-<N>-<slug>
```

Then run:
```
/execute implement phase <N> @docs/PHASE<N>_TRACKING.md
```

---

### Step 5: Review (`/review`)

```
/review
```

- Checks for security issues, error handling, types, production readiness
- Outputs findings with severity levels (CRITICAL / HIGH / MEDIUM / LOW)
- Fix any CRITICAL or HIGH issues before proceeding

Optional peer review:
```
/peer-review <paste findings from another model>
```

---

### Step 6: Document & Ship (`/document` then git push + PR + merge)

**Update docs:**
```
/document
```

**Commit & Push:**
```bash
git add <specific files>
git commit -m "phase<N>: <concise description>"
```

**Push & PR to `dev` using GH_TOKEN from `.claude/.env`:**
```bash
GH_TOKEN=$(grep GH_TOKEN .claude/.env | cut -d= -f2) git push -u origin <branch>

GH_TOKEN=$(grep GH_TOKEN .claude/.env | cut -d= -f2) gh pr create \
  --base dev \
  --title "Phase <N>: <Name>" \
  --body "## Summary\n- ...\n\n## Test plan\n- [ ] ..."

GH_TOKEN=$(grep GH_TOKEN .claude/.env | cut -d= -f2) gh pr merge <number> --merge

git checkout dev && GH_TOKEN=$(grep GH_TOKEN .claude/.env | cut -d= -f2) git pull origin dev
```

**IMPORTANT:** PRs from feature branches ALWAYS target `dev`, never `main`. Always use `GH_TOKEN` from `.claude/.env` for any `git push`, `gh pr`, or `gh` commands.

---

### Step 7: Update Issue Tracker (Merged to Dev)

Move all child tickets and the epic to "In Review" status. Add a comment noting the PR number.

---

### Step 8: Promote Dev to Main

After testing in `dev`, promote to `main`:

```bash
GH_TOKEN=$(grep GH_TOKEN .claude/.env | cut -d= -f2) gh pr create \
  --base main --head dev \
  --title "Promote: <summary>" \
  --body "## Promoting dev to main\n\n### Changes included\n- ..."

GH_TOKEN=$(grep GH_TOKEN .claude/.env | cut -d= -f2) gh pr merge <number> --merge

git checkout main && GH_TOKEN=$(grep GH_TOKEN .claude/.env | cut -d= -f2) git pull origin main
git checkout dev && git merge main
```

**IMPORTANT:** Never squash when promoting `dev` → `main`. Use merge commit to preserve history.

---

### Step 9: Update Issue Tracker (Promoted to Main)

Mark all child tickets and epic as Done. Add a completion comment.

---

## Quick Reference — Full Phase Command Sequence

```
1.  /explore <description> @docs/MODULE_XX.md
2.  /create-plan <description>
3.  Create epic + tickets in issue tracker
4.  git checkout dev && git checkout -b <your-username>/<prefix>-<N>-<slug>
5.  /execute implement phase <N> @docs/PHASE<N>_TRACKING.md
6.  /review
7.  /document
8.  git add + commit + push + PR to dev + merge (with GH_TOKEN)
9.  Update tickets + epic to In Review
--- testing happens in dev ---
10. PR from dev to main + merge (merge commit, no squash)
11. Update tickets + epic to Done
```

---

## Worktree Isolation

Sprint-auto and sprint skills use git worktrees for isolation.
Each issue gets its own worktree at `/tmp/<prefix>-<N>-worktree`.
Main working tree is never modified — safe to run multiple sprints in parallel.
Manual cleanup if needed: `git worktree remove /tmp/<prefix>-<N>-worktree --force`

---

## Code Conventions

<!-- Replace with YOUR project's conventions. Below is an example. -->

### Backend (Node.js/Express)
- CommonJS: `require()` / `module.exports`
- Controller pattern: `async (req, res, next) => { try { ... } catch (err) { next(err); } }`
- DB: parameterized queries only ($1, $2, ...)
- Auth middleware sets `req.user = { id, email }`
- Errors: `res.status(N).json({ error: { message: '...' } })`

### Frontend (Angular)
- Standalone components with inline template + styles
- Signals for state: `signal()`, `computed()`
- Control flow: `@if`, `@for`, `@switch`
- Lazy-loaded routes via `loadComponent`

### File Structure
```
backend/
  config/        — database, external services
  controllers/   — route handlers
  middleware/     — auth, error handling
  migrations/    — database migrations
  routes/        — route definitions
  server.js

frontend/src/app/
  components/    — shared/layout components
  guards/        — route guards
  interceptors/  — HTTP interceptors
  models/        — TypeScript interfaces
  pages/         — page components
  services/      — API services
  app.routes.ts
  app.config.ts
```

---

## Issue Tracker Status IDs

<!-- Replace with your Linear/Jira/GitHub status mappings -->

| Status | ID | Branch Mapping |
|--------|----|----------------|
| Backlog | `YOUR_BACKLOG_STATE_ID` | Not started |
| Todo | `YOUR_TODO_STATE_ID` | Planned |
| In Progress | `YOUR_IN_PROGRESS_STATE_ID` | Work on feature branch |
| In Review | `YOUR_IN_REVIEW_STATE_ID` | Merged to `dev`, testing |
| Done | `YOUR_DONE_STATE_ID` | Promoted to `main` |
| Canceled | `YOUR_CANCELED_STATE_ID` | — |

## Issue Tracker Label IDs

| Label | ID |
|-------|----|
| Feature | `YOUR_FEATURE_LABEL_ID` |
| Bug | `YOUR_BUG_LABEL_ID` |
| Improvement | `YOUR_IMPROVEMENT_LABEL_ID` |
