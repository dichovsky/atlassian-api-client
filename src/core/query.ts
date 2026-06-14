/**
 * Append a repeated (`type: array`, `style: form`, `explode: true`) query
 * parameter to a path/query string.
 *
 * The shared transport `query` bag is `Record<string, scalar>` and `buildUrl`
 * emits it via `URLSearchParams.set`, which collapses duplicate keys into a
 * single value. So an array query parameter that the Jira Cloud v3 OpenAPI
 * spec declares as `type: array` (default `style: form, explode: true`) cannot
 * be expressed through the scalar bag: a comma-joined value (`?id=a%2Cb`) is
 * parsed by Jira as one nonexistent token, silently dropping the filter.
 *
 * This helper builds the repeated pairs (`?id=a&id=b`) directly into the path
 * string instead — the same approach already used inline by
 * {@link WorkflowSchemeResource.getProjectAssociations} (#198),
 * {@link UsersResource.bulkGet} and {@link JqlResource.getPrecomputations}
 * (#200). Each value is percent-encoded with `encodeURIComponent`, matching
 * those existing call sites.
 *
 * - Empty / `undefined` value arrays are skipped (the path is returned
 *   unchanged), so optional multi-value filters do not emit a stray `?name=`.
 * - The `?`-vs-`&` separator is chosen by inspecting whether `path` already
 *   contains a `?`. Subsequent calls on the same path therefore chain with
 *   `&`, so multiple repeated params (e.g. `id` and `scope`) compose.
 *
 * @param path - The path (or path + existing query string) to extend.
 * @param name - The query parameter name (emitted verbatim, not encoded —
 *   spec parameter names are bare ASCII identifiers).
 * @param values - The values to emit as repeated params. Each is stringified
 *   then `encodeURIComponent`-encoded.
 * @returns A new path string with the repeated params appended.
 */
export function appendRepeatedParams(
  path: string,
  name: string,
  values: readonly (string | number)[] | undefined,
): string {
  if (values === undefined || values.length === 0) {
    return path;
  }
  const pairs = values.map((value) => `${name}=${encodeURIComponent(String(value))}`).join('&');
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}${pairs}`;
}

/**
 * Append a `type: array` query parameter whose SDK input accepts either a
 * single scalar *or* an array (the shape used by several Confluence v2 filters,
 * e.g. `status`/`resolution-status`/`keys`).
 *
 * Both shapes serialise to repeated wire params via {@link appendRepeatedParams}
 * — a lone scalar becomes a single `?status=current`, an array becomes
 * `?status=current&status=archived`. A comma-joined value would be parsed by
 * the server as one nonexistent token, silently dropping the filter (B1049).
 *
 * - `undefined` and explicit empty arrays are skipped (path returned unchanged),
 *   matching the prior `csvOrScalar`/`csvParam` "treat empty as unset" posture.
 * - A scalar is wrapped to a one-element array so the single value still flows
 *   through the same `encodeURIComponent` path-baking as the array case.
 *
 * @param path - The path (or path + existing query string) to extend.
 * @param name - The query parameter name (emitted verbatim).
 * @param value - A single scalar, an array of scalars, or `undefined`.
 * @returns A new path string with the repeated param(s) appended.
 */
export function appendScalarOrArrayParam(
  path: string,
  name: string,
  value: string | number | readonly (string | number)[] | undefined,
): string {
  if (value === undefined) {
    return path;
  }
  const values = Array.isArray(value)
    ? (value as readonly (string | number)[])
    : [value as string | number];
  return appendRepeatedParams(path, name, values);
}
