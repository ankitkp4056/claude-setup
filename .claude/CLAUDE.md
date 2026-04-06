# CLAUDE.md — Project Workflow & Instructions

<!--
  CLAUDE.md is the main instruction file for Claude Code.
  It's loaded into every conversation and tells Claude how your project works.
  Customize each section below for your project.
-->

## Project

<!-- Describe your project in one line. Include the tech stack. -->
<!-- Run /project-setup to configure this interactively -->
Your Project Name — brief description.
Frontend framework + Backend framework + Database + other services.

## Branch Configuration

Branches are configured in `.claude/.env`. If not set, both default to `main` (single-branch local workflow).

```bash
WORK_BRANCH=dev        # Where feature branches are created from and merged into
TARGET_BRANCH=main     # Production branch — work branch is promoted here via /deploy
```

**When `WORK_BRANCH` == `TARGET_BRANCH` (e.g., both `main`):**
- Single-branch workflow. Feature branches merge directly to `main`.
- `/deploy --promote` is a no-op.

**When `WORK_BRANCH` != `TARGET_BRANCH` (e.g., `dev` and `main`):**
- Feature branches merge into `WORK_BRANCH` first.
- `/deploy --promote` merges `WORK_BRANCH` into `TARGET_BRANCH`.

```
feature-branch  →  WORK_BRANCH  →  TARGET_BRANCH
   (work)           (test)          (production)
```

**Rules:**
- Feature branches are always created from `WORK_BRANCH`.
- PRs (if using GitHub) target `WORK_BRANCH`, never `TARGET_BRANCH` directly.
- Promotion from `WORK_BRANCH` to `TARGET_BRANCH` uses merge commit (never squash).
- After promotion, sync `WORK_BRANCH` back: `git checkout $WORK_BRANCH && git merge $TARGET_BRANCH`.

**Branch naming:** `<your-username>/<prefix>-<N>-<slug>` (from your issue tracker ticket number).

---

## Cloud Integrations (Optional)

GitHub and Linear tokens are configured in `.claude/.env`. When absent, the pipeline works fully locally.

| Token | What it enables | Required by |
|-------|----------------|-------------|
| `GH_TOKEN` | Push to remote, PR creation, remote sync | `/deploy --sync`, `/deploy --promote` (via PR) |
| `LINEAR_API_KEY` + `LINEAR_TEAM_ID` | Issue tracking, status updates | `/linear-status`, `/create-issue` |

**Without `GH_TOKEN`:** All git operations are local. Commits, merges, and branch management work normally. Push/PR features are skipped.

**Without `LINEAR_API_KEY`:** Issue tracking is skipped. Sprint skills ask the user for issue details manually instead of fetching from Linear.

---

## Phase Lifecycle

Each development phase follows a strict pipeline. Run each step in order.

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

### Step 3: Create Issue Tracker Epic & Tickets (if Linear available)

<!-- If using Linear, replace IDs below with your workspace values.
     If using GitHub Issues, Jira, etc., adapt the commands accordingly.
     If fully local, skip this step. -->

Use your issue tracker's MCP tools to create project tracking.

**Workspace details (customize these):**
- Team: `YourTeam` (ID: `YOUR_TEAM_ID`)
- Labels: `Feature`, `Bug`, `Improvement`
- Statuses: `Backlog` → `Todo` → `In Progress` → `In Review` → `Done`
- Assignee: `Your Name` (ID: `YOUR_ASSIGNEE_ID`)

Create the epic, then create child tickets (one per task from the tracking doc).

---

### Step 4: Execute (`/execute`)

Create a feature branch from `WORK_BRANCH` and implement:

```bash
git checkout $WORK_BRANCH && git pull origin $WORK_BRANCH 2>/dev/null
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

### Step 6: Document & Ship (`/document` then merge)

**Update docs:**
```
/document
```

**Commit:**
```bash
git add <specific files>
git commit -m "phase<N>: <concise description>"
```

**If GH_TOKEN is available — push and PR:**
```bash
GH_TOKEN=$(grep '^GH_TOKEN=' .claude/.env | cut -d= -f2) git push -u origin <branch>

GH_TOKEN=$(grep '^GH_TOKEN=' .claude/.env | cut -d= -f2) gh pr create \
  --base $WORK_BRANCH \
  --title "Phase <N>: <Name>" \
  --body "## Summary\n- ...\n\n## Test plan\n- [ ] ..."

GH_TOKEN=$(grep '^GH_TOKEN=' .claude/.env | cut -d= -f2) gh pr merge <number> --merge

git checkout $WORK_BRANCH && git pull origin $WORK_BRANCH
```

**If no GH_TOKEN — local merge:**
```bash
git checkout $WORK_BRANCH
git merge --no-ff <branch> -m "Merge <branch> into $WORK_BRANCH"
git branch -d <branch>
```

---

### Step 7: Update Issue Tracker (if Linear available)

Move all child tickets and the epic to "In Review" status. Add a comment noting the merge.

---

### Step 8: Promote Work Branch to Target Branch

After testing in `WORK_BRANCH`, promote to `TARGET_BRANCH`:

```
/deploy --promote
```

Optionally sync to GitHub first:
```
/deploy --sync --promote
```

---

### Step 9: Update Issue Tracker (if Linear available)

Mark all child tickets and epic as Done. Add a completion comment.

---

## Quick Reference — Full Phase Command Sequence

```
1.  /explore <description> @docs/MODULE_XX.md
2.  /create-plan <description>
3.  Create epic + tickets in issue tracker (if available)
4.  git checkout $WORK_BRANCH && git checkout -b <your-username>/<prefix>-<N>-<slug>
5.  /execute implement phase <N> @docs/PHASE<N>_TRACKING.md
6.  /review
7.  /document
8.  Commit + merge to $WORK_BRANCH (via PR if GH_TOKEN, local merge otherwise)
9.  Update tickets + epic to In Review (if tracker available)
--- testing happens in $WORK_BRANCH ---
10. /deploy --promote (merge $WORK_BRANCH to $TARGET_BRANCH)
11. Update tickets + epic to Done (if tracker available)
```

---

## Worktree Isolation

Sprint-auto and sprint skills use git worktrees for isolation by default.
Each issue gets its own worktree at `/tmp/<prefix>-<N>-worktree`.
Main working tree is never modified — safe to run multiple sprints in parallel.
Manual cleanup if needed: `git worktree remove /tmp/<prefix>-<N>-worktree --force`

Use `--skip-worktree` with `/sprint` or `/sprint-auto` to work directly in the current directory instead.

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
  middleware/    — auth, error handling
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
| In Review | `YOUR_IN_REVIEW_STATE_ID` | Merged to `WORK_BRANCH`, testing |
| Done | `YOUR_DONE_STATE_ID` | Promoted to `TARGET_BRANCH` |
| Canceled | `YOUR_CANCELED_STATE_ID` | — |

## Issue Tracker Label IDs

| Label | ID |
|-------|----|
| Feature | `YOUR_FEATURE_LABEL_ID` |
| Bug | `YOUR_BUG_LABEL_ID` |
| Improvement | `YOUR_IMPROVEMENT_LABEL_ID` |
