/**
 * Shared host allowlist primitives used by:
 *   - {@link ../core/config.ts} for `ClientConfig.baseUrl` and `ClientConfig.allowedHosts`
 *     (transport-layer credential boundary — B021/B034)
 *   - {@link ../core/oauth.ts} for `OAuthRefreshConfig.tokenEndpoint` and
 *     `OAuthRefreshConfig.allowedTokenEndpointHosts` (token-refresh credential
 *     boundary — B036)
 *
 * The two threat models share infrastructure but NOT default lists. Transport
 * credentials (Authorization: Basic/Bearer) are scoped to tenant API hosts
 * (`*.atlassian.net` etc.); OAuth refresh credentials (refresh_token +
 * client_secret) are scoped to Atlassian's central auth endpoint. Conflating
 * the two would weaken either side.
 *
 * Match semantics:
 *   - {@link hostMatchesSuffix} — default lists use leading-dot suffix matching
 *     (`evil.example.atlassian.net.attacker.com` cannot bypass via substring).
 *   - {@link hostMatchesExact} — user-supplied lists use exact, port-less,
 *     case-insensitive matching. Ports are rejected at validation time.
 */

/**
 * Built-in suffixes accepted as Atlassian-managed API host targets for
 * `ClientConfig.baseUrl` defence-in-depth (B034). Suffix-with-leading-dot.
 */
export const DEFAULT_ATLASSIAN_API_HOST_SUFFIXES: readonly string[] = [
  '.atlassian.net',
  '.atlassian.com',
  '.jira-dev.com',
  '.jira.com',
];

/**
 * Built-in hosts accepted as OAuth 2.0 token endpoints for
 * `OAuthRefreshConfig.tokenEndpoint` (B036). EXACT match only — the
 * documented Atlassian OAuth 2.0 3LO endpoint host is `auth.atlassian.com`
 * and the library's default `tokenEndpoint` is `https://auth.atlassian.com/oauth/token`.
 *
 * Anything else — Connect token exchange, self-hosted IdPs, staging
 * endpoints, future Atlassian auth domains — MUST be opted in explicitly
 * via `OAuthRefreshConfig.allowedTokenEndpointHosts`. Tight by design:
 * the credential at risk (refresh_token + client_secret) is the highest-
 * value secret the library handles, so the default surface must be
 * minimal and auditable in one glance.
 */
export const DEFAULT_ATLASSIAN_OAUTH_TOKEN_HOSTS: readonly string[] = ['auth.atlassian.com'];

/**
 * Normalise a hostname for allowlist comparison: lowercase and strip a
 * single trailing FQDN dot. `new URL()` preserves trailing dots on Node
 * (`https://auth.atlassian.com.` → `hostname === 'auth.atlassian.com.'`), but
 * a trailing dot resolves to the same DNS target as the dotless form. Without
 * this normalisation a legitimate FQDN URL would be falsely rejected even
 * though it points at the same host the allowlist names.
 *
 * Only ONE trailing dot is stripped; `'x..'` collapses to `'x.'`, which then
 * fails comparison against `'x'` — exactly the right outcome, since `x..`
 * is not a valid FQDN.
 */
function normalizeHostForCompare(hostname: string): string {
  const lower = hostname.toLowerCase();
  return lower.endsWith('.') ? lower.slice(0, -1) : lower;
}

/**
 * Suffix-match a hostname against a list of leading-dot suffixes
 * (`.atlassian.net`). Case-insensitive; trailing FQDN dot is normalised away.
 *
 * Designed to protect against substring-confusable hosts like
 * `evil.atlassian.net.attacker.example` — those do NOT end in `.atlassian.net`
 * even though they contain it.
 *
 * @param hostname - The URL host portion to test (typically `new URL(x).hostname`).
 * @param suffixes - Leading-dot suffixes (lowercased internally).
 * @returns `true` when `hostname` ends with any suffix; `false` otherwise.
 */
export function hostMatchesSuffix(hostname: string, suffixes: readonly string[]): boolean {
  const normalized = normalizeHostForCompare(hostname);
  return suffixes.some((suffix) => normalized.endsWith(suffix.toLowerCase()));
}

/**
 * Exact-match a hostname against a list of bare host strings.
 * Case-insensitive; trailing FQDN dot is normalised away. Inputs are expected
 * to be port-less (validation enforces this for user-supplied lists — see
 * `validateAllowedHosts` in config.ts and `validateAllowedTokenEndpointHosts`
 * in oauth.ts).
 *
 * @param hostname - The URL host portion to test (typically `new URL(x).hostname`).
 * @param allowlist - Bare host strings (lowercased internally).
 * @returns `true` when `hostname` matches any allowlist entry; `false` otherwise.
 */
export function hostMatchesExact(hostname: string, allowlist: readonly string[]): boolean {
  const normalized = normalizeHostForCompare(hostname);
  return allowlist.some((entry) => normalizeHostForCompare(entry) === normalized);
}
