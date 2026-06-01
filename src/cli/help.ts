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
  issues        get, create, update, delete, transition, transitions, get-agile, get-estimation, set-estimation, rank, assign, get-changelog, filter-changelog, get-editmeta, notify, list-properties, delete-property, get-property, set-property, delete-all-remotelinks, list-remotelinks, create-remotelink, delete-remotelink, get-remotelink, update-remotelink, remove-vote, get-votes, add-vote, remove-watcher, get-watchers, add-watcher, delete-all-worklogs, list-worklogs, add-worklog, delete-worklog, get-worklog, update-worklog, list-worklog-properties, delete-worklog-property, get-worklog-property, set-worklog-property, move-worklog, archive-issues, archive-issues-jql, bulk-fetch, get-create-meta, get-create-meta-issuetypes, get-create-meta-issuetype, get-limit-report, picker, set-properties-by-entity-ids, set-properties-multi, unarchive-issues, watch-issues-bulk, export-archived
  projects      list, get, list-legacy, create, update, delete, recent, list-types, get-type, get-accessible-type, list-accessible-types, get-email, set-email, get-hierarchy, archive, set-avatar, delete-avatar, load-avatar, get-avatars, get-classification-config, delete-classification-level, get-classification-level, set-classification-level, list-components, list-all-components, delete-async, get-features, set-feature-state, list-properties, delete-property, get-property, set-property, restore, list-roles, delete-role-actors, get-role, add-role-actors, set-role-actors, get-role-details, get-statuses, list-versions, list-all-versions, get-issue-security-scheme, get-notification-scheme, get-permission-scheme, set-permission-scheme, get-security-levels, list-categories, create-category, delete-category, get-category, update-category, get-projects-fields, validate-project-key, get-valid-project-key, get-valid-project-name
  search        search, get, approximate-count, jql-get, jql-post
  users         get, me, search, delete, create, assignable-multi-project, assignable, bulk, bulk-migration, reset-columns, get-columns, set-columns, email, bulk-emails, groups, permission-search, picker, list-properties, delete-property, get-property, set-property, search-query, search-query-key, viewissue-search, list, list-search
  issue-types   list, get
  issuetype     create, delete, update, list-alternatives, load-avatar, list-properties, delete-property, get-property, set-property, list-for-project
  priorities    list, get, create, update, delete, set-default, move, search
  statuses      list, bulk-delete, bulk-create, bulk-update, get-issue-type-usages, get-project-usages, get-workflow-usages, by-names, search
  resolutions   list, get, create, update, delete, set-default, move, search
  status        list, get
  status-category  list, get
  boards        list, get, create, delete, backlog, configuration, list-epics, epic-issues, issues-without-epic, get-features, toggle-feature, get-issues, move-issues, list-projects, list-projects-full, list-sprints, list-versions, sprint-issues, list-by-filter, list-properties, delete-property, get-property, set-property, list-quickfilters, get-quickfilter, get-reports
  sprints       get, create, update, delete, get-issues, partial-update, move-issues, list-properties, get-property, set-property, delete-property, swap
  epic                   get, update, issues, move-issues, rank, issues-none, remove-issues
  backlog                move
  announcement-banner    get, update
  application-role       list, get
  data-policy            get-workspace, list-projects
  webhooks               list, register, refresh, list-failed
  server-info            get
  instance               get-license
  mypermissions          get
  mypreferences          get, set, delete, get-locale, set-locale
  auditing               list
  events                 list
  changelog              bulk-fetch
  forge                  bulk-panel-action
  incidents              get, delete
  post-incident-reviews  get, delete
  vulnerability          get, delete
  devopscomponents       get, delete
  groups                 picker, get, create, delete, list-bulk, list-members, remove-user, add-user
  group-user-picker      pick
  security-level         get
  license                get-approximate-count, get-approximate-count-for-product
  settings               get-columns, set-columns
  redact                 start, get-status
  flag                   get, delete
  task                   get, cancel
  avatar                 list-system
  custom-field-option    get
  classification-levels  list
  latest                 bulk-worklog
  remote-link            get, delete
  service-registry       get
  exists-by-properties   get
  repository             get, delete, delete-entity
  app                    get-field-context-configuration, update-field-context-configuration, update-field-value, list-field-context-configurations, bulk-update-field-value, get-dynamic-modules, register-dynamic-modules, delete-dynamic-modules, list-forge-properties, get-forge-property, set-forge-property, delete-forge-property
  application-properties list, set, list-advanced-settings
  configuration          get, get-timetracking, select-timetracking, list-timetracking-providers, get-timetracking-options, update-timetracking-options
  bulk                   create-issues, delete-issues, get-fields, edit-fields, move-issues, get-transitions, transition-issues, unwatch-issues, watch-issues, get-status, set-property, delete-property, submit-builds, submit-deployments, submit-devinfo, submit-devops-components, submit-feature-flags, submit-operations, submit-remote-links, submit-security
  issue-attachments      list, get, delete, expand-human, expand-raw, download-content, get-meta, download-thumbnail, upload
  component              list, create, get, update, delete, related-issue-counts
  filters                search, get, create, update, delete, list-favourites, list-my, add-favourite, remove-favourite, change-owner, get-columns, set-columns, reset-columns, list-permissions, add-permission, get-permission, delete-permission, get-default-share-scope, set-default-share-scope
  issue-type-screen-schemes  list, create, update, delete, update-mapping, update-default-mapping, remove-mappings, get-project, list-mapping, list-project-mappings, assign-to-project
  permission-schemes     list, get, create, update, delete, list-permissions, create-permission, get-permission, delete-permission
  issue-type-schemes     list, list-mapping, list-project, create, update, delete, add-issue-types, remove-issue-type, move-issue-types, assign-to-project
  notification-schemes   list, create, get, update, add-notifications, delete, remove-notification, list-projects
  roles                  list, get, create, update, partial-update, delete, get-actors, add-actors, delete-actors
  expression             analyse, eval, evaluate
  issue-comments         list-properties, get-property, set-property, delete-property, bulk-fetch
  fieldconfiguration     list, create, delete, update, list-fields, update-fields
  priority-schemes       list, create, delete, update, list-priorities, list-projects, suggested-mappings, available-priorities
  version                create, get, update, delete, merge, move, related-issue-counts, list-related-work, create-related-work, update-related-work, delete-and-replace, unresolved-issue-count, delete-related-work
  config                 list, create, delete, get, update, clone, list-fields, get-field-parameters, list-projects, remove-field-associations, update-field-associations, remove-field-parameters, update-field-parameters, get-projects-with-schemes, associate-projects
  issuesecurityschemes   get-all, create, get, update, list-members, delete, add-levels, remove-level, update-level, add-level-members, remove-level-member, list-levels, set-default-levels, list-level-members, list-projects, associate-to-project, search
  screens                list, create, delete, update, list-available-fields, list-tabs, create-tab, delete-tab, update-tab, list-tab-fields, add-field-to-tab, remove-field-from-tab, move-field, move-tab, add-to-default, list-all-tabs
  screenscheme           list, list-all, create, update, delete
  plans                  list, create, get, update, archive, duplicate, list-teams, add-atlassian-team, delete-atlassian-team, get-atlassian-team, update-atlassian-team, create-plan-only-team, delete-plan-only-team, get-plan-only-team, update-plan-only-team, trash
  workflowscheme         list, create, delete, get, update, delete-default, get-default, set-default, delete-issuetype, get-issuetype, set-issuetype, delete-workflow, get-workflow, set-workflow, project-usages, list-by-project, assign-project, switch-project, create-draft, delete-draft, get-draft, update-draft, delete-draft-default, get-draft-default, set-draft-default, delete-draft-issuetype, get-draft-issuetype, set-draft-issuetype, publish-draft, delete-draft-workflow, get-draft-workflow, set-draft-workflow, bulk-read, bulk-update, bulk-mappings
  fields                 field-list, field-list-all, field-create, field-update, field-delete, context-list, context-create, context-update, context-delete, context-option-list, context-option-create, context-option-update, context-option-delete, context-option-replace-issues, context-option-move, context-issuetype-set, context-issuetype-remove, context-issuetype-mapping, context-default-list, context-default-set, context-project-set, context-project-remove, context-mapping, context-project-mapping, field-option-list, field-option-create, field-option-delete, field-option-get, field-option-update, field-option-replace-issues, field-option-suggestions-edit, field-option-suggestions-search, field-project-associations, field-screens, field-restore, field-trash, field-remove-associations, field-create-associations, field-trash-list
  jql                    autocomplete-data, autocomplete-data-post, autocomplete-suggestions, get-precomputations, update-precomputations, get-precomputations-by-id, match-issues, parse, migrate-queries, sanitize
  issuelinktype          list, get, create, update, delete
  issue-link             create, get, delete
  project-template       create, edit-template, live-template, remove-template, save-template
  universal-avatar       list, store, delete, view-by-type, view-by-id, view-by-owner
  worklog                deleted, list, updated
  ui-modifications       list, list-all, create, update, delete
  permissions            get-all, check, permitted-projects
  pipelines              get-build, delete-build, get-deployment, delete-deployment, get-deployment-gating-status
  linked-workspaces      list-operations, bulk-delete-operations, bulk-create-operations, list-security, get-security, bulk-delete-security, bulk-create-security

EXAMPLES:
  atlas jira issues get PROJ-123
  atlas jira issues create --project PROJ --type Bug --summary "Fix this"
  atlas jira search get --jql "project = PROJ AND status = Open"
  atlas jira search approximate-count --jql "project = PROJ"
  atlas jira search jql-get --jql "project = PROJ" --max-results 50
  atlas jira search jql-post --jql "project = PROJ AND assignee = currentUser()"
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
  atlas jira groups get --group-id grp-1 --expand users
  atlas jira groups create --name developers
  atlas jira groups delete --group-id grp-1 --swap-group-id grp-2
  atlas jira groups list-bulk --group-ids grp-1,grp-2 --max-results 50
  atlas jira groups list-members --group-id grp-1 --include-inactive-users
  atlas jira groups add-user --group-id grp-1 --account-id 5b10ac...
  atlas jira groups remove-user --group-id grp-1 --account-id 5b10ac...
  atlas jira group-user-picker pick --query alice --show-avatar
  atlas jira security-level get 10001
  atlas jira license get-approximate-count
  atlas jira license get-approximate-count-for-product jira-software
  atlas jira settings get-columns
  atlas jira settings set-columns --columns '[{"label":"Key","value":"issuekey"}]'
  atlas jira redact start --jql "project = PROJ AND summary ~ secret"
  atlas jira redact get-status job-abc123
  atlas jira flag get flag-xyz
  atlas jira flag delete flag-xyz
  atlas jira task get task-123
  atlas jira task cancel task-123
  atlas jira avatar list-system issuetype
  atlas jira custom-field-option get 10001
  atlas jira classification-levels list
  atlas jira latest bulk-worklog --value '[{"issueIdOrKey":"PROJ-1","timeSpentSeconds":3600,"started":"2024-01-01T09:00:00.000+0000"}]'
  atlas jira remote-link get rl-123
  atlas jira remote-link delete rl-123
  atlas jira service-registry get
  atlas jira exists-by-properties get --entity-type repository
  atlas jira repository get my-repo-123
  atlas jira repository delete my-repo-123
  atlas jira repository delete my-repo-123 --update-sequence-id 42
  atlas jira repository delete-entity my-repo-123 commit abc123
  atlas jira repository delete-entity my-repo-123 pullRequest pr-1 --update-sequence-id 42
  atlas jira app get-field-context-configuration customfield_10042
  atlas jira app update-field-context-configuration customfield_10042 --configuration '{"foo":true}'
  atlas jira app update-field-value customfield_10042 --value '[{"issueIds":[10001],"value":"hi"}]'
  atlas jira app list-field-context-configurations --field-ids-or-keys customfield_10042
  atlas jira app bulk-update-field-value --value '[{"fieldIdOrKey":"customfield_10042","updates":[{"issueIds":[10001],"value":"hi"}]}]'
  atlas jira app get-dynamic-modules
  atlas jira app register-dynamic-modules --value '[{"key":"my-module","type":"webhook"}]'
  atlas jira app delete-dynamic-modules --module-keys my-module,other-module
  atlas jira app list-forge-properties
  atlas jira app get-forge-property my-key
  atlas jira app set-forge-property my-key --value '{"on":true}'
  atlas jira app delete-forge-property my-key
  atlas jira issuetype create --name "Spike" --description "Investigation task" --hierarchy-level 0
  atlas jira issuetype update 10001 --name "Spike v2" --avatar-id 10300
  atlas jira issuetype delete 10001 --alternative-id 10000
  atlas jira issuetype list-alternatives 10001
  atlas jira issuetype load-avatar 10001 --file ./icon.png --size 48 --x 0 --y 0
  atlas jira issuetype list-properties 10001
  atlas jira issuetype get-property 10001 reviewed
  atlas jira issuetype set-property 10001 reviewed --value true
  atlas jira issuetype delete-property 10001 reviewed
  atlas jira issuetype list-for-project --project-id 10000
  atlas jira issue-attachments get 10001
  atlas jira issue-attachments delete 10001
  atlas jira issue-attachments expand-human 10001
  atlas jira issue-attachments expand-raw 10001
  atlas jira issue-attachments download-content 10001 --redirect false
  atlas jira issue-attachments get-meta
  atlas jira issue-attachments download-thumbnail 10001 --width 200 --height 200 --fallback-to-default true
  atlas jira issue-attachments upload PROJ-1 --file ./screenshot.png --media-type image/png
  atlas jira application-properties list --key jira.home
  atlas jira application-properties set jira.title --value "My Jira"
  atlas jira application-properties list-advanced-settings
  atlas jira configuration get
  atlas jira configuration get-timetracking
  atlas jira configuration select-timetracking --key JIRA
  atlas jira configuration list-timetracking-providers
  atlas jira configuration get-timetracking-options
  atlas jira configuration update-timetracking-options --working-hours-per-day 8 --time-format pretty
  atlas jira issue-type-screen-schemes list --max-results 50
  atlas jira issue-type-screen-schemes create --name "Default" --mappings '[{"issueTypeId":"10000","screenSchemeId":"10001"}]'
  atlas jira issue-type-screen-schemes update 10001 --name "Renamed"
  atlas jira issue-type-screen-schemes delete 10001
  atlas jira issue-type-screen-schemes update-mapping 10001 --mappings '[{"issueTypeId":"10000","screenSchemeId":"10002"}]'
  atlas jira issue-type-screen-schemes update-default-mapping 10001 --screen-scheme-id 10002
  atlas jira issue-type-screen-schemes remove-mappings 10001 --issue-type-ids 10000,10001
  atlas jira issue-type-screen-schemes get-project 10001 --max-results 25
  atlas jira issue-type-screen-schemes list-mapping --scheme-ids 10001,10002
  atlas jira issue-type-screen-schemes list-project-mappings --project-ids 10001,10002
  atlas jira issue-type-screen-schemes assign-to-project --scheme-id 10001 --project-id 10002
  atlas jira permission-schemes list
  atlas jira permission-schemes get 10000
  atlas jira permission-schemes create --name "Default scheme"
  atlas jira permission-schemes update 10000 --name "Updated scheme" --description "Updated"
  atlas jira permission-schemes delete 10000
  atlas jira permission-schemes list-permissions 10000
  atlas jira permission-schemes create-permission 10000 --holder-type anyone --permission BROWSE_PROJECTS
  atlas jira permission-schemes get-permission 10000 10001
  atlas jira permission-schemes delete-permission 10000 10001
  atlas jira issue-type-schemes list --start-at 0 --max-results 50
  atlas jira issue-type-schemes list --ids 10000,10001
  atlas jira issue-type-schemes create --name "Software Development" --description "Default for dev" --default-issue-type-id 10001 --issue-type-ids 10001,10002,10003
  atlas jira issue-type-schemes update 10000 --name "Updated Scheme" --description "New description"
  atlas jira issue-type-schemes delete 10000
  atlas jira issue-type-schemes add-issue-types 10000 --issue-type-ids 10005,10006
  atlas jira issue-type-schemes remove-issue-type 10000 10005
  atlas jira issue-type-schemes move-issue-types 10000 --issue-type-ids 10001,10002 --position First
  atlas jira issue-type-schemes move-issue-types 10000 --issue-type-ids 10003 --after 10002
  atlas jira issue-type-schemes list-mapping --scheme-ids 10000,10001
  atlas jira issue-type-schemes list-project --project-ids 10100,10101
  atlas jira issue-type-schemes assign-to-project --scheme-id 10000 --project-id 10100
  atlas jira notification-schemes list --start-at 0 --max-results 50
  atlas jira notification-schemes get 10000 --expand notificationSchemeEvents
  atlas jira notification-schemes create --name "Default" --description "Default scheme"
  atlas jira notification-schemes update 10000 --name "Renamed"
  atlas jira notification-schemes add-notifications 10000 --notification-scheme-events '[{"event":{"id":"1"},"notifications":[{"notificationType":"CurrentAssignee"}]}]'
  atlas jira notification-schemes delete 10000
  atlas jira notification-schemes remove-notification 10000 5
  atlas jira notification-schemes list-projects --project-ids 10100,10101
  atlas jira roles list
  atlas jira roles get 10001
  atlas jira roles create --name "Developers" --description "Development team role"
  atlas jira roles update 10001 --name "Developers" --description "Updated description"
  atlas jira roles partial-update 10001 --description "Partially updated"
  atlas jira roles delete 10001
  atlas jira roles delete 10001 --swap 10002
  atlas jira roles get-actors 10001
  atlas jira roles add-actors 10001 --user acc-1,acc-2
  atlas jira roles add-actors 10001 --group-id grp-1,grp-2
  atlas jira roles delete-actors 10001 --account-id acc-1
  atlas jira roles delete-actors 10001 --group-name my-group
  atlas jira roles delete-actors 10001 --group-id grp-1
  atlas jira resolutions list
  atlas jira resolutions get 10001
  atlas jira resolutions create --name "Fixed"
  atlas jira resolutions update 10001 --name "Fixed" --description "Issue was fixed"
  atlas jira resolutions delete 10001 --replace-with 10000
  atlas jira resolutions set-default 10001
  atlas jira resolutions move --ids 10001,10002 --after 10000
  atlas jira resolutions search --query-string "Won't" --max-results 10
  atlas jira statuses bulk-delete --ids 10001,10002
  atlas jira statuses bulk-create --value '[{"name":"Blocked","statusCategory":"IN_PROGRESS"}]'
  atlas jira statuses bulk-update --value '[{"id":"10001","name":"Renamed"}]'
  atlas jira statuses get-issue-type-usages 10001 10002
  atlas jira statuses get-project-usages 10001
  atlas jira statuses get-workflow-usages 10001
  atlas jira statuses by-names --names "In Progress,Done"
  atlas jira statuses search --project-id 10000 --search-string "In Progress"
  atlas jira expression analyse --expressions '["issue.key","issue.summary"]'
  atlas jira expression analyse --expressions '["value.accountId"]' --context-variables '{"value":"User"}' --check type
  atlas jira expression eval --expression "issue.key" --context '{"issue":{"key":"ACJIRA-1470"}}'
  atlas jira expression evaluate --expression "issue.key" --context '{"issue":{"key":"ACJIRA-1470"}}' --expand meta.complexity
  atlas jira fieldconfiguration list --start-at 0 --max-results 50
  atlas jira fieldconfiguration list --ids 10000,10001 --is-default
  atlas jira fieldconfiguration list --query "default"
  atlas jira fieldconfiguration create --name "My Configuration" --description "A new field configuration"
  atlas jira fieldconfiguration update 10001 --name "Renamed" --description "Updated description"
  atlas jira fieldconfiguration delete 10001
  atlas jira fieldconfiguration list-fields 10001 --start-at 0 --max-results 50
  atlas jira fieldconfiguration update-fields 10001 --field-configuration-items '[{"id":"customfield_10010","isHidden":false,"isRequired":true}]'
  atlas jira priority-schemes list --start-at 0 --max-results 50
  atlas jira priority-schemes list --scheme-ids 10000,10001 --expand priorities,projects
  atlas jira priority-schemes create --name "Critical Bugs" --default-priority-id 10001 --priority-ids 10001,10002 --description "Scheme for critical projects" --project-ids 10100,10101
  atlas jira priority-schemes update 10000 --name "Renamed Scheme" --description "Updated"
  atlas jira priority-schemes update 10000 --priorities '{"add":{"ids":[10003]},"remove":{"ids":[10004]}}' --mappings '{"in":{"10004":10003}}'
  atlas jira priority-schemes delete 10000
  atlas jira priority-schemes list-priorities 10000 --start-at 0 --max-results 25
  atlas jira priority-schemes list-projects 10000 --project-ids 10100,10101 --query example
  atlas jira priority-schemes suggested-mappings --scheme-id 10000 --priorities '{"add":[10003],"remove":[10004]}' --projects '{"add":[10100]}'
  atlas jira priority-schemes available-priorities --scheme-id 10000 --query high --exclude 10005,10006
  atlas jira config list --start-at 0 --max-results 50
  atlas jira config list --project-ids 10100,10101 --query "My Scheme"
  atlas jira config create --name "My Field Scheme" --description "Description"
  atlas jira config get 10001
  atlas jira config update 10001 --name "Renamed Scheme" --description "Updated"
  atlas jira config delete 10001
  atlas jira config clone 10001 --name "Clone of My Scheme"
  atlas jira config list-fields 10001 --start-at 0 --max-results 50
  atlas jira config list-fields 10001 --field-id customfield_10001,customfield_10002
  atlas jira config get-field-parameters 10001 customfield_10001
  atlas jira config list-projects 10001 --project-ids 10100,10101
  atlas jira config remove-field-associations --body '{"customfield_10001":{"schemeIds":[10001,10002]}}'
  atlas jira config update-field-associations --body '{"customfield_10001":[{"schemeIds":[10001],"restrictedToWorkTypes":[1,2]}]}'
  atlas jira config remove-field-parameters --body '{"customfield_10001":[{"schemeId":10001,"parameters":["description"],"workTypeIds":[1]}]}'
  atlas jira config update-field-parameters --body '{"customfield_10001":[{"schemeIds":[10001],"parameters":{"isRequired":true}}]}'
  atlas jira config get-projects-with-schemes --project-ids 10100,10101
  atlas jira config associate-projects --body '{"10001":{"projectIds":[10100,10101]}}'
  atlas jira screens list --max-results 50
  atlas jira screens list --ids 10001,10002 --query-string Default
  atlas jira screens create --name "Default Screen" --description "Main screen"
  atlas jira screens delete 10001
  atlas jira screens update 10001 --name "Renamed Screen"
  atlas jira screens list-available-fields 10001
  atlas jira screens list-tabs 10001
  atlas jira screens list-tabs 10001 --project-key PROJ
  atlas jira screens create-tab 10001 --name "Field Tab"
  atlas jira screens delete-tab 10001 1
  atlas jira screens update-tab 10001 1 --name "Renamed Tab"
  atlas jira screens list-tab-fields 10001 1 --project-key PROJ
  atlas jira screens add-field-to-tab 10001 1 --field-id summary
  atlas jira screens add-field-to-tab 10001 1 --field-id summary --skip-field-association
  atlas jira screens remove-field-from-tab 10001 1 summary
  atlas jira screens move-field 10001 1 summary --position First
  atlas jira screens move-field 10001 1 summary --after description
  atlas jira screens move-tab 10001 1 0
  atlas jira screens add-to-default summary
  atlas jira screens list-all-tabs --ids 10001,10002
  atlas jira plans list --max-results 50
  atlas jira plans list --include-trashed --include-archived
  atlas jira plans get 10001
  atlas jira plans get 10001 --use-group-id
  atlas jira plans archive 10001
  atlas jira plans trash 10001
  atlas jira plans duplicate 10001 --name "Copy of My Plan"
  atlas jira plans list-teams 10001 --max-results 20
  atlas jira plans get-atlassian-team 10001 team-abc-123
  atlas jira plans delete-atlassian-team 10001 team-abc-123
  atlas jira plans get-plan-only-team 10001 2001
  atlas jira plans delete-plan-only-team 10001 2001
  atlas jira workflowscheme list --max-results 50
  atlas jira workflowscheme list --all
  atlas jira workflowscheme get 10001
  atlas jira workflowscheme delete 10001
  atlas jira workflowscheme get-default 10001
  atlas jira workflowscheme delete-default 10001 --update-draft-if-needed
  atlas jira workflowscheme get-issuetype 10001 10000
  atlas jira workflowscheme delete-issuetype 10001 10000
  atlas jira workflowscheme get-workflow 10001 --workflow-name jira
  atlas jira workflowscheme delete-workflow 10001 --workflow-name jira
  atlas jira workflowscheme project-usages 10001 --max-results 50
  atlas jira workflowscheme list-by-project --project-id 10010,10020
  atlas jira workflowscheme create --body '{"name":"My Scheme"}'
  atlas jira workflowscheme update 10001 --body '{"name":"Renamed"}'
  atlas jira workflowscheme set-default 10001 --body '{"workflow":"jira"}'
  atlas jira workflowscheme set-issuetype 10001 10000 --body '{"workflow":"scrum"}'
  atlas jira workflowscheme set-workflow 10001 --workflow-name jira --body '{"issueTypes":["10000"]}'
  atlas jira workflowscheme assign-project --body '{"projectId":"10010","workflowSchemeId":"10001"}'
  atlas jira workflowscheme switch-project --body '{"projectId":"10010","targetSchemeId":"10002"}'
  atlas jira workflowscheme create-draft 10001
  atlas jira workflowscheme get-draft 10001
  atlas jira workflowscheme update-draft 10001 --body '{"name":"Renamed draft"}'
  atlas jira workflowscheme publish-draft 10001 --body '{"statusMappings":[]}' --validate-only
  atlas jira workflowscheme delete-draft-workflow 10001 --workflow-name jira
  atlas jira workflowscheme set-draft-workflow 10001 --workflow-name jira --body '{"issueTypes":["10000"],"workflow":"jira"}'
  atlas jira workflowscheme bulk-read --body '{"projectIds":["10010"]}'
  atlas jira workflowscheme bulk-update --body '{"id":"10001","name":"x","description":"y","version":{"id":"v","versionNumber":1}}'
  atlas jira workflowscheme bulk-mappings --body '{"id":"10001","workflowsForIssueTypes":[]}'
  atlas jira fields field-list-all
  atlas jira fields field-list --max-results 50
  atlas jira fields field-create --body '{"name":"Sprint Points","type":"com.atlassian.jira.plugin.system.customfieldtypes:float"}'
  atlas jira fields field-update customfield_10001 --body '{"name":"Renamed"}'
  atlas jira fields field-delete customfield_10001
  atlas jira fields context-list --field-id customfield_10001
  atlas jira fields context-list --field-id customfield_10001 --is-global-context true
  atlas jira fields context-create --field-id customfield_10001 --name 'Bug context' --project-ids 10010,10011
  atlas jira fields context-update --field-id customfield_10001 --context-id 10025 --name 'Renamed'
  atlas jira fields context-delete --field-id customfield_10001 --context-id 10025
  atlas jira fields context-option-list --field-id customfield_10001 --context-id 10025
  atlas jira fields context-option-create --field-id customfield_10001 --context-id 10025 --body '{"options":[{"value":"New York"}]}'
  atlas jira fields context-option-update --field-id customfield_10001 --context-id 10025 --body '{"options":[{"id":"10001","value":"Renamed"}]}'
  atlas jira fields context-option-delete --field-id customfield_10001 --context-id 10025 --option-id 10001
  atlas jira fields context-option-replace-issues --field-id customfield_10001 --context-id 10025 --option-id 10001 --replace-with 10003
  atlas jira fields context-option-move --field-id customfield_10001 --context-id 10025 --option-ids 10001,10002 --position First
  atlas jira fields field-project-associations --field-id customfield_10001
  atlas jira fields field-screens --field-id customfield_10001
  atlas jira fields field-restore --field-id customfield_10001
  atlas jira fields field-trash --field-id customfield_10001
  atlas jira fields field-remove-associations --body '{"associationContexts":[{"type":"PROJECT_ID","identifier":10000}],"fields":[{"type":"FIELD_ID","identifier":"customfield_10000"}]}'
  atlas jira fields field-create-associations --body '{"associationContexts":[{"type":"PROJECT_ID","identifier":10000}],"fields":[{"type":"FIELD_ID","identifier":"customfield_10000"}]}'
  atlas jira fields field-trash-list
  atlas jira fields field-trash-list --query approvers --max-results 50
  atlas jira projects restore PROJ
  atlas jira projects list-roles PROJ
  atlas jira projects get-role PROJ 10001
  atlas jira projects get-role PROJ 10001 --exclude-inactive-users
  atlas jira projects delete-role-actors PROJ 10001 --user acc-1
  atlas jira projects delete-role-actors PROJ 10001 --group-id grp-1
  atlas jira projects add-role-actors PROJ 10001 --body '{"actors":[{"user":["acc-1"]}]}'
  atlas jira projects set-role-actors PROJ 10001 --body '{"categorisedActors":{"atlassian-user-role-actor":["acc-1"]}}'
  atlas jira projects get-role-details PROJ
  atlas jira projects get-role-details PROJ --current-member --exclude-connect-addons
  atlas jira projects get-statuses PROJ
  atlas jira projects list-versions PROJ --order-by name --status released
  atlas jira projects list-all-versions PROJ --order-by -releaseDate
  atlas jira projects get-issue-security-scheme PROJ
  atlas jira projects get-notification-scheme PROJ --expand all
  atlas jira projects get-permission-scheme PROJ --expand permissions
  atlas jira projects set-permission-scheme PROJ --permission-scheme 10001
  atlas jira projects get-security-levels PROJ
  atlas jira projects list-categories
  atlas jira projects create-category --name "Infrastructure"
  atlas jira projects create-category --name "Infrastructure" --description "Infra projects"
  atlas jira projects delete-category 10001
  atlas jira projects get-category 10001
  atlas jira projects update-category 10001 --name "Renamed" --description "Updated"
  atlas jira projects get-projects-fields
  atlas jira projects validate-project-key --key MYPROJ
  atlas jira projects get-valid-project-key --key myproj
  atlas jira projects get-valid-project-name --name "My Project"
  atlas jira issuelinktype list
  atlas jira issuelinktype get 10001
  atlas jira issuelinktype create --name "Blocks" --inward "is blocked by" --outward "blocks"
  atlas jira issuelinktype update 10001 --name "Clones" --inward "is cloned by" --outward "clones"
  atlas jira issuelinktype delete 10001
  atlas jira issue-link create --link-type "Blocks" --inward-issue "HSP-1" --outward-issue "MKY-1"
  atlas jira issue-link get 10001
  atlas jira issue-link delete 10001
  atlas jira universal-avatar list project 10001
  atlas jira universal-avatar store project 10001 --file ./icon.png --size 48
  atlas jira universal-avatar store issuetype 10001 --file ./icon.png --size 48 --x 0 --y 0
  atlas jira universal-avatar delete project 10001 1010
  atlas jira universal-avatar view-by-type issuetype --size medium --image-format png
  atlas jira universal-avatar view-by-id project 1010 --size small
  atlas jira universal-avatar view-by-owner project 10001 --image-format svg
  atlas jira worklog deleted --since 1700000000000
  atlas jira worklog list --ids 1,2,5,10
  atlas jira worklog updated --since 1700000000000
  atlas jira ui-modifications list
  atlas jira ui-modifications create --name "Reveal Story Points"
  atlas jira ui-modifications update d7dbda8a --name "Updated Name"
  atlas jira ui-modifications delete d7dbda8a
  atlas jira permissions get-all
  atlas jira permissions check --global-permissions '["ADMINISTER"]'
  atlas jira permissions permitted-projects --permissions '["BROWSE_PROJECTS"]'
  atlas jira pipelines get-build pipeline-abc 42
  atlas jira pipelines delete-build pipeline-abc 42
  atlas jira pipelines get-deployment pipeline-abc env-prod 7
  atlas jira pipelines delete-deployment pipeline-abc env-prod 7
  atlas jira pipelines get-deployment-gating-status pipeline-abc env-prod 7
  atlas jira linked-workspaces list-operations
  atlas jira linked-workspaces bulk-create-operations --workspace-ids ws-1,ws-2
  atlas jira linked-workspaces list-security
  atlas jira linked-workspaces get-security ws-1
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
