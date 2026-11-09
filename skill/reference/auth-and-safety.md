# Auth + safety (token-optimized)

## Required env

- `ATLASSIAN_BASE_URL`
- `ATLASSIAN_AUTH_TYPE` (`basic` default, `bearer` optional)
- `ATLASSIAN_API_TOKEN`
- `ATLASSIAN_EMAIL` (required for `basic`)
- `ATLASSIAN_ALLOWED_HOSTS` (optional; comma-separated bare hostnames)
- `ATLASSIAN_SOFTWARE_CLOUD_ID` (optional; Jira Software on-premises OAuth proxy)

## Validation flow

1. Verify required auth env exists.
2. If missing: stop and ask user.
3. If non-Atlassian/proxied host: include explicit allowlist entry for the base-url host.
4. Never echo or pass secrets as flags.

## Self-hosted instances

By default the CLI only allows `*.atlassian.net` / `*.atlassian.com` / `*.jira-dev.com` / `*.jira.com` as base URL hosts. Non-Atlassian or proxied hosts require an explicit allowlist entry, otherwise the command fails before any request with `Error: baseUrl host "<host>" is not on the default Atlassian host allowlist (...)`. That message ends with the SDK hint `Pass ClientConfig.allowedHosts`; on the CLI the equivalent is `--allowed-hosts` or `ATLASSIAN_ALLOWED_HOSTS`.

Use `--allowed-hosts` (or `ATLASSIAN_ALLOWED_HOSTS`) with bare hostnames (no scheme, no port):

```sh
atlas confluence spaces list \
  --base-url https://confluence.internal.example \
  --allowed-hosts confluence.internal.example
```

Multiple comma-separated entries are permitted. The `baseUrl` host itself must be included.

## Jira Software on-premises OAuth proxy

Development Information, Builds, Deployments, and Feature Flag ingestion
support Atlassian's system-to-system OAuth integration proxy. Enable it
explicitly with
`--software-cloud-id <cloudId>` or `ATLASSIAN_SOFTWARE_CLOUD_ID`; bearer auth
alone leaves all resources on the normal site routes.

```sh
export ATLASSIAN_AUTH_TYPE=bearer
export ATLASSIAN_API_TOKEN="$OAUTH_ACCESS_TOKEN"
export ATLASSIAN_SOFTWARE_CLOUD_ID=11111111-2222-3333-4444-555555555555

atlas jira bulk submit-builds --value '{"builds":[{"pipelineId":"ci","buildNumber":1,"displayName":"CI #1","url":"https://ci.example.com/1","state":"successful","lastUpdated":"2026-01-01T00:00:00Z","updateSequenceNumber":1}]}'
```

`builds` (like `flags` for feature flags) must hold 1–100 entries (spec `minItems: 1`), so `{"builds":[]}` is not a valid payload.

The option requires a non-empty cloud ID and bearer OAuth token. Builds,
Deployments, and Feature Flag ingestion use
`https://api.atlassian.com/jira/{type}/0.1/cloud/{cloudId}`; Development
Information uses proxy version `0.1` instead of the site version `0.10`.
Specifically, `atlas jira bulk submit-feature-flags --value '{"flags":[...]}'`
uses `/jira/featureflags/0.1/cloud/{cloudId}/bulk`. Do not add
`api.atlassian.com` to `ATLASSIAN_ALLOWED_HOSTS`: the Jira client authorizes
that exact host only while proxy mode is enabled. Feature Flag lookup/deletion
and all other Jira resources continue to use `ATLASSIAN_BASE_URL`. In
particular, `atlas jira pipelines get-deployment-gating-status ...` remains a
tenant request even though sibling deployment ingestion/get/delete actions use
the proxy.

## Connect JWT (SDK, not CLI)

The CLI authenticates only with `basic` or `bearer`. Actions that Atlassian serves only to Connect apps are rejected with those credentials (expect 401/403), so do not retry them from the CLI; use the SDK's `createConnectJwtMiddleware` instead. In `jira/admin-devops.md` they are marked **Connect app (JWT) only**: `incidents`, `post-incident-reviews`, `devopscomponents`, `service-registry`, `bulk submit-operations` / `submit-devops-components`, the `linked-workspaces` `*-operations` actions, `bulk-by-properties delete-operations` / `delete-devops-components`, and `migration update-fields` / `update-properties` / `search-workflow-rules`. Other app-only actions carry their own notes: `app`, `addons` and `webhooks` (`list-failed` is Connect only) in `jira/admin-devops.md`, `workflows get-rule-config` / `update-rule-config` / `delete-rule-config` in `jira/schemes.md`, and the `jql` precomputation actions in `jira/search.md`.

- Outbound product-API signing: `createConnectJwtMiddleware` / `signConnectJwt` (HS256, shared secret).
- Inbound verification: `verifyConnectAsymmetricJwt(token, options)` verifies Atlassian-signed lifecycle/context tokens (RS256). It pins `alg` to `RS256` (rejects `none`/`HS256` — algorithm-confusion guard), checks the signature before any claim, then validates `exp`/`iat`/`nbf` (30s default skew), and optionally `iss`/`aud`/`qsh`. Core is network-free: pass `publicKey` or a `publicKeyResolver(kid)` (e.g. fetch `https://connect-install-keys.atlassian.com/{kid}`). Failures throw `ValidationError` with non-leaking messages.

## Error handling

- `401`: auth invalid or expired — STOP. Do not retry. Surface to user and request new credentials. Retrying on 401 may trigger account lockout.
- `403`: scope/permission issue; report missing access. To check OAuth 2.0 scope strings offline, run `atlas scopes validate` (below).
- `404`: verify tenant URL and identifier.
- `429`: respect retry/backoff; reduce call rate.
- transient network errors: rely on built-in retries first. A write command (create, update, delete, move, transition, assign, submit, ...) that fails at the network level rather than with an API error may already have been applied, and the CLI does not say so. It prints the transport's own message, e.g. `Error: fetch failed`, `Error: terminated` or `Error: Request timed out after 30000ms`; a write refused at a redirect prints a message containing "may already have applied it". After any of these, do not run the write again: read the resource back first (`get`, `list` or `search`), and re-run it only if the change is not there. A write can also be applied and still print an API error: when the server answers a write with a redirect, the CLI follows it with a `GET` and prints that `GET`'s error, so a write that fails with a `404`, a `429` or a `5xx` may have been applied too. Read it back the same way before running it again.
- Never construct a raw HTTP/curl request to bypass a failing `atlas` command. A hand-rolled request skips host-allowlisting, retry/backoff, and this error taxonomy. On failure, fix the command/flags/env or report the blocker — do not route around the CLI.

## Scope check (`atlas scopes validate`)

`atlas scopes validate <scope> [scope...]` checks OAuth 2.0 scope strings against the package's local Atlassian Cloud scope catalog. It needs no auth env and sends no request. It prints `{ "valid": [...], "unknown": [...], "allValid": true|false }` and exits 0 when every scope is known, or 1 when any is unknown (stderr lists them) or no scope is given (stderr lists the known scopes).

```sh
atlas scopes validate read:issue:jira write:issue:jira
atlas scopes validate read:security:jira delete:security:jira
```
