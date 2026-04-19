# BACKLOG.md

## [TypeScript & Code Quality]
[MEDIUM] Replace unsafe type assertions in `transport.ts` with type guards
Severity: medium
Location: `src/core/transport.ts:48`, `src/core/transport.ts:152`
Problem:
The `request` method and `executeFetch` method use `as T` to cast the response data. This assumes the API response strictly follows the expected type `T` without any validation.
Impact:
If the Atlassian API returns a different structure (e.g., due to a version change or unexpected error payload), the application will encounter runtime errors when accessing properties of the incorrectly typed object.
Recommendation:
Implement a lightweight validation or use a library like `zod` to validate the response shape at the boundary, or at least use type guards to verify the presence of expected properties before casting.
Acceptance Criteria:
- `request` method returns a type that has been verified.
- No `as T` usage for unvalidated external API responses.

[LOW] Improve type safety in `extractErrorMessage`
Severity: low
Location: `src/core/errors.ts:139`
Problem:
The code uses `const obj = body as Record<string, unknown>;` after a basic check. While `typeof body === 'object'` is checked, it doesn't strictly guarantee that the object is a non-null dictionary that can be safely indexed with string keys in all environments.
Impact:
Potential for minor runtime errors if `body` is an unexpected object type (e.g., an array, which is technically an object in JS).
Recommendation:
Use a more robust check to ensure `body` is a plain object, for example: `if (body !== null && typeof body === 'object' && !Array.isArray(body))`.
Acceptance Criteria:
- `extractErrorMessage` handles all possible `unknown` inputs safely without type assertions.

## [Security]
[MEDIUM] Audit logger for sensitive query parameter leakage
Severity: medium
Location: `src/core/transport.ts:88-90`
Problem:
The logger is explicitly instructed to skip query parameters: `// Log only method + path to avoid query parameters...`. However, the `path` itself is used. If a developer or a custom middleware passes sensitive information (like a session ID or a private ID) as part of the URL path, it will be logged.
Impact:
Sensitive identifiers might be leaked to persistent log aggregators (Splunk, CloudWatch, etc.).
Recommendation:
Ensure that the `path` is also sanitized or that the logger configuration is audited to prevent sensitive path segments from being logged in production.
Acceptance Criteria:
- No sensitive information is logged via `this.config.logger?.debug`.

## [Performance]
[LOW] Optimize `paginateOffset` loop termination
Severity: low
Location: `src/core/pagination.ts:125`
Problem:
The loop checks `else if (total !== undefined && startAt + maxResults >= total)`. While correct, the `isLast` flag from the API is often provided by Atlassian and should be prioritized to avoid a redundant request when the boundary is already known.
Impact:
An unnecessary final network request might be made if the `total` check is slightly off or delayed.
Recommendation:
Refine the termination logic to use `isLast` as the primary signal and use the `total` check as a secondary safeguard.
Acceptance Criteria:
- `paginateOffset` terminates immediately upon receiving `isLast: true`.

## [npm & Build]
[LOW] Verify `package.json` exports alignment with `dist/`
Severity: low
Location: `package.json:28-33`
Problem:
The `exports` field defines `.`, `.import`, and `.require`. There is no verification that the `build:cjs` script (which creates a custom `package.json` in `dist/cjs/`) correctly supports these entries for the CJS path.
Impact:
Users attempting to `require` the package might encounter "module not found" or "cannot find module" errors if the internal `dist/cjs/package.json` is misconfigured.
Recommendation:
Add a validation step in the `validate` script to check that the `dist/` structure matches the `exports` definition.
Acceptance Criteria:
- `npm run validate` fails if `exports` cannot be resolved within the `dist/` directory.
