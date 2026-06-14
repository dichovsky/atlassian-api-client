import { describe, it, expect } from 'vitest';
import { appendRepeatedParams, appendScalarOrArrayParam } from '../../src/core/query.js';

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

describe('appendScalarOrArrayParam', () => {
  it('returns the path unchanged for an undefined value', () => {
    expect(appendScalarOrArrayParam('/blogposts/1', 'status', undefined)).toBe('/blogposts/1');
  });

  it('returns the path unchanged for an explicit empty array (treated as unset)', () => {
    expect(appendScalarOrArrayParam('/blogposts/1', 'status', [])).toBe('/blogposts/1');
  });

  it('emits a single scalar string as one param', () => {
    expect(appendScalarOrArrayParam('/blogposts/1', 'status', 'current')).toBe(
      '/blogposts/1?status=current',
    );
  });

  it('emits a single scalar number as one param', () => {
    expect(appendScalarOrArrayParam('/labels', 'space-id', 100)).toBe('/labels?space-id=100');
  });

  it('emits an array as repeated params, never CSV (B1049)', () => {
    expect(appendScalarOrArrayParam('/blogposts/1', 'status', ['current', 'archived'])).toBe(
      '/blogposts/1?status=current&status=archived',
    );
  });

  it('percent-encodes a scalar value that contains a comma (kept as one token)', () => {
    // A caller that passes a literal pre-joined string gets it back as a single
    // (encoded) value — it is NOT split, so the server still sees one token.
    expect(appendScalarOrArrayParam('/labels', 'label-id', '1,2,3')).toBe(
      '/labels?label-id=1%2C2%2C3',
    );
  });

  it('chains onto a path that already has a query string', () => {
    const withStatus = appendScalarOrArrayParam('/pages/1/inline-comments', 'status', ['open']);
    expect(appendScalarOrArrayParam(withStatus, 'resolution-status', ['reopened', 'open'])).toBe(
      '/pages/1/inline-comments?status=open&resolution-status=reopened&resolution-status=open',
    );
  });
});
