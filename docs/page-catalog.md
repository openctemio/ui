# Page Catalog — every route & where it lives

The app has **154 `page.tsx` files** (144 under `(dashboard)`, 10 outside it for
auth/onboarding). The sidebar links **74 URLs**. **Nothing is deleted** — every page
is URL-reachable. This catalog is the source of truth for "what exists" so hidden
pages aren't forgotten. Regenerate the raw lists with:

```
find src/app -name page.tsx | wc -l                       # 154 total
find "src/app/(dashboard)" -name page.tsx | wc -l         # 144
grep -oE "url: '[^']+'" src/config/sidebar-data.ts | sort -u   # 74 nav URLs
```

Routes under `(dashboard)` are organized into the five CTEM stages as Next.js route
groups (the `(group)` folder does not appear in the URL):
`(scoping)`, `(discovery)`, `(prioritization)`, `(validation)`, `(mobilization)`,
plus top-level `insights/`, `findings/`, `reports/`, `settings/`, `account/`,
`notifications/`.

## 1. In the sidebar (74) — the live product

Grouped by CTEM stage in `src/config/sidebar-data.ts`:

- **Dashboard** — `/`
- **Scoping** — Attack Surface (+ external/internal/cloud), Asset Groups, Scope
  Config, Business Services, Business Units, Crown Jewels, CTEM Cycles, Attacker
  Profiles, Relationships, Compliance, Threat Model, Scan Profiles, Scanner
  Templates, Template Sources, Secret Store, Tools, Capabilities, Agents.
- **Discovery** — Scans, Asset Inventory, Exposures (+ vulnerabilities, secrets,
  code, misconfigurations), Credentials, Components.
- **Prioritization** — Exposure Chains, Attack Paths, Threat Intel, Business Impact.
- **Validation** — Pentest (campaigns, findings, retests, templates, reports,
  MITRE coverage), Attack Simulation, Control Testing, Compensating Controls.
- **Mobilization** — Remediation, Workflows, Pipelines, SLA, Exceptions.
- **Insights** — Executive, CTEM Maturity, Program Health, Data Quality, Findings
  list, Reports.
- **Settings** — Users, Roles, Access Control (Groups, Permission Sets, Assignment
  Rules), Modules, Priority Rules, Scoring, SLA Policies, Asset Lifecycle, Audit,
  Tenant, Pentest, and Integrations (CI/CD, SCM, SIEM, Ticketing, Notifications,
  SAML, SCIM Tokens, MCP, Verified Domains).

### These are SHIPPED — not scaffolds

Earlier drafts of this catalog flagged several pages as "scaffolds to delete."
That is now wrong. Each is sidebar-linked and backed by a real, domain-scoped hook:

| Page | Backing hook(s) |
|---|---|
| `/sla` | `useFindingsApi` (SLA-relevant findings) |
| `/controls` | `useSWR` (compensating-controls fetch) |
| `/control-testing` | `useControlTests`, `useControlTestStats`, `useRecordControlTestResult` |
| `/exceptions` | `useSuppressions` (+ approve/reject/delete mutations) |
| `/workflows` | `useWorkflows`, `useWorkflowRuns` (+ create/trigger/delete) |
| `/attack-simulation` | `useSimulations`, `useRunSimulation` |

## 2. Reachable, intentionally NOT in the sidebar (not orphaned)

- **Asset types (~30)** `/assets/<type>` (hosts, domains, certificates, containers,
  cloud-accounts, iam-users, repositories, …) plus `/assets/all` and
  `/assets/duplicates` → reached from the **/assets** hub cards + `?type=` filter.
- **Exposures / Components sub-views** `/exposures/{vulnerabilities,misconfigurations,secrets,code}`
  (also sidebar-linked) and `/components/{all,vulnerable,ecosystems,licenses,sbom-export}`
  → reached from the parent page's tabs/cards.
- **Solution Families** `/remediations` → the "Solution Families" tab on `/remediation`.
- **Findings** `/findings/approvals` → the approvals tab / queue on `/findings`.
- **Settings / account / integrations sub-pages** `/settings/*`, `/settings/integrations/*`,
  `/settings/access-control/*`, `/account/*` → the settings hub + user menu / parent tabs.
- **Detail / new / edit** `[id]`, `/new`, `/edit`, `/notifications` → reached from
  their list pages / notification bell.

## 3. Genuine scaffolds — dashboard-total only, NOT sidebar-linked

Only three pages remain that render `useDashboardStats` totals under a domain title
with no domain-scoped data source of their own. They are intentionally **not** in
the sidebar, so they mislead no one; keep the route and either build the feature or
replace with `ComingSoonPage`.

- `/progress` — `useDashboardStats` only.
- `/trending` — `useDashboardStats` (has one generic `useSWR` fetch but is still
  dashboard-total heavy).
- `/insights/analytics/mttr` — `useDashboardStats` + `useMTTRMetrics`.

The wide "hidden placeholder" clusters listed in older revisions
(`/collaboration/*`, `/response/*`, `/threats/*`, `/identity/*`,
`/controls/{list,gaps,effectiveness}`, `/exceptions/{pending,accepted,false-positives}`,
`/workflows/{active,automations,templates}`, `/attack-path-visualization`,
`/overview`, `/scoring`, `/insights/reports/{executive,technical}`) **no longer
exist** — those route folders were deleted. Do not re-add them here.

A regression test, `src/config/__tests__/sidebar-no-scaffolds.test.ts`, walks every
sidebar leaf to its page file and fails if the only data source is
`useDashboardStats` — so a scaffold can never be linked from the sidebar.
