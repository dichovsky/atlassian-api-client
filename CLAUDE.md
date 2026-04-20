# CLAUDE.md

Repo guidance for Claude Code (claude.ai/code).

Goal: maximize correctness per token. Prefer short, verifiable steps over long plans.

## Operating Mode

- State assumptions before implementing.
- If intent is ambiguous, present options briefly; do not silently pick a risky interpretation.
- Implement the smallest change that fully solves the request.
- Do not add speculative abstractions, optional features, or impossible-path handling.
- Touch only requested scope. Match local style.
- If you see unrelated issues, mention them; do not refactor opportunistically.
- Convert vague tasks into verifiable outcomes.

## Required Workflow

1. Reproduce/understand.
2. Write or update failing test when applicable.
3. Implement minimal fix.
4. Run focused checks first, then broader checks if needed.
5. Summarize what changed + evidence (tests/commands).

## Fast Commands

```bash
# Focused
npx vitest run test/core/transport.test.ts

# Quality gates
npm run typecheck
npm run lint
npm test
npm run test:coverage

# Packaging/build
npm run build

# Full gate (must pass before finalizing broad changes)
npm run validate
```

## Architecture Snapshot

- Typed Node.js/TypeScript library + CLI for Confluence v2 and Jira v3.
- ESM package output in `dist/`; CLI binary is `atlas`.
- `src/core/*`: shared transport/auth/config/errors/pagination.
- `src/confluence/*`, `src/jira/*`: API clients + resources.
- `src/cli/*`: lightweight router/commands using `node:util.parseArgs`.

## Critical Invariants

- `ClientConfig.auth` is a discriminated union:
    - `{ type: 'basic', email, apiToken }`
    - `{ type: 'bearer', token }`
- Keep resource APIs stable; avoid breaking public method signatures unless requested.
- Prefer transport/middleware composition over resource-specific hacks.
- Preserve retry, timeout, and error taxonomy behavior in `core/errors.ts` and `core/transport.ts`.

## Testing Rules

- Tests mirror `src/` under `test/`.
- Coverage target is 100% (barrel/type exclusions handled by config).
- Prefer focused tests for the changed module first.
- For transport/pagination behavior, assert concrete request options and outputs.
- For regressions: add a test that fails pre-fix and passes post-fix.

## Common Patterns

- Transport is injectable (`config.transport`) for unit tests.
- Use `MockTransport` (`test/helpers/mock-transport.ts`) for deterministic API tests.
- Pagination:
    - Confluence: cursor-based (`paginateCursor`)
    - Jira: offset/search-based (`paginateOffset`, `paginateSearch`)
- CLI shape: `atlas <api> <resource> <action> [id] [--flags]`

## Response Format Expectations

- Keep updates concise and evidence-based.
- Include only relevant command/test outputs.
- Prefer file+symbol references over long prose.

## Mistake Logging (Token-Efficient)

When a mistake occurs, log one compact event:

```text
Ctx:
Err:
Cause:
Fix:
Rule:
```

Constraints:

- ~20-40 tokens total
- no filler
- deduplicate existing rules

Storage:

- Project-specific: local `.agent/memory`
- Generalizable: global memory
- If both: store both (distilled global rule)

Behavior:

- Check relevant past rules before acting.
- Apply preventive rules proactively.
- Repeating the same mistake is a critical failure.
