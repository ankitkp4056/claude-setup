# Claude Code Setup

A production-ready Claude Code configuration with custom skills, agents, and a structured development workflow. Drop the `.claude/` folder into any project to get an opinionated, end-to-end development pipeline powered by Claude.

## What's Inside

```
.claude/
  CLAUDE.md                          # Main project instructions (customize this)
  .env                               # Token placeholders for GitHub & Linear
  agents/                            # Specialized sub-agents for sprint pipeline
    sprint-document.md               # Updates CHANGELOG after implementation
    sprint-execute.md                # Implements code from a tracking plan
    sprint-explore.md                # Explores codebase before planning
    sprint-frontend-review.md        # Reviews UI/UX quality of frontend changes
    sprint-plan.md                   # Creates implementation plans
    sprint-pr-merge.md               # Creates PR, merges, updates tracker
    sprint-review.md                 # Comprehensive code review
  skills/                            # Slash commands (/skill-name)
    create-issue/SKILL.md            # Quick issue capture mid-development
    create-plan/SKILL.md             # Generate a tracking doc from exploration
    deploy/SKILL.md                  # Promote dev to main + update tracker
    document/SKILL.md                # Update CHANGELOG and verify docs
    execute/SKILL.md                 # Implement from a tracking plan
    explore/SKILL.md                 # Understand scope before building
    linear-status/SKILL.md           # Quick Linear status overview
    linear-status/fetch-status.js    # Pre-fetch script for Linear data
    peer-review/SKILL.md             # Critically evaluate external review findings
    pr-merge/SKILL.md                # PR creation, merge, tracker update, cleanup
    review/SKILL.md                  # Code review with severity levels
    sprint/SKILL.md                  # Full issue lifecycle (with checkpoint)
    sprint-auto/SKILL.md             # Full issue lifecycle (fully autonomous)
```

## The Workflow

This setup implements a 9-step development pipeline that takes an issue from backlog to production:

```
1. /explore          Understand scope, ask questions
2. /create-plan      Generate a tracking document
3. Create tickets     Epic + child tickets in your issue tracker
4. /execute          Implement the plan (on a feature branch)
5. /review           Automated code review (CRITICAL/HIGH/MEDIUM/LOW)
6. /document         Update CHANGELOG
7. PR + merge        Push to dev via PR
8. /deploy           Promote dev to main
9. Update tracker    Mark issues as Done
```

The **`/sprint`** and **`/sprint-auto`** skills run this entire pipeline as a single command, using git worktrees for isolation so you can run multiple sprints in parallel.

### Sprint vs Sprint Auto

| | `/sprint` | `/sprint-auto` |
|---|---|---|
| **Checkpoint** | Pauses after planning for your approval | Fully autonomous, no stops |
| **Use case** | When you want to review the plan first | When you trust the pipeline end-to-end |

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
| `sprint-pr-merge` | Sonnet | PR + merge + cleanup |

Agents delegate to skills (the `SKILL.md` files), so all logic lives in one place. The agents are thin wrappers that set model tier and provide sprint context.

## Setup

### 1. Copy into your project

```bash
cp -r .claude/ /path/to/your-project/.claude/
```

### 2. Configure `.claude/.env`

```bash
# .claude/.env
GH_TOKEN=ghp_your_github_token
LINEAR_API_KEY=lin_api_your_linear_key
LINEAR_TEAM_ID=your-linear-team-uuid
```

The `GH_TOKEN` is used for `git push`, `gh pr create`, and `gh pr merge`.
The Linear keys are used by `/linear-status` and sprint skills.

### 3. Customize `CLAUDE.md`

This is the most important file. Open it and replace:

- **Project description** — your project name, tech stack
- **Branch naming** — your username and issue prefix (e.g., `yourname/proj-123-slug`)
- **Code conventions** — your project's patterns, file structure, frameworks
- **Issue tracker IDs** — your Linear/Jira/GitHub status and label IDs

The file has `<!-- CUSTOMIZE -->` comments to guide you.

### 4. Customize skills with `<PROJECT_ROOT>`

Several skills reference `<PROJECT_ROOT>` as a placeholder for your project's absolute path. Search and replace in:

- `skills/deploy/SKILL.md`
- `skills/pr-merge/SKILL.md`
- `skills/sprint/SKILL.md`
- `skills/sprint-auto/SKILL.md`

Also replace `<your-username>`, `<prefix>`, and `<PREFIX>` with your values.

### 5. Create .env and add to `.gitignore`

The `.env` file will keep API Keys and tokens that you want to share with Claude.:

```
.claude/.env
```

## Branching Strategy

This setup enforces a 3-tier branching model:

```
feature-branch  -->  dev  -->  main
   (work)          (test)    (production)
```

- Feature branches are created from `dev`
- PRs always target `dev`, never `main`
- `dev` is promoted to `main` via merge commit (never squash)
- After promotion, `dev` is synced back: `git merge main`

## Standalone Skills

These skills work independently outside the sprint pipeline:

| Skill | What it does |
|-------|-------------|
| `/explore` | Understand a feature before building it |
| `/create-plan` | Generate a tracking doc with tasks and progress |
| `/execute` | Implement from a tracking doc |
| `/review` | Code review with severity levels |
| `/document` | Update CHANGELOG after changes |
| `/deploy` | Promote dev to main |
| `/pr-merge` | Create PR, merge, update tracker, cleanup |
| `/create-issue` | Quick issue capture while you're mid-flow |
| `/peer-review` | Evaluate findings from another AI model's review |
| `/linear-status` | Quick overview of pending Linear work |

## Adapting for Your Stack

The skill files are framework-agnostic in their workflow logic. The framework-specific parts are:

- **Build check commands** in `sprint/SKILL.md` and `sprint-auto/SKILL.md` (currently `ng build` and `node --check`) — change these to your build/lint commands
- **Dependency install** (`npm ci` for frontend/backend) — change to your package manager
- **Code conventions** in `CLAUDE.md` — replace entirely with your patterns
- **Issue tracker** — skills reference Linear MCP tools; swap for your tracker's API or MCP server

## License

MIT
