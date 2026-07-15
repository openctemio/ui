# Page Catalog — every route & where it lives

The app has **171 page routes**; the sidebar links **63**. **Nothing is deleted** —
every page is URL-reachable. This catalog is the source of truth for "what exists"
so hidden pages aren't forgotten. Regenerate the raw lists with:

```
find "src/app/(dashboard)" -name page.tsx   # all routes
grep "url:" src/config/sidebar-data.ts        # nav routes
```

## 1. In the sidebar (63) — the live product

Grouped by CTEM stage in `src/config/sidebar-data.ts`: Dashboard; Scoping (Attack
Surface, Asset Groups, Scope Config, Business Services/Units, Crown Jewels, CTEM
Cycles, Attacker Profiles, Relationships, Compliance); Discovery (Scans, Asset
Inventory, Exposures, Credentials, Components); Prioritization (Exposure Chains,
Attack Paths, Threat Intel, Business Impact, Priority Rules); Validation (Pentest×6,
Attack Simulation, Control Testing, Compensating Controls); Mobilization
(Remediation, Workflows, Pipelines); Insights (Executive, CTEM Maturity, Findings
list, Reports); Settings (×26).

## 2. Reachable, intentionally NOT in the sidebar (not orphaned)

- **Asset types (26)** `/assets/<type>` (domains, hosts, certificates, …) → reached
  from the **/assets** hub cards + the `?type=` filter.
- **Exposures/Components sub-views (10)** `/exposures/{vulnerabilities,misconfigurations,secrets,code}`,
  `/components/{all,vulnerable,ecosystems,licenses,sbom-export}` → reached from the
  parent page's tabs/cards.
- **Solution Families** `/remediations` → the "Solution Families" tab on `/remediation`.
- **Settings/account (15)** `/settings/*`, `/account/*` → the settings hub + user menu.
- **Detail/new/edit** `[id]`, `/new`, `/edit`, `/findings/approvals`, `/notifications`
  → reached from their list pages / notification bell.

## 3. Hidden placeholders — URL-only until built out (re-surface when real)

These were surfaced by #281 then hidden (#289): a deep-dive found they only re-slice
the shared `useDashboardStats` hook (no distinct data source) and most parent groups
have no landing page. They over-promised features that don't exist yet. Keep the
routes; **re-add to the sidebar (or fold into a parent's tabs) when each becomes a
real feature.**

`/attack-path-visualization`, `/attack-surface/{external,internal,cloud}`,
`/collaboration/{assignments,comments,tickets}`, `/controls/{list,gaps,effectiveness}`,
`/exceptions/{pending,accepted,false-positives}`, `/identity/{privileged,risks,shadow-it}`,
`/insights/analytics/{coverage,mttr,performance,trends}`,
`/insights/reports/{executive,technical,compliance,scheduled}`, `/insights/findings`,
`/response/{detection,playbooks,time}`, `/simulation/{campaigns,scenarios,results}`,
`/threats/{active,exploitability,feeds}`, `/workflows/{active,automations,templates}`,
`/overview`, `/progress`, `/sla`, `/scoring`, `/trending`, `/runners`.

**Slightly more real (candidates to build+surface first):** `/trending` (3 real
fetches), `/insights/analytics/mttr` (+useMTTRMetrics), `/simulation/scenarios`
(+useSimulations), `/attack-surface/*` (use real assets but contain mock arrays).
