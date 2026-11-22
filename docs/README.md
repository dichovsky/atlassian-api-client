# Documentation

This directory contains the project documentation for `atlassian-api-client`.

## Living references

- [ARCHITECTURE.md](ARCHITECTURE.md) — the system architecture: transport, auth, retry, error taxonomy, middleware composition, pagination, and the CLI shape. The maintainers update this file when the code changes.
- [`spec/README.md`](../spec/README.md) and the 5.0.0 entry in [`CHANGELOG.md`](../CHANGELOG.md) — the pinned OpenAPI snapshots (SHA-256, contract fingerprints, path and operation counts), the procedure to re-pin them, and the API refresh deltas of 2026-11.
- [RELEASING.md](RELEASING.md) — the release-readiness gates, trusted publication, post-release checks, and the rollback procedure.

## Release records

- [releases/v5.0.0.md](releases/v5.0.0.md) — the 5.0.0 release record: baseline, candidate, checks, release controls, runbook audit, and gates. Two related files give the full [API–CLI–skill parity matrix](releases/v5.0.0-parity-matrix.md) and the [findings ledger](releases/v5.0.0-findings.md).

## Other docs

- [ATLASSIAN-API-REFRESH-2026-08-30.md](ATLASSIAN-API-REFRESH-2026-08-30.md) — the historical 4.0.0 live-spec refresh report. The 2026-11-08 re-pin replaces its spec hashes and counts (see `spec/README.md`).
- The backlog and its history are in the repository root: [`BACKLOG.md`](../BACKLOG.md) (open work) and [`BACKLOG-ARCHIVE.md`](../BACKLOG-ARCHIVE.md) (shipped work).
- The bundled Claude Code skill: [`skill/SKILL.md`](../skill/SKILL.md) and `skill/reference/**/*.md` (`confluence.md`, the `jira.md` index, and the `jira/<domain>.md` file for each domain).

## Archive

These dated reports show the status at one point in time. Subsequent work replaced them. The project keeps them as historical records, not as the status of the project today. Refer to [archive/](archive/):

- [API-GAP-ANALYSIS-2026-06-07.md](archive/API-GAP-ANALYSIS-2026-06-07.md) — the analysis of missing API coverage (the June deep audit in this list replaced it).
- [BACKLOG-AUDIT.md](archive/BACKLOG-AUDIT.md) — a snapshot of the backlog paths on 2026-05-23.
- [DEEP-AUDIT-2026-06-10.md](archive/DEEP-AUDIT-2026-06-10.md) — the full-repository audit. After the audit, the project resolved each of its findings or moved the finding to the backlog.
