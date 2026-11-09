# Jira — Search & JQL

> Part of the `atlas` Jira skill reference. Resource×action matrix and routing in [`../jira.md`](../jira.md).

## `search`

| Action                                        | Required flags | Optional flags                                                                                                                                                                |
| --------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `search` (default; aliases: omitted, `query`) | `--jql`        | `--next-page-token`, `--max-results`, `--fields`, `--expand`, `--properties`, `--fields-by-keys`, `--reconcile-issues`, `--fail-fast`, `--include-archived-projects`          |
| `legacy-post` (deprecated)                    | `--jql`        | `--start-at`, `--max-results`, `--fields`, `--expand`, `--validate-query`, `--properties`, `--fields-by-keys`                                                                 |
| `get` (deprecated)                            | `--jql`        | `--start-at`, `--max-results`, `--fields`, `--expand`, `--validate-query`, `--properties`, `--fields-by-keys`, `--fail-fast`                                                  |
| `approximate-count`                           | `--jql`        | —                                                                                                                                                                             |
| `jql-get`                                     | —              | `--jql`, `--next-page-token`, `--max-results`, `--fields`, `--expand`, `--properties`, `--fields-by-keys`, `--reconcile-issues`, `--fail-fast`, `--include-archived-projects` |
| `jql-post`                                    | —              | `--jql`, `--next-page-token`, `--max-results`, `--fields`, `--expand`, `--properties`, `--fields-by-keys`, `--reconcile-issues`, `--include-archived-projects`                |

```sh
atlas jira search --jql "project = PROJ AND status = Open"
atlas jira search search --jql "project = PROJ AND status = Open"
atlas jira search search --jql "project = PROJ AND status = Open" --expand names,changelog --properties release.owner --fields-by-keys --reconcile-issues 10001,10002 --fail-fast --include-archived-projects --next-page-token eyJvIjoyfQ==
atlas jira search approximate-count --jql "project = PROJ"
atlas jira search jql-get --jql "project = PROJ" --max-results 50 --properties release.owner --fields-by-keys --reconcile-issues 10001,10002 --fail-fast
atlas jira search jql-post --jql "project = PROJ AND assignee = currentUser()" --fields summary,status --expand names --properties release.owner --include-archived-projects
atlas jira search get --jql "project = PROJ" --start-at 50 --validate-query warn --fields summary,status --expand names --properties release.owner --fail-fast
atlas jira search legacy-post --jql "project = PROJ" --start-at 50 --validate-query strict --fields-by-keys --expand names,schema
```

- `search` (also selected when the action is omitted or written as `query`), `jql-get`, and `jql-post` use current `/search/jql` with cursor pagination. Pass the response `nextPageToken` through `--next-page-token` to continue. `--max-results` must be a positive integer. All three current actions reject legacy `--start-at` and `--validate-query`; use `search get` or `search legacy-post` only when migrating old offset-based automation.
- `--fields`, `--expand`, and `--properties` are comma-separated lists. `--fields-by-keys` tells Jira that entries in `--fields` are field keys instead of IDs.
- `--reconcile-issues` is a comma-separated list of positive integer issue IDs to reconcile before a current search (maximum 50 IDs). It is supported by `search`/omitted/`query`, `jql-get`, and `jql-post`.
- `--fail-fast` is a boolean switch supported by GET search (`search`/omitted/`query`, `jql-get`, and deprecated `get`); it asks Jira to fail on the first search error instead of returning partial results. The POST actions (`legacy-post`, `jql-post`) reject it.
- `--include-archived-projects` is a current `/search/jql` boolean switch for both GET and POST. It includes issues from archived projects; omit it for Jira's default (`false`). Legacy `get`, `legacy-post`, and `approximate-count` reject it.
- `legacy-post` and `get` are retained only for compatibility with legacy `POST /search` and `GET /search`, which Atlassian is removing. Do not use them in new automation. Their `--start-at` must be a non-negative integer, and `--validate-query` accepts exactly `strict`, `warn`, `none`, `true`, or `false`.

## `jql`

JQL query and precomputation API (B587–B596). Covers autocomplete, parse, sanitize, match, precomputation management, and personal data migration.

> **Experimental:** Atlassian marks `sanitize` and `invalid-jqls-access-log` `x-experimental`; their shapes may change without notice.

| Action                      | Positionals | Required flags          | Optional flags                                                           |
| --------------------------- | ----------- | ----------------------- | ------------------------------------------------------------------------ |
| `autocomplete-data`         | —           | —                       | —                                                                        |
| `autocomplete-data-post`    | —           | —                       | `--project-ids`, `--include-collapsed-fields`                            |
| `autocomplete-suggestions`  | —           | —                       | `--field-name`, `--field-value`, `--predicate-name`, `--predicate-value` |
| `get-precomputations`       | —           | —                       | `--function-key`, `--start-at`, `--max-results`, `--order-by`            |
| `update-precomputations`    | —           | `--values`              | `--skip-not-found`                                                       |
| `get-precomputations-by-id` | —           | —                       | `--precomputation-ids`, `--order-by`                                     |
| `match-issues`              | —           | `--issue-ids`, `--jqls` | —                                                                        |
| `parse`                     | —           | `--queries`             | `--validation`                                                           |
| `migrate-queries`           | —           | —                       | `--query-strings`                                                        |
| `sanitize`                  | —           | `--queries`             | —                                                                        |
| `invalid-jqls-access-log`   | —           | —                       | `--user-account-id`, `--next-page-token`, `--max-results`                |

**Notes:**

- `autocomplete-data` (B587): `GET /rest/api/3/jql/autocompletedata` — returns field names, function names, and reserved words for JQL autocompletion.
- `autocomplete-data-post` (B588): `POST /rest/api/3/jql/autocompletedata` — same as GET but lets you filter by `--project-ids` (CSV of int IDs) and include collapsed fields via `--include-collapsed-fields` (bare or `true` sends `true`, `false` sends `false`, omitted sends nothing).
- `autocomplete-suggestions` (B589): `GET /rest/api/3/jql/autocompletedata/suggestions` — every flag is optional and sent only when given. `--field-name` alone lists the field's values; add `--field-value` to match values containing that text; `--field-name` + `--predicate-name` (a `CHANGED` predicate: `by`, `from` or `to`) lists predicate values, narrowed by `--predicate-value`.
- **App-only precomputation actions:** `get-precomputations`, `update-precomputations` and `get-precomputations-by-id` serve the custom JQL functions of a Forge or Connect app: Jira accepts them only from that app, and an app sees only its own functions. A user API token (the default `basic` auth) is rejected; from the CLI they need `ATLASSIAN_AUTH_TYPE=bearer` with a token issued to the app.
- `get-precomputations` (B590): `GET /rest/api/3/jql/function/computation` — paginated list of app function precomputations. `--function-key` accepts a CSV of function keys (repeated `functionKey` params; Forge `ari:cloud:ecosystem::extension/<appId>/<envId>/static/<key>`, Connect `<appKey>__<moduleKey>`).
- `--order-by` on `get-precomputations` / `get-precomputations-by-id` is `functionKey`, `used`, `created` or `updated` (optionally `+`/`-` prefixed). Attach a value that starts with `-` with `=`: `--order-by=-updated` (`--order-by -updated` is a parse error).
- `update-precomputations` (B591): `POST /rest/api/3/jql/function/computation` — update precomputation values. `--values` is a JSON array of `{id, value?, error?}` objects. `--skip-not-found true|false` skips missing IDs instead of failing. Jira answers 204 when there is nothing to report; the CLI then prints `{"updated": true}`, otherwise the response body (`notFoundPrecomputationIDs`).
- `get-precomputations-by-id` (B592): `POST /rest/api/3/jql/function/computation/search` — fetch precomputations by `--precomputation-ids` (CSV of UUIDs).
- `match-issues` (B593): `POST /rest/api/3/jql/match` — check which issues match JQL queries. `--issue-ids` is a CSV of up to 50 integer IDs; `--jqls` is a JSON array of up to 10 query strings. Issues are matched only where you can browse them.
- `parse` (B594): `POST /rest/api/3/jql/parse` — parse JQL queries. `--queries` is a JSON array of query strings; `--validation` is `strict` (default: all errors, no structure on failure), `warn` (errors plus the structure if well formed) or `none`. Other values are refused before sending.
- `migrate-queries` (B595): `POST /rest/api/3/jql/pdcleaner` — convert user identifiers to account IDs in JQL. `--query-strings` is a JSON array of query strings.
- `sanitize` (B596): `POST /rest/api/3/jql/sanitize` — sanitize JQL queries. `--queries` is a JSON array of `{query, accountId?}` objects; without `accountId` (or with `null`) a query is sanitized for an anonymous user.
- The JSON-array flags are checked before sending: `--jqls`, `--queries` (parse) and `--query-strings` must hold only strings, and sanitize `--queries` only `{query: "<string>", accountId?: "<string>" | null}` objects.
- `invalid-jqls-access-log` (**experimental**, `x-experimental`): `GET /rest/api/3/invalid-jqls-access-log` — lists JQL searches Jira can no longer support, newest first, retained for three days. Use the entries to find the saved filters and the apps, automations, scripts or REST integrations that run them. Needs the **Administer Jira** global permission; returns 403 on the Free plan and 404 until invalid-JQL audit logging is enabled for the site.
  - `--user-account-id` restricts entries to one external account ID.
  - `--max-results` is 1-100 (server default 50); other values give HTTP 400.
  - `--next-page-token` takes the previous response's `nextPageToken` (token pagination; stop when `isLast` is true).
  - Returns `{ entries: [{ caller, createdAt, filterId, jql, requestUrl, user, userAgent, validationMessage }], isLast, nextPageToken, nextPageURL }`.

```sh
# Get JQL autocomplete data (GET) — B587
atlas jira jql autocomplete-data

# Get autocomplete data filtered by project — B588
atlas jira jql autocomplete-data-post --project-ids 10001,10002

# Include collapsed custom fields — B588
atlas jira jql autocomplete-data-post --include-collapsed-fields

# Get field value suggestions — B589
atlas jira jql autocomplete-suggestions --field-name status
atlas jira jql autocomplete-suggestions --field-name reporter --field-value adm

# Get predicate value suggestions — B589
atlas jira jql autocomplete-suggestions --field-name status --predicate-name by --predicate-value adm

# Get app function precomputations (app-only) — B590
atlas jira jql get-precomputations --max-results 50 --order-by=-updated

# Get precomputations for specific function key — B590
atlas jira jql get-precomputations --function-key 'ari:cloud:ecosystem::extension/app/env/static/myFn' --start-at 0 --max-results 25

# Update precomputation values (app-only) — B591
atlas jira jql update-precomputations --values '[{"id":"f2ef228b-367f-4c6b-bd9d-0d0e96b5bd7b","value":"issue in (TEST-1, TEST-2)"}]' --skip-not-found true

# Fetch precomputations by ID (app-only) — B592
atlas jira jql get-precomputations-by-id --precomputation-ids 'f2ef228b-367f-4c6b-bd9d-0d0e96b5bd7b,2a854f11-d0e1-4260-aea8-64a562a7062a' --order-by created

# Check which issues match JQL queries — B593
atlas jira jql match-issues --issue-ids 10001,10002,10003 --jqls '["project = FOO","issuetype = Bug"]'

# Parse JQL queries — B594
atlas jira jql parse --queries '["project = TEST AND status = Open"]' --validation strict

# Migrate user identifiers to account IDs — B595
atlas jira jql migrate-queries --query-strings '["assignee = mia","reporter = alana"]'

# Sanitize JQL queries — B596
atlas jira jql sanitize --queries '[{"query":"project = TEST AND assignee = currentUser()","accountId":"612345:abc"}]'

# List invalid JQL searches (experimental), then fetch the next page
atlas jira jql invalid-jqls-access-log --max-results 100
atlas jira jql invalid-jqls-access-log --user-account-id 5b10ac8d82e05b22cc7d4ef5 --next-page-token '<nextPageToken>'
```
