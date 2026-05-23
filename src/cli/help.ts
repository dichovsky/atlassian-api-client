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
  pages                  list, get, create, update, delete, ancestors, descendants, direct-children, children, get-classification-level, update-classification-level, reset-classification-level, custom-content, likes-count, likes-users, operations, redact, update-title, list-properties, create-property, get-property, update-property, delete-property, version, upload-attachment
  spaces                 list, get, create, blog-posts, get-default-classification-level, update-default-classification-level, delete-default-classification-level, content-labels, custom-content, labels, operations, pages, permissions, role-assignments, set-role-assignments, list-properties, create-property, get-property, update-property, delete-property
  blog-posts             list, get, create, update, delete, list-properties, create-property, get-property, update-property, delete-property, attachments, get-classification-level, update-classification-level, reset-classification-level, custom-content, footer-comments, inline-comments, labels, likes-count, likes-users, operations, redact, versions, version
  comments               list, get, create, delete, list-properties, create-property, get-property, update-property, delete-property
  attachments            list, list-all, get, delete, list-properties, create-property, get-property, update-property, delete-property, versions, get-version, footer-comments, labels, operations, thumbnail
  labels                 list, list-all, attachments, blog-posts, pages
  admin-key              get, create, delete
  app                    list-properties, get-property, upsert-property, delete-property
  classification-levels  list
  content                convert-ids-to-types
  custom-content         list, get, create, update, delete, list-properties, create-property, get-property, update-property, delete-property, versions, version, attachments, children, footer-comments, labels, operations
  data-policies          get-metadata, list-spaces
  databases              create, get, delete, ancestors, descendants, direct-children, operations, get-classification-level, update-classification-level, reset-classification-level, list-properties, create-property, get-property, update-property, delete-property
  embeds                 create, get, delete, ancestors, descendants, direct-children, operations, list-properties, create-property, get-property, update-property, delete-property
  folders                create, get, delete, ancestors, descendants, direct-children, operations, list-properties, create-property, get-property, update-property, delete-property
  footer-comments        list, get, update, children, likes-count, likes-users, operations, versions, version
  space-permissions      list
  space-role-mode        get
  space-roles            list, get, create, update, delete
  tasks                  list, get, update
  users                  check-access-by-email, invite-by-email
  users-bulk             lookup
  whiteboards            create, get, delete, ancestors, descendants, direct-children, operations, get-classification-level, update-classification-level, reset-classification-level, list-properties, create-property, get-property, update-property, delete-property

EXAMPLES:
  atlas confluence pages list --space-id 123
  atlas confluence pages get 456
  atlas confluence pages ancestors 456 --limit 50
  atlas confluence pages descendants 456 --depth 3 --limit 50
  atlas confluence pages direct-children 456 --sort=-modified-date
  atlas confluence pages children 456 --sort=-child-position
  atlas confluence pages get-classification-level 456
  atlas confluence pages update-classification-level 456 --level-id cl-1
  atlas confluence pages reset-classification-level 456
  atlas confluence pages custom-content 456 --type ai.atlassian.collection
  atlas confluence pages likes-count 456
  atlas confluence pages likes-users 456 --limit 50
  atlas confluence pages operations 456
  atlas confluence pages update-title 456 --title "Renamed" --status current
  atlas confluence pages list-properties 456 --sort key
  atlas confluence pages create-property 456 --key reviewed --value true
  atlas confluence pages version 456 --version-number 2
  atlas confluence pages upload-attachment 456 --file ./screenshot.png
  atlas confluence spaces list
  atlas confluence app list-properties --limit 25
  atlas confluence app upsert-property my-flag --value '{"beta":true}'
  atlas confluence comments list-properties 77777
  atlas confluence comments create-property 77777 --key reviewed --value true
  atlas confluence comments update-property 77777 --property-id prop-1 --key reviewed --value false --version-number 2
  atlas confluence classification-levels list
  atlas confluence content convert-ids-to-types --ids 12345,67890
  atlas confluence custom-content list --type ai.atlassian.collection --space-id 654321
  atlas confluence custom-content get cc-1 --body-format storage
  atlas confluence custom-content create --type ai.atlassian.collection --space-id 654321 --title "AI Notes" --body "<p>hi</p>"
  atlas confluence custom-content update cc-1 --type ai.atlassian.collection --version-number 2 --title "Renamed"
  atlas confluence custom-content list-properties cc-1 --sort key
  atlas confluence custom-content create-property cc-1 --key reviewed --value true
  atlas confluence custom-content versions cc-1 --sort=-modified-date
  atlas confluence custom-content attachments cc-1 --media-type image/png
  atlas confluence custom-content children cc-1 --limit 50
  atlas confluence custom-content footer-comments cc-1 --sort=-created-date
  atlas confluence custom-content labels cc-1 --prefix global
  atlas confluence custom-content operations cc-1
  atlas confluence data-policies get-metadata
  atlas confluence data-policies list-spaces --keys ENG,OPS --limit 50
  atlas confluence databases create --space-id 123 --title "Inventory" --private
  atlas confluence databases get 456 --include-properties
  atlas confluence databases descendants 456 --depth 3 --limit 50
  atlas confluence databases list-properties 456
  atlas confluence databases update-classification-level 456 --level-id cl-1
  atlas confluence embeds create --space-id 123 --title "Demo" --embed-url https://example.com
  atlas confluence embeds get embed-1 --include-direct-children
  atlas confluence embeds descendants embed-1 --depth 3 --limit 50
  atlas confluence embeds direct-children embed-1 --sort=-modified-date
  atlas confluence embeds list-properties embed-1
  atlas confluence folders create --space-id 123 --title "Drafts" --parent-id 456
  atlas confluence folders get 789 --include-direct-children
  atlas confluence folders descendants 789 --depth 3 --limit 50
  atlas confluence folders direct-children 789 --sort -modified-date
  atlas confluence folders list-properties 789
  atlas confluence footer-comments list --sort -created-date --limit 25
  atlas confluence footer-comments get 77777 --include-likes --include-versions
  atlas confluence footer-comments update 77777 --body "Updated" --version-number 2
  atlas confluence footer-comments children 77777
  atlas confluence footer-comments likes-count 77777
  atlas confluence footer-comments versions 77777 --sort -modified-date
  atlas confluence space-permissions list --limit 25
  atlas confluence space-role-mode get
  atlas confluence space-roles list --role-type CUSTOM --limit 25
  atlas confluence space-roles get role-1
  atlas confluence space-roles create --name "Editor" --description "Edit role" --space-permissions read/space,write/space
  atlas confluence space-roles update role-1 --name "Editor v2" --description "Updated" --space-permissions read/space
  atlas confluence space-roles delete role-1
  atlas confluence spaces create --name "Engineering" --key ENG --description "Eng space"
  atlas confluence spaces blog-posts 654321 --sort=-created-date --limit 25
  atlas confluence spaces content-labels 654321 --prefix team
  atlas confluence spaces custom-content 654321 --type ai.atlassian.collection
  atlas confluence spaces get-default-classification-level 654321
  atlas confluence spaces update-default-classification-level 654321 --level-id cl-1
  atlas confluence spaces delete-default-classification-level 654321
  atlas confluence spaces labels 654321 --prefix team --sort -name
  atlas confluence spaces operations 654321
  atlas confluence spaces pages 654321 --depth root --sort=-modified-date
  atlas confluence spaces permissions 654321 --limit 50
  atlas confluence spaces role-assignments 654321 --role-type CUSTOM --principal-type USER
  atlas confluence spaces set-role-assignments 654321 --value '[{"principal":{"principalType":"USER","principalId":"acc-1"},"roleId":"role-1"}]'
  atlas confluence spaces list-properties 654321 --sort key
  atlas confluence spaces create-property 654321 --key feature-flags --value '{"beta":true}'
  atlas confluence spaces update-property 654321 --property-id prop-1 --key feature-flags --value '{"beta":false}' --version-number 2
  atlas confluence tasks list --status incomplete --limit 25
  atlas confluence tasks update task-1 --status complete
  atlas confluence users check-access-by-email --emails a@example.com,b@example.com
  atlas confluence users invite-by-email --emails a@example.com,b@example.com
  atlas confluence users-bulk lookup --account-ids acc-1,acc-2
  atlas confluence attachments list-all --status current,archived --sort -modified-date
  atlas confluence attachments get att-1 --include-labels --include-properties
  atlas confluence attachments delete att-1 --purge
  atlas confluence attachments versions att-1 --sort -modified-date
  atlas confluence attachments get-version att-1 --version-number 2
  atlas confluence attachments footer-comments att-1 --body-format storage
  atlas confluence attachments labels att-1 --prefix global
  atlas confluence attachments thumbnail att-1 --width 200 --height 200
  atlas confluence attachments list-properties att-1
  atlas confluence attachments create-property att-1 --key reviewed --value true
  atlas confluence labels list-all --prefix global --limit 50
  atlas confluence labels attachments 12345 --sort -created-date
  atlas confluence labels blog-posts 12345 --space-id 100,200 --limit 25
  atlas confluence labels pages 12345 --sort -modified-date
  atlas confluence blog-posts list-properties 99999
  atlas confluence blog-posts create-property 99999 --key reviewed --value true
  atlas confluence blog-posts attachments 99999 --media-type image/png
  atlas confluence blog-posts get-classification-level 99999
  atlas confluence blog-posts custom-content 99999 --type my.custom.type
  atlas confluence blog-posts footer-comments 99999 --sort -created-date
  atlas confluence blog-posts likes-count 99999
  atlas confluence blog-posts versions 99999 --sort -modified-date
  atlas confluence blog-posts version 99999 --version-number 2
  atlas confluence whiteboards create --space-id 123 --title "Roadmap" --private
  atlas confluence whiteboards get wb-1 --include-collaborators --include-properties
  atlas confluence whiteboards descendants wb-1 --depth 3 --limit 50
  atlas confluence whiteboards direct-children wb-1 --sort=-modified-date
  atlas confluence whiteboards list-properties wb-1
  atlas confluence whiteboards update-classification-level wb-1 --level-id cl-1
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
  status        list, get
  status-category  list, get
  boards        list, get, create, delete, backlog, configuration, list-epics, epic-issues, issues-without-epic, get-features, toggle-feature, get-issues, move-issues, list-projects, list-projects-full, list-sprints, list-versions, sprint-issues, list-by-filter, list-properties, delete-property, get-property, set-property, list-quickfilters, get-quickfilter, get-reports
  sprints       get, create, update, delete, get-issues, partial-update, move-issues, list-properties, get-property, set-property, delete-property, swap
  epic                   get, update, issues, move-issues, rank, issues-none, remove-issues
  backlog                move
  announcement-banner    get, update
  application-role       list, get
  data-policy            get-workspace, list-projects
  webhooks               list-failed
  server-info            get
  instance               get-license
  mypermissions          get
  auditing               list
  events                 list
  changelog              bulk-fetch
  forge                  bulk-panel-action
  incidents              get, delete
  post-incident-reviews  get, delete
  vulnerability          get, delete
  devopscomponents       get, delete
  groups                 picker
  group-user-picker      pick
  security-level         get
  license                get-approximate-count, get-approximate-count-for-product
  settings               get-columns, set-columns
  redact                 start, get-status
  flag                   get, delete
  task                   get, cancel

EXAMPLES:
  atlas jira issues get PROJ-123
  atlas jira issues create --project PROJ --type Bug --summary "Fix this"
  atlas jira search --jql "project = PROJ AND status = Open"
  atlas jira projects list
  atlas jira incidents get INC-123
  atlas jira incidents delete INC-123
  atlas jira post-incident-reviews get PIR-456
  atlas jira post-incident-reviews delete PIR-456
  atlas jira vulnerability get VULN-789
  atlas jira vulnerability delete VULN-789
  atlas jira devopscomponents get COMP-101
  atlas jira devopscomponents delete COMP-101
  atlas jira groups picker --query dev --max-results 10
  atlas jira group-user-picker pick --query alice --show-avatar
  atlas jira security-level get 10001
  atlas jira license get-approximate-count
  atlas jira license get-approximate-count-for-product --application-key jira-software
  atlas jira settings get-columns
  atlas jira settings set-columns --columns '[{"label":"Key","value":"issuekey"}]'
  atlas jira redact start --jql "project = PROJ AND summary ~ secret"
  atlas jira redact get-status job-abc123
  atlas jira flag get flag-xyz
  atlas jira flag delete flag-xyz
  atlas jira task get task-123
  atlas jira task cancel task-123
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
