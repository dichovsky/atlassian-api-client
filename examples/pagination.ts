/**
 * Pagination patterns example.
 * Run: npx tsx examples/pagination.ts
 */
import { ConfluenceClient, JiraClient } from '../src/index.js';

const confluence = new ConfluenceClient({
  baseUrl: process.env['ATLASSIAN_BASE_URL'] ?? 'https://yourcompany.atlassian.net',
  auth: {
    type: 'basic',
    email: process.env['ATLASSIAN_EMAIL'] ?? 'user@example.com',
    apiToken: process.env['ATLASSIAN_API_TOKEN'] ?? 'your-api-token',
  },
});

const jira = new JiraClient({
  baseUrl: process.env['ATLASSIAN_BASE_URL'] ?? 'https://yourcompany.atlassian.net',
  auth: {
    type: 'basic',
    email: process.env['ATLASSIAN_EMAIL'] ?? 'user@example.com',
    apiToken: process.env['ATLASSIAN_API_TOKEN'] ?? 'your-api-token',
  },
});

// --- Confluence: cursor-based async iteration ---
console.log('--- All Confluence Spaces ---');
let spaceCount = 0;
for await (const space of confluence.spaces.listAll({ limit: 25 })) {
  console.log(`  ${space.name}`);
  spaceCount++;
}
console.log(`Total spaces: ${spaceCount}`);

// --- Jira: offset-based async iteration ---
console.log('\n--- All Jira Projects ---');
let projectCount = 0;
for await (const project of jira.projects.listAll({ maxResults: 50 })) {
  console.log(`  ${project.name} (${project.key})`);
  projectCount++;
}
console.log(`Total projects: ${projectCount}`);

// --- Jira: search pagination ---
console.log('\n--- All Open Issues ---');
let issueCount = 0;
for await (const issue of jira.search.searchAll({
  jql: 'status != Done ORDER BY created ASC',
  maxResults: 100,
})) {
  issueCount++;
  if (issueCount <= 5) {
    console.log(`  ${issue.key}`);
  }
}
console.log(`Total open issues: ${issueCount}`);
