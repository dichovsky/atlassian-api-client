# atlassian-api-client

Typed Node.js/TypeScript clients and CLI for Atlassian Cloud APIs.

- **Confluence Cloud REST API v2** - Pages, Spaces, Blog Posts, Comments, Attachments, Labels
- **Jira Cloud Platform REST API v3** - Issues, Projects, Search (JQL), Users, Issue Types, Priorities, Statuses

Zero runtime dependencies. Uses native `fetch` (Node.js 24+).

## Install

```bash
npm install atlassian-api-client
```

## Supported Runtimes

- Node.js >= 24.0.0

## Quick Start

### Confluence

```typescript
import { ConfluenceClient } from 'atlassian-api-client';

const confluence = new ConfluenceClient({
  baseUrl: 'https://yourcompany.atlassian.net',
  auth: {
    type: 'basic',
    email: 'user@example.com',
    apiToken: process.env.ATLASSIAN_API_TOKEN!,
  },
});

// List pages in a space
const pages = await confluence.pages.list({ spaceId: '123456' });
console.log(pages.results);

// Get a specific page
const page = await confluence.pages.get('789');
```

### Jira

```typescript
import { JiraClient } from 'atlassian-api-client';

const jira = new JiraClient({
  baseUrl: 'https://yourcompany.atlassian.net',
  auth: {
    type: 'basic',
    email: 'user@example.com',
    apiToken: process.env.ATLASSIAN_API_TOKEN!,
  },
});

// Get an issue
const issue = await jira.issues.get('PROJ-123');
console.log(issue.fields);

// Search with JQL
const results = await jira.search.search({
  jql: 'project = PROJ AND status = "In Progress"',
});
console.log(results.issues);
```

## Authentication

### Basic Auth (Email + API Token)

```typescript
const client = new ConfluenceClient({
  baseUrl: 'https://yourcompany.atlassian.net',
  auth: {
    type: 'basic',
    email: 'user@example.com',
    apiToken: 'your-api-token',
  },
});
```

Generate an API token at: https://id.atlassian.com/manage-profile/security/api-tokens

### Bearer Auth (OAuth 2.0 / PAT)

```typescript
const client = new JiraClient({
  baseUrl: 'https://yourcompany.atlassian.net',
  auth: {
    type: 'bearer',
    token: 'your-oauth-token',
  },
});
```

## Pagination

### Async Iteration

```typescript
// Confluence - cursor-based pagination
for await (const page of confluence.pages.listAll({ spaceId: '123' })) {
  console.log(page.title);
}

// Jira - offset-based pagination
for await (const project of jira.projects.listAll()) {
  console.log(project.name);
}

// Jira search
for await (const issue of jira.search.searchAll({ jql: 'project = PROJ' })) {
  console.log(issue.key);
}
```

### Manual Pagination

```typescript
// Confluence
const result = await confluence.pages.list({ spaceId: '123', limit: 25 });
console.log(result.results); // current page items
// result._links.next contains cursor for next page

// Jira
const projects = await jira.projects.list({ maxResults: 50 });
console.log(projects.values); // current page items
console.log(projects.total); // total available
```

## Error Handling

```typescript
import {
  AtlassianError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
} from 'atlassian-api-client';

try {
  await jira.issues.get('PROJ-999');
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log(`Rate limited. Retry after ${error.retryAfter}s`);
  } else if (error instanceof NotFoundError) {
    console.log('Issue not found');
  } else if (error instanceof AuthenticationError) {
    console.log('Invalid credentials');
  } else if (error instanceof AtlassianError) {
    console.log(`API error: ${error.code} - ${error.message}`);
  }
}
```

## Retry & Timeout

```typescript
const client = new JiraClient({
  baseUrl: 'https://yourcompany.atlassian.net',
  auth: { type: 'basic', email: '...', apiToken: '...' },
  timeout: 15000, // 15s timeout (default: 30s)
  retries: 5, // max retry attempts (default: 3)
  retryDelay: 2000, // base delay for backoff (default: 1000ms)
  maxRetryDelay: 60000, // max delay cap (default: 30000ms)
});
```

Retries use exponential backoff with jitter. Retryable: 429, 500, 502, 503, 504, and network errors.

## CLI

The `atlas` CLI provides command-line access to both APIs.

```bash
# Install globally
npm install -g atlassian-api-client

# Or use via npx
npx -p atlassian-api-client atlas --help
```

### Syntax

```
atlas <api> <resource> <action> [args] [options]
```

### Auth

Via flags or environment variables:

```bash
export ATLASSIAN_BASE_URL=https://yourcompany.atlassian.net
export ATLASSIAN_EMAIL=user@example.com
export ATLASSIAN_API_TOKEN=your-token

# Or pass inline
atlas --base-url https://... --email user@... --token ...
```

### Examples

```bash
# Confluence
atlas confluence pages list --space-id 123
atlas confluence pages get 456
atlas confluence spaces list

# Jira
atlas jira issues get PROJ-123
atlas jira projects list
atlas jira search --jql "project = PROJ AND status = Open"
atlas jira users me

# Output formats
atlas jira issues get PROJ-123 --format table
atlas jira projects list --format minimal
```

## API Reference

### ConfluenceClient

| Resource      | Methods                                                                                                                                              |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pages`       | `list`, `get`, `create`, `update`, `delete`, `listAll`                                                                                               |
| `spaces`      | `list`, `get`, `listAll`                                                                                                                             |
| `blogPosts`   | `list`, `get`, `create`, `update`, `delete`, `listAll`                                                                                               |
| `comments`    | `listFooter`, `getFooter`, `createFooter`, `updateFooter`, `deleteFooter`, `listInline`, `getInline`, `createInline`, `updateInline`, `deleteInline` |
| `attachments` | `listForPage`, `get`, `delete`, `listAllForPage`                                                                                                     |
| `labels`      | `listForPage`, `listForSpace`, `listForBlogPost`, `listAllForPage`                                                                                   |

### JiraClient

| Resource     | Methods                                                             |
| ------------ | ------------------------------------------------------------------- |
| `issues`     | `get`, `create`, `update`, `delete`, `getTransitions`, `transition` |
| `projects`   | `list`, `get`, `listAll`                                            |
| `search`     | `search`, `searchGet`, `searchAll`                                  |
| `users`      | `get`, `getCurrentUser`, `search`                                   |
| `issueTypes` | `list`, `get`                                                       |
| `priorities` | `list`, `get`                                                       |
| `statuses`   | `list`                                                              |

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for a detailed description of the layered design, core infrastructure, and key design decisions.

## Development

```bash
# Install
npm install

# Build
npm run build

# Type check
npm run typecheck

# Lint
npm run lint

# Test
npm run test

# Test with coverage
npm run test:coverage

# Full validation
npm run validate
```

## License

MIT
