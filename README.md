# Claude Code Setup

A production-ready Claude Code configuration with custom skills, agents, and a structured development workflow. Drop the `.claude/` folder into any project to get an opinionated, end-to-end development pipeline powered by Claude.

Works fully locally with zero configuration. Optionally integrates with GitHub and Linear when tokens are available.

## What's Inside

```
.claude/
  CLAUDE.md                          # Main project instructions (customize this)
  .env                               # Branch config + optional tokens
  agents/                            # Specialized sub-agents for sprint pipeline
    sprint-document.md               # Updates CHANGELOG after implementation
    sprint-execute.md                # Implements code from a tracking plan
    sprint-explore.md                # Explores codebase before planning
    sprint-frontend-review.md        # Reviews UI/UX quality of frontend changes
    sprint-plan.md                   # Creates implementation plans
    sprint-pr-merge.md               # Merges branch, updates tracker, cleans up
    sprint-review.md                 # Comprehensive code review
  skills/                            # Slash commands (/skill-name)
    create-issue/SKILL.md            # Quick issue capture (requires Linear)
    create-plan/SKILL.md             # Generate a tracking doc from exploration
    deploy/SKILL.md                  # Sync to GitHub + promote to target branch
    document/SKILL.md                # Update CHANGELOG and verify docs
    execute/SKILL.md                 # Implement from a tracking plan
    explore/SKILL.md                 # Understand scope before building
    linear-status/SKILL.md           # Quick Linear status overview (requires Linear)
    linear-status/fetch-status.js    # Pre-fetch script for Linear data
    peer-review/SKILL.md             # Critically evaluate external review findings
    pr-merge/SKILL.md                # Branch merge, tracker update, cleanup
    review/SKILL.md                  # Code review with severity levels
    sprint/SKILL.md                  # Full issue lifecycle (with checkpoint)
    sprint-auto/SKILL.md             # Full issue lifecycle (fully autonomous)
```

## The Workflow

This setup implements a development pipeline that takes an issue from backlog to production:

```
1. /explore          Understand scope, ask questions
2. /create-plan      Generate a tracking document
3. Create tickets     Epic + child tickets (if Linear available)
4. /execute          Implement the plan (on a feature branch)
5. /review           Automated code review (CRITICAL/HIGH/MEDIUM/LOW)
6. /document         Update CHANGELOG
7. Merge             Local merge or PR (if GitHub available)
8. /deploy           Sync to remote + promote to target branch
9. Update tracker    Mark issues as Done (if Linear available)
```

The **`/sprint`** and **`/sprint-auto`** skills run this entire pipeline as a single command, using git worktrees for isolation so you can run multiple sprints in parallel.

### Sprint vs Sprint Auto

| | `/sprint` | `/sprint-auto` |
|---|---|---|
| **Checkpoint** | Pauses after planning for your approval | Fully autonomous, no stops |
| **Use case** | When you want to review the plan first | When you trust the pipeline end-to-end |

### Sprint Optional Arguments

Both `/sprint` and `/sprint-auto` accept these flags:

| Flag | Effect |
|------|--------|
| `--skip-worktree` | Work in current directory instead of creating a worktree |
| `--keep-artefacts` | Keep tracking/explore docs after completion |
| `--skip-review` | Skip code review and frontend design review stages |

## How Agents Work

Each sprint stage is handled by a specialized agent with an optimized model tier:

| Agent | Model | Role |
|-------|-------|------|
| `sprint-explore` | Haiku | Fast codebase exploration |
| `sprint-plan` | Opus | Architectural planning |
| `sprint-execute` | Sonnet | Code implementation |
| `sprint-review` | Opus | Thorough code review |
| `sprint-frontend-review` | Sonnet | UI/UX design review |
| `sprint-document` | Sonnet | Documentation updates |
| `sprint-pr-merge` | Sonnet | Branch merge + cleanup |

Agents delegate to skills (the `SKILL.md` files), so all logic lives in one place. The agents are thin wrappers that set model tier and provide sprint context.

## Setup

### Quick Start (recommended)

```bash
cp -r .claude/ /path/to/your-project/.claude/
```

Then open Claude Code in your project and run:

```
/project-setup
```

This walks you through everything interactively — project path, branches, GitHub, Linear, username, issue prefix. No manual file editing needed.

### Manual Setup

If you prefer to configure manually:

**1. Configure `.claude/.env`:**

```bash
# Branch configuration (defaults to main if not set)
WORK_BRANCH=dev
TARGET_BRANCH=main

# GitHub integration (optional)
GH_TOKEN=ghp_your_github_token

# Linear integration (optional)
LINEAR_API_KEY=lin_api_your_linear_key
LINEAR_TEAM_ID=your-linear-team-uuid
```

**2. Replace placeholders** in skill files (`sprint/SKILL.md`, `sprint-auto/SKILL.md`, `deploy/SKILL.md`, `pr-merge/SKILL.md`):
- `<PROJECT_ROOT>` → your absolute project path
- `<your-username>` → your git username
- `<prefix>` / `<PREFIX>` → your issue prefix (lowercase / UPPERCASE)

**3. Customize `CLAUDE.md`** — project description, code conventions, issue tracker IDs.

**4. Add `.env` to `.gitignore`:**

```
.claude/.env
```

## Branch Configuration

Branches are configured in `.claude/.env`:

```bash
WORK_BRANCH=dev        # Where feature branches merge into
TARGET_BRANCH=main     # Production branch (promoted to via /deploy)
```

**Single-branch workflow** (default): Both default to `main`. Feature branches merge directly to `main`. `/deploy --promote` is a no-op.

**Two-branch workflow**: Set `WORK_BRANCH=dev` and `TARGET_BRANCH=main`. Feature branches merge to `dev`, then `/deploy --promote` merges `dev` into `main`.

```
feature-branch  →  WORK_BRANCH  →  TARGET_BRANCH
   (work)           (test)          (production)
```

## Cloud Integrations

All integrations are optional. The pipeline works fully locally without any tokens.

| Token | What it enables | Required by |
|-------|----------------|-------------|
| `GH_TOKEN` | Push, PRs, remote sync | `/deploy --sync`, PR-based merges |
| `LINEAR_API_KEY` | Issue tracking | `/linear-status`, `/create-issue` |
| `LINEAR_TEAM_ID` | Team context for Linear | `/linear-status` |

**Without tokens:** Commits and merges happen locally. Sprint skills ask the user for issue details instead of fetching from Linear. Push/PR steps are skipped.

## Standalone Skills

These skills work independently outside the sprint pipeline:

| Skill | What it does | Requires tokens? |
|-------|-------------|-----------------|
| `/project-setup` | Interactive configuration wizard | No |
| `/explore` | Understand a feature before building it | No |
| `/create-plan` | Generate a tracking doc with tasks and progress | No |
| `/execute` | Implement from a tracking doc | No |
| `/review` | Code review with severity levels | No |
| `/document` | Update CHANGELOG after changes | No |
| `/peer-review` | Evaluate findings from another AI model's review | No |
| `/pr-merge` | Merge branch, update tracker, cleanup | No (enhanced with GH_TOKEN) |
| `/deploy` | Sync to GitHub + promote to target branch | `--sync` needs GH_TOKEN |
| `/create-issue` | Quick issue capture while you're mid-flow | Yes (LINEAR_API_KEY) |
| `/linear-status` | Quick overview of pending Linear work | Yes (LINEAR_API_KEY) |

## Adapting for Your Stack

The skill files are framework-agnostic in their workflow logic. The framework-specific parts are:

- **Build check commands** in `sprint/SKILL.md` and `sprint-auto/SKILL.md` (currently `ng build` and `node --check`) — change these to your build/lint commands
- **Dependency install** (`npm ci` for frontend/backend) — change to your package manager
- **Code conventions** in `CLAUDE.md` — replace entirely with your patterns
- **Issue tracker** — skills reference Linear MCP tools; swap for your tracker's API or MCP server

## License

MIT
