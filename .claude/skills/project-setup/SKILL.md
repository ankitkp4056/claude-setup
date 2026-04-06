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

Ask these questions **one group at a time**, grouped logically. Don't dump all questions at once.

**Group 1 — Project basics:**
> 1. Detect current directory with `pwd` and confirm with user: "I've detected your project root as `<path>`. Is this correct, or would you like to use a different directory?"
>    - If confirmed, use that path
>    - If different, ask for the absolute path
> 2. Brief project description? (e.g., "Task manager app", "Personal blog"). Optional — the user can skip this and fill it in later.

**Group 2 — Workflow mode (the central question):**

Present the three options clearly:

> How do you plan to manage this project?
>
> - **A) Fully local — no Git** — Files live on your machine only. No version control, no branches. Planning, execution, and review skills all work. Branch-based workflows (sprint, deploy, pr-merge) are not available.
> - **B) Local Git — no remote** — Git for version control and branching, but no GitHub remote. Commits, branches, and local merges all work. Push/PR features are skipped.
> - **C) GitHub — remote repo** — Full workflow: Git + GitHub remote. Enables push, pull requests, remote sync, and deploy/promote.

Then ask **only** the follow-up questions that apply to the chosen mode:

---

**If A (Fully local — no Git):**
No further questions needed for version control. Skip directly to Group 3 (issue tracking).

---

**If B (Local Git — no remote):**

Detect defaults before asking:
- **Prefix default:** derive from the project directory name (e.g., `my-app` → `myapp`). Strip hyphens/underscores and lowercase.
- **Username default:** read from `git config user.name`. If not set, default to none (optional for local).
- **Branch default:** single branch on `main` (recommended for solo local projects).

Present as a confirmation with defaults pre-filled:

> Here's what I'd recommend for your local Git setup. Press enter to accept or modify any:
>
> 1. **Issue prefix:** `<detected-prefix>` — used in branch names (e.g., `<prefix>-1-add-auth`) and doc names (e.g., `EXPLORE_<PREFIX>-1.md`). Change this if you have a tracker with its own prefix.
> 2. **Branch strategy:** Single branch on `main` *(recommended for solo local)* — or choose two branches (`dev` → `main`) for a staging workflow.
> 3. **Branch name prefix** *(optional)*: none — branches will be `<prefix>-1-slug`. Add a name (e.g., `yourname`) to get `yourname/<prefix>-1-slug`.

---

**If C (GitHub — remote repo):**

Detect defaults before asking:
- **Username default:** try `gh api user --jq .login 2>/dev/null`, then fall back to `git config user.name`, then ask.
- **Prefix default:** derive from the project directory name (same as option B).
- **Branch default:** two branches, `dev` → `main` (recommended for GitHub workflow).

Present as a confirmation with defaults pre-filled:

> Here's what I'd recommend for your GitHub setup. Press enter to accept or modify any:
>
> 1. **GitHub username:** `<detected-username>` — used in branch naming (e.g., `<username>/<prefix>-1-slug`). Important since branches are shared on the remote.
> 2. **Issue prefix:** `<detected-prefix>` — used in branch names and doc names.
> 3. **Branch strategy:** Two branches, `dev` → `main` *(recommended for GitHub)* — feature branches merge to `dev`, then promote to `main`. Or choose single branch on `main` if you prefer.
> 4. **GitHub token:** Do you have a personal access token (classic, with `repo` scope)? Paste it here or type "later" to add it to `.claude/.env` yourself.

---

**Group 3 — Issue tracking (ask for all modes):**
> Do you use Linear for issue tracking? If yes, do you have your API key and team ID? You can paste them here or add them later.

**Adapt based on answers:**
- If they already have values configured (from Stage 1), confirm them rather than re-asking
- If the user says "I'll add that later" for any token, comment out the line and move on
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
2. `<your-username>` → their git username (or "user" if not using git)
3. `<prefix>` → their issue prefix (lowercase) (or "task" if not using git)
4. `<PREFIX>` → their issue prefix (UPPERCASE) (or "TASK" if not using git)

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

<their project description, or just the project directory name if they skipped>
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
- Always default project root to current working directory (pwd), but allow user to override
- Validate the project root path exists before using it
- After setup, remind them to add `.claude/.env` to `.gitignore` if it's not already there
