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
    toggles the side panel from `lg` up and opens the same panel in a left
    sheet below `lg`.
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
- Quick detail views: `<Sheet side="right">`.
- Destructive confirmation: `<ConfirmDialog destructive>`.

## 9. Responsiveness

- Must work from 1000px wide with the sidebar expanded: nothing clipped, no
  page-level horizontal scroll (a wide table scrolls inside its own frame).
- Grids collapse: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` style, never a
  fixed column count without breakpoints.
