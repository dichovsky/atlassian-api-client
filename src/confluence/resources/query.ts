/**
 * Shared query-builder primitives for Confluence v2 resources.
 *
 * These helpers exist so individual resources can keep their `build*Query`
 * methods focused on per-endpoint param shape without re-implementing the
 * same wire-format coercions (CSV joining, empty-array elision, etc.).
 * Add new helpers here only when a coercion is reused across 2+ resources.
 */

/**
 * Normalise an array-or-scalar filter into the comma-joined scalar the wire
 * format expects. Returns `undefined` for both omitted values and explicit
 * empty arrays so callers can drop the key from the query bag entirely
 * rather than emit `?keys=` with no payload (which the API treats as an
 * unfiltered query — masking caller bugs).
 */
export function csvOrScalar(value: string | readonly string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'string') return value;
  if (value.length === 0) return undefined;
  return value.join(',');
}

/** Query bag accepted by the underlying transport. Scalars only. */
type Query = Record<string, string | number | boolean | undefined>;

/**
 * Return `undefined` for an empty query bag so the transport does not append
 * a stray `?` to the URL. Used by methods whose params are entirely optional.
 */
export function nonEmptyQuery(query: Query): Query | undefined {
  return Object.keys(query).length === 0 ? undefined : query;
}
