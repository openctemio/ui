# UI/UX Redesign Proposals (design-led, not bug-led)

Companion to `UI_UX_REDESIGN_CHECKLIST.md`. That file tracks bugs/status; **this file is the design brief** — how to re-lay-out and re-arrange components so each surface is more modern, scannable, and useful. Senior-UI/UX lens.

Guiding principles applied throughout:

- **Summary before detail** — the one number/decision the user needs, first.
- **Counts live in filter chips, not duplicate stat-cards** — never show the same number twice.
- **One search, one filter bar** per view.
- **Charts must be legible** — no >8-slice pies (confetti); use horizontal bars ranked desc.
- **Honest data** — a card that restates another page's data (or fabricates) is removed, not styled.
- **Consolidate IA** — fewer, richer pages beat many thin duplicates.

---

## A. Information-Architecture consolidation (the biggest UX win)

The app has grown ~183 routes with heavy duplication. Collapse to a smaller, tabbed IA:

| Today (duplicated)                                                                                     | Proposed                                                                                  |
| ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `/overview` + `/insights/executive` + `/insights/reports/executive` (3 near-identical exec dashboards) | **One** `Executive` page; "Report" = an export action on it, not a separate page          |
| `/reports` **and** the whole `/insights/reports/*` tree (two full report systems)                      | **One** Reports hub (tabs: Executive / Technical / Compliance / Scheduled)                |
| `/remediation` (list) + `/remediations` (empty dup) + `/remediation/tasks` (dashboard, title clash)    | **One** Remediation page: tabs `Tasks · Groups · Overview`; drop `/remediations`          |
| `/attack-paths` + `/attack-path-visualization` (dup) + `/exposure-chains`                              | **One** Attack Paths page with a `List / Visualize` toggle; keep Exposure Chains distinct |
| `/scoring` + `/risk-analysis` (Coming-Soon) + `/threats/exploitability` + `/trending` (4 risk views)   | Fold `/risk-analysis` into `/scoring`; keep exploitability + trending as tabs             |
| `/collaboration/tickets` == `/collaboration/assignments` (identical data)                              | One "Work" view; remove the duplicate                                                     |
| `/settings` == `/settings/tenant`; duplicate Localization section                                      | `/settings` → index; Localization lives once                                              |
| 6× `/identities/*` Coming-Soon stubs, `/insights/reports/scheduled` stub, gated integration stubs      | **Hide from nav** until built (don't route users into dead ends)                          |

**Nav rule:** module-gated + Coming-Soon routes should be hidden from the sidebar (or badged "Upgrade"), never a clickable dead-end that fetches and 403s.

---

## B. Flagship page redesigns (before → after)

### 1. Findings (`/findings`)

**Now:** 5 severity **stat-cards** → then severity **filter tabs** with the _same_ counts → then a top search → then the DataTable with _its own_ search. Location column shows a raw UUID. Priority column all "—".

**Redesign:**

```
PageHeader: "Security Findings"  · 65 total · 58 open        [Approvals][Export][+ Add]
─────────────────────────────────────────────────────────────────────
[ All 65 ][ Critical 18 ][ High 23 ][ Medium 17 ][ Low 6 ]   ← severity = the filter (counts here)
[🔍 Search…]         [Status ▾][Source ▾][Scanner ▾]  [▦ Columns]   ← ONE toolbar
─────────────────────────────────────────────────────────────────────
Title (+CVE·scanner)    Severity   Asset            First seen   Status
```

- **Delete** the 5 severity stat-cards — the filter chips already carry the counts.
- **One** search (the DataTable's); remove the outer one.
- **Location** → show the **asset name** (not UUID); UUID only in detail.
- **Priority** → hide until populated, or merge into a single "Risk" column (severity+EPSS+KEV).

### 2. Dashboard (`/`)

- **CTEM stepper**: change from "furthest phase touched" (1 resolved → "Mobilization done") to **bottleneck** = where most unresolved findings sit, with a count under each phase. Honest + actionable.
- Keep Quick Actions + KPI row; ensure every widget has a real empty-state for a 0-asset tenant.

### 3. Asset list template (15 pages share it)

- **Hide-when-empty columns**: don't render a wall of "—" (Certificates shows Issuer/Valid-Until/Days-Left all empty — the whole point of a cert list). Render a column only if ≥1 row has a value; otherwise drop it + note in an "enrich to see" hint.
- **Per-type singular/plural noun** for the subtitle (kill "6 network & security devices in your infrastructure" grammar).
- Repositories: **remove the duplicate stat-card** ("Total" == "Total Repositories").

### 4. Any "trend" chart (≈10 pages)

- Fix the shared **"Invalid Date"** x-axis (date parse) — single highest-count bug.
- Replace **confetti pies** (Asset-Type distribution with ~19 slices, on technical-reports/scope-config) with a **horizontal bar chart, ranked desc, top-8 + "Other"**.
- Single-segment donuts (Secrets "coverage" = one slice) → a stat tile, not a donut.

### 5. Exposures sub-pages (`/exposures/{vulnerabilities,misconfigurations,secrets,code}`)

- **Filter the KPI/chart query by finding type per page** — today all show the identical unfiltered 65/18/23 aggregate, which makes the type pages pointless.

---

## C. Design-system rules to codify (prevent regressions)

1. **Stat-card ≠ filter duplicate.** If a value appears in a filter chip/tab, don't also put it in a stat-card.
2. **Risk Score**: one util, one 0–10 scale, one label mapping. (Today: 52.7/10 on one page, 0.0 on others.)
3. **Chart date axis**: one safe `formatChartDate(value)` util used by every trend chart.
4. **Pie cap**: >8 categories → horizontal bar; 1 category → stat tile.
5. **Empty vs gated vs error** are three distinct, consistent states (gated must not fetch → no 403 toasts).
6. **Ingest noise** (auto-generated ids like `upd-1780051200-24045`, OS "x") shouldn't surface as first-class asset names.

---

## D. Execution order (design work, tracked in the checklist)

1. Findings dedup + Location fix (flagship, clearest win).
2. Shared `formatChartDate` util → kill Invalid-Date everywhere.
3. Asset-list hide-empty-columns + repo dup-card.
4. IA merges (exec dashboards, report systems, remediation) — larger, staged.
5. Chart legibility pass (pies → bars).
6. Hide gated/Coming-Soon routes from nav.
