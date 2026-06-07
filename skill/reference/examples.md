# Examples (illustrative, parameters may need values from API probes)

```sh
# Confluence
atlas confluence pages list --space-id 123456 --limit 25
atlas confluence pages get 789012
atlas confluence pages create --space-id 123456 --title "Onboarding" --body "Welcome."
atlas confluence pages update 789012 --version-number 3 --title "Onboarding v2" --body "..."
atlas confluence spaces list --limit 25 --format minimal

# Jira
atlas jira issues get PROJ-123 --fields summary,status,assignee
atlas jira issues create --project PROJ --type Bug --summary "Login button broken"
atlas jira search --jql "project = PROJ AND status = Open" --max-results 25
atlas jira issues transitions PROJ-123
atlas jira issues transition PROJ-123 --transition-id 31

# Jira — add a comment to an issue (ADF body)
atlas jira issue-comments create PROJ-123 --body '{"body":{"type":"doc","version":1,"content":[{"type":"paragraph","content":[{"type":"text","text":"Looking into this."}]}]}}'

# Jira — get an issue's remote (issue) links
atlas jira issues list-remotelinks PROJ-123
atlas jira issues get-remotelink PROJ-123 10001

# Skill install
atlas install-skill --local
atlas install-skill --dry-run
atlas install-skill --force
```
