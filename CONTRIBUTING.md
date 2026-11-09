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

Use Node.js 24 or later (`.nvmrc` holds the version CI uses). The gate also runs these tools from `PATH`: `git` (`filemode:check` reads the index), `python3` (the API gap analyzer behind `api-coverage` and `test:api-gap`), and `bash` and `jq`, because `test/scripts/publish-workflow.test.ts` runs the publish workflow's step scripts with `bash` and those scripts call `jq`.

## Scripts

| Script                     | Purpose                                                                                                                                                                                                                      |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run build`            | Compile TypeScript to `dist/` with TypeScript 7                                                                                                                                                                              |
| `npm run clean`            | Remove generated `dist/` and `coverage/` output                                                                                                                                                                              |
| `npm run filemode:check`   | Verify that no tracked file has an executable mode outside the allowlist                                                                                                                                                     |
| `npm run toolchain:check`  | Verify the pinned TypeScript 7 compiler and TypeScript 6 API bridge                                                                                                                                                          |
| `npm run tsc:6`            | Run the TypeScript 6 compiler bridge directly (prefer `typecheck:ts6`)                                                                                                                                                       |
| `npm run tsc:7`            | Run the TypeScript 7 compiler directly (prefer `build` / `typecheck`)                                                                                                                                                        |
| `npm run typecheck`        | Type-check source and tests with TypeScript 7                                                                                                                                                                                |
| `npm run typecheck:ts6`    | Verify TypeScript 6 compatibility with stable type ordering                                                                                                                                                                  |
| `npm run codemap`          | Regenerate `CODEMAP.md`                                                                                                                                                                                                      |
| `npm run codemap:check`    | Verify that `CODEMAP.md` is current (a frequent CI failure: re-run `npm run codemap` after the last source or formatting change)                                                                                             |
| `npm run lint`             | Run ESLint                                                                                                                                                                                                                   |
| `npm run lint:fix`         | Auto-fix ESLint issues                                                                                                                                                                                                       |
| `npm run format`           | Rewrite files with Prettier (whole repository; for a focused change run `npx prettier --write <files>` instead)                                                                                                              |
| `npm run format:check`     | Check formatting with Prettier                                                                                                                                                                                               |
| `npm run test`             | Run the TypeScript/V8 suite and all API gap analyzer scenarios                                                                                                                                                               |
| `npm run test:unit`        | Run every Vitest test except the Python API gap analyzer suite                                                                                                                                                               |
| `npm run test:api-gap`     | Run all API gap analyzer scenarios with concurrency bounded to four processes                                                                                                                                                |
| `npm run test:watch`       | Run tests in watch mode                                                                                                                                                                                                      |
| `npm run test:coverage`    | Run the TypeScript/V8 suite with exact 100% coverage enforcement                                                                                                                                                             |
| `npm run test:exports`     | Validate the built package exports                                                                                                                                                                                           |
| `npm run api-coverage`     | Compare executable SDK routes with the pinned `spec/` snapshots (Python 3); fails on a missing non-deprecated operation. Run it whenever resource wire behavior changes                                                      |
| `npm run spec-drift`       | Fetch the live upstream specs and compare their contract fingerprints with `spec/` (needs network; read-only, commits nothing)                                                                                               |
| `npm run changelog`        | Prepend conventional-commit entries to `CHANGELOG.md` (`conventional-changelog`)                                                                                                                                             |
| `npm run release:check`    | Validate a release tag against `package.json`, `package-lock.json`, and `CHANGELOG.md` (`npm run release:check -- vX.Y.Z`); required by the [release runbook](docs/RELEASING.md)                                             |
| `npm run validate:quality` | The static half of the gate: `filemode:check`, `toolchain:check`, `typecheck:ts6`, `typecheck`, `codemap:check`, `lint`, `format:check`                                                                                      |
| `npm run validate:package` | The package half of the gate: `build`, then `test:exports`                                                                                                                                                                   |
| `npm run validate`         | The full publish gate: `clean`, `validate:quality`, `test:coverage`, `test:api-gap`, then `validate:package` (filemode, toolchain, both typechecks, codemap, lint, format, 100% coverage, API-gap suite, build, and exports) |

TypeScript 7 powers production type-checking and builds. The `typescript` dependency intentionally
remains on the TypeScript 6 compatibility package because these still need it: `typescript-eslint`, the
codemap generator (`scripts/generate-codemap.js`), the public-JSDoc test
(`test/docs/jsdoc-public-exports.test.ts`) and the CLI write-property reachability test
(`test/cli/cli-write-property-reachability.test.ts`) use the TypeScript 6 compiler API, and
`npm run typecheck:ts6` runs its `tsc6` compiler. Use the npm scripts above instead of a bare `tsc`; the
bridge can be removed once those tools support TypeScript 7's stable API.

The Python-backed API gap tests are separate from V8 coverage because they do not execute `src/**/*.ts`.
`npm run validate` still requires both suites.

CI runs five parallel jobs: `quality` (`npm run validate:quality`), `coverage` (`npm run test:coverage`),
`api_gap` (`npm run test:api-gap`), `package` (`npm run validate:package`), and `node_floor`, which runs
`npm run build` and `npm run test:unit` on Node.js 24.0.0, the `engines.node` floor; the other jobs use
the version in `.nvmrc`. The aggregate `CI` job passes only when all five pass, and it is the required
check.

## Code Standards

- TypeScript strict mode, no `any`
- ESLint with zero warnings/errors
- 100% test coverage (statements, branches, functions, lines)
- Immutable data patterns
- Small focused functions (<50 lines)

## Adding a New Resource

Verify every route, parameter, and body against the pinned OpenAPI snapshots in `spec/` first. The CLI/skill parity rule is a hard rule: a resource method that is not reachable from the `atlas` CLI and documented in the skill is not finished.

1. **Types.** Confluence types live in `src/confluence/types/<domain>.ts` (shared pieces in `common.ts`). Jira request and response types are colocated in the resource file (`src/jira/resources/<name>.ts`); only types shared across resources live in `src/jira/types.ts`.
2. **Resource class** in `src/confluence/resources/` or `src/jira/resources/`. Encode path parameters with `encodePathSegment`, and build Jira `type: array` query parameters with `appendRepeatedParams`.
3. **Client wiring.** Instantiate it in `src/confluence/client.ts` or `src/jira/client.ts`.
4. **Exports.** Export the class and its types from the product barrel (`src/confluence/index.ts` or `src/jira/index.ts`) and forward every public type through the package root `src/index.ts`. `package.json` exposes only `.`, so a type missing from `src/index.ts` cannot be imported by consumers (#369 needed a follow-up to expose about 90 such types).
5. **CLI.** Add an action for every public method in `src/cli/commands/confluence.ts` or `src/cli/commands/jira.ts` (complex bodies via JSON-valued flags such as `--body '{...}'`). Register every new flag in `GLOBAL_OPTIONS` in `src/cli/router.ts`, because `parseArgs` is strict and rejects unknown options, and add help text in `src/cli/help.ts`.
6. **Skill docs.** Document each CLI action in `skill/reference/confluence.md` or the matching `skill/reference/jira/<domain>.md` (and the `skill/reference/jira.md` index), with enough detail to construct the command from the skill alone: syntax, ids, required and optional flags, payload shape, pagination, and constraints. `test/cli/api-skill-parity.test.ts` enforces this in both directions: every public resource method is CLI-reachable, every CLI action is documented, and every documented action exists. `skill-content.test.ts` checks the `SKILL.md` front matter and prose, sanity-checks the reference-doc content, and parse-validates the `atlas` examples in `SKILL.md` and every `skill/reference/**/*.md` file.
7. **Tests** under `test/` mirroring `src/`, with 100% coverage.
8. **Generated and headline docs.** Run `npm run codemap`, and update the README if it is a headline resource.
9. **Gate.** Run `npm run validate`, plus `npm run api-coverage` when wire behavior changed.

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
