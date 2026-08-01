# Navigation coverage — what is built but not reachable

Measured 2026-08-01 against `develop`. Reproduce with the commands at the bottom.

**The sidebar exposes 64 of 171 static pages.** The other 107 are not all
orphans — most are legitimate tabs, sub-pages and detail views. This document
separates the three cases, because they need three different decisions.

The headline is not "107 orphans". It is that roughly **20 clusters of built,
data-wired functionality have no route into them**, and 11 of those pages sit
under a nav section that already exists.

---

## 1. Fine as they are — 26 pages

`/assets/*` — twelve-line wrappers around a shared `AssetPage` driven by a config
object:

```tsx
export default function HostsPage() {
  return <AssetPage key={remountKey} config={hostsConfig} />
}
```

Reached from an asset detail page via `router.push(`/assets/${listingSlug}`)`.
Working, deliberate, config-driven. **No action.**

`/components/*` — the parent `/components` page links to all five children.
**No action.**

---

## 2. Easy wins — 11 pages under a nav section that already exists

These clusters have a parent **in the sidebar** whose children nothing links to.
Adding sub-items is a config edit in `sidebar-data.ts`; the pages already work.

| Cluster | Pages | LOC | Data-wired |
|---|---|---|---|
| `/exposures/*` | code, credentials, misconfigurations, secrets, vulnerabilities | 1,752 | 5 of 5 |
| `/controls/*` | list, effectiveness, gaps | 1,200 | 3 of 3 |
| `/workflows/*` | active, automations, templates | 714 | 3 of 3 |

`/exposures`, `/controls` and `/workflows` are all already sidebar entries. Their
children are simply not listed under them.

**Decision needed:** are these the intended shape of those sections? If yes this
is one edit and 3,666 lines of finished work becomes reachable.

---

## 3. Needs a product call — the rest

Whole clusters with no nav presence at any level. Every one is data-wired, so
these are not abandoned prototypes; they were built and then never connected.

| Cluster | Pages | LOC | Notes |
|---|---|---|---|
| `/insights/*` | 9 | 2,715 | `/insights/executive` and `/insights/ctem-maturity` ARE in the sidebar; analytics + reports children are not |
| `/pentest/*` | 2 | 1,896 | |
| `/threats/*` | 3 | 1,414 | active, exploitability, feeds |
| `/scoring` | 1 | 1,212 | |
| `/collaboration/*` | 3 | 898 | assignments, comments, tickets |
| `/exceptions/*` | 3 | 810 | pending, accepted, false-positives |
| `/identity/*` | 3 | 809 | privileged, risks, shadow-it |
| `/simulation/*` | 3 | 803 | sidebar has `/attack-simulation`, a different route |
| `/response/*` | 3 | 724 | detection, playbooks, time |
| `/trending`, `/progress`, `/sla`, `/overview` | 4 | 1,994 | single pages |
| `/attack-path-visualization` | 1 | 301 | |

**Decision needed per cluster:** does this belong in the product? Wire it, or
delete it. Keeping a cluster unwired is the expensive option — it is maintained,
type-checked and reviewed, and nobody sees it.

### A signal worth weighing

The eight pages whose severity colours have drifted from
`src/lib/severity-colors.ts` (`low` rendered green instead of blue, `info` blue
instead of grey) are **all** in this section: `/attack-path-visualization`,
`/identity/*`, `/collaboration/*`, `/exceptions/pending`.

The drift and the unreachability are the same phenomenon. What nobody navigates
to, nobody notices. That is an argument for settling this list before spending
effort on consistency fixes inside it.

---

## Reproducing this

```bash
find src/app -name page.tsx | sed -E 's#^src/app/##; s#/page\.tsx$##; s#\([^)]*\)/##g; s#^#/#' \
  | sed 's#//*#/#g' | sort -u > /tmp/routes.txt          # 183 (12 dynamic)
grep -oE "url: '[^']+'" src/config/sidebar-data.ts | sed "s/url: '//; s/'//" | sort -u  # 65
```

A page counts as data-wired if it imports from `@/features/*/hooks|api`,
`@/hooks/use-*`, `@/lib/api/`, or calls `useSWR`.

**Do not try to find orphans by grepping for hrefs.** Navigation here goes through
config objects and template literals — `router.push(category.href)`,
`` router.push(`/assets/${slug}`) `` — so no static pass answers "is this
reachable". Four attempts produced four different wrong numbers before the method
above was adopted; sidebar membership is the only figure that is exact without
reading code.
