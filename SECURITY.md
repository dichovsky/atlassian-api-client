# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | Yes       |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do not** open a public issue.
2. Email **magdich.igor@gmail.com** with details of the vulnerability.
3. Include steps to reproduce the issue.
4. Allow reasonable time for a fix before public disclosure.

## Security Practices

This package follows these security practices:

- **Zero runtime dependencies** - Minimises supply-chain attack surface.
- **No credential exposure** - Auth credentials are never logged, serialised in errors, or included in stack traces.
- **Input validation** - Configuration is validated at construction time.
- **Safe defaults** - Conservative timeout and retry settings.

## Usage Guidelines

- **Never hardcode API tokens** in source code. Use environment variables or a secret manager.
- **Rotate API tokens** regularly and immediately if exposure is suspected.
- **Use least privilege** - Create API tokens with only the scopes your application needs.
- **Secure transport** - Always use HTTPS URLs for `baseUrl`.

## Supply Chain

- Run `npm audit` regularly to check for known vulnerabilities in dev dependencies.
- This package has zero runtime dependencies, so supply-chain risk is limited to the build/test toolchain.
