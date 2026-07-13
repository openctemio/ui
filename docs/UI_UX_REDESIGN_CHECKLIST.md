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

| Route                        | Audit | Redesign | PR  | QA  | Notes                                                                                                                                                                   |
| ---------------------------- | :---: | :------: | :-: | :-: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/asset-groups`              |  🔎   |    ☐     |     |  ☐  | Good DataTable; but every group Assets=0 & Total Assets=0 while groups have findings/risk — asset-count join not populated.                                             |
| `/asset-groups/[id]`         |   ☐   |    ☐     |     |  ☐  |                                                                                                                                                                         |
| `/attack-surface`            |  ✅   |    ➖    |     |  ☐  | Clean overview (4 stats + breakdown). Seed data reads placeholder; subtitle "external" but mixes internal — wording drift.                                              |
| `/attack-surface/cloud`      |  🔎   |    ☐     |     |  ☐  | Data bug: gcp-named row shows AWS badge + GCP/Azure distribution=0; region "unknown"; risk "Critical 1" contradicts "Clean 100% / Findings 0".                          |
| `/attack-surface/external`   |  🔎   |    ☐     |     |  ☐  | 🐛 CRASH — error boundary "Failed to load scope config"; console: Element type is invalid (undefined import in shared scope component). HIGH priority.                  |
| `/attack-surface/internal`   |  🔎   |    ☐     |     |  ☐  | 🐛 CRASH — same undefined-import crash as /external (one fix resolves both). HIGH priority.                                                                             |
| `/attacker-profiles`         |  ✅   |    ➖    |     |  ☐  | Tidy profiles table w/ capability chips. Nit: Actions col only shows a "Default" badge (reads like 2nd column) — rename/real action.                                    |
| `/business-services`         |  ✅   |    ➖    |     |  ☐  | Clean table (criticality, tags, SLA). Owners are example.com seed placeholders.                                                                                         |
| `/business-units`            |  🔎   |    ☐     |     |  ☐  | Empty metrics: Total Assets/Avg Risk/Avg Compliance all 0; Compliance col renders bare "%" + empty bars; "0 active/0 inactive" vs 3 units.                              |
| `/capabilities`              |  ✅   |    ➖    |     |  ☐  | Polished card grid + stats + tabs + grid/table toggle. Nit: "Add Capability" muted-gray vs black primary elsewhere — button drift.                                      |
| `/compliance`                |  🔎   |    ☐     |     |  ☐  | Module-gate correct BUT still fires query → 2×403 + 2 stacked red permission toasts on the gate; gate should short-circuit fetch. Gated pages also drop top header bar. |
| `/crown-jewels`              |  ✅   |    ➖    |     |  ☐  | Full-featured (risk/impact bars, exposure). Nits: ugly seed asset id; "None" vs "0" label inconsistency.                                                                |
| `/cycles`                    |  ✅   |    ➖    |     |  ☐  | Correct module-gate "Feature Not Available (ctem_cycles)" — intentional, not a stub.                                                                                    |
| `/relationships/suggestions` |  ✅   |    ➖    |     |  ☐  | Useful (suggestions w/ confidence %, Approve/Reject, Approve-All). Nit: Reason truncated, no tooltip; example.com seed.                                                 |
| `/scope-config`              |  ✅   |    ➖    |     |  ☐  | Strong (tabs, donut, status bar). Nits: donut ~18 tiny slices (top-N+other); unexplained red "Scope Status 11.48%".                                                     |

## Discovery (61)

| Route                             | Audit | Redesign | PR  | QA  | Notes                                                                       |
| --------------------------------- | :---: | :------: | :-: | :-: | --------------------------------------------------------------------------- |
| `/agents`                         |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/assets`                         |  🔎   |    ✅    |     |  ☐  | Already redesigned (dedup + Duplicates card). Clean.                        |
| `/assets/[id]`                    |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/assets/apis`                    |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/assets/certificates`            |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/assets/cloud-accounts`          |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/assets/cloud-resources`         |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/assets/containers`              |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/assets/databases`               |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/assets/discovered-urls`         |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/assets/domains`                 |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/assets/duplicates`              |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/assets/hosts`                   |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/assets/http-services`           |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/assets/iam-roles`               |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/assets/iam-users`               |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/assets/identity`                |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/assets/ip-addresses`            |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/assets/mobile`                  |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/assets/networks`                |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/assets/open-ports`              |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/assets/repositories`            |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/assets/repositories/[id]`       |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/assets/serverless`              |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/assets/service-accounts`        |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/assets/services`                |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/assets/storage`                 |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/assets/vpcs`                    |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/assets/web-applications`        |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/assets/websites`                |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/components`                     |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/components/all`                 |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/components/ecosystems`          |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/components/licenses`            |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/components/sbom-export`         |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/components/vulnerable`          |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/credentials`                    |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/exposures`                      |  🔎   |    ☐     |     |  ☐  | Exposure Events + DataTable — check dup controls + UUID cols; pass pending. |
| `/exposures/code`                 |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/exposures/credentials`          |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/exposures/misconfigurations`    |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/exposures/secrets`              |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/exposures/vulnerabilities`      |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/identities`                     |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/identities/access-analysis`     |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/identities/api-keys`            |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/identities/exposed-credentials` |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/identities/oauth-apps`          |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/identities/service-accounts`    |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/identities/users`               |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/identity/privileged`            |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/identity/risks`                 |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/identity/shadow-it`             |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/runners`                        |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/scan-profiles`                  |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/scanner-templates`              |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/scans`                          |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/scans/[id]`                     |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/secret-store`                   |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/template-sources`               |   ☐   |    ☐     |     |  ☐  |                                                                             |
| `/tools`                          |   ☐   |    ☐     |     |  ☐  |                                                                             |

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

| Route                 | Audit | Redesign | PR  | QA  | Notes                                                                                                      |
| --------------------- | :---: | :------: | :-: | :-: | ---------------------------------------------------------------------------------------------------------- |
| `/`                   |  🔎   |    ☐     |     |  ☐  | CTEM stepper misleading (1 resolved → "Mobilization done"); rest OK. Backlog: stepper→bottleneck.          |
| `/findings`           |  🔎   |    ☐     |     |  ☐  | Dup severity cards vs filter tabs; double search; Location=raw UUID; empty Priority col. High-value dedup. |
| `/findings/[id]`      |   ☐   |    ☐     |     |  ☐  |                                                                                                            |
| `/findings/approvals` |   ☐   |    ☐     |     |  ☐  |                                                                                                            |
