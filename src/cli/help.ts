const GLOBAL_HELP = `atlas - Atlassian Cloud API CLI

USAGE:
  atlas <api> <resource> <action> [args] [options]
  atlas install-skill [--local|--path <dir>] [--print|--dry-run|--force]

APIs:
  confluence       Confluence Cloud REST API v2
  jira             Jira Cloud Platform REST API v3

UTILITIES:
  install-skill    Install the bundled Claude Code skill (for coding agents)

GLOBAL OPTIONS:
  --base-url, -u   Atlassian instance URL (or ATLASSIAN_BASE_URL)
  --auth-type      Auth scheme: basic (default) or bearer (or ATLASSIAN_AUTH_TYPE)
  --email, -e      Email for basic auth (or ATLASSIAN_EMAIL); not used for bearer
  --token, -t      API token (basic) or bearer token (or ATLASSIAN_API_TOKEN)
  --format, -f     Output format: json (default), table, minimal
  --allowed-hosts  Comma-separated list of allowed hostnames for self-hosted
                   or proxied deployments (or ATLASSIAN_ALLOWED_HOSTS). When
                   omitted, only the default Atlassian suffix allowlist
                   applies: *.atlassian.net, *.atlassian.com, *.jira-dev.com,
                   *.jira.com. Entries are bare hostnames (no port).
  --help, -h       Show help
  --version        Show version

EXAMPLES:
  atlas confluence pages list --base-url https://myco.atlassian.net -e user@co.com -t TOKEN
  atlas jira issues get PROJ-123 --auth-type bearer --token OAUTH_TOKEN
  atlas jira search --jql "project = PROJ"
  atlas confluence spaces list --base-url https://jira.internal.example --allowed-hosts jira.internal.example
  atlas install-skill --local
`;

const INSTALL_SKILL_HELP = `atlas install-skill - Install the bundled Claude Code skill

USAGE:
  atlas install-skill [options]

NOTES:
  install-skill is an options-only command; run it as: atlas install-skill [options]

OPTIONS:
  --local          Install into <cwd>/.claude/skills/ instead of ~/.claude/skills/
  --path <dir>     Install into a custom directory (overrides --local)
  --force          Overwrite an existing install of a different version
  --dry-run        List files that would be copied; do not write
  --print          Print the bundled source directory and exit

DEFAULT TARGET:
  ~/.claude/skills/atlassian-api-client-cli

EXIT CODES:
  0   success (copied, noop-same-version, printed, or dry-run)
  1   generic failure
  2   target exists with a different version (rerun with --force)
  3   permission denied writing to target
`;

const CONFLUENCE_HELP = `atlas confluence - Confluence Cloud REST API v2

RESOURCES:
  pages                  list, get, create, update, delete
  spaces                 list, get
  blog-posts             list, get, create, update, delete
  comments               list, get, create, delete, list-properties, create-property, get-property, update-property, delete-property
  attachments            list, get, delete
  labels                 list, list-all, attachments, blog-posts, pages
  admin-key              get, create, delete
  app                    list-properties, get-property, upsert-property, delete-property
  classification-levels  list
  content                convert-ids-to-types
  data-policies          get-metadata, list-spaces
  databases              create, get, delete, ancestors, descendants, direct-children, operations, get-classification-level, update-classification-level, reset-classification-level, list-properties, create-property, get-property, update-property, delete-property
  space-permissions      list
  space-role-mode        get
  tasks                  list, get, update
  users                  check-access-by-email, invite-by-email
  users-bulk             lookup

EXAMPLES:
  atlas confluence pages list --space-id 123
  atlas confluence pages get 456
  atlas confluence spaces list
  atlas confluence app list-properties --limit 25
  atlas confluence app upsert-property my-flag --value '{"beta":true}'
  atlas confluence comments list-properties 77777
  atlas confluence comments create-property 77777 --key reviewed --value true
  atlas confluence comments update-property 77777 --property-id prop-1 --key reviewed --value false --version-number 2
  atlas confluence classification-levels list
  atlas confluence content convert-ids-to-types --ids 12345,67890
  atlas confluence data-policies get-metadata
  atlas confluence data-policies list-spaces --keys ENG,OPS --limit 50
  atlas confluence databases create --space-id 123 --title "Inventory" --private
  atlas confluence databases get 456 --include-properties
  atlas confluence databases descendants 456 --depth 3 --limit 50
  atlas confluence databases list-properties 456
  atlas confluence databases update-classification-level 456 --level-id cl-1
  atlas confluence space-permissions list --limit 25
  atlas confluence space-role-mode get
  atlas confluence tasks list --status incomplete --limit 25
  atlas confluence tasks update task-1 --status complete
  atlas confluence users check-access-by-email --emails a@example.com,b@example.com
  atlas confluence users invite-by-email --emails a@example.com,b@example.com
  atlas confluence users-bulk lookup --account-ids acc-1,acc-2
  atlas confluence labels list-all --prefix global --limit 50
  atlas confluence labels attachments 12345 --sort -created-date
  atlas confluence labels blog-posts 12345 --space-id 100,200 --limit 25
  atlas confluence labels pages 12345 --sort -modified-date
`;

const JIRA_HELP = `atlas jira - Jira Cloud Platform REST API v3

RESOURCES:
  issues        get, create, update, delete, transition, transitions, get-agile, get-estimation, set-estimation, rank
  projects      list, get
  search        search (via JQL)
  users         get, me, search
  issue-types   list, get
  priorities    list, get
  statuses      list
  boards        list-sprints, sprint-issues, list-properties, delete-property, get-property, set-property, list-quickfilters, get-quickfilter, get-reports
  sprints       get, create, update, delete, get-issues, partial-update, move-issues, list-properties, get-property, set-property, delete-property, swap
  epic          get, update, issues, move-issues, rank, issues-none, remove-issues
  backlog       move

EXAMPLES:
  atlas jira issues get PROJ-123
  atlas jira issues create --project PROJ --type Bug --summary "Fix this"
  atlas jira search --jql "project = PROJ AND status = Open"
  atlas jira projects list
`;

/** Get help text for the given level. */
export function getHelpText(api?: string): string {
  switch (api) {
    case 'confluence':
      return CONFLUENCE_HELP;
    case 'jira':
      return JIRA_HELP;
    case 'install-skill':
      return INSTALL_SKILL_HELP;
    default:
      return GLOBAL_HELP;
  }
}
