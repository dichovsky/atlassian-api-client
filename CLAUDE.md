# CLAUDE.md

Repo guidance. Goal: correctness per token. Prefer short, verifiable steps.

## Operating Mode

- If intent is ambiguous, present options briefly; don't silently pick a risky path.
- Convert vague tasks into verifiable outcomes.

## Required Workflow

1. Reproduce/understand.
2. Write or update failing test when applicable.
3. Implement minimal fix.
4. Run focused checks first, then broader if needed.
5. Summarize what changed + evidence (tests/commands).
6. Before merging any PR: spawn an independent reviewer agent (Opus, fresh lineage, NOT the implementer). Resolve blocking findings before merge; address important findings unless risky/unjustified. Wave 8 (2026-05-30) caught 2 blocking spec-shape bugs in 4 PRs this way — gate is load-bearing. When a PR touches `src/*/resources/*`, `src/cli/commands/*`, or `skill/`, the reviewer verifies CLI/skill parity: (a) new/changed resource methods are CLI-reachable; (b) new/changed CLI actions are skill-documented to the construct-from-skill bar; (c) no orphan CLI actions or skill commands.

## Fast Commands

```bash
npx vitest run test/core/transport.test.ts   # focused
npm run typecheck && npm run lint && npm test
npm run validate                              # full gate — run before broad changes
```

## Architecture Snapshot

- TypeScript library + CLI for Confluence v2 and Jira v3. ESM output in `dist/`; CLI binary is `atlas`.
- `src/core/*`: transport/auth/config/errors/pagination.
- `src/confluence/*`, `src/jira/*`: API clients + resources.
- `src/cli/*`: router/commands via `node:util.parseArgs`.
- `skill/*`: bundled Claude Code skill `atlassian-api-client-cli`; installed via `atlas install-skill` (`--local` for project-scoped). Version is injected from `package.json` at install time.

## Critical Invariants

- `ClientConfig.auth` discriminated union: `{ type:'basic', email, apiToken }` | `{ type:'bearer', token }`.
- Keep resource APIs stable; avoid breaking public method signatures unless asked.
- Prefer transport/middleware composition over resource-specific hacks.
- Preserve retry, timeout, and error taxonomy in `core/errors.ts` and `core/transport.ts`.
- **CLI/skill parity (hard rule, no exceptions):** every public method in `src/{confluence,jira}/resources/*.ts` is functionally reachable via the `atlas` CLI (complex bodies via JSON-valued flags, e.g. `--fields '{...}'`), and every CLI action is documented in `skill/reference/*.md` well enough to construct the command from the skill alone. Bidirectional — no orphan CLI action (must back a resource method) or skill command (must back a CLI action). Functional, not 1:1: `*All` generators are covered by their base `list`/`search`.

## Testing Rules

- Tests mirror `src/` under `test/`. Coverage target: 100%.
- Prefer focused tests for the changed module first.
- Assert concrete request options/outputs for transport and pagination behavior.
- Regressions: test must fail pre-fix, pass post-fix.

## Common Patterns

- Transport is injectable (`config.transport`) for unit tests.
- Use `MockTransport` (`test/helpers/mock-transport.ts`) for deterministic API tests.
- Pagination: Confluence → `paginateCursor`; Jira → `paginateOffset` / `paginateSearch`.
- CLI shape: `atlas <api> <resource> <action> [id] [--flags]`.

## Mistake Logging

Log one compact event per mistake (20-40 tokens, no filler):

```text
Ctx:
Err:
Cause:
Fix:
Rule:
```

Store project-specific mistakes in `.claude/memory`; generalizable rules in global memory.
