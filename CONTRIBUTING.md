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

| Script                  | Purpose                                                                                                  |
| ----------------------- | -------------------------------------------------------------------------------------------------------- |
| `npm run build`         | Compile TypeScript to `dist/`                                                                            |
| `npm run clean`         | Remove generated `dist/` and `coverage/` output                                                          |
| `npm run typecheck`     | Type-check source and tests                                                                              |
| `npm run codemap`       | Regenerate `CODEMAP.md`                                                                                  |
| `npm run codemap:check` | Verify that `CODEMAP.md` is current                                                                      |
| `npm run lint`          | Run ESLint                                                                                               |
| `npm run lint:fix`      | Auto-fix ESLint issues                                                                                   |
| `npm run format:check`  | Check formatting with Prettier                                                                           |
| `npm run test`          | Run tests                                                                                                |
| `npm run test:watch`    | Run tests in watch mode                                                                                  |
| `npm run test:coverage` | Run tests with 100% coverage enforcement                                                                 |
| `npm run test:exports`  | Validate the built package exports                                                                       |
| `npm run validate`      | Run the publish gate: clean, typecheck, codemap check, lint, coverage, format check, build, export check |

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

## Commit Messages

```
<type>: <description>
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`

## Pull Requests

- `npm run validate` must pass
- Include tests for new functionality
- Update documentation if the public API changes
