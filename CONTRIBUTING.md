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

| Script                  | Purpose                                                            |
| ----------------------- | ------------------------------------------------------------------ |
| `npm run build`         | Compile TypeScript to dist/                                        |
| `npm run typecheck`     | Type check all files (src + test + examples)                       |
| `npm run lint`          | ESLint check                                                       |
| `npm run lint:fix`      | Auto-fix lint issues                                               |
| `npm run test`          | Run tests                                                          |
| `npm run test:watch`    | Run tests in watch mode                                            |
| `npm run test:coverage` | Run tests with 100% coverage enforcement                           |
| `npm run validate`      | Full validation (clean + build + typecheck + lint + test:coverage) |

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

## Commit Messages

```
<type>: <description>
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`

## Pull Requests

- All checks must pass (build, typecheck, lint, test, coverage)
- Include tests for new functionality
- Update documentation if the public API changes
