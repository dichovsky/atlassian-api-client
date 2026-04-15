# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 0.4.x   | Yes       |
| 0.3.x   | No        |
| < 0.3   | No        |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do not** open a public issue.
2. Email **magdich.igor@gmail.com** with details of the vulnerability.
3. Include steps to reproduce the issue.
4. Allow reasonable time for a fix before public disclosure.

## Security Practices

This package follows these security practices:

- **Zero runtime dependencies** — Minimises supply-chain attack surface.
- **No credential exposure** — Auth credentials are never logged, serialised in errors, or included in stack traces. `HttpError.toJSON()` explicitly omits `responseBody` so raw API payloads are not written to log aggregators via `JSON.stringify(error)`.
- **Auth always wins** — `HttpTransport` strips any caller-supplied `Authorization` header before applying the configured auth provider, so middleware cannot accidentally override credentials.
- **HTTPS enforcement** — `tokenEndpoint` in `OAuthRefreshConfig` must use `https:`. HTTP endpoints are rejected at call time to prevent credential leakage to unencrypted endpoints.
- **Input validation** — Configuration is validated at construction time; numeric IDs (`boardId`, `sprintId`, `versionNumber`) are validated as positive integers before URL construction.
- **Safe logging** — Debug logs record `method + path` only; query strings (which may contain cursor tokens or sensitive filter values) are never written to logs.
- **Injection-safe code generation** — `generateTypes` validates schema names as legal TypeScript identifiers and escapes unsafe sequences in descriptions and enum values before emitting source code.
- **Safe defaults** — Conservative timeout and retry settings; cache options validated to reject zero or negative `maxSize`/`ttl`.
- **Strict CLI parsing** — Unknown CLI flags are rejected (not silently swallowed), so typos in security-relevant flags like `--token` produce an error instead of silently falling back to environment variables.

## Usage Guidelines

- **Never hardcode API tokens** in source code. Use environment variables or a secret manager.
- **Rotate API tokens** regularly and immediately if exposure is suspected.
- **Use least privilege** — Create API tokens with only the scopes your application needs. Use `detectRequiredScopes` to identify the minimal set.
- **Secure transport** — Always use HTTPS URLs for `baseUrl` and `tokenEndpoint`.
- **Persist refreshed tokens** — Use `onTokenRefreshed` in `OAuthRefreshConfig` to store new tokens; stale tokens cause unnecessary re-authentication.

## Supply Chain

- Run `npm audit` regularly to check for known vulnerabilities in dev dependencies.
- This package has zero runtime dependencies, so supply-chain risk is limited to the build/test toolchain.
