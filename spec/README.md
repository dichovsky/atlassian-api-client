# Confluence v2 OpenAPI Spec Snapshot

This directory pins the upstream Atlassian Confluence v2 OpenAPI document and
the artifacts derived from it.

## Files

| File | Purpose |
| --- | --- |
| `confluence-v2.v1.8494.0.openapi.json` | Versioned snapshot of the spec at `_v=1.8494.0`. |
| `confluence-v2.openapi.json` | Stable alias used by audit + codegen scripts. Currently a copy of the versioned file. |
| `confluence-v2.openapi.json.sha256` | SHA-256 of the alias content. Used by CI drift detection. |
| `coverage-matrix.md` | Auto-generated matrix of spec operations vs client implementation (B022). |
| `audit/<resource>.md` | Auto-generated per-resource conformance report (B023). |

## Source

```
https://dac-static.atlassian.com/cloud/confluence/openapi-v2.v3.json?_v=1.8494.0
```

The download is normalized with deep-sorted JSON keys so the committed file is
byte-stable across refreshes.

## Refresh workflow

1. Refresh the spec snapshot:

   ```sh
   npm run audit:refresh
   ```

   This re-downloads, re-normalizes, writes the `.sha256`, and prints a diff
   summary. Use `-- --url <override>` to fetch from a mirror.

2. Regenerate the coverage matrix + per-resource reports:

   ```sh
   npm run audit:spec
   ```

3. Regenerate the codegen response types (B060):

   ```sh
   npm run codegen:confluence
   ```

4. Review the diffs, then commit the spec + derived artifacts together.

## CI drift detection

The `npm run validate` script runs:

- `npm run audit:spec -- --check` — fails if `coverage-matrix.md` or
  `audit/<resource>.md` differ from the regenerated output.
- A codegen drift check — fails if `src/confluence/types/generated.ts` would
  change when regenerated from the pinned spec.

This guarantees the spec snapshot, audit reports, and generated types stay in
lockstep.

## Pinning a new spec version

When Atlassian publishes a new `_v=` token:

1. Update `SPEC_URL` in `scripts/audit/refresh-spec.mjs` and the path
   `confluence-v2.v<new>.openapi.json` (rename the versioned file).
2. Run `npm run audit:refresh && npm run audit:spec && npm run codegen:confluence`.
3. Review the matrix diff to identify spec additions/removals/changes; create
   backlog items for any new operations.
