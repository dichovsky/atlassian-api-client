# BACKLOG

> **Agent Rules:** Keep descriptions brief. When a task is completed, REMOVE it from here and APPEND it to BACKLOG-ARCHIVE.md.

## 📝 Docs

- [ ] 🔴 📝 Docs: B001 JSDoc public exports
  - files: `src/index.ts`, `src/core/index.ts`, referenced public type files
  - deps: none

## ⚙️ Core

- [ ] 🔴 ♻️ Core: B025 OpenAPI $ref injection hardening
  - files: `src/core/openapi.ts`, `test/core/openapi.test.ts`
  - deps: none
- [ ] 🟡 📦 Core: B010 Circuit breaker per `baseUrl`
  - files: `src/core/circuit-breaker.ts`, `src/core/config.ts`, `src/core/transport.ts`, `test/core/circuit-breaker.test.ts`
  - deps: B006 archived
- [ ] 🟡 📦 Core: B011 X-Request-Id propagation
  - files: `src/core/types.ts`, `src/core/transport.ts`, `src/core/errors.ts`, `test/core/transport.test.ts`
  - deps: B006 archived
- [ ] 🟡 📦 Core: B015 RS256 Connect JWT
  - files: `src/core/connect-jwt.ts`, `src/core/index.ts`
  - deps: none
- [ ] 🟡 ♻️ Core: B028 OAuth error-body redaction hardening
  - files: `src/core/oauth.ts`, `test/core/oauth.test.ts`
  - deps: none
- [ ] 🟡 ♻️ Core: B035 Expand log-path credential redaction
  - files: `src/core/request.ts`, `test/core/request.test.ts`
  - deps: none
- [ ] 🟢 📦 Core: B017 Proactive rate-limit (token bucket)
  - files: `src/core/rate-limiter.ts`, `src/core/config.ts`, `src/core/transport.ts`, `test/core/rate-limiter.test.ts`
  - deps: B010

## 🧩 Confluence

- [ ] 🔴 ♻️ Confluence: B007 Split types by domain
  - files: `src/confluence/types/*`, `src/confluence/index.ts`
  - deps: B006 archived

## 🧩 Jira

- [ ] 🔴 ♻️ Jira: B008 Split types by domain
  - files: `src/jira/types/*`, `src/jira/index.ts`
  - deps: B007

## 🖥️ CLI

- [ ] 🟡 🐛 CLI: B031 Real version from `package.json`
  - files: `src/cli/index.ts`, `src/cli/commands/install-skill.ts`, `test/cli/version.test.ts`
  - deps: none
- [ ] 🟢 📦 CLI: B019 `atlas scopes validate` command
  - files: `src/cli/commands/scopes.ts`, `src/cli/router.ts`, `src/core/scopes.ts`
  - deps: none

## 🧪 QA

- [ ] 🔴 🧪 QA: B012 Mock-server transport tests
  - files: `test/mock-server/*`
  - deps: B006 archived
- [ ] 🔴 🧪 QA: B013 CLI E2E tests
  - files: `test/e2e/cli.test.ts`, `test/e2e/helpers/*`
  - deps: none
- [ ] 🟡 🧪 QA: B014 Property-based tests
  - files: `test/property/*`
  - deps: B006 archived

## 🤖 Infra

- [ ] 🟡 📦 Infra: B018 OpenAPI type regeneration in CI
  - files: `scripts/regenerate-types.ts`, `.github/workflows/*`, `package.json`, `README.md`
  - deps: none
