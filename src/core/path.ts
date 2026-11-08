import { ValidationError } from './errors.js';

const DOT_SEGMENT_VALUES = new Set(['.', '..']);
const MAX_DECODE_ROUNDS = 3;

/**
 * Encodes a caller-controlled URL path segment and rejects dot-segment traversal values.
 */
export function encodePathSegment(value: string, paramName = 'path parameter'): string {
  if (isDotSegment(value)) {
    throw new ValidationError(`${paramName} must not be "." or ".."`);
  }
  return encodeURIComponent(value);
}

/**
 * Strip every trailing `/` in linear time. Replaces `value.replace(/\/+$/, '')`,
 * which backtracks quadratically on a long run of `/` followed by any other
 * character (CodeQL js/polynomial-redos): 80,000 slashes took 12 s.
 */
export function trimTrailingSlashes(value: string): string {
  let end = value.length;
  while (end > 0 && value[end - 1] === '/') end--;
  return value.slice(0, end);
}

function isDotSegment(value: string): boolean {
  if (DOT_SEGMENT_VALUES.has(value)) {
    return true;
  }

  let decoded = value;

  for (let i = 0; i < MAX_DECODE_ROUNDS; i++) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) {
        break;
      }
      decoded = next;
      if (DOT_SEGMENT_VALUES.has(decoded)) {
        return true;
      }
    } catch {
      break;
    }
  }

  return false;
}
