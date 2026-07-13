# UI/UX Redesign Checklist

Systematic per-page UI/UX audit + redesign of the OpenCTEM dashboard. **183 routes** total. Update status as work proceeds so nothing is missed.

## Rubric (each page scored on 6 axes)

1. **Hierarchy** — most-important surfaced first 2. **Consistency** — uses shared components (PageHeader/DataTable/StatsCard/EmptyState) 3. **Data honesty** — no mock/misleading data 4. **States** — loading/empty/error present 5. **Density & scan** — scannable tables/cards, bulk actions, right filters 6. **A11y & polish** — color+icon, cursor/hover, dark-mode contrast, mobile

## Status legend

- **Audit**: ☐ not started · 🔎 audited (findings noted) · ✅ clean (no change needed)
- **Redesign**: ☐ · ⏳ in progress · ✅ done · ➖ N/A · 🗑️ orphan/stub (verify keep/kill)
- **PR**: link/number when shipped · **QA**: ☐ pending your review · ✅ approved

> Tip: sidebar-reachable pages are Tier-1 priority; orphan routes (not in sidebar) → decide keep vs delete first.

## Scoping (15)

| Route                        | Audit | Redesign | PR  | QA  | Notes |
| ---------------------------- | :---: | :------: | :-: | :-: | ----- |
| `/asset-groups`              |   ☐   |    ☐     |     |  ☐  |       |
| `/asset-groups/[id]`         |   ☐   |    ☐     |     |  ☐  |       |
| `/attack-surface`            |   ☐   |    ☐     |     |  ☐  |       |
| `/attack-surface/cloud`      |   ☐   |    ☐     |     |  ☐  |       |
| `/attack-surface/external`   |   ☐   |    ☐     |     |  ☐  |       |
| `/attack-surface/internal`   |   ☐   |    ☐     |     |  ☐  |       |
| `/attacker-profiles`         |   ☐   |    ☐     |     |  ☐  |       |
| `/business-services`         |   ☐   |    ☐     |     |  ☐  |       |
| `/business-units`            |   ☐   |    ☐     |     |  ☐  |       |
| `/capabilities`              |   ☐   |    ☐     |     |  ☐  |       |
| `/compliance`                |   ☐   |    ☐     |     |  ☐  |       |
| `/crown-jewels`              |   ☐   |    ☐     |     |  ☐  |       |
| `/cycles`                    |   ☐   |    ☐     |     |  ☐  |       |
| `/relationships/suggestions` |   ☐   |    ☐     |     |  ☐  |       |
| `/scope-config`              |   ☐   |    ☐     |     |  ☐  |       |

## Discovery (61)

| Route                             | Audit | Redesign | PR  | QA  | Notes |
| --------------------------------- | :---: | :------: | :-: | :-: | ----- |
| `/agents`                         |   ☐   |    ☐     |     |  ☐  |       |
| `/assets`                         |   ☐   |    ☐     |     |  ☐  |       |
| `/assets/[id]`                    |   ☐   |    ☐     |     |  ☐  |       |
| `/assets/apis`                    |   ☐   |    ☐     |     |  ☐  |       |
| `/assets/certificates`            |   ☐   |    ☐     |     |  ☐  |       |
| `/assets/cloud-accounts`          |   ☐   |    ☐     |     |  ☐  |       |
| `/assets/cloud-resources`         |   ☐   |    ☐     |     |  ☐  |       |
| `/assets/containers`              |   ☐   |    ☐     |     |  ☐  |       |
| `/assets/databases`               |   ☐   |    ☐     |     |  ☐  |       |
| `/assets/discovered-urls`         |   ☐   |    ☐     |     |  ☐  |       |
| `/assets/domains`                 |   ☐   |    ☐     |     |  ☐  |       |
| `/assets/duplicates`              |   ☐   |    ☐     |     |  ☐  |       |
| `/assets/hosts`                   |   ☐   |    ☐     |     |  ☐  |       |
| `/assets/http-services`           |   ☐   |    ☐     |     |  ☐  |       |
| `/assets/iam-roles`               |   ☐   |    ☐     |     |  ☐  |       |
| `/assets/iam-users`               |   ☐   |    ☐     |     |  ☐  |       |
| `/assets/identity`                |   ☐   |    ☐     |     |  ☐  |       |
| `/assets/ip-addresses`            |   ☐   |    ☐     |     |  ☐  |       |
| `/assets/mobile`                  |   ☐   |    ☐     |     |  ☐  |       |
| `/assets/networks`                |   ☐   |    ☐     |     |  ☐  |       |
| `/assets/open-ports`              |   ☐   |    ☐     |     |  ☐  |       |
| `/assets/repositories`            |   ☐   |    ☐     |     |  ☐  |       |
| `/assets/repositories/[id]`       |   ☐   |    ☐     |     |  ☐  |       |
| `/assets/serverless`              |   ☐   |    ☐     |     |  ☐  |       |
| `/assets/service-accounts`        |   ☐   |    ☐     |     |  ☐  |       |
| `/assets/services`                |   ☐   |    ☐     |     |  ☐  |       |
| `/assets/storage`                 |   ☐   |    ☐     |     |  ☐  |       |
| `/assets/vpcs`                    |   ☐   |    ☐     |     |  ☐  |       |
| `/assets/web-applications`        |   ☐   |    ☐     |     |  ☐  |       |
| `/assets/websites`                |   ☐   |    ☐     |     |  ☐  |       |
| `/components`                     |   ☐   |    ☐     |     |  ☐  |       |
| `/components/all`                 |   ☐   |    ☐     |     |  ☐  |       |
| `/components/ecosystems`          |   ☐   |    ☐     |     |  ☐  |       |
| `/components/licenses`            |   ☐   |    ☐     |     |  ☐  |       |
| `/components/sbom-export`         |   ☐   |    ☐     |     |  ☐  |       |
| `/components/vulnerable`          |   ☐   |    ☐     |     |  ☐  |       |
| `/credentials`                    |   ☐   |    ☐     |     |  ☐  |       |
| `/exposures`                      |   ☐   |    ☐     |     |  ☐  |       |
| `/exposures/code`                 |   ☐   |    ☐     |     |  ☐  |       |
| `/exposures/credentials`          |   ☐   |    ☐     |     |  ☐  |       |
| `/exposures/misconfigurations`    |   ☐   |    ☐     |     |  ☐  |       |
| `/exposures/secrets`              |   ☐   |    ☐     |     |  ☐  |       |
| `/exposures/vulnerabilities`      |   ☐   |    ☐     |     |  ☐  |       |
| `/identities`                     |   ☐   |    ☐     |     |  ☐  |       |
| `/identities/access-analysis`     |   ☐   |    ☐     |     |  ☐  |       |
| `/identities/api-keys`            |   ☐   |    ☐     |     |  ☐  |       |
| `/identities/exposed-credentials` |   ☐   |    ☐     |     |  ☐  |       |
| `/identities/oauth-apps`          |   ☐   |    ☐     |     |  ☐  |       |
| `/identities/service-accounts`    |   ☐   |    ☐     |     |  ☐  |       |
| `/identities/users`               |   ☐   |    ☐     |     |  ☐  |       |
| `/identity/privileged`            |   ☐   |    ☐     |     |  ☐  |       |
| `/identity/risks`                 |   ☐   |    ☐     |     |  ☐  |       |
| `/identity/shadow-it`             |   ☐   |    ☐     |     |  ☐  |       |
| `/runners`                        |   ☐   |    ☐     |     |  ☐  |       |
| `/scan-profiles`                  |   ☐   |    ☐     |     |  ☐  |       |
| `/scanner-templates`              |   ☐   |    ☐     |     |  ☐  |       |
| `/scans`                          |   ☐   |    ☐     |     |  ☐  |       |
| `/scans/[id]`                     |   ☐   |    ☐     |     |  ☐  |       |
| `/secret-store`                   |   ☐   |    ☐     |     |  ☐  |       |
| `/template-sources`               |   ☐   |    ☐     |     |  ☐  |       |
| `/tools`                          |   ☐   |    ☐     |     |  ☐  |       |

## Prioritization (11)

| Route                        | Audit | Redesign | PR  | QA  | Notes |
| ---------------------------- | :---: | :------: | :-: | :-: | ----- |
| `/attack-path-visualization` |   ☐   |    ☐     |     |  ☐  |       |
| `/attack-paths`              |   ☐   |    ☐     |     |  ☐  |       |
| `/business-impact`           |   ☐   |    ☐     |     |  ☐  |       |
| `/exposure-chains`           |   ☐   |    ☐     |     |  ☐  |       |
| `/risk-analysis`             |   ☐   |    ☐     |     |  ☐  |       |
| `/scoring`                   |   ☐   |    ☐     |     |  ☐  |       |
| `/threat-intel`              |   ☐   |    ☐     |     |  ☐  |       |
| `/threats/active`            |   ☐   |    ☐     |     |  ☐  |       |
| `/threats/exploitability`    |   ☐   |    ☐     |     |  ☐  |       |
| `/threats/feeds`             |   ☐   |    ☐     |     |  ☐  |       |
| `/trending`                  |   ☐   |    ☐     |     |  ☐  |       |

## Validation (19)

| Route                          | Audit | Redesign | PR  | QA  | Notes |
| ------------------------------ | :---: | :------: | :-: | :-: | ----- |
| `/attack-simulation`           |   ☐   |    ☐     |     |  ☐  |       |
| `/control-testing`             |   ☐   |    ☐     |     |  ☐  |       |
| `/controls`                    |   ☐   |    ☐     |     |  ☐  |       |
| `/controls/effectiveness`      |   ☐   |    ☐     |     |  ☐  |       |
| `/controls/gaps`               |   ☐   |    ☐     |     |  ☐  |       |
| `/controls/list`               |   ☐   |    ☐     |     |  ☐  |       |
| `/pentest/campaigns`           |   ☐   |    ☐     |     |  ☐  |       |
| `/pentest/findings`            |   ☐   |    ☐     |     |  ☐  |       |
| `/pentest/findings/[id]/edit`  |   ☐   |    ☐     |     |  ☐  |       |
| `/pentest/findings/new`        |   ☐   |    ☐     |     |  ☐  |       |
| `/pentest/mitre-coverage`      |   ☐   |    ☐     |     |  ☐  |       |
| `/pentest/reports`             |   ☐   |    ☐     |     |  ☐  |       |
| `/pentest/retests`             |   ☐   |    ☐     |     |  ☐  |       |
| `/pentest/templates`           |   ☐   |    ☐     |     |  ☐  |       |
| `/pentest/templates/[id]/edit` |   ☐   |    ☐     |     |  ☐  |       |
| `/pentest/templates/new`       |   ☐   |    ☐     |     |  ☐  |       |
| `/simulation/campaigns`        |   ☐   |    ☐     |     |  ☐  |       |
| `/simulation/results`          |   ☐   |    ☐     |     |  ☐  |       |
| `/simulation/scenarios`        |   ☐   |    ☐     |     |  ☐  |       |

## Mobilization (24)

| Route                         | Audit | Redesign | PR  | QA  | Notes |
| ----------------------------- | :---: | :------: | :-: | :-: | ----- |
| `/collaboration/assignments`  |   ☐   |    ☐     |     |  ☐  |       |
| `/collaboration/comments`     |   ☐   |    ☐     |     |  ☐  |       |
| `/collaboration/tickets`      |   ☐   |    ☐     |     |  ☐  |       |
| `/exceptions/accepted`        |   ☐   |    ☐     |     |  ☐  |       |
| `/exceptions/false-positives` |   ☐   |    ☐     |     |  ☐  |       |
| `/exceptions/pending`         |   ☐   |    ☐     |     |  ☐  |       |
| `/pipelines`                  |   ☐   |    ☐     |     |  ☐  |       |
| `/pipelines/[id]/builder`     |   ☐   |    ☐     |     |  ☐  |       |
| `/progress`                   |   ☐   |    ☐     |     |  ☐  |       |
| `/remediation`                |   ☐   |    ☐     |     |  ☐  |       |
| `/remediation/[id]`           |   ☐   |    ☐     |     |  ☐  |       |
| `/remediation/overdue`        |   ☐   |    ☐     |     |  ☐  |       |
| `/remediation/priority`       |   ☐   |    ☐     |     |  ☐  |       |
| `/remediation/tasks`          |   ☐   |    ☐     |     |  ☐  |       |
| `/remediation/teams`          |   ☐   |    ☐     |     |  ☐  |       |
| `/remediations`               |   ☐   |    ☐     |     |  ☐  |       |
| `/response/detection`         |   ☐   |    ☐     |     |  ☐  |       |
| `/response/playbooks`         |   ☐   |    ☐     |     |  ☐  |       |
| `/response/time`              |   ☐   |    ☐     |     |  ☐  |       |
| `/sla`                        |   ☐   |    ☐     |     |  ☐  |       |
| `/workflows`                  |   ☐   |    ☐     |     |  ☐  |       |
| `/workflows/active`           |   ☐   |    ☐     |     |  ☐  |       |
| `/workflows/automations`      |   ☐   |    ☐     |     |  ☐  |       |
| `/workflows/templates`        |   ☐   |    ☐     |     |  ☐  |       |

## Insights (14)

| Route                             | Audit | Redesign | PR  | QA  | Notes |
| --------------------------------- | :---: | :------: | :-: | :-: | ----- |
| `/insights/analytics/coverage`    |   ☐   |    ☐     |     |  ☐  |       |
| `/insights/analytics/mttr`        |   ☐   |    ☐     |     |  ☐  |       |
| `/insights/analytics/performance` |   ☐   |    ☐     |     |  ☐  |       |
| `/insights/analytics/trends`      |   ☐   |    ☐     |     |  ☐  |       |
| `/insights/ctem-maturity`         |   ☐   |    ☐     |     |  ☐  |       |
| `/insights/executive`             |   ☐   |    ☐     |     |  ☐  |       |
| `/insights/findings`              |   ☐   |    ☐     |     |  ☐  |       |
| `/insights/reports/compliance`    |   ☐   |    ☐     |     |  ☐  |       |
| `/insights/reports/executive`     |   ☐   |    ☐     |     |  ☐  |       |
| `/insights/reports/scheduled`     |   ☐   |    ☐     |     |  ☐  |       |
| `/insights/reports/technical`     |   ☐   |    ☐     |     |  ☐  |       |
| `/notifications`                  |   ☐   |    ☐     |     |  ☐  |       |
| `/overview`                       |   ☐   |    ☐     |     |  ☐  |       |
| `/reports`                        |   ☐   |    ☐     |     |  ☐  |       |

## Settings (35)

| Route                                          | Audit | Redesign | PR  | QA  | Notes |
| ---------------------------------------------- | :---: | :------: | :-: | :-: | ----- |
| `/account`                                     |   ☐   |    ☐     |     |  ☐  |       |
| `/account/activity`                            |   ☐   |    ☐     |     |  ☐  |       |
| `/account/preferences`                         |   ☐   |    ☐     |     |  ☐  |       |
| `/account/security`                            |   ☐   |    ☐     |     |  ☐  |       |
| `/settings`                                    |   ☐   |    ☐     |     |  ☐  |       |
| `/settings/access-control/assignment-rules`    |   ☐   |    ☐     |     |  ☐  |       |
| `/settings/access-control/groups`              |   ☐   |    ☐     |     |  ☐  |       |
| `/settings/access-control/permission-sets`     |   ☐   |    ☐     |     |  ☐  |       |
| `/settings/asset-lifecycle`                    |   ☐   |    ☐     |     |  ☐  |       |
| `/settings/audit`                              |   ☐   |    ☐     |     |  ☐  |       |
| `/settings/general`                            |   ☐   |    ☐     |     |  ☐  |       |
| `/settings/integrations`                       |   ☐   |    ☐     |     |  ☐  |       |
| `/settings/integrations/api-keys`              |   ☐   |    ☐     |     |  ☐  |       |
| `/settings/integrations/apps`                  |   ☐   |    ☐     |     |  ☐  |       |
| `/settings/integrations/cicd`                  |   ☐   |    ☐     |     |  ☐  |       |
| `/settings/integrations/mcp`                   |   ☐   |    ☐     |     |  ☐  |       |
| `/settings/integrations/notifications`         |   ☐   |    ☐     |     |  ☐  |       |
| `/settings/integrations/notifications/history` |   ☐   |    ☐     |     |  ☐  |       |
| `/settings/integrations/notifications/outbox`  |   ☐   |    ☐     |     |  ☐  |       |
| `/settings/integrations/saml`                  |   ☐   |    ☐     |     |  ☐  |       |
| `/settings/integrations/scim-tokens`           |   ☐   |    ☐     |     |  ☐  |       |
| `/settings/integrations/scm`                   |   ☐   |    ☐     |     |  ☐  |       |
| `/settings/integrations/security`              |   ☐   |    ☐     |     |  ☐  |       |
| `/settings/integrations/siem`                  |   ☐   |    ☐     |     |  ☐  |       |
| `/settings/integrations/ticketing`             |   ☐   |    ☐     |     |  ☐  |       |
| `/settings/modules`                            |   ☐   |    ☐     |     |  ☐  |       |
| `/settings/notifications`                      |   ☐   |    ☐     |     |  ☐  |       |
| `/settings/pentest`                            |   ☐   |    ☐     |     |  ☐  |       |
| `/settings/priority-rules`                     |   ☐   |    ☐     |     |  ☐  |       |
| `/settings/roles`                              |   ☐   |    ☐     |     |  ☐  |       |
| `/settings/scoring`                            |   ☐   |    ☐     |     |  ☐  |       |
| `/settings/sla-policies`                       |   ☐   |    ☐     |     |  ☐  |       |
| `/settings/tenant`                             |   ☐   |    ☐     |     |  ☐  |       |
| `/settings/tenant/create`                      |   ☐   |    ☐     |     |  ☐  |       |
| `/settings/users`                              |   ☐   |    ☐     |     |  ☐  |       |

## Other (4)

| Route                 | Audit | Redesign | PR  | QA  | Notes |
| --------------------- | :---: | :------: | :-: | :-: | ----- |
| `/`                   |   ☐   |    ☐     |     |  ☐  |       |
| `/findings`           |   ☐   |    ☐     |     |  ☐  |       |
| `/findings/[id]`      |   ☐   |    ☐     |     |  ☐  |       |
| `/findings/approvals` |   ☐   |    ☐     |     |  ☐  |       |
