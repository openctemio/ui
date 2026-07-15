# UI Consistency Sweep — status

Cross-cutting cleanup kicked off 2026-07 after a grounded inventory. Two
workstreams: **severity-color governance** and **orphan routes**. This doc is
the single source of truth for what's done / pending. Keep it updated.

## Branch / PRs

- `chore/ui-consistency-sweep` → develop (this work)
- Related (separate, in review): remediation rework — ui #280, api #310.

---

## Workstream A — Severity-color governance (~63 ad-hoc sites)

**Source of truth:** `src/lib/severity-colors.ts` (5 variants: CHART / BADGE_LIGHT /
BADGE_SOLID / TEXT / DOT). Everything must derive from here.

**Problem:** 6 competing config maps + 2 duplicate `SeverityBadge` components +
~50 inline literals/switches/ternaries. `medium` alone renders as `bg-yellow-500`,
`/20`, `-100`, `/15` depending on which map a component grabbed.

Plan (batched — colors change → verify on device between batches):

- [x] **Batch 1 (0 visual change):** `SEVERITY_CONFIG` (features/shared/types/common.types.ts)
      now derives from `severity-colors.ts` (added `SEVERITY_SOLID_TEXT` +
      `SEVERITY_BORDER_COLORS` there). Identical values → no visual change. DONE.
- [ ] **Batch 2 (colors change):** collapse the 2 `SeverityBadge` dups → the shared
      one; migrate the 4 other exported maps (finding.types, lib/api/finding-types,
      lib/api/exposure-types, notifications/outbox) to the matching variant.
- [ ] **Batch 3:** migrate the 31 inline object-literals + 11 `switch(severity)` +
      5 `getSeverityColor` + 7 JSX ternaries. (Full path:line list in the inventory.)

Competing sources to retire (Batch 2):

- features/shared/types/common.types.ts:41 SEVERITY_CONFIG (solid) ← canonical target
- features/findings/types/finding.types.ts:267 (translucent)
- lib/api/finding-types.ts:150 (light)
- lib/api/exposure-types.ts:273 EXPOSURE_SEVERITY_CONFIG (light)
- features/notifications/types/notification-outbox.types.ts:121 (light, no dark)
- features/components/components/severity-badge.tsx:9 (own inline, translucent) — DELETE, re-export shared

---

## Workstream B — Orphan routes (46 real pages unreachable from sidebar)

Nav source: `src/config/sidebar-data.ts`. 167 dashboard pages, ~93 linked.

### Decisions (from product owner)

- **Surface real subtrees** in the sidebar.
- **Delete** the STUB `ComingSoonPage` orphans + the duplicate `/identities/*` tree.
- **`/remediations`** — CORRECTION: this is NOT a duplicate of `/remediation`. It's
  the **RFC-015 Remediation Groups** (Solution Family) feature. → **SURFACE it**,
  do NOT redirect/delete.

### B1 — Delete (dead / duplicate stubs) — status: [x] DONE

- [x] `/identities/*` (7 `ComingSoonPage` pages) — deleted; duplicated the REAL
      `/identity/*`. Confirmed unreferenced by nav/links first.
- [x] `/risk-analysis` — deleted (standalone orphan stub) + cleaned its
      `route-permissions.ts` and `breadcrumb-nav.tsx` entries.
- KEPT (correction — NOT orphans): `settings/integrations/cicd` + `/siem` ARE
  linked in the sidebar (coming-soon integration pages). `settings/integrations/apps`
  left in place (settings-hub reachable; harmless).

### B2 — Surface in sidebar (real, built-out subtrees) — status: [ ]

Sidebar currently links only the parent; children are real but orphaned:

- Validation: `/controls/{list,gaps,effectiveness}`, `/response/{detection,playbooks,time}`,
  `/simulation/{campaigns,scenarios,results}`
- Threats: `/threats/{active,exploitability,feeds}`
- Mobilization: `/collaboration/{assignments,comments,tickets}`,
  `/exceptions/{pending,accepted,false-positives}`, `/workflows/{active,automations,templates}`,
  `/remediations` (RFC-015 groups), `/progress`, `/sla`
- Insights: `/insights/findings`, `/insights/analytics/{coverage,mttr,performance,trends}`,
  `/insights/reports/{executive,technical,compliance,scheduled}`
- Discovery/prioritization singletons: `/identity/{privileged,risks,shadow-it}`,
  `/runners`, `/trending`, `/scoring`, `/attack-path-visualization`,
  `/exposures/credentials`, `/attack-surface/{external,internal,cloud}`, `/overview`
- Settings leaves reachable only via the hub page: `/settings/general`,
  `/settings/integrations/{api-keys,security}`, `/settings/access-control/permission-sets`,
  `/settings/sla-policies`, `/settings/integrations/notifications/{history,outbox}`

### B3 — Leave as-is (correctly off-sidebar)

- Detail/new/edit subpages (`[id]`, `/new`, `/edit`) — reached from lists.
- Asset-type list subpages (`/assets/*`) — reached via in-page asset-type filter.
- `/account/*`, `/settings/notifications`, `/settings/tenant/create` — secondary nav.

---

## Log

- 2026-07: inventory complete; status doc created; `/remediations` reclassified as
  RFC-015 groups (surface, not redirect).
