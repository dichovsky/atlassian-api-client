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

Use Node.js 24 or a subsequent version. The `.nvmrc` file contains the Node.js version that CI uses.

The gate also runs these tools from `PATH`:

- `git`: `filemode:check` reads the Git index.
- `python3`: `api-coverage` and `test:api-gap` use it to run the API gap analyzer.
- `bash` and `jq`: `test/scripts/publish-workflow.test.ts` runs the scripts in the steps of the `Publish` workflow with `bash`. These scripts run `jq`.

## Scripts

| Script                     | Purpose                                                                                                                                                                                                                                                                                                   |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run build`            | Uses the TypeScript 7 compiler to write the build output to `dist/`.                                                                                                                                                                                                                                      |
| `npm run clean`            | Removes the generated output in `dist/` and `coverage/`.                                                                                                                                                                                                                                                  |
| `npm run filemode:check`   | Makes sure that no tracked file has an executable file mode, unless the file is on the permitted list in `scripts/check-file-modes.js`.                                                                                                                                                                   |
| `npm run toolchain:check`  | Makes sure that the TypeScript 7 compiler and the TypeScript 6 bridge have the correct versions.                                                                                                                                                                                                          |
| `npm run tsc:6`            | Runs the `tsc6` compiler of the TypeScript 6 bridge directly. We recommend that you use `typecheck:ts6`.                                                                                                                                                                                                  |
| `npm run tsc:7`            | Runs the TypeScript 7 compiler directly. We recommend that you use `build` or `typecheck`.                                                                                                                                                                                                                |
| `npm run typecheck`        | Type-checks the source code and the tests with TypeScript 7.                                                                                                                                                                                                                                              |
| `npm run typecheck:ts6`    | Makes sure that the code is compatible with TypeScript 6. The script uses the `--stableTypeOrdering` flag to make the TypeScript 6 compiler put the types in a stable sequence.                                                                                                                           |
| `npm run codemap`          | Generates `CODEMAP.md`.                                                                                                                                                                                                                                                                                   |
| `npm run codemap:check`    | Makes sure that `CODEMAP.md` agrees with the source code. This check frequently fails in CI. After you make your last change to the source code, or after you format the files, run `npm run codemap` again.                                                                                              |
| `npm run lint`             | Runs ESLint.                                                                                                                                                                                                                                                                                              |
| `npm run lint:fix`         | Runs ESLint and repairs the problems that ESLint can repair automatically.                                                                                                                                                                                                                                |
| `npm run format`           | Formats all the files in the repository with Prettier. For a change to only some files, run `npx prettier --write <files>` as an alternative.                                                                                                                                                             |
| `npm run format:check`     | Uses Prettier to make sure that the files have the correct format.                                                                                                                                                                                                                                        |
| `npm run test`             | Runs the TypeScript/V8 test suite and the API gap analyzer test suite.                                                                                                                                                                                                                                    |
| `npm run test:unit`        | Runs all the Vitest tests, but not the API gap analyzer test suite.                                                                                                                                                                                                                                       |
| `npm run test:api-gap`     | Runs the API gap analyzer test suite. A maximum of four tests run at the same time.                                                                                                                                                                                                                       |
| `npm run test:watch`       | Runs the tests in Vitest watch mode.                                                                                                                                                                                                                                                                      |
| `npm run test:coverage`    | Runs the TypeScript/V8 test suite with V8 coverage. The script fails if the coverage is less than 100%.                                                                                                                                                                                                   |
| `npm run test:exports`     | Validates the `exports` field of `package.json` against the files in `dist/`.                                                                                                                                                                                                                             |
| `npm run api-coverage`     | Compares the SDK routes in the executable code with the OpenAPI operations in the pinned `spec/` snapshots. The script uses Python 3, and it fails if a non-deprecated OpenAPI operation has no SDK route. If you change the requests that a resource sends, run this script.                             |
| `npm run spec-drift`       | Fetches the specs that Atlassian publishes and compares their contract fingerprints with the snapshots in `spec/`. The script must have network access. The script only reads data, and it does not make a commit.                                                                                        |
| `npm run changelog`        | Adds conventional-commit entries at the top of `CHANGELOG.md` (`conventional-changelog`).                                                                                                                                                                                                                 |
| `npm run release:check`    | Validates a release tag against `package.json`, `package-lock.json`, and `CHANGELOG.md` (`npm run release:check -- vX.Y.Z`). The [release runbook](docs/RELEASING.md) makes this check mandatory.                                                                                                         |
| `npm run validate:quality` | Runs the static checks of the gate: `filemode:check`, `toolchain:check`, `typecheck:ts6`, `typecheck`, `codemap:check`, `lint`, and `format:check`.                                                                                                                                                       |
| `npm run validate:package` | Runs the package checks of the gate: `build`, then `test:exports`.                                                                                                                                                                                                                                        |
| `npm run validate`         | Runs the full gate that must pass before you publish the package: `clean`, `validate:quality`, `test:coverage`, `test:api-gap`, then `validate:package` (file modes, toolchain, types for TypeScript 6 and 7, codemap, lint, format, 100% coverage, the API gap analyzer test suite, build, and exports). |

TypeScript 7 powers the `build` and `typecheck` scripts. We use the TypeScript 6 compatibility
package (the TypeScript 6 bridge) for the `typescript` dependency, because some tools must have the
TypeScript 6 compiler API. `typescript-eslint`, the codemap generator
(`scripts/generate-codemap.js`), and the SDK/CLI route map (`test/helpers/sdk-routes.ts`) use this
compiler API. These tests also use the compiler API: the public-JSDoc test
(`test/docs/jsdoc-public-exports.test.ts`), the CLI write-property reachability test
(`test/cli/cli-write-property-reachability.test.ts`), and the skill TypeScript-snippet test
(`test/cli/release-410-help-skill-docs.test.ts`). `npm run typecheck:ts6` runs the `tsc6` compiler of
the bridge.

Use the npm scripts in the table. Do not run the `tsc` command without an npm script. When the tools
and tests that use the TypeScript 6 bridge can use the stable API of TypeScript 7, we can remove the
bridge.

The API gap analyzer test suite runs the Python analyzer. The test suite does not run the code in
`src/**/*.ts`. Thus, `npm run test:coverage` does not include this test suite in the V8 coverage. But
`npm run validate` passes only when the two test suites pass.

CI runs five jobs at the same time: `quality` (`npm run validate:quality`), `coverage`
(`npm run test:coverage`), `api_gap` (`npm run test:api-gap`), `package` (`npm run validate:package`),
and `node_floor`. The `node_floor` job runs `npm run build` and `npm run test:unit` on Node.js 24.0.0,
the minimum version in `engines.node`. The other jobs use the Node.js version in `.nvmrc`. The `CI` job
collects the results of the five jobs, and it passes only when all five jobs pass. The `CI` job is the
required check.

## Code Standards

- Use the TypeScript strict mode. Do not use `any`.
- Make sure that ESLint shows zero errors and zero warnings.
- Keep the test coverage at 100% (statements, code branches, functions, and lines).
- Do not change a data object after you make it. Make a new object with the changes.
- Write small functions that each do one task. Keep each function shorter than 50 lines.

## Adding a New Resource

First, make sure that each route, parameter, and request body agrees with the pinned OpenAPI snapshots in `spec/`. The CLI/skill parity rule is mandatory. A resource method is not completed until the `atlas` CLI can call it and the skill documents it.

1. **Types.** Put the Confluence TypeScript types in `src/confluence/types/<domain>.ts`. Put the Confluence types that two or more domains use in `common.ts`. Put each Jira request type and response type in its resource file (`src/jira/resources/<name>.ts`). In `src/jira/types.ts`, put only the types that two or more resources use.
2. **Resource class.** Add the resource class to `src/confluence/resources/` or `src/jira/resources/`. Encode the path parameters with `encodePathSegment`. For each Jira query parameter of `type: array`, use `appendRepeatedParams`.
3. **Client wiring.** Construct the resource in `src/confluence/client.ts` or `src/jira/client.ts`.
4. **Exports.** Export the resource class and its TypeScript types from the Confluence or Jira barrel file (`src/confluence/index.ts` or `src/jira/index.ts`). Also export each public TypeScript type from the package root (`src/index.ts`). The `exports` field of `package.json` contains only `.`. Thus, a caller cannot import a TypeScript type that `src/index.ts` does not export. For example, #369 did not export approximately 90 of these types, and a subsequent pull request exported them.
5. **CLI.** For each public resource method, add a CLI action in `src/cli/commands/confluence.ts` or `src/cli/commands/jira.ts`. For a request body that contains objects or arrays, use a flag with a JSON value, for example `--body '{...}'`. Add each new flag to `GLOBAL_OPTIONS` in `src/cli/router.ts`. `parseArgs` operates in strict mode, and it rejects each flag that is not in `GLOBAL_OPTIONS`. Add the help text in `src/cli/help.ts`.
6. **Skill docs.** Document each CLI action in `skill/reference/confluence.md` or in the applicable `skill/reference/jira/<domain>.md` file. For a Jira CLI action, also add the CLI action to the `skill/reference/jira.md` index. Give sufficient information to write the command from the skill only. Include the syntax, the IDs, the mandatory flags, and the optional flags. Also include the structure of the request body, the pagination, and the limits and conditions of the command.

   For example, these two tests examine the skill documentation:
   - `test/cli/api-skill-parity.test.ts` examines the parity in the two directions. The test fails if one of these conditions occurs:
     - The CLI cannot call a public resource method.
     - The skill does not document a CLI action.
     - The skill documents a CLI action that is not in the CLI.
   - `skill-content.test.ts` examines the front matter and the text of `SKILL.md` and the content of the `skill/reference/` files. It also parse-validates the `atlas` examples in `SKILL.md` and in each `skill/reference/**/*.md` file.

7. **Tests.** Add tests in `test/`, with the same structure as `src/`. Keep the coverage at 100%.
8. **Generated and headline docs.** Run `npm run codemap`. If the resource is one of the primary resources of the package, update the README.
9. **Gate.** Run `npm run validate`. If you changed the requests that a resource sends, also run `npm run api-coverage`.

## Package Security

- Keep `package.json.files` as a list of the files and directories that the package must contain. Use `npm pack --dry-run --json` to make sure that the package contains the correct files.
- Keep the number of runtime dependencies at zero. Add a runtime dependency only if a change must have it and a reviewer gives approval. If the dependency metadata changes, run `npm audit`.
- Do not publish from a working tree that has changes that you did not commit. Do not publish from a working tree that did not pass `npm run validate`. `prepublishOnly` runs `npm run validate`.
- If the supported versions or the security controls change, update `SECURITY.md`.
- For each release, obey the [release runbook](docs/RELEASING.md). Publish to npm only through the `Publish` workflow. A tag starts this workflow, and the workflow uses npm trusted publishing.

## Documentation Style

Write the documentation prose in ASD-STE100 Simplified Technical English. Use the rules in the [writing guide](docs/WRITING.md).

## Commit Messages

```
<type>: <description>
```

Use one of these commit types:

- `feat`
- `fix`
- `refactor`
- `docs`
- `test`
- `chore`
- `perf`

## Pull Requests

- `npm run validate` must pass.
- Include tests for the new code.
- If the public API changes, update the documentation.
