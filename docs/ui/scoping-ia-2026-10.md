# Scoping IA: research and proposal

OpenCTEM web UI · 2026-10-02 · research and proposal. The navigation is unchanged; three bugs are fixed separately in ui#586.
Basis: ui `origin/develop` @ `2e155cbf`, api `origin/develop` @ `bf003bb9`. Live counts come from read-only SQL against the `org-tenant` database.

The owner asked about the sidebar's **Scoping** section: is it the best, most optimal shape? This document answers that and proposes a target. Nothing in it is implemented until the owner signs off on the decisions in section 8.

## TL;DR

- **No, the current shape is not the best.** Scoping has **11 items in a flat list**, more than the _whole_ left nav of Tenable Exposure Management (8) or Microsoft Exposure Management (about 5). Every page in it is real (no scaffolds), but the list mixes three kinds of thing:
  - **Scoping inputs** the program defines: cycles, crown jewels, business services and units, boundaries, attacker profiles.
  - **Discovery outputs**: Attack Surface, Relationship suggestions, and Asset Groups, which quick-scan fills automatically.
  - **Something that is not CTEM scoping at all**: Compliance.
- **The program anchor is missing.**
  - _CTEM Cycles_ is hidden for this owner because the tenant has an explicit `ctem_cycles = off` override. It was written on 2026-08-11 03:39:19 in a 48-row batch that matches the **ASM bundle**, and the ASM bundle leaves cycles out.
  - Even when visible, Cycles sits 7th of 11 and nothing links to it.
- **The business context cannot be connected to assets in the UI.**
  - No screen puts an asset into a Business Unit or a Business Service. `useAddAssetToUnit` has 0 callers, and `/business-services/{id}/assets` has no UI caller.
  - Live data shows the result: 0 of 69 assets are in a BU, and 4 asset links exist across 3 services.
  - So BU criticality raises nothing, and a cycle scoped to services snapshots only what the API was told directly.
- **Two parts of Scope Config are not wired to anything.**
  - The Schedules tab does nothing: no code calls `ListDueSchedules`, and "Run now" only writes `status = running`. Real scheduling lives on Scans.
  - Scope _targets_ are informational. Only _exclusions_ are enforced, at scan-target resolution.
- **Proposal:** shrink Scoping to **5 rows** in the order of ctem.org's scoping artifacts, and put a **Scoping overview** with a completeness checklist on top:

  ```
  Scoping
    Overview           (new hub: checklist + active cycle)
    Cycles             (program anchor: charter, scope snapshot, outcome)
    Business context   tabs: Crown jewels | Services | Units
    Boundaries         tabs: Targets | Exclusions        (was Scope Config; Schedules removed)
    Threat model       tabs: Threats | Attacker profiles
  ```

  - Attack Surface, Asset Groups and Relationship suggestions move to **Discovery**.
  - Compliance moves to **Insights**.
  - Every existing URL keeps working. Merges become in-page route tabs (the `sections` pattern Exposures and Remediation already use), so most moves need **no redirects**.

- **Bugs fixed now (ui#586):**
  - The charter "In-scope services" field was free text, but the API casts it to `uuid[]`, so a cycle activated with an **empty scope**.
  - Business Units and Crown Jewels checked `attack_surface:scope:*` while the API enforces `assets:*`.
  - Scope Config labelled inventory-wide charts as "scoped assets".

---

## 1. What CTEM scoping is

**ctem.org, Scoping stage** (<https://ctem.org/docs/stages/ctem-scoping>).

- **Purpose:** "define what your CTEM program will protect and how you'll measure success." Scope is "a business risk hypothesis… not a CMDB export." Start narrow and widen each cycle. A cycle should fit inside a quarter.
- **The stage produces five artifacts:**

| ctem.org artifact                          | What it holds                                                                                                                | OpenCTEM today                                                                                                   |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **CTEM Scope Charter**                     | objectives, in-scope services, success criteria, escalation, roles                                                           | `/cycles` charter sheet (`charter` JSONB on `ctem_cycles`)                                                       |
| **Critical Asset Register**                | crown jewels with business service, data class, CIA impact, technical and business owner, environment, reachability          | `/crown-jewels` + `/business-services` + `/business-units` + asset fields (CIA impact, `is_crown_jewel`, owners) |
| **Boundary & Threat Assumption Statement** | in scope / out of scope **with reasons**, attacker assumptions (external, credentialed, insider, supplier), test constraints | `/scope-config` (targets, exclusions), charter `exclusions[]` + `threat_scenarios[]`, `/attacker-profiles`       |
| Initial use cases                          | first problems to work                                                                                                       | charter objectives                                                                                               |
| Draft success metrics and SLAs             | measurable targets                                                                                                           | charter `success_criteria[]` (evaluated at cycle close into `charter_evaluation`), SLA policies                  |

- **Crown-jewel method:** work backward from business failure modes, to services, to dependencies, to owners.
- **Handoff to Discovery:** the register and the boundary statement.

**Gartner.** The Gartner pages returned 403, so this is second-hand (<https://www.vectra.ai/topics/ctem>, <https://www.armorcode.com/learning-center/the-ultimate-guide-to-continuous-threat-exposure-management-ctem>). Scoping fixes the _scope of discovery_ and the business-critical baseline. Discovery then finds assets and their risk inside that scope.

**What follows for the nav.**

- Scoping holds **things the program decides**: what matters, how far the boundary goes, what threats we assume, and the cycle that binds them.
- _What we found_ belongs to Discovery. Attack-surface stats, asset inventories, relationship graphs and change feeds are all Discovery.
- _How we report against a framework_ (compliance) is not a CTEM stage.

---

## 2. The 11 Scoping items, measured

How each column was measured:

- **Real?** applies the real-vs-scaffold test from `docs/nav-coverage.md`.
- **Inbound** counts links from anywhere except the sidebar, the route guard and tests (method in the appendix).
- **Live** counts are rows in `org-tenant`.

| #   | Item → route                                                              | LOC        | What it is                                                                                                                                                        | API                                                             | Gate (nav · API)                                                                                                    | Live data                                                                                                                                                  | Inbound links                                                                                   | Verdict                                                                                                                                                                                                                                                                                |
| --- | ------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Attack Surface → `/attack-surface` (+ `/external`, `/internal`, `/cloud`) | 324 + 2970 | Stats (total assets, exposed services, critical exposures, weekly delta), exposed services, recent changes. The sub-pages are filtered asset lists (`useAssets`). | `/attack-surface/stats`, `/assets`                              | `assets:read` · `attack_surface`                                                                                    | 69 assets                                                                                                                                                  | Assets category view. Only `/external` is linked; **`/internal` and `/cloud` are unreachable**. | Real. **Discovery output.** "Recent changes" duplicates Discovery › What changed.                                                                                                                                                                                                      |
| 2   | Asset Groups → `/asset-groups`                                            | 953 + 994  | Static groups with rollups; scan target and RBAC boundary                                                                                                         | `/asset-groups`                                                 | `assets:groups:read` · `assets`                                                                                     | 10 groups: **6 are `quick-scan-*`/`bulk-pf-*`/`edgetmp-*` machine groups**; 4 members in total; cached `asset_count` shows 0 where the group has 2 members | Assets view, group detail                                                                       | Real. **Organises inventory and scan targets**, so it is Discovery. Polluted by quick-scan (`api internal/app/scan/run.go:215` creates one group per run).                                                                                                                             |
| 3   | Scope Config → `/scope-config`                                            | **1913**   | Tabs: Overview, Targets, Exclusions, Schedules                                                                                                                    | `/scope/*`                                                      | `attack_surface:scope:read` · `scope_config`                                                                        | 5 targets, 3 exclusions, **0 schedules**                                                                                                                   | Assets view only                                                                                | Real, but **partly inert**. Exclusions are enforced (`scan.WithScopeExclusionFilter`). Targets are only used by `POST /scope/check`. **Schedules are inert**: no caller of `ListDueSchedules`, and Run now only records `running`. Live has 4 scheduled _scans_ and 0 scope schedules. |
| 4   | Business Services → `/business-services`                                  | 628        | Service register: criticality, PII/PHI/financial, availability, RTO/RPO, owner                                                                                    | `/business-services`                                            | `ctem:business_services:read` · `business_services`                                                                 | 3 services, 4 asset links                                                                                                                                  | **none**                                                                                        | Real. **No UI to link assets** (`/{id}/assets` exists, no caller).                                                                                                                                                                                                                     |
| 5   | Business Units → `/business-units`                                        | 963        | Org units: hierarchy, criticality, risk tolerance                                                                                                                 | `/business-units`                                               | nav `attack_surface:scope:read` · API `assets:read` (**mismatch**, fixed in #586) · `business_units`                | 4 BUs (one is `E2E Parent 1784581355767`, test data on live); **0 asset links**                                                                            | **none**                                                                                        | Real. **No UI to add assets** (`useAddAssetToUnit` has 0 callers). Asset groups still carry a separate free-text `business_unit`.                                                                                                                                                      |
| 6   | Crown Jewels → `/crown-jewels`                                            | 966        | Designate assets, risk thresholds, dependencies tab                                                                                                               | `/assets?is_crown_jewel=true`, `PATCH /assets/{id}/crown-jewel` | nav `scope:*` · API `assets:*` (**mismatch**, fixed in #586) · `crown_jewels` (the API is not gated by this module) | **9** of 69 assets                                                                                                                                         | Threat-model scope picker, dashboard attack-paths card, CTEM loop card                          | Real. The core of the Critical Asset Register.                                                                                                                                                                                                                                         |
| 7   | CTEM Cycles → `/cycles`                                                   | 603        | Cycle list, lifecycle transitions, charter sheet, outcome, scope-refinement notes                                                                                 | `/ctem-cycles/*`                                                | `ctem:cycles:read` · `ctem_cycles`                                                                                  | 1 cycle (`test`, planning, empty charter), 0 snapshots                                                                                                     | **none**                                                                                        | Real, and the program anchor. **Hidden for this tenant** (§3 F1). Several endpoints are half-wired: `POST /{id}/profiles` has no UI and no list or unlink endpoint (0 rows); `GET /{id}/scope` has no UI.                                                                              |
| 8   | Attacker Profiles → `/attacker-profiles`                                  | 446        | Threat-actor assumptions (external, stolen creds, insider, supply chain)                                                                                          | `/attacker-profiles`                                            | `ctem:attacker_profiles:read` · `attacker_profiles`                                                                 | 4 tenant + 4 system                                                                                                                                        | Threat-model refs                                                                               | Real. Feeds Threat Model. **Not attachable to a cycle in the UI**; the charter's "threat scenarios" are free text instead.                                                                                                                                                             |
| 9   | Threat Model → `/threat-model`                                            | 210        | Per-crown-jewel ATT&CK threats × attacker profiles, coverage matrix                                                                                               | `/threat-models`                                                | `assets:read` · `threat_model`                                                                                      | 3 models, 54 threats                                                                                                                                       | **none**                                                                                        | Real. Consumes crown jewels and attacker profiles.                                                                                                                                                                                                                                     |
| 10  | Relationships → `/relationships/suggestions`                              | 479        | Approve or dismiss detected asset-to-asset links                                                                                                                  | `/relationships/suggestions`                                    | `assets:read` · `relationships`                                                                                     | 5 pending, 1 approved; 31 relationships                                                                                                                    | breadcrumb only                                                                                 | Real. **Graph curation is Discovery**. The route already sits in the `(discovery)` route group.                                                                                                                                                                                        |
| 11  | Compliance → `/compliance`                                                | 692        | Framework control assessment                                                                                                                                      | `/compliance/*`                                                 | `compliance:frameworks:read` · `compliance` (off for this tenant)                                                   | 0 frameworks, 10 assessments                                                                                                                               | Insights › compliance report                                                                    | Real. **Governance or reporting, not scoping.**                                                                                                                                                                                                                                        |

Two related items outside Scoping:

- **Prioritization › Business Impact** (`/business-impact`, module off here) is a rollup of BUs and crown jewels.
- **The dashboard's CTEM loop card** links its "Scoping" tile to `/crown-jewels` and shows `crown_jewels_at_risk`. When that count is 0 the tile says "designate" (warn), even though 9 crown jewels are designated, because the count is _at risk_, not _designated_.

**Item counts in the main nav today:** Scoping 11, Discovery 7, Prioritization 8, Validation 6, Mobilization 5, Insights 5, plus 3 top items, for **45 leaves in all**.

---

## 3. Findings

**F1. CTEM Cycles is hidden by a leftover bundle override, and the ASM bundle excludes cycles by design.**

- `tenant_modules` for `org-tenant` holds 48 rows written at `2026-08-11 03:39:19.93–.94`. That is one batch, and it matches the ASM preset (`pkg/domain/module/presets.go` `presetASM`): `ctem_cycles`, `compliance`, `sla`, `iocs`, `ctem_maturity`, `business_impact`, `template_sources` and `branches` are all off.
- That timestamp is the 2026-08-11 bundle live-verification. Explicit override rows outlive a bundle (apply-once semantics), so the owner still sees an ASM tenant.
- Re-enabling is one toggle in Settings › Modules. The product question is bigger: **a CTEM program without cycles has no anchor**, so should any bundle that includes Scoping include `ctem_cycles`? (D2)

**F2. The business context is a set of islands.**

- 4 of 11 pages have **no inbound link** at all: Business Services, Business Units, Cycles and Threat Model.
- Worse, the links that would make them matter cannot be created in the UI:
  - asset ↔ BU: `POST /business-units/{id}/assets` (hook exists, 0 callers);
  - asset ↔ service: `POST /business-services/{id}/assets` (no hook);
  - cycle ↔ attacker profile: `POST /ctem-cycles/{id}/profiles` (no hook, no list or unlink).
- Meanwhile `EffectiveCriticality = MAX(asset, BU, service)` (api#454/#455) and the cycle's service-scoped snapshot both depend on exactly those links.
- This is the "silently inert" class: the configuration screens work, and nothing downstream sees what they configure.

**F3. Scope Config is two things, and one of them is inert.**

- Targets and exclusions are the ctem.org _boundary_. Schedules are scan scheduling, and they are never executed (see the table).
- The Overview tab charted the whole inventory as "scoped assets" (relabelled in #586).
- At 1913 lines it is the largest Scoping page.

**F4. The Boundary concept is split in three.**

1. `scope_exclusions` are enforced and have a reason field.
2. The charter's `exclusions[]` are documentary, with reasons.
3. The charter's `threat_scenarios[]` (free text) sit apart from `attacker_profiles` (structured, used by Threat Model).

ctem.org treats these as one _Boundary & Threat Assumption Statement_. The UI should at least cross-link them. A charter could reference the enforced exclusions and pick attacker profiles rather than retype them (D6).

**F5. Discovery outputs sit under Scoping.**

- Attack Surface's three KPIs and its feed come from the inventory, and its "recent changes" duplicates Discovery › What changed.
- The comment in `sidebar-data.ts` already argues that What changed belongs to Discovery "because it is the delta of the inventory". The same argument applies to Attack Surface.
- Relationship suggestions curate the asset graph, and their route is already in `(discovery)`.
- Asset groups are mostly scan-target containers today: 6 of 10 live groups were created by quick-scan.

**F6. Compliance is not a scoping concept** in ctem.org or in any vendor nav we could verify (section 4).

**F7. Labels are long and inconsistent.**

- "CTEM Cycles" repeats the product's own frame inside a section of the CTEM nav.
- "Scope Config" is an implementation word.
- "Relationships" does not say "suggestions to review".

**F8. Permission and module gating** (after #586).

- Nav, route guard and API now agree for every Scoping page.
- Two leftovers:
  - Threat Model reuses `assets:read/write`; a dedicated `threat_models` permission is a P2 item from the threat-model RFC.
  - The crown-jewel API is not module-gated: `PATCH /assets/{id}/crown-jewel` works with `crown_jewels` off. That is harmless, because the flag also lives on the asset.

---

## 4. How competitors organise the same concepts

The sources are vendor documentation where it was reachable. The **(inferred)** rows rest on vendor blogs or marketing pages because the docs were gated.

| Product                                    | Where critical assets and business context live                                                                                                                                                                                                                                                                                                                              | Rule-based or manual                                                                                                                                                                                                                              | Object that anchors scope                                                                                                                                        | Top-level nav size                                                                                                                                                                                                            |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Microsoft Security Exposure Management** | Settings › Microsoft XDR › Rules › **Critical asset management**; also "Classify critical asset" from the device page ([classify](https://learn.microsoft.com/en-us/security-exposure-management/classify-critical-assets))                                                                                                                                                  | **Rules** (predefined classifiers plus a custom query builder), with review of low-confidence matches; highest level wins ([critical-asset-management](https://learn.microsoft.com/en-us/security-exposure-management/critical-asset-management)) | **Initiative** with score and target ([exposure insights](https://learn.microsoft.com/en-us/security-exposure-management/exposure-insights-overview))            | about 5 (Overview, Attack surface, Exposure insights, Secure score, Data connectors)                                                                                                                                          |
| **Tenable Exposure Management**            | No critical-asset page. Criticality = **ACR ≥ 7**, Domain Admin, or cloud "sensitive" ([attack path](https://docs.tenable.com/exposure-management/Content/attack-path/attack-path.htm)); business context through **Tags**, static or dynamic ([tags](https://docs.tenable.com/exposure-management/Content/tagging/tag-format-application.htm))                              | Automatic, with manual ACR overrides ([ACR](https://docs.tenable.com/vulnerability-management/Content/Lumin/LuminEditACR.htm))                                                                                                                    | **Custom Exposure Card** = name + tags + targets and SLA ([cards](https://docs.tenable.com/exposure-management/Content/exposure-view/manage-exposure-cards.htm)) | **8**: Exposure View, Exposure Signals, Inventory, Attack Path, Tags, Analytics, Connectors, Agent Center; Settings top-right ([navigate](https://docs.tenable.com/exposure-management/Content/getting-started/navigate.htm)) |
| **XM Cyber**                               | Critical assets are chosen **per Attack Scenario** via critical-asset rules ([blog](https://xmcyber.com/blog/the-odds-say-your-company-will-be-a-ransomware-victim-this-year-heres-how-xm-cyber-helps-flip-the-odds-in-your-favor/))                                                                                                                                         | Rules                                                                                                                                                                                                                                             | **Scenario**: entities in scope, breach points, critical assets, excluded techniques                                                                             | not verified                                                                                                                                                                                                                  |
| **Wiz**                                    | **Projects** "sit above services… define boundaries… like by business unit" ([blog](https://www.wiz.io/blog/wiz-spotify-backstage)); crown jewels feed risk                                                                                                                                                                                                                  | Rules on accounts and tags (inferred)                                                                                                                                                                                                             | **Project**                                                                                                                                                      | not verified                                                                                                                                                                                                                  |
| **Brinqa**                                 | Administration › Configuration › **Risk factors** (PCI, PII, external-facing…) ([docs](https://docs.brinqa.com/docs/risk-factors)); no crown-jewel object                                                                                                                                                                                                                    | Rules                                                                                                                                                                                                                                             | Remediation campaigns only                                                                                                                                       | about 10 ([UI](https://docs.brinqa.com/docs/ui))                                                                                                                                                                              |
| **Rapid7 InsightVM / Exposure Command**    | **Criticality tag** → risk multiplier, set in Administration ([criticality](https://docs.rapid7.com/insightvm/adjusting-risk-with-criticality/)); asset groups static or dynamic ([groups](https://docs.rapid7.com/insightvm/working-with-asset-groups/)); tracks "% assets tagged by owner" ([EC](https://documentation.rapid7.com/exposure-command/assess-total-risk.htm)) | Tags and dynamic groups                                                                                                                                                                                                                           | Sites (inferred)                                                                                                                                                 | —                                                                                                                                                                                                                             |
| Cymulate, Picus, Qualys, Armis             | Asset value or importance feeds the score ([Cymulate](https://cymulate.com/exposure-analytics/), [Picus](https://www.picussecurity.com/platform/exposure-validation)); Qualys ACS via tags (inferred)                                                                                                                                                                        | —                                                                                                                                                                                                                                                 | Assessments, templates (inferred)                                                                                                                                | —                                                                                                                                                                                                                             |

**Patterns relevant to our nav:**

1. **Scope is a named object, not a configuration page.** Microsoft has the Initiative, XM Cyber the Scenario, Wiz the Project and Tenable the custom Exposure Card. Ours is the **Cycle**, and it is the item we hide or bury.
2. **Critical assets are usually rule-defined, then reviewed.** Microsoft, XM Cyber, Brinqa and Rapid7 all do this, and Tenable derives them automatically. Our crown jewels are a manual list. A manual list is fine for a first cycle (ctem.org starts narrow), but rules are where the market is (D8, later).
3. **Business units are a dimension** (tag, project or filter), not a workflow page: Tenable, Rapid7 and Wiz all treat them this way.
4. **Business context only matters if it moves priority.** Rapid7 uses multipliers, Brinqa risk factors and Microsoft criticality levels. We already have the multiplier (`EffectiveCriticality`), but no UI feeds it (F2).
5. **Attack-surface maps, graphs and inventories sit under Inventory or Attack surface**, never under scoping.
6. **Navs are small.** Whole products have 5–10 top-level items, while our Scoping section alone has 11.

---

## 5. Proposal

### 5.1 Target tree

```
BEFORE (develop, 2e155cbf)                AFTER (proposed)

Scoping (11)                              Scoping (5)
  Attack Surface                            Overview              /scoping            NEW hub
  Asset Groups                              Cycles                /cycles             (was "CTEM Cycles", now first)
  Scope Config                              Business context      /crown-jewels       tabs: Crown jewels | Services | Units
  Business Services                                                                    (/crown-jewels, /business-services,
  Business Units                                                                        /business-units: unchanged URLs)
  Crown Jewels                              Boundaries            /scope-config       tabs: Targets | Exclusions
  CTEM Cycles      (hidden: module off)                                                (Overview + Schedules tabs removed)
  Attacker Profiles                         Threat model          /threat-model       tabs: Threats | Attacker profiles
  Threat Model                                                                         (/attacker-profiles: unchanged URL)
  Relationships
  Compliance       (hidden: module off)

Discovery (7)                             Discovery (8)
  Scans                                     Scans
  Sensors                                   Sensors
  Assets                                    Attack surface        /attack-surface     moved from Scoping
  What changed                              Assets                /assets             tabs: Inventory | Groups | What changed | Suggestions
  Exposures                                                                            (/asset-groups, /assets/changes,
  Credential leaks                                                                      /relationships/suggestions: unchanged URLs)
  Components                                Exposures
                                            Credential leaks
                                            Components

Insights (5)                              Insights (6)
  ...                                       ...
  Reports                                   Reports
                                            Compliance            /compliance         moved from Scoping
```

**Net change:** Scoping + Discovery go from 18 rows to 13, and the main nav from 45 leaves to 41. Every leaf the user can reach today stays reachable, as a row or a tab. No URL changes in phases 1–3.

**Why each row is where it is:**

- **Overview** answers "is our scope ready for this cycle?" Without it, the section is a pile of registers with no sense of done (F2).
- **Cycles comes first** because every other Scoping object exists to fill a cycle: the charter's services, exclusions, threat scenarios and success criteria.
- **Business context** is the ctem.org _Critical Asset Register_: crown jewels, the services they serve, and the units that own them. One row with three route tabs reuses `sections`, so the URLs stay unchanged.
- **Boundaries** is the _Boundary statement_, cut down to what is enforced or meant to be enforced. Schedules go, because Scans already owns scheduling and the tab is inert.
- **Threat model** carries the attacker assumptions. Attacker profiles are what the model reasons over, so they belong next to it as a tab.
- **The Discovery moves** follow the existing `sidebar-data.ts` rule ("Discovery … is the delta of the inventory"). Assets gets section tabs like Exposures, so Discovery does not grow by three rows.

### 5.2 Scoping overview (the hub)

Route `/scoping`, permission `assets:read`, no module gate, same as Program Health. It reads existing endpoints. The numbers in the wireframe are illustrative; the live tenant today would show 9 crown jewels, 3 services, 0 of 69 assets mapped to a BU, 5 targets and 3 exclusions, 0 cycle profiles, and no active cycle.

```
+------------------------------------------------------------------------------------+
| Scoping                                                         [ Start a cycle ]  |
| What the program protects this cycle, and whether that is written down.            |
+------------------------------------------------------------------------------------+
| ACTIVE CYCLE  Q4 external surface   active · day 23 of 90 · 41 assets in scope     |
|   Charter: 3 objectives · 2 success criteria · 4 services · 2 exclusions  [Open]   |
+------------------------------------------------------------------------------------+
| Readiness                                                         6 of 9 ready     |
|  [x] Cycle active with a charter                           Q4 external   [Open]    |
|  [x] Crown jewels identified                               9 assets      [Review]  |
|  [ ] Crown jewels have an owner                            3 of 9        [Assign]  |
|  [x] Business services defined                             3 services    [Open]    |
|  [ ] Services linked to their assets                       2 of 3        [Link]    |
|  [ ] Assets mapped to a business unit                      0 of 69       [Map]     |
|  [x] Boundary set (targets + exclusions with reasons)      5 / 3         [Open]    |
|  [ ] Attacker profiles chosen for the cycle                0             [Choose]  |
|  [x] Threat model generated for each crown jewel           3 of 9        [Generate]|
+------------------------------------------------------------------------------------+
| Feeds Discovery: 41 assets snapshotted · 3 exclusions enforced on scans            |
+------------------------------------------------------------------------------------+
```

Data source for each row. "All existing" means no new API is needed unless noted.

| Row                             | Source                                                                            |
| ------------------------------- | --------------------------------------------------------------------------------- |
| Active cycle and charter        | `GET /ctem-cycles?status=active`, `charter`                                       |
| Crown jewels identified         | `GET /assets?is_crown_jewel=true` (`total`)                                       |
| Crown jewels have an owner      | same list, `owner_id` / asset owners                                              |
| Services defined and linked     | `GET /business-services` + `GET /business-services/{id}/assets` (N calls; see D9) |
| Assets mapped to a BU           | BU `asset_count` rollup vs asset total                                            |
| Boundary                        | `GET /scope/stats`                                                                |
| Attacker profiles for the cycle | **needs API**: list endpoint for `ctem_cycle_attacker_profiles`                   |
| Threat models per crown jewel   | `GET /threat-models` (scope_ref ids) vs crown-jewel ids                           |
| Snapshot size                   | `GET /ctem-cycles/{id}/scope` (`total`)                                           |

Each row with an action deep-links to the page and tab that fixes it.

- The rows are **readiness**, not a score. That follows ctem.org's anti-pattern guidance against vanity metrics, and Program Health already owns outcome metrics.
- The dashboard's CTEM-loop "Scoping" tile should link here instead of `/crown-jewels`, and show readiness (`6/9`) instead of crown jewels at risk (that fixes the "designate" mislabel in §2).

### 5.3 What has to be built for the hub to be honest (F2)

The hub would show "0 of 69 mapped" with no way to fix it unless these ship with or before it:

- **Link assets** on Business Unit and Business Service rows: a dialog plus an asset picker. `features/controls/components/link-assets-dialog.tsx` does the same job for controls; extract it to a shared component rather than copying it.
- **Bulk "Set business unit / Add to service"** in the Assets list selection bar, so the work can be done where the assets are.
- **Cycle detail page** (`/cycles/[id]`) with tabs **Charter | Scope** (the snapshot from `GET /{id}/scope`) **| Attacker profiles** (link via `POST /{id}/profiles`; needs list and unlink endpoints) **| Outcome**. This replaces the long row-action menu on `/cycles`.

---

## 6. Changes, one by one

| #   | Change                                                                                                                                                                                                                                                                                     | Why (evidence)                        | Effort                            | Risk and what it touches                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Re-enable `ctem_cycles` for org-tenant (ops, Settings › Modules)                                                                                                                                                                                                                           | F1                                    | XS                                | None. Owner-only toggle.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| C2  | Add `ctem_cycles` to every bundle that includes scoping modules. Today only `offensive` and `ctem_full` have it; `asset_inventory`, `vm_essentials`, `asm`, `aspm`, `sbom_supply_chain`, `cspm` and `compliance` all enable crown jewels, scope config and threat model **without** cycles | F1: a scoping section with no cycle   | XS (api)                          | `TestPresetsSatisfyHardDeps`. Bundle subscribers gain one page.                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| C3  | Reorder Scoping: Cycles first; rename "CTEM Cycles" → "Cycles"                                                                                                                                                                                                                             | §5.1                                  | XS                                | `sidebar-data.ts`; ⌘K search is built from the nav, so its label changes too.                                                                                                                                                                                                                                                                                                                                                                                                                               |
| C4  | **Business context** row with route tabs Crown jewels / Services / Units                                                                                                                                                                                                                   | 3 islands, one register (F2)          | S–M                               | New `BUSINESS_CONTEXT_SECTION_TABS` in `section-tabs.ts`. The sidebar already marks a row active on any of its `sections` hrefs (`nav-active.ts`), so different URL prefixes work. **But `SectionTab` has no `module` or `permission` field today** (Exposures and Remediation tabs share one module), so this needs a small extension: per-tab `module`/`permission`, filtered by the tenant's modules, and the row visible if any tab is. `sidebar-route-consistency.test.ts` must learn the any-of rule. |
| C5  | **Threat model** row with tabs Threats / Attacker profiles                                                                                                                                                                                                                                 | F4                                    | S                                 | Same per-tab module extension as C4. Modules `threat_model` / `attacker_profiles`.                                                                                                                                                                                                                                                                                                                                                                                                                          |
| C6  | **Boundaries**: rename Scope Config, drop the Overview tab (mislabelled charts) and the **Schedules** tab (inert)                                                                                                                                                                          | F3                                    | S                                 | The `scope_schedules` API stays. Removing the tab must not drop data (0 live rows). A `?tab=schedules` link lands on Targets. Coverage KPIs move into the Scoping overview.                                                                                                                                                                                                                                                                                                                                 |
| C7  | Move **Attack Surface** to Discovery (same URL); link or remove the orphan `/internal` and `/cloud`                                                                                                                                                                                        | F5                                    | XS / S                            | Nav only. `route-permissions.ts` comment block. The orphans need a decision: tabs, or delete in favour of `/assets` filters (D5).                                                                                                                                                                                                                                                                                                                                                                           |
| C8  | **Assets** row gets section tabs Inventory / Groups / What changed / Suggestions; Asset Groups, What changed and Relationships stop being rows                                                                                                                                             | F5                                    | M                                 | The `ASSETS_SECTION_TABS` route tabs must be active on `/asset-groups/*` and `/relationships/*`. Badge for pending suggestions (`/relationships/suggestions/count`) moves to the tab. `sidebar-no-scaffolds`, `sidebar-route-consistency` and breadcrumbs (`breadcrumb-routes.ts` lists `/relationships`) need updating.                                                                                                                                                                                    |
| C9  | Move **Compliance** to Insights (same URL)                                                                                                                                                                                                                                                 | F6                                    | XS                                | Nav only.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| C10 | **Scoping overview** `/scoping`                                                                                                                                                                                                                                                            | §5.2                                  | M                                 | New page plus route-permissions entry. Is it the section's default landing? (D7).                                                                                                                                                                                                                                                                                                                                                                                                                           |
| C11 | **Link assets** to BU and service, plus the bulk action                                                                                                                                                                                                                                    | F2                                    | M                                 | Uses existing endpoints. The shared asset-picker extraction touches the controls page (tests mock `LinkAssetsDialog`).                                                                                                                                                                                                                                                                                                                                                                                      |
| C12 | **Cycle detail page** and attacker-profile linking                                                                                                                                                                                                                                         | F2, F4                                | M (+ S api: list/unlink profiles) | New route `/cycles/[id]`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| C13 | Quick-scan stops creating visible asset groups (or flags them `system`)                                                                                                                                                                                                                    | F5: 6 of 10 groups are machine groups | S (api) + XS (ui filter)          | Changes the quick-scan contract. Needs an api PR.                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| C14 | Retire the free-text `asset_groups.business_unit` → FK to `business_units`                                                                                                                                                                                                                 | Taxonomy memo (open decision), F2     | M (api migration)                 | Data migration. Out of scope for the IA, listed because the hub's BU row would otherwise ignore group-level BU.                                                                                                                                                                                                                                                                                                                                                                                             |

Already fixed in **ui#586**: the charter in-scope services picker, the BU and crown-jewel permission alignment, and the Scope Config labels.

**Follow-up for api:** the activation snapshot should skip non-UUID entries instead of failing the whole insert. Old charters can still hold names; today activation logs an error and freezes nothing.

---

## 7. Phased PR plan

Phases 1–3 change no URLs, so `legacy-routes.ts` is not touched. Each phase ships alone.

| Phase | PRs                                                          | Needs decisions | Contents                                                                                                                                                                                                                     |
| ----- | ------------------------------------------------------------ | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | ui#586 (open)                                                | none            | Bugs: charter picker, permissions, labels                                                                                                                                                                                    |
| 0     | ops                                                          | D2              | Re-enable cycles on org-tenant (C1)                                                                                                                                                                                          |
| 1     | ui: "Scoping nav"                                            | D1, D3, D4      | C3 + C4 + C5 + C6 + C7 + C9: one sidebar PR plus `section-tabs.ts`; tests `sidebar-route-consistency`, `sidebar-no-scaffolds`, a new `scoping-nav.test.ts` (row order, tab modules, every old URL resolves to an active row) |
| 2     | ui: "Assets tabs"                                            | D5              | C8                                                                                                                                                                                                                           |
| 3     | ui: "Link assets"; api + ui: "Cycle detail"                  | D6              | C11, C12 (api list/unlink cycle profiles first)                                                                                                                                                                              |
| 4     | ui: "Scoping overview" (+ optional api summary endpoint, D9) | D7, D9          | C10; dashboard CTEM-loop tile links to it                                                                                                                                                                                    |
| 5     | api: bundles, quick-scan groups, group BU FK                 | D2, D8          | C2, C13, C14                                                                                                                                                                                                                 |

Order rationale:

- Phase 1 alone delivers what the owner sees (11 rows → 5).
- Phase 3 must land before or with Phase 4, or the hub shows gaps nobody can close.

---

## 8. Owner decisions

| #       | Decision                                                                                                                                     | Options                                                                                                                                                    | Recommendation                                                                                                                                                                                                             |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **D1**  | Shape of Scoping                                                                                                                             | (a) keep 11 flat; (b) **5 rows: Overview, Cycles, Business context, Boundaries, Threat model**; (c) 3 rows (Cycles, Critical assets, Boundaries & threats) | **(b)**. It maps 1:1 to ctem.org's artifacts, the URLs are unchanged, and each row is a real register. (c) hides too much behind tabs.                                                                                     |
| **D2**  | Is `ctem_cycles` part of every bundle that has Scoping? And re-enable it on org-tenant now?                                                  | yes / no                                                                                                                                                   | **Yes, and yes.** A CTEM product whose scoping has no cycle gives up the scope object every competitor anchors on (Initiative, Scenario, Project, Exposure Card).                                                          |
| **D3**  | Labels                                                                                                                                       | "Cycles" vs "CTEM cycles" vs "Programs"; "Business context" vs "Critical assets"; "Boundaries" vs "Scope" vs "Targets & exclusions"                        | **Cycles · Business context · Boundaries · Threat model.** Plain words. "Critical assets" is a good alternative to "Business context" if the owner wants the ctem.org/Microsoft term.                                      |
| **D4**  | Move Attack Surface, Asset Groups and Relationship suggestions to Discovery; Compliance to Insights                                          | yes / partial / no                                                                                                                                         | **Yes.** They are inventory outputs or reporting. The URLs are unchanged, so the move is reversible.                                                                                                                       |
| **D5**  | Attack Surface `/internal` and `/cloud` (real, unreachable): make them tabs of Attack surface, or delete them in favour of `/assets` filters | tabs / delete                                                                                                                                              | **Delete** and 308 each to the closest `/assets` filter (which filters exist for internal and cloud is not yet checked). They duplicate the inventory in about 2000 lines of page code. Keep `/external`, which is linked. |
| **D6**  | Charter boundary: should the charter _reference_ enforced exclusions and attacker profiles (pickers) instead of free text?                   | reference / keep free text                                                                                                                                 | **Reference**, as ui#586 already does for services. Free text that looks like configuration but is not enforced is the same trap.                                                                                          |
| **D7**  | Should the Scoping section header (and the dashboard loop tile) open the new Overview?                                                       | yes / no                                                                                                                                                   | **Yes.** It is the "is scope ready?" answer the owner was looking for.                                                                                                                                                     |
| **D8**  | Critical assets by **rules** (later)                                                                                                         | manual only / rules + review queue                                                                                                                         | Keep manual for now. Put rules on the roadmap after C11, the pattern all four verified vendors use.                                                                                                                        |
| **D9**  | Hub data: aggregate in the browser (≈ 6 + N calls) or add `GET /api/v1/scoping/summary`                                                      | client / api                                                                                                                                               | **API endpoint.** N service-asset calls do not scale, and a summary endpoint also serves the dashboard tile and MCP.                                                                                                       |
| **D10** | Remove the inert **Schedules** tab from Boundaries (API kept), or wire it to the scan scheduler                                              | remove / wire                                                                                                                                              | **Remove.** Scans already schedule (4 live scheduled scans vs 0 scope schedules). Two schedulers would be a second source of truth.                                                                                        |

---

## Appendix: method

**Nav and modules**

- `git show origin/develop:src/config/sidebar-data.ts`; the route guard is `src/config/route-permissions.ts`.
- API gates were read from `api/internal/infra/http/routes/{assets,ctem,business_unit}.go` and `routes.go` (`RequireModule`).

**Real or scaffold.** Hooks per page, with the pattern from `docs/nav-coverage.md`:
`grep -oE "\buse[A-Z][A-Za-z0-9]*[(<]" page.tsx | sort -u`. No Scoping page is a scaffold. Scope Config uses `useDashboardStats` only for the two mislabelled charts.

**Inbound links**
`grep -rlE "['\"\`]/<route>([/?'\"\`]|$)" src --include='_.ts_'`, excluding the sidebar, route-permissions, legacy routes and tests.

**Live counts** (read-only, `docker exec openctemio-postgres-1 psql -U openctem -tAc`):

- `select count(*) from <table> group by tenant_id` for each Scoping table;
- `assets` (`is_crown_jewel`, `owner_id`);
- `asset_group_members` vs `asset_groups.asset_count`;
- `tenant_modules` for org-tenant, ordered by `updated_at`.

**Inert paths**

- `git grep ListDueSchedules` returns only its definition.
- `git grep` shows that `scope_targets` is consumed only by `CheckScope`, and that `scope_exclusions` is consumed by `scan.WithScopeExclusionFilter`.

**Charter snapshot failure.** The query below returns `invalid input syntax for type uuid`:

```sql
select 1 from business_service_assets where service_id = ANY('{Checkout API}'::uuid[])
```

**Competitor sources** are linked inline in section 4. XM Cyber and Wiz rest on vendor blogs (product docs gated). Cymulate, Picus, Qualys and Armis are partly inferred. Gartner is cited second-hand (gartner.com returned 403).
