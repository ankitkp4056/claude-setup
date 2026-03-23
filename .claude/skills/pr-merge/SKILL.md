# PR Merge & Linear Update

Create a PR for a sprint branch, merge it into dev, update the issue tracker, and clean up the worktree.

Takes an issue number (e.g., `PREFIX-70`) or branch name as input.

<!-- CUSTOMIZE: Replace <PROJECT_ROOT>, <your-username>, and <prefix> with your values -->

## Stage 1: Identify Branch & Validate

1. Determine the branch name from the input:
   - If given `<PREFIX>-<N>` or just a number, look for branch `<your-username>/<prefix>-<N>-*`
   - If given a full branch name, use it directly
2. Verify the branch exists on the remote:
   ```bash
   git fetch origin
   git branch -r | grep "<branch>"
   ```
   If not found, **STOP** — the branch hasn't been pushed yet.
3. Check if there's a worktree for this issue:
   ```bash
   git worktree list | grep "<prefix>-<N>"
   ```
4. If a worktree exists, check for uncommitted or unpushed work:
   ```bash
   cd /tmp/<prefix>-<N>-worktree
   git status --porcelain
   git log origin/<branch>..HEAD --oneline
   ```
   If there are uncommitted changes or unpushed commits, **STOP** — tell the user the branch has in-progress work.

## Stage 2: Create PR (targeting dev)

1. Fetch the issue title and description from your issue tracker for PR context.
2. Create the PR from the main working tree, **targeting dev**:
   ```bash
   cd <PROJECT_ROOT>
   GH_TOKEN=$(grep GH_TOKEN <PROJECT_ROOT>/.claude/.env | cut -d= -f2) \
     gh pr create --base dev --head "<branch>" \
     --title "<Issue title>" \
     --body "## Summary\n\nResolves <PREFIX>-<N>\n\n<brief description>\n\n## Changes\n- ...\n\n## Test plan\n- [ ] ..."
   ```

## Stage 3: Merge PR into dev

1. Merge the PR:
   ```bash
   GH_TOKEN=$(grep GH_TOKEN <PROJECT_ROOT>/.claude/.env | cut -d= -f2) \
     gh pr merge <pr-number> --merge
   ```
2. If merge fails due to conflicts:
   - Report the conflicting files
   - **STOP** — tell the user to resolve conflicts manually
3. Sync dev locally:
   ```bash
   cd <PROJECT_ROOT>
   git checkout dev
   GH_TOKEN=$(grep GH_TOKEN <PROJECT_ROOT>/.claude/.env | cut -d= -f2) \
     git pull origin dev
   ```

## Stage 4: Update Issue Tracker (In Review)

Feature branch merged to dev means the issue is now being tested — move to **In Review**, not Done.

1. Move the issue to **In Review** status.
2. Add a comment: "Merged to dev (PR #<number>). Testing in dev environment."
3. If the issue has a parent epic, check if all sibling issues are in Review or Done — if so, mark the epic as In Review too.

**Note:** Issues move to **Done** only after `dev` is promoted to `main` (see CLAUDE.md Step 8-9).

## Stage 5: Cleanup

1. Remove the worktree if it exists:
   ```bash
   git worktree remove "/tmp/<prefix>-<N>-worktree" --force
   ```
2. Delete the branch locally and remotely:
   ```bash
   git branch -d <branch>
   GH_TOKEN=$(grep GH_TOKEN <PROJECT_ROOT>/.claude/.env | cut -d= -f2) \
     git push origin --delete <branch>
   ```
3. Clean up stale local branches associated with the worktree:
   ```bash
   git branch | grep "<prefix>-<N>" | grep -v '^\*' | xargs -r git branch -D
   git branch | grep "worktree-agent-" | grep -v '^\*' | xargs -r git branch -D
   ```
4. Delete the tracking doc and explore doc:
   ```bash
   rm -f docs/TRACKING_<PREFIX>-<N>.md docs/EXPLORE_<PREFIX>-<N>.md
   git add docs/ && \
   git commit -m "chore: remove tracking and explore docs for <PREFIX>-<N>" && \
   GH_TOKEN=$(grep GH_TOKEN <PROJECT_ROOT>/.claude/.env | cut -d= -f2) \
     git push origin dev
   ```

## Rules

- Always use `GH_TOKEN` from `<PROJECT_ROOT>/.claude/.env` (absolute path)
- All git operations run from the main working tree (`<PROJECT_ROOT>`), not the worktree
- PRs from feature branches ALWAYS target `dev`, never `main`
- After merging to dev, issue tracker status = **In Review** (not Done)
- Promotion from dev to main is a separate step (CLAUDE.md Step 8)
- If the branch has unpushed or uncommitted work, refuse to proceed
- If merge conflicts occur, stop and report — do not force merge
- If any stage fails, stop and report the error — do not retry blindly
