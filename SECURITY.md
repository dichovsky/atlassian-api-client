# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 5.x     | Yes       |
| < 5.0   | No        |

## Reporting a Vulnerability

If you find a security vulnerability, use this procedure to report it:

1. **Do not** open a public issue.
2. Report the vulnerability privately. Use one of these methods:
   - [GitHub private vulnerability reporting](https://github.com/dichovsky/atlassian-api-client/security/advisories/new). This is the recommended method, because the report becomes a tracked draft advisory.
   - Send an email to **magdich.igor@gmail.com**. In the email, give information about the vulnerability.
3. Include the steps that make the vulnerability occur.
4. Give the maintainer sufficient time to correct the vulnerability before you make it public.

## Security Practices

This package uses these security practices:

- **Zero runtime dependencies** — The package has no runtime dependencies. This decreases the supply-chain attack surface.
- **No credential exposure** — The client does not write auth credentials to logs or to serialized errors. `HttpError.toJSON()` does not include `responseBody`. Debug logs remove query strings and the path segments that have the shape of a credential. The client redacts the token fields in OAuth error snippets before it truncates the snippets.
- **Auth always wins** — `HttpTransport` removes the caller-supplied headers that contain auth data (`Authorization`, proxy auth, cookies, and Atlassian WebSudo). Then it applies the configured auth provider.
- **Credential host allowlists** — `ClientConfig.allowedHosts` lets the client send requests only to the API hosts in this allowlist. It also rejects ports that are not the default port. `OAuthRefreshConfig.allowedTokenEndpointHosts` is a different allowlist for OAuth token endpoint hostnames. A token endpoint hostname must be the same as one entry in that allowlist. This different allowlist is necessary because refresh calls do not go through the transport.
- **Redirect checks on writes** — The transport sends POST, PUT, PATCH, and DELETE requests with `redirect: 'manual'`. The transport follows the redirect of a write only to an `https://` URL on the default port. `ClientConfig.allowedHosts` must accept the host of that URL, and the URL must not contain a username or a password. The transport uses these limits, so the write's own redirects cannot carry it, or its `Authorization` header, to a host outside the allowlist. After an accepted 303 (or a POST's 301/302), the body-less GET that follows keeps the request's `Authorization` header and is sent with `redirect: 'follow'`. Node's built-in `fetch` drops `Authorization` on a cross-origin hop.
  - If the transport refuses a redirect, the request throws an error. The transport does not follow that redirect, and it does not send the write again (see the README's Retry & Timeout section).
  - `fetch` follows all subsequent redirects of the body-less GET without the `allowedHosts` check, as for all other GET requests.
  - If a custom `config.fetch` does not drop `Authorization` on a cross-origin hop, that `fetch` sends the credential to the cross-origin host.
- **HTTPS enforcement** — `baseUrl` and the OAuth `tokenEndpoint` must use `https:`. The `tokenEndpoint` must also use the default port of its scheme, and it must not contain embedded userinfo. Thus, a request to an allow-listed hostname cannot send `refresh_token` and `client_secret` to a different service on a different port. Also, that request cannot include a hidden Basic credential that the caller did not intend to send. The OAuth middleware validates its endpoint at construction time. If you call `fetchRefreshedTokens` directly, it validates the endpoint before it sends the request.
- **Input validation** — The client validates its configuration at construction time. It validates numeric IDs (`boardId`, `sprintId`, `versionNumber`) as positive integers before it constructs a URL.
- **Response body cap** — If the client gets responses from proxies or upstream servers that you do not trust, set `ClientConfig.maxResponseBytes`. If a buffered success body or error body is larger than the configured cap, the request throws `ResponseTooLargeError`.
- **Safe logging** — Debug logs record only `method + path`. The client does not write query strings to logs, because query strings can contain cursor tokens or sensitive filter values.
- **Injection-safe code generation** — `generateTypes` validates schema names as legal TypeScript identifiers. Before it writes the source code, it escapes dangerous sequences in descriptions and enum values.
- **Safe defaults** — The timeout and retry settings have safe default values. The client validates the cache options and rejects a zero or negative `maxSize` or `ttl`.
- **Strict CLI parsing** — The CLI rejects unknown flags and does not ignore them. Thus, if you type a security-related flag incorrectly (for example, `--token`), the CLI shows an error. The CLI does not use the environment variables as an alternative to that flag without a message.

## Usage Guidelines

- **Do not hardcode API tokens** in source code. Use environment variables or a secret manager.
- **Rotate API tokens** at regular intervals. If you think that a token is exposed, rotate it immediately.
- **Use least privilege** — Use the OAuth scopes that are applicable to the integration. `detectRequiredScopes` can identify the known minimum set of OAuth scopes for the supported operation names.
- **Secure transport** — Always use HTTPS URLs for `baseUrl` and `tokenEndpoint`.
- **Persist refreshed tokens** — Use `onTokenRefreshed` in `OAuthRefreshConfig` to store new tokens. Stale tokens cause re-authentication that is not necessary.

## Supply Chain

- Run `npm audit` at regular intervals. This command finds known vulnerabilities in dev dependencies.
- This package has no runtime dependencies. Thus, the supply-chain risk applies only to the build and test toolchain.
