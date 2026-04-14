import { describe, it, expect } from 'vitest';
import {
  AtlassianError,
  HttpError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  TimeoutError,
  NetworkError,
  ValidationError,
  createHttpError,
} from '../../src/core/errors.js';

// Import from the barrel index to ensure index.ts re-exports are covered
import * as CoreIndex from '../../src/core/index.js';

describe('src/core/index.ts barrel re-exports', () => {
  it('re-exports error classes', () => {
    expect(CoreIndex.AtlassianError).toBe(AtlassianError);
    expect(CoreIndex.HttpError).toBe(HttpError);
    expect(CoreIndex.AuthenticationError).toBe(AuthenticationError);
    expect(CoreIndex.ForbiddenError).toBe(ForbiddenError);
    expect(CoreIndex.NotFoundError).toBe(NotFoundError);
    expect(CoreIndex.RateLimitError).toBe(RateLimitError);
    expect(CoreIndex.TimeoutError).toBe(TimeoutError);
    expect(CoreIndex.NetworkError).toBe(NetworkError);
    expect(CoreIndex.ValidationError).toBe(ValidationError);
    expect(CoreIndex.createHttpError).toBe(createHttpError);
  });

  it('re-exports config, auth, transport, retry, rate-limiter, and pagination functions', () => {
    expect(typeof CoreIndex.resolveConfig).toBe('function');
    expect(typeof CoreIndex.createAuthProvider).toBe('function');
    expect(typeof CoreIndex.HttpTransport).toBe('function');
    expect(typeof CoreIndex.isRetryableStatus).toBe('function');
    expect(typeof CoreIndex.calculateDelay).toBe('function');
    expect(typeof CoreIndex.isNetworkError).toBe('function');
    expect(typeof CoreIndex.sleep).toBe('function');
    expect(typeof CoreIndex.getRetryAfterMs).toBe('function');
    expect(typeof CoreIndex.parseRateLimitHeaders).toBe('function');
    expect(typeof CoreIndex.extractCursor).toBe('function');
    expect(typeof CoreIndex.paginateCursor).toBe('function');
    expect(typeof CoreIndex.paginateOffset).toBe('function');
    expect(typeof CoreIndex.paginateSearch).toBe('function');
  });
});

describe('AtlassianError', () => {
  it('sets name, code, and message', () => {
    const err = new AtlassianError('something went wrong', 'MY_CODE');
    expect(err.name).toBe('AtlassianError');
    expect(err.code).toBe('MY_CODE');
    expect(err.message).toBe('something went wrong');
  });

  it('is instanceof Error and AtlassianError', () => {
    const err = new AtlassianError('msg', 'CODE');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AtlassianError);
  });

  it('forwards error options (cause)', () => {
    const cause = new Error('root cause');
    const err = new AtlassianError('outer', 'CODE', { cause });
    expect(err.cause).toBe(cause);
  });
});

describe('HttpError', () => {
  it('sets name, code, status, and responseBody', () => {
    const body = { detail: 'bad' };
    const err = new HttpError('HTTP failure', 500, body);
    expect(err.name).toBe('HttpError');
    expect(err.code).toBe('HTTP_ERROR');
    expect(err.status).toBe(500);
    expect(err.responseBody).toBe(body);
    expect(err.message).toBe('HTTP failure');
  });

  it('responseBody is undefined when omitted', () => {
    const err = new HttpError('oops', 503);
    expect(err.responseBody).toBeUndefined();
  });

  it('is instanceof AtlassianError and Error', () => {
    const err = new HttpError('msg', 400);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AtlassianError);
    expect(err).toBeInstanceOf(HttpError);
  });

  it('accepts a custom code override', () => {
    const err = new HttpError('msg', 401, undefined, undefined, 'CUSTOM_CODE');
    expect(err.code).toBe('CUSTOM_CODE');
  });

  it('forwards error options (cause)', () => {
    const cause = new Error('cause');
    const err = new HttpError('msg', 500, undefined, { cause });
    expect(err.cause).toBe(cause);
  });
});

describe('AuthenticationError', () => {
  it('uses default message when none provided', () => {
    const err = new AuthenticationError();
    expect(err.message).toBe('Authentication failed');
    expect(err.status).toBe(401);
    expect(err.code).toBe('AUTHENTICATION_ERROR');
    expect(err.name).toBe('AuthenticationError');
  });

  it('uses provided message', () => {
    const err = new AuthenticationError('Invalid token');
    expect(err.message).toBe('Invalid token');
  });

  it('stores responseBody', () => {
    const body = { reason: 'expired' };
    const err = new AuthenticationError(undefined, body);
    expect(err.responseBody).toBe(body);
  });

  it('instanceof chain: Error → AtlassianError → HttpError → AuthenticationError', () => {
    const err = new AuthenticationError();
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AtlassianError);
    expect(err).toBeInstanceOf(HttpError);
    expect(err).toBeInstanceOf(AuthenticationError);
  });

  it('forwards cause', () => {
    const cause = new Error('c');
    const err = new AuthenticationError(undefined, undefined, { cause });
    expect(err.cause).toBe(cause);
  });
});

describe('ForbiddenError', () => {
  it('uses default message', () => {
    const err = new ForbiddenError();
    expect(err.message).toBe('Access forbidden');
    expect(err.status).toBe(403);
    expect(err.code).toBe('FORBIDDEN_ERROR');
    expect(err.name).toBe('ForbiddenError');
  });

  it('uses provided message', () => {
    const err = new ForbiddenError('No permission');
    expect(err.message).toBe('No permission');
  });

  it('stores responseBody', () => {
    const body = { error: 'nope' };
    const err = new ForbiddenError(undefined, body);
    expect(err.responseBody).toBe(body);
  });

  it('instanceof chain', () => {
    const err = new ForbiddenError();
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AtlassianError);
    expect(err).toBeInstanceOf(HttpError);
    expect(err).toBeInstanceOf(ForbiddenError);
  });
});

describe('NotFoundError', () => {
  it('uses default message', () => {
    const err = new NotFoundError();
    expect(err.message).toBe('Resource not found');
    expect(err.status).toBe(404);
    expect(err.code).toBe('NOT_FOUND_ERROR');
    expect(err.name).toBe('NotFoundError');
  });

  it('uses provided message', () => {
    const err = new NotFoundError('Page missing');
    expect(err.message).toBe('Page missing');
  });

  it('stores responseBody', () => {
    const body = { id: 42 };
    const err = new NotFoundError(undefined, body);
    expect(err.responseBody).toBe(body);
  });

  it('instanceof chain', () => {
    const err = new NotFoundError();
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AtlassianError);
    expect(err).toBeInstanceOf(HttpError);
    expect(err).toBeInstanceOf(NotFoundError);
  });
});

describe('RateLimitError', () => {
  it('uses default message', () => {
    const err = new RateLimitError();
    expect(err.message).toBe('Rate limit exceeded');
    expect(err.status).toBe(429);
    expect(err.code).toBe('RATE_LIMIT_ERROR');
    expect(err.name).toBe('RateLimitError');
  });

  it('uses provided message', () => {
    const err = new RateLimitError('Slow down');
    expect(err.message).toBe('Slow down');
  });

  it('stores retryAfter', () => {
    const err = new RateLimitError(undefined, 60);
    expect(err.retryAfter).toBe(60);
  });

  it('retryAfter is undefined when omitted', () => {
    const err = new RateLimitError();
    expect(err.retryAfter).toBeUndefined();
  });

  it('stores responseBody', () => {
    const body = { limit: 100 };
    const err = new RateLimitError(undefined, undefined, body);
    expect(err.responseBody).toBe(body);
  });

  it('instanceof chain', () => {
    const err = new RateLimitError();
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AtlassianError);
    expect(err).toBeInstanceOf(HttpError);
    expect(err).toBeInstanceOf(RateLimitError);
  });
});

describe('TimeoutError', () => {
  it('sets name, code, timeoutMs, and message', () => {
    const err = new TimeoutError(5000);
    expect(err.name).toBe('TimeoutError');
    expect(err.code).toBe('TIMEOUT_ERROR');
    expect(err.timeoutMs).toBe(5000);
    expect(err.message).toBe('Request timed out after 5000ms');
  });

  it('instanceof chain: Error → AtlassianError → TimeoutError', () => {
    const err = new TimeoutError(1000);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AtlassianError);
    expect(err).toBeInstanceOf(TimeoutError);
    expect(err).not.toBeInstanceOf(HttpError);
  });

  it('forwards cause', () => {
    const cause = new Error('abort');
    const err = new TimeoutError(3000, { cause });
    expect(err.cause).toBe(cause);
  });
});

describe('NetworkError', () => {
  it('sets name, code, and message', () => {
    const err = new NetworkError('Connection refused');
    expect(err.name).toBe('NetworkError');
    expect(err.code).toBe('NETWORK_ERROR');
    expect(err.message).toBe('Connection refused');
  });

  it('instanceof chain: Error → AtlassianError → NetworkError', () => {
    const err = new NetworkError('DNS failure');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AtlassianError);
    expect(err).toBeInstanceOf(NetworkError);
    expect(err).not.toBeInstanceOf(HttpError);
  });

  it('forwards cause', () => {
    const cause = new TypeError('fetch failed');
    const err = new NetworkError('net err', { cause });
    expect(err.cause).toBe(cause);
  });
});

describe('ValidationError', () => {
  it('sets name, code, and message', () => {
    const err = new ValidationError('baseUrl is required');
    expect(err.name).toBe('ValidationError');
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.message).toBe('baseUrl is required');
  });

  it('instanceof chain: Error → AtlassianError → ValidationError', () => {
    const err = new ValidationError('bad input');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AtlassianError);
    expect(err).toBeInstanceOf(ValidationError);
    expect(err).not.toBeInstanceOf(HttpError);
  });
});

describe('createHttpError', () => {
  it('401 → AuthenticationError', () => {
    const err = createHttpError(401, undefined);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.status).toBe(401);
  });

  it('403 → ForbiddenError', () => {
    const err = createHttpError(403, undefined);
    expect(err).toBeInstanceOf(ForbiddenError);
    expect(err.status).toBe(403);
  });

  it('404 → NotFoundError', () => {
    const err = createHttpError(404, undefined);
    expect(err).toBeInstanceOf(NotFoundError);
    expect(err.status).toBe(404);
  });

  it('429 → RateLimitError with retryAfter', () => {
    const err = createHttpError(429, undefined, 30);
    expect(err).toBeInstanceOf(RateLimitError);
    expect((err as RateLimitError).retryAfter).toBe(30);
  });

  it('429 → RateLimitError without retryAfter', () => {
    const err = createHttpError(429, undefined);
    expect(err).toBeInstanceOf(RateLimitError);
    expect((err as RateLimitError).retryAfter).toBeUndefined();
  });

  it('500 → HttpError (default)', () => {
    const err = createHttpError(500, undefined);
    expect(err.constructor).toBe(HttpError);
    expect(err.status).toBe(500);
    expect(err.message).toBe('HTTP error 500');
  });

  it('502 → HttpError with correct status', () => {
    const err = createHttpError(502, undefined);
    expect(err.constructor).toBe(HttpError);
    expect(err.status).toBe(502);
  });

  describe('body message extraction', () => {
    it('string body → message is the string', () => {
      const err = createHttpError(401, 'Unauthorized request');
      expect(err.message).toBe('Unauthorized request');
    });

    it('object with message field → uses message', () => {
      const err = createHttpError(403, { message: 'Not allowed' });
      expect(err.message).toBe('Not allowed');
    });

    it('object with errorMessages array → joins them', () => {
      const err = createHttpError(400, {
        errorMessages: ['Field A is required', 'Field B is required'],
      });
      // 400 falls through to default HttpError
      expect(err.message).toBe('Field A is required; Field B is required');
    });

    it('object with empty errorMessages array → falls through to message field', () => {
      const err = createHttpError(401, { errorMessages: [], message: 'fallback msg' });
      expect(err.message).toBe('fallback msg');
    });

    it('object with empty errorMessages and no message → uses default', () => {
      const err = createHttpError(401, { errorMessages: [] });
      expect(err.message).toBe('Authentication failed');
    });

    it('null body → uses default message for 401', () => {
      const err = createHttpError(401, null);
      expect(err.message).toBe('Authentication failed');
    });

    it('undefined body → uses default message for 404', () => {
      const err = createHttpError(404, undefined);
      expect(err.message).toBe('Resource not found');
    });

    it('non-object body (number) → uses default message', () => {
      const err = createHttpError(403, 42);
      expect(err.message).toBe('Access forbidden');
    });

    it('non-object body (boolean) → uses default message', () => {
      const err = createHttpError(403, true);
      expect(err.message).toBe('Access forbidden');
    });

    it('object without message or errorMessages → uses default for 500', () => {
      const err = createHttpError(500, { unrelated: 'data' });
      expect(err.message).toBe('HTTP error 500');
    });

    it('responseBody is attached to the error', () => {
      const body = { message: 'custom' };
      const err = createHttpError(500, body);
      expect(err.responseBody).toBe(body);
    });
  });
});
