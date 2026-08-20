# Navigation coverage — what is built, what is scaffolding

Measured against `develop`. Commands to reproduce are at the bottom.

"Orphan routes" was the top item in several consecutive UI reviews. The finding
that makes it resolvable is not the count — it is that a page being outside the
sidebar does not make it broken, and a page importing a data hook does not make it
real. You have to look at what data source it actually renders.

**The sidebar exposes 74 URLs; there are 154 `page.tsx` files (144 under
`(dashboard)`).** Most pages outside the sidebar fall into three honest buckets:

| | Pages | What it is |
|---|---|---|
| `/assets/*` type wrappers | ~30 | Thin config-driven wrappers, reached from the `/assets` hub + `?type=`. Fine. |
| Own-domain sub-pages | many | Real features reached as tabs/cards from a parent that _is_ in the nav (e.g. `/findings/approvals`, `/components/*`, `/settings/integrations/*`). Fine. |
| `useDashboardStats` only | **3** | Genuine scaffolds — nothing of their own behind them. |

---

## The test that matters

**"Imports a data hook" is not the same as "shows its own data."** The usable test
is: does the page call a hook scoped to its own domain?

```
useControlTests(...) / useSuppressions(...) / useFindingTypeStats(id, ['secret'])  -> real
useDashboardStats()  and nothing else                                              -> scaffold
```

In a security product a chart labelled "Credential Exposures" that is really showing
tenant-wide totals is worse than an empty page: it will be read as fact. That is the
defect this test exists to prevent.

---

## Shipped, sidebar-linked, real

The pages older revisions flagged as scaffolds are now backed by domain hooks and
are live in the sidebar. Do not re-flag them:

| Page | Source |
|---|---|
| `/sla` | `useFindingsApi` |
| `/controls` | `useSWR` (compensating controls) |
| `/control-testing` | `useControlTests`, `useControlTestStats` |
| `/exceptions` | `useSuppressions` (+ approve/reject/delete) |
| `/workflows` | `useWorkflows`, `useWorkflowRuns` |
| `/attack-simulation` | `useSimulations`, `useRunSimulation` |
| `/exposures/{secrets,code,misconfigurations,vulnerabilities}` | `useFindingTypeStats(tenantId, [...])` |
| `/insights/{program-health,data-quality}` | delegate to `ProgramHealthView` / `DataQualityView` |
| `/insights/{executive,ctem-maturity}` | `useSWR` / `useCtemMaturity` |

## Genuine scaffolds — 3 pages

`useDashboardStats` is the _only_ (or dominant) data source, and none is in the
sidebar:

- `/progress` — `useDashboardStats` only.
- `/trending` — `useDashboardStats` (+ one generic `useSWR`).
- `/insights/analytics/mttr` — `useDashboardStats` + `useMTTRMetrics`.

These cannot be "connected" — the work left is the feature, not a nav entry. The
realistic options are delete, or replace with `ComingSoonPage` (which the sidebar
can badge as `Soon`).

The wide scaffold clusters older drafts listed (`/controls/*`, `/workflows/*`,
`/threats/*`, `/identity/*`, `/collaboration/*`, `/exceptions/*` children,
`/response/*`, `/overview`, `/scoring`, `/attack-path-visualization`) **no longer
exist** — those route folders were deleted, not wired.

### Wiring a scaffold is blocked by a test

`src/config/__tests__/sidebar-no-scaffolds.test.ts` walks every sidebar leaf to the
page file it resolves to and fails if that page's only data source is
`useDashboardStats`, or if it renders `ComingSoonPage` without a badge. Green today:
no sidebar entry points at a scaffold. It exists because the danger in a list like
this is not that it stays unresolved — it is someone resolving it the fast way.

---

## Reproducing this

```bash
# routes and nav URLs
find src/app -name page.tsx | sed -E 's#^src/app/##; s#/page\.tsx$##; s#\([^)]*\)/##g; s#^#/#' \
  | sed 's#//*#/#g' | sort -u                                    # routes (some dynamic)
grep -oE "url: '[^']+'" src/config/sidebar-data.ts | sed "s/url: '//; s/'//" | sort -u   # 74

# real vs scaffold, per page
grep -oE "\buse[A-Z][A-Za-z0-9]*[(<]" "$page" | sed 's/[(<]$//' | sort -u \
  | grep -vE "useState|useEffect|useMemo|useRouter|useCallback|useSearchParams|useRef|useParams|usePathname|useTenant|useDashboardStats|usePermissions|useHasPermission|useToast|useForm"
# imports useDashboardStats AND no domain hook => scaffold
# note the [(<] — useSWR<T>( is a real data source and a `\(`-only pattern misses it
```

**Do not try to find orphans by grepping for hrefs.** Navigation goes through config
objects and template literals — `router.push(category.href)`,
`` router.push(`/assets/${slug}`) `` — so no static pass answers "is this reachable".
Sidebar membership is the only figure exact without reading code.
