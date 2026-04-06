# Update Documentation Task

You are updating documentation after code changes. Prioritize speed — use existing artefacts, not code files.

## 1. Identify Changes

Use these sources (do NOT read code files):
- **Tracking doc** (`docs/TRACKING_*.md`) — lists all tasks and what was implemented
- **Explore doc** (`docs/EXPLORE_*.md`) — scope summary, dependencies, integration points
- **Git diff summary** — `git diff --stat` for a quick overview of changed files
- **Issue description** — provided in your prompt

These artefacts contain everything you need. Do not read individual source files.

## 2. Update CHANGELOG.md

Add entry under "Unreleased" section:
- Use categories: Added, Changed, Fixed, Security, Removed
- Be concise, <your-username>-facing language
- Base entries on the tracking doc tasks (they describe what was built)

## 3. Documentation Style Rules

- Concise — sacrifice grammar for brevity
- Practical — examples over theory
- Accurate — based on tracking doc and explore doc, not assumptions
- Current — matches what was actually implemented per the tracking doc

No enterprise fluff. No outdated information. No assumptions without verification.

## 4. Ask if Uncertain

If you're unsure about intent behind a change or <your-username>-facing impact, **ask the <your-username>** — don't guess.
