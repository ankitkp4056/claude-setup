# Deploy — Promote Dev to Main

Promote the `dev` branch to `main` (production), update issue tracker to Done, and sync branches.

Takes an optional summary description as input. If not provided, auto-generates from recent commits on `dev` since last merge to `main`.

<!-- CUSTOMIZE: Replace <PROJECT_ROOT> with your project's absolute path -->

## Stage 1: Pre-flight Checks

1. Ensure we're in the main working tree:
   ```bash
   cd <PROJECT_ROOT>
   ```
2. Fetch latest and ensure `dev` is up to date:
   ```bash
   git fetch origin
   git checkout dev
   GH_TOKEN=$(grep GH_TOKEN <PROJECT_ROOT>/.claude/.env | cut -d= -f2) \
     git pull origin dev
   ```
3. Check for uncommitted changes:
   ```bash
   git status --porcelain
   ```
   If dirty, **STOP** — tell the user to commit or stash changes first.
4. Check that `dev` is ahead of `main` (there's something to promote):
   ```bash
   git log origin/main..origin/dev --oneline
   ```
   If empty, **STOP** — nothing to promote.
5. Check for open PRs already targeting main from dev:
   ```bash
   GH_TOKEN=$(grep GH_TOKEN <PROJECT_ROOT>/.claude/.env | cut -d= -f2) \
     gh pr list --base main --head dev --state open
   ```
   If one exists, **STOP** — tell the user there's already an open promotion PR.

## Stage 2: Gather Change Summary

1. Collect commits being promoted:
   ```bash
   git log origin/main..origin/dev --oneline --no-merges
   ```
2. Look for issue references (e.g., PREFIX-N) in commit messages and PR titles:
   ```bash
   git log origin/main..origin/dev --oneline | grep -oP '<PREFIX>-\d+' | sort -u
   ```
3. For each referenced issue, fetch the title from your issue tracker.
4. Build a summary of changes from the commits and issue titles.

## Stage 3: Create PR (dev -> main)

1. Create the promotion PR:
   ```bash
   GH_TOKEN=$(grep GH_TOKEN <PROJECT_ROOT>/.claude/.env | cut -d= -f2) \
     gh pr create --base main --head dev \
     --title "Promote: <summary>" \
     --body "## Promoting dev to main\n\n### Changes included\n<list of changes>\n\n### Issues resolved\n<list>"
   ```

## Stage 4: Merge PR

1. Merge using merge commit (never squash):
   ```bash
   GH_TOKEN=$(grep GH_TOKEN <PROJECT_ROOT>/.claude/.env | cut -d= -f2) \
     gh pr merge <pr-number> --merge
   ```
2. If merge fails due to conflicts:
   - Report the conflicting files
   - **STOP** — tell the user to resolve conflicts manually
3. Sync both branches locally:
   ```bash
   git checkout main
   GH_TOKEN=$(grep GH_TOKEN <PROJECT_ROOT>/.claude/.env | cut -d= -f2) \
     git pull origin main
   git checkout dev
   git merge main
   ```

## Stage 5: Update Issue Tracker (Done)

1. For each issue found in Stage 2, move to **Done** status.
2. If any issue has a parent (epic), check if all siblings are now Done — if so, mark the epic as Done too.
3. Add a comment on each completed epic: "Promoted to main (PR #<number>). Production-ready."

## Stage 6: Summary

Print a summary:
- PR number and URL
- List of issues moved to Done
- Any epics completed
- Confirmation that `dev` and `main` are in sync

## Rules

- Always use `GH_TOKEN` from `<PROJECT_ROOT>/.claude/.env` (absolute path)
- All git operations run from the main working tree (`<PROJECT_ROOT>`)
- **Never squash** when promoting `dev` to `main` — always use merge commit to preserve history
- Only promote `dev` to `main`, never feature branches directly
- If there are conflicts, stop and report — do not force merge
- If any stage fails, stop and report the error — do not retry blindly
- After merging to main, always sync `dev` back with `git merge main`
