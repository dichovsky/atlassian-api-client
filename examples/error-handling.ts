/**
 * Error handling patterns example.
 * Run: npx tsx examples/error-handling.ts
 */
import {
  JiraClient,
  AtlassianError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  TimeoutError,
  NetworkError,
} from '../src/index.js';

const jira = new JiraClient({
  baseUrl: process.env['ATLASSIAN_BASE_URL'] ?? 'https://yourcompany.atlassian.net',
  auth: {
    type: 'basic',
    email: process.env['ATLASSIAN_EMAIL'] ?? 'user@example.com',
    apiToken: process.env['ATLASSIAN_API_TOKEN'] ?? 'your-api-token',
  },
  timeout: 10000,
  retries: 3,
});

try {
  await jira.issues.get('NONEXISTENT-99999');
} catch (error) {
  if (error instanceof RateLimitError) {
    // 429 Too Many Requests — wait and retry
    console.log(`Rate limited. Retry after ${error.retryAfter ?? 'unknown'}s`);
  } else if (error instanceof AuthenticationError) {
    // 401 Unauthorized — check credentials
    console.log('Authentication failed. Check your email and API token.');
  } else if (error instanceof ForbiddenError) {
    // 403 Forbidden — insufficient permissions
    console.log('Access denied. Check your permissions.');
  } else if (error instanceof NotFoundError) {
    // 404 Not Found — resource doesn't exist
    console.log('Issue not found.');
  } else if (error instanceof TimeoutError) {
    // Request timed out
    console.log(`Request timed out after ${error.timeoutMs}ms`);
  } else if (error instanceof NetworkError) {
    // Network-level failure (DNS, connection refused, etc.)
    console.log(`Network error: ${error.message}`);
  } else if (error instanceof AtlassianError) {
    // Other API error
    console.log(`API error [${error.code}]: ${error.message}`);
  } else {
    throw error;
  }
}
