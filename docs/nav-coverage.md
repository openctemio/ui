# Navigation coverage — what is built, what is scaffolding

Measured 2026-08-01 against `develop`. Commands to reproduce are at the bottom.

"Orphan routes" has been the top item in three consecutive UI reviews without the
list ever being resolved. This document is an attempt to make it resolvable, and
the finding that makes it resolvable is not the count — it is that **most of those
pages have nothing of their own to show.**

**The sidebar exposes 64 of 171 static pages.** Of the 107 outside it:

| | Pages | What it is |
|---|---|---|
| `/assets/*` wrappers | 26 | 12-line config-driven wrappers, reachable from asset detail. Fine. |
| Own domain data | **44** | Real features. Decide: wire, or accept as sub-page-only. |
| `useDashboardStats` only | **37** | **Scaffolds.** Cannot be wired — there is nothing behind them. |

---

## The test that matters

An earlier draft of this document called 11 pages "easy wins, all data-wired" and
recommended wiring them. That was wrong. **"Imports a data hook" is not the same
as "shows its own data."**

`/controls/list` is 515 lines, imports `useDashboardStats`, and renders a
controls-looking dashboard — from `stats.assets.byType`. There is no controls data
anywhere in it. `/exposures/credentials` shows *every* finding in the tenant under
the heading "Credential Exposures".

In a security product these are worse than an empty page. An empty page is honest;
a chart labelled "Credential Exposures" showing unrelated numbers will be read as
fact. **Wiring them would repeat exactly the defect ui#339 just fixed** — a nav
entry that looks shipped and is not.

The usable test: does the page call a hook scoped to its own domain?

```
useFindingTypeStats(tenantId, ['secret'])   -> real
useDashboardStats()  and nothing else       -> scaffold
```

---

## Ready to wire now — 4 pages

`/exposures` is already a sidebar entry. These four are sub-items under it and are
each scoped to their own finding type:

| Page | Source | LOC |
|---|---|---|
| `/exposures/secrets` | `useFindingTypeStats(tenantId, ['secret'])` | 332 |
| `/exposures/code` | `useFindingTypeStats(tenantId, ['sast'])` | 354 |
| `/exposures/misconfigurations` | `useFindingTypeStats(tenantId, ['iac'])` | 332 |
| `/exposures/vulnerabilities` | `useFindingTypeStats(tenantId, VULNERABILITY_SOURCES)` | 375 |

## Real, and worth a decision — the other 40

Largest first. Several of the `settings/*` ones are reached as tabs from a parent
already in the nav, so "not in the sidebar" does not mean unreachable for those.

| Page | LOC |
|---|---|
| `/pentest/findings/new` | 1,267 |
| `/scoring` (5 risk-scoring hooks) | 1,212 |
| `/attack-surface/{cloud,internal,external}` | 2,956 |
| `/components/ecosystems` | 880 |
| `/settings/integrations/security` | 826 |
| `/settings/access-control/permission-sets` | 723 |
| `/findings/approvals` | 668 |
| `/pentest/templates/new` | 629 |
| `/settings/integrations/notifications/{outbox,history}` | 1,173 |
| `/simulation/scenarios` (`useSimulations`) | — |

## Scaffolds — 37 pages

Whole clusters where **every** page is dashboard-stats-only: `/controls/*`,
`/workflows/*`, `/threats/*`, `/identity/*`, `/collaboration/*`, `/exceptions/*`,
`/response/*`, plus `/sla`, `/progress`, `/overview`, `/exposures/credentials`.

**Correction — this was 47 here, and 47 was too high.** 46 pages import
`useDashboardStats`; 9 of them call a domain hook as well and are real, including
the four `/exposures` children wired up in ui#342 and already listed above as
ready. The earlier figure counted every importer. The scaffold set is the 37 where
`useDashboardStats` is the *only* data source.

These cannot be "connected" — the work left is not a nav entry, it is the feature.
The realistic options are delete, or replace with `ComingSoonPage` (which the
sidebar can already badge as `Soon`, see ui#339).

### The third option — wiring them — is now blocked

`src/config/__tests__/sidebar-no-scaffolds.test.ts` walks every sidebar leaf to
the page file it resolves to and fails if that page's only data source is
`useDashboardStats`, or if it renders `ComingSoonPage` without a badge. Green
today: no sidebar entry points at a scaffold. It exists because the danger in a
list this long is not that it stays unresolved — it is someone resolving it the
fast way.

The test keys on the `useDashboardStats` import rather than "has no domain hook",
which is the check that produced the wrong 11-easy-wins list. The looser form is
unreliable: most real pages delegate to a feature section (`<AgentsSection/>`) or
call `useSWR<T>(` with a generic, and a first draft of the test flagged fifteen
working pages including `/agents`, `/reports` and `/secret-store`.

### Why they drifted

The eight pages whose severity colours diverge from `src/lib/severity-colors.ts`
(`low` green instead of blue, `info` blue instead of grey) are all in this group.
They were copied from a template and edited; nobody noticed because there was
never anything to look at. The colour drift is a symptom of the scaffolding, not a
separate problem — fixing it before deciding this list would be wasted work.

---

## Reproducing this

```bash
# routes and nav URLs
find src/app -name page.tsx | sed -E 's#^src/app/##; s#/page\.tsx$##; s#\([^)]*\)/##g; s#^#/#' \
  | sed 's#//*#/#g' | sort -u                                    # 183 (12 dynamic)
grep -oE "url: '[^']+'" src/config/sidebar-data.ts | sed "s/url: '//; s/'//" | sort -u   # 65

# real vs scaffold, per page
grep -oE "\buse[A-Z][A-Za-z0-9]*[(<]" "$page" | sed 's/[(<]$//' | sort -u \
  | grep -vE "useState|useEffect|useMemo|useRouter|useCallback|useSearchParams|useRef|useParams|usePathname|useTenant|useDashboardStats|usePermissions|useHasPermission|useToast|useForm"
# imports useDashboardStats AND no output => scaffold
# note the [(<] — useSWR<T>( is a real data source and a `\(`-only pattern misses it
```

**Do not try to find orphans by grepping for hrefs.** Navigation goes through
config objects and template literals — `router.push(category.href)`,
`` router.push(`/assets/${slug}`) `` — so no static pass answers "is this
reachable". Four attempts gave four different wrong numbers. Sidebar membership is
the only figure exact without reading code.
