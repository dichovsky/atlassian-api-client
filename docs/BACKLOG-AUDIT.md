# BACKLOG Path Audit — 2026-05-23

## Summary
- **Total unique paths referenced in BACKLOG:** 178
- **OK (file exists):** 34
- **PLURAL_MISMATCH:** 2 (webhook.ts vs webhooks.ts, issuetype.ts vs issue-types.ts)
- **TRULY_MISSING (planned resources):** 142

## Findings

### Critical Insight
BACKLOG.md references 178 distinct Jira resource files, but only 22 actual source files + 22 test files exist in the repo (44 total). This reflects the **planned API coverage roadmap** — BACKLOG is aspirational, not reflective of current state.

### PLURAL_MISMATCH (Update BACKLOG)
| BACKLOG path | Actual file | Issue |
|---|---|---|
| src/jira/resources/webhook.ts | src/jira/resources/webhooks.ts | Singular vs plural |
| src/jira/resources/issuetype.ts | src/jira/resources/issue-types.ts | Singular + hyphenation |

### Key Missing Resources (Sample of 142)
These files are referenced in BACKLOG but don't yet exist:
- src/jira/resources/addons.ts
- src/jira/resources/announcementbanner.ts
- src/jira/resources/app.ts
- src/jira/resources/application-properties.ts
- src/jira/resources/applicationrole.ts
- src/jira/resources/auditing.ts
- ...and 136 more planned resources

## Recommendation

1. **Fix 2 PLURAL_MISMATCH entries:** Update BACKLOG.md lines referencing `webhook.ts` and `issuetype.ts` to match actual filenames.
2. **Keep TRULY_MISSING as-is:** These represent planned future coverage. As resources are implemented, files will be created and BACKLOG tasks will reference correct paths.
3. **No urgent action required:** BACKLOG is functioning as intended—a comprehensive roadmap of Jira API v3 endpoints awaiting implementation.
