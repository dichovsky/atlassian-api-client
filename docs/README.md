# Documentation

Project documentation for `atlassian-api-client`.

## Living references

- [ARCHITECTURE.md](ARCHITECTURE.md) — system design: transport/auth/retry/error taxonomy, middleware composition, pagination, CLI shape. Kept current with the code.
- [ATLASSIAN-API-REFRESH-2026-08-30.md](ATLASSIAN-API-REFRESH-2026-08-30.md) — current live-spec refresh, implemented deltas, route coverage, and verification evidence.
- [RELEASING.md](RELEASING.md) — release-readiness gates, trusted publication, post-release checks, and rollback procedure.

## Other docs

- Backlog and history live at the repo root: [`BACKLOG.md`](../BACKLOG.md) (open work), [`BACKLOG-ARCHIVE.md`](../BACKLOG-ARCHIVE.md) (shipped).
- Pinned OpenAPI specs and how to re-pin: [`spec/README.md`](../spec/README.md).
- Bundled Claude Code skill: [`skill/SKILL.md`](../skill/SKILL.md) + `skill/reference/*.md`.

## Archive

Dated, point-in-time reports superseded by later work — kept for provenance, not current status. See [archive/](archive/):

- [API-GAP-ANALYSIS-2026-06-07.md](archive/API-GAP-ANALYSIS-2026-06-07.md) — coverage gap analysis (superseded by the June deep audit below).
- `BACKLOG-AUDIT.md` — 2026-05-23 backlog path snapshot.
- [DEEP-AUDIT-2026-06-10.md](archive/DEEP-AUDIT-2026-06-10.md) — full-repository audit whose findings have since been resolved or moved to the backlog.
