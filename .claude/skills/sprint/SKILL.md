# Sprint — Full Issue Lifecycle

Pick an issue, implement it end-to-end, merge to the work branch, and update the tracker (if available). Runs the full pipeline with a single checkpoint after plan creation.

This skill orchestrates sprint agents. Each stage is delegated to a specialized agent with an optimal model tier. Do NOT duplicate agent logic — launch them via the Agent tool and let them do their job.

<!-- CUSTOMIZE: Replace <PROJECT_ROOT>, <your-username>, <prefix>, <PREFIX>,
     and issue tracker IDs/commands with your values -->

## Optional Arguments

| Argument | Effect |
|----------|--------|
| `--skip-worktree` | Work directly in the current directory instead of creating a git worktree |
| `--keep-artefacts` | Don't delete tracking/explore docs after completion |
| `--skip-review` | Skip Stage 7 (code review) and Stage 7.5 (frontend design review) |

## Stage 0: Resolve Configuration

1. Read branch config from `<PROJECT_ROOT>/.claude/.env`:
   ```bash
   WORK_BRANCH=$(grep '^WORK_BRANCH=' <PROJECT_ROOT>/.claude/.env 2>/dev/null | cut -d= -f2)
   WORK_BRANCH=${WORK_BRANCH:-main}
   ```
2. Check for available integrations:
   ```bash
   GH_TOKEN=$(grep '^GH_TOKEN=' <PROJECT_ROOT>/.claude/.env 2>/dev/null | cut -d= -f2)
   LINEAR_API_KEY=$(grep '^LINEAR_API_KEY=' <PROJECT_ROOT>/.claude/.env 2>/dev/null | cut -d= -f2)
   ```
   - `GH_TOKEN` set → enable push/PR operations
   - `LINEAR_API_KEY` set → enable issue tracker operations
   - Neither set → fully local workflow

## Stage 1: Pick Issue

**If LINEAR_API_KEY is available:**
1. Fetch issues that are in **Todo** or **Backlog** status from your issue tracker.
2. Present the list to the <your-username> and ask which issue to pick (or auto-pick the highest priority one if <your-username> said "auto")
3. Read the full issue description to understand scope
4. Move the issue to **In Progress**

**If no LINEAR_API_KEY:**
1. Ask the <your-username> to describe the issue (title + description)
2. Ask for an issue identifier to use for branch naming (e.g., "feat-1", "fix-auth")

## Stage 2: Git Setup

**If `--skip-worktree` is set:**
1. Work directly in the current directory
2. Create a feature branch from `$WORK_BRANCH`:
   ```bash
   git checkout $WORK_BRANCH
   git pull origin $WORK_BRANCH 2>/dev/null || true
   git checkout -b <your-username>/<prefix>-<issue-number>-<slug-from-title>
   ```
3. Skip to Stage 3

**Default (worktree):**
1. Fetch latest work branch (no checkout needed):
   ```
   git fetch origin $WORK_BRANCH 2>/dev/null || true
   ```
2. Determine the worktree path and branch name:
   ```
   WORKTREE_DIR="/tmp/<prefix>-<issue-number>-worktree"
   BRANCH="<your-username>/<prefix>-<issue-number>-<slug-from-title>"
   ```
3. Check if worktree already exists (rerun after failure):
   ```
   git worktree list | grep "<prefix>-<issue-number>"
   ```
   - If it exists, `cd` into the existing worktree directory and skip to Stage 3
4. Create worktree with feature branch from work branch:
   ```
   git worktree add "$WORKTREE_DIR" -b "$BRANCH" origin/$WORK_BRANCH 2>/dev/null || git worktree add "$WORKTREE_DIR" -b "$BRANCH" $WORK_BRANCH
   ```
5. `cd` into the worktree — **ALL subsequent work happens here**:
   ```
   cd "$WORKTREE_DIR"
   ```
6. Install dependencies (worktree is a fresh checkout):
   ```
   cd frontend && npm ci && cd ..
   cd backend && npm ci && cd ..
   ```
   If `npm ci` fails, **STOP** and report the error.

## Stage 3: Explore

Launch the **sprint-explore** agent (haiku) using the Agent tool:
- `subagent_type: "sprint-explore"`
- In the prompt, provide:
  - The full issue description
  - Path to relevant module doc (if referenced in the issue)
  - The working directory path so it can read existing code
  - The explore doc path: `<working-dir>/docs/EXPLORE_TASK-<issue-number>.md` — the agent must write its findings here
- The agent will write an explore doc to disk and return a scope summary

Proceed directly to planning — no checkpoint.

## Stage 4: Plan (with checkpoint)

1. Launch the **sprint-plan** agent (opus) using the Agent tool:
   - `subagent_type: "sprint-plan"`
   - In the prompt, provide:
     - The issue description
     - The explore doc path: `<working-dir>/docs/EXPLORE_TASK-<issue-number>.md`
     - The tracking doc path: `<working-dir>/docs/TRACKING_TASK-<issue-number>.md`
     - The working directory path
   - The agent will read the explore doc and produce the tracking document
2. **CHECKPOINT — Present the plan to the <your-username> and wait for approval before continuing.**
   - Show the plan summary
   - Ask: "Plan ready. Proceed with implementation?"
   - If <your-username> says no or requests changes, revise the plan and ask again
   - Do NOT proceed to Stage 5 until <your-username> confirms

## Stage 5: Execute

Launch the **sprint-execute** agent (sonnet) using the Agent tool:
- `subagent_type: "sprint-execute"`
- In the prompt, provide:
  - The tracking doc path: `docs/TRACKING_TASK-<issue-number>.md`
  - The working directory path
  - The issue description for context

## Stage 6: Build Check

Verify both frontend and backend compile without errors before review.

1. **Frontend build:**
   ```
   cd frontend && npx ng build --configuration=development
   ```
   Must complete with zero errors. Warnings are OK.

2. **Backend syntax check** (syntax-only, avoids starting the server):
   ```
   cd backend && node --check server.js
   ```
   Also check each modified controller/migration file with `node --check <file>`.

3. If any build errors are found, fix them before proceeding to review.

## Stage 7: Review

**If `--skip-review` is set, skip this stage entirely.**

1. Launch the **sprint-review** agent (opus) using the Agent tool:
   - `subagent_type: "sprint-review"`
   - In the prompt, provide:
     - The working directory path
     - A summary of what was implemented
     - List of changed files (from `git diff --name-only $WORK_BRANCH`)
     - The explore doc path: `<working-dir>/docs/EXPLORE_TASK-<issue-number>.md`
     - The tracking doc path: `<working-dir>/docs/TRACKING_TASK-<issue-number>.md`
2. Auto-fix any CRITICAL or HIGH issues found, then re-run build check if fixes were applied

Proceed directly to frontend design review — no checkpoint.

## Stage 7.5: Frontend Design Review

**If `--skip-review` is set, skip this stage entirely.**

1. Check if any frontend files were changed (files matching `frontend/src/**/*.ts` or `frontend/src/styles.scss` in the git diff):
   - If **no frontend files changed**, skip this stage entirely.
2. Launch the **sprint-frontend-review** agent (sonnet) using the Agent tool:
   - `subagent_type: "sprint-frontend-review"`
   - In the prompt, provide:
     - The working directory path
     - List of changed frontend files (from `git diff --name-only $WORK_BRANCH`)
3. Auto-apply any CRITICAL or HIGH design/UX fixes reported by the agent.

Proceed directly to document & merge — no checkpoint.

## Stage 8: Document & Merge

1. Launch the **sprint-document** agent (sonnet) using the Agent tool:
   - `subagent_type: "sprint-document"`
   - In the prompt, provide:
     - The working directory path
     - The issue title and description
     - The explore doc path: `<working-dir>/docs/EXPLORE_TASK-<issue-number>.md`
     - The tracking doc path: `<working-dir>/docs/TRACKING_TASK-<issue-number>.md`
   - The agent should use the explore/tracking docs to understand changes — not read source files
2. Commit all changes:
   ```
   git add -A
   git commit -m "<type>: <concise description from issue title>"
   ```
   Use conventional commit types: `feat`, `fix`, `refactor`, `docs`, `chore`
3. **If GH_TOKEN is available — push and create PR:**
   ```bash
   GH_TOKEN=$(grep '^GH_TOKEN=' <PROJECT_ROOT>/.claude/.env | cut -d= -f2) git push -u origin $BRANCH
   ```
   Report: "Branch `$BRANCH` pushed. Ready for PR merge."
   Then invoke `/pr-merge <PREFIX>-<N>` to create the PR, merge, and clean up.
4. **If no GH_TOKEN — local merge:**
   ```bash
   git checkout $WORK_BRANCH
   git merge --no-ff $BRANCH -m "Merge $BRANCH into $WORK_BRANCH"
   ```
   **If `--skip-worktree` was used:**
   ```bash
   git branch -d $BRANCH
   ```
   **If worktree was used:**
   ```bash
   cd <PROJECT_ROOT>
   git worktree remove "$WORKTREE_DIR" --force
   git branch -d $BRANCH 2>/dev/null || true
   ```
5. **If LINEAR_API_KEY is available:**
   - Move the issue to **In Review** status
   - Add a comment noting the merge

## Stage 9: Cleanup

**If `--keep-artefacts` is set, skip cleanup of docs.**

1. Delete the tracking doc and explore doc:
   ```bash
   rm -f docs/TRACKING_TASK-<N>.md docs/EXPLORE_TASK-<N>.md
   git add docs/ && git commit -m "chore: remove tracking and explore docs for <PREFIX>-<N>" 2>/dev/null || true
   ```
2. If GH_TOKEN is available, push the cleanup commit:
   ```bash
   GH_TOKEN=$(grep '^GH_TOKEN=' <PROJECT_ROOT>/.claude/.env | cut -d= -f2) git push origin $WORK_BRANCH
   ```

Report final status: "<PREFIX>-<N> merged to $WORK_BRANCH."

## Rules

- Read branch and token config from `<PROJECT_ROOT>/.claude/.env` (absolute path — `.claude/` doesn't exist in worktrees)
- Never proceed past a checkpoint without explicit <your-username> approval
- If any stage fails, stop and report the error — do not retry blindly
- Keep the tracking doc updated throughout execution
- Do NOT reimplement logic from agents — launch them and let them do their job
- If a worktree already exists for the issue, reuse it instead of recreating
- When no GH_TOKEN: all git operations are local (no push, no PR)
- When no LINEAR_API_KEY: skip all issue tracker operations
