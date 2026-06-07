# Jira reference — `atlas jira`

Jira Cloud Platform REST API v3 surface. Load this file when you need a flag or action the canonical examples in `SKILL.md` don't cover.

## Resource × action matrix

| Resource                 | Actions                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `issues`                 | `get`, `create`, `update`, `delete`, `transition`, `transitions`, `get-agile`, `get-estimation`, `set-estimation`, `rank`, `assign`, `get-changelog`, `filter-changelog`, `get-editmeta`, `notify`, `list-properties`, `delete-property`, `get-property`, `set-property`, `delete-all-remotelinks`, `list-remotelinks`, `create-remotelink`, `delete-remotelink`, `get-remotelink`, `update-remotelink`, `remove-vote`, `get-votes`, `add-vote`, `remove-watcher`, `get-watchers`, `add-watcher`, `delete-all-worklogs`, `list-worklogs`, `add-worklog`, `delete-worklog`, `get-worklog`, `update-worklog`, `list-worklog-properties`, `delete-worklog-property`, `get-worklog-property`, `set-worklog-property`, `move-worklog`, `archive-issues`, `archive-issues-jql`, `bulk-fetch`, `get-create-meta`, `get-create-meta-issuetypes`, `get-create-meta-issuetype`, `get-limit-report`, `picker`, `set-properties-by-entity-ids`, `set-properties-multi`, `unarchive-issues`, `watch-issues-bulk`, `export-archived`                                               |
| `projects`               | `list`, `get`, `list-legacy`, `create`, `update`, `delete`, `recent`, `list-types`, `get-type`, `get-accessible-type`, `list-accessible-types`, `get-email`, `set-email`, `get-hierarchy`, `archive`, `set-avatar`, `delete-avatar`, `load-avatar`, `get-avatars`, `get-classification-config`, `delete-classification-level`, `get-classification-level`, `set-classification-level`, `list-components`, `list-all-components`, `delete-async`, `get-features`, `set-feature-state`, `list-properties`, `delete-property`, `get-property`, `set-property`, `restore`, `list-roles`, `delete-role-actors`, `get-role`, `add-role-actors`, `set-role-actors`, `get-role-details`, `get-statuses`, `list-versions`, `list-all-versions`, `get-issue-security-scheme`, `get-notification-scheme`, `get-permission-scheme`, `set-permission-scheme`, `get-security-levels`, `list-categories`, `create-category`, `delete-category`, `get-category`, `update-category`, `get-projects-fields`, `validate-project-key`, `get-valid-project-key`, `get-valid-project-name` |
| `search`                 | `search`, `get`, `approximate-count`, `jql-get`, `jql-post`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `users`                  | `get`, `me`, `search`, `delete`, `create`, `assignable-multi-project`, `assignable`, `bulk`, `bulk-migration`, `reset-columns`, `get-columns`, `set-columns`, `email`, `bulk-emails`, `groups`, `permission-search`, `picker`, `list-properties`, `delete-property`, `get-property`, `set-property`, `search-query`, `search-query-key`, `viewissue-search`, `list`, `list-search`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `issue-types`            | `list`, `get`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `priorities`             | `list`, `get`, `create`, `update`, `delete`, `set-default`, `move`, `search`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `statuses`               | `list`, `bulk-delete`, `bulk-create`, `bulk-update`, `get-issue-type-usages`, `get-project-usages`, `get-workflow-usages`, `by-names`, `search`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `resolutions`            | `list`, `get`, `create`, `update`, `delete`, `set-default`, `move`, `search`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `boards`                 | `list`, `get`, `create`, `delete`, `backlog`, `configuration`, `list-epics`, `epic-issues`, `issues-without-epic`, `get-features`, `toggle-feature`, `get-issues`, `move-issues`, `list-projects`, `list-projects-full`, `list-sprints`, `list-versions`, `sprint-issues`, `list-by-filter`, `list-properties`, `delete-property`, `get-property`, `set-property`, `list-quickfilters`, `get-quickfilter`, `get-reports`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `sprints`                | `get`, `create`, `update`, `delete`, `get-issues`, `partial-update`, `move-issues`, `list-properties`, `get-property`, `set-property`, `delete-property`, `swap`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `epic`                   | `get`, `update`, `issues`, `move-issues`, `rank`, `issues-none`, `remove-issues`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `backlog`                | `move`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `announcement-banner`    | `get`, `update`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `application-properties` | `list`, `set`, `list-advanced-settings`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `application-role`       | `list`, `get`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `configuration`          | `get`, `get-timetracking`, `select-timetracking`, `list-timetracking-providers`, `get-timetracking-options`, `update-timetracking-options`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `data-policy`            | `get-workspace`, `list-projects`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `webhooks`               | `list`, `register`, `refresh`, `list-failed`, `delete`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `status`                 | `list`, `get`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `status-category`        | `list`, `get`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `server-info`            | `get`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `instance`               | `get-license`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `mypermissions`          | `get`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `mypreferences`          | `get`, `set`, `delete`, `get-locale`, `set-locale`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `auditing`               | `list`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `events`                 | `list`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `changelog`              | `bulk-fetch`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `forge`                  | `bulk-panel-action`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `incidents`              | `get`, `delete`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `post-incident-reviews`  | `get`, `delete`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `vulnerability`          | `get`, `delete`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `devopscomponents`       | `get`, `delete`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `groups`                 | `picker`, `get`, `create`, `delete`, `list-bulk`, `list-members`, `add-user`, `remove-user`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `group-user-picker`      | `pick`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `security-level`         | `get`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `license`                | `get-approximate-count`, `get-approximate-count-for-product`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `settings`               | `get-columns`, `set-columns`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `redact`                 | `start`, `get-status`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `flag`                   | `get`, `delete`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `task`                   | `get`, `cancel`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `avatar`                 | `list-system`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `custom-field-option`    | `get`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `classification-levels`  | `list`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `latest`                 | `bulk-worklog`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `remote-link`            | `get`, `delete`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `service-registry`       | `get`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `addons`                 | `list-properties`, `get-property`, `set-property`, `delete-property`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `exists-by-properties`   | `get`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `repository`             | `get`, `delete`, `delete-entity`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `app`                    | `get-field-context-configuration`, `update-field-context-configuration`, `update-field-value`, `list-field-context-configurations`, `bulk-update-field-value`, `get-dynamic-modules`, `register-dynamic-modules`, `delete-dynamic-modules`, `list-forge-properties`, `get-forge-property`, `set-forge-property`, `delete-forge-property`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `dashboards`             | `list`, `get`, `create`, `update`, `delete`, `list-gadgets`, `add-gadget`, `update-gadget`, `remove-gadget`, `list-item-properties`, `get-item-property`, `set-item-property`, `delete-item-property`, `copy`, `bulk-edit`, `list-available-gadgets`, `search`, `search-all`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `issue-attachments`      | `list`, `get`, `delete`, `expand-human`, `expand-raw`, `download-content`, `get-meta`, `download-thumbnail`, `upload`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `component`              | `list`, `create`, `get`, `update`, `delete`, `related-issue-counts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `filters`                | `search`, `get`, `create`, `update`, `delete`, `list-favourites`, `list-my`, `add-favourite`, `remove-favourite`, `change-owner`, `get-columns`, `set-columns`, `reset-columns`, `list-permissions`, `add-permission`, `get-permission`, `delete-permission`, `get-default-share-scope`, `set-default-share-scope`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `permission-schemes`     | `list`, `get`, `create`, `update`, `delete`, `list-permissions`, `create-permission`, `get-permission`, `delete-permission`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `issue-type-schemes`     | `list`, `list-mapping`, `list-project`, `create`, `update`, `delete`, `add-issue-types`, `remove-issue-type`, `move-issue-types`, `assign-to-project`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `notification-schemes`   | `list`, `create`, `get`, `update`, `add-notifications`, `delete`, `remove-notification`, `list-projects`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `roles`                  | `list`, `get`, `create`, `update`, `partial-update`, `delete`, `get-actors`, `add-actors`, `delete-actors`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `issue-comments`         | `list`, `get`, `create`, `update`, `delete`, `list-properties`, `get-property`, `set-property`, `delete-property`, `bulk-fetch`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `labels`                 | `list`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `fieldconfiguration`     | `list`, `create`, `delete`, `update`, `list-fields`, `update-fields`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `priority-schemes`       | `list`, `create`, `delete`, `update`, `list-priorities`, `list-projects`, `suggested-mappings`, `available-priorities`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `version`                | `create`, `get`, `update`, `delete`, `merge`, `move`, `related-issue-counts`, `list-related-work`, `create-related-work`, `update-related-work`, `delete-and-replace`, `unresolved-issue-count`, `delete-related-work`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `config`                 | `list`, `create`, `delete`, `get`, `update`, `clone`, `list-fields`, `get-field-parameters`, `list-projects`, `remove-field-associations`, `update-field-associations`, `remove-field-parameters`, `update-field-parameters`, `get-projects-with-schemes`, `associate-projects`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `issuesecurityschemes`   | `get-all`, `create`, `get`, `update`, `list-members`, `delete`, `add-levels`, `remove-level`, `update-level`, `add-level-members`, `remove-level-member`, `list-levels`, `set-default-levels`, `list-level-members`, `list-projects`, `associate-to-project`, `search`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `screens`                | `list`, `create`, `delete`, `update`, `list-available-fields`, `list-tabs`, `create-tab`, `delete-tab`, `update-tab`, `list-tab-fields`, `add-field-to-tab`, `remove-field-from-tab`, `move-field`, `move-tab`, `add-to-default`, `list-all-tabs`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `screenscheme`           | `list`, `list-all`, `create`, `update`, `delete`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `plans`                  | `list`, `create`, `get`, `update`, `archive`, `duplicate`, `list-teams`, `add-atlassian-team`, `delete-atlassian-team`, `get-atlassian-team`, `update-atlassian-team`, `create-plan-only-team`, `delete-plan-only-team`, `get-plan-only-team`, `update-plan-only-team`, `trash`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `workflowscheme`         | `list`, `create`, `delete`, `get`, `update`, `delete-default`, `get-default`, `set-default`, `delete-issuetype`, `get-issuetype`, `set-issuetype`, `delete-workflow`, `get-workflow`, `set-workflow`, `project-usages`, `list-by-project`, `assign-project`, `switch-project`, `create-draft`, `delete-draft`, `get-draft`, `update-draft`, `delete-draft-default`, `get-draft-default`, `set-draft-default`, `delete-draft-issuetype`, `get-draft-issuetype`, `set-draft-issuetype`, `publish-draft`, `delete-draft-workflow`, `get-draft-workflow`, `set-draft-workflow`, `bulk-read`, `bulk-update`, `bulk-mappings`                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `workflows`              | `list`, `get`, `delete`, `issue-type-usages`, `project-usages`, `workflow-scheme-usages`, `bulk-get`, `capabilities`, `bulk-create`, `validate-create`, `default-editor`, `read-history`, `list-history`, `get-rule-config`, `update-rule-config`, `delete-rule-config`, `delete-transition-property`, `get-transition-properties`, `create-transition-property`, `update-transition-property`, `preview`, `search`, `update`, `validate-update`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `fields`                 | `field-list`, `field-list-all`, `field-create`, `field-update`, `field-delete`, `context-list`, `context-create`, `context-update`, `context-delete`, `context-option-list`, `context-option-create`, `context-option-update`, `context-option-delete`, `context-option-replace-issues`, `context-option-move`, `context-issuetype-set`, `context-issuetype-remove`, `context-issuetype-mapping`, `context-default-list`, `context-default-set`, `context-project-set`, `context-project-remove`, `context-mapping`, `context-project-mapping`, `field-option-list`, `field-option-create`, `field-option-delete`, `field-option-get`, `field-option-update`, `field-option-replace-issues`, `field-option-suggestions-edit`, `field-option-suggestions-search`, `field-project-associations`, `field-screens`, `field-restore`, `field-trash`, `field-remove-associations`, `field-create-associations`, `field-trash-list`                                                                                                                                         |
| `jql`                    | `autocomplete-data`, `autocomplete-data-post`, `autocomplete-suggestions`, `get-precomputations`, `update-precomputations`, `get-precomputations-by-id`, `match-issues`, `parse`, `migrate-queries`, `sanitize`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `issuelinktype`          | `list`, `get`, `create`, `update`, `delete`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `issue-link`             | `create`, `get`, `delete`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `project-template`       | `create`, `edit-template`, `live-template`, `remove-template`, `save-template`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `universal-avatar`       | `list`, `store`, `delete`, `view-by-type`, `view-by-id`, `view-by-owner`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `worklog`                | `deleted`, `list`, `updated`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `ui-modifications`       | `list`, `list-all`, `create`, `update`, `delete`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `permissions`            | `get-all`, `check`, `permitted-projects`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `linked-workspaces`      | `list-operations`, `bulk-delete-operations`, `bulk-create-operations`, `list-security`, `get-security`, `bulk-delete-security`, `bulk-create-security`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `bulk`                   | `create-issues`, `delete-issues`, `get-fields`, `edit-fields`, `move-issues`, `get-transitions`, `transition-issues`, `unwatch-issues`, `watch-issues`, `get-status`, `set-property`, `delete-property`, `submit-builds`, `submit-deployments`, `submit-devinfo`, `submit-devops-components`, `submit-feature-flags`, `submit-operations`, `submit-remote-links`, `submit-security`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `bulk-by-properties`     | `delete-builds`, `delete-deployments`, `delete-devinfo`, `delete-devops-components`, `delete-feature-flags`, `delete-operations`, `delete-remote-links`, `delete-security`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `migration`              | `get-task`, `submit-task`, `update-fields`, `update-properties`, `search-workflow-rules`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

## `issue-type-schemes`

Issue type scheme management (B566–B575). Covers the full `/rest/api/3/issuetypescheme` surface.

| Action              | Positional                          | Required flags                                                       | Optional flags                                                       |
| ------------------- | ----------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `list`              | —                                   | —                                                                    | `--start-at`, `--max-results`, `--ids` (CSV scheme IDs)              |
| `list-mapping`      | —                                   | —                                                                    | `--start-at`, `--max-results`, `--scheme-ids` (CSV scheme IDs)       |
| `list-project`      | —                                   | —                                                                    | `--start-at`, `--max-results`, `--project-ids` (CSV)                 |
| `create`            | —                                   | `--name`                                                             | `--description`, `--default-issue-type-id`, `--issue-type-ids` (CSV) |
| `update`            | `<issueTypeSchemeId>`               | at least one of `--name`, `--description`, `--default-issue-type-id` | —                                                                    |
| `delete`            | `<issueTypeSchemeId>`               | —                                                                    | —                                                                    |
| `add-issue-types`   | `<issueTypeSchemeId>`               | `--issue-type-ids` (CSV)                                             | —                                                                    |
| `remove-issue-type` | `<issueTypeSchemeId> <issueTypeId>` | —                                                                    | —                                                                    |
| `move-issue-types`  | `<issueTypeSchemeId>`               | `--issue-type-ids` (CSV)                                             | `--position` (First\|Last), `--after` (issueTypeId)                  |
| `assign-to-project` | —                                   | `--scheme-id`, `--project-id`                                        | —                                                                    |

```bash
# List all schemes (paginated)
atlas jira issue-type-schemes list --start-at 0 --max-results 50

# List specific schemes by ID
atlas jira issue-type-schemes list --ids 10000,10001

# Create a scheme
atlas jira issue-type-schemes create --name "Software Development" --description "Default for dev" --default-issue-type-id 10001 --issue-type-ids 10001,10002,10003

# Update a scheme
atlas jira issue-type-schemes update 10000 --name "Updated Scheme" --description "New description"

# Delete a scheme
atlas jira issue-type-schemes delete 10000

# Add issue types to a scheme
atlas jira issue-type-schemes add-issue-types 10000 --issue-type-ids 10005,10006

# Remove an issue type from a scheme
atlas jira issue-type-schemes remove-issue-type 10000 10005

# Move issue types to the top
atlas jira issue-type-schemes move-issue-types 10000 --issue-type-ids 10001,10002 --position First

# Move issue types after another
atlas jira issue-type-schemes move-issue-types 10000 --issue-type-ids 10003 --after 10002

# Get scheme-to-issue-type mapping
atlas jira issue-type-schemes list-mapping --scheme-ids 10000,10001

# Get project-to-scheme mapping
atlas jira issue-type-schemes list-project --project-ids 10100,10101

# Assign a scheme to a project
atlas jira issue-type-schemes assign-to-project --scheme-id 10000 --project-id 10100
```

## `fieldconfiguration`

Issue field configuration management (B908–B913). Covers the flat `/rest/api/3/fieldconfiguration` surface. Marked deprecated by Atlassian but still operational on Jira Cloud.

| Action          | Positional | Required flags                             | Optional flags                                                          |
| --------------- | ---------- | ------------------------------------------ | ----------------------------------------------------------------------- |
| `list`          | —          | —                                          | `--start-at`, `--max-results`, `--ids` (CSV), `--is-default`, `--query` |
| `create`        | —          | `--name`                                   | `--description`                                                         |
| `update`        | `<id>`     | `--name`                                   | `--description`                                                         |
| `delete`        | `<id>`     | —                                          | —                                                                       |
| `list-fields`   | `<id>`     | —                                          | `--start-at`, `--max-results`                                           |
| `update-fields` | `<id>`     | `--field-configuration-items` (JSON array) | —                                                                       |

```bash
# Paginate all field configurations
atlas jira fieldconfiguration list --start-at 0 --max-results 50

# Filter by IDs, default-flag, or substring
atlas jira fieldconfiguration list --ids 10000,10001 --is-default
atlas jira fieldconfiguration list --query "default"

# Create a configuration
atlas jira fieldconfiguration create --name "My Configuration" --description "A new field configuration"

# Update a configuration (API requires both name and id)
atlas jira fieldconfiguration update 10001 --name "Renamed" --description "Updated description"

# Delete a configuration
atlas jira fieldconfiguration delete 10001

# Paginate field items inside a configuration
atlas jira fieldconfiguration list-fields 10001 --start-at 0 --max-results 50

# Bulk-update field items (JSON array of {id, description?, isHidden?, isRequired?, renderer?})
atlas jira fieldconfiguration update-fields 10001 --field-configuration-items '[{"id":"customfield_10010","isHidden":false,"isRequired":true}]'
```

## `notification-schemes`

Notification scheme management (B605–B612). Covers the full `/rest/api/3/notificationscheme` surface: paginated listing, CRUD, notification membership management, and project-association queries.

| Action                | Positional                                | Required flags                            | Optional flags                                                                                    |
| --------------------- | ----------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `list`                | —                                         | —                                         | `--start-at`, `--max-results`, `--ids` (CSV), `--project-ids` (CSV), `--expand`, `--only-default` |
| `create`              | —                                         | `--name`                                  | `--description`, `--notification-scheme-events` (JSON)                                            |
| `get`                 | `<notificationSchemeId>`                  | —                                         | `--expand`                                                                                        |
| `update`              | `<notificationSchemeId>`                  | at least one of `--name`, `--description` | —                                                                                                 |
| `add-notifications`   | `<notificationSchemeId>`                  | `--notification-scheme-events` (JSON)     | —                                                                                                 |
| `delete`              | `<notificationSchemeId>`                  | —                                         | —                                                                                                 |
| `remove-notification` | `<notificationSchemeId> <notificationId>` | —                                         | —                                                                                                 |
| `list-projects`       | —                                         | —                                         | `--start-at`, `--max-results`, `--project-ids` (CSV)                                              |

- `--notification-scheme-events` is a **JSON array** of `{ event: { id }, notifications: [ ... ] }` entries. Each notification has a `notificationType` (e.g. `CurrentAssignee`, `Group`, `User`, `ProjectLead`, `EmailAddress`) and an optional `parameter` (group name, accountId, email, etc.).
- `--expand` accepts the standard server-side expander keys, most commonly `notificationSchemeEvents`, `user`, `group`, `projectRole`, `field`, `all`.
- `--only-default` (boolean) restricts the list to default schemes.
- `update` is `PUT` 204 No Content — only `name` and `description` are mutable.
- `add-notifications` is `PUT` 204 — appends events/notifications to an existing scheme without replacing existing entries.
- `remove-notification` deletes a single notification entry by its server-assigned `notificationId`.
- `list-projects` returns the per-project `{ notificationSchemeId, projectId }` mapping; combine with `--project-ids` to filter.

```bash
# List notification schemes (paginated)
atlas jira notification-schemes list --start-at 0 --max-results 50

# List specific schemes with their events expanded
atlas jira notification-schemes list --ids 10000,10001 --expand notificationSchemeEvents

# Get one scheme by ID
atlas jira notification-schemes get 10000 --expand notificationSchemeEvents

# Create a scheme with initial events
atlas jira notification-schemes create --name "Default" --description "Default scheme" \
  --notification-scheme-events '[{"event":{"id":"1"},"notifications":[{"notificationType":"CurrentAssignee"},{"notificationType":"Group","parameter":"jira-users"}]}]'

# Rename a scheme
atlas jira notification-schemes update 10000 --name "Renamed"

# Append more event notifications
atlas jira notification-schemes add-notifications 10000 \
  --notification-scheme-events '[{"event":{"id":"2"},"notifications":[{"notificationType":"Reporter"}]}]'

# Remove a single notification entry
atlas jira notification-schemes remove-notification 10000 5

# Delete a scheme
atlas jira notification-schemes delete 10000

# List scheme-to-project associations
atlas jira notification-schemes list-projects --project-ids 10100,10101
```

## `app`

App-scoped resource grouping three distinct API surfaces used by Forge and Atlassian Connect apps:

- **`/rest/api/3/app/field/...`** — app-defined custom field context/value (B326–B330).
- **`/rest/atlassian-connect/1/app/module/dynamic`** — Connect dynamic modules (B943–B945).
- **`/rest/forge/1/app/properties`** — Forge app-scoped property storage (B975–B978).

Most actions require Forge/Connect-issued credentials (OAuth 2.0 3LO scopes or Connect JWT). Basic auth with an API token will return `401`/`403` on every action.

| Action                               | Positional       | Required flags                                         | Optional flags  |
| ------------------------------------ | ---------------- | ------------------------------------------------------ | --------------- |
| `get-field-context-configuration`    | `<fieldIdOrKey>` | —                                                      | —               |
| `update-field-context-configuration` | `<fieldIdOrKey>` | at least one of `--configuration`, `--schema`          | —               |
| `update-field-value`                 | `<fieldIdOrKey>` | `--value`                                              | —               |
| `list-field-context-configurations`  | —                | at least one of `--field-ids-or-keys`, `--context-ids` | —               |
| `bulk-update-field-value`            | —                | `--value`                                              | —               |
| `get-dynamic-modules`                | —                | —                                                      | —               |
| `register-dynamic-modules`           | —                | `--value`                                              | —               |
| `delete-dynamic-modules`             | —                | —                                                      | `--module-keys` |
| `list-forge-properties`              | —                | —                                                      | —               |
| `get-forge-property`                 | `<propertyKey>`  | —                                                      | —               |
| `set-forge-property`                 | `<propertyKey>`  | `--value`                                              | —               |
| `delete-forge-property`              | `<propertyKey>`  | —                                                      | —               |

- `--configuration` and `--schema` accept opaque JSON; the server stores them verbatim. At least one of the two must be supplied.
- `--value` for `update-field-value` is a JSON array of `{ issueIds | issueIdsOrKeys | issueKeys, value }` entries.
- `--value` for `bulk-update-field-value` is a JSON array of `{ fieldIdOrKey, updates: [...] }` entries.
- `--value` for `register-dynamic-modules` is a JSON array of Connect module descriptors (each `{ key, type, ... }`).
- `--value` for `set-forge-property` is any JSON value (stored verbatim and returned as-is by `get-forge-property`).
- `--module-keys` is comma-separated. When omitted, `delete-dynamic-modules` removes every dynamic module registered by the calling app.
- `--field-ids-or-keys` and `--context-ids` are comma-separated. At least one must be supplied for `list-field-context-configurations`.

```sh
# Read the configuration the app stored for one of its custom fields
atlas jira app get-field-context-configuration customfield_10042

# Update the configuration JSON (and optionally the schema)
atlas jira app update-field-context-configuration customfield_10042 \
  --configuration '{"foo":true}' --schema '{"type":"object"}'

# Set a single field on a batch of issues
atlas jira app update-field-value customfield_10042 \
  --value '[{"issueIds":[10001,10002],"value":"hello"}]'

# Fetch configurations for a set of (field, context) pairs
atlas jira app list-field-context-configurations \
  --field-ids-or-keys customfield_10042 --context-ids 10100,10101

# Bulk-update many fields in one request
atlas jira app bulk-update-field-value \
  --value '[{"fieldIdOrKey":"customfield_10042","updates":[{"issueIds":[10001],"value":"hi"}]}]'

# List dynamic Connect modules registered by the calling app
atlas jira app get-dynamic-modules

# Register dynamic Connect modules
atlas jira app register-dynamic-modules \
  --value '[{"key":"my-module","type":"webhook"}]'

# Delete specific dynamic Connect modules (omit --module-keys to delete all)
atlas jira app delete-dynamic-modules --module-keys my-module,other-module

# Forge app property storage
atlas jira app list-forge-properties
atlas jira app get-forge-property my-key
atlas jira app set-forge-property my-key --value '{"on":true}'
atlas jira app delete-forge-property my-key
```

## `incidents`

**URL base:** `/rest/operations/1.0` (Jira Operations / JSM Incident Management API — not `/rest/api/3`).

| Action   | Positional     | Required flags | Optional flags |
| -------- | -------------- | -------------- | -------------- |
| `get`    | `<incidentId>` | —              | —              |
| `delete` | `<incidentId>` | —              | —              |

```sh
# Get an incident by ID
atlas jira incidents get INC-123

# Delete an incident by ID
atlas jira incidents delete INC-123
```

## `post-incident-reviews`

**URL base:** `/rest/operations/1.0` (Jira Operations / JSM Incident Management API — not `/rest/api/3`).

| Action   | Positional   | Required flags | Optional flags |
| -------- | ------------ | -------------- | -------------- |
| `get`    | `<reviewId>` | —              | —              |
| `delete` | `<reviewId>` | —              | —              |

```sh
# Get a post-incident review by ID
atlas jira post-incident-reviews get PIR-456

# Delete a post-incident review by ID
atlas jira post-incident-reviews delete PIR-456
```

## `vulnerability`

**URL base:** `/rest/security/1.0` (Jira Security API — not `/rest/api/3`).

| Action   | Positional          | Required flags | Optional flags |
| -------- | ------------------- | -------------- | -------------- |
| `get`    | `<vulnerabilityId>` | —              | —              |
| `delete` | `<vulnerabilityId>` | —              | —              |

```sh
# Get a vulnerability by ID
atlas jira vulnerability get VULN-789

# Delete a vulnerability by ID
atlas jira vulnerability delete VULN-789
```

## `devopscomponents`

**URL base:** `/rest/devopscomponents/1.0` (Jira DevOps Components API — not `/rest/api/3`).

| Action   | Positional      | Required flags | Optional flags |
| -------- | --------------- | -------------- | -------------- |
| `get`    | `<componentId>` | —              | —              |
| `delete` | `<componentId>` | —              | —              |

```sh
# Get a DevOps component by ID
atlas jira devopscomponents get COMP-101

# Delete a DevOps component by ID
atlas jira devopscomponents delete COMP-101
```

## `application-role`

| Action | Positional | Required flags | Optional flags |
| ------ | ---------- | -------------- | -------------- |
| `list` | —          | —              | —              |
| `get`  | —          | `--key`        | —              |

```sh
# List all application roles
atlas jira application-role list

# Get a specific application role by key
atlas jira application-role get --key jira-software
```

## `data-policy`

| Action          | Positional | Required flags | Optional flags                         |
| --------------- | ---------- | -------------- | -------------------------------------- |
| `get-workspace` | —          | —              | —                                      |
| `list-projects` | —          | —              | `--ids`, `--start-at`, `--max-results` |

- `get-workspace` returns `{ anyContentBlocked: boolean }` for the entire Jira workspace.
- `list-projects` returns a paginated list of per-project data policy entries. Each entry has `projectId` and `anyContentBlocked`.
- `--ids` is a **comma-separated** list of project IDs to filter by. Omit to return all projects.
- `--start-at` and `--max-results` control offset-based pagination.

```sh
# Check whether any content is blocked at workspace level
atlas jira data-policy get-workspace

# List data policies for all projects
atlas jira data-policy list-projects

# List data policies for specific projects
atlas jira data-policy list-projects --ids 10001,10002

# Paginate through project data policies
atlas jira data-policy list-projects --start-at 0 --max-results 50
```

## `announcement-banner`

| Action   | Positional | Required flags | Optional flags              |
| -------- | ---------- | -------------- | --------------------------- |
| `get`    | —          | —              | —                           |
| `update` | —          | —              | `--message`, `--visibility` |

- `--visibility` must be `PUBLIC` or `PRIVATE`.
- All `update` fields are optional — supply only the fields you want to change.

```sh
# Get the current announcement banner
atlas jira announcement-banner get

# Update the banner message
atlas jira announcement-banner update --message "Scheduled maintenance tonight at 22:00 UTC"

# Set the banner to private and change message
atlas jira announcement-banner update --message "Internal notice" --visibility PRIVATE
```

## `component`

Jira project components — flat `/rest/api/3/component` surface (B361–B366).

| Action                 | Positional      | Required flags                                                                                        | Optional flags                                                                                                                       |
| ---------------------- | --------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `list`                 | —               | —                                                                                                     | `--project-ids-or-keys`, `--start-at`, `--max-results`, `--order-by`, `--query`                                                      |
| `create`               | —               | `--name`                                                                                              | `--description`, `--lead-account-id`, `--lead-user-name`, `--assignee-type`, `--is-assignee-type-valid`, `--project`, `--project-id` |
| `get`                  | `<componentId>` | —                                                                                                     | —                                                                                                                                    |
| `update`               | `<componentId>` | at least one of `--name`, `--description`, `--lead-account-id`, `--lead-user-name`, `--assignee-type` | —                                                                                                                                    |
| `delete`               | `<componentId>` | —                                                                                                     | `--move-issues-to`                                                                                                                   |
| `related-issue-counts` | `<componentId>` | —                                                                                                     | —                                                                                                                                    |

- `--project-ids-or-keys` is comma-separated (e.g. `--project-ids-or-keys HSP,PROJ`).
- `--assignee-type` must be one of: `PROJECT_DEFAULT`, `COMPONENT_LEAD`, `PROJECT_LEAD`, `UNASSIGNED`.
- `--lead-user-name` is deprecated by Atlassian — prefer `--lead-account-id`.
- `create` requires either `--project` (project key) or `--project-id` (numeric id) for the component owner.
- `delete --move-issues-to <id>` reassigns issues currently using the deleted component to another component instead of leaving them component-less.

```sh
# List all components across two projects, paginated
atlas jira component list --project-ids-or-keys HSP,PROJ --max-results 25

# Create a component owned by project HSP
atlas jira component create --name "Auth" --project HSP --lead-account-id 5b10a2844c20165700ede21g --assignee-type PROJECT_LEAD

# Get a single component
atlas jira component get 10000

# Rename a component
atlas jira component update 10000 --name "Authentication"

# Delete a component and reassign its issues to another component
atlas jira component delete 10000 --move-issues-to 10001

# Get the open-issue count for a component
atlas jira component related-issue-counts 10000
```

## `application-properties`

Global key/value settings exposed under `/rest/api/3/application-properties` (B331–B333).

| Action                   | Positional | Required flags | Optional flags                                |
| ------------------------ | ---------- | -------------- | --------------------------------------------- |
| `list`                   | `[key]`    | —              | `--key`, `--permission-level`, `--key-filter` |
| `set`                    | `<id>`     | `--value`      | —                                             |
| `list-advanced-settings` | —          | —              | —                                             |

- `list` returns an array even when filtered to a single property; passing a positional `<key>` is equivalent to `--key <key>`.
- `--permission-level` accepts the server-defined permission tier string (passed through unchanged so the server can evolve the enum). Typical values include `SYSADMIN`.
- `--key-filter` is a regex applied server-side to property keys.
- `set` updates the value of a single property; the server returns the updated property record.
- `list-advanced-settings` returns the administrator-only subset (matches the Jira admin "advanced settings" sub-page).

```sh
# Get a single property by key
atlas jira application-properties list --key jira.home

# Filter by regex
atlas jira application-properties list --key-filter "^jira\\.title$"

# Filter by permission level
atlas jira application-properties list --permission-level SYSADMIN

# Update a property value
atlas jira application-properties set jira.title --value "My Jira"

# List admin-only advanced settings
atlas jira application-properties list-advanced-settings
```

## `configuration`

Global Jira instance configuration and time-tracking settings under `/rest/api/3/configuration` (B382–B387).

| Action                        | Positional | Required flags | Optional flags                                                                          |
| ----------------------------- | ---------- | -------------- | --------------------------------------------------------------------------------------- |
| `get`                         | —          | —              | —                                                                                       |
| `get-timetracking`            | —          | —              | —                                                                                       |
| `select-timetracking`         | —          | `--key`        | `--name`, `--url`                                                                       |
| `list-timetracking-providers` | —          | —              | —                                                                                       |
| `get-timetracking-options`    | —          | —              | —                                                                                       |
| `update-timetracking-options` | —          | —              | `--working-hours-per-day`, `--working-days-per-week`, `--time-format`, `--default-unit` |

- `get` returns the instance-level feature flags (voting, watching, sub-tasks, time tracking, attachments, issue linking) and the embedded `timeTrackingConfiguration` when time tracking is enabled.
- `get-timetracking` returns the currently selected provider; `list-timetracking-providers` returns every installed provider. The built-in provider key is `JIRA`.
- `select-timetracking --key <key>` switches the active provider; `--name` and `--url` may be supplied for third-party providers that require them.
- `--time-format` accepts: `pretty`, `days`, `hours`.
- `--default-unit` accepts: `minute`, `hour`, `day`, `week`.
- `update-timetracking-options` requires at least one of the four optional flags; the server returns the resulting `TimeTrackingConfiguration`.

```sh
# Global instance configuration (feature flags + time tracking)
atlas jira configuration get

# Inspect the currently selected time-tracking provider
atlas jira configuration get-timetracking

# Select the built-in provider
atlas jira configuration select-timetracking --key JIRA

# List every installed time-tracking provider
atlas jira configuration list-timetracking-providers

# Current display/calculation options
atlas jira configuration get-timetracking-options

# Set the working day to 8 hours with the pretty time format
atlas jira configuration update-timetracking-options --working-hours-per-day 8 --time-format pretty

# Update working week and default unit
atlas jira configuration update-timetracking-options --working-days-per-week 5 --default-unit hour
```

## `issues`

### Standard (v3 API)

| Action        | Positional   | Required flags                     | Optional flags         |
| ------------- | ------------ | ---------------------------------- | ---------------------- |
| `get`         | `<issueKey>` | —                                  | `--fields`, `--expand` |
| `create`      | —            | `--project`, `--type`, `--summary` | —                      |
| `update`      | `<issueKey>` | —                                  | `--summary`            |
| `delete`      | `<issueKey>` | —                                  | —                      |
| `transitions` | `<issueKey>` | —                                  | —                      |
| `transition`  | `<issueKey>` | `--transition-id`                  | —                      |

- `--fields` and `--expand` are **comma-separated**, single flag. Example: `--fields summary,status,assignee --expand changelog,renderedFields`.
- `--project` takes the project key (e.g. `PROJ`), not the numeric ID.
- `--type` takes the issue type name (e.g. `Bug`, `Story`, `Task`). Names are case-sensitive and tenant-specific; list with `atlas jira issue-types list`.
- `update` via the CLI is intentionally narrow — only `--summary` is wired. Use the SDK for description, assignee, custom fields, ADF body content.
- Transition workflow: call `transitions` to list valid transitions for an issue's current status, then `transition` with the chosen `--transition-id`.

### Assignee (B478)

| Action   | Positional   | Required flags | Optional flags |
| -------- | ------------ | -------------- | -------------- |
| `assign` | `<issueKey>` | —              | `--account-id` |

- `assign` sets the assignee to the user identified by `--account-id`.
- **Omit `--account-id` to unassign** the issue (sends `accountId: null`).

```sh
# Assign an issue to a user
atlas jira issues assign PROJ-42 --account-id 5b10ac8d82e05b22cc7d4ef5

# Unassign an issue (omit --account-id)
atlas jira issues assign PROJ-42
```

### Changelog & Edit Metadata (B480, B481, B487)

| Action             | Positional   | Required flags | Optional flags                |
| ------------------ | ------------ | -------------- | ----------------------------- |
| `get-changelog`    | `<issueKey>` | —              | `--start-at`, `--max-results` |
| `filter-changelog` | `<issueKey>` | `--ids`        | —                             |
| `get-editmeta`     | `<issueKey>` | —              | —                             |

- `get-changelog` is offset-paginated via `--start-at` / `--max-results`.
- `filter-changelog` `--ids` is a **comma-separated** list of positive-integer changelog entry IDs.
- `get-editmeta` returns the fields editable on the issue (with allowed values) — inspect before `update`.

```sh
atlas jira issues get-changelog PROJ-42 --start-at 0 --max-results 50
atlas jira issues filter-changelog PROJ-42 --ids 10001,10002
atlas jira issues get-editmeta PROJ-42
```

### Notifications (B488)

| Action   | Positional   | Required flags  | Optional flags |
| -------- | ------------ | --------------- | -------------- |
| `notify` | `<issueKey>` | `--body` (JSON) | —              |

- `--body` is a JSON object matching `IssueNotifyData`: `{ subject?, textBody?, htmlBody?, to?, restrict? }`. `to` selects recipients (e.g. `{ "reporter": true, "assignee": true, "users": [{ "accountId": "5b10..." }] }`); `restrict` limits delivery by group or permission.

```sh
atlas jira issues notify PROJ-42 --body '{"subject":"Heads up","textBody":"Please review","to":{"assignee":true,"reporter":true}}'
```

### Issue Properties (B489–B492)

| Action            | Positional                   | Required flags   | Optional flags |
| ----------------- | ---------------------------- | ---------------- | -------------- |
| `list-properties` | `<issueKey>`                 | —                | —              |
| `get-property`    | `<issueKey>` `<propertyKey>` | —                | —              |
| `set-property`    | `<issueKey>` `<propertyKey>` | `--value` (JSON) | —              |
| `delete-property` | `<issueKey>` `<propertyKey>` | —                | —              |

- `--value` for `set-property` is arbitrary JSON (object, array, string, number, or boolean).

```sh
atlas jira issues list-properties PROJ-42
atlas jira issues get-property PROJ-42 my-key
atlas jira issues set-property PROJ-42 my-key --value '{"flagged":true}'
atlas jira issues delete-property PROJ-42 my-key
```

### Remote Links (B493–B498)

Issue-scoped remote links at `/rest/api/3/issue/{issueIdOrKey}/remotelink`. **Distinct** from the standalone `remote-link` resource (Remote Links integration API at `/rest/remotelinks/1.0`) documented later in this file.

| Action                   | Positional              | Required flags  | Optional flags |
| ------------------------ | ----------------------- | --------------- | -------------- |
| `list-remotelinks`       | `<issueKey>`            | —               | `--global-id`  |
| `get-remotelink`         | `<issueKey>` `<linkId>` | —               | —              |
| `create-remotelink`      | `<issueKey>`            | `--body` (JSON) | —              |
| `update-remotelink`      | `<issueKey>` `<linkId>` | `--body` (JSON) | —              |
| `delete-remotelink`      | `<issueKey>` `<linkId>` | —               | —              |
| `delete-all-remotelinks` | `<issueKey>`            | —               | `--global-id`  |

- `list-remotelinks` returns **all remote links on the issue**; pass `--global-id` to fetch only the link with that global ID.
- `--body` for `create-remotelink` / `update-remotelink` is a JSON object matching `CreateRemoteLinkData`: `{ object: { url, title, summary?, icon?, status? }, globalId?, relationship?, application? }`. `object.url` and `object.title` are the practical minimum.
- `delete-all-remotelinks` deletes every remote link on the issue, or only the one matching `--global-id`.

```sh
# Get (list) all remote links on an issue
atlas jira issues list-remotelinks PROJ-42

# Get only the remote link with a given global ID
atlas jira issues list-remotelinks PROJ-42 --global-id "system=https://example.com/123"

# Get a single remote link by its numeric link ID
atlas jira issues get-remotelink PROJ-42 10001

# Create a remote link (object.url + object.title are the minimum)
atlas jira issues create-remotelink PROJ-42 --body '{"object":{"url":"https://example.com/ticket/1","title":"Upstream ticket"}}'

# Update a remote link
atlas jira issues update-remotelink PROJ-42 10001 --body '{"object":{"url":"https://example.com/ticket/1","title":"Renamed"}}'

# Delete one remote link, or all of them
atlas jira issues delete-remotelink PROJ-42 10001
atlas jira issues delete-all-remotelinks PROJ-42
```

### Votes (B499–B501)

| Action        | Positional   | Required flags | Optional flags |
| ------------- | ------------ | -------------- | -------------- |
| `get-votes`   | `<issueKey>` | —              | —              |
| `add-vote`    | `<issueKey>` | —              | —              |
| `remove-vote` | `<issueKey>` | —              | —              |

- `add-vote` / `remove-vote` act as the **current (authenticated) user** — there is no account selector.

```sh
atlas jira issues get-votes PROJ-42
atlas jira issues add-vote PROJ-42
atlas jira issues remove-vote PROJ-42
```

### Watchers (B502–B504)

| Action           | Positional   | Required flags | Optional flags |
| ---------------- | ------------ | -------------- | -------------- |
| `get-watchers`   | `<issueKey>` | —              | —              |
| `add-watcher`    | `<issueKey>` | `--account-id` | —              |
| `remove-watcher` | `<issueKey>` | —              | `--account-id` |

- `add-watcher` requires `--account-id` — the user to start watching the issue.
- `remove-watcher` without `--account-id` removes the **current user**; pass `--account-id` to remove a specific watcher.

```sh
atlas jira issues get-watchers PROJ-42
atlas jira issues add-watcher PROJ-42 --account-id 5b10ac8d82e05b22cc7d4ef5
atlas jira issues remove-watcher PROJ-42 --account-id 5b10ac8d82e05b22cc7d4ef5
```

### Agile (v1.0 API) — B265–B268

These actions hit `/rest/agile/1.0/issue/…` and return agile-enriched shapes (sprint membership, estimation fields).

| Action           | Positional   | Required flags | Optional flags                          |
| ---------------- | ------------ | -------------- | --------------------------------------- |
| `get-agile`      | `<issueKey>` | —              | —                                       |
| `get-estimation` | `<issueKey>` | —              | `--board-id`                            |
| `set-estimation` | `<issueKey>` | `--value`      | `--board-id`                            |
| `rank`           | —            | `--issues`     | `--before`, `--after`, `--custom-field` |

- `get-agile` returns the issue with agile fields (sprint, epic link, estimation) populated — a superset of `issues get` for boards context.
- `get-estimation` / `set-estimation`: `--board-id` selects which board's estimation field configuration to use. Required when multiple boards with different field configs share the same project.
- `--value` for `set-estimation` is a **string** (e.g. `--value 5`). Pass `--value null` to clear the estimate.
- `rank --issues` is **comma-separated** issue keys or IDs (e.g. `--issues PROJ-1,PROJ-2`).
- `--before` and `--after` are **mutually exclusive** — rank the issues immediately before or after the named reference issue.
- `--custom-field` is the numeric ID of the rank custom field when the board uses a non-default rank field.

```sh
# Get agile view of an issue (includes sprint, estimation, epic)
atlas jira issues get-agile PROJ-42

# Get the estimation for an issue (board-specific estimation field)
atlas jira issues get-estimation PROJ-42 --board-id 1

# Set estimation to 5 story points on board 1
atlas jira issues set-estimation PROJ-42 --value 5 --board-id 1

# Clear the estimation
atlas jira issues set-estimation PROJ-42 --value null

# Rank PROJ-1 and PROJ-2 immediately before PROJ-3
atlas jira issues rank --issues PROJ-1,PROJ-2 --before PROJ-3

# Rank PROJ-1 immediately after PROJ-5
atlas jira issues rank --issues PROJ-1 --after PROJ-5
```

### Worklog (B505–B515)

| Action                    | Positional                                 | Required flags | Optional flags                                                                                                 |
| ------------------------- | ------------------------------------------ | -------------- | -------------------------------------------------------------------------------------------------------------- |
| `delete-all-worklogs`     | `<issueIdOrKey>`                           | `--ids`        | —                                                                                                              |
| `list-worklogs`           | `<issueIdOrKey>`                           | —              | `--start-at`, `--max-results`, `--started-after`, `--started-before`, `--expand`                               |
| `add-worklog`             | `<issueIdOrKey>`                           | `--body`       | `--notify-users`, `--adjust-estimate`, `--new-estimate`, `--reduce-by`, `--expand`, `--override-editable-flag` |
| `delete-worklog`          | `<issueIdOrKey>` `<worklogId>`             | —              | `--notify-users`, `--adjust-estimate`, `--new-estimate`, `--increase-by`, `--override-editable-flag`           |
| `get-worklog`             | `<issueIdOrKey>` `<worklogId>`             | —              | `--expand`                                                                                                     |
| `update-worklog`          | `<issueIdOrKey>` `<worklogId>`             | `--body`       | `--notify-users`, `--adjust-estimate`, `--new-estimate`, `--expand`, `--override-editable-flag`                |
| `list-worklog-properties` | `<issueIdOrKey>` `<worklogId>`             | —              | —                                                                                                              |
| `delete-worklog-property` | `<issueIdOrKey>` `<worklogId>` `<propKey>` | —              | —                                                                                                              |
| `get-worklog-property`    | `<issueIdOrKey>` `<worklogId>` `<propKey>` | —              | —                                                                                                              |
| `set-worklog-property`    | `<issueIdOrKey>` `<worklogId>` `<propKey>` | `--value`      | —                                                                                                              |
| `move-worklog`            | `<issueIdOrKey>`                           | `--ids`        | `--target-issue`, `--adjust-estimate`, `--override-editable-flag`                                              |

- `delete-all-worklogs`: `--ids` is a comma-separated list of worklog IDs (integers) to delete in bulk (spec: `bulkDeleteWorklogs` requires `WorklogIdsRequestBean { ids }`).
- `--body` is a JSON object string, e.g. `--body '{"timeSpentSeconds":3600,"started":"2024-01-01T09:00:00.000+0000"}'`.
- `--adjust-estimate` accepts: `new`, `leave`, `manual`, `auto`.
- `--notify-users`, `--override-editable-flag` are bare boolean flags.
- `move-worklog`: `<issueIdOrKey>` = SOURCE issue (path); `--ids` = comma-separated worklog IDs (integers); `--target-issue` = DESTINATION issue key (body).

### Issue Archive/Unarchive (B516, B517, B528)

| Action               | Positional | Required flags | Optional flags |
| -------------------- | ---------- | -------------- | -------------- |
| `archive-issues`     | —          | `--ids`        | —              |
| `archive-issues-jql` | —          | `--jql`        | —              |
| `unarchive-issues`   | —          | `--ids`        | —              |

- `archive-issues` uses PUT (synchronous, by ID list); `archive-issues-jql` uses POST (async, by JQL).
- `archive-issues-jql` returns the task-status URL string (202 response) — poll it to track completion.
- `--ids` is comma-separated issue IDs or keys for `archive-issues` and `unarchive-issues`.

### Bulk Fetch (B519)

| Action       | Positional | Required flags | Optional flags                                                               |
| ------------ | ---------- | -------------- | ---------------------------------------------------------------------------- |
| `bulk-fetch` | —          | `--issues`     | `--fields-by-keys`, `--fields` (CSV), `--properties` (CSV), `--expand` (CSV) |

### Create Meta (B924, B520, B521)

| Action                       | Positional                         | Required flags | Optional flags                                                                        |
| ---------------------------- | ---------------------------------- | -------------- | ------------------------------------------------------------------------------------- |
| `get-create-meta`            | —                                  | —              | `--project-ids`, `--project-keys`, `--issuetype-ids`, `--issuetype-names`, `--expand` |
| `get-create-meta-issuetypes` | `<projectIdOrKey>`                 | —              | `--start-at`, `--max-results`                                                         |
| `get-create-meta-issuetype`  | `<projectIdOrKey>` `<issueTypeId>` | —              | `--start-at`, `--max-results`                                                         |

### Issue Limit Report (B522)

| Action             | Positional | Required flags | Optional flags |
| ------------------ | ---------- | -------------- | -------------- |
| `get-limit-report` | —          | —              | —              |

### Issue Picker (B523)

| Action   | Positional | Required flags | Optional flags                                                                                                          |
| -------- | ---------- | -------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `picker` | —          | —              | `--query`, `--current-jql`, `--current-issue-key`, `--current-project-id`, `--show-sub-tasks`, `--show-sub-task-parent` |

### Bulk Properties (B524, B527)

| Action                         | Positional | Required flags | Optional flags                                         |
| ------------------------------ | ---------- | -------------- | ------------------------------------------------------ |
| `set-properties-by-entity-ids` | —          | —              | `--entity-ids` (CSV int), `--properties` (JSON object) |
| `set-properties-multi`         | —          | `--issues`     | —                                                      |

- `set-properties-by-entity-ids`: sets properties on issues identified by numeric IDs. `--entity-ids` is CSV integers, `--properties` is a JSON object string.
- `set-properties-multi`: `--issues` is a JSON array of `{ issueID, properties }` objects.
- Both return `{ submitted: true }`.

### Bulk Watching (B529)

| Action              | Positional | Required flags | Optional flags |
| ------------------- | ---------- | -------------- | -------------- |
| `watch-issues-bulk` | —          | `--issue-ids`  | —              |

- `--issue-ids` is comma-separated issue IDs or keys.
- Returns `{ taskId }` — poll the task with `atlas jira bulk get-status <taskId>`.

### Archive Export (B538)

| Action            | Positional | Required flags | Optional flags           |
| ----------------- | ---------- | -------------- | ------------------------ |
| `export-archived` | —          | —              | `--jql`, `--export-type` |

- `--export-type` accepts `CSV` or `XLSX`.
- This is async (202); the CLI returns `{ submitted: true }`.
- **Note**: uses `/rest/api/3/issues/archive/export` (plural "issues").

```sh
# List worklogs for an issue
atlas jira issues list-worklogs PROJ-42

# Add a worklog
atlas jira issues add-worklog PROJ-42 --body '{"timeSpentSeconds":3600,"started":"2024-01-01T09:00:00.000+0000"}'

# Get a worklog
atlas jira issues get-worklog PROJ-42 10001

# Delete a worklog
atlas jira issues delete-worklog PROJ-42 10001

# Archive issues by ID list (PUT, synchronous)
atlas jira issues archive-issues --ids PROJ-1,PROJ-2

# Archive issues by JQL (POST, async)
atlas jira issues archive-issues-jql --jql "project = PROJ AND status = Done"

# Bulk fetch issues
atlas jira issues bulk-fetch --issues PROJ-1,PROJ-2,PROJ-3

# Bulk fetch with fieldsByKeys and properties
atlas jira issues bulk-fetch --issues PROJ-1 --fields-by-keys --properties prop1,prop2

# Get create metadata
atlas jira issues get-create-meta --project-keys PROJ

# Get issue suggestions
atlas jira issues picker --query "bug"

# Set issue properties by entity IDs
atlas jira issues set-properties-by-entity-ids --entity-ids 10001,10002 --properties '{"flagged":true}'

# Set properties on multiple issues (JSON array body)
atlas jira issues set-properties-multi --issues '[{"issueID":10001,"properties":{"flagged":true}}]'

# Watch issues in bulk (--issue-ids, not --issues)
atlas jira issues watch-issues-bulk --issue-ids PROJ-1,PROJ-2

# Move a worklog (source issue as positional, --ids = worklog IDs, --target-issue = destination)
atlas jira issues move-worklog PROJ-1 --ids 10001,10002 --target-issue PROJ-2

# Export archived issues
atlas jira issues export-archived --jql "project = PROJ AND isArchived = true" --export-type CSV
```

## `projects`

| Action                      | Positional                    | Required flags                          | Optional flags                                                                                                                                   |
| --------------------------- | ----------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `list`                      | —                             | —                                       | `--query`, `--max-results`                                                                                                                       |
| `get`                       | `<projectKeyOrId>`            | —                                       | —                                                                                                                                                |
| `list-legacy`               | —                             | —                                       | `--max-results`, `--order-by`, `--start-at`, `--expand` (CSV), `--type-key` (CSV), `--category-id`, `--action`, `--query`                        |
| `create`                    | —                             | `--key`, `--name`, `--project-type-key` | `--description`, `--lead-account-id`, `--url`, `--assignee-type`, `--avatar-id`, `--permission-scheme`, `--notification-scheme`, `--category-id` |
| `update`                    | `<projectIdOrKey>`            | —                                       | `--name`, `--description`, `--lead-account-id`, `--url`, `--assignee-type`                                                                       |
| `delete`                    | `<projectIdOrKey>`            | —                                       | `--enable-undo`                                                                                                                                  |
| `recent`                    | —                             | —                                       | `--max-results`, `--expand` (CSV)                                                                                                                |
| `list-types`                | —                             | —                                       | —                                                                                                                                                |
| `get-type`                  | `<typeKey>`                   | —                                       | —                                                                                                                                                |
| `get-accessible-type`       | `<typeKey>`                   | —                                       | —                                                                                                                                                |
| `list-accessible-types`     | —                             | —                                       | —                                                                                                                                                |
| `restore`                   | `<projectIdOrKey>`            | —                                       | —                                                                                                                                                |
| `list-roles`                | `<projectIdOrKey>`            | —                                       | —                                                                                                                                                |
| `get-role`                  | `<projectIdOrKey>` `<roleId>` | —                                       | `--exclude-inactive-users`                                                                                                                       |
| `delete-role-actors`        | `<projectIdOrKey>` `<roleId>` | —                                       | `--user`, `--group-id`, `--group`                                                                                                                |
| `add-role-actors`           | `<projectIdOrKey>` `<roleId>` | `--body` (JSON)                         | —                                                                                                                                                |
| `set-role-actors`           | `<projectIdOrKey>` `<roleId>` | `--body` (JSON)                         | —                                                                                                                                                |
| `get-role-details`          | `<projectIdOrKey>`            | —                                       | `--current-member`, `--exclude-connect-addons`                                                                                                   |
| `get-statuses`              | `<projectIdOrKey>`            | —                                       | —                                                                                                                                                |
| `list-versions`             | `<projectIdOrKey>`            | —                                       | `--start-at`, `--max-results`, `--order-by`, `--query`, `--status`, `--expand`                                                                   |
| `list-all-versions`         | `<projectIdOrKey>`            | —                                       | `--max-results`, `--order-by`, `--query`, `--status`, `--expand`                                                                                 |
| `get-issue-security-scheme` | `<projectKeyOrId>`            | —                                       | —                                                                                                                                                |
| `get-notification-scheme`   | `<projectKeyOrId>`            | —                                       | `--expand`                                                                                                                                       |
| `get-permission-scheme`     | `<projectKeyOrId>`            | —                                       | `--expand`                                                                                                                                       |
| `set-permission-scheme`     | `<projectKeyOrId>`            | `--permission-scheme`                   | —                                                                                                                                                |
| `get-security-levels`       | `<projectKeyOrId>`            | —                                       | —                                                                                                                                                |
| `list-categories`           | —                             | —                                       | —                                                                                                                                                |
| `create-category`           | —                             | `--name`                                | `--description`                                                                                                                                  |
| `delete-category`           | `<categoryId>`                | —                                       | —                                                                                                                                                |
| `get-category`              | `<categoryId>`                | —                                       | —                                                                                                                                                |
| `update-category`           | `<categoryId>`                | —                                       | `--name`, `--description`                                                                                                                        |
| `get-projects-fields`       | —                             | —                                       | —                                                                                                                                                |
| `validate-project-key`      | —                             | `--key`                                 | —                                                                                                                                                |
| `get-valid-project-key`     | —                             | `--key`                                 | —                                                                                                                                                |
| `get-valid-project-name`    | —                             | `--name`                                | —                                                                                                                                                |

- `--assignee-type` accepts `PROJECT_LEAD` or `UNASSIGNED`.
- `list-legacy` calls the deprecated `GET /project` endpoint (returns a flat array, not paginated).
- `list` uses `GET /project/search` (paginated, preferred).
- `list-versions` returns a paginated response; `list-all-versions` returns a flat array.
- `add-role-actors` accepts `--body` as a flat `ActorsMap` JSON object with `user`, `group`, and/or `groupId` string arrays (e.g. `{"user":["acc-1"]}`).
- `set-role-actors` accepts `--body` as a JSON object.
- `delete-role-actors` removes actors by `--user` (accountId), `--group-id`, or `--group` (name).

```sh
# List projects (paginated, preferred)
atlas jira projects list --max-results 50

# List projects using legacy endpoint with filters
atlas jira projects list-legacy --query "example" --type-key software

# Create a project
atlas jira projects create --key EX --name "Example" --project-type-key software

# Update a project
atlas jira projects update EX --name "Updated Name" --description "New desc"

# Delete a project
atlas jira projects delete EX

# List recently viewed projects
atlas jira projects recent --max-results 10

# List all project types
atlas jira projects list-types

# Get a specific project type
atlas jira projects get-type software

# List accessible project types
atlas jira projects list-accessible-types

# Restore a deleted project
atlas jira projects restore PROJ

# List all roles for a project (name -> URL map)
atlas jira projects list-roles PROJ

# Get a specific project role with its actors
atlas jira projects get-role PROJ 10001

# Delete a user actor from a project role
atlas jira projects delete-role-actors PROJ 10001 --user acc-1

# Add actors to a project role (flat ActorsMap: user, group, groupId)
atlas jira projects add-role-actors PROJ 10001 --body '{"user":["acc-1"]}'

# Replace all actors for a project role
atlas jira projects set-role-actors PROJ 10001 --body '{"categorisedActors":{"atlassian-user-role-actor":["acc-1"]}}'

# Get all role details for a project
atlas jira projects get-role-details PROJ --current-member

# Get issue types and their statuses for a project
atlas jira projects get-statuses PROJ

# List project versions (paginated)
atlas jira projects list-versions PROJ --order-by name --status released

# List all project versions (flat array)
atlas jira projects list-all-versions PROJ --order-by -releaseDate

# Get scheme associations
atlas jira projects get-issue-security-scheme PROJ
atlas jira projects get-notification-scheme PROJ --expand all
atlas jira projects get-permission-scheme PROJ --expand permissions
atlas jira projects set-permission-scheme PROJ --permission-scheme 10001
atlas jira projects get-security-levels PROJ

# Project categories
atlas jira projects list-categories
atlas jira projects create-category --name "Infrastructure" --description "Infra projects"
atlas jira projects get-category 10001
atlas jira projects update-category 10001 --name "Renamed"
atlas jira projects delete-category 10001

# Projects fields and validation
atlas jira projects get-projects-fields
atlas jira projects validate-project-key --key MYPROJ
atlas jira projects get-valid-project-key --key myproj
atlas jira projects get-valid-project-name --name "My Project"
```

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

## `users`

| Action                     | Positional    | Required flags  | Optional flags                                                                            |
| -------------------------- | ------------- | --------------- | ----------------------------------------------------------------------------------------- |
| `get`                      | `<accountId>` | —               | —                                                                                         |
| `me`                       | —             | —               | —                                                                                         |
| `search`                   | —             | `--query`       | `--max-results`                                                                           |
| `delete`                   | —             | `--account-id`  | —                                                                                         |
| `create`                   | —             | `--email`       | `--display-name`                                                                          |
| `assignable-multi-project` | —             | —               | `--query`, `--user-name`, `--account-id`, `--project-keys`, `--max-results`, `--start-at` |
| `assignable`               | —             | `--project`     | `--query`, `--user-name`, `--account-id`, `--start-at`, `--max-results`                   |
| `bulk`                     | —             | `--account-ids` | `--start-at`, `--max-results`                                                             |
| `bulk-migration`           | —             | —               | `--user-name`, `--key`, `--start-at`, `--max-results`                                     |
| `reset-columns`            | —             | —               | `--account-id`                                                                            |
| `get-columns`              | —             | —               | `--account-id`                                                                            |
| `set-columns`              | —             | `--columns`     | `--account-id`                                                                            |
| `email`                    | —             | `--account-id`  | —                                                                                         |
| `bulk-emails`              | —             | `--account-ids` | —                                                                                         |
| `groups`                   | —             | `--account-id`  | `--user-name`, `--key`                                                                    |

- `users me` returns the caller's profile — a fast way to verify auth env vars are working without touching tenant data.
- `users delete` requires `--account-id`. Returns `{ deleted: true }` on success.
- `users create` requires `--email`; `--display-name` is optional.
- `users assignable-multi-project` accepts `--project-keys` as a comma-separated list.
- `users bulk` and `users bulk-emails` accept `--account-ids` as a comma-separated list.
- `users bulk-migration` accepts `--user-name` and `--key` as comma-separated lists to translate legacy identifiers to account IDs.
- `users set-columns` accepts `--columns` as a comma-separated list of column names; `--account-id` scopes the update to a specific user (admin only).

## `issue-types` / `priorities` / `statuses`

`issue-types` and `statuses` are read-only lookups. `priorities` supports full CRUD and management:

```sh
atlas jira issue-types list
atlas jira issue-types get <id>
atlas jira priorities list
atlas jira priorities get <id>
atlas jira priorities create --name "Critical" --description "Highest urgency" --status-color "#FF0000"
atlas jira priorities update <id> --name "Renamed" --description "Updated description"
atlas jira priorities delete <id>
atlas jira priorities delete <id> --replace-with <other-id>
atlas jira priorities set-default --id <id>
atlas jira priorities move --ids 10001,10002 --after 10000
atlas jira priorities move --ids 10001,10002 --before 10003
atlas jira priorities search --priority-name High --only-default false
atlas jira priorities search --ids 10001,10002 --max-results 25
atlas jira statuses list
```

Use them to translate human-readable names into IDs when constructing issue create/update calls.

## JQL tips

- **Quoting in the shell**: `--jql "project = PROJ"` works. When the JQL itself contains double quotes, switch outer to single: `--jql 'project = PROJ AND status = "In Progress"'`.
- **Date ranges**: `created >= -7d` (last 7 days), `created >= "2026-01-01"`.
- **Empty assignee**: `assignee is EMPTY` (not `assignee = null`).
- **Order**: append `ORDER BY <field> DESC` at the end of the JQL string, not as a separate flag.
- **Reserved characters in values**: escape with backslash inside double-quoted values, e.g. `summary ~ "won\\'t fix"`.

## Pagination

Jira `search` uses offset-based pagination via `startAt` + `maxResults`. The CLI exposes `--max-results` for page size but not `--start-at`; for paging past the first batch, drop to the SDK:

```ts
import { JiraClient, paginateSearch } from 'atlassian-api-client';
const client = new JiraClient(config);
for await (const issue of paginateSearch(client, { jql: 'project = PROJ' })) {
  // ...
}
```

## Output shape notes

- `issues get` returns the full Jira issue including `fields.summary`, `fields.status.name`, etc. With `--format minimal` you get the issue key (`PROJ-123`).
- `search` returns `{ issues: [...], total, startAt, maxResults }`. Check `total > startAt + maxResults` to know if more pages exist.
- `transitions` returns `{ transitions: [{ id, name, to: { name } }, ...] }`. The `id` is what you pass to `--transition-id`.
- `users me` returns the caller's `accountId`, `emailAddress` (if visible to caller), and `displayName`.

## `boards`

Full Agile board management: list, create, delete, and query board details, issues, epics, features, projects, versions, sprints, properties, quick filters, and reports.

| Action                | Positionals                 | Required flags                    | Optional flags                                                 |
| --------------------- | --------------------------- | --------------------------------- | -------------------------------------------------------------- |
| `list`                | —                           | —                                 | `--type`, `--name`, `--project`, `--start-at`, `--max-results` |
| `get`                 | `<boardId>`                 | —                                 | —                                                              |
| `create`              | —                           | `--name`, `--type`, `--filter-id` | —                                                              |
| `delete`              | `<boardId>`                 | —                                 | —                                                              |
| `backlog`             | `<boardId>`                 | —                                 | `--jql`, `--fields`, `--start-at`, `--max-results`             |
| `configuration`       | `<boardId>`                 | —                                 | —                                                              |
| `list-epics`          | `<boardId>`                 | —                                 | `--done`, `--start-at`, `--max-results`                        |
| `epic-issues`         | `<boardId> <epicId>`        | —                                 | `--jql`, `--fields`, `--start-at`, `--max-results`             |
| `issues-without-epic` | `<boardId>`                 | —                                 | `--jql`, `--fields`, `--start-at`, `--max-results`             |
| `get-features`        | `<boardId>`                 | —                                 | —                                                              |
| `toggle-feature`      | `<boardId>`                 | `--feature`, `--enabling`         | —                                                              |
| `get-issues`          | `<boardId>`                 | —                                 | `--jql`, `--fields`, `--start-at`, `--max-results`             |
| `move-issues`         | `<boardId>`                 | `--issues`                        | —                                                              |
| `list-projects`       | `<boardId>`                 | —                                 | `--start-at`, `--max-results`                                  |
| `list-projects-full`  | `<boardId>`                 | —                                 | `--start-at`, `--max-results`                                  |
| `list-sprints`        | `<boardId>`                 | —                                 | `--state`, `--start-at`, `--max-results`                       |
| `list-versions`       | `<boardId>`                 | —                                 | `--released`, `--start-at`, `--max-results`                    |
| `sprint-issues`       | `<boardId> <sprintId>`      | —                                 | `--jql`, `--fields`, `--start-at`, `--max-results`             |
| `list-by-filter`      | `<filterId>`                | —                                 | `--start-at`, `--max-results`                                  |
| `list-properties`     | `<boardId>`                 | —                                 | —                                                              |
| `delete-property`     | `<boardId> <propertyKey>`   | —                                 | —                                                              |
| `get-property`        | `<boardId> <propertyKey>`   | —                                 | —                                                              |
| `set-property`        | `<boardId> <propertyKey>`   | `--value`                         | —                                                              |
| `list-quickfilters`   | `<boardId>`                 | —                                 | `--start-at`, `--max-results`                                  |
| `get-quickfilter`     | `<boardId> <quickFilterId>` | —                                 | —                                                              |
| `get-reports`         | `<boardId>`                 | —                                 | —                                                              |

**Notes:**

- `--type` accepts `scrum`, `kanban`, or `simple`.
- `--state` (for `list-sprints`) accepts comma-separated sprint states: `future`, `active`, `closed`.
- `--enabling` (for `toggle-feature`) accepts `true` or `false` — maps to the spec's boolean `enabling` field.
- `--feature` is the feature key string (e.g. `SIMPLE_ROADMAP`, `BACKLOG`, `SPRINTS`).
- `--issues` is comma-separated issue keys, e.g. `--issues PROJ-1,PROJ-2`.
- `--fields` is comma-separated field names, e.g. `--fields summary,status,assignee`.
- `--done` (boolean flag for `list-epics`) filters to only done or not-done epics.
- `--released` (boolean flag for `list-versions`) filters to released versions.
- `boardId`, `epicId`, `sprintId`, `filterId`, `--filter-id` are all numeric IDs.
- `--start-at` is the 0-based offset for pagination.
- `--value` accepts **any valid JSON**: objects, arrays, strings, numbers, booleans, and `null`. Examples: `--value '{"beta":true}'`, `--value '"hello"'`, `--value '42'`, `--value 'null'`.
- `propertyKey` is URL-encoded automatically — keys with spaces or special characters are safe to pass as-is.
- `get-property` response: `{ key: string, value: unknown }` — the caller must narrow `value` to the expected shape.
- Board properties are arbitrary key-value metadata stored on the board.

```sh
# List all boards (scrum type)
atlas jira boards list --type scrum

# List boards for a project
atlas jira boards list --project PROJ

# Get board details
atlas jira boards get 42

# Create a board linked to filter 5
atlas jira boards create --name "My Team Board" --type scrum --filter-id 5

# Delete a board
atlas jira boards delete 42

# Get backlog issues with JQL filter
atlas jira boards backlog 42 --jql "priority = High" --fields summary,assignee

# Get board configuration
atlas jira boards configuration 42

# List all epics on a board (not done)
atlas jira boards list-epics 42 --done false

# List issues in a specific epic
atlas jira boards epic-issues 42 7

# List issues not in any epic
atlas jira boards issues-without-epic 42

# Get board features
atlas jira boards get-features 42

# Disable a feature on a board
atlas jira boards toggle-feature 42 --feature SIMPLE_ROADMAP --enabling false

# Enable a feature on a board
atlas jira boards toggle-feature 42 --feature SIMPLE_ROADMAP --enabling true

# Get all issues on a board
atlas jira boards get-issues 42 --jql "status != Done" --fields summary,status

# Move issues onto a board
atlas jira boards move-issues 42 --issues PROJ-1,PROJ-2,PROJ-3

# List projects associated with a board
atlas jira boards list-projects 42

# List projects (full details) associated with a board
atlas jira boards list-projects-full 42

# List all active sprints on board 1
atlas jira boards list-sprints 1 --state active

# List active and future sprints, page 2
atlas jira boards list-sprints 1 --state active,future --start-at 50 --max-results 50

# List released versions for a board
atlas jira boards list-versions 42 --released

# List issues in sprint 10 on board 1
atlas jira boards sprint-issues 1 10

# List issues with JQL filter and field selection
atlas jira boards sprint-issues 1 10 --jql "status = 'In Progress'" --fields summary,status,assignee

# List boards associated with a specific filter
atlas jira boards list-by-filter 5

# List all property keys for board 42
atlas jira boards list-properties 42

# Get a specific property value
atlas jira boards get-property 42 my-flag

# Set a property to a JSON object value
atlas jira boards set-property 42 feature-flags --value '{"betaEnabled":true,"threshold":5}'

# Set a property to a scalar string
atlas jira boards set-property 42 label --value '"in-progress"'

# Delete a property
atlas jira boards delete-property 42 my-flag

# List quick filters for board 42
atlas jira boards list-quickfilters 42

# Get a specific quick filter
atlas jira boards get-quickfilter 42 7

# Get reports for board 42
atlas jira boards get-reports 42
```

## `sprints`

Manage Agile sprints directly (not board-scoped). Supports full CRUD, partial patch, issue assignment.

| Action            | Positionals                | Required flags         | Optional flags                                              |
| ----------------- | -------------------------- | ---------------------- | ----------------------------------------------------------- |
| `get`             | `<sprintId>`               | —                      | —                                                           |
| `create`          | —                          | `--name`, `--board-id` | `--start-date`, `--end-date`, `--goal`                      |
| `update`          | `<sprintId>`               | —                      | `--name`, `--state`, `--start-date`, `--end-date`, `--goal` |
| `delete`          | `<sprintId>`               | —                      | —                                                           |
| `get-issues`      | `<sprintId>`               | —                      | `--jql`, `--fields`, `--start-at`, `--max-results`          |
| `partial-update`  | `<sprintId>`               | —                      | `--name`, `--state`, `--start-date`, `--end-date`, `--goal` |
| `move-issues`     | `<sprintId>`               | `--issues`             | —                                                           |
| `list-properties` | `<sprintId>`               | —                      | —                                                           |
| `get-property`    | `<sprintId> <propertyKey>` | —                      | —                                                           |
| `set-property`    | `<sprintId> <propertyKey>` | `--value`              | —                                                           |
| `delete-property` | `<sprintId> <propertyKey>` | —                      | —                                                           |
| `swap`            | `<sprintId>`               | `--with`               | —                                                           |

**Notes:**

- `update` uses **PUT** (full replace) — all current fields are overwritten. Supply every field you want to keep.
- `partial-update` uses **POST** (Atlassian patch semantics) — only the supplied fields are changed. Safe for single-field edits.
- `--state` accepts `active`, `closed`, or `future` only.
- `--issues` is **comma-separated** issue keys or IDs, e.g. `--issues PROJ-1,PROJ-2`. Max **50** per call; the client validates this before sending.
- `--fields` is comma-separated, e.g. `--fields summary,status,assignee`.
- `sprintId` and `--board-id` are numeric IDs (not names).
- Dates are ISO 8601: `--start-date 2026-06-01T00:00:00.000Z`.

**Properties notes (list-properties, get-property, set-property, delete-property):**

- `--value` accepts **any valid JSON**: objects, arrays, strings, numbers, booleans, and `null`. Examples: `--value '{"beta":true}'`, `--value '"hello"'`, `--value '42'`, `--value 'null'`.
- `propertyKey` is URL-encoded automatically — keys with spaces or special characters are safe to pass as-is.
- `get-property` response: `{ key: string, value: unknown }` — the caller must narrow `value` to the expected shape.
- Sprint properties are arbitrary key-value metadata; they do not affect sprint state or issue assignments.

**Swap notes (swap):**

- `--with` is the numeric ID of the sprint to swap rank with.
- Swapping a sprint with itself is rejected client-side before any network call.
- Swap operates on sprint **rank** (backlog ordering), not sprint state or dates.

```sh
# Get sprint details
atlas jira sprints get 42

# Create a new sprint on board 1
atlas jira sprints create --name "Sprint 5" --board-id 1 --start-date 2026-06-01T00:00:00.000Z --end-date 2026-06-14T00:00:00.000Z --goal "Ship billing module"

# Rename a sprint without touching other fields (partial-update, not update)
atlas jira sprints partial-update 42 --name "Sprint 5 (revised)"

# Close a sprint via partial-update
atlas jira sprints partial-update 42 --state closed

# Move issues into sprint 42 (comma-separated, max 50)
atlas jira sprints move-issues 42 --issues PROJ-1,PROJ-2,PROJ-3

# List sprint issues with JQL filter
atlas jira sprints get-issues 42 --jql "status != Done" --fields summary,status,assignee

# Full update (replaces all fields — use partial-update to patch)
atlas jira sprints update 42 --name "Sprint 5" --state active --start-date 2026-06-01T00:00:00.000Z --end-date 2026-06-14T00:00:00.000Z

# Delete a sprint
atlas jira sprints delete 42

# List all property keys for sprint 42
atlas jira sprints list-properties 42

# Get a specific property value
atlas jira sprints get-property 42 my-flag

# Set a property to a JSON object value
atlas jira sprints set-property 42 feature-flags --value '{"betaEnabled":true,"threshold":5}'

# Set a property to a scalar string
atlas jira sprints set-property 42 label --value '"in-progress"'

# Delete a property
atlas jira sprints delete-property 42 my-flag

# Swap the rank of sprint 42 with sprint 99
atlas jira sprints swap 42 --with 99
```

## `epic`

Manage Agile epics. Supports get, partial update (POST patch semantics), issue assignment, ranking, and epic-less issue queries.

| Action          | Positionals     | Required flags          | Optional flags                                     |
| --------------- | --------------- | ----------------------- | -------------------------------------------------- |
| `get`           | `<epicIdOrKey>` | —                       | —                                                  |
| `update`        | `<epicIdOrKey>` | —                       | `--name`, `--summary`, `--color`, `--done`         |
| `issues`        | `<epicIdOrKey>` | —                       | `--jql`, `--fields`, `--start-at`, `--max-results` |
| `move-issues`   | `<epicIdOrKey>` | `--issues`              | —                                                  |
| `rank`          | `<epicIdOrKey>` | `--before` or `--after` | `--custom-field`                                   |
| `issues-none`   | —               | —                       | `--jql`, `--fields`, `--start-at`, `--max-results` |
| `remove-issues` | —               | `--issues`              | —                                                  |

**Notes:**

- `epicIdOrKey` accepts either a numeric ID (`42`) or an epic key (`PROJ-42`).
- `update` uses **POST** (Atlassian patch semantics) — only the supplied fields are changed. Safe for single-field edits.
- `--color` accepts the color key string, e.g. `color_1`, `color_2`. Check your Atlassian instance for valid values.
- `--done` is a boolean flag; passing it sets `done: true` on the epic.
- `--issues` is **comma-separated** issue keys or IDs, e.g. `--issues PROJ-1,PROJ-2`.
- `rank` requires exactly one of `--before` or `--after` (mutually exclusive).
- `--before` / `--after` accept an epic ID or key to rank the current epic before or after.
- `--custom-field` is an optional numeric ID of the rank custom field.
- `issues-none` returns all issues that are not assigned to any epic.
- `remove-issues` moves the specified issues out of their epics (sets epic link to none).

```sh
# Get an epic by ID
atlas jira epic get 42

# Get an epic by key
atlas jira epic get PROJ-42

# Rename an epic
atlas jira epic update 42 --name "New Epic Name"

# Mark an epic as done and set summary
atlas jira epic update PROJ-42 --summary "All done" --done

# List issues in an epic
atlas jira epic issues 42

# List issues in an epic with JQL filter
atlas jira epic issues 42 --jql "status != Done" --fields summary,status,assignee

# Move issues into an epic
atlas jira epic move-issues 42 --issues PROJ-1,PROJ-2,PROJ-3

# Rank epic 42 before epic 99
atlas jira epic rank 42 --before 99

# Rank epic 42 after epic PROJ-5
atlas jira epic rank 42 --after PROJ-5

# List all issues without an epic
atlas jira epic issues-none

# List issues without an epic with pagination
atlas jira epic issues-none --start-at 50 --max-results 50

# Remove issues from their epics
atlas jira epic remove-issues --issues PROJ-10,PROJ-11
```

## `backlog`

Move issues to the Agile backlog. Supports board-scoped (B235) and global (B236) variants via a single `move` action.

| Action | Positionals | Required flags | Optional flags |
| ------ | ----------- | -------------- | -------------- |
| `move` | —           | `--issues`     | `--board-id`   |

**Notes:**

- `--issues` is **comma-separated** issue keys or IDs, e.g. `--issues PROJ-1,PROJ-2`. Max **50** per call; the client validates this before sending.
- `--board-id` scopes the backlog operation to a specific board (calls `POST /rest/agile/1.0/backlog/{boardId}/issue`). Omit `--board-id` for the global backlog endpoint (`POST /rest/agile/1.0/backlog/issue`).
- Both variants return 204 No Content; the CLI returns `{ moved: true }`.

```sh
# Move issues to the backlog scoped to board 1 (B235)
atlas jira backlog move --board-id 1 --issues PROJ-1,PROJ-2

# Move issues to the global backlog (no board scope) (B236)
atlas jira backlog move --issues PROJ-3,PROJ-4
```

## `webhooks`

| Action        | Positionals | Required flags        | Optional flags                |
| ------------- | ----------- | --------------------- | ----------------------------- |
| `list`        | —           | —                     | `--start-at`, `--max-results` |
| `register`    | —           | `--url`, `--webhooks` | —                             |
| `refresh`     | —           | `--webhook-ids`       | —                             |
| `list-failed` | —           | —                     | `--max-results`, `--after`    |
| `delete`      | —           | `--webhook-ids`       | —                             |

**Notes:**

- `list` calls `GET /rest/api/3/webhook` and returns a paginated list of registered webhooks for the calling app.
- `register` calls `POST /rest/api/3/webhook`. `--webhooks` is a JSON array of `{ jqlFilter, events, fieldIdsFilter?, issuePropertyKeysFilter? }` objects.
- `refresh` calls `PUT /rest/api/3/webhook/refresh`. `--webhook-ids` is a JSON array of numeric webhook IDs (e.g. `[10000,10001]`). Extends webhook expiry by 30 days.
- `list-failed` calls `GET /rest/api/3/webhook/failed` and returns a page of failed webhook deliveries.
- `delete` calls `DELETE /rest/api/3/webhook`. `--webhook-ids` is a JSON array of numeric webhook IDs to remove permanently.
- `--after` accepts a Unix timestamp in **milliseconds** (e.g. `--after 1700000000000`). Only deliveries with a failure time after this value are returned.
- `--max-results` caps the number of results in a single page.
- The SDK exposes `listFailed()` (single page) and `listAllFailed()` (async generator) on `client.webhooks`.

```sh
# List registered webhooks (paginated)
atlas jira webhooks list

# List with pagination
atlas jira webhooks list --start-at 0 --max-results 50

# Register a new webhook
atlas jira webhooks register \
  --url 'https://example.com/hook' \
  --webhooks '[{"jqlFilter":"project=MYPROJ","events":["jira:issue_created","jira:issue_updated"]}]'

# Refresh (extend) webhook expiry
atlas jira webhooks refresh --webhook-ids '[10000,10001]'

# List failed webhook deliveries (default page size)
atlas jira webhooks list-failed

# List failed webhooks since a specific timestamp
atlas jira webhooks list-failed --after 1700000000000

# Limit the result set
atlas jira webhooks list-failed --max-results 20

# Delete webhooks by ID
atlas jira webhooks delete --webhook-ids '[10000,10001]'
```

## `status`

| Action | Positional | Required flags | Optional flags |
| ------ | ---------- | -------------- | -------------- |
| `list` | —          | —              | —              |
| `get`  | `idOrName` | —              | —              |

```sh
# List all workflow statuses
atlas jira status list

# Get a specific status by id or name
atlas jira status get 10001
atlas jira status get "In Progress"
```

## `status-category`

| Action | Positional | Required flags | Optional flags |
| ------ | ---------- | -------------- | -------------- |
| `list` | —          | —              | —              |
| `get`  | `idOrKey`  | —              | —              |

**Notes:**

- `idOrKey` accepts either the numeric id (e.g. `2`) or the category key (e.g. `new`, `indeterminate`, `done`).

```sh
# List all status categories
atlas jira status-category list

# Get a specific status category by id
atlas jira status-category get 2

# Get a specific status category by key
atlas jira status-category get done
```

## `server-info`

| Action | Positional | Required flags | Optional flags |
| ------ | ---------- | -------------- | -------------- |
| `get`  | —          | —              | —              |

- Returns Jira version, build number, server time, deployment type, and optional health checks.

```sh
# Get Jira server info
atlas jira server-info get
```

## `instance`

| Action        | Positional | Required flags | Optional flags |
| ------------- | ---------- | -------------- | -------------- |
| `get-license` | —          | —              | —              |

- Returns the instance license with a list of licensed applications and their plans (`FREE`, `STANDARD`, `PREMIUM`, `ENTERPRISE`).

```sh
# Get instance license information
atlas jira instance get-license
```

## `mypermissions`

| Action | Positional | Required flags | Optional flags                                                                                                                                  |
| ------ | ---------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `get`  | —          | —              | `--project-id`, `--project-key`, `--issue-id`, `--issue-key`, `--permissions`, `--project-uuid`, `--project-configuration-uuid`, `--comment-id` |

- Without any scope flags, returns all permissions for the current user globally.
- Use `--permissions` with a **comma-separated** list of permission keys to filter results (e.g. `BROWSE_PROJECTS,CREATE_ISSUES`).
- Scope flags narrow the check to a specific project or issue context.

```sh
# Get all permissions for the current user
atlas jira mypermissions get

# Check permissions in a specific project by key
atlas jira mypermissions get --project-key PROJ

# Check specific permissions for an issue
atlas jira mypermissions get --issue-key PROJ-42 --permissions BROWSE_PROJECTS,EDIT_ISSUES
```

## `mypreferences`

| Action       | Positional | Required flags     | Optional flags |
| ------------ | ---------- | ------------------ | -------------- |
| `get`        | —          | `--key`            | —              |
| `set`        | —          | `--key`, `--value` | —              |
| `delete`     | —          | `--key`            | —              |
| `get-locale` | —          | —                  | —              |
| `set-locale` | —          | `--locale`         | —              |

- `--key` — preference key (required for `get`, `set`, `delete`).
- `--value` — preference value string (required for `set`); sent as a JSON-encoded string body.
- `--locale` — IETF locale tag, e.g. `en_US` (required for `set-locale`).
- `set-locale` is **deprecated** per the Jira platform v3 spec; prefer updating locale through account settings.

```sh
# Get a preference value
atlas jira mypreferences get --key jira.user.locale

# Set a preference value
atlas jira mypreferences set --key jira.user.locale --value en_US

# Delete a preference
atlas jira mypreferences delete --key jira.user.locale

# Get the current user's locale
atlas jira mypreferences get-locale

# Set the current user's locale (deprecated)
atlas jira mypreferences set-locale --locale en_US
```

## `auditing`

| Action | Positional | Required flags | Optional flags                                      |
| ------ | ---------- | -------------- | --------------------------------------------------- |
| `list` | —          | —              | `--offset`, `--limit`, `--filter`, `--from`, `--to` |

- `--offset` — zero-based pagination offset (default 0).
- `--limit` — maximum records per page (1–1000; default 1000 per Jira).
- `--filter` — fuzzy-text filter applied to `summary` and `category`.
- `--from` / `--to` — ISO-8601 datetimes bounding the `created` timestamp range.
- Requires **Jira Administrator** global permission; 403 for non-admins.

```sh
# List recent audit records
atlas jira auditing list

# Filter by keyword and date range
atlas jira auditing list --filter "project" --from 2024-01-01T00:00:00+00:00 --to 2024-12-31T23:59:59+00:00

# Paginate
atlas jira auditing list --offset 100 --limit 50
```

## `events`

| Action | Positional | Required flags | Optional flags |
| ------ | ---------- | -------------- | -------------- |
| `list` | —          | —              | —              |

- Returns all Jira issue events — the named event types used in workflow conditions, validators, and post-functions.
- Each event has `id` (number) and `name` (string).

```sh
# List all Jira events
atlas jira events list
```

## `changelog`

| Action       | Positional | Required flags | Optional flags                                               |
| ------------ | ---------- | -------------- | ------------------------------------------------------------ |
| `bulk-fetch` | —          | `--issues`     | `--author-ids`, `--field-ids`, `--start-at`, `--max-results` |

- `--issues` — **comma-separated** list of issue IDs or keys (e.g. `PROJ-1,PROJ-2,10001`). Required.
- `--author-ids` — **comma-separated** account IDs to filter changelog entries by author.
- `--field-ids` — **comma-separated** field IDs; only entries containing changes to these fields are returned.
- `--start-at` / `--max-results` — standard offset pagination controls.
- Endpoint: `POST /rest/api/3/changelog/bulkfetch`.

```sh
# Fetch changelogs for two issues
atlas jira changelog bulk-fetch --issues PROJ-1,PROJ-2

# Filter to status changes only
atlas jira changelog bulk-fetch --issues PROJ-1,PROJ-2 --field-ids status

# Paginate through a large result set
atlas jira changelog bulk-fetch --issues PROJ-1 --start-at 0 --max-results 50
```

## `forge`

| Action              | Positional | Required flags | Optional flags |
| ------------------- | ---------- | -------------- | -------------- |
| `bulk-panel-action` | —          | `--value`      | —              |

- `--value` — JSON array of panel action objects; each must have `issueId` (string) and `moduleKey` (string), and optionally `payload` (object).
- **Auth:** Requires OAuth 2.0 (3LO) with `manage:jira-configuration` scope. Basic auth (API token) is NOT accepted. Use `--auth-type bearer --token <OAUTH_TOKEN>`.
- **URL base:** `POST /rest/api/3/forge/panel/action/bulk/async` — uses the standard REST API base, not a Forge tunnel.
- Returns a `taskId` that can be used to poll for task completion.
- The Forge app must be installed on the Jira site before this endpoint is usable.

```sh
# Trigger a Forge panel action asynchronously for two issues
atlas jira forge bulk-panel-action --value '[{"issueId":"10001","moduleKey":"my-app:my-panel"},{"issueId":"10002","moduleKey":"my-app:my-panel"}]'
```

## `groups`

| Action         | Positional | Required flags | Optional flags                                                                                      |
| -------------- | ---------- | -------------- | --------------------------------------------------------------------------------------------------- |
| `picker`       | —          | —              | `--query`, `--exclude`, `--max-results`, `--user-name`                                              |
| `get`          | —          | —              | `--group-name`, `--group-id`, `--expand`                                                            |
| `create`       | —          | `--name`       | —                                                                                                   |
| `delete`       | —          | —              | `--group-name`, `--group-id`, `--swap-group`, `--swap-group-id`                                     |
| `list-bulk`    | —          | —              | `--start-at`, `--max-results`, `--group-ids`, `--group-names`, `--access-type`, `--application-key` |
| `list-members` | —          | —              | `--group-name`, `--group-id`, `--include-inactive-users`, `--start-at`, `--max-results`             |
| `add-user`     | —          | `--account-id` | `--group-name`, `--group-id`                                                                        |
| `remove-user`  | —          | `--account-id` | `--group-name`, `--group-id`                                                                        |

### `picker`

- `--query` — fuzzy string to match against group names.
- `--exclude` — **comma-separated** list of group **names** to exclude from results (sent as repeated `exclude=` params). Note: to exclude by group ID, use the spec's `excludeId` parameter (not yet exposed by this client).
- `--max-results` — maximum number of groups returned (default 20).
- `--user-name` — account ID of a user whose groups should be excluded.
- Endpoint: `GET /rest/api/3/groups/picker`.

### `get`, `create`, `delete`

- `--group-name` — group name (Atlassian deprecates this in favour of `--group-id`).
- `--group-id` — stable group identifier; preferred over `--group-name`.
- `--expand` (`get` only) — comma-separated expand keys; `users` inlines the first member page.
- `--name` (`create` only) — name of the new group; **required**.
- `--swap-group` / `--swap-group-id` (`delete` only) — reassign deleted group's restrictions to the swap target.
- Endpoints: `GET /rest/api/3/group`, `POST /rest/api/3/group`, `DELETE /rest/api/3/group`.

### `list-bulk`

- `--group-ids` — **comma-separated** group IDs to filter the result set.
- `--group-names` — **comma-separated** group names to filter the result set.
- `--access-type` — restrict to groups providing a given access type. One of: `site-admin`, `admin`, `user`.
- `--application-key` — application key used with `--access-type`.
- `--start-at`, `--max-results` — offset pagination controls.
- Endpoint: `GET /rest/api/3/group/bulk`.

### `list-members`

- `--group-name` / `--group-id` — identify the group whose members are listed.
- `--include-inactive-users` — when `true`, deactivated users are included.
- `--start-at`, `--max-results` — offset pagination controls.
- Endpoint: `GET /rest/api/3/group/member`.

### `add-user`, `remove-user`

- `--account-id` — **required**; Atlassian account ID of the user to add or remove.
- `--group-name` / `--group-id` — identify the target group.
- Endpoints: `POST /rest/api/3/group/user`, `DELETE /rest/api/3/group/user`.

```sh
# Find groups matching "dev"
atlas jira groups picker --query dev

# Find up to 10 groups excluding a group by name
atlas jira groups picker --query dev --max-results 10 --exclude developers

# Fetch a group and inline its first page of users
atlas jira groups get --group-id grp-1 --expand users

# Create a new group
atlas jira groups create --name developers

# Delete a group and swap its restrictions onto another group
atlas jira groups delete --group-id grp-old --swap-group-id grp-new

# Bulk-list groups providing site-admin access
atlas jira groups list-bulk --access-type site-admin --application-key jira-software

# List members of a group, including deactivated users
atlas jira groups list-members --group-id grp-1 --include-inactive-users

# Add a user to a group
atlas jira groups add-user --group-id grp-1 --account-id 5b10ac8d82e05b22cc7d4ef5

# Remove a user from a group
atlas jira groups remove-user --group-id grp-1 --account-id 5b10ac8d82e05b22cc7d4ef5
```

## `group-user-picker`

| Action | Positional | Required flags | Optional flags                                                                                                         |
| ------ | ---------- | -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `pick` | —          | —              | `--query`, `--max-results`, `--show-avatar`, `--field-id`, `--project-id`, `--project-role`, `--exclude-connect-users` |

- `--query` — string to match against both group names and user display names.
- `--max-results` — maximum results per section (default 50).
- `--show-avatar` — when `true`, avatar URLs are included in user results.
- `--field-id` — the custom field ID this picker is for (e.g. `customfield_10050`). **Required for `--project-id` to have any effect** — without `--field-id` the server ignores `--project-id` entirely (spec constraint).
- `--project-id` — **comma-separated** project IDs to scope user results to project members (sent as repeated params on the wire: `?projectId=a&projectId=b`). **Only effective when `--field-id` is also provided.**
- `--project-role` — case-sensitive project role name to filter user results.
- `--exclude-connect-users` — when `true`, Atlassian Connect users are excluded.
- Endpoint: `GET /rest/api/3/groupuserpicker`.

```sh
# Find groups and users matching "alice"
atlas jira group-user-picker pick --query alice

# Include avatar URLs and limit results
atlas jira group-user-picker pick --query dev --show-avatar --max-results 25

# Scope to a specific project (field-id is required for project-id to take effect)
atlas jira group-user-picker pick --query eng --field-id customfield_10050 --project-id 10001
```

## `security-level`

| Action | Positional | Required flags | Optional flags |
| ------ | ---------- | -------------- | -------------- |
| `get`  | `<id>`     | —              | —              |

- `<id>` — numeric ID of the issue security level (positional, not a flag).
- Endpoint: `GET /rest/api/3/securitylevel/{id}`.
- Returns `id`, `name`, `description`, `issueSecuritySchemeId`, and `self`.

```sh
# Get a security level by ID
atlas jira security-level get 10001
```

## `license`

| Action                              | Positional         | Required flags | Optional flags |
| ----------------------------------- | ------------------ | -------------- | -------------- |
| `get-approximate-count`             | —                  | —              | —              |
| `get-approximate-count-for-product` | `<applicationKey>` | —              | —              |

- `get-approximate-count` calls `GET /rest/api/3/license/approximateLicenseCount` and returns the approximate user count across all Jira products.
- `get-approximate-count-for-product` calls `GET /rest/api/3/license/approximateLicenseCount/product/{applicationKey}` for a specific product. Common application keys: `jira-software`, `jira-servicedesk`, `jira-core`.
- Requires **Jira administrator** global permission.

```sh
# Get approximate license count across all Jira products
atlas jira license get-approximate-count

# Get approximate count for Jira Software specifically
atlas jira license get-approximate-count-for-product jira-software
```

## `settings`

| Action        | Positional | Required flags | Optional flags |
| ------------- | ---------- | -------------- | -------------- |
| `get-columns` | —          | —              | —              |
| `set-columns` | —          | `--columns`    | —              |

- `get-columns` calls `GET /rest/api/3/settings/columns` and returns the default issue navigator columns.
- `set-columns` calls `PUT /rest/api/3/settings/columns` and replaces the default column configuration. Requires **Jira administrator** global permission.
- `--columns` is a **JSON array** of `{label, value}` objects where `value` is the column field key. Example: `[{"label":"Key","value":"issuekey"},{"label":"Summary","value":"summary"}]`.

```sh
# Get the current default issue navigator columns
atlas jira settings get-columns

# Set the default columns to Key and Summary
atlas jira settings set-columns --columns '[{"label":"Key","value":"issuekey"},{"label":"Summary","value":"summary"}]'
```

## `redact`

| Action       | Positional | Required flags | Optional flags |
| ------------ | ---------- | -------------- | -------------- |
| `start`      | —          | `--jql`        | `--field-ids`  |
| `get-status` | `<jobId>`  | —              | —              |

- `start` calls `POST /rest/api/3/redact` to begin an asynchronous issue redaction job. Returns a `jobId` for polling. **Admin-only endpoint.**
- `get-status` calls `GET /rest/api/3/redact/status/{jobId}` to check progress. Returns status: `IN_PROGRESS`, `COMPLETE`, or `FAILED`.
- `--jql` — JQL query identifying issues to redact. Required.
- `--field-ids` — **comma-separated** field IDs to redact. When omitted, all text fields are redacted.

```sh
# Start a redaction job for issues matching a JQL query
atlas jira redact start --jql "project = PROJ AND summary ~ secret"

# Redact specific fields only
atlas jira redact start --jql "project = PROJ" --field-ids summary,description

# Check the status of a running redaction job
atlas jira redact get-status job-abc123
```

## `flag`

**URL base:** `/rest/featureflags/0.1` (Jira Software DevInfo Feature Flags API — not `/rest/api/3`).

| Action   | Positional        | Required flags | Optional flags |
| -------- | ----------------- | -------------- | -------------- |
| `get`    | `<featureFlagId>` | —              | —              |
| `delete` | `<featureFlagId>` | —              | —              |

- Feature flag entities are stored via the Jira DevInfo API when CI/CD tools push flag state to Jira.
- Requires a **Connect app** or **OAuth 2.0 (M2M)** token with the `FEATURE_FLAGS` scope; basic auth (API token) is typically not accepted.

```sh
# Get a feature flag entity by ID
atlas jira flag get flag-xyz

# Delete a feature flag entity by ID
atlas jira flag delete flag-xyz
```

## `task`

| Action   | Positional | Required flags | Optional flags |
| -------- | ---------- | -------------- | -------------- |
| `get`    | `<taskId>` | —              | —              |
| `cancel` | `<taskId>` | —              | —              |

- `get` calls `GET /rest/api/3/task/{taskId}` to retrieve the status of a long-running async Jira task. Tasks are created by operations such as bulk field updates.
- `cancel` calls `POST /rest/api/3/task/{taskId}/cancel` to request cancellation of a running task. Only tasks with status `RUNNING` or `ENQUEUED` can be cancelled.
- Task status values: `ENQUEUED`, `RUNNING`, `COMPLETE`, `FAILED`, `CANCEL_REQUESTED`, `CANCELLED`, `DEAD`.
- `progress` is a 0–100 percentage; `elapsedRuntime`, `submitted`, `started`, `finished`, and `lastUpdate` are Unix timestamps in milliseconds.

```sh
# Get the status of a long-running task
atlas jira task get task-123

# Cancel a running task
atlas jira task cancel task-123
```

## `avatar`

| Action        | Positional | Required flags | Optional flags |
| ------------- | ---------- | -------------- | -------------- |
| `list-system` | `<type>`   | —              | —              |

- `<type>` is one of `issuetype`, `project`, or `user`.
- Returns all system (built-in) avatars for the given type.

```sh
# List system avatars for issue types
atlas jira avatar list-system issuetype

# List system avatars for projects
atlas jira avatar list-system project
```

## `custom-field-option`

| Action | Positional | Required flags | Optional flags |
| ------ | ---------- | -------------- | -------------- |
| `get`  | `<id>`     | —              | —              |

```sh
# Get a custom field option by ID
atlas jira custom-field-option get 10001
```

## `classification-levels`

| Action | Positional | Required flags | Optional flags |
| ------ | ---------- | -------------- | -------------- |
| `list` | —          | —              | —              |

```sh
# List all data classification levels
atlas jira classification-levels list
```

## `latest`

**URL base:** `/rest/internal/api/latest` (Jira Internal API — not `/rest/api/3`).

This resource exposes the internal worklog bulk endpoint. Stability is not guaranteed by Atlassian.

| Action         | Positional | Required flags | Optional flags |
| -------------- | ---------- | -------------- | -------------- |
| `bulk-worklog` | —          | `--value`      | —              |

- `--value` must be a JSON array of worklog objects, each with `issueIdOrKey`, `timeSpentSeconds`, `started`, and optional `comment` / `authorAccountId`.

```sh
# Bulk-create worklogs via the internal API
atlas jira latest bulk-worklog --value '[{"issueIdOrKey":"PROJ-1","timeSpentSeconds":3600,"started":"2024-01-01T09:00:00.000+0000"}]'
```

## `remote-link`

**URL base:** `/rest/remotelinks/1.0` (Jira Remote Links integration API — not `/rest/api/3`).

This is distinct from issue-scoped remote links (`/rest/api/3/issue/{issueIdOrKey}/remotelink`).

| Action   | Positional       | Required flags | Optional flags |
| -------- | ---------------- | -------------- | -------------- |
| `get`    | `<remoteLinkId>` | —              | —              |
| `delete` | `<remoteLinkId>` | —              | —              |

```sh
# Get a remote link by ID
atlas jira remote-link get rl-123

# Delete a remote link by ID
atlas jira remote-link delete rl-123
```

## `service-registry`

**URL base:** `/rest/atlassian-connect/1` (Atlassian Connect API — not `/rest/api/3`).

| Action | Positional | Required flags | Optional flags |
| ------ | ---------- | -------------- | -------------- |
| `get`  | —          | —              | —              |

```sh
# Get the Connect service registry (installed apps)
atlas jira service-registry get
```

## `addons`

Manage app properties for Atlassian Connect apps (B939-B942).

**URL base:** `/rest/atlassian-connect/1` (Atlassian Connect API — not `/rest/api/3`).

Only a Connect app whose key matches `addonKey` can call these endpoints.
Forge apps with `app.connect.key` can also access Connect app properties.

| Action            | Positional                 | Required flags | Optional flags |
| ----------------- | -------------------------- | -------------- | -------------- |
| `list-properties` | `<addonKey>`               | —              | —              |
| `get-property`    | `<addonKey> <propertyKey>` | —              | —              |
| `set-property`    | `<addonKey> <propertyKey>` | `--value`      | —              |
| `delete-property` | `<addonKey> <propertyKey>` | —              | —              |

- `--value`: JSON value to store as the property value (must be valid non-empty JSON, max 32768 characters).

```sh
# List all property keys for a Connect app — B939
atlas jira addons list-properties my-connect-app

# Get a specific property value — B941
atlas jira addons get-property my-connect-app my-setting

# Set (create or update) a property — B942
atlas jira addons set-property my-connect-app my-setting --value '{"enabled":true}'
atlas jira addons set-property my-connect-app config --value '"simple-string-value"'

# Delete a property — B940
atlas jira addons delete-property my-connect-app my-setting
```

## `exists-by-properties`

**URL base:** `/rest/devinfo/0.10` (Jira Development Information API — not `/rest/api/3`).

| Action | Positional | Required flags | Optional flags                 |
| ------ | ---------- | -------------- | ------------------------------ |
| `get`  | —          | —              | `--entity-type`, `--entity-id` |

```sh
# Check if any dev info entities exist
atlas jira exists-by-properties get

# Check by entity type
atlas jira exists-by-properties get --entity-type repository

# Check by entity type and ID
atlas jira exists-by-properties get --entity-type repository --entity-id repo-1
```

## `repository`

**URL base:** `/rest/devinfo/0.10` (Jira Development Information API — not `/rest/api/3`).

| Action          | Positional                               | Required flags | Optional flags         |
| --------------- | ---------------------------------------- | -------------- | ---------------------- |
| `get`           | `<repositoryId>`                         | —              | —                      |
| `delete`        | `<repositoryId>`                         | —              | `--update-sequence-id` |
| `delete-entity` | `<repositoryId> <entityType> <entityId>` | —              | `--update-sequence-id` |

```sh
# Get a repository and its associated dev-info entities
atlas jira repository get my-repo-123

# Delete a repository and all its dev-info entities
atlas jira repository delete my-repo-123

# Delete with sequential update ordering
atlas jira repository delete my-repo-123 --update-sequence-id 42

# Delete a specific entity (commit, branch, pullRequest) from a repository
atlas jira repository delete-entity my-repo-123 commit abc123

# Delete a specific pull request entity with update sequence ID
atlas jira repository delete-entity my-repo-123 pullRequest pr-1 --update-sequence-id 42
```

## `dashboards`

`list`, `get`, `create`, `update`, `delete` cover `/rest/api/3/dashboard` plus `listAll()` generator pagination over `GET /dashboard`. The actions below add the platform's full dashboard surface (B391–B405).

| Action                   | Positional                             | Required flags                   | Optional flags                                                                                                                                                   |
| ------------------------ | -------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list-gadgets`           | `<dashboardId>`                        | —                                | —                                                                                                                                                                |
| `add-gadget`             | `<dashboardId>`                        | —                                | `--module-key`, `--uri`, `--color`, `--row` + `--column`, `--title`, `--ignore-uri-and-module-key-validation`                                                    |
| `update-gadget`          | `<dashboardId> <gadgetId>`             | —                                | `--title`, `--color`, `--row` + `--column`                                                                                                                       |
| `remove-gadget`          | `<dashboardId> <gadgetId>`             | —                                | —                                                                                                                                                                |
| `list-item-properties`   | `<dashboardId> <itemId>`               | —                                | —                                                                                                                                                                |
| `get-item-property`      | `<dashboardId> <itemId> <propertyKey>` | —                                | —                                                                                                                                                                |
| `set-item-property`      | `<dashboardId> <itemId> <propertyKey>` | `--value` (JSON)                 | —                                                                                                                                                                |
| `delete-item-property`   | `<dashboardId> <itemId> <propertyKey>` | —                                | —                                                                                                                                                                |
| `copy`                   | `<dashboardId>`                        | —                                | `--name`, `--description`, `--share-permissions` (JSON), `--edit-permissions` (JSON)                                                                             |
| `bulk-edit`              | —                                      | `--entity-ids` (csv), `--action` | `--new-owner`, `--autofix-name`, `--extend-admin-permissions`, `--share-permissions`, `--edit-permissions`                                                       |
| `list-available-gadgets` | —                                      | —                                | `--module-keys` (csv), `--uris` (csv), `--gadget-ids` (csv), `--dashboard-ids` (csv)                                                                             |
| `search`                 | —                                      | —                                | `--dashboard-name`, `--account-id`, `--owner`, `--group-name`, `--group-id`, `--project-id`, `--order-by`, `--status`, `--start-at`, `--max-results`, `--expand` |
| `search-all`             | —                                      | —                                | (same as `search` minus `--start-at`) plus `--max-pages`                                                                                                         |

- `--row` and `--column` must be supplied together (gadget position).
- `--action` for `bulk-edit` is one of: `changeOwner`, `changePermission`, `addPermission`, `removePermission`, `changePermissionAndAddPermission`, `delete`.
- `--order-by` for `search` accepts `description`, `favorite_count`, `id`, `is_favorite`, `name`, `owner` (each may be prefixed with `+` or `-`).
- `--status` for `search` is one of: `active`, `archived`, `deleted`.
- `--share-permissions` / `--edit-permissions` are **JSON arrays** of share-permission objects: `[{"type":"global"}]`, `[{"type":"user","user":{"accountId":"..."}}]`, etc.
- `set-item-property` `--value` is parsed as JSON (strings must be quoted: `--value '"hello"'`).
- `search-all` collects every result into a single array; `--max-pages` (default 10 000) caps iteration on misbehaving servers.

```sh
# Search for dashboards by name
atlas jira dashboards search --dashboard-name "Sprint" --order-by -favorite_count --max-results 25

# List gadgets on a dashboard
atlas jira dashboards list-gadgets 10001

# Add a gadget at row 1, column 1
atlas jira dashboards add-gadget 10001 --module-key com.atlassian.jira.gadgets:filter-results-gadget --row 1 --column 1 --title "My Gadget"

# Rename a gadget
atlas jira dashboards update-gadget 10001 5 --title "Renamed"

# Remove a gadget
atlas jira dashboards remove-gadget 10001 5

# Manage dashboard item properties
atlas jira dashboards list-item-properties 10001 itm-1
atlas jira dashboards get-item-property 10001 itm-1 my-key
atlas jira dashboards set-item-property 10001 itm-1 my-key --value '{"enabled":true}'
atlas jira dashboards delete-item-property 10001 itm-1 my-key

# Copy a dashboard with new metadata
atlas jira dashboards copy 10001 --name "Copy of Sprint" --share-permissions '[{"type":"global"}]'

# Bulk-delete dashboards
atlas jira dashboards bulk-edit --entity-ids 10001,10002 --action delete

# Bulk transfer ownership
atlas jira dashboards bulk-edit --entity-ids 10001 --action changeOwner --new-owner acc-1 --autofix-name

# List gadget catalogue
atlas jira dashboards list-available-gadgets --module-keys com.x:a,com.x:b
```

## `bulk`

Atlassian bulk-operations API and DevOps `POST /bulk` ingest variants. Core
operations (`delete-issues`, `edit-fields`, `move-issues`,
`transition-issues`, `watch-issues`, `unwatch-issues`) return a
`{ taskId }` envelope. Poll progress with `bulk get-status <taskId>` —
the CLI does NOT auto-poll, callers drive the cadence.

**URL bases:**

- Core endpoints: `/rest/api/3/bulk/*`
- DevOps ingest endpoints use their own bases — `builds 0.1`, `deployments 0.1`, `devinfo 0.10`, `devopscomponents 1.0`, `featureflags 0.1`, `operations 1.0`, `remotelinks 1.0`, `security 1.0`.

| Action                     | Positional      | Required flags                     | Optional flags                                         |
| -------------------------- | --------------- | ---------------------------------- | ------------------------------------------------------ |
| `create-issues`            | —               | `--issues`                         | —                                                      |
| `delete-issues`            | —               | `--issues`                         | `--send-notification`                                  |
| `get-fields`               | —               | `--issues`                         | `--search-text`, `--ending-before`, `--starting-after` |
| `edit-fields`              | —               | `--issues`, `--actions`, `--value` | `--send-notification`                                  |
| `move-issues`              | —               | `--value`                          | `--send-notification`                                  |
| `get-transitions`          | —               | `--issues`                         | —                                                      |
| `transition-issues`        | —               | `--value`                          | `--send-notification`                                  |
| `unwatch-issues`           | —               | `--issues`                         | —                                                      |
| `watch-issues`             | —               | `--issues`                         | —                                                      |
| `get-status`               | `<taskId>`      | —                                  | —                                                      |
| `set-property`             | `<propertyKey>` | `--value`                          | `--filter`                                             |
| `delete-property`          | `<propertyKey>` | —                                  | `--filter`                                             |
| `submit-builds`            | —               | `--value`                          | —                                                      |
| `submit-deployments`       | —               | `--value`                          | —                                                      |
| `submit-devinfo`           | —               | `--value`                          | —                                                      |
| `submit-devops-components` | —               | `--value`                          | —                                                      |
| `submit-feature-flags`     | —               | `--value`                          | —                                                      |
| `submit-operations`        | —               | `--value`                          | —                                                      |
| `submit-remote-links`      | —               | `--value`                          | —                                                      |
| `submit-security`          | —               | `--value`                          | —                                                      |

`--issues` accepts either a JSON array of issue-update objects (for `create-issues`, where each element is `{ fields: {...}, update?: {...} }`) or a comma-separated list of issue IDs/keys (for `delete-issues`, `get-fields`, `unwatch-issues`, `watch-issues`, `get-transitions`). `--actions` is a comma-separated list of bulk-edit actions. `--value` is a JSON string: an object for `edit-fields` (`editedFieldsInput`), `move-issues` (`targetToSourcesMapping`), and `set-property` (the property value); an array for `transition-issues` (`bulkTransitionInputs`); and the raw provider payload for every DevOps `submit-*` variant. `--filter` for `set-property` / `delete-property` is a JSON object restricting which issues are affected (`entityIds`, `currentValue`, `hasProperty`).

```sh
# Bulk create two issues (B518)
atlas jira bulk create-issues \
  --issues '[{"fields":{"project":{"key":"PROJ"},"summary":"Issue 1","issuetype":{"name":"Bug"}}},{"fields":{"project":{"key":"PROJ"},"summary":"Issue 2","issuetype":{"name":"Task"}}}]'

# Bulk delete two issues, suppress notifications
atlas jira bulk delete-issues --issues 10001,10002 --send-notification false

# List fields available for bulk edit on two issues
atlas jira bulk get-fields --issues PROJ-1,PROJ-2 --search-text priority

# Bulk edit the priority on a single issue
atlas jira bulk edit-fields \
  --issues 10001 \
  --actions priority \
  --value '{"priority":{"priorityId":"3"}}'

# Bulk move issues to PROJ / issuetype 10001
atlas jira bulk move-issues --value '{"PROJ,10001":{"issueIdsOrKeys":["ISSUE-1"]}}'

# List available transitions for two issues
atlas jira bulk get-transitions --issues EPIC-1,TASK-1

# Bulk transition: two issues to transition 11
atlas jira bulk transition-issues \
  --value '[{"selectedIssueIdsOrKeys":["10001","10002"],"transitionId":"11"}]'

# Bulk watch / unwatch
atlas jira bulk watch-issues --issues 10001,10002
atlas jira bulk unwatch-issues --issues 10001,10002

# Poll a previously submitted task
atlas jira bulk get-status 10641

# Bulk set a property on issues matching a filter (B526)
atlas jira bulk set-property my-flag \
  --value '{"owner":"admin","weight":100}' \
  --filter '{"entityIds":[10100,10002]}'

# Bulk delete a property from issues matching a filter (B525)
atlas jira bulk delete-property my-flag \
  --filter '{"currentValue":"deprecated value"}'

# Bulk delete a property from ALL eligible issues (no filter)
atlas jira bulk delete-property my-flag

# DevOps ingest examples (payload shape is provider-specific)
atlas jira bulk submit-builds --value '{"providerMetadata":{"product":"my-ci"},"builds":[]}'
atlas jira bulk submit-deployments --value '{"deployments":[]}'
atlas jira bulk submit-feature-flags --value '{"flags":[]}'
```

## `issue-attachments`

Covers the platform's `/rest/api/3/attachment` surface (B336, B337, B338–B342) plus the issue-scoped `list` (via `GET /issue/{key}?fields=attachment`) and `upload` (`POST /issue/{key}/attachments`).

| Action               | Positional       | Required flags | Optional flags                                               |
| -------------------- | ---------------- | -------------- | ------------------------------------------------------------ |
| `list`               | `<issueIdOrKey>` | —              | —                                                            |
| `get`                | `<attachmentId>` | —              | —                                                            |
| `delete`             | `<attachmentId>` | —              | —                                                            |
| `expand-human`       | `<attachmentId>` | —              | —                                                            |
| `expand-raw`         | `<attachmentId>` | —              | —                                                            |
| `download-content`   | `<attachmentId>` | —              | `--redirect`                                                 |
| `get-meta`           | —                | —              | —                                                            |
| `download-thumbnail` | `<attachmentId>` | —              | `--redirect`, `--fallback-to-default`, `--width`, `--height` |
| `upload`             | `<issueIdOrKey>` | `--file`       | `--filename`, `--media-type`                                 |

- `expand-human` / `expand-raw` are only meaningful for archive-typed attachments (zip, tar, etc.). `human` returns each entry's `size` as a pre-formatted string (`"2.5 kB"`); `raw` returns it as a byte count.
- `download-content` and `download-thumbnail` buffer the binary response into memory. The CLI prints a `{ "bytes": N }` summary instead of the raw bytes — use the SDK (`client.issueAttachments.downloadContent`) when you need the actual `ArrayBuffer`.
- `--redirect=false` asks the server to return the binary body inline instead of a `303` redirect to its media-CDN. The runtime `fetch` follows the redirect transparently either way, so the CLI behaviour is identical; the flag is exposed for API parity.
- `--fallback-to-default=true` (thumbnail only) returns a generic placeholder image when the attachment has no renderable preview, instead of `404`.
- `upload` reads the file from disk into a `Blob` and POSTs multipart form data with `X-Atlassian-Token: no-check` (Jira requires this to bypass XSRF validation). `--filename` defaults to the basename of `--file`.
- `get-meta` returns instance-level settings (`{ enabled, uploadLimit }`); no positional or flags.

```sh
# Get metadata for a specific attachment, then delete it
atlas jira issue-attachments get 10001
atlas jira issue-attachments delete 10001

# List attachments on an issue
atlas jira issue-attachments list PROJ-1

# Inspect a zip attachment's contents
atlas jira issue-attachments expand-human 10001
atlas jira issue-attachments expand-raw 10001

# Download the file bytes (CLI prints { bytes: N } — use the SDK for the buffer)
atlas jira issue-attachments download-content 10001
atlas jira issue-attachments download-content 10001 --redirect false

# Instance-level attachment settings
atlas jira issue-attachments get-meta

# Render a 200x200 thumbnail with a placeholder fallback
atlas jira issue-attachments download-thumbnail 10001 \
  --width 200 --height 200 --fallback-to-default true

# Upload a file from disk to an issue
atlas jira issue-attachments upload PROJ-1 --file ./screenshot.png --media-type image/png
```

## `filters`

Saved JQL filters, their owners, share permissions, favourites, and
per-user default share scope.

| Action                    | Positional                  | Required flags         | Optional flags                                                                                 |
| ------------------------- | --------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------- |
| `search`                  | —                           | —                      | `--start-at`, `--max-results`, `--expand`, `--ids`, `--order-by`                               |
| `get`                     | `<filterId>`                | —                      | —                                                                                              |
| `create`                  | —                           | `--name`               | `--description`, `--jql`, `--favourite`, `--share-permissions`, `--edit-permissions`           |
| `update`                  | `<filterId>`                | at least one body flag | `--name`, `--description`, `--jql`, `--favourite`, `--share-permissions`, `--edit-permissions` |
| `delete`                  | `<filterId>`                | —                      | —                                                                                              |
| `list-favourites`         | —                           | —                      | `--expand`                                                                                     |
| `list-my`                 | —                           | —                      | `--expand`, `--include-favourites`                                                             |
| `add-favourite`           | `<filterId>`                | —                      | `--expand`                                                                                     |
| `remove-favourite`        | `<filterId>`                | —                      | `--expand`                                                                                     |
| `change-owner`            | `<filterId>`                | `--account-id`         | —                                                                                              |
| `get-columns`             | `<filterId>`                | —                      | —                                                                                              |
| `set-columns`             | `<filterId>`                | `--columns`            | —                                                                                              |
| `reset-columns`           | `<filterId>`                | —                      | —                                                                                              |
| `list-permissions`        | `<filterId>`                | —                      | —                                                                                              |
| `add-permission`          | `<filterId>`                | `--share-type`         | `--project-id`, `--group-name`, `--group-id`, `--role-id`, `--account-id`, `--rights`          |
| `get-permission`          | `<filterId> <permissionId>` | —                      | —                                                                                              |
| `delete-permission`       | `<filterId> <permissionId>` | —                      | —                                                                                              |
| `get-default-share-scope` | —                           | —                      | —                                                                                              |
| `set-default-share-scope` | —                           | `--share-scope`        | —                                                                                              |

- `--share-scope` ∈ `GLOBAL`, `AUTHENTICATED`, `PRIVATE`.
- `--share-type` ∈ `user`, `group`, `project`, `projectRole`, `global`, `loggedin`, `authenticated`. Each kind expects additional flags: `project` → `--project-id`; `projectRole` → `--project-id` + `--role-id`; `group` → `--group-name` or `--group-id`; `user` → `--account-id`.
- `--ids` (on `search`) is a **comma-separated** list of numeric filter IDs.
- `--columns` (on `set-columns`) is a **comma-separated** list of column field keys (e.g. `issuekey,summary,assignee`); the Jira endpoint expects repeated form fields, which the transport handles.
- `--share-permissions` and `--edit-permissions` (on `create`/`update`) are **JSON arrays** of `FilterSharePermission` objects.

```sh
# Search filters
atlas jira filters search --order-by name --max-results 50

# Get a filter by ID
atlas jira filters get 10001

# Mark / unmark favourite
atlas jira filters add-favourite 10001
atlas jira filters remove-favourite 10001

# Reassign filter owner
atlas jira filters change-owner 10001 --account-id 5b10a2844c20165700ede21g

# Replace the filter's saved column configuration
atlas jira filters set-columns 10001 --columns issuekey,summary,assignee,status

# Reset to the system default columns
atlas jira filters reset-columns 10001

# Share with a project role
atlas jira filters add-permission 10001 --share-type projectRole --project-id 10000 --role-id 10100

# List/get/delete a single permission
atlas jira filters list-permissions 10001
atlas jira filters get-permission 10001 20001
atlas jira filters delete-permission 10001 20001

# Default share scope
atlas jira filters get-default-share-scope
atlas jira filters set-default-share-scope --share-scope PRIVATE
```

## `issue-type-screen-schemes`

Issue Type Screen Schemes control which screens are shown for each issue type
within a project. They map issue type IDs to screen scheme IDs and can be
assigned to projects.

**Actions:** `list`, `create`, `update`, `delete`, `update-mapping`,
`update-default-mapping`, `remove-mappings`, `get-project`, `list-mapping`,
`list-project-mappings`, `assign-to-project`

| Action                   | Positional arg            | Key flags                                                      | Returns                    |
| ------------------------ | ------------------------- | -------------------------------------------------------------- | -------------------------- |
| `list`                   | —                         | `--ids`, `--query`, `--start-at`, `--max-results`              | paginated schemes          |
| `create`                 | —                         | `--name` (req), `--mappings` (req JSON array), `--description` | `{ id }`                   |
| `update`                 | `issueTypeScreenSchemeId` | `--name`, `--description`                                      | `{ updated: true }`        |
| `delete`                 | `issueTypeScreenSchemeId` | —                                                              | `{ deleted: true }`        |
| `update-mapping`         | `issueTypeScreenSchemeId` | `--mappings` (req JSON array)                                  | `{ updated: true }`        |
| `update-default-mapping` | `issueTypeScreenSchemeId` | `--screen-scheme-id` (req)                                     | `{ updated: true }`        |
| `remove-mappings`        | `issueTypeScreenSchemeId` | `--issue-type-ids` (req, CSV)                                  | `{ removed: true }`        |
| `get-project`            | `issueTypeScreenSchemeId` | `--start-at`, `--max-results`                                  | paginated projects         |
| `list-mapping`           | —                         | `--scheme-ids` (CSV), `--start-at`, `--max-results`            | paginated mappings         |
| `list-project-mappings`  | —                         | `--project-ids` (req, CSV), `--start-at`, `--max-results`      | paginated project mappings |
| `assign-to-project`      | —                         | `--scheme-id` (req), `--project-id` (req)                      | `{ assigned: true }`       |

The `--mappings` flag accepts a JSON array of `{ issueTypeId, screenSchemeId }` objects.

```sh
# List all schemes
atlas jira issue-type-screen-schemes list --max-results 50

# Create a scheme
atlas jira issue-type-screen-schemes create --name "Default" --mappings '[{"issueTypeId":"10000","screenSchemeId":"10001"}]'

# Update scheme name
atlas jira issue-type-screen-schemes update 10001 --name "Renamed"

# Delete a scheme
atlas jira issue-type-screen-schemes delete 10001

# Update mappings (append/replace)
atlas jira issue-type-screen-schemes update-mapping 10001 --mappings '[{"issueTypeId":"10000","screenSchemeId":"10002"}]'

# Update the default mapping
atlas jira issue-type-screen-schemes update-default-mapping 10001 --screen-scheme-id 10002

# Remove specific issue type mappings
atlas jira issue-type-screen-schemes remove-mappings 10001 --issue-type-ids 10000,10001

# Get projects using a scheme
atlas jira issue-type-screen-schemes get-project 10001 --max-results 25

# List all issue-type-to-screen-scheme mappings
atlas jira issue-type-screen-schemes list-mapping --scheme-ids 10001,10002

# List project-to-scheme mappings
atlas jira issue-type-screen-schemes list-project-mappings --project-ids 10001,10002

# Assign a scheme to a project
atlas jira issue-type-screen-schemes assign-to-project --scheme-id 10001 --project-id 10002
```

## `permission-schemes`

Jira permission schemes and per-scheme permission grants under `/rest/api/3/permissionscheme` (B616–B624).

| Action              | Positional                  | Required flags                                           | Optional flags                                                                      |
| ------------------- | --------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `list`              | —                           | —                                                        | `--expand`                                                                          |
| `get`               | `<schemeId>`                | —                                                        | `--expand`                                                                          |
| `create`            | —                           | `--name`                                                 | `--description`, `--permissions`, `--expand`                                        |
| `update`            | `<schemeId>`                | at least one of `--name`/`--description`/`--permissions` | `--expand`                                                                          |
| `delete`            | `<schemeId>`                | —                                                        | —                                                                                   |
| `list-permissions`  | `<schemeId>`                | —                                                        | `--expand`                                                                          |
| `create-permission` | `<schemeId>`                | —                                                        | `--permission`, `--holder-type`, `--holder-parameter`, `--holder-value`, `--expand` |
| `get-permission`    | `<schemeId> <permissionId>` | —                                                        | `--expand`                                                                          |
| `delete-permission` | `<schemeId> <permissionId>` | —                                                        | —                                                                                   |

- `--expand` on `list`/`get`/`create`/`update` accepts `permissions` to inline the grant list; on grant endpoints (`list-permissions`, `create-permission`, `get-permission`) accepts `all` or `field`.
- `--permissions` (on `create`/`update`) is a **JSON array** of `PermissionGrant` objects, e.g. `'[{"holder":{"type":"anyone"},"permission":"BROWSE_PROJECTS"}]'`.
- `--permission` (on `create-permission`) is a single permission key string, e.g. `BROWSE_PROJECTS`.
- `--holder-type` identifies the grantee category: `anyone`, `applicationRole`, `assignee`, `group`, `groupCustomField`, `projectLead`, `projectRole`, `reporter`, `sd.customer.portal.only`, `user`, `userCustomField`.
- `--holder-parameter` supplies the required qualifier for role/group/user holder types (role ID, group name, account ID, etc.).
- `--holder-value` is an optional secondary value used by some holder types.

```sh
# List all permission schemes
atlas jira permission-schemes list

# List schemes and inline their grants
atlas jira permission-schemes list --expand permissions

# Get a specific scheme by ID
atlas jira permission-schemes get 10000

# Get a scheme and expand its grants
atlas jira permission-schemes get 10000 --expand permissions

# Create a new scheme with a name
atlas jira permission-schemes create --name "Default Scheme"

# Create a scheme with an initial grant (browse access for everyone)
atlas jira permission-schemes create \
  --name "Open Scheme" \
  --description "Everyone can browse" \
  --permissions '[{"holder":{"type":"anyone"},"permission":"BROWSE_PROJECTS"}]'

# Update a scheme's name and description
atlas jira permission-schemes update 10000 --name "Renamed Scheme" --description "Updated description"

# Delete a permission scheme
atlas jira permission-schemes delete 10000

# List all permission grants on a scheme
atlas jira permission-schemes list-permissions 10000

# Add a browse grant for all logged-in users
atlas jira permission-schemes create-permission 10000 \
  --holder-type anyone \
  --permission BROWSE_PROJECTS

# Add a grant scoped to a specific group
atlas jira permission-schemes create-permission 10000 \
  --holder-type group \
  --holder-parameter developers \
  --permission ADMINISTER_PROJECTS

# Get a single permission grant by ID
atlas jira permission-schemes get-permission 10000 10001

# Delete a permission grant
atlas jira permission-schemes delete-permission 10000 10001
```

## `resolutions`

Issue resolution management (B931, B712-B718). `list` is deprecated by Atlassian — prefer `search`.

| Action        | Positional | Required flags                            | Optional flags                                                             |
| ------------- | ---------- | ----------------------------------------- | -------------------------------------------------------------------------- |
| `list`        | —          | —                                         | — (deprecated; no filtering)                                               |
| `get`         | `<id>`     | —                                         | —                                                                          |
| `create`      | —          | `--name`                                  | `--description`                                                            |
| `update`      | `<id>`     | at least one of `--name`, `--description` | —                                                                          |
| `delete`      | `<id>`     | —                                         | `--replace-with`                                                           |
| `set-default` | `<id>`     | —                                         | —                                                                          |
| `move`        | —          | `--ids`                                   | `--after` or `--before`                                                    |
| `search`      | —          | —                                         | `--query-string`, `--only-default`, `--start-at`, `--max-results`, `--ids` |

- `--ids` is comma-separated (for `move` and `search`).
- `--replace-with` is the ID of the replacement resolution when deleting a resolution that is in use.
- `--after` / `--before` for `move`: the ID of the resolution after/before which the moved items are placed (mutually exclusive).
- `--only-default`: boolean flag; when set only the default resolution is returned.

```sh
atlas jira resolutions list
atlas jira resolutions get 10001
atlas jira resolutions create --name "Fixed"
atlas jira resolutions create --name "Won't Fix" --description "Not a bug"
atlas jira resolutions update 10001 --name "Fixed" --description "Issue was fixed"
atlas jira resolutions delete 10001 --replace-with 10000
atlas jira resolutions set-default 10001
atlas jira resolutions move --ids 10001,10002 --after 10000
atlas jira resolutions search --query-string "Won't" --max-results 10
atlas jira resolutions search --only-default
```

## `statuses` (extended — B777-B784)

Bulk management, usage queries, and search for the `/rest/api/3/statuses` surface.

| Action                  | Positional                 | Required flags | Optional flags                                                                        |
| ----------------------- | -------------------------- | -------------- | ------------------------------------------------------------------------------------- |
| `list`                  | —                          | —              | —                                                                                     |
| `bulk-delete`           | —                          | `--ids`        | —                                                                                     |
| `bulk-create`           | —                          | `--value`      | —                                                                                     |
| `bulk-update`           | —                          | `--value`      | —                                                                                     |
| `get-issue-type-usages` | `<statusId>` `<projectId>` | —              | `--next-page-token`, `--max-results`                                                  |
| `get-project-usages`    | `<statusId>`               | —              | `--next-page-token`, `--max-results`                                                  |
| `get-workflow-usages`   | `<statusId>`               | —              | `--next-page-token`, `--max-results`                                                  |
| `by-names`              | —                          | `--names`      | —                                                                                     |
| `search`                | —                          | —              | `--project-id`, `--start-at`, `--max-results`, `--search-string`, `--status-category` |

- `--ids` for `bulk-delete`: comma-separated status IDs.
- `--value` for `bulk-create`: JSON array of `{ name, statusCategory, description?, scope? }` objects. `statusCategory` must be `TODO`, `IN_PROGRESS`, or `DONE`.
- `--value` for `bulk-update`: JSON array of `{ id, name?, description?, statusCategory? }` objects.
- `--next-page-token`: opaque token from previous page response (usages endpoints use cursor pagination, not offset).
- `--names` for `by-names`: comma-separated status names.
- `--status-category`: one of `TODO`, `IN_PROGRESS`, `DONE`.

```sh
atlas jira statuses list
atlas jira statuses bulk-delete --ids 10001,10002
atlas jira statuses bulk-create --value '[{"name":"Blocked","statusCategory":"IN_PROGRESS","description":"Awaiting external input"}]'
atlas jira statuses bulk-update --value '[{"id":"10001","name":"Renamed Status"}]'
atlas jira statuses get-issue-type-usages 10001 10002
atlas jira statuses get-project-usages 10001 --next-page-token abc123
atlas jira statuses get-workflow-usages 10001
atlas jira statuses by-names --names "In Progress,Done"
atlas jira statuses search --project-id 10000 --search-string "In Progress" --status-category IN_PROGRESS
```

## Errors specific to Jira

- **401 with a known-good token** usually means the token is API-token (basic auth) but `ATLASSIAN_AUTH_TYPE=bearer` is set, or vice versa.
- **403 on `issues create`** typically means the token lacks "Create Issues" permission in the target project, not a global scope problem.
- **400 with `"errorMessages":["The value 'X' does not exist for the field 'project'."]`** — `--project` needs the project **key** (e.g. `PROJ`), not name or ID.
- **400 with custom-field errors** — the CLI can't set custom fields. Use the SDK with `fields: { customfield_10001: ... }`.

## `roles`

Global project-role definitions at `/rest/api/3/role`. These are **top-level role definitions**, not per-project role assignments. Per-project assignments at `/rest/api/3/project/{key}/role/*` (B682–B687) are separate and belong to the `projects` resource.

| Action           | Positional | Required flags                                    | Optional flags                               |
| ---------------- | ---------- | ------------------------------------------------- | -------------------------------------------- |
| `list`           | —          | —                                                 | —                                            |
| `get`            | `<roleId>` | —                                                 | —                                            |
| `create`         | —          | `--name`                                          | `--description`                              |
| `update`         | `<roleId>` | at least one of `--name`, `--description`         | —                                            |
| `partial-update` | `<roleId>` | at least one of `--name`, `--description`         | —                                            |
| `delete`         | `<roleId>` | —                                                 | `--swap` (ID of role to reassign to)         |
| `get-actors`     | `<roleId>` | —                                                 | —                                            |
| `add-actors`     | `<roleId>` | at least one of `--user`, `--group`, `--group-id` | —                                            |
| `delete-actors`  | `<roleId>` | —                                                 | `--account-id`, `--group-name`, `--group-id` |

- `--user` and `--group-id` / `--group` for `add-actors` accept comma-separated values (multiple accounts/groups in one call).
- `--account-id` / `--group-name` / `--group-id` for `delete-actors` accept a single value each (use `--account-id` instead of `--user` to remove a single user).
- `update` (PUT) and `partial-update` (POST `/{id}`) are distinct Jira endpoints; Jira differentiates set-actors (POST) from full replace (PUT).
- `--swap` for `delete` is a numeric role ID; Jira reassigns permissions to that role before deleting.

```sh
# List all global project roles
atlas jira roles list

# Get a specific role
atlas jira roles get 10001

# Create a new role
atlas jira roles create --name "Developers" --description "Dev team role"

# Full update (PUT)
atlas jira roles update 10001 --name "Developers" --description "Updated description"

# Partial update (POST /{id})
atlas jira roles partial-update 10001 --description "Only updating description"

# Delete a role (optionally reassigning permissions)
atlas jira roles delete 10001
atlas jira roles delete 10001 --swap 10002

# Get actors (users/groups) assigned to the role by default
atlas jira roles get-actors 10001

# Add users and/or groups as default actors
atlas jira roles add-actors 10001 --user acc-1,acc-2
atlas jira roles add-actors 10001 --group-id grp-1,grp-2
atlas jira roles add-actors 10001 --group legacy-group-name

# Remove a default actor
atlas jira roles delete-actors 10001 --account-id acc-1
atlas jira roles delete-actors 10001 --group-name my-group
atlas jira roles delete-actors 10001 --group-id grp-1
```

## `expression`

Jira expression validation and evaluation at `/rest/api/3/expression/{analyse,eval,evaluate}` (B409, B904, B410).

| Action     | Positional | Required flags  | Optional flags                   |
| ---------- | ---------- | --------------- | -------------------------------- |
| `analyse`  | —          | `--expressions` | `--context-variables`, `--check` |
| `eval`     | —          | `--expression`  | `--context`, `--expand`          |
| `evaluate` | —          | `--expression`  | `--context`, `--expand`          |

- `--expressions` (on `analyse`) is a **JSON array of strings**, e.g. `'["issue.key","issue.summary"]'`.
- `--context-variables` (on `analyse`) is a **JSON object** mapping variable names to type strings, e.g. `'{"value":"User","listOfStrings":"List<String>"}'`.
- `--check` (on `analyse`) enables type-checking; values per Atlassian docs include `syntax` (default), `type`, `complexity`.
- `--expression` (on `eval`/`evaluate`) is a single Jira expression string.
- `--context` (on `eval`/`evaluate`) is a **JSON object** matching the `JiraExpressionEvalContextBean` shape (board, custom, customerRequest, issue, issues.jql, project, serviceDesk, sprint).
- `--expand` (on `eval`/`evaluate`) is a comma-separated list of expansion keys (e.g. `meta.complexity`).
- `eval` uses the enhanced (scrolling, `nextPageToken`) JQL search and is eventually consistent.
- `evaluate` uses the legacy strongly-consistent paginated JQL search (`startAt`/`totalCount`).

```sh
# Validate two expressions
atlas jira expression analyse --expressions '["issue.key","issue.summary"]'

# Validate with type-checking and context variable declarations
atlas jira expression analyse \
  --expressions '["value.accountId"]' \
  --context-variables '{"value":"User"}' \
  --check type

# Evaluate an expression against an issue (enhanced search)
atlas jira expression eval \
  --expression "issue.key" \
  --context '{"issue":{"key":"ACJIRA-1470"}}'

# Evaluate using a JQL scrolling view and expand complexity metadata
atlas jira expression eval \
  --expression "issues.map(i => i.key)" \
  --context '{"issues":{"jql":{"query":"project = ACJIRA","maxResults":100}}}' \
  --expand meta.complexity

# Evaluate against the legacy paginated JQL endpoint
atlas jira expression evaluate \
  --expression "issue.summary" \
  --context '{"issue":{"key":"ACJIRA-1470"}}' \
  --expand meta.complexity
```

## `issue-comments`

Full comment CRUD + property surface + bulk fetch (B1012, B356–B360). Wired via `client.issueComments.*`.

| Action            | Positional                   | Required flags    | Optional flags                                          |
| ----------------- | ---------------------------- | ----------------- | ------------------------------------------------------- |
| `list`            | `<issueIdOrKey>`             | —                 | `--start-at`, `--max-results`, `--order-by`, `--expand` |
| `get`             | `<issueIdOrKey> <commentId>` | —                 | —                                                       |
| `create`          | `<issueIdOrKey>`             | `--body` (JSON)   | —                                                       |
| `update`          | `<issueIdOrKey> <commentId>` | `--body` (JSON)   | —                                                       |
| `delete`          | `<issueIdOrKey> <commentId>` | —                 | —                                                       |
| `list-properties` | `<commentId>`                | —                 | —                                                       |
| `get-property`    | `<commentId> <propertyKey>`  | —                 | —                                                       |
| `set-property`    | `<commentId> <propertyKey>`  | `--value` (JSON)  | —                                                       |
| `delete-property` | `<commentId> <propertyKey>`  | —                 | —                                                       |
| `bulk-fetch`      | —                            | `--ids` (CSV int) | `--expand`                                              |

- `--body` for `create`/`update` must be a JSON object matching `CreateIssueCommentData` / `UpdateIssueCommentData`: `{ body: <ADF doc>, visibility?: { type, value } }`. The ADF body is Atlassian Document Format.
- `--value` is parsed as JSON; pass any scalar, object, or array (e.g. `--value '{"flag":true}'`, `--value 42`, `--value '"plain"'`).
- `--ids` is a comma-separated list of integer comment IDs. The Jira API caps the list at 1000 IDs.
- `--expand` accepts a comma-separated list (e.g. `renderedBody,properties`).

```sh
# List comments on an issue
atlas jira issue-comments list PROJ-123

# List with pagination and sort order
atlas jira issue-comments list PROJ-123 --start-at 0 --max-results 20 --order-by -created

# Get a single comment
atlas jira issue-comments get PROJ-123 10001

# Create a comment (ADF body)
atlas jira issue-comments create PROJ-123 --body '{"body":{"type":"doc","version":1,"content":[{"type":"paragraph","content":[{"type":"text","text":"Hello"}]}]}}'

# Update a comment
atlas jira issue-comments update PROJ-123 10001 --body '{"body":{"type":"doc","version":1,"content":[{"type":"paragraph","content":[{"type":"text","text":"Updated"}]}]}}'

# Delete a comment
atlas jira issue-comments delete PROJ-123 10001

# List property keys on a comment
atlas jira issue-comments list-properties 10001

# Get a single property
atlas jira issue-comments get-property 10001 my-key

# Set/overwrite a property with arbitrary JSON
atlas jira issue-comments set-property 10001 my-key --value '{"approved":true,"reviewer":"alice"}'

# Delete a property
atlas jira issue-comments delete-property 10001 my-key

# Bulk fetch comments by IDs
atlas jira issue-comments bulk-fetch --ids 10001,10002,10003

# Bulk fetch with rendered body
atlas jira issue-comments bulk-fetch --ids 10001,10002 --expand renderedBody,properties
```

## `labels`

Jira instance-wide label listing (B1013). Exposes all labels defined in the Jira instance via `GET /rest/api/3/label`.

| Action | Positionals | Required flags | Optional flags                |
| ------ | ----------- | -------------- | ----------------------------- |
| `list` | —           | —              | `--start-at`, `--max-results` |

```sh
# List all labels (default page)
atlas jira labels list

# List with pagination
atlas jira labels list --start-at 0 --max-results 50
```

## `priority-schemes`

Priority scheme management (B644–B651). Covers the full `/rest/api/3/priorityscheme` surface: paginated listing, create/update/delete, scheme-scoped priority and project listings, and helper endpoints for suggested mappings and available priorities.

`create` returns either `{ id }` (synchronous, 201) or `{ id, task }` (asynchronous, 202). `update` always returns asynchronously with `{ task, priorityScheme }`. `delete` is `204 No Content` and is only available for schemes without associated projects.

| Action                 | Positional   | Required flags                                                                                                 | Optional flags                                                                                                                                     |
| ---------------------- | ------------ | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list`                 | —            | —                                                                                                              | `--start-at`, `--max-results`, `--priority-ids` (CSV ints), `--scheme-ids` (CSV ints), `--scheme-name`, `--only-default`, `--order-by`, `--expand` |
| `create`               | —            | `--name`, `--default-priority-id` (int), `--priority-ids` (CSV ints)                                           | `--description`, `--project-ids` (CSV ints), `--mappings` (JSON)                                                                                   |
| `delete`               | `<schemeId>` | —                                                                                                              | —                                                                                                                                                  |
| `update`               | `<schemeId>` | at least one of `--name`, `--description`, `--default-priority-id`, `--priorities`, `--projects`, `--mappings` | —                                                                                                                                                  |
| `list-priorities`      | `<schemeId>` | —                                                                                                              | `--start-at`, `--max-results`                                                                                                                      |
| `list-projects`        | `<schemeId>` | —                                                                                                              | `--start-at`, `--max-results`, `--project-ids` (CSV ints), `--query`                                                                               |
| `suggested-mappings`   | —            | —                                                                                                              | `--scheme-id` (int), `--priorities` (JSON `{add,remove}`), `--projects` (JSON `{add}`), `--start-at`, `--max-results`                              |
| `available-priorities` | —            | `--scheme-id` (string)                                                                                         | `--query`, `--exclude` (CSV ids), `--start-at`, `--max-results`                                                                                    |

- `--order-by` must be one of `name`, `+name`, `-name`.
- `--expand` accepts comma-separated tokens (`priorities`, `projects`); inlines those sub-pages in each scheme.
- `--mappings` for `create` and `update` is a JSON object with optional `in` and `out` keys, each mapping old priority ID → new priority ID. `out` is required when updating in a way that removes projects from the scheme.
- `--priorities` for `update` is a JSON object `{ "add": { "ids": [..] }, "remove": { "ids": [..] } }`; for `suggested-mappings` it is the simpler `{ "add": [..], "remove": [..] }`.
- `--projects` for `update` follows the same `{ add: { ids: [..] }, remove: { ids: [..] } }` shape; for `suggested-mappings` it is `{ "add": [..] }` only (add-only on this endpoint).
- `available-priorities` requires `--scheme-id` as a query parameter (string per the spec). It returns the priorities you could still add to the scheme.

```sh
# List schemes (paginated, with priorities + projects inlined)
atlas jira priority-schemes list --start-at 0 --max-results 50 --expand priorities,projects

# Filter by IDs / name / default
atlas jira priority-schemes list --scheme-ids 10000,10001 --order-by -name
atlas jira priority-schemes list --scheme-name "Critical" --only-default

# Create a scheme
atlas jira priority-schemes create \
  --name "Critical Bugs" \
  --default-priority-id 10001 \
  --priority-ids 10001,10002,10003 \
  --description "Scheme for critical projects" \
  --project-ids 10100,10101

# Update a scheme (rename + add/remove priorities + mapping)
atlas jira priority-schemes update 10000 --name "Renamed Scheme" --description "Updated"
atlas jira priority-schemes update 10000 \
  --priorities '{"add":{"ids":[10003]},"remove":{"ids":[10004]}}' \
  --mappings '{"in":{"10004":10003}}'

# Delete a scheme (only if no projects use it)
atlas jira priority-schemes delete 10000

# Priorities and projects in a scheme
atlas jira priority-schemes list-priorities 10000 --start-at 0 --max-results 25
atlas jira priority-schemes list-projects 10000 --project-ids 10100,10101 --query example

# Get suggested priority mappings before applying a change
atlas jira priority-schemes suggested-mappings \
  --scheme-id 10000 \
  --priorities '{"add":[10003],"remove":[10004]}' \
  --projects '{"add":[10100]}'

# List priorities still available to add to a scheme
atlas jira priority-schemes available-priorities --scheme-id 10000 --query high --exclude 10005,10006
```

## `version`

Project version management (B820–B831, B933). Covers the full `/rest/api/3/version` surface: create, get, update, delete, merge, move, related issue counts, related work (list/create/update/delete/delete-single), delete-and-replace, and unresolved issue count.

`delete` returns `204 No Content`. `merge`, `delete-and-replace`, and `delete-related-work` also return `204`. Path params `id`, `moveIssuesTo`, `versionId`, `relatedWorkId` are positional args (not flags).

| Action                   | Positional                      | Required flags                          | Optional flags                                                                                                                                               |
| ------------------------ | ------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `create`                 | —                               | —                                       | `--name`, `--description`, `--archived`, `--released`, `--start-date`, `--release-date`, `--project`, `--project-id`, `--move-unfixed-issues-to`, `--driver` |
| `get`                    | `<id>`                          | —                                       | `--expand`                                                                                                                                                   |
| `update`                 | `<id>`                          | at least one body flag                  | `--name`, `--description`, `--archived`, `--released`, `--start-date`, `--release-date`, `--project`, `--project-id`, `--move-unfixed-issues-to`, `--driver` |
| `delete`                 | `<id>`                          | —                                       | `--move-fix-issues-to`, `--move-affected-issues-to`                                                                                                          |
| `merge`                  | `<id>` `<moveIssuesTo>`         | —                                       | —                                                                                                                                                            |
| `move`                   | `<id>`                          | at least one of `--after`, `--position` | —                                                                                                                                                            |
| `related-issue-counts`   | `<id>`                          | —                                       | —                                                                                                                                                            |
| `list-related-work`      | `<id>`                          | —                                       | —                                                                                                                                                            |
| `create-related-work`    | `<id>`                          | `--category`                            | `--issue-id` (int), `--title`, `--url`                                                                                                                       |
| `update-related-work`    | `<id>`                          | `--category`                            | `--issue-id` (int), `--title`, `--url`, `--related-work-id`                                                                                                  |
| `delete-and-replace`     | `<id>`                          | —                                       | `--move-fix-issues-to` (int version ID), `--move-affected-issues-to` (int version ID)                                                                        |
| `unresolved-issue-count` | `<id>`                          | —                                       | —                                                                                                                                                            |
| `delete-related-work`    | `<versionId>` `<relatedWorkId>` | —                                       | —                                                                                                                                                            |

- `--archived` and `--released` are bare boolean flags (e.g. `--archived`, `--released`).
- `--move-fix-issues-to` and `--move-affected-issues-to` take a version ID as a string on `delete`, or as an integer on `delete-and-replace`.
- `--position` for `move` accepts `First`, `Last`, `Earlier`, or `Later`.

````sh
# Create a version
atlas jira version create --name "v1.0" --project PROJ --release-date 2026-06-01

# Get a version
atlas jira version get 10000 --expand issuesstatus

# Update a version
atlas jira version update 10000 --name "v1.1" --released

# Delete a version (swap issues to another version)
atlas jira version delete 10000 --move-fix-issues-to 10001

# Merge two versions
atlas jira version merge 10000 10001

# Move version to a position
atlas jira version move 10000 --position Last

# Related issue counts
atlas jira version related-issue-counts 10000

# List related work
atlas jira version list-related-work 10000

# Create related work
atlas jira version create-related-work 10000 --category "Confluence page" --url "https://example.com"

# Update related work
atlas jira version update-related-work 10000 --category "Design doc" --related-work-id rw-abc --title "Updated"

# Delete and replace version
atlas jira version delete-and-replace 10000 --move-fix-issues-to 10001 --move-affected-issues-to 10001

# Unresolved issue count
atlas jira version unresolved-issue-count 10000

# Delete a single related work entry
atlas jira version delete-related-work 10000 rw-abc
## `config`

Config field association scheme management (B367–B381). Covers the `/rest/api/3/config/fieldschemes` surface: paginated listing, CRUD, clone, per-scheme field associations, per-field parameter overrides, and project association management.

**Note:** This resource is distinct from `fieldconfiguration` (`/rest/api/3/fieldconfiguration`) and `fieldconfigurationscheme` (`/rest/api/3/fieldconfigurationscheme`). It implements the newer field _association_ scheme API under `/rest/api/3/config/fieldschemes`.

**Paginated endpoints** (support `--start-at`, `--max-results`):

- `list` — GET /config/fieldschemes
- `list-fields` — GET /config/fieldschemes/{id}/fields
- `list-projects` — GET /config/fieldschemes/{id}/projects
- `get-projects-with-schemes` — GET /config/fieldschemes/projects (requires `--project-ids`)

**Body endpoints** (supply full JSON via `--body`):

- `remove-field-associations` — DELETE /config/fieldschemes/fields: `Record<fieldId, {schemeIds: number[]}>`
- `update-field-associations` — PUT /config/fieldschemes/fields: `Record<fieldId, [{schemeIds: number[], restrictedToWorkTypes?: number[]}]>`
- `remove-field-parameters` — DELETE /config/fieldschemes/fields/parameters: `Record<fieldId, [{schemeId?, workTypeIds?, parameters?}]>`
- `update-field-parameters` — PUT /config/fieldschemes/fields/parameters: `Record<fieldId, [{schemeIds?, parameters?, workTypeParameters?}]>`
- `associate-projects` — PUT /config/fieldschemes/projects: `Record<schemeId, {projectIds: number[]}>`

```sh
# List all schemes (paginated)
atlas jira config list --start-at 0 --max-results 50
atlas jira config list --project-ids 10100,10101 --query "My Scheme"

# CRUD
atlas jira config create --name "My Field Scheme" --description "Description"
atlas jira config get 10001
atlas jira config update 10001 --name "Renamed Scheme" --description "Updated"
atlas jira config delete 10001

# Clone a scheme
atlas jira config clone 10001 --name "Clone of My Scheme"

# List fields in a scheme (paginated)
atlas jira config list-fields 10001 --start-at 0 --max-results 50
atlas jira config list-fields 10001 --field-id customfield_10001,customfield_10002

# Get parameter overrides for a specific field in a scheme
atlas jira config get-field-parameters 10001 customfield_10001

# List projects associated with a scheme
atlas jira config list-projects 10001 --project-ids 10100,10101

# Remove fields from schemes (body: fieldId → schemeIds map)
atlas jira config remove-field-associations --body '{"customfield_10001":{"schemeIds":[10001,10002]}}'

# Update field→scheme associations (body: fieldId → [{schemeIds, restrictedToWorkTypes?}])
atlas jira config update-field-associations --body '{"customfield_10001":[{"schemeIds":[10001],"restrictedToWorkTypes":[1,2]}]}'

# Remove per-field parameters from schemes
atlas jira config remove-field-parameters --body '{"customfield_10001":[{"schemeId":10001,"parameters":["description"],"workTypeIds":[1]}]}'

# Update per-field parameter overrides
atlas jira config update-field-parameters --body '{"customfield_10001":[{"schemeIds":[10001],"parameters":{"isRequired":true}}]}'

# Get project→scheme mappings for given projects (projectId required)
atlas jira config get-projects-with-schemes --project-ids 10100,10101

# Associate projects to a scheme (body: schemeId → {projectIds} map)
atlas jira config associate-projects --body '{"10001":{"projectIds":[10100,10101]}}'
````

## `issuesecurityschemes`

Issue security scheme management (B539–B555). Covers the full `/rest/api/3/issuesecurityschemes` surface: listing, CRUD, security level management, level member management, and project association.

**Paginated endpoints** (support `--start-at`, `--max-results`):

- `list-members` — GET /issuesecurityschemes/{issueSecuritySchemeId}/members
- `list-levels` — GET /issuesecurityschemes/level
- `list-level-members` — GET /issuesecurityschemes/level/member
- `list-projects` — GET /issuesecurityschemes/project
- `search` — GET /issuesecurityschemes/search

| Action                 | Positional args                       | Key flags                                                                       | Returns                 |
| ---------------------- | ------------------------------------- | ------------------------------------------------------------------------------- | ----------------------- |
| `get-all`              | —                                     | `--id`, `--project-ids`, `--only-default`, `--expand`                           | SecuritySchemesResponse |
| `create`               | —                                     | `--name` (req), `--description`, `--levels` (JSON array)                        | IssueSecurityScheme     |
| `get`                  | `<id>`                                | —                                                                               | IssueSecurityScheme     |
| `update`               | `<id>`                                | `--name`, `--description` (≥1 required)                                         | `{updated:true}`        |
| `list-members`         | `<issueSecuritySchemeId>`             | `--issue-security-level-id`, `--expand`, pagination                             | PageBean                |
| `delete`               | `<schemeId>`                          | —                                                                               | `{deleted:true}`        |
| `add-levels`           | `<schemeId>`                          | `--levels` (JSON array)                                                         | `{updated:true}`        |
| `remove-level`         | `<schemeId>` `<levelId>`              | `--replace-with`                                                                | `{deleted:true}`        |
| `update-level`         | `<schemeId>` `<levelId>`              | `--name`, `--description` (≥1 required)                                         | `{updated:true}`        |
| `add-level-members`    | `<schemeId>` `<levelId>`              | `--members` (JSON array)                                                        | `{updated:true}`        |
| `remove-level-member`  | `<schemeId>` `<levelId>` `<memberId>` | —                                                                               | `{deleted:true}`        |
| `list-levels`          | —                                     | `--id`, `--scheme-id`, `--only-default`, pagination                             | PageBean                |
| `set-default-levels`   | —                                     | `--default-values` (JSON array of `{defaultLevelId, issueSecuritySchemeId}`)    | `{updated:true}`        |
| `list-level-members`   | —                                     | `--id`, `--scheme-id`, `--level-id`, `--expand`, pagination                     | PageBean                |
| `list-projects`        | —                                     | `--issue-security-scheme-id`, `--project-ids`, pagination                       | PageBean                |
| `associate-to-project` | —                                     | `--project-id` (req), `--scheme-id` (req), `--old-to-new-mappings` (JSON array) | `{updated:true}`        |
| `search`               | —                                     | `--id`, `--project-ids`, pagination                                             | PageBean                |

```sh
# List all schemes
atlas jira issuesecurityschemes get-all
atlas jira issuesecurityschemes get-all --id 10001,10002 --project-ids 10100

# CRUD
atlas jira issuesecurityschemes create --name "My Security Scheme" --description "Description"
atlas jira issuesecurityschemes get 10001
atlas jira issuesecurityschemes update 10001 --name "Renamed Scheme"
atlas jira issuesecurityschemes delete 10001

# Members of a scheme (paginated)
atlas jira issuesecurityschemes list-members 10001
atlas jira issuesecurityschemes list-members 10001 --issue-security-level-id 10100,10101

# Manage levels
atlas jira issuesecurityschemes add-levels 10001 --levels '[{"name":"Public","isDefault":true}]'
atlas jira issuesecurityschemes remove-level 10001 10100
atlas jira issuesecurityschemes remove-level 10001 10100 --replace-with 10101
atlas jira issuesecurityschemes update-level 10001 10100 --name "Renamed Level"

# Manage level members
atlas jira issuesecurityschemes add-level-members 10001 10100 --members '[{"type":"reporter"}]'
atlas jira issuesecurityschemes remove-level-member 10001 10100 10200

# List security levels (paginated)
atlas jira issuesecurityschemes list-levels
atlas jira issuesecurityschemes list-levels --scheme-id 10001,10002 --only-default

# Set default levels
atlas jira issuesecurityschemes set-default-levels --default-values '[{"issueSecuritySchemeId":"10001","defaultLevelId":"10100"}]'

# List level members (paginated)
atlas jira issuesecurityschemes list-level-members
atlas jira issuesecurityschemes list-level-members --scheme-id 10001 --level-id 10100

# Project-to-scheme mappings (paginated)
atlas jira issuesecurityschemes list-projects
atlas jira issuesecurityschemes list-projects --issue-security-scheme-id 10001 --project-ids 10100

# Associate scheme to project
atlas jira issuesecurityschemes associate-to-project --project-id 10100 --scheme-id 10001
atlas jira issuesecurityschemes associate-to-project --project-id 10100 --scheme-id 10001 --old-to-new-mappings '[{"oldLevelId":"10100","newLevelId":"10101"}]'

# Search schemes (paginated)
atlas jira issuesecurityschemes search
atlas jira issuesecurityschemes search --id 10001,10002 --project-ids 10100
```

## `screens`

Screen management (B746–B761). Covers the `/rest/api/3/screens` surface: CRUD, tab and field management, field reordering.

| Action                  | Positional                     | Required flags                            | Optional flags                                                                    |
| ----------------------- | ------------------------------ | ----------------------------------------- | --------------------------------------------------------------------------------- |
| `list`                  | —                              | —                                         | `--ids`, `--query-string`, `--scope`, `--order-by`, `--start-at`, `--max-results` |
| `create`                | —                              | `--name`                                  | `--description`                                                                   |
| `delete`                | `<screenId>`                   | —                                         | —                                                                                 |
| `update`                | `<screenId>`                   | at least one of `--name`, `--description` | —                                                                                 |
| `list-available-fields` | `<screenId>`                   | —                                         | —                                                                                 |
| `list-tabs`             | `<screenId>`                   | —                                         | `--project-key`                                                                   |
| `create-tab`            | `<screenId>`                   | `--name`                                  | —                                                                                 |
| `delete-tab`            | `<screenId>` `<tabId>`         | —                                         | —                                                                                 |
| `update-tab`            | `<screenId>` `<tabId>`         | `--name`                                  | —                                                                                 |
| `list-tab-fields`       | `<screenId>` `<tabId>`         | —                                         | `--project-key`                                                                   |
| `add-field-to-tab`      | `<screenId>` `<tabId>`         | `--field-id`                              | `--skip-field-association`                                                        |
| `remove-field-from-tab` | `<screenId>` `<tabId>` `<id>`  | —                                         | —                                                                                 |
| `move-field`            | `<screenId>` `<tabId>` `<id>`  | —                                         | `--position` (Earlier\|Later\|First\|Last), `--after`                             |
| `move-tab`              | `<screenId>` `<tabId>` `<pos>` | —                                         | —                                                                                 |
| `add-to-default`        | `<fieldId>`                    | —                                         | —                                                                                 |
| `list-all-tabs`         | —                              | —                                         | `--ids`, `--tab-ids`, `--start-at`, `--max-results`                               |

```sh
# Paginate screens
atlas jira screens list --max-results 50

# Filter by IDs and search string
atlas jira screens list --ids 10001,10002 --query-string Default

# Create a screen
atlas jira screens create --name "Default Screen" --description "Main screen"

# Update a screen
atlas jira screens update 10001 --name "Renamed Screen"

# Delete a screen
atlas jira screens delete 10001

# List fields available to add to a screen
atlas jira screens list-available-fields 10001

# List tabs on a screen
atlas jira screens list-tabs 10001

# List tabs visible to a specific project
atlas jira screens list-tabs 10001 --project-key PROJ

# Create a tab
atlas jira screens create-tab 10001 --name "Field Tab"

# Rename a tab
atlas jira screens update-tab 10001 1 --name "Renamed Tab"

# Delete a tab
atlas jira screens delete-tab 10001 1

# List fields on a tab
atlas jira screens list-tab-fields 10001 1 --project-key PROJ

# Add a field to a tab
atlas jira screens add-field-to-tab 10001 1 --field-id summary

# Add a field, skipping screen-to-field association
atlas jira screens add-field-to-tab 10001 1 --field-id summary --skip-field-association

# Remove a field from a tab
atlas jira screens remove-field-from-tab 10001 1 summary

# Move a field to the first position
atlas jira screens move-field 10001 1 summary --position First

# Move a field after another field
atlas jira screens move-field 10001 1 summary --after description

# Move a tab to position 0
atlas jira screens move-tab 10001 1 0

# Add a field to the default screen
atlas jira screens add-to-default summary

# List all screen-tab cross-references
atlas jira screens list-all-tabs --ids 10001,10002
```

## `screenscheme`

Screen scheme management (B762–B765). Covers the `/rest/api/3/screenscheme` surface: paginated listing, create, update, and delete. Screen schemes define which screens are used for each issue operation (view, create, edit).

| Action     | Positional         | Required flags               | Optional flags                                                                                     |
| ---------- | ------------------ | ---------------------------- | -------------------------------------------------------------------------------------------------- |
| `list`     | —                  | —                            | `--ids`, `--query-string`, `--expand`, `--order-by`, `--start-at`, `--max-results`                 |
| `list-all` | —                  | —                            | `--ids`, `--query-string`, `--expand`, `--order-by`, `--max-results`                               |
| `create`   | —                  | `--name`, `--default-screen` | `--description`, `--view-screen`, `--edit-screen`, `--create-screen`                               |
| `update`   | `<screenSchemeId>` | at least one field flag      | `--name`, `--description`, `--default-screen`, `--view-screen`, `--edit-screen`, `--create-screen` |
| `delete`   | `<screenSchemeId>` | —                            | —                                                                                                  |

**`--order-by` values:** `name`, `-name`, `+name`, `id`, `-id`, `+id`

```sh
# List screen schemes
atlas jira screenscheme list

# Filter by IDs
atlas jira screenscheme list --ids 1,2

# Filter by name substring
atlas jira screenscheme list --query-string Default

# Paginate
atlas jira screenscheme list --start-at 0 --max-results 50

# Create a screen scheme (default screen is required)
atlas jira screenscheme create --name "My Scheme" --default-screen 10001

# Create with all screen types
atlas jira screenscheme create --name "Full Scheme" --default-screen 10001 --create-screen 10002 --view-screen 10003 --edit-screen 10004

# Update name
atlas jira screenscheme update 1 --name "Renamed Scheme"

# Update description
atlas jira screenscheme update 1 --description "Updated description"

# Delete a screen scheme
atlas jira screenscheme delete 1
```

## `plans`

Advanced Roadmaps plans management (B625–B640). Covers the `/rest/api/3/plans/plan` surface: cursor-paginated plan listing, CRUD, archive/trash/duplicate, and team management (Atlassian teams and plan-only teams).

**Pagination:** `list` and `list-teams` use cursor pagination (`--cursor`, `--max-results`).

**Update/patch endpoints (B628, B635, B639):** accept a JSON-patch object via `--body`.

**Enum values:**

- `--planning-style`: `Scrum`, `Kanban`
- `--scheduling` estimation: `StoryPoints`, `Days`, `Hours`
- `--scheduling` dependencies: `Sequential`, `Concurrent`
- `--scheduling` inferredDates: `None`, `SprintDates`, `ReleaseDates`

| Action                  | Positional                  | Required flags                                                         | Optional flags                                                                                                                  |
| ----------------------- | --------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `list`                  | —                           | —                                                                      | `--cursor`, `--max-results`, `--include-trashed`, `--include-archived`                                                          |
| `create`                | —                           | `--name`, `--issue-sources` (JSON array), `--scheduling` (JSON object) | `--use-group-id`, `--cross-project-releases`, `--custom-fields`, `--exclusion-rules`, `--lead-account-id`, `--plan-permissions` |
| `get`                   | `planId`                    | —                                                                      | `--use-group-id`                                                                                                                |
| `update`                | `planId`                    | `--body` (JSON-patch object)                                           | `--use-group-id`                                                                                                                |
| `archive`               | `planId`                    | —                                                                      | —                                                                                                                               |
| `duplicate`             | `planId`                    | `--name`                                                               | —                                                                                                                               |
| `trash`                 | `planId`                    | —                                                                      | —                                                                                                                               |
| `list-teams`            | `planId`                    | —                                                                      | `--cursor`, `--max-results`                                                                                                     |
| `add-atlassian-team`    | `planId`                    | `--atlassian-team-id`, `--planning-style`                              | `--capacity`, `--issue-source-id`, `--sprint-length`                                                                            |
| `delete-atlassian-team` | `planId`, `atlassianTeamId` | —                                                                      | —                                                                                                                               |
| `get-atlassian-team`    | `planId`, `atlassianTeamId` | —                                                                      | —                                                                                                                               |
| `update-atlassian-team` | `planId`, `atlassianTeamId` | `--body` (JSON-patch object)                                           | —                                                                                                                               |
| `create-plan-only-team` | `planId`                    | `--name`, `--planning-style`                                           | `--capacity`, `--issue-source-id`, `--member-account-ids` (CSV), `--sprint-length`                                              |
| `delete-plan-only-team` | `planId`, `planOnlyTeamId`  | —                                                                      | —                                                                                                                               |
| `get-plan-only-team`    | `planId`, `planOnlyTeamId`  | —                                                                      | —                                                                                                                               |
| `update-plan-only-team` | `planId`, `planOnlyTeamId`  | `--body` (JSON-patch object)                                           | —                                                                                                                               |

```sh
# List all plans (cursor pagination)
atlas jira plans list --max-results 50
atlas jira plans list --include-trashed --include-archived

# Get a plan
atlas jira plans get 10001
atlas jira plans get 10001 --use-group-id

# Create a plan (issueSources and scheduling are required)
atlas jira plans create --name "Q3 Plan" --issue-sources '[{"type":"Board","value":1}]' --scheduling '{"estimation":"StoryPoints","dependencies":"Sequential","startDate":{"type":"TargetStartDate"},"endDate":{"type":"TargetEndDate"}}'

# Duplicate a plan
atlas jira plans duplicate 10001 --name "Copy of Q3 Plan"

# Archive and trash
atlas jira plans archive 10001
atlas jira plans trash 10001

# Update a plan (JSON-patch)
atlas jira plans update 10001 --body '{"op":"replace","path":"/name","value":"Renamed Plan"}'

# List teams for a plan
atlas jira plans list-teams 10001 --max-results 20

# Add an Atlassian team
atlas jira plans add-atlassian-team 10001 --atlassian-team-id team-abc-123 --planning-style Scrum --sprint-length 14

# Get and delete an Atlassian team
atlas jira plans get-atlassian-team 10001 team-abc-123
atlas jira plans delete-atlassian-team 10001 team-abc-123

# Update an Atlassian team (JSON-patch)
atlas jira plans update-atlassian-team 10001 team-abc-123 --body '{"op":"replace","path":"/sprintLength","value":21}'

# Create a plan-only team
atlas jira plans create-plan-only-team 10001 --name "My Team" --planning-style Kanban --member-account-ids acc-1,acc-2

# Get and delete a plan-only team
atlas jira plans get-plan-only-team 10001 2001
atlas jira plans delete-plan-only-team 10001 2001

# Update a plan-only team (JSON-patch)
atlas jira plans update-plan-only-team 10001 2001 --body '{"op":"replace","path":"/name","value":"Renamed Team"}'
```

## `workflows`

Classic workflow management — `/rest/api/3/workflow` (B837–B845 + B934 archived as already-covered), bulk workflow API — `/rest/api/3/workflows` (B846–B850, B851–B854), and transition property management (B935–B938, deprecated).

**Pagination:** `list` is offset-paginated (`--start-at`, `--max-results`). The usage actions (`issue-type-usages`, `project-usages`, `workflow-scheme-usages`) use cursor pagination (`--next-page-token`, `--max-results`). `get-rule-config` and `search` (B852) are offset-paginated (`--start-at`, `--max-results`, max 50 per page for rule-config).

**Note:** `GET /rest/api/3/workflow/search` (B934) is implemented as `list` and was already present before this PR.

**Required body endpoints (`--body` JSON):** `bulk-get`, `bulk-create`, `validate-create`, `preview`, `update`, `validate-update`. See [payload-rules.md](payload-rules.md) for JSON-flag tips.

**Schema note:** `WorkflowReadResponse` (bulk-get response) and `WorkflowCreateResponse` (bulk-create response) share the same field names (`workflows`, `statuses`) but are distinct spec schema types. `WorkflowCreateValidateRequest` requires a `payload` field wrapping the `WorkflowCreateRequest`.

**History note:** Stored workflow data expires after 60 days; no data before October 30, 2025 is available.

**Connect/Forge apps only:** `get-rule-config`, `update-rule-config`, and `delete-rule-config` are restricted to Connect or Forge apps (403 if called from basic/bearer auth directly).

**Deprecated:** B935–B938 (`*-transition-property` actions) target endpoints scheduled for removal June 1, 2026. Use Bulk update workflows instead.

### Actions

| Action                       | Positional args        | Key options                                                                                                                  |
| ---------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `list`                       | —                      | `--start-at`, `--max-results`, `--expand`, `--query-string`, `--order-by`, `--is-active`                                     |
| `get`                        | `workflowName`         | —                                                                                                                            |
| `delete`                     | `entityId`             | —                                                                                                                            |
| `issue-type-usages`          | `workflowId projectId` | `--next-page-token`, `--max-results`                                                                                         |
| `project-usages`             | `workflowId`           | `--next-page-token`, `--max-results`                                                                                         |
| `workflow-scheme-usages`     | `workflowId`           | `--next-page-token`, `--max-results`                                                                                         |
| `bulk-get`                   | —                      | `--body` (required, JSON `WorkflowReadRequest`)                                                                              |
| `capabilities`               | —                      | `--workflow-id`, `--project-id`, `--issue-type-id`                                                                           |
| `bulk-create`                | —                      | `--body` (required, JSON `WorkflowCreateRequest`)                                                                            |
| `validate-create`            | —                      | `--body` (required, JSON `WorkflowCreateValidateRequest`)                                                                    |
| `default-editor`             | —                      | —                                                                                                                            |
| `read-history`               | —                      | `--workflow-id` (required), `--version-number`                                                                               |
| `list-history`               | —                      | `--workflow-id` (required), `--expand`                                                                                       |
| `get-rule-config`            | —                      | `--types` (required, CSV), `--start-at`, `--max-results`, `--keys`, `--workflow-names`, `--with-tags`, `--draft`, `--expand` |
| `update-rule-config`         | —                      | `--workflows` (required, JSON array)                                                                                         |
| `delete-rule-config`         | —                      | `--workflows` (required, JSON array)                                                                                         |
| `delete-transition-property` | `transitionId`         | `--key` (req), `--workflow-name` (req), `--workflow-mode`                                                                    |
| `get-transition-properties`  | `transitionId`         | `--workflow-name` (req), `--key`, `--workflow-mode`, `--include-reserved-keys`                                               |
| `create-transition-property` | `transitionId`         | `--key` (req), `--workflow-name` (req), `--value` (req), `--workflow-mode`                                                   |
| `update-transition-property` | `transitionId`         | `--key` (req), `--workflow-name` (req), `--value` (req), `--workflow-mode`                                                   |
| `preview`                    | —                      | `--body` (required: `WorkflowPreviewRequest` JSON)                                                                           |
| `search`                     | —                      | `--start-at`, `--max-results`, `--expand`, `--query-string`, `--order-by`, `--scope`, `--is-active`                          |
| `update`                     | —                      | `--body` (required: `WorkflowUpdateRequest` JSON)                                                                            |
| `validate-update`            | —                      | `--body` (required: `WorkflowUpdateValidateRequest` JSON)                                                                    |

```sh
# List paginated classic workflows — B934
atlas jira workflows list --max-results 50

# Get a workflow by name
atlas jira workflows get "Default Workflow"

# Delete an inactive workflow by entity ID — B837
atlas jira workflows delete fb759d53-a3a4-45ff-9de4-547c4b638dde

# Get issue types using a workflow in a project — B838
atlas jira workflows issue-type-usages fb759d53-a3a4-45ff-9de4-547c4b638dde 10001
atlas jira workflows issue-type-usages fb759d53-a3a4-45ff-9de4-547c4b638dde 10001 --max-results 25

# Get projects using a workflow — B839
atlas jira workflows project-usages fb759d53-a3a4-45ff-9de4-547c4b638dde
atlas jira workflows project-usages fb759d53-a3a4-45ff-9de4-547c4b638dde --next-page-token eyJvIjoyfQ==

# Get workflow schemes using a workflow — B840
atlas jira workflows workflow-scheme-usages fb759d53-a3a4-45ff-9de4-547c4b638dde

# Bulk get workflows by IDs/names/project+issueType — B846
atlas jira workflows bulk-get --body '{"workflowIds":["fb759d53-a3a4-45ff-9de4-547c4b638dde"]}'
atlas jira workflows bulk-get --body '{"workflowNames":["Default Workflow"]}'

# Get available workflow capabilities — B847
atlas jira workflows capabilities --workflow-id fb759d53-a3a4-45ff-9de4-547c4b638dde
atlas jira workflows capabilities --project-id 10001 --issue-type-id 10000

# Bulk create workflows — B848
atlas jira workflows bulk-create --body '{"scope":{"type":"GLOBAL"},"statuses":[{"name":"To Do","statusCategory":"TODO","statusReference":"f0b24de5-25e7-4fab-ab94-63d81db6c0c0"}],"workflows":[{"name":"My Workflow","statuses":[{"statusReference":"f0b24de5-25e7-4fab-ab94-63d81db6c0c0"}],"transitions":[{"id":"1","name":"Create","type":"INITIAL","toStatusReference":"f0b24de5-25e7-4fab-ab94-63d81db6c0c0"}]}]}'

# Validate bulk create payload — B849
atlas jira workflows validate-create --body '{"payload":{"scope":{"type":"GLOBAL"},"statuses":[],"workflows":[]},"validationOptions":{"levels":["ERROR","WARNING"]}}'

# Get the user's default workflow editor — B850
atlas jira workflows default-editor

# Read a specific workflow version from history — B841
atlas jira workflows read-history --workflow-id c5ef565c-1b1e-427e-bc3b-e677b0dc027c --version-number 4

# List all history entries for a workflow — B842
atlas jira workflows list-history --workflow-id c5ef565c-1b1e-427e-bc3b-e677b0dc027c
atlas jira workflows list-history --workflow-id c5ef565c-1b1e-427e-bc3b-e677b0dc027c --expand includeIntermediateWorkflows

# Get transition rule configurations (Connect/Forge apps) — B843
atlas jira workflows get-rule-config --types postfunction,condition
atlas jira workflows get-rule-config --types postfunction --workflow-names "My Workflow" --max-results 10

# Update transition rule configurations (Connect/Forge apps) — B844
atlas jira workflows update-rule-config --workflows '[{"workflowId":{"name":"My Workflow"},"postFunctions":[{"id":"rule-id","configuration":{"value":"{}"}}]}]'

# Delete transition rule configurations (Connect apps only) — B845
atlas jira workflows delete-rule-config --workflows '[{"workflowId":{"name":"My Workflow"},"workflowRuleIds":["rule-id"]}]'

# Get transition properties — B936 (deprecated)
atlas jira workflows get-transition-properties 10000 --workflow-name "My Workflow"
atlas jira workflows get-transition-properties 10000 --workflow-name "My Workflow" --key jira.permission --workflow-mode live

# Delete a transition property — B935 (deprecated)
atlas jira workflows delete-transition-property 10000 --workflow-name "My Workflow" --key jira.permission

# Create a transition property — B937 (deprecated)
atlas jira workflows create-transition-property 10000 --workflow-name "My Workflow" --key jira.permission --value createissue

# Update a transition property — B938 (deprecated)
atlas jira workflows update-transition-property 10000 --workflow-name "My Workflow" --key jira.permission --value editissue

# Preview workflows for a project — B851
atlas jira workflows preview --body '{"projectId":"10001","workflowIds":["3215e5cd-f09f-4c8a-921b-dca92bd1e9aa"]}'

# Search workflows (offset-paginated) — B852
atlas jira workflows search --query-string "Default" --is-active true
atlas jira workflows search --start-at 0 --max-results 25 --scope GLOBAL

# Bulk update workflows — B853
atlas jira workflows update --body '{"workflows":[{"id":"3215e5cd-f09f-4c8a-921b-dca92bd1e9aa","description":"Updated"}]}'

# Validate a workflow update payload — B854
atlas jira workflows validate-update --body '{"payload":{"workflows":[{"id":"3215e5cd-f09f-4c8a-921b-dca92bd1e9aa","description":"Updated"}]}}'
```

## `workflowscheme`

Workflow scheme management — full coverage of `/rest/api/3/workflowscheme` (B855–B889). Live half covers listing/CRUD, default-workflow mappings, issue-type mappings, workflow mappings, project usages, and project association/switch. Draft half covers the draft lifecycle (create/get/update/delete/publish), draft default workflow, draft issue-type and workflow mappings. Bulk half covers read, update, and required-mappings.

**Pagination:** `list` is offset-paginated (`--start-at`, `--max-results`). Pass `--all` to drain every page via the `listAll` async generator. `project-usages` uses cursor pagination (`--next-page-token`, `--max-results`).

**Required body endpoints (`--body` JSON):** `create`, `update`, `set-default`, `set-issuetype`, `set-workflow`, `assign-project`, `switch-project`, `update-draft`, `set-draft-default`, `set-draft-issuetype`, `set-draft-workflow`, `bulk-update`, `bulk-mappings`. Optional body: `publish-draft`, `bulk-read`. See [payload-rules.md](payload-rules.md) for JSON-flag tips.

### Schemes (CRUD)

| Action   | Positional | Required flags | Optional flags                         | BACKLOG |
| -------- | ---------- | -------------- | -------------------------------------- | ------- |
| `list`   | —          | —              | `--start-at`, `--max-results`, `--all` | B855    |
| `create` | —          | `--body`       | —                                      | B856    |
| `delete` | `<id>`     | —              | —                                      | B857    |
| `get`    | `<id>`     | —              | `--return-draft-if-exists`             | B858    |
| `update` | `<id>`     | `--body`       | —                                      | B859    |

### Default workflow

| Action           | Positional | Required flags | Optional flags             | BACKLOG |
| ---------------- | ---------- | -------------- | -------------------------- | ------- |
| `delete-default` | `<id>`     | —              | `--update-draft-if-needed` | B861    |
| `get-default`    | `<id>`     | —              | `--return-draft-if-exists` | B862    |
| `set-default`    | `<id>`     | `--body`       | —                          | B863    |

### Issue-type mappings

| Action             | Positional         | Required flags | Optional flags             | BACKLOG |
| ------------------ | ------------------ | -------------- | -------------------------- | ------- |
| `delete-issuetype` | `<id> <issueType>` | —              | `--update-draft-if-needed` | B877    |
| `get-issuetype`    | `<id> <issueType>` | —              | `--return-draft-if-exists` | B878    |
| `set-issuetype`    | `<id> <issueType>` | `--body`       | —                          | B879    |

### Workflow mappings

| Action            | Positional | Required flags              | Optional flags                                | BACKLOG |
| ----------------- | ---------- | --------------------------- | --------------------------------------------- | ------- |
| `delete-workflow` | `<id>`     | `--workflow-name`           | `--update-draft-if-needed`                    | B880    |
| `get-workflow`    | `<id>`     | —                           | `--workflow-name`, `--return-draft-if-exists` | B881    |
| `set-workflow`    | `<id>`     | `--workflow-name`, `--body` | —                                             | B882    |

### Project usages and associations

| Action            | Positional           | Required flags | Optional flags                       | BACKLOG |
| ----------------- | -------------------- | -------------- | ------------------------------------ | ------- |
| `project-usages`  | `<workflowSchemeId>` | —              | `--next-page-token`, `--max-results` | B883    |
| `list-by-project` | —                    | `--project-id` | —                                    | B884    |
| `assign-project`  | —                    | `--body`       | —                                    | B885    |
| `switch-project`  | —                    | `--body`       | —                                    | B886    |

```sh
# Paginate live workflow schemes
atlas jira workflowscheme list --max-results 50

# Drain every page (uses the listAll async generator)
atlas jira workflowscheme list --all

# CRUD on schemes
atlas jira workflowscheme create --body '{"name":"My Scheme","description":"Example"}'
atlas jira workflowscheme get 10001
atlas jira workflowscheme get 10001 --return-draft-if-exists
atlas jira workflowscheme update 10001 --body '{"name":"Renamed","updateDraftIfNeeded":true}'
atlas jira workflowscheme delete 10001

# Default workflow
atlas jira workflowscheme get-default 10001
atlas jira workflowscheme set-default 10001 --body '{"workflow":"jira"}'
atlas jira workflowscheme delete-default 10001 --update-draft-if-needed

# Issue-type mappings
atlas jira workflowscheme get-issuetype 10001 10000
atlas jira workflowscheme set-issuetype 10001 10000 --body '{"workflow":"scrum"}'
atlas jira workflowscheme delete-issuetype 10001 10000

# Workflow mappings
atlas jira workflowscheme get-workflow 10001 --workflow-name jira
atlas jira workflowscheme set-workflow 10001 --workflow-name jira --body '{"issueTypes":["10000"],"defaultMapping":false}'
atlas jira workflowscheme delete-workflow 10001 --workflow-name jira

# Project usages (cursor pagination)
atlas jira workflowscheme project-usages 10001 --max-results 50

# Project associations
atlas jira workflowscheme list-by-project --project-id 10010,10020
atlas jira workflowscheme assign-project --body '{"projectId":"10010","workflowSchemeId":"10001"}'
atlas jira workflowscheme switch-project --body '{"projectId":"10010","targetSchemeId":"10002"}'
```

### Draft lifecycle

| Action          | Positional | Required flags | Optional flags              | BACKLOG |
| --------------- | ---------- | -------------- | --------------------------- | ------- |
| `create-draft`  | `<id>`     | —              | —                           | B860    |
| `delete-draft`  | `<id>`     | —              | —                           | B864    |
| `get-draft`     | `<id>`     | —              | —                           | B865    |
| `update-draft`  | `<id>`     | `--body`       | —                           | B866    |
| `publish-draft` | `<id>`     | —              | `--body`, `--validate-only` | B873    |

### Draft default workflow

| Action                 | Positional | Required flags | Optional flags | BACKLOG |
| ---------------------- | ---------- | -------------- | -------------- | ------- |
| `delete-draft-default` | `<id>`     | —              | —              | B867    |
| `get-draft-default`    | `<id>`     | —              | —              | B868    |
| `set-draft-default`    | `<id>`     | `--body`       | —              | B869    |

### Draft issue-type mappings

| Action                   | Positional         | Required flags | Optional flags | BACKLOG |
| ------------------------ | ------------------ | -------------- | -------------- | ------- |
| `delete-draft-issuetype` | `<id> <issueType>` | —              | —              | B870    |
| `get-draft-issuetype`    | `<id> <issueType>` | —              | —              | B871    |
| `set-draft-issuetype`    | `<id> <issueType>` | `--body`       | —              | B872    |

### Draft workflow mappings

| Action                  | Positional | Required flags              | Optional flags    | BACKLOG |
| ----------------------- | ---------- | --------------------------- | ----------------- | ------- |
| `delete-draft-workflow` | `<id>`     | `--workflow-name`           | —                 | B874    |
| `get-draft-workflow`    | `<id>`     | —                           | `--workflow-name` | B875    |
| `set-draft-workflow`    | `<id>`     | `--workflow-name`, `--body` | —                 | B876    |

### Bulk operations

| Action          | Positional | Required flags | Optional flags | BACKLOG |
| --------------- | ---------- | -------------- | -------------- | ------- |
| `bulk-read`     | —          | —              | `--body`       | B887    |
| `bulk-update`   | —          | `--body`       | —              | B888    |
| `bulk-mappings` | —          | `--body`       | —              | B889    |

```sh
# Draft lifecycle
atlas jira workflowscheme create-draft 10001
atlas jira workflowscheme get-draft 10001
atlas jira workflowscheme update-draft 10001 --body '{"name":"Renamed draft","defaultWorkflow":"jira"}'
atlas jira workflowscheme delete-draft 10001
atlas jira workflowscheme publish-draft 10001 --body '{"statusMappings":[]}' --validate-only

# Draft default workflow
atlas jira workflowscheme get-draft-default 10001
atlas jira workflowscheme set-draft-default 10001 --body '{"workflow":"jira"}'
atlas jira workflowscheme delete-draft-default 10001

# Draft issue-type mappings
atlas jira workflowscheme get-draft-issuetype 10001 10000
atlas jira workflowscheme set-draft-issuetype 10001 10000 --body '{"workflow":"scrum"}'
atlas jira workflowscheme delete-draft-issuetype 10001 10000

# Draft workflow mappings
atlas jira workflowscheme get-draft-workflow 10001 --workflow-name jira
atlas jira workflowscheme set-draft-workflow 10001 --workflow-name jira --body '{"issueTypes":["10000"],"workflow":"jira"}'
atlas jira workflowscheme delete-draft-workflow 10001 --workflow-name jira

# Bulk operations
atlas jira workflowscheme bulk-read --body '{"projectIds":["10010"],"workflowSchemeIds":["10001"]}'
atlas jira workflowscheme bulk-update --body '{"id":"10001","name":"x","description":"y","version":{"id":"v","versionNumber":1},"workflowsForIssueTypes":[]}'
atlas jira workflowscheme bulk-mappings --body '{"id":"10001","workflowsForIssueTypes":[{"issueTypeIds":["10000"],"workflowId":"wf-1"}]}'
```

## `fields`

Custom field CRUD, field context management, and field admin/association operations.

Covers: B411 (field list-all), B414 (field project associations), B415–B418 (field contexts), B421–B426 (field context options), B419–B420 (context issue-type membership), B429 (context issue-type mappings), B432 (screens for field), B442–B445 (trash/restore/associate), B446 (field search paginated), B447 (trashed fields), B905–B906 (context default values), field list/create/update/delete.

### Fields (CRUD)

```sh
# List all fields (flat array)
atlas jira fields field-list-all

# List custom fields (paginated)
atlas jira fields field-list --start-at 0 --max-results 50

# Create a custom field
atlas jira fields field-create --body '{"name":"Sprint Story Points","type":"com.atlassian.jira.plugin.system.customfieldtypes:float"}'

# Update a custom field
atlas jira fields field-update customfield_10001 --body '{"name":"Renamed Field","description":"Updated description"}'

# Delete a custom field
atlas jira fields field-delete customfield_10001
```

### Field Contexts (B415–B418)

```sh
# List contexts for a custom field (B415)
atlas jira fields context-list --field-id customfield_10001

# Filter contexts by type flags
atlas jira fields context-list --field-id customfield_10001 --is-global-context true --is-any-issue-type false

# Filter by specific context IDs (comma-separated)
atlas jira fields context-list --field-id customfield_10001 --context-id 10025,10026

# Create a context (global, all issue types) (B416)
atlas jira fields context-create --field-id customfield_10001 --name 'Bug fields context' --description 'Context for bugs'

# Create a context scoped to projects and issue types (B416)
atlas jira fields context-create --field-id customfield_10001 --name 'Scoped context' --project-ids '10010,10011' --issue-type-ids '10000'

# Update a context name/description (B418)
atlas jira fields context-update --field-id customfield_10001 --context-id 10025 --name 'Renamed context' --description 'New description'

# Delete a context (B417)
atlas jira fields context-delete --field-id customfield_10001 --context-id 10025
```

### Field Context Options (B421–B426)

```sh
# List options for a field context (B421)
atlas jira fields context-option-list --field-id customfield_10001 --context-id 10025

# List options with pagination and filters (B421)
atlas jira fields context-option-list --field-id customfield_10001 --context-id 10025 --start-at 0 --max-results 50 --only-options true

# Bulk-create options in a context (B422)
atlas jira fields context-option-create --field-id customfield_10001 --context-id 10025 --body '{"options":[{"value":"New York"},{"value":"Boston","disabled":false}]}'

# Bulk-update options in a context (B423)
atlas jira fields context-option-update --field-id customfield_10001 --context-id 10025 --body '{"options":[{"id":"10001","value":"New York Renamed","disabled":false}]}'

# Delete a single option from a context (B424)
atlas jira fields context-option-delete --field-id customfield_10001 --context-id 10025 --option-id 10001

# Replace an option on issues — starts async task (B425)
atlas jira fields context-option-replace-issues --field-id customfield_10001 --context-id 10025 --option-id 10001 --replace-with 10003 --jql project=PROJ

# Reorder options to first position (B426)
atlas jira fields context-option-move --field-id customfield_10001 --context-id 10025 --option-ids 10001,10002 --position First

# Reorder options after a specific option (B426)
atlas jira fields context-option-move --field-id customfield_10001 --context-id 10025 --option-ids 10001 --after 10005
```

### Field context issue-type mappings

Manage which issue types are associated with a custom field context (B419–B420, B429).

```sh
# Add issue types to a context (B419) — PUT 204
atlas jira fields context-issuetype-set --field-id customfield_10001 --context-id 10025 --issue-type-ids 10001,10005,10006

# Remove issue types from a context (B420) — POST 204
atlas jira fields context-issuetype-remove --field-id customfield_10001 --context-id 10025 --issue-type-ids 10001,10005

# List issue-type-to-context mappings for a field (B429) — paginated
atlas jira fields context-issuetype-mapping --field-id customfield_10001

# Filter mappings by specific contexts (B429)
atlas jira fields context-issuetype-mapping --field-id customfield_10001 --context-id 10025,10026 --start-at 0 --max-results 50
```

### Field context default values

Get and set default values for custom field contexts (B905–B906).

**Note:** Both endpoints are deprecated (CHANGE-3082) and will be removed in October 2026.

Default values are polymorphic — each entry is discriminated by a `type` field. Common types:

- `option.single` — single-select/radio: requires `optionId`
- `option.multiple` — multi-select/checkbox: requires `optionIds[]`
- `option.cascading` — cascading select: requires `optionId` + optional `cascadingOptionId`
- `forge.string` — Forge string field: optional `text`
- `forge.user` — Forge user field: requires `accountId` + `userFilter`
- `float` — number field: requires `number`
- `datepicker` — date field: optional `date`, `useCurrent`
- `url` — URL field: requires `url`

```sh
# List default values for a custom field (B905) — paginated, deprecated
atlas jira fields context-default-list --field-id customfield_10001

# Filter by specific contexts (B905)
atlas jira fields context-default-list --field-id customfield_10001 --context-id 10025,10026 --start-at 0 --max-results 50

# Set defaults — option.single for one context (B906) — deprecated
atlas jira fields context-default-set --field-id customfield_10001 --default-values-json '[{"type":"option.single","contextId":"10100","optionId":"10001"}]'

# Set defaults — multiple variants in one request (B906)
atlas jira fields context-default-set --field-id customfield_10001 --default-values-json '[{"type":"option.single","contextId":"10100","optionId":"10001"},{"type":"forge.string","contextId":"10102","text":"Default text"}]'

# Set a cascading default with child option (B906)
atlas jira fields context-default-set --field-id customfield_10001 --default-values-json '[{"type":"option.cascading","contextId":"10101","optionId":"10002","cascadingOptionId":"10003"}]'
```

### Field context project mappings

Assign/remove projects from a context and query context-to-project mappings (B427–B428, B431). Also includes bulk context lookup by project+issueType pairs (B430).

```sh
# Assign a context to projects (B427) — PUT 204
atlas jira fields context-project-set --field-id customfield_10001 --context-id 10025 --project-ids 10001,10005,10006

# Remove projects from a context (B428) — POST 204
atlas jira fields context-project-remove --field-id customfield_10001 --context-id 10025 --project-ids 10001,10005

# List context-to-project mappings for a field (B431) — paginated
atlas jira fields context-project-mapping --field-id customfield_10001

# Filter mappings by specific contexts (B431)
atlas jira fields context-project-mapping --field-id customfield_10001 --context-id 10025,10026 --start-at 0 --max-results 50

# Bulk lookup: find which context applies to each project+issueType pair (B430)
# Body is a JSON array of {projectId, issueTypeId} objects
atlas jira fields context-mapping --field-id customfield_10001 --mappings-json '[{"projectId":"10000","issueTypeId":"10000"},{"projectId":"10000","issueTypeId":"10001"}]'
```

### Field key option management (Connect-app-managed)

Manage options on Connect-app select list fields via `fieldKey` (B433–B440). These endpoints only work for options added by Connect apps, not options created in Jira directly.

```sh
# List all options for a field (B433) — GET paginated
atlas jira fields field-option-list --field-key example-add-on__team-field
atlas jira fields field-option-list --field-key example-add-on__team-field --start-at 0 --max-results 50

# Create an option for a field (B434) — POST
atlas jira fields field-option-create --field-key example-add-on__team-field --body '{"value":"Team 1","properties":{"members":42}}'

# Delete an option from a field (B435) — DELETE 204
atlas jira fields field-option-delete --field-key example-add-on__team-field --option-id 1

# Get a single option (B436) — GET
atlas jira fields field-option-get --field-key example-add-on__team-field --option-id 1

# Update (or create) an option — id in body must match --option-id (B437) — PUT
atlas jira fields field-option-update --field-key example-add-on__team-field --option-id 1 --body '{"id":1,"value":"Team 1 Updated"}'

# Deselect an option from all matching issues (async task) — returns task progress (B438) — DELETE 303
atlas jira fields field-option-replace-issues --field-key example-add-on__team-field --option-id 1 --replace-with 3 --jql 'project=PROJ'

# Get selectable options for a field (edit suggestions) (B439) — GET paginated
atlas jira fields field-option-suggestions-edit --field-key example-add-on__team-field
atlas jira fields field-option-suggestions-edit --field-key example-add-on__team-field --project-id 10001 --start-at 0 --max-results 50

# Get visible options for a field (search/view suggestions) (B440) — GET paginated
atlas jira fields field-option-suggestions-search --field-key example-add-on__team-field
atlas jira fields field-option-suggestions-search --field-key example-add-on__team-field --project-id 10001 --start-at 0 --max-results 50
```

### Field admin and association (B414, B432, B442–B445, B447)

Trash/restore custom fields, manage field-to-project associations, list screens a field appears on, and list trashed fields.

```sh
# List project associations for a custom field (B414) — GET paginated
atlas jira fields field-project-associations --field-id customfield_10001
atlas jira fields field-project-associations --field-id customfield_10001 --start-at 0 --max-results 50

# List screens a field is used in (B432) — GET paginated
atlas jira fields field-screens --field-id customfield_10001
atlas jira fields field-screens --field-id customfield_10001 --expand tab --start-at 0 --max-results 50

# Restore a custom field from trash (B442) — POST
atlas jira fields field-restore --field-id customfield_10001

# Move a custom field to trash (B443) — POST
atlas jira fields field-trash --field-id customfield_10001

# Remove associations between fields and projects (B444) — DELETE with body
atlas jira fields field-remove-associations --body '{"associationContexts":[{"type":"PROJECT_ID","identifier":10000}],"fields":[{"type":"FIELD_ID","identifier":"customfield_10000"}]}'

# Create associations between fields and projects (B445) — PUT with body
atlas jira fields field-create-associations --body '{"associationContexts":[{"type":"PROJECT_ID","identifier":10000},{"type":"PROJECT_ID","identifier":10001}],"fields":[{"type":"FIELD_ID","identifier":"customfield_10000"}]}'

# List trashed custom fields (B447) — GET paginated
atlas jira fields field-trash-list
atlas jira fields field-trash-list --query approvers --max-results 50
atlas jira fields field-trash-list --id customfield_10000,customfield_10001 --order-by trashDate
```

### Field search paginated (B411 + B446)

`field-list-all` returns the flat array from `GET /field` (B411). `field-list` returns the paginated search from `GET /field/search` (B446), supporting filtering by type, id, query, orderBy, expand, and projectIds.

```sh
# List all fields (flat, not paginated) — B411
atlas jira fields field-list-all

# Search fields (paginated) — B446
atlas jira fields field-list --max-results 50
atlas jira fields field-list --type custom --query approvers
atlas jira fields field-list --order-by screensCount --expand screensCount,contextsCount
```

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

## `issuelinktype`

Issue link type management (B533-B537). Covers the full `/rest/api/3/issueLinkType` surface.

| Action   | Positional          | Required flags                                    | Optional flags |
| -------- | ------------------- | ------------------------------------------------- | -------------- |
| `list`   | —                   | —                                                 | —              |
| `get`    | `<issueLinkTypeId>` | —                                                 | —              |
| `create` | —                   | `--name`, `--inward`, `--outward`                 | —              |
| `update` | `<issueLinkTypeId>` | at least one of `--name`, `--inward`, `--outward` | —              |
| `delete` | `<issueLinkTypeId>` | —                                                 | —              |

- `--name`: display name of the link type (e.g. "Blocks").
- `--inward`: label for the inward direction (e.g. "is blocked by").
- `--outward`: label for the outward direction (e.g. "blocks").
- `id` and `self` are server-assigned; never sent in create/update bodies.

```sh
# List all issue link types — B533
atlas jira issuelinktype list

# Get a specific issue link type — B536
atlas jira issuelinktype get 10001

# Create a new issue link type — B534
atlas jira issuelinktype create --name "Blocks" --inward "is blocked by" --outward "blocks"

# Update an issue link type — B537
atlas jira issuelinktype update 10001 --name "Clones" --inward "is cloned by" --outward "clones"

# Delete an issue link type — B535
atlas jira issuelinktype delete 10001
```

## `issue-link`

Issue link instance management (B530-B532). Covers create/get/delete of link instances under `/rest/api/3/issueLink`. Distinct from `issuelinktype` which manages link type definitions.

| Action   | Positional | Required flags                                     | Optional flags |
| -------- | ---------- | -------------------------------------------------- | -------------- |
| `create` | —          | `--link-type`, `--inward-issue`, `--outward-issue` | —              |
| `get`    | `<linkId>` | —                                                  | —              |
| `delete` | `<linkId>` | —                                                  | —              |

- `--link-type`: name of the link type (e.g. "Blocks", "Duplicate").
- `--inward-issue`: key of the inward issue (e.g. "HSP-1").
- `--outward-issue`: key of the outward issue (e.g. "MKY-1").
- `create` returns `{ created: true }` — the spec 201 response has an empty body.
- `delete` returns `{ deleted: true }` (spec 204).

```sh
# Create an issue link — B530
atlas jira issue-link create --link-type "Blocks" --inward-issue "HSP-1" --outward-issue "MKY-1"

# Get an issue link by ID — B532
atlas jira issue-link get 10001

# Delete an issue link — B531
atlas jira issue-link delete 10001
```

## `project-template`

Custom project template management (B653–B657). Covers the full `/rest/api/3/project-template` surface: create a project with a custom template, edit/save/remove templates, and retrieve live template details.

`create` is asynchronous (303 redirect); follow the `Location` header with `atlas jira task get <taskId>` to track progress. `edit-template`, `remove-template` return `void` (no JSON body). `live-template` returns `ProjectTemplateModel`. `save-template` returns `{ projectTemplateKey }`.

**Note: These endpoints are only available on Jira Enterprise edition.**

| Action            | Positional | Required flags                     | Optional flags                                                                                                                                                                                                                                   |
| ----------------- | ---------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `create`          | —          | `--template` (JSON)                | `--name`, `--key`, `--description`, `--url`, `--language`, `--lead-account-id`, `--access-level`, `--assignee-type`, `--avatar-id` (int), `--category-id` (int), `--enable-components`, `--additional-properties` (JSON `Record<string,string>`) |
| `edit-template`   | —          | at least one of the optional flags | `--template-key`, `--template-name`, `--template-description`, `--enable-screen-delegated-admin`, `--enable-workflow-delegated-admin`                                                                                                            |
| `live-template`   | —          | —                                  | `--project-id`, `--template-key`                                                                                                                                                                                                                 |
| `remove-template` | —          | `--template-key`                   | —                                                                                                                                                                                                                                                |
| `save-template`   | —          | at least one of the optional flags | `--template-name`, `--template-description`, `--project-id` (int), `--template-type` (`LIVE`\|`SNAPSHOT`), `--enable-screen-delegated-admin`, `--enable-workflow-delegated-admin`                                                                |

- `--template` for `create` is a JSON object with capability keys: `boardFeatures`, `boards`, `field`, `issueType`, `notification`, `permissionScheme`, `project`, `role`, `scope`, `security`, `workflow`.
- `--access-level` must be one of: `open`, `limited`, `private`, `free`.
- `--assignee-type` must be one of: `PROJECT_DEFAULT`, `COMPONENT_LEAD`, `PROJECT_LEAD`, `UNASSIGNED`.
- `--template-type` must be one of: `LIVE`, `SNAPSHOT`.
- `--enable-screen-delegated-admin` and `--enable-workflow-delegated-admin` are boolean flags (bare, no value).
- `--enable-components` is a boolean flag (bare, no value).

````sh
# Create a project with a custom template (async) — B653
atlas jira project-template create \
  --name "My Project" \
  --key "MP" \
  --description "Created from custom template" \
  --language "en" \
  --template '{"project":{"projectType":"software"}}'

# Edit an existing custom template — B654
atlas jira project-template edit-template \
  --template-key "my-template-key" \
  --template-name "Renamed Template" \
  --template-description "Updated description"

# Enable delegated admin support on a template — B654
atlas jira project-template edit-template \
  --template-key "my-template-key" \
  --enable-screen-delegated-admin \
  --enable-workflow-delegated-admin

# Get live template by project ID — B655
atlas jira project-template live-template --project-id "10001"

# Get live template by template key — B655
atlas jira project-template live-template --template-key "my-template-key"

# Remove a custom template — B656
atlas jira project-template remove-template --template-key "my-template-key"

# Save a template from a project (snapshot) — B657
atlas jira project-template save-template \
  --template-name "My Snapshot Template" \
  --template-description "Snapshot of project 10001" \
  --project-id 10001 \
  --template-type SNAPSHOT

# Save a live template from a project — B657
atlas jira project-template save-template \
  --template-name "My Live Template" \
  --project-id 10001 \
  --template-type LIVE \
  --enable-workflow-delegated-admin

## `universal-avatar`

Manage and view avatars for projects, issue types, and priorities via
`/rest/api/3/universal_avatar` (B791–B796).

`type` ∈ `project`, `issuetype`, `priority`.
`size` (view) ∈ `xsmall`, `small`, `medium`, `large`, `xlarge`.
`image-format` ∈ `png`, `svg`.

| Action          | Positional                     | Required flags     | Optional flags             |
| --------------- | ------------------------------ | ------------------ | -------------------------- |
| `list`          | `<type> <entityId>`            | —                  | —                          |
| `store`         | `<type> <entityId>`            | `--file`, `--size` | `--x`, `--y`               |
| `delete`        | `<type> <owningObjectId> <id>` | —                  | —                          |
| `view-by-type`  | `<type>`                       | —                  | `--size`, `--image-format` |
| `view-by-id`    | `<type> <id>`                  | —                  | `--size`, `--image-format` |
| `view-by-owner` | `<type> <entityId>`            | —                  | `--size`, `--image-format` |

- `list` returns `{ system: Avatar[], custom: Avatar[] }`.
- `store` reads `--file` from disk, sends raw binary bytes (`*/*`) — NOT multipart. `--size` sets the crop side length in px; `--x`/`--y` offset the crop origin (default 0). Returns the created `Avatar`.
- `delete` removes a custom avatar; `id` is the numeric avatar ID.
- `view-by-type` / `view-by-id` / `view-by-owner` return binary image bytes. The CLI prints `{ "bytes": N }` — use the SDK (`client.universalAvatar.getAvatarImageByType(...)`) when you need the actual `ArrayBuffer`.
- `--size` and `--image-format` on view commands are advisory; the server uses its default when omitted.

```sh
# List system + custom avatars for a project
atlas jira universal-avatar list project 10001

# Upload a custom avatar (crop to a 48×48 square from top-left)
atlas jira universal-avatar store project 10001 --file ./icon.png --size 48

# Upload with explicit crop coordinates
atlas jira universal-avatar store issuetype 10001 --file ./icon.png --size 32 --x 8 --y 8

# Delete a custom avatar
atlas jira universal-avatar delete project 10001 1010

# Get the default issue-type avatar image (CLI prints byte count)
atlas jira universal-avatar view-by-type issuetype --size medium --image-format png

# Get a specific avatar image by ID
atlas jira universal-avatar view-by-id project 1010 --size small

# Get the avatar for a specific project owner
atlas jira universal-avatar view-by-owner project 10001 --image-format svg
````

## `worklog`

Global worklog surface (B890–B892). Covers `/rest/api/3/worklog` — distinct
from the per-issue worklog endpoints on `issues`.

`ChangedWorklogs` uses a custom `since`/`until`/`lastPage` cursor; to iterate
all pages, check `lastPage` and call again with `since = until` from the prior
response.

| Action    | Required flags | Optional flags        |
| --------- | -------------- | --------------------- |
| `deleted` | —              | `--since`             |
| `list`    | `--ids`        | `--expand`            |
| `updated` | —              | `--since`, `--expand` |

- `deleted` — GET /rest/api/3/worklog/deleted. Returns `ChangedWorklogs`.
- `list` — POST /rest/api/3/worklog/list. `--ids` is a CSV of worklog IDs (1–1000). Returns a bare array of `Worklog` objects.
- `updated` — GET /rest/api/3/worklog/updated. Returns `ChangedWorklogs`.

```sh
# Get IDs of all worklogs deleted since a timestamp
atlas jira worklog deleted --since 1700000000000

# Get full worklog records by IDs
atlas jira worklog list --ids 1,2,5,10

# Get worklog records with expanded properties
atlas jira worklog list --ids 1,2,5 --expand properties

# Get IDs of worklogs updated since a timestamp
atlas jira worklog updated --since 1700000000000

# Get updated worklog IDs with field expansion
atlas jira worklog updated --since 1700000000000 --expand properties
```

## `ui-modifications`

UI modification management (B787–B790). Covers the `/rest/api/3/uiModifications` surface.
UI modifications can only be created/modified by Forge apps.

| Action     | Positional         | Required flags | Optional flags                                                 |
| ---------- | ------------------ | -------------- | -------------------------------------------------------------- |
| `list`     |                    |                | `--start-at`, `--max-results`, `--expand`                      |
| `list-all` |                    |                | `--max-results`, `--expand`                                    |
| `create`   |                    | `--name`       | `--data`, `--description`, `--contexts` (JSON array)           |
| `update`   | `uiModificationId` |                | `--name`, `--data`, `--description`, `--contexts` (JSON array) |
| `delete`   | `uiModificationId` |                |                                                                |

`--expand` accepts `data` and/or `contexts` (comma-separated).
`--contexts` accepts a JSON array of context objects, e.g. `'[{"projectId":"10000","issueTypeId":"10000","viewType":"GIC"}]'`.

```sh
# List UI modifications (first page)
atlas jira ui-modifications list

# List with expand options
atlas jira ui-modifications list --expand data,contexts

# Iterate all UI modifications
atlas jira ui-modifications list-all

# Create a UI modification (name is required)
atlas jira ui-modifications create --name "Reveal Story Points"

# Create with all optional fields
atlas jira ui-modifications create \
  --name "Reveal Story Points" \
  --description "Reveals Story Points field when any Sprint is selected." \
  --data '{"field":"Story Points","config":{"hidden":false}}' \
  --contexts '[{"projectId":"10000","issueTypeId":"10000","viewType":"GIC"}]'

# Update a UI modification (at least one field required)
atlas jira ui-modifications update d7dbda8a-6239-4b63-8e13-a5ef975c8e61 --name "Updated Name"

# Update with new contexts (replaces all existing contexts)
atlas jira ui-modifications update d7dbda8a-6239-4b63-8e13-a5ef975c8e61 \
  --contexts '[{"projectId":"10000","issueTypeId":"10001","viewType":"IssueView"}]'

# Delete a UI modification
atlas jira ui-modifications delete d7dbda8a-6239-4b63-8e13-a5ef975c8e61
```

## `permissions`

Global Jira permissions (B613-B615). Covers the `/rest/api/3/permissions` surface — distinct from `mypermissions` (user-scoped) and `permission-schemes` (scheme management).

| Action               | Positional | Required flags  | Optional flags                                                  |
| -------------------- | ---------- | --------------- | --------------------------------------------------------------- |
| `get-all`            | —          | —               | —                                                               |
| `check`              | —          | —               | `--account-id`, `--global-permissions`, `--project-permissions` |
| `permitted-projects` | —          | `--permissions` | —                                                               |

- `--account-id`: check permissions for a specific user (default: current user).
- `--global-permissions`: JSON array of global permission keys, e.g. `'["ADMINISTER"]'`.
- `--project-permissions`: JSON array of `{ permissions: string[], projects?: number[], issues?: number[] }` objects.
- `--permissions`: JSON array of project permission keys for `permitted-projects`, e.g. `'["BROWSE_PROJECTS"]'`.

```sh
# Get all Jira permissions (global + project + plugin) — B613
atlas jira permissions get-all

# Check which global permissions the current user has — B614
atlas jira permissions check --global-permissions '["ADMINISTER","USE"]'

# Check project permissions for a specific user — B614
atlas jira permissions check --account-id 5b10a2844c20165700ede21g \
  --global-permissions '["ADMINISTER"]' \
  --project-permissions '[{"permissions":["EDIT_ISSUES","BROWSE"],"projects":[10001],"issues":[10010]}]'

# Check permissions with no body (returns permissions for current user) — B614
atlas jira permissions check

# Get all projects where current user has BROWSE_PROJECTS — B615
atlas jira permissions permitted-projects --permissions '["BROWSE_PROJECTS"]'

# Get projects where user has multiple permissions — B615
atlas jira permissions permitted-projects --permissions '["BROWSE_PROJECTS","EDIT_ISSUES"]'
```

## `pipelines`

Jira Software Pipelines resource — builds and deployments at pipeline/environment level (B954, B955, B958, B959, B960). Spans two integration APIs: `/rest/builds/0.1` and `/rest/deployments/0.1`.

| Action                         | Positional                                      | Required flags | Optional flags |
| ------------------------------ | ----------------------------------------------- | -------------- | -------------- |
| `get-build`                    | `<pipelineId> <buildNumber>`                    | —              | —              |
| `delete-build`                 | `<pipelineId> <buildNumber>`                    | —              | —              |
| `get-deployment`               | `<pipelineId> <environmentId> <sequenceNumber>` | —              | —              |
| `delete-deployment`            | `<pipelineId> <environmentId> <sequenceNumber>` | —              | —              |
| `get-deployment-gating-status` | `<pipelineId> <environmentId> <sequenceNumber>` | —              | —              |

- `pipelineId`: string identifier of the pipeline.
- `environmentId`: string identifier of the target environment (deployments only).
- `buildNumber` / `sequenceNumber`: integer.

````sh
# Get a build — B955
atlas jira pipelines get-build pipeline-abc 42

# Delete a build (async, 202 Accepted) — B954
atlas jira pipelines delete-build pipeline-abc 42

# Get a deployment — B959
atlas jira pipelines get-deployment pipeline-abc env-prod 7

# Delete a deployment (async, 202 Accepted) — B958
atlas jira pipelines delete-deployment pipeline-abc env-prod 7

# Get deployment gating status — B960
atlas jira pipelines get-deployment-gating-status pipeline-abc env-prod 7
## `linked-workspaces`

Linked Workspaces — spans Operations and Security APIs (B984-B986, B995-B998).

Operations endpoints use base `/rest/operations/1.0`; Security endpoints use `/rest/security/1.0`.

| Action                   | Positional args | Required flags    | Optional flags |
| ------------------------ | --------------- | ----------------- | -------------- |
| `list-operations`        | —               | —                 | —              |
| `bulk-delete-operations` | —               | `--workspace-ids` | —              |
| `bulk-create-operations` | —               | `--workspace-ids` | —              |
| `list-security`          | —               | —                 | —              |
| `get-security`           | `<workspaceId>` | —                 | —              |
| `bulk-delete-security`   | —               | `--workspace-ids` | —              |
| `bulk-create-security`   | —               | `--workspace-ids` | —              |

- `--workspace-ids`: Comma-separated list of workspace IDs, e.g. `ws-1,ws-2`.

```sh
# List linked workspaces (Operations API) — B984
atlas jira linked-workspaces list-operations

# Bulk delete linked workspaces (Operations API) — B985
atlas jira linked-workspaces bulk-delete-operations --workspace-ids ws-1,ws-2

# Bulk create/link workspaces (Operations API) — B986
atlas jira linked-workspaces bulk-create-operations --workspace-ids ws-1,ws-2

# List linked workspaces (Security API) — B995
atlas jira linked-workspaces list-security

# Get a specific linked workspace by ID (Security API) — B996
atlas jira linked-workspaces get-security ws-1

# Bulk delete linked workspaces (Security API) — B997
atlas jira linked-workspaces bulk-delete-security --workspace-ids ws-1,ws-2

# Bulk create/link workspaces (Security API) — B998
atlas jira linked-workspaces bulk-create-security --workspace-ids ws-3,ws-4
````

## `bulk-by-properties`

Delete DevOps integration entities matching arbitrary property criteria across eight product APIs (B953, B957, B962, B968, B972, B981, B990, B994).

All eight actions share the same contract: `DELETE <product-base>/bulkByProperties` — 202 Accepted, async deletion, no response body.

| Action                     | Positional | Required flags |
| -------------------------- | ---------- | -------------- |
| `delete-builds`            | —          | `--properties` |
| `delete-deployments`       | —          | `--properties` |
| `delete-devinfo`           | —          | `--properties` |
| `delete-devops-components` | —          | `--properties` |
| `delete-feature-flags`     | —          | `--properties` |
| `delete-operations`        | —          | `--properties` |
| `delete-remote-links`      | —          | `--properties` |
| `delete-security`          | —          | `--properties` |

- `--properties`: comma-separated `key=value` pairs sent as query params. Multiple pairs use AND logic (all must match). E.g. `accountId=account-123` or `accountId=acc-1,environment=prod`.

```sh
# Delete builds associated with a specific account — B953
atlas jira bulk-by-properties delete-builds --properties accountId=account-123

# Delete deployments matching two property criteria — B957
atlas jira bulk-by-properties delete-deployments --properties accountId=account-123,environment=prod

# Delete development information entities — B962
atlas jira bulk-by-properties delete-devinfo --properties accountId=account-123

# Delete DevOps component entities — B968
atlas jira bulk-by-properties delete-devops-components --properties accountId=account-123

# Delete feature flag entities — B972
atlas jira bulk-by-properties delete-feature-flags --properties accountId=account-123

# Delete operations entities — B981
atlas jira bulk-by-properties delete-operations --properties accountId=account-123

# Delete remote link entities — B990
atlas jira bulk-by-properties delete-remote-links --properties accountId=account-123

# Delete security entities — B994
atlas jira bulk-by-properties delete-security --properties accountId=account-123
```

## `migration`

Connect-to-Forge issue field migration and app migration helpers under `/rest/atlassian-connect/1/migration` (B946–B950).

**Important:** `update-fields` (B948), `update-properties` (B949), and `search-workflow-rules` (B950) require the `--transfer-id` flag (UUID) — the Atlassian migration transfer context identifier sent as the `Atlassian-Transfer-Id` request header.

| Action                  | Positional                            | Required flags                                                    | Optional flags |
| ----------------------- | ------------------------------------- | ----------------------------------------------------------------- | -------------- |
| `get-task`              | `<connectKey>` `<jiraIssueFieldsKey>` | —                                                                 | —              |
| `submit-task`           | `<connectKey>` `<jiraIssueFieldsKey>` | —                                                                 | —              |
| `update-fields`         | —                                     | `--transfer-id`, `--update-value-list` (JSON array)               | —              |
| `update-properties`     | `<entityType>`                        | `--transfer-id`, `--value` (JSON array)                           | —              |
| `search-workflow-rules` | —                                     | `--transfer-id`, `--workflow-entity-id`, `--rule-ids` (CSV UUIDs) | `--expand`     |

- `<entityType>` for `update-properties`: one of `IssueProperty`, `CommentProperty`, `DashboardItemProperty`, `IssueTypeProperty`, `ProjectProperty`, `UserProperty`, `WorklogProperty`, `BoardProperty`, `SprintProperty`.
- `--update-value-list`: JSON array of `ConnectCustomFieldValue` objects (see spec schema `ConnectCustomFieldValue`).
- `--value` (for `update-properties`): JSON array of `EntityPropertyDetails` objects — each with `entityId` (number), `key` (string), `value` (string).

```sh
# Get Connect-to-Forge migration task status — B946
atlas jira migration get-task com.example.app my-custom-field

# Submit Connect-to-Forge migration task — B947
atlas jira migration submit-task com.example.app my-custom-field

# Bulk update custom field values on issues — B948
atlas jira migration update-fields \
  --transfer-id a498d711-685d-428d-8c3e-bc03bb450ea7 \
  --update-value-list '[{"_type":"StringIssueField","issueID":10001,"fieldID":10076,"string":"new value"}]'

# Bulk update entity properties — B949
atlas jira migration update-properties IssueProperty \
  --transfer-id a498d711-685d-428d-8c3e-bc03bb450ea7 \
  --value '[{"entityId":123,"key":"mykey","value":"newValue"}]'

# Search workflow transition rule configurations — B950
atlas jira migration search-workflow-rules \
  --transfer-id a498d711-685d-428d-8c3e-bc03bb450ea7 \
  --workflow-entity-id a498d711-685d-428d-8c3e-bc03bb450ea7 \
  --rule-ids 55d44f1d-c859-42e5-9c27-2c5ec3f340b1,66e55f2e-d960-539f-9d38-3d6dd7541fc2
```
