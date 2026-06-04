/**
 * B014 — Property-based tests for encoding helpers in src/core/path.ts
 * and src/core/connect-jwt.ts (encodeRfc3986 is package-private so we test
 * its observable effect through QSH strings; encodePathSegment is exported).
 *
 * Invariants tested:
 * 1. encodePathSegment output is reversible via decodeURIComponent for
 *    strings that are not dot-segments.
 * 2. Reserved chars that must be percent-encoded never appear raw in
 *    encodePathSegment output.
 * 3. encodePathSegment rejects "." and ".." (dot-segment traversal).
 * 4. encodePathSegment rejects percent-encoded variants of "." and ".."
 *    (e.g. "%2E%2E").
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { encodePathSegment } from '../../src/core/path.js';
import { ValidationError } from '../../src/core/errors.js';

// ---------------------------------------------------------------------------
// Characters that must always be percent-encoded in a path segment
// (RFC 3986 §3.3 — everything outside unreserved + sub-delims + ':@' must
// be percent-encoded; the unsafe set below is a representative subset)
// ---------------------------------------------------------------------------
const MUST_ENCODE = ['/', '?', '#', '[', ']', '@', ' '];

// Fixed seed for determinism.
const FC_OPTIONS: fc.Parameters<unknown> = { seed: 7, numRuns: 200 };

// Arbitrary that generates strings which are definitely NOT dot-segments so
// the encoder never throws.
const safeStringArb = fc
  .string({ minLength: 1, maxLength: 80 })
  .filter((s) => s !== '.' && s !== '..' && s !== '%2E' && s !== '%2e')
  .filter(
    (s) =>
      // Exclude strings that would decode to a dot-segment through repeated
      // decoding cycles.  A simple heuristic: no string whose successive
      // decodes land on '.' or '..'.
      !wouldDecodeToDotSegment(s),
  );

function wouldDecodeToDotSegment(s: string): boolean {
  let cur = s;
  for (let i = 0; i < 4; i++) {
    try {
      const next = decodeURIComponent(cur);
      if (next === cur) break;
      cur = next;
      if (cur === '.' || cur === '..') return true;
    } catch {
      break;
    }
  }
  return false;
}

describe('encodePathSegment (property)', () => {
  it('round-trips through decodeURIComponent for safe strings', () => {
    fc.assert(
      fc.property(safeStringArb, (s) => {
        const encoded = encodePathSegment(s);
        expect(decodeURIComponent(encoded)).toBe(s);
      }),
      FC_OPTIONS,
    );
  });

  it('never emits a raw "/" in the encoded output', () => {
    fc.assert(
      fc.property(safeStringArb, (s) => {
        const encoded = encodePathSegment(s);
        expect(encoded).not.toContain('/');
      }),
      FC_OPTIONS,
    );
  });

  it('never emits raw characters that must be percent-encoded', () => {
    fc.assert(
      fc.property(safeStringArb, (s) => {
        const encoded = encodePathSegment(s);
        for (const ch of MUST_ENCODE) {
          expect(encoded).not.toContain(ch);
        }
      }),
      FC_OPTIONS,
    );
  });

  it('throws ValidationError for "."', () => {
    expect(() => encodePathSegment('.')).toThrow(ValidationError);
  });

  it('throws ValidationError for ".."', () => {
    expect(() => encodePathSegment('..')).toThrow(ValidationError);
  });

  it('throws ValidationError for percent-encoded variants of dot-segments', () => {
    // These all decode back to '.' or '..' through the loop in isDotSegment.
    const dotVariants = ['%2E', '%2e', '%2E%2E', '%2e%2e', '%252E%252E'];
    for (const v of dotVariants) {
      // Not all variants necessarily reach the dot-segment check (triple-encoded
      // ones are out of the MAX_DECODE_ROUNDS=3 window), so we only assert for
      // the ones that actually decode within bounds.
      if (wouldDecodeToDotSegment(v)) {
        expect(() => encodePathSegment(v)).toThrow(ValidationError);
      }
    }
  });

  it('output contains only percent-encoded or unreserved characters', () => {
    fc.assert(
      fc.property(safeStringArb, (s) => {
        const encoded = encodePathSegment(s);
        // encodeURIComponent (used internally) is defined to percent-encode
        // everything except: A-Z a-z 0-9 - _ . ! ~ * ' ( )
        // These are all either unreserved chars or sub-delimiters left literal
        // by encodeURIComponent. encodePathSegment does NOT additionally escape
        // those sub-delimiters (only encodeRfc3986 in connect-jwt.ts does).
        // So the valid output characters are unreserved + the above sub-delims.
        expect(encoded).toMatch(/^([A-Za-z0-9\-_.~!*'()]|%[0-9A-Fa-f]{2})*$/);
      }),
      FC_OPTIONS,
    );
  });
});
