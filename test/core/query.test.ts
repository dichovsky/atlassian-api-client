import { describe, expect, it } from 'vitest';
import { buildScalarQuery } from '../../src/core/query.js';

describe('buildScalarQuery', () => {
  it('returns empty object for undefined params', () => {
    expect(buildScalarQuery()).toEqual({});
  });

  it('returns empty object for empty params', () => {
    expect(buildScalarQuery({})).toEqual({});
  });

  it('forwards scalar string, number, and boolean values', () => {
    expect(buildScalarQuery({ a: 's', b: 1, c: true })).toEqual({ a: 's', b: 1, c: true });
  });

  it('joins arrays with comma', () => {
    expect(buildScalarQuery({ ids: ['1', '2', '3'] })).toEqual({ ids: '1,2,3' });
  });

  it('strips undefined values', () => {
    expect(buildScalarQuery({ a: 'x', b: undefined })).toEqual({ a: 'x' });
  });

  it('coerces non-scalar non-array values to strings', () => {
    expect(buildScalarQuery({ a: BigInt(5) })).toEqual({ a: '5' });
  });

  it('handles empty array as empty string', () => {
    expect(buildScalarQuery({ ids: [] })).toEqual({ ids: '' });
  });
});
