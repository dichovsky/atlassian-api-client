const GLOBAL_HELP = `atlas - Atlassian Cloud API CLI

USAGE:
  atlas <api> <resource> <action> [args] [options]

APIs:
  confluence    Confluence Cloud REST API v2
  jira          Jira Cloud Platform REST API v3

GLOBAL OPTIONS:
  --base-url, -u   Atlassian instance URL (or ATLASSIAN_BASE_URL)
  --auth-type      Auth scheme: basic (default) or bearer (or ATLASSIAN_AUTH_TYPE)
  --email, -e      Email for basic auth (or ATLASSIAN_EMAIL); not used for bearer
  --token, -t      API token (basic) or bearer token (or ATLASSIAN_API_TOKEN)
  --format, -f     Output format: json (default), table, minimal
  --help, -h       Show help
  --version        Show version

EXAMPLES:
  atlas confluence pages list --base-url https://myco.atlassian.net -e user@co.com -t TOKEN
  atlas jira issues get PROJ-123 --auth-type bearer --token OAUTH_TOKEN
  atlas jira search --jql "project = PROJ"
`;

const CONFLUENCE_HELP = `atlas confluence - Confluence Cloud REST API v2

RESOURCES:
  pages         list, get, create, update, delete
  spaces        list, get
  blog-posts    list, get, create, update, delete
  comments      list, get, create, delete
  attachments   list, get, delete
  labels        list

EXAMPLES:
  atlas confluence pages list --space-id 123
  atlas confluence pages get 456
  atlas confluence spaces list
`;

const JIRA_HELP = `atlas jira - Jira Cloud Platform REST API v3

RESOURCES:
  issues        get, create, update, delete, transition, transitions
  projects      list, get
  search        search (via JQL)
  users         get, me, search
  issue-types   list, get
  priorities    list, get
  statuses      list

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
    default:
      return GLOBAL_HELP;
  }
}
