# Linear Status Check

Quick check of pending work in Linear. Uses a pre-fetch script for a fast overview, then dives into details only where needed.

## Your Goal

Give the user a concise summary of what's pending in Linear. Start with the lightweight overview script, then use MCP tools only for items that need attention.

## How to Get There

### Step 1: Run the pre-fetch script

```bash
node .claude/skills/linear-status/fetch-status.js
```

This returns JSON with:
- All active (non-completed, non-canceled) projects with their issues
- Orphan issues (open issues not in any project)
- Summary counts

### Step 2: Present the overview

From the script output, build a summary table:

**For each active project:**
- Project name, state, progress %
- Table of issues: identifier, title, status, priority
- Highlight any issues that are stale (not updated in 7+ days) or blocked

**For orphan issues** (not in any project):
- Same table format

End with: "X open issues across Y active projects"

### Step 3: Dive deeper only if needed

Use MCP tools (`mcp__linear-server__get_issue`, `mcp__linear-server__list_comments`) ONLY when:
- The user asks about a specific issue
- You need to check comments or activity on a stale issue
- You need details not in the overview (description, labels, relations)

Do NOT fetch full details for every issue — the script output is sufficient for the overview.

## Behavior Rules

- Always run the script first — it's one API call vs many MCP calls
- Keep output concise — tables over paragraphs
- Show active projects even if they have zero issues
- If nothing is pending, say "All clear — no pending work in Linear"
- If the script errors, fall back to using MCP tools directly