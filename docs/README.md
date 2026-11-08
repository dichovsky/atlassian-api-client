# Documentation

Project documentation for `atlassian-api-client`.

## Living references

- [ARCHITECTURE.md](ARCHITECTURE.md) — system design: transport/auth/retry/error taxonomy, middleware composition, pagination, CLI shape. Kept current with the code.
- [`spec/README.md`](../spec/README.md) and the 4.1.0 entry in [`CHANGELOG.md`](../CHANGELOG.md) — the current pinned OpenAPI snapshots (SHA-256, contract fingerprints, path and operation counts), how to re-pin them, and the 2026-11 API refresh deltas.
- [RELEASING.md](RELEASING.md) — release-readiness gates, trusted publication, post-release checks, and rollback procedure.

## Other docs

- [ATLASSIAN-API-REFRESH-2026-08-30.md](ATLASSIAN-API-REFRESH-2026-08-30.md) — historical 4.0.0 live-spec refresh report (its spec hashes and counts are superseded by the 2026-11-08 re-pin; see `spec/README.md`).
- Backlog and history live at the repo root: [`BACKLOG.md`](../BACKLOG.md) (open work), [`BACKLOG-ARCHIVE.md`](../BACKLOG-ARCHIVE.md) (shipped).
- Bundled Claude Code skill: [`skill/SKILL.md`](../skill/SKILL.md) + `skill/reference/**/*.md` (`confluence.md`, the `jira.md` index, and `jira/<domain>.md` detail files).

## Archive

Dated, point-in-time reports superseded by later work — kept for provenance, not current status. See [archive/](archive/):

- [API-GAP-ANALYSIS-2026-06-07.md](archive/API-GAP-ANALYSIS-2026-06-07.md) — coverage gap analysis (superseded by the June deep audit below).
- [BACKLOG-AUDIT.md](archive/BACKLOG-AUDIT.md) — 2026-05-23 backlog path snapshot.
- [DEEP-AUDIT-2026-06-10.md](archive/DEEP-AUDIT-2026-06-10.md) — full-repository audit whose findings have since been resolved or moved to the backlog.
