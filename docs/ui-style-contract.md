# UI style contract

One way to build each kind of screen. Every page follows these rules; a
deviation needs a reason written next to it in code. The Findings page
(`src/app/(dashboard)/findings/page.tsx`) is the reference implementation of a
list page.

## 1. Page anatomy

Every page, top to bottom:

1. **`<Main>`** — never a hand-rolled wrapper, never `overflow-*` overrides.
2. **`<PageHeader title description>`** — the only `<h1>` on the page.
   - Title: short noun ("Findings", "Scan profiles"), sentence case.
   - Description: one sentence saying what the page is for.
   - Actions (children): at most **one primary** button (`size="sm"`) plus up
     to **two** `variant="outline"` buttons. Anything more goes into a `⋯`
     "More" dropdown. Icon-only buttons need `aria-label` and a tooltip.
3. **Tabs** (only if the page has sub-views) — `<Tabs>` directly under the
   header with `className="mt-4"`. The default underline style is the only tab
   style: no `className` overrides that change its look (no grids, pills,
   backgrounds). Put the active tab in the URL (`?tab=`).
   - **Section tabs** — when the sub-views are separate routes (Remediation:
     Tasks | Solution families; Exposures: Overview | Vulnerabilities | …), use
     the shared `<SectionTabs>`, placed the same way: directly under the header
     with `className="mt-4"` (its own `mb-5` spaces the content), or
     `"mt-4 mb-0"` when the next block already carries `mt-5`. Define the list once in
     `src/config/section-tabs.ts` and pass it as the sidebar item's `sections`:
     the sidebar shows ONE row for the section (active on every tab's route), the
     command palette lists each tab. Never a third sidebar level for them.
4. **Content blocks** separated by `mt-5` (or `space-y-5` / `gap-5`).

## 2. Headline numbers

- **List pages** (a table is the main content): one `<MetricStrip>` (2–6
  metrics) under the header/tabs. A metric that maps to a filter gets
  `onClick` + `active` and toggles that filter.
- **Overview / dashboard pages**: `<StatsCard>` in a grid. One variant only:
  label top-left, muted icon top-right, value, optional caption.
- Never: pastel icon tiles, coloured card borders, coloured icons before the
  label, card-in-card stat grids.
- Colour a number only when it is a problem **and** greater than zero
  (`tone="danger"` / `text-destructive`). A zero is never coloured.

## 3. Lists and tables

- Use the shared `<DataTable>`. No hand-rolled `<Table>` for data lists.
- Do **not** wrap `<DataTable>` in a `<Card>` — it draws its own border.
- Toolbar: search on the left, secondary actions (refresh, export) on the right,
  via `toolbarStart` / `toolbarEnd`. Filters:
  - ≥ 3 filter dimensions → `<FacetFilterPanel>` in a floating sticky card
    (see Findings), toggled from the toolbar, closed by default.
  - 1–2 dimensions → dropdown buttons in the toolbar.
- **The Filters button is icon-only**, and there is exactly one:
  `FilterButton` from `@/features/shared` (`filter-button.tsx`). It is a
  square `size-9` outline button with the `ListFilter` icon, `aria-label` and
  tooltip "Filters", a count badge on its corner and a primary tint when
  filters are applied. Never a "[≡ Filters]" text button.
  - Facet panel (Findings layout): pass `filterToggle` (`open`, `onToggle`,
    `onOpenSheet`, `activeCount`, `controlsId`) to `<DataTable>`, or render
    `<FilterPanelToggle>` yourself when the toolbar is not a DataTable's. It
    toggles the side panel from `lg` up and opens the same panel below `lg`
    in `<FilterSheet>` (full width, close button on its own row, a "Show N
    results" footer). No other left-side sheet.
  - Popover / sheet / dialog of filters: put `<FilterButton activeCount={n} />`
    inside `<PopoverTrigger asChild>` (it forwards its ref and props).
  - The filter icons (`ListFilter`, `Filter`, `Funnel`, …) are imported only by
    `filter-button.tsx`. Dropdown filters and their select triggers carry no
    filter icon; label them with `aria-label="Filter by …"`.
  - Enforced by `src/features/shared/components/__tests__/filter-trigger-governance.test.ts`;
    a non-trigger use of a filter icon needs an allowlist entry with a reason.
- Filters, search, sort, page and page size live in the URL
  (`useUrlFilter` / `useUrlFilterList`).
- Server-paginated tables pass `sorting`/`onSortingChange`; columns the API
  cannot sort set `enableSorting: false`.
- The first column is the row's name; row actions are the last column with
  `id: 'actions'` (both are pinned automatically).

### Grouped lists

A grouped view is the same list, organised under group headers. It is one
`<DataTable>` with `rowGroups`: each group is a full-width header row inside
the table, followed by its rows with the table's normal columns. Sensors
(group by zone / role / version) and Findings (group by CVE / asset / owner /
severity / source / component / type, and the verification queue) are the
reference implementations.

- **One table, never a card per group.** Rows keep their columns, sort,
  selection, row actions, the drawer and the bulk-action bar. A card per group
  shows a summary and hides the rows; at 1440px it fits four groups and no
  findings.
- **Group by is a toolbar select** (`Layers` icon, "No grouping" / "Group" as
  the first option) and lives in the URL (`?group=`). Not tabs.
- **The header row** (`renderHeader`): the group's name first (`font-medium`,
  foreground), then muted meta joined with `·` (type, owner, CVSS, counts).
  Summary counts go on the end (`renderActions`), compact: a status mix such
  as `3 open · 1 fixing · 0 applied · 2 resolved` with a dot coloured only when
  the number is above zero, and at most one mini bar (`% verified`). Hide the
  summary below `lg` before it wraps the name.
- **Group actions** (`renderActions`): `size="sm"` buttons at `h-7`, ghost for
  navigation (View), outline for a change (Mark fixed, Approve). Gate each on
  its permission **and** on the API being able to do it for that group type;
  hide it otherwise (no dead buttons). Two at most; more go in a `⋯` menu.
- **Selection** (`selectable`, with a `select` column): the header gets a
  checkbox that selects the group's rows on screen (indeterminate when some
  are). It feeds the same `BulkActionBar` as the flat list. Turn it on when
  the page has bulk actions.
- **Collapsible** (`collapsible`): a chevron before the name with
  `aria-expanded`. Collapse state is view state, not URL state.
- **Large or server-side groups:** paginate the **groups**, not the rows, and
  load a group's rows when it opens (`groups`, `expandedKeys`,
  `useLazyGroupRows`). Open the first few groups on arrival (Findings: 3),
  show the first 5 rows, then `Showing 5 of 22 · Show 20 more` in the group
  footer (`renderFooter`), up to the API's page cap, then `View all N in the
list`. Pagination says "groups" (`paginationNoun`, `pageSizeLabel`).
- **A dimension the list API cannot filter rows by** is a header-only group
  (no chevron, no requests), never an expandable group with the wrong rows.
  When the API might ignore a row filter, check the rows belong to the group
  and say "These findings open in the list" instead of showing others.
- **Small client lists** (a few hundred rows): group in the browser with
  `getKey` / `order`; the table pages through the rows group by group, so a
  group is not split across pages.
- **Semantics:** each group is its own `<tbody>` named by its header
  (`aria-labelledby`); the header content stays in view while a wide table
  scrolls sideways. Group headers are not sticky vertically (the table frame
  is the scroll container, see section 9).
- **Phone:** the same groups render as section headers between the row cards.

Do not: render groups as separate cards or separate tables, put a chart or a
progress card per group, colour a zero, repeat the group's own value in a
column of every row when it can be hidden, or fetch every group's rows on page
load.

## 4. Cards and sections

- shadcn `<Card>`. A section inside a card: `<CardHeader>` with `<CardTitle>`
  (sentence case) and optional `<CardDescription>`.
- No card inside a card. Group related numbers with a divider or a grid, not a
  nested card.
- Section headings outside cards: `text-base font-semibold`, sentence case.

## 5. Typography

- Sentence case everywhere. No UPPERCASE eyebrows or labels.
- `font-mono` only for identifiers and code: CVE / rule / plugin IDs, hashes,
  IPs, ports, file paths, URLs, API keys, code snippets. Never for numbers,
  labels, statuses or prose.
- Numbers that line up use `tabular-nums`.

## 6. Colour

- Theme tokens only (`bg-card`, `text-muted-foreground`, `border`,
  `text-destructive`, `bg-accent`, …). No palette literals (`text-amber-500`,
  `bg-blue-50`, `#ef4444`) for UI chrome — they break dark mode and the
  palette-drift gate rejects new ones.
- Status meaning has its own tokens, each with a dark-mode value:
  `success` (completed, passed), `warning` (pending, at risk, timed out),
  `info` (running, informational) and `destructive` (failed, errors). Use them
  as `text-success` or a tint such as `bg-warning/15 text-warning`.
- Errors that replace content use the shared `ErrorState` (a destructive
  `Alert` with Retry), never a hand-made red box.
- Severity: `SeverityBadge` / `src/lib/severity-colors.ts`. Criticality:
  `src/lib/criticality-colors.ts`. Charts: the chart colour sources.

## 7. States

- **Loading**: `<Skeleton>` shaped like the content it replaces. Spinners
  (`Loader2`) only inside buttons that are working.
- **Empty**: the shared `<EmptyState>` (icon, title, one-line description,
  optional action). No ad-hoc "No X found" text.
- **Error**: `<Alert variant="destructive">` with what failed and a retry.
- Gated / coming-soon pages use the existing shared components.

## 8. Overlays

- Create / edit forms: `<Dialog>` (up to `sm:max-w-lg`; `sm:max-w-2xl` for
  long forms). Large editors: a full page.
- A dialog laid out edge to edge (split panes, a tinted aside, a scrolling
  body with a sticky footer): `<DialogContent showCloseButton={false}
className="flex flex-col gap-0 p-0 sm:p-0 …">` with a `<DialogHeaderBar>`
  (title, description, close) first, then the body. Pass
  `onOpenAutoFocus={(e) => focusDialogBody(e, bodyRef.current)}` (body has
  `tabIndex={-1}`) so it opens on the first field, not on the close button. The close button stays on
  the dialog surface, never on a tinted region; a secondary panel is inset
  (margin + radius), not bled to the edge. Install sensor and Edit sensor are
  the reference. Ordinary dialogs keep the default corner close button.
- Quick detail views: `<Sheet side="right">`.
- Destructive confirmation: `<ConfirmDialog destructive>`.

## 9. Responsiveness

- Must work from 1000px wide with the sidebar expanded: nothing clipped, no
  page-level horizontal scroll (a wide table scrolls inside its own frame).
- Grids collapse: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` style, never a
  fixed column count without breakpoints.
