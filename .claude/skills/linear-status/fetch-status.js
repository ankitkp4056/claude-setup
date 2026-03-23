#!/usr/bin/env node

/**
 * Fetches a lightweight summary of all Linear projects and issues for the team.
 * Outputs JSON with project names, statuses, and issue titles/statuses.
 * Used by the linear-status skill as a pre-fetch before diving into details.
 *
 * Usage: node fetch-status.js
 * Requires: LINEAR_API_KEY and LINEAR_TEAM_ID in .claude/.env
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const LINEAR_API_URL = 'https://api.linear.app/graphql';

function loadEnvVar(name) {
  const envPath = path.resolve(__dirname, '..', '..', '.env');
  if (!fs.existsSync(envPath)) {
    console.error('Error: .claude/.env not found. Create it with LINEAR_API_KEY and LINEAR_TEAM_ID');
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf-8');
  const match = content.match(new RegExp(`^${name}=(.+)$`, 'm'));
  if (!match || !match[1].trim()) {
    console.error(`Error: ${name} not set in .claude/.env`);
    process.exit(1);
  }
  return match[1].trim();
}

function graphql(apiKey, query, variables = {}) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query, variables });
    const req = https.request(LINEAR_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey,
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.errors) {
            reject(new Error(parsed.errors.map(e => e.message).join(', ')));
          } else {
            resolve(parsed.data);
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data.slice(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function fetchStatus() {
  const apiKey = loadEnvVar('LINEAR_API_KEY');
  const teamId = loadEnvVar('LINEAR_TEAM_ID');

  // Two separate queries to avoid Linear's complexity limit
  const [projectData, issueData] = await Promise.all([
    graphql(apiKey, `
      query TeamProjects($teamId: String!) {
        team(id: $teamId) {
          name
          projects(orderBy: updatedAt, first: 50) {
            nodes {
              id
              name
              state
              progress
              updatedAt
            }
          }
        }
      }
    `, { teamId }),
    graphql(apiKey, `
      query TeamIssues($teamId: String!) {
        team(id: $teamId) {
          issues(orderBy: updatedAt, first: 200) {
            nodes {
              id
              identifier
              title
              priority
              state { name type }
              assignee { name }
              project { id }
              updatedAt
            }
          }
        }
      }
    `, { teamId }),
  ]);

  const team = projectData.team;
  const allIssues = issueData.team.issues.nodes;
  const priorityLabels = ['None', 'Urgent', 'High', 'Medium', 'Low'];
  const doneStates = ['completed', 'canceled'];

  // Filter out completed/canceled projects
  const activeProjects = team.projects.nodes.filter(p => {
    const stateName = (p.state || '').toLowerCase();
    return !['completed', 'done', 'canceled', 'cancelled'].includes(stateName);
  });

  // Group issues by project
  const issuesByProject = {};
  const orphanIssueList = [];
  for (const issue of allIssues) {
    if (issue.project?.id) {
      if (!issuesByProject[issue.project.id]) issuesByProject[issue.project.id] = [];
      issuesByProject[issue.project.id].push(issue);
    } else if (!doneStates.includes(issue.state.type)) {
      orphanIssueList.push(issue);
    }
  }

  const mapIssue = (i) => ({
    id: i.id,
    identifier: i.identifier,
    title: i.title,
    status: i.state.name,
    statusType: i.state.type,
    priority: priorityLabels[i.priority] || 'None',
    assignee: i.assignee?.name || 'Unassigned',
  });

  const result = {
    team: team.name,
    fetchedAt: new Date().toISOString(),
    projects: activeProjects.map(p => {
      const projectIssues = issuesByProject[p.id] || [];
      const openIssues = projectIssues.filter(i => !doneStates.includes(i.state.type));
      const doneIssues = projectIssues.filter(i => i.state.type === 'completed');
      return {
        id: p.id,
        name: p.name,
        state: p.state,
        progress: Math.round((p.progress || 0) * 100),
        issueStats: {
          total: projectIssues.length,
          open: openIssues.length,
          done: doneIssues.length,
        },
        issues: projectIssues.map(mapIssue),
      };
    }),
    orphanIssues: orphanIssueList.map(mapIssue),
  };

  // Summary counts
  result.summary = {
    activeProjects: result.projects.length,
    totalOpenIssues: result.projects.reduce((sum, p) => sum + p.issueStats.open, 0) + result.orphanIssues.length,
    orphanIssues: result.orphanIssues.length,
  };

  console.log(JSON.stringify(result, null, 2));
}

fetchStatus().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
