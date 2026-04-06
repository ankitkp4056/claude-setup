# Project Setup — Interactive Configuration

Walk the user through configuring this Claude Code setup for their project. Detect what's already configured, ask targeted questions, then apply all changes.

## Stage 1: Detect Current State

Read `.claude/.env` and check which values are already set (not commented out):

```bash
grep -v '^#' .claude/.env | grep -v '^$'
```

Also check for placeholder values still present in skill files:

```bash
grep -rl '<PROJECT_ROOT>\|<your-username>\|<prefix>\|<PREFIX>' .claude/skills/ .claude/agents/ .claude/CLAUDE.md 2>/dev/null
```

Build a status summary:

| Setting | Status |
|---------|--------|
| WORK_BRANCH | `set: dev` or `not set (defaults to main)` |
| TARGET_BRANCH | `set: main` or `not set (defaults to main)` |
| GH_TOKEN | `configured` or `not configured` |
| LINEAR_API_KEY | `configured` or `not configured` |
| LINEAR_TEAM_ID | `configured` or `not configured` |
| Project root | `configured` or `placeholder (<PROJECT_ROOT>)` |
| Username | `configured` or `placeholder (<your-username>)` |
| Issue prefix | `configured` or `placeholder (<prefix>)` |

Present this to the user: "Here's what's currently configured. Let me walk you through the rest."

If everything is already configured, say so and ask if they want to reconfigure anything.

## Stage 2: Understand the User's Workflow

Ask these questions **one message at a time**, grouped logically. Don't dump all questions at once.

**Group 1 — Project basics:**
> 1. What's the absolute path to your project root? (I need this so skills can reference it — e.g., `/home/you/projects/my-app`)
> 2. Brief project description and tech stack? (e.g., "Task manager — React + Express + PostgreSQL")

**Group 2 — Git & branching:**
> 3. What's your GitHub username? (used for branch naming like `username/feat-1-slug`)
> 4. What prefix do you use for issues/tickets? (e.g., `proj` → branches become `username/proj-1-slug`, docs become `EXPLORE_PROJ-1.md`). If you don't use a tracker, pick a short project abbreviation.
> 5. How do you want to manage branches?
>    - **Single branch** — everything on `main` (simplest, good for solo/local projects)
>    - **Two branches** — feature branches merge to a work branch (e.g., `dev`), then promote to production (e.g., `main`)
>    - *(If two branches)* What are your branch names? (default: `dev` → `main`)

**Group 3 — Integrations (skip if user already said "fully local"):**
> 6. Do you use GitHub for this project? If yes, do you have a personal access token (classic, with `repo` scope)? You can paste it here or add it later.
> 7. Do you use Linear for issue tracking? If yes, do you have your API key and team ID? You can paste them here or add it later.

**Adapt based on answers:**
- If they say "fully local" or "no GitHub", skip the GitHub token question
- If they say "no issue tracker", skip the Linear question
- If they already have values configured (from Stage 1), confirm them rather than re-asking
- Don't ask about build commands yet — the defaults (`ng build`, `node --check`) can be changed later

## Stage 3: Apply Configuration

Once all answers are collected, apply changes in this order:

### 3a. Update `.claude/.env`

Write the env file with their values. Comment out anything they didn't provide:

```
# Claude tooling configuration

# Branch configuration (defaults to main if not set)
WORK_BRANCH=<their-value-or-comment-out>
TARGET_BRANCH=<their-value-or-comment-out>

# GitHub integration (optional)
GH_TOKEN=<their-token-or-comment-out>

# Linear integration (optional)
LINEAR_API_KEY=<their-key-or-comment-out>
LINEAR_TEAM_ID=<their-id-or-comment-out>
```

### 3b. Update skill files — replace placeholders

Search and replace across all skill and agent files:

1. `<PROJECT_ROOT>` → their absolute project path
2. `<your-username>` → their GitHub/git username
3. `<prefix>` → their issue prefix (lowercase)
4. `<PREFIX>` → their issue prefix (UPPERCASE)

Files to update:
- `.claude/skills/sprint-auto/SKILL.md`
- `.claude/skills/sprint/SKILL.md`
- `.claude/skills/deploy/SKILL.md`
- `.claude/skills/pr-merge/SKILL.md`

Use exact string replacement. Verify each file after replacing.

### 3c. Update CLAUDE.md — project section

Replace the placeholder project description at the top of `.claude/CLAUDE.md`:

```markdown
## Project

<their project description and tech stack>
```

Leave the rest of CLAUDE.md unchanged — it's already configured by the env file and skill placeholders.

## Stage 4: Verification & Summary

After applying all changes, verify nothing was missed:

```bash
grep -rn '<PROJECT_ROOT>\|<your-username>\|<prefix>\|<PREFIX>' .claude/skills/ .claude/agents/ .claude/CLAUDE.md 2>/dev/null
```

If any placeholders remain, report them.

Then print a summary:

```
## Setup Complete

**Project:** <name> — <stack>
**Branches:** <WORK_BRANCH> → <TARGET_BRANCH> (or "single branch: main")
**GitHub:** ✓ configured / ✗ not configured (add GH_TOKEN to .claude/.env later)
**Linear:** ✓ configured / ✗ not configured (add LINEAR_API_KEY to .claude/.env later)
**Username:** <username>
**Issue prefix:** <prefix>

### What you can do now
- `/explore` + `/create-plan` + `/execute` — plan and build features
- `/sprint` or `/sprint-auto` — full issue lifecycle
- `/review` — code review
<if GitHub configured>
- `/deploy --sync` — push to GitHub
- `/deploy --promote` — merge <WORK_BRANCH> to <TARGET_BRANCH>
<if Linear configured>
- `/linear-status` — check pending work
- `/create-issue` — capture a bug/feature quickly

### Optional next steps
<only show items that aren't configured yet>
- Add `GH_TOKEN` to `.claude/.env` to enable GitHub push/PR features
- Add `LINEAR_API_KEY` and `LINEAR_TEAM_ID` to `.claude/.env` for issue tracking
- Customize build commands in `sprint/SKILL.md` and `sprint-auto/SKILL.md` (currently `ng build` + `node --check`)
- Customize code conventions in `CLAUDE.md` to match your project patterns
```

## Rules

- Ask questions conversationally, not as a checklist dump
- Group related questions together (max 2-3 per message)
- Skip questions for things already configured — confirm instead
- Never store tokens in any file other than `.claude/.env`
- If the user says "I'll add that later", comment out the line and move on
- Validate the project root path exists before using it
- After setup, remind them to add `.claude/.env` to `.gitignore` if it's not already there
