# Writing Guide

This guide gives the rules for the prose in the project documentation. Use it when you write or change a file in the scope below.

## Standard

The project uses ASD-STE100 Simplified Technical English, Issue 9 (2025-01-15). The Simplified Technical English Maintenance Group (STEMG) publishes the standard free of charge on the [ASD-STE100 website](https://www.asd-ste100.org/STE_downloads.html).

> [!CAUTION]
> Do not commit the ASD-STE100 PDF or parts of its dictionary to this repository. ASD does not let other persons supply copies of the standard without written permission.

Get your own copy from the website. Part 1 gives the 53 writing rules. Part 2 gives the dictionary of approved words.

## Scope

These rules apply to these files:

- `README.md`
- `CONTRIBUTING.md`
- `SECURITY.md`
- `docs/README.md`
- `docs/ARCHITECTURE.md`
- `docs/RELEASING.md`
- `docs/WRITING.md`
- `spec/README.md`

These files are out of scope:

- Historical records: `CHANGELOG.md`, `BACKLOG-ARCHIVE.md`, `docs/archive/`, `docs/releases/`, and `docs/ATLASSIAN-API-REFRESH-2026-08-30.md`. Do not rewrite the history.
- The work tracker: `BACKLOG.md`.
- Generated files and test fixtures: `CODEMAP.md` and `test/fixtures/`. To change a generated file, change the generator or the source, then run the generator.
- Legal text and vendored data: `LICENSE` and `spec/*.json`.
- Agent instruction files: `AGENTS.md`, `CLAUDE.md`, and `skill/`. These files have their own tests and parity rules.
- Code: JSDoc comments, other code comments, and runtime strings (errors, CLI output, and log messages) in `src/`, `scripts/`, and `test/`.

## Rule sequence

If two rules do not agree, the rule that is higher in this list applies:

1. Correct technical information and the behavior of the code.
2. The compatibility of public text and text that programs read (for example, text that a test checks).
3. Legal, licensed, quoted, and historical text. Do not change this text.
4. The repository instructions (`CONTRIBUTING.md` and this guide).
5. Accurate technical names and terms.
6. The ASD-STE100 rules.

## Core rules

The numbers in parentheses refer to the rules in ASD-STE100 Part 1.

### Words

- Use only these words (1.1):
  - Words that the dictionary approves, with the approved part of speech (1.2) and the approved meaning (1.3).
  - Technical nouns (1.5) and technical verbs (1.12). The [terminology](#terminology) table gives the technical words of this project.
  - Names of products, commands, files, and code elements.
- Use one word for one meaning, and one word for one concept (1.11, 9.4). Do not use synonyms for variety.
- Do not use a technical verb as a noun (1.13). For example, write "before the client truncates the snippet", not "before truncation".
- Use American English spelling (1.14). For example, write "serialized" and "minimize".
- Do not use idioms or phrasal verbs (9.3). For example, write "do not go through", not "bypass", and write "use only these snapshots", not "single source of truth".
- Do not use "it", "this", or "that" if the reader cannot find the noun that the word refers to.

### Sentences

- Write procedural sentences of 20 words or fewer (5.1).
- Write descriptive sentences of 25 words or fewer (6.3).
- Put each instruction in its own sentence (5.2). The exception is two or more actions that occur at the same time.
- Write instructions in the imperative form (5.3). If the reader must know a condition first, put the condition before the command (5.4). For example, write "If you get a 401 error, refresh the token."
- Write instructions and descriptive text in different sentences.
- Write in the active voice (3.6). Use the passive voice only in descriptive text. Use it only when you do not know who or what does the action.
- Keep the articles "the", "a", and "an" (4.2, 4.5). Do not use a telegraphic style.
- Do not use semicolons (8.1). Write two sentences.

The word count includes these conventions (8.4 to 8.7):

- Text in parentheses counts as one word.
- A number, a number with a unit, an abbreviation, a code span, a hyphenated word, a title, and a label each count as one word.

### Paragraphs and lists

- Give each paragraph one topic (6.5).
- Write six sentences or fewer in each paragraph (6.6).
- Use a vertical list for a sequence of steps, a set of conditions, or a set of options (4.3).
- Use a numbered list for steps that the reader must do in a sequence.

### Safety instructions

- Start a warning or a caution with a short, clear command or condition (7.2). Then give the risk or the possible result (7.3).
- Do not weaken or remove a warning.
- Keep the RFC 2119 keywords (MUST, SHOULD, MAY) where the text uses them. Do not change the requirement strength.

### Text that you must not change

- Code blocks, code spans, identifiers, commands, flags, environment variables, configuration keys, file paths, and protocol values.
- Link targets and anchors. Do not change the text of a heading, because GitHub and npm make the anchors from the heading text.
- Text that a test checks. Before you change a sentence, examine `test/` for that text. If a test checks the text, keep it.
- Quoted text, legal text, and historical text.

If you cannot find the meaning of a sentence in the code or the tests, do not change the sentence.

## Terminology

Use the terms in this table for the concepts that they name. The last column has two kinds of entry. A word in quotation marks is a synonym: do not use it for the concept in the row. A description without quotation marks is a different concept: do not use the term in the row for that concept. The words after "write" in parentheses are the correct words for that text.

The categories are:

- **Product name**: the name of a product, a service, or a tool.
- **Technical name**: a technical noun (rule 1.5). Most of these nouns are in category 19, computer science.
- **Technical verb**: a technical verb (rule 1.12). Most of these verbs are in category 2, computer processes.
- **Approved word**: an approved word in the dictionary. The table includes it to give one word for one concept.
- **Exception**: a word that is not approved in the dictionary, but that this project keeps for a specified cause.

### The package and its parts

| Term                   | Category       | Meaning in this project                                                                                            | Do not use for this concept                       |
| ---------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| `atlassian-api-client` | Product name   | This npm package and this repository.                                                                              | "the library", "the module"                       |
| package                | Technical name | The npm package that you install, publish, and version.                                                            | "library", "bundle", "artifact"                   |
| SDK                    | Technical name | The TypeScript API of the package: the clients, the resources, and the core layer. The CLI is not part of the SDK. | "library", "API wrapper"                          |
| `atlas`, CLI           | Product name   | The command-line interface of the package.                                                                         | "the binary", "the tool"                          |
| skill                  | Technical name | The bundled Claude Code skill `atlassian-api-client-cli` in `skill/`.                                              | "agent skill", "plugin", "prompt"                 |
| client                 | Technical name | An instance of `ConfluenceClient` or `JiraClient`.                                                                 | "4xx" status class (write "4xx response")         |
| resource               | Technical name | A group of resource methods on a client, for example `client.pages`.                                               | "module", "namespace", "endpoint group"           |
| resource method        | Technical name | A public method of a resource, for example `pages.get()`.                                                          | "endpoint", "operation", "function", "API call"   |
| layer                  | Technical name | A level of the architecture: the core layer, the middleware layer, or the CLI layer.                               | the position of one middleware (write "position") |
| core layer             | Technical name | The shared code in `src/core/`: transport, authentication, retry, errors, configuration, pagination.               | "infrastructure", "internals"                     |
| caller                 | Technical name | The code that uses the SDK.                                                                                        | "consumer", "user code", "integrator"             |
| maintainer             | Technical name | The person who maintains this repository and makes releases.                                                       | "owner", "author"                                 |

### Requests, responses, and the transport

| Term                              | Category       | Meaning in this project                                                                                                                                                                  | Do not use for this concept                                       |
| --------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| request                           | Technical name | One HTTP request that the caller starts through a resource method or `transport.request()`.                                                                                              | "call" (for HTTP), "fetch" (for the request)                      |
| write request                     | Technical name | A `POST`, `PUT`, `PATCH`, or `DELETE` request.                                                                                                                                           | "write" alone as a noun (except in pinned text)                   |
| attempt                           | Technical name | One send of a request on the network. The first send is an attempt, and each retry is an attempt.                                                                                        | "try", "round trip"                                               |
| send                              | Approved word  | The transport sends requests. Use this verb for the transport.                                                                                                                           | "dispatch", "issue", "fire"                                       |
| response                          | Technical name | The HTTP response that the server returns for an attempt.                                                                                                                                | "reply", "result" (for the HTTP response)                         |
| error response                    | Technical name | A response with a 4xx or 5xx status code.                                                                                                                                                | "client error", "server error" (write "4xx response")             |
| request header, response header   | Technical name | A header of a request or of a response. Give the header name if it is known, for example `Retry-After`.                                                                                  | "header" alone when the direction is not clear                    |
| request body, response body       | Technical name | The body of a request or of a response.                                                                                                                                                  | "payload", "body" alone                                           |
| HTTP method                       | Technical name | `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, and the other HTTP methods.                                                                                                                     | "verb"                                                            |
| endpoint                          | Technical name | One Atlassian REST API path with one HTTP method, on the Atlassian server.                                                                                                               | "route" (for the server side), "API"                              |
| OpenAPI operation                 | Technical name | One operation in a pinned spec: one path with one HTTP method.                                                                                                                           | "endpoint" (for the spec item)                                    |
| route                             | Technical name | The HTTP method and path that an SDK resource method sends. The API gap analyzer compares routes with OpenAPI operations.                                                                | "route" as a verb (write "send through")                          |
| operation name                    | Technical name | A key in the OAuth scope registry, for example `jira.issues.create`.                                                                                                                     | "operation" alone                                                 |
| transport                         | Technical name | The `Transport` object that sends requests. `HttpTransport` is the default transport.                                                                                                    | a network failure (write "network error")                         |
| network error                     | Technical name | A failure of the network while the client sends a request or receives the response. This includes a failure while the client reads the response body.                                    | "transport error", "connection error"                             |
| middleware                        | Technical name | A function of the `Middleware` type that operates on a request before the transport sends it.                                                                                            | "interceptor", "plugin", "hook", "layer"                          |
| middleware chain                  | Technical name | The ordered list of middleware in `ClientConfig.middleware`.                                                                                                                             | "middleware stack", "pipeline"                                    |
| host                              | Technical name | The host name part of a URL.                                                                                                                                                             | a server that runs software                                       |
| URL path, OpenAPI path, file path | Technical name | The path part of a URL, a path key in a spec (for example `/spaces/{id}/labels`), or the path of a file. Write the full term if the type of path is not clear.                           | "path" alone when the type is not clear                           |
| allowlist                         | Technical name | A list of permitted hosts: `ClientConfig.allowedHosts` or `OAuthRefreshConfig.allowedTokenEndpointHosts`.                                                                                | "whitelist", "list of allowed hosts"                              |
| redirect                          | Technical name | An HTTP 3xx response that sends the client to a different URL. "Follow a redirect" is the HTTP term.                                                                                     | "forward", "bounce"                                               |
| URL scheme                        | Technical name | The `https:` or `http:` part of a URL.                                                                                                                                                   | "scheme" alone, "protocol"                                        |
| retry                             | Technical verb | To send a request again after an attempt fails. As a noun, use "retry" only in fixed names, for example "retry loop".                                                                    | "re-send", "replay"                                               |
| timeout                           | Technical name | The maximum time that the transport waits for an attempt.                                                                                                                                | "deadline", "time limit"                                          |
| circuit breaker                   | Technical name | The middleware that stops requests to a host after too many failures.                                                                                                                    | "breaker" alone in new text, "fuse"                               |
| rate limiter                      | Technical name | The middleware that limits the number of requests in a time interval.                                                                                                                    | "throttle", "limiter" alone in new text                           |
| cache, cache key                  | Technical name | The response cache middleware and the key that it uses for each entry.                                                                                                                   | "memo", "store" (for the cache)                                   |
| base URL                          | Technical name | The Jira or Confluence site URL that you give in `baseUrl`.                                                                                                                              | "host URL", "root URL"                                            |
| API URL                           | Technical name | The base URL and the path of an API, for example `https://host/wiki/api/v2`. A client puts the API URL in `config.baseUrl`, and the transport puts it before each relative request path. | "base URL" (for the API URL)                                      |
| reverse proxy                     | Technical name | A server in front of Atlassian that the client uses as its `baseUrl` host.                                                                                                               | "proxy" alone if the Atlassian integration proxy is also possible |
| backoff, jitter                   | Technical name | The retry delay that increases after each failed attempt, and the random time that the retry logic adds to that delay.                                                                   | "wait", "sleep" (for the delay)                                   |
| cooldown                          | Technical name | The time in which the OAuth refresh middleware throws the kept refresh failure again and does not send a new token request (`failureCooldownMs`).                                        | "back-off" (for the cooldown)                                     |
| half-open trial                   | Technical name | The one request that the circuit breaker lets through after `resetTimeoutMs` to find out if the host operates again.                                                                     | "probe", "test request"                                           |
| outermost, innermost              | Technical name | The first and the last position in the middleware chain. The outermost middleware wraps all the other middleware.                                                                        | "top", "bottom", "layer" (for a position)                         |
| authentication identity           | Technical name | A one-way value from the credentials (`auth-identity.ts`). It makes the cache keys and batch keys different for different credentials.                                                   | "user" (for the identity)                                         |
| race condition                    | Technical name | An incorrect result that occurs when two concurrent operations occur at the same time.                                                                                                   | "collision" (for a race)                                          |

### Authentication

| Term                        | Category       | Meaning in this project                                                                                                                      | Do not use for this concept                       |
| --------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| authentication              | Technical name | The method that proves the identity of the caller to Atlassian. Use "auth" only in names, labels, and code, for example `ClientConfig.auth`. | "login", "auth" in new prose                      |
| `Authorization` header      | Technical name | The request header that contains the credential.                                                                                             | "auth header"                                     |
| credential                  | Technical name | A secret that proves identity: an API token, a bearer token, an OAuth access token or refresh token, a client secret, or a shared secret.    | "secret" alone, "key" (for a credential)          |
| API token                   | Technical name | The Atlassian API token that basic authentication sends with an email address.                                                               | "password", "API key"                             |
| bearer token                | Technical name | The token that the `bearer` authentication type sends in the `Authorization` header.                                                         | "auth token"                                      |
| token endpoint              | Technical name | The OAuth URL where the client gets tokens (`tokenEndpoint`).                                                                                | "endpoint" alone (an endpoint is a REST API path) |
| access token, refresh token | Technical name | The two OAuth 2.0 tokens. Write the full term if the type of token is not clear.                                                             | "token" alone when the type is not clear          |
| token                       | Technical name | An authentication token only.                                                                                                                | a pagination value (write "cursor")               |
| scope                       | Technical name | An OAuth 2.0 permission string, for example `read:jira-work`.                                                                                | "permission", "in scope" (for coverage)           |
| refresh                     | Technical verb | To get a new access token with a refresh token.                                                                                              | "renew", "rotate" (for OAuth)                     |
| rotate                      | Technical verb | To replace a credential, for example an API token, with a new one.                                                                           | "refresh" (for an API token)                      |
| redact                      | Technical verb | To replace a credential in text with `***` before the text goes into a log or an error.                                                      | "scrub", "censor"                                 |

### Pagination and data

| Term                                 | Category       | Meaning in this project                                                                                                                                                                                           | Do not use for this concept                     |
| ------------------------------------ | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| page                                 | Technical name | One response of a paginated list. Write "Confluence page" for the content item if both meanings are possible.                                                                                                     | "batch", "chunk" (for a page of results)        |
| cursor                               | Technical name | The value that gets the next page in cursor pagination, for example `cursor` or `nextPageToken`.                                                                                                                  | "token" (for a cursor), "marker"                |
| cursor pagination, offset pagination | Technical name | The two pagination methods. Cursor pagination uses a cursor (Confluence, and some Jira endpoints, for example `/rest/api/3/search/jql`). Offset pagination uses `startAt` and `maxResults` (most Jira endpoints). | "paging"                                        |
| TypeScript type                      | Technical name | A TypeScript type declaration. Write "TypeScript type" if the approved meaning of "type" is also possible.                                                                                                        | "interface" (unless it is an interface)         |
| error                                | Technical name | An error object that the SDK throws, from the error classes in `src/core/errors.ts`.                                                                                                                              | "exception" (for an SDK error)                  |
| throw                                | Technical verb | The SDK throws an error to stop a request.                                                                                                                                                                        | "raise"                                         |
| error message                        | Technical name | The text that the CLI shows, or the `message` of an error.                                                                                                                                                        | "error" alone (for the text)                    |
| construct                            | Technical verb | To make an object with `new` or a factory function, for example a client or a middleware. Use the verb, not the noun "construction" (rule 1.13).                                                                  | "create", "instantiate", "at construction time" |
| return                               | Technical verb | The action of a function, an iterator, or a server when it gives a value or a response to its caller.                                                                                                             | "give back", "hand back"                        |
| escape, encode                       | Technical verb | To replace characters with an escape sequence in generated code, or to change a path parameter into a URL-safe form (`encodePathSegment`).                                                                        | "sanitize" (for escape or encode)               |
| export, import                       | Technical verb | To make a class or a TypeScript type available from a module, and to use it from a different module.                                                                                                              | "expose", "forward" (for export)                |
| barrel file, package root            | Technical name | The index file of a product (`src/confluence/index.ts`, `src/jira/index.ts`), and `src/index.ts`, the source file of the only entry (`.`) in the `exports` field of `package.json`.                               | "entry point" (for these files)                 |

### The CLI

| Term                 | Category       | Meaning in this project                                                         | Do not use for this concept                 |
| -------------------- | -------------- | ------------------------------------------------------------------------------- | ------------------------------------------- |
| command              | Technical name | A command that you type in a shell, for example `atlas jira issues get PROJ-1`. | "invocation", "call"                        |
| CLI action           | Technical name | The last part of a CLI command, for example `get` in `atlas jira issues get`.   | "subcommand", "verb"                        |
| flag                 | Technical name | A command-line flag, for example `--token`.                                     | "option", "switch", "argument" (for a flag) |
| option               | Technical name | A property of `ClientConfig` or of the options object of a resource method.     | "setting", "flag" (for a property)          |
| environment variable | Technical name | A shell variable, for example `ATLASSIAN_API_TOKEN`.                            | "env var" in new prose                      |
| run                  | Technical verb | To start a command, a script, a test, or a CI job.                              | "invoke", "execute", "kick off"             |
| call                 | Technical verb | To use a function or a method in code.                                          | "invoke", or "call" for an HTTP request     |

### Development and release

| Term                            | Category       | Meaning in this project                                                                                                                                                                                                                         | Do not use for this concept                                     |
| ------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| spec                            | Technical name | An OpenAPI document that Atlassian publishes.                                                                                                                                                                                                   | "schema" (for the full document), "swagger"                     |
| snapshot                        | Technical name | A pinned copy of a spec in `spec/`.                                                                                                                                                                                                             | "fixture", "vendored copy"                                      |
| pin, re-pin                     | Technical verb | To save a copy of a spec and record its SHA-256 hash and contract fingerprint.                                                                                                                                                                  | "freeze", "lock"                                                |
| contract fingerprint            | Technical name | A hash of the parts of a spec that change the requests and the responses (paths and HTTP methods, parameters, request bodies, responses, schemas, and security metadata).                                                                       | "checksum" (for the fingerprint)                                |
| parity                          | Technical name | The rule that the CLI can call each public resource method and that the skill documents each CLI action. For a generator method that has `All` in its name, the CLI action of its base method (for example `list` for `listAll`) is sufficient. | "coverage" (for parity)                                         |
| test                            | Technical name | A Vitest test in `test/`.                                                                                                                                                                                                                       | "spec" (for a test)                                             |
| check                           | Technical name | A command or a CI job that passes or fails, for example `npm run codemap:check` or the `CI` check. A test or a command can check a value against an expected result.                                                                            | "check" as a verb for a person (write "make sure" or "examine") |
| gate                            | Technical name | A set of checks that must pass before the next step, for example `npm run validate`.                                                                                                                                                            | "barrier", "guard"                                              |
| fail, pass                      | Technical verb | The result of a check, a test, or a request.                                                                                                                                                                                                    | "break", "go red"                                               |
| GitHub Actions workflow         | Technical name | A workflow file in `.github/workflows/`, for example the `Publish` workflow. Write the workflow name if it is known.                                                                                                                            | "workflow" alone if a Jira workflow is also possible            |
| Jira workflow                   | Technical name | A workflow in Jira that controls the statuses and transitions of issues.                                                                                                                                                                        | "workflow" alone if a GitHub Actions workflow is also possible  |
| release                         | Technical name | A published version of the package, with its git tag and its GitHub release.                                                                                                                                                                    | "drop", "ship"                                                  |
| publish                         | Technical verb | To put a version of the package on the npm registry.                                                                                                                                                                                            | "release" (as a verb), "push" (to npm), "deploy"                |
| tag                             | Technical name | A git tag `vX.Y.Z`.                                                                                                                                                                                                                             | "label" (for a tag)                                             |
| commit, branch, pull request    | Technical name | The git and GitHub items. Use "PR" only after "pull request" occurs in the same section.                                                                                                                                                        | "change list", "merge request"                                  |
| merge                           | Technical verb | To add a pull request to `main`.                                                                                                                                                                                                                | "land", "ship"                                                  |
| generate                        | Technical verb | To make a file with a generator, for example `npm run codemap` or `generateTypes`.                                                                                                                                                              | "emit", "produce" (for a generated file)                        |
| finding                         | Technical name | One result of an audit or a review.                                                                                                                                                                                                             | "issue" (for a finding)                                         |
| issue                           | Technical name | A GitHub issue, or a Jira issue in the API documentation.                                                                                                                                                                                       | a problem in general (write "problem")                          |
| review                          | Technical name | The procedure in which a reviewer examines a pull request.                                                                                                                                                                                      | "audit" (for a pull request review)                             |
| compiler, compiler API          | Technical name | The TypeScript 7 compiler (`tsc`) and the compiler API that tools import from `typescript/unstable/`.                                                                                                                                           | "TS" in new prose                                               |
| type-check, format              | Technical verb | To find type errors with the TypeScript compiler, and to change the layout of files with Oxfmt.                                                                                                                                                 | "lint" (for these actions)                                      |
| test suite                      | Technical name | One of the two Vitest test groups: the TypeScript/V8 test suite and the API gap analyzer test suite.                                                                                                                                            | "test pack", "scenarios" (for the suite)                        |
| API gap analyzer                | Technical name | The Python script `scripts/api-gap-analysis.py`. It compares SDK routes with OpenAPI operations (`npm run api-coverage`).                                                                                                                       | "coverage tool"                                                 |
| static checks                   | Technical name | The checks of the gate that do not run tests (`npm run validate:quality`).                                                                                                                                                                      | "static half"                                                   |
| working tree                    | Technical name | The git working tree. Write "a working tree that has changes that you did not commit", not "dirty tree".                                                                                                                                        | "dirty tree", "checkout"                                        |
| release candidate               | Technical name | The state of `main` and the release pull request that you plan to publish.                                                                                                                                                                      | "candidate" alone                                               |
| last commit on `main`           | Approved word  | The newest commit of the `main` branch.                                                                                                                                                                                                         | "tip"                                                           |
| push, sign                      | Technical verb | To send commits or tags to a remote with `git push`, and to put a cryptographic signature on a tag or a commit.                                                                                                                                 | "upload" (for push)                                             |
| fix-forward                     | Technical name | A new patch release that corrects a problem in a published version.                                                                                                                                                                             | "republish", "hotfix in place"                                  |
| distribution tag                | Technical name | An npm dist-tag, for example `latest`, that points to a published version.                                                                                                                                                                      | "channel"                                                       |
| bypass list                     | Technical name | The list in a GitHub ruleset of the roles that do not have to obey the ruleset.                                                                                                                                                                 | "exemption list"                                                |
| `verify` job                    | Technical name | The job of the `Publish` workflow that installs the package from the public registry and examines it.                                                                                                                                           | "verification job"                                              |
| release record, migration notes | Technical name | The record of one release (commit SHA, checks URL, version, approval, results), and the instructions to users about breaking changes.                                                                                                           | "evidence" (for the record), "breaking-change guidance"         |
| revoke                          | Technical verb | To make a credential unusable. "Rotate" replaces the credential.                                                                                                                                                                                | "disable" (for a credential)                                    |
| monitor                         | Approved word  | To examine a thing again and again for a period of time, for example the npm registry or a live spec.                                                                                                                                           | "poll"                                                          |
| regression                      | Technical name | A problem that a new version causes in a function that operated correctly before.                                                                                                                                                               | "breakage"                                                      |
| runbook                         | Technical name | A procedure document, for example `docs/RELEASING.md`.                                                                                                                                                                                          | "playbook"                                                      |

### Exceptions

These words are not approved, but the project keeps them in the specified places:

| Word or text                                                                      | Cause                                                                                                                   |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Heading text, for example "Retry & Timeout"                                       | GitHub and npm make the anchors from the heading text. Links use these anchors.                                         |
| Bold labels at the start of a list item                                           | A label is a title (rule 8.6). Other documents refer to some labels.                                                    |
| Text that a test checks                                                           | The test is a contract. For example, `test/docs/` checks sentences in `SECURITY.md`.                                    |
| "Never" in `docs/RELEASING.md` release invariants                                 | A test checks these sentences. The STE alternative is "Do not".                                                         |
| Section names of other files, for example "Critical Invariants"                   | The names come from the other file.                                                                                     |
| Protocol values, for example `DELETE` and `REST`                                  | The values come from the protocol.                                                                                      |
| "token bucket" in the rate limiter text of `docs/ARCHITECTURE.md`                 | A test checks this text. Here "token" is the unit of the token-bucket algorithm, not an authentication token.           |
| "transient", "refuses", and "outside" in the retry text of `docs/ARCHITECTURE.md` | A test checks the lists of retryable and non-retryable conditions.                                                      |
| "Batching wins innermost of the auth and cache layers"                            | A test checks this sentence in `docs/ARCHITECTURE.md`.                                                                  |
| "so the write's own redirects cannot carry it" in `SECURITY.md`                   | A test checks this sentence and the line that contains it.                                                              |
| "after you change the workflow" and "Stop promotion" in `docs/RELEASING.md`       | The meaning is not clear in the original text, and the code does not resolve it. These phrases keep the original words. |

## Validation

Do these checks after you change a file in the scope of this guide:

1. Format the file: `npx oxfmt --write <file>`.
2. Run the documentation tests: `npx vitest run test/docs`.
3. Before you open a pull request, run the full gate: `npm run validate`.
4. Read each changed sentence again. Compare it with the sentence before your change. Examine the meaning, conditions, negation, numbers, and requirement strength.
5. Look up each general word that you added in the ASD-STE100 dictionary (Part 2). Use the approved meaning and the approved part of speech.

## Limits of the checks

- Oxfmt and the tests check the format and the text that tests pin. No check in this repository counts words or looks up words in the dictionary.
- The STE100 migration used scratch scripts that are not in this repository. The scripts counted the words in each sentence and found words that are not approved in the dictionary. A person or an agent examined each result.
- A script cannot find the part of speech or the meaning of a word (rules 1.2 and 1.3). A script also cannot find a changed meaning. Only a review can find these problems.
- A dictionary check does not make a file compliant. The exceptions in this guide and the files out of scope are not STE text.
