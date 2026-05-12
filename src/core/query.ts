/**
 * Build a scalar query object suitable for the shared transport from a Params
 * object whose values may include `readonly string[]`. Array values are joined
 * into a comma-separated string per Confluence v2 spec convention. `undefined`
 * entries are stripped so they don't serialize as `key=undefined`.
 */
export function buildScalarQuery(
  params?: object,
): Record<string, string | number | boolean | undefined> {
  if (!params) return {};
  const query: Record<string, string | number | boolean | undefined> = {};
  for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      query[key] = value.join(',');
    } else if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      query[key] = value;
    } else {
      // Defensive fallback: coerce unrecognized scalars to string.
      query[key] = String(value);
    }
  }
  return query;
}
