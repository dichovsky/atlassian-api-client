# atlassian-api-client

Typed Node.js/TypeScript clients and CLI for Atlassian Cloud APIs.

- **Confluence Cloud REST API v2** — Pages, Spaces, Blog Posts, Comments, Attachments, Labels, Content Properties, Custom Content, Whiteboards, Tasks, Versions
- **Jira Cloud Platform REST API v3** — Issues, Projects, Search (JQL), Users, Issue Types, Priorities, Statuses, Issue Comments, Issue Attachments, Labels, Boards, Sprints, Workflows, Dashboards, Filters, Fields, Webhooks, JQL helpers, Bulk operations

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

## Middleware

`HttpTransport` accepts an optional middleware chain for cross-cutting concerns.

### OAuth 2.0 Token Refresh

```typescript
import { ConfluenceClient, createOAuthRefreshMiddleware } from 'atlassian-api-client';

const oauthMiddleware = createOAuthRefreshMiddleware({
  accessToken: process.env.ACCESS_TOKEN!,
  refreshToken: process.env.REFRESH_TOKEN!,
  clientId: process.env.CLIENT_ID!,
  clientSecret: process.env.CLIENT_SECRET!,
  onTokenRefreshed: (tokens) => {
    // Persist the new tokens
    saveTokens(tokens.accessToken, tokens.refreshToken);
  },
});

const client = new ConfluenceClient({
  baseUrl: 'https://yourcompany.atlassian.net',
  auth: { type: 'bearer', token: process.env.ACCESS_TOKEN! },
  middleware: [oauthMiddleware],
});
```

Automatically injects `Authorization: Bearer` and silently refreshes on 401 responses.

### Atlassian Connect JWT

```typescript
import { createConnectJwtMiddleware } from 'atlassian-api-client';

const connectMiddleware = createConnectJwtMiddleware({
  issuer: 'com.example.my-app',
  sharedSecret: process.env.CONNECT_SECRET!,
});

const client = new JiraClient({
  baseUrl: 'https://yourcompany.atlassian.net',
  auth: { type: 'bearer', token: '' },
  middleware: [connectMiddleware],
});
```

Signs every request with an HS256 JWT per the Atlassian Connect spec (QSH, iss, iat, exp claims).

### Response Caching

```typescript
import { createCacheMiddleware } from 'atlassian-api-client';

const cacheMiddleware = createCacheMiddleware({
  ttl: 30_000,   // 30s TTL (default: 60s)
  maxSize: 200,  // max entries (default: 100, FIFO eviction)
});

const client = new ConfluenceClient({
  baseUrl: 'https://yourcompany.atlassian.net',
  auth: { type: 'basic', email: '...', apiToken: '...' },
  middleware: [cacheMiddleware],
});
```

Caches GET responses in memory. Keyed by method + path + query string. Lazily evicts expired entries.

### Request Batching / Deduplication

```typescript
import { createBatchMiddleware } from 'atlassian-api-client';

const client = new JiraClient({
  baseUrl: 'https://yourcompany.atlassian.net',
  auth: { type: 'basic', email: '...', apiToken: '...' },
  middleware: [createBatchMiddleware()],
});
```

Coalesces concurrent identical in-flight requests so only one HTTP call is made.

## OAuth Scope Detection

Map Atlassian operation names to the required Cloud OAuth 2.0 scopes:

```typescript
import { detectRequiredScopes, listKnownOperations } from 'atlassian-api-client';

const scopes = detectRequiredScopes(['jira.issues.create', 'confluence.pages.read']);
// → ['write:jira-work', 'read:confluence-content.summary']

const allOps = listKnownOperations();
// → ['jira.issues.create', 'jira.issues.read', ...]
```

## OpenAPI Type Generation

Generate TypeScript interfaces from an OpenAPI 3.x schema:

```typescript
import { generateTypes } from 'atlassian-api-client';

const spec = {
  components: {
    schemas: {
      Issue: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          summary: { type: 'string', nullable: true },
        },
      },
    },
  },
};

const { code } = generateTypes(spec);
// → 'export interface Issue { id?: string; summary?: string | null; }'
```

Supports `$ref`, `allOf`, `oneOf`, `anyOf`, enum, nullable, and `additionalProperties`.

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

| Resource            | Methods                                                                                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pages`             | `list`, `get`, `create`, `update`, `delete`, `listAll`                                                                                               |
| `spaces`            | `list`, `get`, `listAll`                                                                                                                             |
| `blogPosts`         | `list`, `get`, `create`, `update`, `delete`, `listAll`                                                                                               |
| `comments`          | `listFooter`, `getFooter`, `createFooter`, `updateFooter`, `deleteFooter`, `listInline`, `getInline`, `createInline`, `updateInline`, `deleteInline` |
| `attachments`       | `listForPage`, `get`, `upload`, `delete`, `listAllForPage`                                                                                           |
| `labels`            | `listForPage`, `listForSpace`, `listForBlogPost`, `listAllForPage`                                                                                   |
| `contentProperties` | `list`, `get`, `create`, `update`, `delete`                                                                                                          |
| `customContent`     | `list`, `get`, `create`, `update`, `delete`                                                                                                          |
| `whiteboards`       | `get`, `create`, `delete`                                                                                                                            |
| `tasks`             | `list`, `get`, `update`                                                                                                                              |
| `versions`          | `listForPage`, `getForPage`, `listForBlogPost`, `getForBlogPost`                                                                                     |

### JiraClient

| Resource           | Methods                                                                      |
| ------------------ | ---------------------------------------------------------------------------- |
| `issues`           | `get`, `create`, `update`, `delete`, `getTransitions`, `transition`          |
| `projects`         | `list`, `get`, `listAll`                                                     |
| `search`           | `search`, `searchGet`, `searchAll`                                           |
| `users`            | `get`, `getCurrentUser`, `search`                                            |
| `issueTypes`       | `list`, `get`                                                                |
| `priorities`       | `list`, `get`                                                                |
| `statuses`         | `list`                                                                       |
| `issueComments`    | `list`, `get`, `create`, `update`, `delete`                                  |
| `issueAttachments` | `list`, `get`, `upload`                                                      |
| `labels`           | `list`                                                                       |
| `boards`           | `list`, `get`, `listIssues`                                                  |
| `sprints`          | `get`, `create`, `update`, `delete`, `listIssues`                            |
| `workflows`        | `list`, `get`                                                                |
| `dashboards`       | `list`, `get`, `create`, `update`, `delete`                                  |
| `filters`          | `list`, `get`, `create`, `update`, `delete`                                  |
| `fields`           | `list`, `listAll`, `create`, `update`, `delete`                              |
| `webhooks`         | `list`, `register`, `delete`                                                 |
| `jql`              | `getAutocompleteData`, `parse`, `sanitize`, `getSuggestions`                 |
| `bulk`             | `createIssues`, `setIssueProperty`, `deleteIssueProperty`                   |

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
