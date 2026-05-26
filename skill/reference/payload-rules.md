# Payload minimization rules

## Output policy

- Default to the smallest payload that answers the user.
- Prefer IDs/keys/names over full objects.
- Use `--format minimal` when downstream steps only need identifiers.

## Request policy

- Use strict filters (`--fields`, narrow JQL, resource IDs).
- Use explicit limits (`--limit`, `--max-results`).
- Continue pagination only when user asks for more.

## Data-shaping policy

- Truncate long text in summaries; keep source ID for retrieval.
- Avoid repeating unchanged context between steps.
- For structured specs in agent messages, prefer YAML over verbose JSON when the receiving parser accepts both.

## Escalation

Use TypeScript SDK for:

- bulk orchestration,
- unsupported CLI update fields,
- custom transport/middleware,
- programmatic pagination loops.
