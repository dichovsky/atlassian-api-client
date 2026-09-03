# Contributing

## Development Setup

```bash
# Clone and install
git clone <repo-url>
cd atlassian-api-client
npm install

# Verify setup
npm run validate
```

## Scripts

| Script                    | Purpose                                                                                        |
| ------------------------- | ---------------------------------------------------------------------------------------------- |
| `npm run build`           | Compile TypeScript to `dist/` with TypeScript 7                                                |
| `npm run clean`           | Remove generated `dist/` and `coverage/` output                                                |
| `npm run toolchain:check` | Verify the pinned TypeScript 7 compiler and TypeScript 6 API bridge                            |
| `npm run typecheck`       | Type-check source and tests with TypeScript 7                                                  |
| `npm run typecheck:ts6`   | Verify TypeScript 6 compatibility with stable type ordering                                    |
| `npm run codemap`         | Regenerate `CODEMAP.md`                                                                        |
| `npm run codemap:check`   | Verify that `CODEMAP.md` is current                                                            |
| `npm run lint`            | Run ESLint                                                                                     |
| `npm run lint:fix`        | Auto-fix ESLint issues                                                                         |
| `npm run format:check`    | Check formatting with Prettier                                                                 |
| `npm run test`            | Run the TypeScript/V8 suite and all API gap analyzer scenarios                                 |
| `npm run test:unit`       | Run every Vitest test except the Python API gap analyzer suite                                 |
| `npm run test:api-gap`    | Run all API gap analyzer scenarios with concurrency bounded to four processes                  |
| `npm run test:watch`      | Run tests in watch mode                                                                        |
| `npm run test:coverage`   | Run the TypeScript/V8 suite with exact 100% coverage enforcement                               |
| `npm run test:exports`    | Validate the built package exports                                                             |
| `npm run validate`        | Run the publish gate: toolchain checks, both typechecks, tests, formatting, build, and exports |

TypeScript 7 powers production type-checking and builds. The `typescript` dependency intentionally
remains on the TypeScript 6 compatibility package because `typescript-eslint`, the codemap generator,
and the public-JSDoc test still consume the TypeScript 6 compiler API. Use the npm scripts above instead
of a bare `tsc`; the bridge can be removed once those tools support TypeScript 7's stable API.

The Python-backed API gap tests are separate from V8 coverage because they do not execute `src/**/*.ts`.
`npm run validate` still requires both suites. CI runs quality, coverage, analyzer, and package checks as
parallel jobs and keeps the aggregate `CI` check as the required gate.

## Code Standards

- TypeScript strict mode, no `any`
- ESLint with zero warnings/errors
- 100% test coverage (statements, branches, functions, lines)
- Immutable data patterns
- Small focused functions (<50 lines)

## Adding a New Resource

1. Add types to the appropriate `types.ts` file
2. Create the resource class in `resources/`
3. Wire it into the client class
4. Export types and class from the barrel `index.ts` files
5. Add comprehensive tests
6. Update the README
7. If the resource is exposed via the CLI, document it in `skill/reference/confluence.md` or `skill/reference/jira.md` — the `skill-content.test.ts` drift check fails otherwise.

## Package Security

- Keep `package.json.files` explicit. Verify publish contents with `npm pack --dry-run --json`.
- Keep runtime dependencies at zero unless a reviewed feature requires one. Run `npm audit` when dependency metadata changes.
- Do not publish from a dirty or unvalidated tree. `prepublishOnly` runs `npm run validate`.
- Keep `SECURITY.md` current when supported versions or security controls change.
- Follow the [release runbook](docs/RELEASING.md) for every release; only the tag-triggered trusted-publishing workflow may publish to npm.

## Commit Messages

```
<type>: <description>
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`

## Pull Requests

- `npm run validate` must pass
- Include tests for new functionality
- Update documentation if the public API changes
