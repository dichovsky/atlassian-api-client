/**
 * Basic Jira usage example.
 * Run: npx tsx examples/jira-basic.ts
 */
import { JiraClient } from '../src/index.js';

const jira = new JiraClient({
  baseUrl: process.env['ATLASSIAN_BASE_URL'] ?? 'https://yourcompany.atlassian.net',
  auth: {
    type: 'basic',
    email: process.env['ATLASSIAN_EMAIL'] ?? 'user@example.com',
    apiToken: process.env['ATLASSIAN_API_TOKEN'] ?? 'your-api-token',
  },
});

// Get current user
const me = await jira.users.getCurrentUser();
console.log(`Logged in as: ${me.displayName} (${me.accountId})`);

// List projects
const projects = await jira.projects.list({ maxResults: 5 });
for (const project of projects.values) {
  console.log(`Project: ${project.name} (${project.key})`);
}

// Search issues
const results = await jira.search.search({
  jql: 'assignee = currentUser() ORDER BY updated DESC',
  maxResults: 5,
  fields: ['summary', 'status'],
});

for (const issue of results.issues) {
  const summary = issue.fields['summary'] as string;
  const status = issue.fields['status'] as { name: string };
  console.log(`${issue.key}: ${summary} [${status.name}]`);
}
