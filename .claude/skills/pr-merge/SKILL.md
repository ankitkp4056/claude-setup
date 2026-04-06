# PR Merge — Branch Merge & Cleanup

Merge a feature branch into the work branch. If `GH_TOKEN` is available, creates a PR and merges via GitHub. Otherwise, merges locally. Updates the issue tracker if `LINEAR_API_KEY` is available. Cleans up the worktree and branch afterward.

Takes an issue number (e.g., `PREFIX-70`) or branch name as input.

<!-- CUSTOMIZE: Replace <PROJECT_ROOT>, <your-username>, and <prefix> with your values -->

## Stage 0: Resolve Configuration

1. Read config from `<PROJECT_ROOT>/.claude/.env`:
   ```bash
   WORK_BRANCH=$(grep '^WORK_BRANCH=' <PROJECT_ROOT>/.claude/.env 2>/dev/null | cut -d= -f2)
   WORK_BRANCH=${WORK_BRANCH:-main}
   GH_TOKEN=$(grep '^GH_TOKEN=' <PROJECT_ROOT>/.claude/.env 2>/dev/null | cut -d= -f2)
   LINEAR_API_KEY=$(grep '^LINEAR_API_KEY=' <PROJECT_ROOT>/.claude/.env 2>/dev/null | cut -d= -f2)
   ```

## Stage 1: Identify Branch & Validate

1. Determine the branch name from the input:
   - If given `<PREFIX>-<N>` or just a number, look for branch `<your-username>/<prefix>-<N>-*`
   - If given a full branch name, use it directly
2. Verify the branch exists:
   ```bash
   git branch --list "$BRANCH" || git branch -r --list "origin/$BRANCH"
   ```
   If not found, **STOP** — the branch doesn't exist.
3. Check if there's a worktree for this issue:
   ```bash
   git worktree list | grep "<prefix>-<N>"
   ```
4. If a worktree exists, check for uncommitted work:
   ```bash
   cd /tmp/<prefix>-<N>-worktree
   git status --porcelain
   ```
   If there are uncommitted changes, **STOP** — tell the user the branch has in-progress work.

## Stage 2: Merge to Work Branch

**If GH_TOKEN is available — PR merge:**
1. Ensure the branch is pushed to remote:
   ```bash
   GH_TOKEN=$(grep '^GH_TOKEN=' <PROJECT_ROOT>/.claude/.env | cut -d= -f2) \
     git push -u origin $BRANCH 2>/dev/null || true
   ```
2. Fetch the issue title from the tracker (if LINEAR_API_KEY available) for PR context.
3. Create the PR from the main working tree, targeting work branch:
   ```bash
   cd <PROJECT_ROOT>
   GH_TOKEN=$(grep '^GH_TOKEN=' <PROJECT_ROOT>/.claude/.env | cut -d= -f2) \
     gh pr create --base $WORK_BRANCH --head "$BRANCH" \
     --title "<Issue title or branch slug>" \
     --body "## Summary\n\n<brief description>\n\n## Changes\n- ...\n\n## Test plan\n- [ ] ..."
   ```
4. Merge the PR:
   ```bash
   GH_TOKEN=$(grep '^GH_TOKEN=' <PROJECT_ROOT>/.claude/.env | cut -d= -f2) \
     gh pr merge <pr-number> --merge
   ```
5. If merge fails due to conflicts:
   - Report the conflicting files
   - **STOP** — tell the user to resolve conflicts manually
6. Sync work branch locally:
   ```bash
   cd <PROJECT_ROOT>
   git checkout $WORK_BRANCH
   GH_TOKEN=$(grep '^GH_TOKEN=' <PROJECT_ROOT>/.claude/.env | cut -d= -f2) \
     git pull origin $WORK_BRANCH
   ```

**If no GH_TOKEN — local merge:**
1. From the main working tree:
   ```bash
   cd <PROJECT_ROOT>
   git checkout $WORK_BRANCH
   git merge --no-ff $BRANCH -m "Merge $BRANCH into $WORK_BRANCH"
   ```
2. If merge fails due to conflicts:
   - Report the conflicting files
   - **STOP** — tell the user to resolve conflicts manually

## Stage 3: Update Issue Tracker (if LINEAR_API_KEY available)

Feature branch merged to work branch means the issue is now being tested — move to **In Review**, not Done.

1. Move the issue to **In Review** status.
2. Add a comment: "Merged to $WORK_BRANCH. Testing in progress."
3. If the issue has a parent epic, check if all sibling issues are in Review or Done — if so, mark the epic as In Review too.

**Note:** Issues move to **Done** only after work branch is promoted to target branch (see `/deploy --promote`).

## Stage 4: Cleanup

1. Remove the worktree if it exists:
   ```bash
   git worktree remove "/tmp/<prefix>-<N>-worktree" --force 2>/dev/null || true
   ```
2. Delete the branch locally:
   ```bash
   git branch -d $BRANCH 2>/dev/null || true
   ```
3. If GH_TOKEN is available, delete remote branch:
   ```bash
   GH_TOKEN=$(grep '^GH_TOKEN=' <PROJECT_ROOT>/.claude/.env | cut -d= -f2) \
     git push origin --delete $BRANCH 2>/dev/null || true
   ```
4. Clean up stale local branches associated with the worktree:
   ```bash
   git branch | grep "<prefix>-<N>" | grep -v '^\*' | xargs -r git branch -D
   git branch | grep "worktree-agent-" | grep -v '^\*' | xargs -r git branch -D
   ```
5. Delete the tracking doc and explore doc:
   ```bash
   rm -f docs/TRACKING_<PREFIX>-<N>.md docs/EXPLORE_<PREFIX>-<N>.md
   git add docs/ && git commit -m "chore: remove tracking and explore docs for <PREFIX>-<N>" 2>/dev/null || true
   ```
6. If GH_TOKEN is available, push the cleanup:
   ```bash
   GH_TOKEN=$(grep '^GH_TOKEN=' <PROJECT_ROOT>/.claude/.env | cut -d= -f2) \
     git push origin $WORK_BRANCH
   ```

## Rules

- Read config from `<PROJECT_ROOT>/.claude/.env` (absolute path)
- All git operations run from the main working tree (`<PROJECT_ROOT>`), not the worktree
- PRs (if created) target `$WORK_BRANCH`, never `$TARGET_BRANCH`
- After merging, issue tracker status = **In Review** (not Done)
- Promotion to target branch is a separate step (`/deploy --promote`)
- If the branch has uncommitted work, refuse to proceed
- If merge conflicts occur, stop and report — do not force merge
- If any stage fails, stop and report the error — do not retry blindly
- When no GH_TOKEN: merge locally, skip PR and remote operations
- When no LINEAR_API_KEY: skip tracker operations
