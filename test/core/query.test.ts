import { describe, it, expect } from 'vitest';
import { appendRepeatedParams } from '../../src/core/query.js';

describe('appendRepeatedParams', () => {
  it('returns the path unchanged for an undefined value array', () => {
    expect(appendRepeatedParams('/screens', 'id', undefined)).toBe('/screens');
  });

  it('returns the path unchanged for an empty value array', () => {
    expect(appendRepeatedParams('/screens', 'id', [])).toBe('/screens');
  });

  it('appends a single value with a leading "?" when the path has no query', () => {
    expect(appendRepeatedParams('/resolution/search', 'id', ['10000'])).toBe(
      '/resolution/search?id=10000',
    );
  });

  it('emits one repeated pair per value, joined with "&"', () => {
    expect(appendRepeatedParams('/resolution/search', 'id', ['10000', '10001'])).toBe(
      '/resolution/search?id=10000&id=10001',
    );
  });

  it('uses "&" as the separator when the path already has a query string', () => {
    expect(appendRepeatedParams('/screens?id=1', 'scope', ['GLOBAL', 'PROJECT'])).toBe(
      '/screens?id=1&scope=GLOBAL&scope=PROJECT',
    );
  });

  it('chains multiple calls so several repeated params compose', () => {
    const withId = appendRepeatedParams('/screens', 'id', [1, 2]);
    const withScope = appendRepeatedParams(withId, 'scope', ['GLOBAL']);
    expect(withScope).toBe('/screens?id=1&id=2&scope=GLOBAL');
  });

  it('stringifies numeric values', () => {
    expect(appendRepeatedParams('/screens', 'id', [1, 2, 3])).toBe('/screens?id=1&id=2&id=3');
  });

  it('percent-encodes special characters in values', () => {
    expect(appendRepeatedParams('/statuses/byNames', 'name', ['In Progress', 'A&B', 'a/b'])).toBe(
      '/statuses/byNames?name=In%20Progress&name=A%26B&name=a%2Fb',
    );
  });

  it('does not encode the parameter name', () => {
    expect(appendRepeatedParams('/x', 'workflowNames', ['wf'])).toBe('/x?workflowNames=wf');
  });
});
