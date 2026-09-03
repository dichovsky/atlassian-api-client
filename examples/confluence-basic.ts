/**
 * Basic Confluence usage example.
 * Run: npx tsx examples/confluence-basic.ts
 */
import { ConfluenceClient } from '../src/index.js';

const confluence = new ConfluenceClient({
  baseUrl: process.env['ATLASSIAN_BASE_URL'] ?? 'https://yourcompany.atlassian.net',
  auth: {
    type: 'basic',
    email: process.env['ATLASSIAN_EMAIL'] ?? 'user@example.com',
    apiToken: process.env['ATLASSIAN_API_TOKEN'] ?? 'your-api-token',
  },
});

// List spaces
const spaces = await confluence.spaces.list({ limit: 10 });
for (const space of spaces.results) {
  console.log(`Space: ${space.name} (${space.key})`);
}

// List pages in a space
if (spaces.results.length > 0) {
  const spaceId = spaces.results[0]?.id;
  if (spaceId) {
    const pages = await confluence.pages.list({ spaceId, limit: 5 });
    for (const page of pages.results) {
      console.log(`  Page: ${page.title} (id=${page.id})`);
    }
  }
}
