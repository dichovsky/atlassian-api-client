import { describe, it, expect } from 'vitest';
import { ValidationError } from '../../src/core/errors.js';
import { encodePathSegment, trimTrailingSlashes } from '../../src/core/path.js';

describe('encodePathSegment()', () => {
  it('encodes regular path-segment values', () => {
    expect(encodePathSegment('../admin')).toBe('..%2Fadmin');
  });

  it.each(['.', '..', '%2e', '%2E%2E', '%252e%252e'])('rejects dot-segment value: %s', (value) => {
    expect(() => encodePathSegment(value)).toThrow(ValidationError);
    expect(() => encodePathSegment(value)).toThrow('path parameter must not be "." or ".."');
  });

  it('uses the provided parameter name in validation errors', () => {
    expect(() => encodePathSegment('.', 'issueIdOrKey')).toThrow(
      'issueIdOrKey must not be "." or ".."',
    );
  });

  it('still encodes values when percent-decoding fails', () => {
    const malformed = '%E0%A4%A';
    expect(encodePathSegment(malformed)).toBe('%25E0%25A4%25A');
  });
});

describe('trimTrailingSlashes()', () => {
  it.each([
    ['https://x.atlassian.net///', 'https://x.atlassian.net'],
    ['/wiki/', '/wiki'],
    ['/a/b', '/a/b'],
    ['///', ''],
    ['', ''],
  ])('trims %j to %j, as /\\/+$/ did', (input, expected) => {
    expect(trimTrailingSlashes(input)).toBe(expected);
    expect(trimTrailingSlashes(input)).toBe(input.replace(/\/+$/, ''));
  });
});
