# Jira — Search & JQL

> Part of the `atlas` Jira skill reference. Resource×action matrix and routing in [`../jira.md`](../jira.md).

## `search`

| Action              | Required flags | Optional flags                                                        |
| ------------------- | -------------- | --------------------------------------------------------------------- |
| `(default)` / `get` | `--jql`        | `--max-results`, `--fields`                                           |
| `approximate-count` | `--jql`        | —                                                                     |
| `jql-get`           | —              | `--jql`, `--next-page-token`, `--max-results`, `--fields`, `--expand` |
| `jql-post`          | —              | `--jql`, `--next-page-token`, `--max-results`, `--fields`, `--expand` |

```sh
atlas jira search get --jql "project = PROJ AND status = Open"
atlas jira search approximate-count --jql "project = PROJ"
atlas jira search jql-get --jql "project = PROJ" --max-results 50
atlas jira search jql-post --jql "project = PROJ AND assignee = currentUser()"
```

- `(default)` and `get` use offset-based pagination (`startAt` / `maxResults`) — `POST /search` and `GET /search` respectively.
- `jql-get` / `jql-post` use cursor-based pagination via `--next-page-token`; pass the `nextPageToken` from the previous response to continue.

## `jql`

JQL query and precomputation API (B587–B596). Covers autocomplete, parse, sanitize, match, precomputation management, and personal data migration.

| Action                      | Positionals | Required flags          | Optional flags                                                |
| --------------------------- | ----------- | ----------------------- | ------------------------------------------------------------- |
| `autocomplete-data`         | —           | —                       | —                                                             |
| `autocomplete-data-post`    | —           | —                       | `--project-ids`, `--include-collapsed-fields`                 |
| `autocomplete-suggestions`  | —           | `--field-name`          | `--field-value`, `--predicate-name`, `--predicate-value`      |
| `get-precomputations`       | —           | —                       | `--function-key`, `--start-at`, `--max-results`, `--order-by` |
| `update-precomputations`    | —           | `--values`              | `--skip-not-found`                                            |
| `get-precomputations-by-id` | —           | —                       | `--precomputation-ids`, `--order-by`                          |
| `match-issues`              | —           | `--issue-ids`, `--jqls` | —                                                             |
| `parse`                     | —           | `--queries`             | `--validation`                                                |
| `migrate-queries`           | —           | —                       | `--query-strings`                                             |
| `sanitize`                  | —           | `--queries`             | —                                                             |

**Notes:**

- `autocomplete-data` (B587): `GET /rest/api/3/jql/autocompletedata` — returns field names, function names, and reserved words for JQL autocompletion.
- `autocomplete-data-post` (B588): `POST /rest/api/3/jql/autocompletedata` — same as GET but lets you filter by `--project-ids` (CSV of int IDs) and include collapsed fields via `--include-collapsed-fields`.
- `autocomplete-suggestions` (B589): `GET /rest/api/3/jql/autocompletedata/suggestions` — field value suggestions for a given `--field-name`.
- `get-precomputations` (B590): `GET /rest/api/3/jql/function/computation` — paginated list of app function precomputations. `--function-key` accepts a CSV of function key strings.
- `update-precomputations` (B591): `POST /rest/api/3/jql/function/computation` — update precomputation values. `--values` is a JSON array of `{id, value?, error?}` objects. `--skip-not-found` skips missing IDs instead of failing.
- `get-precomputations-by-id` (B592): `POST /rest/api/3/jql/function/computation/search` — fetch precomputations by `--precomputation-ids` (CSV of UUIDs).
- `match-issues` (B593): `POST /rest/api/3/jql/match` — check which issues match JQL queries. `--issue-ids` is a CSV of integer IDs; `--jqls` is a JSON array of query strings.
- `parse` (B594): `POST /rest/api/3/jql/parse` — parse JQL queries. `--queries` is a JSON array of query strings; `--validation` is `strict`, `warn`, or `none`.
- `migrate-queries` (B595): `POST /rest/api/3/jql/pdcleaner` — convert user identifiers to account IDs in JQL. `--query-strings` is a JSON array of query strings.
- `sanitize` (B596): `POST /rest/api/3/jql/sanitize` — sanitize JQL queries. `--queries` is a JSON array of `{query, accountId?}` objects.

```sh
# Get JQL autocomplete data (GET) — B587
atlas jira jql autocomplete-data

# Get autocomplete data filtered by project — B588
atlas jira jql autocomplete-data-post --project-ids 10001,10002

# Include collapsed custom fields — B588
atlas jira jql autocomplete-data-post --include-collapsed-fields

# Get field value suggestions — B589
atlas jira jql autocomplete-suggestions --field-name status

# Get app function precomputations — B590
atlas jira jql get-precomputations --max-results 50

# Get precomputations for specific function key — B590
atlas jira jql get-precomputations --function-key 'ari:cloud:ecosystem::extension/app/env/static/myFn'

# Update precomputation values — B591
atlas jira jql update-precomputations --values '[{"id":"f2ef228b-367f-4c6b-bd9d-0d0e96b5bd7b","value":"issue in (TEST-1, TEST-2)"}]'

# Fetch precomputations by ID — B592
atlas jira jql get-precomputations-by-id --precomputation-ids 'f2ef228b-367f-4c6b-bd9d-0d0e96b5bd7b,2a854f11-d0e1-4260-aea8-64a562a7062a'

# Check which issues match JQL queries — B593
atlas jira jql match-issues --issue-ids 10001,10002,10003 --jqls '["project = FOO","issuetype = Bug"]'

# Parse JQL queries — B594
atlas jira jql parse --queries '["project = TEST AND status = Open"]' --validation strict

# Migrate user identifiers to account IDs — B595
atlas jira jql migrate-queries --query-strings '["assignee = mia","reporter = alana"]'

# Sanitize JQL queries — B596
atlas jira jql sanitize --queries '[{"query":"project = TEST AND assignee = currentUser()","accountId":"612345:abc"}]'
```
