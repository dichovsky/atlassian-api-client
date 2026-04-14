# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Behavior

- State assumptions explicitly before implementing. If multiple interpretations exist, surface them — don't pick silently.
- Minimum code that solves the problem. No speculative features, abstractions for single-use code, or error handling for impossible scenarios.
- Touch only what the request requires. Match existing style. If you notice unrelated dead code, mention it — don't delete it.
- Transform tasks into verifiable goals: "Fix bug" → "Write a failing test, then make it pass."

## Commands

```bash
npm run build          # compile to dist/
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
npm test               # vitest run
npm run test:coverage  # vitest run --coverage (100% threshold)
npm run validate       # clean + build + typecheck + lint + coverage

# Single test file
npx vitest run test/core/transport.test.ts
```

## Architecture

Typed Node.js/TypeScript library + CLI for Confluence Cloud REST API v2 and Jira Cloud Platform REST API v3. ESM package with `dist/` output and `atlas` CLI binary.

```
src/
├── core/           # Shared infrastructure
│   ├── transport.ts     # HttpTransport: fetch + auth + retry + timeout + rate-limit
│   ├── auth.ts          # AuthProvider (basic / bearer)
│   ├── config.ts        # resolveConfig() — validates input, applies defaults
│   ├── errors.ts        # AtlassianError → HttpError → 401/403/404/429 subtypes
│   ├── pagination.ts    # paginateCursor (Confluence) / paginateOffset / paginateSearch (Jira)
│   └── types.ts         # Transport interface, ClientConfig, ApiResponse
├── confluence/     # ConfluenceClient; baseUrl = {baseUrl}/wiki/api/v2
│   └── resources/       # pages, spaces, blog-posts, comments, attachments, labels
├── jira/           # JiraClient; baseUrl = {baseUrl}/rest/api/3
│   └── resources/       # issues, projects, users, issue-types, priorities, statuses, search
└── cli/            # `atlas` binary — uses node:util parseArgs, no external framework
    └── commands/        # confluence.ts, jira.ts dispatch action → client call
```

## Key Design Decisions

**Injectable transport.** Both clients accept `config.transport?: Transport`. Tests inject `MockTransport` (`test/helpers/mock-transport.ts`) — no HTTP mocks needed.

**Async-generator pagination.** `listAll()` on every resource uses `paginateCursor` (Confluence, cursor-based) or `paginateOffset` (Jira, offset-based). `list()` returns the raw page for callers needing direct control.

**Auth.** `ClientConfig.auth` is a discriminated union: `{ type: 'basic', email, apiToken }` or `{ type: 'bearer', token }`.

**CLI shape:** `atlas <api> <resource> <action> [id] [--flags]`

## Test Conventions

- Tests mirror `src/` under `test/` (e.g. `test/core/transport.test.ts`).
- Coverage threshold is **100%**; `src/**/types.ts` and `src/**/index.ts` barrels are excluded.
- Use `MockTransport`: queue with `mock.respondWith(data)` / `mock.respondWithError(err)`, assert with `mock.lastCall.options`.
