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

## Error handling

- `401`: auth invalid/expired; stop and request new credentials.
- `403`: scope/permission issue; report missing access.
- `404`: verify tenant URL and identifier.
- `429`: respect retry/backoff; reduce call rate.
- transient network errors: rely on built-in retries first.
