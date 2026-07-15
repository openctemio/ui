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
- [~] **Batch 3 (mostly DONE — #283):** migrated 22 severity maps across 18 files
  to the source (SOLID/SOFT/LIGHT/TEXT/DOT/CHART per site); fixed another
  low green→blue (overview-tab). SKIPPED 13 correctly: criticality maps
  (exposure-chains/attack-paths/assets[id]/component+vuln CRITICALITY_BADGE),
  priority, audit-domain (audit-types 4-level), and shapes with no matching
  variant (bg-only maps, gradient/ring, icon+color split-configs). Residual
  tail (deferred, low value): `activity-panel.tsx` low still green (no matching
  variant); a few bg-only + split-config maps. Colors CHANGED on ~18 pages —
  verify on device.
- [x] **Batch 3 (original triage note):** the inventory's
      "31 inline severity maps" grepped `critical: bg-…` and so INCLUDES maps that
      are actually **Criticality** (business importance) or **Priority**, not finding
      severity — e.g. the scoping pages' `criticalityColors` (business-services,
      business-units, asset-groups, attack-surface/*). Those intentionally use
      **green for low** (low criticality = good) and must NOT be folded into the
      severity source (which is blue-for-low). Batch 3 = migrate ONLY genuine
      finding/vuln **severity** sites; leave criticality/priority maps (or give
      them their own `criticality-colors.ts` source in a later pass). Triage each
      site against what it renders before migrating.

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

### B2 — Surface in sidebar (real, built-out subtrees) — status: [x] DONE

Converted bare parents into collapsibles + added children in `sidebar-data.ts`
(Scoping/Discovery/Prioritization/Validation/Mobilization/Insights). Module gating:
guarded routes inherit/set the exact module their route-guard enforces; guard-less
routes get a permission but no module (fail-open, stays visible). Insights reports
group named "Report Center" to avoid clashing with the existing "Reports" link.
Verified: tsc + eslint clean, `sidebar-route-consistency` 90/90.

Original list (all surfaced):

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

## Governance & follow-up (post-Batch-3)

- [x] **Drift guard** — `src/config/__tests__/severity-color-governance.test.ts`
      fails if a NEW file hard-codes an inline severity→color map. Allowlists the
      current legacy sites (criticality/priority/other-domain/residual); the
      ratchet only tightens. New code must import from `severity-colors.ts`.
- [x] **Residual:** `activity-panel.tsx` migrated to SOFT (low green→blue).
- [x] **Cleanup:** deleted merged branches chore/severity-batch2, -batch3,
      ui-consistency-sweep.
- [ ] **P2 — criticality single-source:** ~14 files still hold inline
      `criticalityColors`/`CRITICALITY_BADGE` maps (green-for-low intentional).
      Next PR: add `src/lib/criticality-colors.ts` + migrate them + drop them from
      the guard allowlist. (audit-log severity + capabilities/pipelines are their
      own domains — keep separate palettes.)

## Log

- 2026-07: inventory complete; status doc created; `/remediations` reclassified as
  RFC-015 groups (surface, not redirect).
