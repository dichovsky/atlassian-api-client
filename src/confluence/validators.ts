import { ValidationError } from '../core/errors.js';

/**
 * Maximum length for a Confluence content property key. The OpenAPI document
 * does not constrain the field, but the underlying storage rejects keys above
 * 255 characters. Enforcing it client-side surfaces the failure before a
 * round-trip.
 */
export const CONTENT_PROPERTY_KEY_MAX_LENGTH = 255;

/**
 * Allowed character set for a content property key. Mirrors the published
 * Confluence Cloud guidance (alphanumerics plus `_`, `.`, `-`).
 *
 * This pattern is heuristic — the OpenAPI document only types `key` as a
 * generic string. We deliberately reject characters that have caused server
 * 400s in practice so callers fail fast instead of waiting for the upstream
 * to reject the request.
 */
export const CONTENT_PROPERTY_KEY_PATTERN = /^[A-Za-z0-9_.\-]+$/;

/**
 * Throw `ValidationError` if the supplied content-property key is empty,
 * exceeds the length cap, or contains characters outside the allowed set.
 *
 * @throws ValidationError when the key is invalid.
 */
export function validateContentPropertyKey(key: string): void {
  if (typeof key !== 'string' || key.length === 0) {
    throw new ValidationError('content property key must be a non-empty string');
  }
  if (key.length > CONTENT_PROPERTY_KEY_MAX_LENGTH) {
    throw new ValidationError(
      `content property key must be ${CONTENT_PROPERTY_KEY_MAX_LENGTH} characters or fewer (got ${key.length}): ${key}`,
    );
  }
  if (!CONTENT_PROPERTY_KEY_PATTERN.test(key)) {
    throw new ValidationError(
      `content property key must match ${CONTENT_PROPERTY_KEY_PATTERN.source} (got "${key}")`,
    );
  }
}
