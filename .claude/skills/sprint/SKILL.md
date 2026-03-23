# Sprint — Full Issue Lifecycle

Pick an issue from your tracker, implement it end-to-end, merge to dev, and update the tracker. Runs the full pipeline with a single checkpoint after plan creation.

This skill orchestrates sprint agents. Each stage is delegated to a specialized agent with an optimal model tier. Do NOT duplicate agent logic — launch them via the Agent tool and let them do their job.

<!-- CUSTOMIZE: Replace <PROJECT_ROOT>, <your-username>, <prefix>, <PREFIX>,
     and issue tracker IDs/commands with your values -->

## Stage 1: Pick Issue from Tracker

1. Fetch issues that are in **Todo** or **Backlog** status from your issue tracker.
2. Present the list to the user and ask which issue to pick (or auto-pick the highest priority one if user said "auto")
3. Read the full issue description to understand scope
4. Move the issue to **In Progress**

## Stage 2: Git Setup (Worktree)

1. Fetch latest dev (no checkout needed):
   ```
   git fetch origin dev
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
4. Create worktree with feature branch from dev:
   ```
   git worktree add "$WORKTREE_DIR" -b "$BRANCH" origin/dev
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
  - The worktree path so it can read existing code
  - The explore doc path: `<worktree>/docs/EXPLORE_<PREFIX>-<issue-number>.md` — the agent must write its findings here
- The agent will write an explore doc to disk and return a scope summary

Proceed directly to planning — no checkpoint.

## Stage 4: Plan (with checkpoint)

1. Launch the **sprint-plan** agent (opus) using the Agent tool:
   - `subagent_type: "sprint-plan"`
   - In the prompt, provide:
     - The issue description
     - The explore doc path: `<worktree>/docs/EXPLORE_<PREFIX>-<issue-number>.md`
     - The tracking doc path: `<worktree>/docs/TRACKING_<PREFIX>-<issue-number>.md`
     - The worktree path
   - The agent will read the explore doc and produce the tracking document
2. **CHECKPOINT — Present the plan to the user and wait for approval before continuing.**
   - Show the plan summary
   - Ask: "Plan ready. Proceed with implementation?"
   - If user says no or requests changes, revise the plan and ask again
   - Do NOT proceed to Stage 5 until user confirms

## Stage 5: Execute

Launch the **sprint-execute** agent (sonnet) using the Agent tool:
- `subagent_type: "sprint-execute"`
- In the prompt, provide:
  - The tracking doc path: `docs/TRACKING_<PREFIX>-<issue-number>.md`
  - The worktree path
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

1. Launch the **sprint-review** agent (opus) using the Agent tool:
   - `subagent_type: "sprint-review"`
   - In the prompt, provide:
     - The worktree path
     - A summary of what was implemented
     - List of changed files (from `git diff --name-only origin/dev`)
     - The explore doc path: `<worktree>/docs/EXPLORE_<PREFIX>-<issue-number>.md`
     - The tracking doc path: `<worktree>/docs/TRACKING_<PREFIX>-<issue-number>.md`
2. Auto-fix any CRITICAL or HIGH issues found, then re-run build check if fixes were applied

Proceed directly to frontend design review — no checkpoint.

## Stage 7.5: Frontend Design Review

1. Check if any frontend files were changed (files matching `frontend/src/**/*.ts` or `frontend/src/styles.scss` in the git diff):
   - If **no frontend files changed**, skip this stage entirely.
2. Launch the **sprint-frontend-review** agent (sonnet) using the Agent tool:
   - `subagent_type: "sprint-frontend-review"`
   - In the prompt, provide:
     - The worktree path
     - List of changed frontend files (from `git diff --name-only origin/dev`)
3. Auto-apply any CRITICAL or HIGH design/UX fixes reported by the agent.

Proceed directly to document & push — no checkpoint.

## Stage 8: Document & Push

1. Launch the **sprint-document** agent (sonnet) using the Agent tool:
   - `subagent_type: "sprint-document"`
   - In the prompt, provide:
     - The worktree path
     - The issue title and description
     - A summary of changes made
2. Commit all changes:
   ```
   git add -A
   git commit -m "<type>: <concise description from issue title>"
   ```
   Use conventional commit types: `feat`, `fix`, `refactor`, `docs`, `chore`
3. Push the branch to origin:
   ```
   GH_TOKEN=$(grep GH_TOKEN <PROJECT_ROOT>/.claude/.env | cut -d= -f2) git push -u origin <branch>
   ```
4. Report: "Branch `<branch>` pushed. Ready for PR merge."

## Stage 9: PR Merge & Cleanup

Invoke the `/pr-merge` skill with the issue number:
   ```
   /pr-merge <PREFIX>-<N>
   ```

   This handles:
   1. Creating a PR targeting `dev`
   2. Merging the PR
   3. Syncing `dev` locally
   4. Moving the issue to **In Review** + adding a comment
   5. Removing the worktree, deleting the branch, cleaning up tracking/explore docs

After `/pr-merge` completes, report final status: "<PREFIX>-<N> merged to dev and in review."

## Rules

- Always use `GH_TOKEN` from `<PROJECT_ROOT>/.claude/.env` (absolute path — `.claude/` doesn't exist in worktrees)
- Never proceed past a checkpoint without explicit user approval
- If any stage fails, stop and report the error — do not retry blindly
- Keep the tracking doc updated throughout execution
- Do NOT reimplement logic from agents — launch them and let them do their job
- If a worktree already exists for the issue, reuse it instead of recreating
