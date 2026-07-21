# Auth + safety (token-optimized)

## Required env

- `ATLASSIAN_BASE_URL`
- `ATLASSIAN_AUTH_TYPE` (`basic` default, `bearer` optional)
- `ATLASSIAN_API_TOKEN`
- `ATLASSIAN_EMAIL` (required for `basic`)
- `ATLASSIAN_ALLOWED_HOSTS` (optional; comma-separated bare hostnames)

## Validation flow

1. Verify required auth env exists.
2. If missing: stop and ask user.
3. If non-Atlassian/proxied host: include explicit allowlist entry for the base-url host.
4. Never echo or pass secrets as flags.

## Self-hosted instances

By default the CLI only allows `*.atlassian.net` / `*.atlassian.com` / `*.jira-dev.com` / `*.jira.com` as base URL hosts. Non-Atlassian or proxied hosts require an explicit allowlist entry, otherwise the call fails with `ValidationError: not on the default Atlassian host allowlist`.

Use `--allowed-hosts` (or `ATLASSIAN_ALLOWED_HOSTS`) with bare hostnames (no scheme, no port):

```sh
atlas confluence spaces list \
  --base-url https://confluence.internal.example \
  --allowed-hosts confluence.internal.example
```

Multiple comma-separated entries are permitted. The `baseUrl` host itself must be included.

## Connect JWT (SDK, not CLI)

- Outbound product-API signing: `createConnectJwtMiddleware` / `signConnectJwt` (HS256, shared secret).
- Inbound verification: `verifyConnectAsymmetricJwt(token, options)` verifies Atlassian-signed lifecycle/context tokens (RS256). It pins `alg` to `RS256` (rejects `none`/`HS256` — algorithm-confusion guard), checks the signature before any claim, then validates `exp`/`iat`/`nbf` (30s default skew), and optionally `iss`/`aud`/`qsh`. Core is network-free: pass `publicKey` or a `publicKeyResolver(kid)` (e.g. fetch `https://connect-install-keys.atlassian.com/{kid}`). Failures throw `ValidationError` with non-leaking messages.

## Error handling

- `401`: auth invalid or expired — STOP. Do not retry. Surface to user and request new credentials. Retrying on 401 may trigger account lockout.
- `403`: scope/permission issue; report missing access.
- `404`: verify tenant URL and identifier.
- `429`: respect retry/backoff; reduce call rate.
- transient network errors: rely on built-in retries first.
- Never construct a raw HTTP/curl request to bypass a failing `atlas` command. A hand-rolled request skips host-allowlisting, retry/backoff, and this error taxonomy. On failure, fix the command/flags/env or report the blocker — do not route around the CLI.
