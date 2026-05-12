import { describe, expect, it } from 'vitest';
import {
  CONTENT_PROPERTY_KEY_MAX_LENGTH,
  CONTENT_PROPERTY_KEY_PATTERN,
  validateContentPropertyKey,
} from '../../src/confluence/validators.js';
import { ValidationError } from '../../src/core/errors.js';

describe('validateContentPropertyKey', () => {
  it.each([
    'simple',
    'with.dots',
    'with-dashes',
    'with_underscores',
    'mixed.Case-123',
    'a',
    'A1',
    '0123456789',
  ])('accepts valid key: %s', (key) => {
    expect(() => validateContentPropertyKey(key)).not.toThrow();
  });

  it('rejects empty string', () => {
    expect(() => validateContentPropertyKey('')).toThrow(ValidationError);
    expect(() => validateContentPropertyKey('')).toThrow(/non-empty string/);
  });

  it('rejects non-string values', () => {
    // @ts-expect-error - testing runtime guard
    expect(() => validateContentPropertyKey(123)).toThrow(ValidationError);
    // @ts-expect-error - testing runtime guard
    expect(() => validateContentPropertyKey(undefined)).toThrow(ValidationError);
    // @ts-expect-error - testing runtime guard
    expect(() => validateContentPropertyKey(null)).toThrow(ValidationError);
  });

  it.each([
    'with space',
    'with/slash',
    'with:colon',
    'with$dollar',
    'with!bang',
    'unicode🚀',
    'has\nnewline',
  ])('rejects key with disallowed character: %s', (key) => {
    expect(() => validateContentPropertyKey(key)).toThrow(ValidationError);
    expect(() => validateContentPropertyKey(key)).toThrow(/must match/);
  });

  it('rejects keys exceeding the length cap', () => {
    const tooLong = 'a'.repeat(CONTENT_PROPERTY_KEY_MAX_LENGTH + 1);
    expect(() => validateContentPropertyKey(tooLong)).toThrow(ValidationError);
    expect(() => validateContentPropertyKey(tooLong)).toThrow(/characters or fewer/);
  });

  it('accepts a key at exactly the length cap', () => {
    const max = 'a'.repeat(CONTENT_PROPERTY_KEY_MAX_LENGTH);
    expect(() => validateContentPropertyKey(max)).not.toThrow();
  });

  it('includes the offending key in the error message', () => {
    try {
      validateContentPropertyKey('bad key');
    } catch (err) {
      expect((err as Error).message).toContain('bad key');
    }
  });

  it('exposes the regex publicly for callers wanting to validate up-front', () => {
    expect(CONTENT_PROPERTY_KEY_PATTERN.test('valid_key')).toBe(true);
    expect(CONTENT_PROPERTY_KEY_PATTERN.test('invalid key')).toBe(false);
  });
});
