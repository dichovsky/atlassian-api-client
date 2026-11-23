# atlassian-api-client

`atlassian-api-client` contains Node.js clients with TypeScript types, and a CLI, for the Atlassian Cloud APIs. The clients and the CLI send requests to these APIs:

- **Confluence Cloud REST API v2** — Pages, Spaces, Blog Posts, Comments, Attachments, Labels, Content Properties, Custom Content, Whiteboards, Tasks, Versions
- **Jira Cloud Platform REST API v3** — Issues, Projects, Search (JQL), Users, workflows, schemes, fields, and administration
- **Jira Software/Agile and DevOps APIs** — Boards, sprints, epics, enhanced issue pagination and counts, builds, deployments, development information, feature flags, operations, remote links, and security information

The package has no runtime dependencies. It uses the `fetch` function of Node.js (Node.js 24+).

## Contents

- [Install](#install)
- [Quick Start](#quick-start)
- [Authentication](#authentication)
- [Pagination](#pagination)
- [Error Handling](#error-handling)
- [Middleware](#middleware)
- [OpenAPI Type Generation](#openapi-type-generation)
- [CLI](#cli)
- [Selected Resource Map](#selected-resource-map)
- [Recipes](#recipes)
- [Project Links](#project-links)

## Install

```bash
npm install atlassian-api-client
```

A TypeScript project must also have the Node.js type declarations for the Node.js version that it uses. For example, for Node.js 24, run `npm install --save-dev @types/node@24`. If you use TypeScript 6.0 or a subsequent version, put `"node"` in `compilerOptions.types`. Also do this if your project gives a list of its ambient types.

## Supported Runtimes

- Node.js >= 24.0.0

## Use with coding agents

This package contains a skill with the name **`atlassian-api-client-cli`**. The skill is compatible with Claude Code. It tells coding agents how to use the `atlas` CLI safely. The skill gives this information:

- Authentication only with environment variables
- Frequent problems when you use the CLI for the first time
- Quotation marks in JQL
- Pagination
- Output formats

```bash
# User-wide install, into ~/.claude/skills/atlassian-api-client-cli
npx --package atlassian-api-client -- atlas install-skill

# Project-local install, into <cwd>/.claude/skills/atlassian-api-client-cli
npx --package atlassian-api-client -- atlas install-skill --local

# Print the bundled source path without copying (for symlinks / custom tooling)
npx --package atlassian-api-client -- atlas install-skill --print

# Preview what would be copied
npx --package atlassian-api-client -- atlas install-skill --dry-run
```

`install-skill` is a top-level utility command. It accepts only flags, without a resource or a CLI action. Run it as `atlas install-skill [options]`.

If `atlassian-api-client` is a dependency of your project, you can use the shorter command `npx atlas install-skill`. This command resolves to `node_modules/.bin/atlas` and gives the same result. If you run the command in a directory where `atlassian-api-client` is not a dependency, the command with the `--package` flag is safer. The `--package` flag identifies the source package. Thus, `npx` cannot resolve a different `atlas` package from the registry.

The source of the skill is in [`skill/SKILL.md`](skill/SKILL.md). The resource tables with more information are in [`skill/reference/`](skill/reference). The skill has the same version as the npm package. Each time `install-skill` installs the skill, it writes the version of the source package into the installed `SKILL.md`.

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

// Search with JQL (cursor-based `/rest/api/3/search/jql`)
const results = await jira.search.searchJqlPost({
  jql: 'project = PROJ AND status = "In Progress"',
  fields: ['summary', 'status'],
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

To make an API token, go to this page: https://id.atlassian.com/manage-profile/security/api-tokens

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

### Jira Software on-premises OAuth integrations

By default, the client does not use the system-to-system OAuth integration proxy of Atlassian. To send Jira Software Development Information, Builds, Deployments, and Feature Flag ingestion through `api.atlassian.com`, set `softwareIntegrationProxy.cloudId`:

```typescript
const client = new JiraClient({
  baseUrl: 'https://yourcompany.atlassian.net',
  auth: {
    type: 'bearer',
    token: process.env.ATLASSIAN_OAUTH_TOKEN!,
  },
  softwareIntegrationProxy: {
    cloudId: process.env.ATLASSIAN_SOFTWARE_CLOUD_ID!,
  },
});

await client.bulk.submitBuilds({
  builds: [
    {
      pipelineId: 'pipe-1',
      buildNumber: 42,
      updateSequenceNumber: 1700000000000,
      displayName: 'Build 42',
      url: 'https://ci.example.com/pipe-1/42',
      state: 'successful',
      lastUpdated: '2026-11-08T10:00:00Z',
      associations: [{ associationType: 'issueIdOrKeys', values: ['PROJ-1'] }],
    },
  ],
});
```

With this option, the client uses these routes:

- Builds, Deployments, and Feature Flag ingestion use the proxy version `0.1`.
- Development Information changes from the site route `/rest/devinfo/0.10` to the proxy route `/jira/devinfo/0.1/cloud/{cloudId}`.
- `bulk.submitFeatureFlags` uses `/jira/featureflags/0.1/cloud/{cloudId}/bulk`.
- Deployment gating-status is not available through the integration proxy. Thus, that request stays on the tenant route `/rest/deployments/0.1`.
- The requests that get or delete Feature Flags continue to use `baseUrl`. All other Jira resources also continue to use `baseUrl`.

Bearer authentication is necessary for this option. But bearer authentication without `softwareIntegrationProxy.cloudId` does not make the client use the integration proxy. The default transport adds only the host `api.atlassian.com` to the configured `allowedHosts`. A custom transport gets the fully-qualified proxy URLs.

If you use a custom transport, make sure that it sends credentials only to the correct hosts.

For more information, refer to the Atlassian [guide to integrating Jira Software Cloud with on-premises tools](https://developer.atlassian.com/cloud/jira/software/integrate-jsw-cloud-with-onpremises-tools/).

### Self-hosted / non-Atlassian baseUrl

By default, the client accepts a `baseUrl` only if the last part of its host is `.atlassian.{net,com}`, `.jira-dev.com`, or `.jira.com`. The transport does not send the configured `Authorization` header to a different host. If you use a self-hosted Jira or Confluence, or a reverse proxy that sends requests to Atlassian, set `allowedHosts` (only hostnames, without ports):

```typescript
const client = new JiraClient({
  baseUrl: 'https://jira.internal.example',
  auth: { type: 'bearer', token: process.env.PAT! },
  allowedHosts: ['jira.internal.example'],
});
```

The list must include the host of `baseUrl`. If a resource path resolves to a host that is not in the list, the request throws `ValidationError` before the transport sends it.

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

// Jira search - cursor-based; follow nextPageToken until isLast
let nextPageToken: string | undefined;
do {
  const page = await jira.search.searchJqlPost({
    jql: 'project = PROJ',
    fields: ['summary'],
    nextPageToken,
  });
  for (const issue of page.issues) {
    console.log(issue.key);
  }
  nextPageToken = page.isLast === true ? undefined : page.nextPageToken;
} while (nextPageToken !== undefined);
```

The new Jira search endpoint (`/rest/api/3/search/jql`) uses cursor pagination. The SDK does not have an async iterator for this endpoint. The previous resource methods `search`, `searchGet`, and `searchAll` send requests to `/rest/api/3/search`. Atlassian will remove that endpoint. The SDK identifies these resource methods as `@deprecated`.

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

The client uses exponential backoff with jitter between attempts.

Retryable: 429, 500, 502, 503, 504, and transient network errors (connection reset or refused, DNS failure, connect timeout, socket closed, and for GET also a response-headers or body timeout).

This information is applicable to a write request (POST, PUT, PATCH, DELETE):

- The client does not send the write request again in these conditions: its success response is cut off mid-body, its response headers time out, or anything fails on the GET that follows its 303 (or a POST's 301/302). In these conditions, the server possibly made the changes of the write request.
- A write answered 500, 502, 503 or 504 is still retried as in 4.0.0, so the server may receive it more than once.
- If the connection of a write request fails before a response (connection reset, socket closed), the client also retries the write request, as in 4.0.0. Thus, the server can get the write request more than one time.

Client-side `fetch` argument errors, TLS errors, the request timeout (`TimeoutError`) and refused redirects are not retried.

GET requests follow redirects natively. A POST, PUT, PATCH or DELETE request is sent with `redirect: 'manual'`. The client follows the redirect of a write request only to a URL that agrees with all these conditions:

- The URL starts with `https://`.
- The URL uses the default port.
- `allowedHosts` accepts the host of the URL.
- The URL does not contain a username or a password.

These are the results of a refused redirect:

- A refused 303 (or a POST's 301/302) throws `HttpError` with the 3xx `status` and the `ValidationError` as `cause`. The server possibly made the changes of the write request. Before you send the write request again, find if the server made these changes.
- A refused 307/308 (or a 301/302 on PUT, PATCH or DELETE) throws `ValidationError`. The server did not make changes.

A custom `config.fetch` must honour `RequestInit.redirect`.

## Response Body Size Cap

`ClientConfig.maxResponseBytes` (default: not set, no cap) sets the maximum number of bytes in one buffered response body that the transport reads. If a response body is larger than the cap, the request throws `ResponseTooLargeError` (`code: 'RESPONSE_TOO_LARGE_ERROR'`). The transport does not read all of that body into memory.

```typescript
import { ConfluenceClient, ResponseTooLargeError } from 'atlassian-api-client';

const client = new ConfluenceClient({
  baseUrl: 'https://yourcompany.atlassian.net',
  auth: { type: 'basic', email: '...', apiToken: '...' },
  maxResponseBytes: 50 * 1024 * 1024, // 50 MB cap
});

try {
  await client.pages.get('123');
} catch (error) {
  if (error instanceof ResponseTooLargeError) {
    console.error(`Response exceeded ${error.limitBytes} bytes (status: ${error.status ?? 'n/a'})`);
  }
}
```

The transport uses the cap for these response bodies:

- `responseType: 'json'` and `'arrayBuffer'`
- The error-response body that the client parses to get the error message

Thus, an incorrectly configured server cannot use all of the Node heap with one 5xx response body of many gigabytes. The transport does not use the cap for `responseType: 'stream'`, because the caller controls the `ReadableStream`. The caller must read the stream to the end or abort it.

The transport uses two procedures to find an overflow:

- If the `Content-Length` response header is larger than the cap, the request fails immediately.
- While the transport reads the body, it counts the bytes. If the count becomes larger than the cap, the transport cancels the body before the end.

## Middleware

`HttpTransport` accepts an optional middleware chain for tasks that are the same for all requests.

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

The middleware automatically adds `Authorization: Bearer` to each request. After a 401 response, it refreshes the access token automatically. The caller does not have to start the procedure.

**Token endpoint allowlist (security):** The default `tokenEndpoint` is `https://auth.atlassian.com/oauth/token`. By default, the middleware accepts only that host. `createOAuthRefreshMiddleware` validates the token endpoint when you call the function. If the token endpoint is incorrect (for example, because you wrote the URL incorrectly, or because an attacker changed an environment variable), the function throws `ValidationError` before the middleware sends HTTP traffic. Thus, the middleware does not send `client_id` + `client_secret` + `refresh_token` to the host of an attacker after the first 401 response.

If you use a self-hosted IdP, a proxy for authentication, or a staging token endpoint, set `allowedTokenEndpointHosts`. The list must contain the host of your token endpoint:

```typescript
createOAuthRefreshMiddleware({
  accessToken: '...',
  refreshToken: '...',
  clientId: '...',
  clientSecret: '...',
  tokenEndpoint: 'https://idp.internal.example/oauth/token',
  // REPLACES the default — mirrors ClientConfig.allowedHosts semantics.
  allowedTokenEndpointHosts: ['idp.internal.example'],
});
```

`allowedTokenEndpointHosts` is a different allowlist from `ClientConfig.allowedHosts`. This different allowlist is necessary, because the OAuth refresh code calls `fetch` directly and does not go through the transport. Thus, the refresh code does not use the host allowlist of the transport.

**Herd protection (stability):** If many requests get a 401 response at the same time, the middleware refreshes the access token only one time. Two more options decrease the effect of two related failures:

```typescript
createOAuthRefreshMiddleware({
  accessToken: '...',
  refreshToken: '...',
  clientId: '...',
  clientSecret: '...',
  retryJitterMs: 100, // default — spread post-refresh retries over 0..100ms
  failureCooldownMs: 1000, // default — replay a refresh failure for 1s instead of re-firing
});
```

- `retryJitterMs` (default `100`, no jitter if `0`) adds a random interval before the middleware retries each request that waited for the new access token. Thus, if many requests wait for the new access token, the middleware does not retry all of them at the same time. The random interval prevents too many requests at the same time to a server that is available again. It also prevents new 429 responses.
- `failureCooldownMs` (default `1000`, no cooldown if `0`) keeps the last **failure to refresh the access token** for the configured time. During that time, the middleware throws the kept error again for each 401 response. The error is the same `OAuthError` that the last failed refresh threw. Thus, you can debug the failure. The middleware does not send a new request to the token endpoint. Thus, if the authentication server is not available, the middleware does not try to refresh the access token in a loop without a limit.

The middleware validates the two options when you call `createOAuthRefreshMiddleware`. Each option must be a finite number that is not less than `0`. During the jitter interval, the middleware obeys `RequestOptions.signal`. Thus, if the caller aborts the request, the caller does not wait for the jitter interval.

### Atlassian Connect JWT

```typescript
import { ConfluenceClient, JiraClient, createConnectJwtMiddleware } from 'atlassian-api-client';

const connectMiddleware = createConnectJwtMiddleware({
  issuer: 'com.example.my-app',
  sharedSecret: process.env.CONNECT_SECRET!,
});

const client = new JiraClient({
  baseUrl: 'https://yourcompany.atlassian.net',
  // `auth` is required by config validation; the middleware's JWT replaces it
  // on the wire, so any non-empty placeholder works.
  auth: { type: 'bearer', token: 'connect-jwt' },
  middleware: [connectMiddleware],
});

// Confluence: its Connect base URL is https://<site>.atlassian.net/wiki, so the
// `/wiki` context path MUST be discarded from the QSH canonical URI — set it.
const confluence = new ConfluenceClient({
  baseUrl: 'https://yourcompany.atlassian.net',
  auth: { type: 'bearer', token: 'connect-jwt' },
  middleware: [
    createConnectJwtMiddleware({
      issuer: 'com.example.my-app',
      sharedSecret: process.env.CONNECT_SECRET!,
      contextPath: '/wiki',
    }),
  ],
});
```

The middleware signs each request with an HS256 JWT that obeys the Atlassian Connect specification (QSH, iss, iat, and exp claims).
The QSH canonical URI is the request path relative to the base URL of Jira or Confluence.
In the canonical URI, protocol, host, port, `contextPath`, and query string are discarded, a trailing slash is stripped, and `&` is percent-encoded.

The middleware hashes `RequestOptions.path` before the transport resolves it against `baseUrl`.
All resource methods of the SDK give the absolute request URL. Thus, the hash is correct.
A relative path such as `'/pages'` is hashed as-is, not as the `/api/v2/pages` the request is sent to.
Thus, Atlassian rejects the token with a 401 response.

If you call `HttpTransport.request()` directly, give an absolute URL as the path.

The `atlas` CLI uses only basic or bearer authentication. Thus, it cannot use the 22 Jira operations that the pinned specs keep for Connect apps. Examples are `incidents get` / `delete`, the `linked-workspaces` `*-operations` actions, `webhooks list-failed`, and `app get-dynamic-modules`. For these operations, the CLI sends a correct request, but Jira rejects the credentials. To send requests to the endpoints of these operations, use the SDK with `createConnectJwtMiddleware`. The bundled skill identifies each of these operations with **Connect app (JWT) only**.

#### Verifying inbound asymmetric (RS256) JWTs

Atlassian signs lifecycle callbacks (installed/uninstalled) and context/iframe tokens with **RS256**. For each installation of an app, Atlassian uses a different key pair. An app validates these tokens with the public key of the same key pair. `verifyConnectAsymmetricJwt` validates these tokens for the app. The function has these limits for the algorithm:

- It accepts only `RS256`.
- It rejects `none` and `HS256`, to prevent algorithm-confusion attacks.

```typescript
import { verifyConnectAsymmetricJwt } from 'atlassian-api-client';

const claims = await verifyConnectAsymmetricJwt(token, {
  // The library core never makes network calls. Supply a resolver that fetches
  // the PEM public key by `kid`, or pass a `publicKey` you already hold.
  publicKeyResolver: async (kid) =>
    fetch(`https://connect-install-keys.atlassian.com/${kid}`).then((r) => r.text()),
  issuer: clientKey, // require iss === clientKey
  audience: 'https://my-app.example.com', // require this value in aud
});
```

The function validates the signature **before** it uses a claim. Then it validates `exp`/`iat`/`nbf`, with a default clock skew of 30s. The `maxClockSkewSeconds` option sets a different clock skew. If you set the `issuer`, `audience`, or `qsh` option, the function also validates the applicable claim (`iss`, `aud`, or `qsh`).

For each failure, the function throws `ValidationError` with a different message. The messages do not include the token, the signature, or the key material.

### Response Caching

```typescript
import { createCacheMiddleware } from 'atlassian-api-client';

const cacheMiddleware = createCacheMiddleware({
  ttl: 30_000, // 30s TTL (default: 60s)
  maxSize: 200, // max entries (default: 100, LRU eviction)
});

const client = new ConfluenceClient({
  baseUrl: 'https://yourcompany.atlassian.net',
  auth: { type: 'basic', email: '...', apiToken: '...' },
  middleware: [cacheMiddleware],
});
```

The middleware keeps GET responses in memory. Keys include auth identity, method, path, and query string. Thus, the responses of different callers stay isolated. After the TTL of an entry, the middleware does not remove the entry immediately. The middleware removes an expired entry at the next access to its key, or when the cache is full. If the cache is full and has no expired entries, the middleware removes the LRU entry (the entry that was not used for the longest time).

### Request Batching / Deduplication

```typescript
import { createBatchMiddleware } from 'atlassian-api-client';

const client = new JiraClient({
  baseUrl: 'https://yourcompany.atlassian.net',
  auth: { type: 'basic', email: '...', apiToken: '...' },
  middleware: [createBatchMiddleware()],
});
```

Callers that send identical GET requests while the first request is in progress share its response or error. Identical HEAD requests can also share a response at runtime. The public TypeScript request type omits HEAD. The middleware sends each write request separately. It also sends requests with `formData` or `binaryBody` separately.

### Circuit Breaker

```typescript
import { createCircuitBreakerMiddleware, CircuitBreakerOpenError } from 'atlassian-api-client';

const client = new JiraClient({
  baseUrl: 'https://yourcompany.atlassian.net',
  auth: { type: 'basic', email: '...', apiToken: '...' },
  middleware: [createCircuitBreakerMiddleware({ failureThreshold: 5, resetTimeoutMs: 30_000 })],
});

try {
  await client.issues.get('PROJ-1');
} catch (error) {
  if (error instanceof CircuitBreakerOpenError) {
    console.warn(`Circuit open; retry after ~${error.msUntilHalfOpen}ms`);
  }
}
```

The circuit breaker prevents cascading failures when a server that the client uses does not operate correctly. A successful request resets the failure counter. When the counter reaches `failureThreshold`, the circuit breaker opens. Then each subsequent request fails immediately with `CircuitBreakerOpenError`, and the transport does not send it.

After `resetTimeoutMs`, the circuit breaker does not change to half-open immediately. The change occurs **only** at the next request after the `resetTimeoutMs` interval, not with a background timer. That request is the only half-open trial. If the half-open trial passes, the circuit breaker changes to closed.

**Failure classification:** The circuit breaker counts `NetworkError`, `TimeoutError`, and `HttpError` with a 5xx status. It also counts `ResponseTooLargeError` at any HTTP status. While the circuit is closed, the following errors go to the caller and leave the counter unchanged:

- `HttpError` with a 4xx status, including 429
- `ValidationError`
- Abort errors
- Other errors that do not come from the transport

**Per-baseUrl semantics:** Each call to `createCircuitBreakerMiddleware()` makes an isolated state machine. To isolate each `baseUrl`, add one instance to each client:

```typescript
// Isolated breakers: a Confluence outage does not block Jira calls.
const confluenceBreaker = createCircuitBreakerMiddleware();
const jiraBreaker = createCircuitBreakerMiddleware();

// `config` is your usual { baseUrl, auth } client configuration.
const confluenceClient = new ConfluenceClient({ ...config, middleware: [confluenceBreaker] });
const jiraClient = new JiraClient({ ...config, middleware: [jiraBreaker] });
```

**Recommended compose order:** Put the circuit breaker first in the array (the outermost position). Thus, an open circuit breaker stops the request before the request uses a unit of the rate limiter or starts the OAuth refresh code:

```typescript
const client = new JiraClient({
  ...config,
  middleware: [
    createCircuitBreakerMiddleware({ failureThreshold: 5, resetTimeoutMs: 30_000 }),
    createOAuthRefreshMiddleware(oauthConfig), // see OAuth 2.0 Token Refresh
    createCacheMiddleware(),
    createBatchMiddleware(),
  ],
});
```

**Retry interaction:** `executeWithRetry` does not retry a `CircuitBreakerOpenError`. There are two causes:

- More attempts use quota before the caller gets the information that the circuit is open.
- If the `resetTimeoutMs` interval is completed during the retry loop, the first attempt after the interval uses the only HALF_OPEN trial attempt.

**Interaction with `retries` option:** `executeWithRetry` calls the middleware chain, with the circuit breaker middleware, for each attempt. Thus, each attempt that fails with a counted failure adds one to the counter, independently of the other attempts. With the default `retries: 3`, one request of the caller can cause a maximum of 4 counted failures (the first attempt and 3 more attempts). Select a `failureThreshold` that agrees with your `retries` value. For example, with `failureThreshold: 5` and `retries: 3`, the circuit breaker can open after only 2 requests that use all their attempts.

### Proactive Rate Limiting (Token Bucket)

Use a client-side token-bucket rate limiter to make the requests regular before they go to the Atlassian API. A `RateLimitError` occurs after the server sends HTTP 429. This middleware is different, because it uses a local limit. When the bucket is empty, the middleware **waits** before the request goes to the transport. Without this middleware, the transport sends the request immediately, and the server can reject it.

```typescript
import { JiraClient, createRateLimiterMiddleware } from 'atlassian-api-client';

const client = new JiraClient({
  baseUrl: 'https://yourcompany.atlassian.net',
  auth: { type: 'bearer', token: accessToken },
  middleware: [
    createRateLimiterMiddleware({
      tokensPerInterval: 10, // allow up to 10 requests per second
      intervalMs: 1000,
      maxWaitMs: 5000, // throw RateLimiterExhaustedError after 5s wait
    }),
  ],
});
```

These are the important properties of the rate limiter:

- **Bucket starts full** — At the start, the middleware lets a maximum of `tokensPerInterval` requests continue immediately.
- **Waits, never rejects by default** — When the bucket is empty, the middleware waits until the next unit is available in the bucket. Thus, the traffic stays regular, and the request does not fail immediately. To set a maximum time to wait, set `maxWaitMs`. If the necessary time to wait is longer than `maxWaitMs`, the middleware throws `RateLimiterExhaustedError` and does not wait.
- **Abort-aware** — While the middleware waits, it obeys `RequestOptions.signal`. Thus, if the caller cancels the request or the transport timeout occurs, the request stops correctly.
- **Retry interaction** — If the client retries a request, the request goes through the middleware again. The middleware removes one unit from the bucket for each attempt, because the server gets each attempt. Thus, the rate limiter uses the same limit for all attempts.
- **Recommended ordering** — Put this middleware after the circuit breaker (if you use one). Thus, an open circuit stops the request before the request uses a unit of the bucket. Also put this middleware after (inside) cache/batch. Thus, a request does not use a unit of the bucket if the cache has the response or the batch middleware gives the response. The first entry in the array operates first on each request. For example, with `[breaker, oauth, cache, batch, rateLimiter]`, if the cache has the response, the cache gives the response before the rate limiter operates.

`RateLimiterExhaustedError` (code `'RATE_LIMITER_EXHAUSTED'`) is a client-side error. It is different from the server-side `RateLimitError` (HTTP 429).

## OAuth Scope Detection

Use these functions to find the necessary Cloud OAuth 2.0 scopes for Atlassian operation names:

```typescript
import { detectRequiredScopes, listKnownOperations } from 'atlassian-api-client';

const scopes = detectRequiredScopes(['jira.issues.create', 'confluence.pages.get']);
// → granular Jira + Confluence scopes, sorted and deduplicated

const softwareScopes = detectRequiredScopes([
  'jira.boards.getBacklogApproximateCount',
  'jira.linkedWorkspaces.listSecurity',
]);
// → ['read:board-scope:jira-software', 'read:issue-details:jira', 'read:security:jira']

const allOps = listKnownOperations();
// → sorted operation names: ['confluence.attachments.delete', 'confluence.attachments.get', 'confluence.attachments.list', ...]
```

The operation annotations contain 38 Confluence v2 scopes, 33 Jira Software scopes, and 180 Jira Platform Beta scopes (247 unique granular strings after overlap). When the SDK validates scope strings, it also accepts these strings:

- 10 granular catalog entries that no operation in the pinned specs uses. Two of these entries are `read:bulk-job:jira` and `write:bulk-job:jira`. They occur only in the OAuth 2.0 security scheme.
- 16 classic or Jira Software compatibility scopes.

The total is 273 accepted strings. `detectRequiredScopes()` recommends only granular scopes. The operation registry contains a selected set of operation names. Some resource methods of the SDK possibly do not have an entry in the registry. `atlas scopes validate <scope>...` validates scope strings and does not send a network request.

## OpenAPI Type Generation

`generateTypes(spec)` is a public utility function. It generates TypeScript `interface` and `type` declarations from an OpenAPI 3.x spec object. Call it with **your specs**. The package and the repository do not contain generated types.

```typescript
import { generateTypes } from 'atlassian-api-client';

const spec = {
  openapi: '3.0.1',
  info: { title: 'My API', version: '1.0.0' },
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

const { source, typeNames } = generateTypes(spec);
// source → a two-line "Generated from OpenAPI spec" header comment, then:
//   export interface Issue {
//     readonly id?: string;
//     readonly summary?: string | null;
//   }
// typeNames → ['Issue']
```

The function accepts schemas that use these OpenAPI items: `$ref`, `allOf`, `oneOf`, `anyOf`, enum, nullable, and `additionalProperties`.

### Spec Drift Guard

A CI script (`scripts/regenerate-types.ts`) monitors three Atlassian OpenAPI specs. For each spec, the script does these steps:

1. It downloads the live spec.
2. It makes sure that `generateTypes()` can generate types from the live spec.
3. It compares the canonical contract fingerprint of the live spec with the pinned snapshot in `spec/`.

The fingerprint includes OpenAPI paths and HTTP methods, parameters, request schemas, response schemas, and security metadata. It ignores the text that is only for documentation, for example descriptions and examples.

**The script does not make commits.** It is a read-only check.

```bash
# Run locally
npm run spec-drift
npm run api-coverage
```

This is an example of the output:

```
✓ jiraPlatform: 1000 types; contract c72f7509a6c6 (https://developer.atlassian.com/cloud/.../swagger-v3.v3.json)
✓ jiraSoftware: 66 types; contract 1b3a0fd3f68e (https://developer.atlassian.com/cloud/.../swagger.v3.json)
✓ confluence: 221 types; contract ad6d0bc5ad1f (https://developer.atlassian.com/cloud/.../openapi-v2.v3.json)
```

`api-coverage` compares the executable SDK routes with the pinned snapshots. The check fails in these conditions:

- The script cannot resolve a route that it finds in the source code.
- A non-deprecated OpenAPI operation has no SDK route.
- An SDK route has no OpenAPI operation, and the route is not on the list of reviewed routes that are not in the specs.

The lexical pass of the script uses two aligned views of the source code:

1. A view that contains only the executable code. The script uses this view to find client declarations, resource wiring, resource-local path assignments, helper returns, and call sites.
2. A view that also contains the literals. The script uses this view to resolve the values and paths of these items.

Comments, quoted examples, template examples, and regex literals do not count as coverage. The script does not use them as runtime wiring or for path discovery.

If the script finds one of these items, the check fails (fail closed):

- Runtime path transformations
- Reassignments that are not safe
- Computed request properties
- Shadowed pagination/query imports
- Uncalled or non-public request callables
- Unwired or duplicate resource classes
- Statically dead calls
- Unresolved OpenAPI Path Item references

The script includes nested resource modules, and it examines all eight OpenAPI HTTP operation keys. The report shows the deprecated OpenAPI operations that the SDK does not have, but these operations do not cause the check to fail.

In CI, the two checks run **only on a schedule (one time each week) and when a person starts them manually** (`.github/workflows/spec-drift.yml`). A temporary failure of the Atlassian servers must not stop the pull requests of contributors. Thus, the GitHub Actions workflow does **not** run on `push` or `pull_request`. The project uses the failure of a scheduled job to show that a live spec is different from its snapshot.

## CLI

The `atlas` CLI gives command-line access to the Confluence and Jira APIs.

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

Use environment variables for the credentials. Then, the credentials do not show in the shell history or in process lists:

```bash
export ATLASSIAN_BASE_URL=https://yourcompany.atlassian.net
export ATLASSIAN_EMAIL=user@example.com
export ATLASSIAN_API_TOKEN=your-token

# Bearer auth: OAuth 2.0 access token or PAT
export ATLASSIAN_AUTH_TYPE=bearer
export ATLASSIAN_API_TOKEN=your-bearer-token
```

The default value of `ATLASSIAN_AUTH_TYPE` is `basic`. For the bearer mode, `ATLASSIAN_EMAIL` is not necessary.

Credential flags remain available for backward compatibility. Do not use them in interactive shells, scripts, CI logs, or chat transcripts.

For Jira Software on-premises integrations, add the cloud ID. Use the `ATLASSIAN_SOFTWARE_CLOUD_ID` environment variable or the `--software-cloud-id` flag. The CLI uses the cloud ID only for Jira. With the cloud ID, the CLI sends Development Information, Builds, Deployments, and Feature Flag ingestion through the integration proxy of Atlassian. Bearer authentication without the cloud ID uses the usual site routes:

```bash
export ATLASSIAN_AUTH_TYPE=bearer
export ATLASSIAN_API_TOKEN=your-system-to-system-oauth-token
export ATLASSIAN_SOFTWARE_CLOUD_ID=11111111-2222-3333-4444-555555555555

atlas jira bulk submit-builds --value '{"builds":[{"pipelineId":"pipe-1","buildNumber":42,"updateSequenceNumber":1700000000000,"displayName":"Build 42","url":"https://ci.example.com/pipe-1/42","state":"successful","lastUpdated":"2026-11-08T10:00:00Z","associations":[{"associationType":"issueIdOrKeys","values":["PROJ-1"]}]}]}'

# Equivalent per-command opt-in
atlas jira bulk submit-deployments \
  --software-cloud-id 11111111-2222-3333-4444-555555555555 \
  --value '{"deployments":[{"deploymentSequenceNumber":7,"updateSequenceNumber":1700000000000,"displayName":"Deploy 7","url":"https://ci.example.com/deploy/7","description":"Release 1.2","lastUpdated":"2026-11-08T10:00:00Z","state":"successful","pipeline":{"id":"pipe-1","displayName":"Main","url":"https://ci.example.com/pipe-1"},"environment":{"id":"prod","displayName":"Production","type":"production"},"associations":[{"associationType":"issueIdOrKeys","values":["PROJ-1"]}]}]}'

atlas jira bulk submit-feature-flags \
  --software-cloud-id 11111111-2222-3333-4444-555555555555 \
  --value '{"flags":[{"id":"flag-1","key":"new-checkout","updateSequenceId":1700000000000,"summary":{"status":{"enabled":true},"lastUpdated":"2026-11-08T10:00:00Z"},"details":[{"url":"https://flags.example.com/new-checkout","lastUpdated":"2026-11-08T10:00:00Z","environment":{"name":"production"},"status":{"enabled":true}}],"associations":[{"associationType":"issueIdOrKeys","values":["PROJ-1"]}]}]}'
```

The bundled skill (`skill/reference/jira/admin-devops.md`) gives the full request body schemas for these CLI actions and for the other DevOps `submit-*` CLI actions.

### Self-hosted / non-Atlassian baseUrl

For security, the default host allowlist of the CLI accepts only `*.atlassian.{net,com}`, `*.jira-dev.com`, and `*.jira.com`. A request to a different host fails with `ValidationError`. If you use a self-hosted Jira or Confluence, or a reverse proxy, set `--allowed-hosts` (or the `ATLASSIAN_ALLOWED_HOSTS` environment variable). Each entry is only a hostname, without a URL scheme or a port. The list must include the host of `baseUrl`:

```bash
atlas confluence spaces list \
  --base-url https://jira.internal.example \
  --allowed-hosts jira.internal.example
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

### Scope validation

Use `atlas scopes validate` to find if OAuth 2.0 scope strings are known Atlassian Cloud scopes. Authentication is not necessary for this command, and it does not send network requests. It prints a JSON `{ valid, unknown, allValid }` report. The exit code is `0` if all scopes are known, and `1` if one or more scopes are unknown. You can use the command in CI before you get OAuth consent:

```bash
atlas scopes validate read:issue:jira write:issue:jira
# → { "valid": ["read:issue:jira", "write:issue:jira"], "unknown": [], "allValid": true }
```

If you run `atlas scopes validate` without scope arguments, it prints the full catalog of known scopes (to stderr) to help you.

## Selected Resource Map

The clients give access to a large part of the Atlassian APIs. These tables show only frequently used resources and resource methods, not all of them. To see the full client API, use TypeScript autocomplete. To see the full lists of CLI resources, run `atlas confluence --help` and `atlas jira --help`.

### ConfluenceClient

| Resource        | Methods                                                                                                                                              |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pages`         | `list`, `get`, `create`, `update`, `delete`, `listAll`                                                                                               |
| `spaces`        | `list`, `get`, `listAll`                                                                                                                             |
| `blogPosts`     | `list`, `get`, `create`, `update`, `delete`, `listAll`                                                                                               |
| `comments`      | `listFooter`, `getFooter`, `createFooter`, `updateFooter`, `deleteFooter`, `listInline`, `getInline`, `createInline`, `updateInline`, `deleteInline` |
| `attachments`   | `listForPage`, `get`, `upload`, `delete`, `listAllForPage`                                                                                           |
| `labels`        | `listForPage`, `listForSpace`, `listForBlogPost`, `listAllForPage`                                                                                   |
| `customContent` | `list`, `get`, `create`, `update`, `delete`                                                                                                          |
| `whiteboards`   | `get`, `create`, `delete`                                                                                                                            |
| `tasks`         | `list`, `get`, `update`                                                                                                                              |
| `versions`      | `listForPage`, `getForPage`, `listForBlogPost`, `getForBlogPost`                                                                                     |

### JiraClient

| Resource           | Methods                                                                                              |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| `issues`           | `get`, `create`, `update`, `delete`, `getTransitions`, `transition`                                  |
| `projects`         | `list`, `get`, `listAll`                                                                             |
| `search`           | `searchJqlGet`, `searchJqlPost`, `approximateCount` (deprecated: `search`, `searchGet`, `searchAll`) |
| `users`            | `get`, `getCurrentUser`, `search`                                                                    |
| `issueTypes`       | `list`, `get`                                                                                        |
| `priorities`       | `list`, `get`                                                                                        |
| `statuses`         | `list`                                                                                               |
| `issueComments`    | `list`, `get`, `create`, `update`, `delete`                                                          |
| `issueAttachments` | `list`, `get`, `upload`                                                                              |
| `labels`           | `list`                                                                                               |
| `boards`           | `list`, `get`, `getIssues`                                                                           |
| `sprints`          | `get`, `create`, `update`, `delete`, `getIssues`                                                     |
| `workflows`        | `list`, `get`                                                                                        |
| `dashboards`       | `list`, `get`, `create`, `update`, `delete`                                                          |
| `filters`          | `list`, `get`, `create`, `update`, `delete`                                                          |
| `fields`           | `list`, `listAll`, `create`, `update`, `delete`                                                      |
| `webhooks`         | `list`, `register`, `delete`                                                                         |
| `jql`              | `getAutocompleteData`, `parse`, `sanitize`, `getFieldReferenceSuggestions`                           |
| `bulk`             | `createBulk`, `setPropertyBulk`, `deletePropertyBulk`                                                |

## Recipes

This section gives snippets for frequent configurations. You can put a copy of each snippet in your code. You can use each recipe without the other recipes.

### Custom logger

The client sends its warnings to the logger that you give. For example, the client writes a warning when the requests are near the rate limit, or when you use a deprecated constructor.

```typescript
import { ConfluenceClient, type Logger } from 'atlassian-api-client';
import pino from 'pino';

const pinoLogger = pino();
const logger: Logger = {
  debug: (msg, ctx) => pinoLogger.debug(ctx, msg),
  info: (msg, ctx) => pinoLogger.info(ctx, msg),
  warn: (msg, ctx) => pinoLogger.warn(ctx, msg),
  error: (msg, ctx) => pinoLogger.error(ctx, msg),
};

const client = new ConfluenceClient({
  baseUrl: 'https://yourcompany.atlassian.net',
  auth: { type: 'basic', email, apiToken },
  logger,
});
```

### X-Request-Id propagation

The client always records the request ID that the server gives in the response headers. It reads `X-AREQUESTID` first, then `X-Request-Id`.

- For an error response, the ID is in `error.requestId`. `error.toJSON()` also includes the ID, for structured logging.
- For a success response, the ID is in the `requestId` field of the transport-level `ApiResponse`. Resource methods such as `client.pages.get()` return only the unwrapped `data`. To read the ID, use a [middleware](#middleware) that gets the `ApiResponse`.

By default, the client does not add a request ID to the requests that it sends. To attach a UUID to each request, set `requestId: { generate: true }`. The client uses the **same ID for all attempts of a request**. Thus, the server can identify all attempts of one request, independently of the number of attempts.

```typescript
import { ConfluenceClient, HttpError, type Middleware } from 'atlassian-api-client';

// Success path - resource methods return unwrapped data, so capture the
// server's id in a middleware, where the full ApiResponse is visible
const logRequestId: Middleware = async (options, next) => {
  const response = await next(options);
  console.log('server request id:', response.requestId); // e.g. 'arq-a1b2c3...'
  return response;
};

const client = new ConfluenceClient({
  baseUrl: 'https://yourcompany.atlassian.net',
  auth: { type: 'basic', email, apiToken },
  requestId: {
    generate: true, // attach X-Request-Id to every outbound request
    header: 'X-Request-Id', // default; override to match your gateway's expected name
    // generator: () => myIdGen(), // optional: replace crypto.randomUUID with your own factory
    // readResponseHeaders: ['X-AREQUESTID', 'X-Request-Id'], // default inbound header list
  },
  middleware: [logRequestId],
});

const page = await client.pages.get('123456'); // logRequestId prints the id above
console.log(page.title);

// Error path — same field on HttpError, included in toJSON() for structured loggers
try {
  await client.pages.get('missing');
} catch (err) {
  if (err instanceof HttpError) {
    console.error('failed request id:', err.requestId);
  }
}
```

### Proxy / custom `fetch` dispatcher

To send transport requests through a proxy or to adjust keep-alive, do these steps:

1. Install [`undici`](https://www.npmjs.com/package/undici).
2. Give the client a `fetch` function that uses `undici`.

OAuth token refresh has a separate `fetch` option. If the refresh requests must also go through the proxy, give the same function to `createOAuthRefreshMiddleware`.

```typescript
import { ConfluenceClient } from 'atlassian-api-client';
import { fetch as undiciFetch, ProxyAgent } from 'undici';

const dispatcher = new ProxyAgent('http://proxy.internal:8080');
const proxyFetch = ((url, init) => undiciFetch(url, { ...init, dispatcher })) as typeof fetch;

const client = new ConfluenceClient({
  baseUrl: 'https://yourcompany.atlassian.net',
  auth: { type: 'basic', email, apiToken },
  fetch: proxyFetch,
});
```

To refresh the access token through the proxy, also give `fetch: proxyFetch` in `createOAuthRefreshMiddleware({ ... })`.

A custom `fetch` must give the same `RequestInit.redirect` to the `fetch` that it calls, as this example does. The transport sends write requests with `redirect: 'manual'`, and the transport, not `fetch`, examines each redirect (see [Retry & Timeout](#retry--timeout)).

### OAuth 2.0 with token persistence

`createOAuthRefreshMiddleware` adds the access token to each request. After a 401 response, it refreshes the access token automatically. All requests that wait for the new access token use one promise. Thus, the token endpoint does not get too many requests at the same time. The `retryJitterMs` and `failureCooldownMs` options (see the [OAuth 2.0 Token Refresh](#oauth-20-token-refresh) section) give the same protection in two more conditions:

- The requests that the middleware retries after it refreshes the access token
- The loop of attempts to refresh the access token while the authentication server is not available

Use `onTokenRefreshed` to save the new access token and the new refresh token. Then, a worker that starts again can use these tokens.

```typescript
import { JiraClient, createOAuthRefreshMiddleware } from 'atlassian-api-client';
import { readFile, writeFile } from 'node:fs/promises';

const tokens = JSON.parse(await readFile('.atlassian-tokens.json', 'utf8'));

const client = new JiraClient({
  baseUrl: 'https://yourcompany.atlassian.net',
  auth: { type: 'bearer', token: tokens.accessToken }, // initial header; middleware keeps it fresh
  middleware: [
    createOAuthRefreshMiddleware({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      clientId: process.env.ATLASSIAN_CLIENT_ID!,
      clientSecret: process.env.ATLASSIAN_CLIENT_SECRET!,
      // tokenEndpoint defaults to 'https://auth.atlassian.com/oauth/token'
      onTokenRefreshed: async (next) => {
        await writeFile(
          '.atlassian-tokens.json',
          JSON.stringify({ accessToken: next.accessToken, refreshToken: next.refreshToken }),
        );
      },
    }),
  ],
});
```

### Retry tuning

To change the default values, set these options for each client. The client does not retry non-retryable statuses (all 4xx statuses other than 429). The `retries` value does not change this rule.

```typescript
const client = new JiraClient({
  baseUrl: 'https://yourcompany.atlassian.net',
  auth: { type: 'bearer', token },
  retries: 5, // default 3
  retryDelay: 500, // default 1000 ms (base for exponential backoff)
  maxRetryDelay: 15_000, // default 30_000 ms (ceiling)
  timeout: 20_000, // default 30_000 ms (per-request AbortController)
});
```

### Caching + batching

For a dashboard that sends many GET requests, use this middleware sequence:

1. Put the OAuth refresh middleware first.
2. Put the cache middleware immediately after the OAuth refresh middleware. Thus, the OAuth refresh middleware adds the access token to each request, also when the cache has the response.
3. Put the batch middleware last (the innermost position). The batch middleware then handles only requests that the cache forwards.

For more information about this sequence, refer to [docs/ARCHITECTURE.md#middleware-ordering](docs/ARCHITECTURE.md#middleware-ordering).

```typescript
import {
  JiraClient,
  createCacheMiddleware,
  createBatchMiddleware,
  createOAuthRefreshMiddleware,
} from 'atlassian-api-client';

const client = new JiraClient({
  baseUrl: 'https://yourcompany.atlassian.net',
  auth: { type: 'bearer', token: accessToken },
  middleware: [
    createOAuthRefreshMiddleware(oauthConfig), // see OAuth 2.0 with token persistence
    createCacheMiddleware({ ttl: 30_000, maxSize: 500 }),
    createBatchMiddleware(),
  ],
});
```

## Architecture

For a full description of the layers, the core layer, and the important decisions about the structure, refer to [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Project Links

- [Changelog](CHANGELOG.md)
- [Security policy](SECURITY.md)
- [Issue tracker](https://github.com/dichovsky/atlassian-api-client/issues)
- [Source repository](https://github.com/dichovsky/atlassian-api-client)
- [Support development](https://buymeacoffee.com/dichovsky)

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

# Run every test suite
npm run test

# Run the fast TypeScript/V8 suite only
npm run test:unit

# Run all API gap analyzer scenarios (bounded to four processes)
npm run test:api-gap

# TypeScript tests with exact 100% V8 coverage
npm run test:coverage

# Full validation
npm run validate
```

## License

MIT
