# Deploy — Sync & Promote

Sync your work branch to GitHub and/or promote it to the target branch. Requires at least one flag.

Takes an optional summary description as input. If not provided, auto-generates from recent commits.

<!-- CUSTOMIZE: Replace <PROJECT_ROOT> with your project's absolute path -->

## Optional Arguments

| Argument | Effect |
|----------|--------|
| `--sync` | Push the work branch to GitHub remote (requires `GH_TOKEN`) |
| `--promote` | Merge work branch into target branch |

If no arguments are provided, show a status summary of what would happen with each flag.

## Stage 0: Resolve Configuration

1. Read branch config from `<PROJECT_ROOT>/.claude/.env`:
   ```bash
   WORK_BRANCH=$(grep '^WORK_BRANCH=' <PROJECT_ROOT>/.claude/.env 2>/dev/null | cut -d= -f2)
   WORK_BRANCH=${WORK_BRANCH:-main}
   TARGET_BRANCH=$(grep '^TARGET_BRANCH=' <PROJECT_ROOT>/.claude/.env 2>/dev/null | cut -d= -f2)
   TARGET_BRANCH=${TARGET_BRANCH:-main}
   GH_TOKEN=$(grep '^GH_TOKEN=' <PROJECT_ROOT>/.claude/.env 2>/dev/null | cut -d= -f2)
   LINEAR_API_KEY=$(grep '^LINEAR_API_KEY=' <PROJECT_ROOT>/.claude/.env 2>/dev/null | cut -d= -f2)
   ```
2. If `--sync` is requested but `GH_TOKEN` is not set, **STOP** — tell the user to configure `GH_TOKEN` in `.claude/.env`.
3. If `--promote` is requested and `WORK_BRANCH` == `TARGET_BRANCH`, **STOP** — nothing to promote (single-branch workflow).

## Stage 1: Pre-flight Checks

1. Ensure we're in the main working tree:
   ```bash
   cd <PROJECT_ROOT>
   ```
2. Ensure work branch is up to date:
   ```bash
   git checkout $WORK_BRANCH
   git pull origin $WORK_BRANCH 2>/dev/null || true
   ```
3. Check for uncommitted changes:
   ```bash
   git status --porcelain
   ```
   If dirty, **STOP** — tell the user to commit or stash changes first.

## Stage 2: Status (no flags)

**If no `--sync` or `--promote` flags provided**, show status and exit:

1. Show commits on work branch since last sync with target:
   ```bash
   git log $TARGET_BRANCH..$WORK_BRANCH --oneline --no-merges 2>/dev/null || echo "No divergence (or single-branch workflow)"
   ```
2. Show whether GH_TOKEN is configured
3. Show current WORK_BRANCH and TARGET_BRANCH values
4. Suggest: "Run `/deploy --sync` to push to GitHub, `/deploy --promote` to merge into $TARGET_BRANCH, or both."
5. **EXIT** — do not proceed to further stages.

## Stage 3: Sync (`--sync`)

**Only runs if `--sync` flag is set.**

1. Push work branch to remote:
   ```bash
   GH_TOKEN=$(grep '^GH_TOKEN=' <PROJECT_ROOT>/.claude/.env | cut -d= -f2) \
     git push -u origin $WORK_BRANCH
   ```
2. If target branch exists locally, push it too:
   ```bash
   git rev-parse --verify $TARGET_BRANCH >/dev/null 2>&1 && \
     GH_TOKEN=$(grep '^GH_TOKEN=' <PROJECT_ROOT>/.claude/.env | cut -d= -f2) \
       git push origin $TARGET_BRANCH
   ```
3. Report: "Work branch `$WORK_BRANCH` synced to GitHub."

## Stage 4: Promote (`--promote`)

**Only runs if `--promote` flag is set.**

1. Check that work branch is ahead of target (there's something to promote):
   ```bash
   git log $TARGET_BRANCH..$WORK_BRANCH --oneline
   ```
   If empty, **STOP** — nothing to promote.

2. Gather change summary:
   ```bash
   git log $TARGET_BRANCH..$WORK_BRANCH --oneline --no-merges
   ```

3. **If GH_TOKEN is available — promote via PR:**
   ```bash
   # Check for existing open PR
   GH_TOKEN=$(grep '^GH_TOKEN=' <PROJECT_ROOT>/.claude/.env | cut -d= -f2) \
     gh pr list --base $TARGET_BRANCH --head $WORK_BRANCH --state open
   ```
   If one exists, **STOP** — tell the user there's already an open promotion PR.

   ```bash
   GH_TOKEN=$(grep '^GH_TOKEN=' <PROJECT_ROOT>/.claude/.env | cut -d= -f2) \
     gh pr create --base $TARGET_BRANCH --head $WORK_BRANCH \
     --title "Promote: <summary>" \
     --body "## Promoting $WORK_BRANCH to $TARGET_BRANCH\n\n### Changes included\n<list>"

   GH_TOKEN=$(grep '^GH_TOKEN=' <PROJECT_ROOT>/.claude/.env | cut -d= -f2) \
     gh pr merge <pr-number> --merge
   ```

4. **If no GH_TOKEN — local merge:**
   ```bash
   git checkout $TARGET_BRANCH
   git merge --no-ff $WORK_BRANCH -m "Promote $WORK_BRANCH to $TARGET_BRANCH"
   ```

5. Sync work branch back:
   ```bash
   git checkout $WORK_BRANCH
   git merge $TARGET_BRANCH
   ```

## Stage 5: Update Issue Tracker (if LINEAR_API_KEY available)

1. Look for issue references in the promoted commits.
2. For each referenced issue, move to **Done** status.
3. If any issue has a parent (epic), check if all siblings are now Done — if so, mark the epic as Done too.
4. Add a comment on each completed epic: "Promoted to $TARGET_BRANCH. Production-ready."

## Stage 6: Summary

Print a summary:
- What was done (sync / promote / both)
- PR number and URL (if PR was created)
- List of issues moved to Done (if tracker available)
- Confirmation that branches are in sync

## Rules

- Always use `GH_TOKEN` from `<PROJECT_ROOT>/.claude/.env` (absolute path)
- All git operations run from the main working tree (`<PROJECT_ROOT>`)
- **Never squash** when promoting — always use merge commit to preserve history
- Only promote `WORK_BRANCH` to `TARGET_BRANCH`, never feature branches directly
- If there are conflicts, stop and report — do not force merge
- If any stage fails, stop and report the error — do not retry blindly
- After promoting, always sync work branch back with `git merge $TARGET_BRANCH`
- `--sync` requires `GH_TOKEN`. `--promote` requires `WORK_BRANCH` != `TARGET_BRANCH`.
