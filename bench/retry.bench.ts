/**
 * Microbenchmarks for retry helpers (calculateDelay, isRetryableStatus,
 * isNetworkError). This is the hottest path outside of fetch itself — it runs
 * on every transport request.
 *
 * Run: npm run bench
 */
import { bench, describe } from 'vitest';
import { calculateDelay, isNetworkError, isRetryableStatus } from '../src/core/retry.js';

describe('retry — calculateDelay (exponential backoff + jitter)', () => {
  bench('attempt=0, base=100, max=5000', () => {
    calculateDelay(0, 100, 5000);
  });

  bench('attempt=3, base=100, max=5000', () => {
    calculateDelay(3, 100, 5000);
  });

  bench('attempt=10, base=100, max=5000 (saturates at max)', () => {
    calculateDelay(10, 100, 5000);
  });
});

describe('retry — isRetryableStatus (Set lookup)', () => {
  bench('200 (non-retryable)', () => {
    isRetryableStatus(200);
  });

  bench('429 (retryable)', () => {
    isRetryableStatus(429);
  });

  bench('503 (retryable)', () => {
    isRetryableStatus(503);
  });
});

describe('retry — isNetworkError (cause-chain walk)', () => {
  const plainError = new Error('oops');
  const typeError = new TypeError('fetch failed');
  const undiciError = Object.assign(new Error('socket'), { code: 'UND_ERR_SOCKET' });
  const nestedCause = Object.assign(new Error('outer'), {
    cause: Object.assign(new Error('inner'), { code: 'ECONNRESET' }),
  });

  bench('plain Error (no match)', () => {
    isNetworkError(plainError);
  });

  bench('TypeError (fetch network failure)', () => {
    isNetworkError(typeError);
  });

  bench('undici UND_ERR_SOCKET direct code', () => {
    isNetworkError(undiciError);
  });

  bench('nested ECONNRESET via cause chain', () => {
    isNetworkError(nestedCause);
  });
});
