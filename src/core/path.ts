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
