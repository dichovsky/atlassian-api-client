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

Use Node.js 24 or a subsequent version. The `.nvmrc` file selects the default Node.js version for CI.

Also install these tools:

- `git`: `filemode:check` reads the Git index.
- `python3`: `api-coverage` and `test:api-gap` use it to run the API gap analyzer.
- `bash`, `jq`, `tar`, and `openssl`: the tests of the `Publish` workflow use these tools to do the release steps again on your computer.

## Scripts

| Script                     | Purpose                                                                                                                                                                                                                                                                       |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run build`            | Uses TypeScript 7 to compile the package to `dist/`.                                                                                                                                                                                                                          |
| `npm run clean`            | Removes the generated output in `dist/` and `coverage/`.                                                                                                                                                                                                                      |
| `npm run filemode:check`   | Makes sure that no tracked file has an executable file mode, unless the file is on the permitted list in `scripts/check-file-modes.js`.                                                                                                                                       |
| `npm run typecheck`        | Type-checks the source code, the tests, the examples, and the scripts with TypeScript 7.                                                                                                                                                                                      |
| `npm run codemap`          | Generates `CODEMAP.md`.                                                                                                                                                                                                                                                       |
| `npm run codemap:check`    | Makes sure that `CODEMAP.md` agrees with the source code. This check frequently fails in CI. After you make your last change to the source code, or after you format the files, run `npm run codemap` again.                                                                  |
| `npm run lint`             | Uses Node.js to check the JavaScript syntax, then runs Oxlint. The check fails if there is a warning or an error.                                                                                                                                                             |
| `npm run lint:fix`         | Runs Oxlint and repairs the problems that Oxlint can repair automatically.                                                                                                                                                                                                    |
| `npm run format`           | Formats all the files in the repository with Oxfmt. To format only some files, run `npx oxfmt --write <files>`.                                                                                                                                                               |
| `npm run format:check`     | Uses Oxfmt to make sure that the files have the correct format.                                                                                                                                                                                                               |
| `npm run test`             | Runs the TypeScript/V8 test suite and the API gap analyzer test suite.                                                                                                                                                                                                        |
| `npm run test:unit`        | Runs all the Vitest tests, but not the API gap analyzer test suite.                                                                                                                                                                                                           |
| `npm run test:api-gap`     | Runs the API gap analyzer test suite. A maximum of four tests run at the same time.                                                                                                                                                                                           |
| `npm run test:watch`       | Runs the tests in Vitest watch mode.                                                                                                                                                                                                                                          |
| `npm run test:coverage`    | Runs the TypeScript/V8 test suite with V8 coverage. The script fails if the coverage is less than 100%.                                                                                                                                                                       |
| `npm run test:exports`     | Validates the `exports` field of `package.json` against the files in `dist/`.                                                                                                                                                                                                 |
| `npm run api-coverage`     | Compares the SDK routes in the executable code with the OpenAPI operations in the pinned `spec/` snapshots. The script uses Python 3, and it fails if a non-deprecated OpenAPI operation has no SDK route. If you change the requests that a resource sends, run this script. |
| `npm run spec-drift`       | Fetches the specs that Atlassian publishes and compares their contract fingerprints with the snapshots in `spec/`. The script must have network access. The script only reads data, and it does not make a commit.                                                            |
| `npm run changelog`        | Adds Conventional Commits entries at the top of `CHANGELOG.md`.                                                                                                                                                                                                               |
| `npm run release:check`    | Validates a release tag against `package.json`, `package-lock.json`, and `CHANGELOG.md` (`npm run release:check -- vX.Y.Z`). The [release runbook](docs/RELEASING.md) makes this check mandatory.                                                                             |
| `npm run validate:quality` | Runs the static checks of the gate: `filemode:check`, `typecheck`, `codemap:check`, `lint`, and `format:check`.                                                                                                                                                               |
| `npm run validate:package` | Runs the package checks of the gate: `build`, then `test:exports`.                                                                                                                                                                                                            |
| `npm run validate`         | Runs the full gate that must pass before you publish the package. The gate runs these scripts in this sequence: `clean`, `validate:quality`, `test:coverage`, `test:api-gap`, and `validate:package`.                                                                         |

TypeScript 7 compiles the SDK. It also checks the TypeScript examples in the README and in the bundled skill.
The codemap, the public-JSDoc test, the SDK route map, and the CLI write-property test examine the source code
through the `typescript/unstable/` APIs. These interfaces can change between releases. Thus, the `typescript`
dependency has an exact version. When you upgrade the compiler, run `npm run validate`.

The API gap analyzer test suite runs the Python analyzer. The test suite does not run the code in
`src/**/*.ts`. Thus, `npm run test:coverage` does not include this test suite in the V8 coverage. But
`npm run validate` passes only when the two test suites pass.

CI runs `quality` (`npm run validate:quality`), `coverage` (`npm run test:coverage`),
`api_gap` (`npm run test:api-gap`), `package` (`npm run validate:package`), and the `node_compat` matrix.
The `node_compat` matrix runs `npm run build` and `npm run test:unit` on Node.js 24.0.0 (the minimum version
in `engines.node`) and on Node.js 26. The other jobs use the Node.js version in `.nvmrc`. The `CI` check is
mandatory, and it passes only when all the jobs pass.

The HTTP integration tests use the native `fetch` function and a Node.js HTTP server. In GitHub Actions, the tests use loopback TCP. If a local runner does not let the tests open a listening port, the same tests send the HTTP data through two connected in-process streams.

## Code Standards

- Use the TypeScript strict mode. Do not use `any`.
- Make sure that Oxlint shows zero errors and zero warnings.
- Keep the test coverage at 100% (statements, code branches, functions, and lines).
- Do not change a data object after you make it. Make a new object with the changes.
- Write small functions that each do one task. Keep each function shorter than 50 lines.

## Adding a New Resource

First, make sure that each route, parameter, and request body agrees with the pinned OpenAPI snapshots in `spec/`. The CLI/skill parity rule is mandatory. A resource method is not completed until the `atlas` CLI can call it and the skill documents the CLI action. This rule does not apply to a generator method that has `All` in its name (for example, `listAll`) if the CLI can call its base method (for example, `list`).

1. **Types.** Put the Confluence TypeScript types in `src/confluence/types/<domain>.ts`. Put the Confluence types that two or more domains use in `common.ts`. Put each Jira request type and response type in its resource file (`src/jira/resources/<name>.ts`). In `src/jira/types.ts`, put only the types that two or more resources use.
2. **Resource class.** Add the resource class to `src/confluence/resources/` or `src/jira/resources/`. Encode the path parameters with `encodePathSegment`. For each Jira query parameter of `type: array`, use `appendRepeatedParams`.
3. **Client wiring.** Construct the resource in `src/confluence/client.ts` or `src/jira/client.ts`.
4. **Exports.** Export the resource class and its TypeScript types from the Confluence or Jira barrel file (`src/confluence/index.ts` or `src/jira/index.ts`). Also export each public TypeScript type from the package root (`src/index.ts`). The `exports` field of `package.json` contains only `.`. Thus, a caller cannot import a TypeScript type that `src/index.ts` does not export. For example, #369 did not export approximately 90 of these types, and a subsequent pull request exported them.
5. **CLI.** For each public resource method, add a CLI action in `src/cli/commands/confluence.ts` or `src/cli/commands/jira.ts`. For a request body that contains objects or arrays, use a flag with a JSON value, for example `--body '{...}'`. Add each new flag to `GLOBAL_OPTIONS` in `src/cli/router.ts`. `parseArgs` operates in strict mode, and it rejects each flag that is not in `GLOBAL_OPTIONS`. Add the help text in `src/cli/help.ts`.
6. **Skill docs.** Document each CLI action in `skill/reference/confluence.md` or in the applicable `skill/reference/jira/<domain>.md` file. For a Jira CLI action, also add the CLI action to the `skill/reference/jira.md` index. Give sufficient information to write the command from the skill only. Include the syntax, the IDs, the mandatory flags, and the optional flags. Also include the structure of the request body, the pagination, and the limits and conditions of the command.

   For example, these two tests examine the skill documentation:
   - `test/cli/api-skill-parity.test.ts` examines the parity in the two directions. The test fails if one of these conditions occurs:
     - The CLI cannot call a public resource method. This condition does not apply to a generator method that has `All` in its name if the CLI can call its base method.
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
- For each release, obey the [release runbook](docs/RELEASING.md). Publish to npm only through the `Publish` workflow. When you push a `v*` tag, GitHub starts this workflow. The workflow uses npm trusted publishing.

## Documentation Style

Use ASD-STE100 Simplified Technical English for the prose of the files in the [scope of the writing guide](docs/WRITING.md#scope). Use the rules in that guide.

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
