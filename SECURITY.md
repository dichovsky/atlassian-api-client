# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 1.x     | Yes       |
| < 1.0   | No        |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do not** open a public issue.
2. Email **magdich.igor@gmail.com** with details of the vulnerability.
3. Include steps to reproduce the issue.
4. Allow reasonable time for a fix before public disclosure.

## Security Practices

This package follows these security practices:

- **Zero runtime dependencies** — Minimises supply-chain attack surface.
- **No credential exposure** — Auth credentials are not logged or serialised in errors. `HttpError.toJSON()` omits `responseBody`, debug logs strip query strings and credential-shaped path segments, and OAuth error snippets redact token fields before truncation.
- **Auth always wins** — `HttpTransport` strips caller-supplied auth-bearing headers (`Authorization`, proxy auth, cookies, and Atlassian WebSudo) before applying the configured auth provider.
- **Credential host allowlists** — `ClientConfig.allowedHosts` gates API hosts and rejects non-default ports. `OAuthRefreshConfig.allowedTokenEndpointHosts` separately exact-matches OAuth token endpoint hostnames because refresh calls bypass the transport.
- **HTTPS enforcement** — `baseUrl` and OAuth `tokenEndpoint` must use `https:`. OAuth middleware validates its endpoint at construction; direct `fetchRefreshedTokens` calls validate before dispatch.
- **Input validation** — Configuration is validated at construction time; numeric IDs (`boardId`, `sprintId`, `versionNumber`) are validated as positive integers before URL construction.
- **Response body cap** — Set `ClientConfig.maxResponseBytes` when consuming responses from untrusted proxies or upstreams. Buffered success and error bodies fail with `ResponseTooLargeError` when they exceed the configured cap.
- **Safe logging** — Debug logs record `method + path` only; query strings (which may contain cursor tokens or sensitive filter values) are never written to logs.
- **Injection-safe code generation** — `generateTypes` validates schema names as legal TypeScript identifiers and escapes unsafe sequences in descriptions and enum values before emitting source code.
- **Safe defaults** — Conservative timeout and retry settings; cache options validated to reject zero or negative `maxSize`/`ttl`.
- **Strict CLI parsing** — Unknown CLI flags are rejected (not silently swallowed), so typos in security-relevant flags like `--token` produce an error instead of silently falling back to environment variables.

## Usage Guidelines

- **Never hardcode API tokens** in source code. Use environment variables or a secret manager.
- **Rotate API tokens** regularly and immediately if exposure is suspected.
- **Use least privilege** — Use OAuth scopes appropriate for the integration. `detectRequiredScopes` can identify the known minimal OAuth scope set for supported operation names.
- **Secure transport** — Always use HTTPS URLs for `baseUrl` and `tokenEndpoint`.
- **Persist refreshed tokens** — Use `onTokenRefreshed` in `OAuthRefreshConfig` to store new tokens; stale tokens cause unnecessary re-authentication.

## Supply Chain

- Run `npm audit` regularly to check for known vulnerabilities in dev dependencies.
- This package has zero runtime dependencies, so supply-chain risk is limited to the build/test toolchain.
