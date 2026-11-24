# Documentation

This directory contains documentation for `atlassian-api-client`. This file also gives links to related files in other directories.

## Living references

- [ARCHITECTURE.md](ARCHITECTURE.md) — the system architecture: transport, authentication, retry, error taxonomy, middleware composition, pagination, and the CLI shape. The maintainer updates this file when the code changes.
- [`spec/README.md`](../spec/README.md) and the 5.0.0 section of [`CHANGELOG.md`](../CHANGELOG.md) — the pinned OpenAPI snapshots (SHA-256, contract fingerprints, path and operation counts), the procedure to re-pin them, and the API changes of the 2026-11 re-pin.
- [RELEASING.md](RELEASING.md) — the release-readiness gates, trusted publication, post-release checks, and the rollback procedure.
- [WRITING.md](WRITING.md) — the writing guide: the ASD-STE100 rules, the terminology table, and the exceptions for the project documentation.

## Release records

- [releases/v5.0.0.md](releases/v5.0.0.md) — the 5.0.0 release record: baseline, candidate, checks, release controls, runbook audit, and gates. Two related files give the full [API–CLI–skill parity matrix](releases/v5.0.0-parity-matrix.md) and the [findings ledger](releases/v5.0.0-findings.md).

## Other docs

- [ATLASSIAN-API-REFRESH-2026-08-30.md](ATLASSIAN-API-REFRESH-2026-08-30.md) — the historical report of the 4.0.0 re-pin from the live specs. On 2026-11-08, the maintainer updated the Jira Platform v3 and Confluence v2 snapshots. The Jira Software snapshot of August did not change. Refer to the [current spec pins](../spec/README.md).
- The backlog and its history are in the repository root: [`BACKLOG.md`](../BACKLOG.md) (work that is not complete) and [`BACKLOG-ARCHIVE.md`](../BACKLOG-ARCHIVE.md) (completed work).
- The bundled Claude Code skill: [`skill/SKILL.md`](../skill/SKILL.md) and `skill/reference/**/*.md` (`confluence.md`, the `jira.md` index, and the `jira/<domain>.md` file for each domain).

## Archive

These dated reports show the status at one point in time. Subsequent work replaced them. The maintainer keeps them as historical reports, not as the status of the project at this time. Refer to [archive/](archive/):

- [API-GAP-ANALYSIS-2026-06-07.md](archive/API-GAP-ANALYSIS-2026-06-07.md) — the analysis of missing API coverage (the June deep audit in this list replaced it).
- [BACKLOG-AUDIT.md](archive/BACKLOG-AUDIT.md) — the audit of the file paths in the backlog on 2026-05-23.
- [DEEP-AUDIT-2026-06-10.md](archive/DEEP-AUDIT-2026-06-10.md) — the full-repository audit. After the audit, the maintainer resolved each of its findings or moved the finding to the backlog.
