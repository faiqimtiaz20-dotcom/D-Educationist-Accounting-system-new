# Multi-tenant + CRM Admin — Milestones

**Document purpose:** Convert the current **single-tenant, multi-branch** product into a **multi-tenant** SaaS-style system with a platform **CRM Admin**, without skipping modules and without false “Done” claims.

**Related:** [FSD-DE-ACC-2026.md](./FSD-DE-ACC-2026.md) · [FSD-MULTI-TENANT-ADDENDUM.md](./FSD-MULTI-TENANT-ADDENDUM.md) · [BACKEND-MILESTONES.md](./BACKEND-MILESTONES.md) (M1–M15 single-tenant delivery)

**Proposal reference:** DE-ACC-2026-182 (base product); multi-tenant is a **follow-on / CR** unless already commercially agreed.

**Last updated:** 1 October 2026

**Status legend**

| Status | Meaning |
|--------|---------|
| **Planned** | In scope; not built |
| **In progress** | Work started; exit criteria not met |
| **Done** | Exit criteria verified with evidence |
| **Blocked** | Waiting on decision / prior MT / client |

---

## 0. Honest current state (do not claim multi-tenant yet)

| Area | Reality |
|------|---------|
| Product today | **Single tenant**, multi-branch (KHI/LHR/…) |
| Branch isolation | Implemented + BR-ISO QA (within one org) |
| `Tenant` model / `tenantId` columns | **MT1 Done** |
| `CRM_ADMIN` role / CRM console | **MT2–MT6 Done** (role, APIs, SPA `/crm/tenants`) |
| Cross-tenant isolation | **MT3 + MT8 Done** (Prisma extension + TN-ISO-001…015 Pass) |
| M1–M14 | Engineering **Done** (single-tenant) |
| M15 | Eng pack Ready; client UAT/prod host **not** claimed Done |

**Claim allowed today:** MT0–**MT9 Done** (engineering handover). Client UAT sign-off and production host are **not** claimed.

---

## 1. Frozen decisions (MT0) — D1–D7

Recorded **1 October 2026**. Change only via written CR + update this table and the FSD addendum.

| ID | Decision | Frozen value |
|----|----------|--------------|
| **D1** | What is a tenant? | One consultancy / company (e.g. “D’ Educationist”) |
| **D2** | Universities | **Per tenant** (not shared across tenants). Template/clone on tenant create allowed |
| **D3** | CRM Admin impersonation | **Not in v1** (no login-as-tenant-user) |
| **D4** | Login / tenant resolution | **Email unique globally** → tenant inferred from user. Optional tenant code on login as fallback later; **no subdomain requirement in v1** |
| **D5** | Database strategy | **Shared PostgreSQL + `tenantId`** on business rows (not DB-per-tenant) |
| **D6** | Today’s Super Admin | Becomes **`TENANT_ADMIN`**: all branches **inside one tenant only**. Platform role **`CRM_ADMIN`** is separate |
| **D7** | Billing / plans in v1 | **Status + soft metadata only** (Active / Suspended / Trial). No payment gateway |

Full behavioural rules: [FSD-MULTI-TENANT-ADDENDUM.md](./FSD-MULTI-TENANT-ADDENDUM.md).

---

## 2. Milestone map

| MT | Name | Depends on | Status |
|----|------|------------|--------|
| **MT0** | Spec freeze & tenancy rules | — | **Done** (1 Oct 2026) — decisions + addendum |
| **MT1** | Schema: `Tenant` + `tenantId` backfill | MT0 | **Done** (1 Oct 2026) — inventory + smoke |
| **MT2** | Auth, JWT, roles, tenant scope | MT1 | **Done** (1 Oct 2026) — verify-mt2 + BR-ISO |
| **MT3** | Tenant-scope every domain API | MT2 | **Done** (1 Oct 2026) — Prisma tenant extension + verify-mt3 |
| **MT4** | Masters & settings per tenant | MT3 | **Done** (1 Oct 2026) — template + verify-mt4 |
| **MT5** | CRM Admin APIs (tenant lifecycle) | MT2, MT4 | **Done** (1 Oct 2026) — verify-mt5 |
| **MT6** | CRM Admin UI + login UX | MT5 | **Done** (1 Oct 2026) — verify-mt6 + SPA build |
| **MT7** | Frontend cutover (tenant context) | MT3, MT6 | **Done** (1 Oct 2026) — verify-mt7 + SPA build |
| **MT8** | TN-ISO QA + hardening + uploads | MT7 | **Done** (1 Oct 2026) — TN-ISO 15/15 + BR-ISO 20/20 |
| **MT9** | Migration runbook, dual-tenant proof, docs/UAT | MT8 | **Done** (1 Oct 2026) — runbook + verify-mt9; UAT unsigned |

```
MT0 → MT1 → MT2 → MT3 → MT4 → MT5 → MT6 → MT7 → MT8 → MT9
                    ↘________↗ (MT5 needs MT4 seed template)
```

---

## 3. Milestone detail

### MT0 — Spec freeze & tenancy rules

**Status:** **Done** (1 Oct 2026)

**Goal:** Written contract so engineering cannot invent behaviour.

**Delivered**
- [x] D1–D7 frozen (section 1 above)
- [x] [FSD-MULTI-TENANT-ADDENDUM.md](./FSD-MULTI-TENANT-ADDENDUM.md)
- [x] This milestones document
- [x] Explicit non-goals for v1 (addendum § exclusions)

**Not included:** Schema, APIs, UI.

---

### MT1 — Schema: `Tenant` + `tenantId` backfill

**Status:** **Done** (1 Oct 2026)

**Goal:** Database can represent multiple companies; existing data remains one tenant; app behaviour still single-tenant until MT2/MT3.

**Delivered**
- [x] Prisma `Tenant` (`id`, `code`, `name`, `status`, timestamps) + `TenantStatus`
- [x] `tenantId` on business tables (users / audit_logs nullable for future CRM; others NOT NULL + default)
- [x] Tenant-safe uniques (e.g. `(tenantId, code)` on branches; global unique email per D4)
- [x] Migration `20261001120000_mt1_tenant` + backfill tenant `DED` (`a0000000-0000-4000-8000-000000000001`)
- [x] Inventory: [MT1-TENANT-INVENTORY.md](./MT1-TENANT-INVENTORY.md)
- [x] Parity: Prisma `@default` + SQL `DEFAULT`; seed + composite unique lookups use `DEFAULT_TENANT_ID`

**Exit criteria**
- [x] Migration applies on current DB
- [x] Every business row has correct `tenantId` (platform users excepted — none yet)
- [x] App boots; existing single-tenant flows still work (parity smoke)
- [x] No claim of cross-tenant isolation yet

**Evidence**
- Migration: `backend/prisma/migrations/20261001120000_mt1_tenant/` (`prisma migrate status` → up to date)
- DB: 31 tables have `tenant_id` (+ defaults); `users`/`audit_logs` nullable as designed
- Full backfill audit (`node backend/scripts/mt1-audit.js`, 1 Oct 2026): **allBackfillOk=true** on every business table (0 wrong/null where NOT NULL expected)
- Smoke (1 Oct 2026): login `admin@saa.com` OK; branches=16; students list OK; settings OK; gl-accounts=27
- Typecheck: `tsc --noEmit -p tsconfig.build.json` OK after parity wiring

---

### MT2 — Auth, JWT, roles, tenant scope primitives

**Status:** **Done** (1 Oct 2026)

**Goal:** Identity knows tenant vs platform.

**Delivered**
- [x] Roles: `CRM_ADMIN` (platform); `TENANT_ADMIN` (maps former `SUPER_ADMIN`; legacy code still accepted as alias)
- [x] JWT / `AuthUserPayload`: `tenantId`, `roleCode`, `branchId` (+ `isCrmAdmin`)
- [x] `resolveTenantScope` + `TenantScopeInterceptor` — forged `tenantId` → 403
- [x] `CrmBoundaryGuard` — CRM Admin **403** on tenant business modules (incl. routes without `@RequirePermission`)
- [x] Branches/users lists filtered by actor `tenantId`
- [x] Login: global email → tenant from user; suspended tenant login rejected
- [x] Seed: `crm@platform.local`, DED `admin@saa.com` as TENANT_ADMIN, DEMO tenant + `admin@demo.local`

**Exit criteria**
- [x] CRM Admin cannot call `/students` (403) — also `/gl-accounts` 403
- [x] Tenant Admin cannot see another tenant’s branches/users
- [x] Forged `tenantId` rejected
- [x] BR-ISO still Pass **inside** the default tenant — re-run **20 Pass / 0 Fail** (1 Oct 2026)

**Evidence**
- Script: `node backend/scripts/verify-mt2.js` → `ok: true`
- BR-ISO: `node backend/scripts/qa-run-branch-isolation.js` → 20 Pass
- Migration: `20261001140000_mt2_crm_nullable_branch` (nullable `users.branch_id` for CRM)

**Honest limit:** Domain list/get APIs beyond branches/users are **not** fully tenant-filtered yet — that is **MT3**. Multi-tenant product Done is still **not** claimed.

---

### MT3 — Tenant-scope every domain API

**Status:** **Done** (1 Oct 2026)

**Goal:** No list/get/report/export/search returns another tenant’s rows.

**Delivered**
- [x] `TenantContext` + Prisma `$extends` auto-scopes all tenanted models (see inventory)
- [x] DEMO tenant sample: university + `DEMO-STU-001`
- [x] Inventory: [MT3-TENANT-API-INVENTORY.md](./MT3-TENANT-API-INVENTORY.md)

**Exit criteria**
- [x] Second tenant with sample data exists
- [x] Tenant A token never returns Tenant B IDs on list + get-by-id + ≥1 report CSV
- [x] Module inventory: every family marked scoped with evidence
- [x] Reports included (not students-only)

**Evidence**
- `node backend/scripts/verify-mt3.js` → `ok: true` (students, universities, invoices, branch-income CSV, GL)
- Mechanism: `backend/src/prisma/tenant-prisma.ts`

**Honest limit:** New-tenant COA/settings **template clone** is **MT4**. Product multi-tenant Done still requires MT8.

---

### MT4 — Masters & settings per tenant

**Status:** **Done** (1 Oct 2026)

**Goal:** Shared-within-tenant; isolated-across-tenants (per D2).

**Delivered**
- [x] Universities / sub-agents / vendors / banks / categories / FX / GL / settings are tenant-owned (reads via MT3; writes use `currentTenantId()`)
- [x] `provisionTenantTemplate` — clone default COA / categories / FX / settings (no transactional copy)
- [x] DEMO provisioned with independent orgName / WHT / fiscal lock
- [x] Notes: [MT4-TENANT-MASTERS.md](./MT4-TENANT-MASTERS.md)

**Exit criteria**
- [x] Uni in A invisible to B
- [x] `orgName` / WHT / fiscal lock independent per tenant
- [x] New tenant seed usable without A’s transactional data (DEMO COA 22 accounts, distinct ids)

**Evidence:** `node backend/scripts/verify-mt4.js` → `ok: true`

**Honest limit:** CRM SPA is **MT6**; CRM create API is Done (MT5).

### MT5 — CRM Admin APIs (tenant lifecycle)

**Status:** **Done** (1 Oct 2026)

**Goal:** Platform operator manages tenants via API only.

**Delivered**
- [x] `GET/POST /crm/tenants`, `GET/PATCH/DELETE /crm/tenants/:id`, `POST …/suspend|activate|status`
- [x] `@PlatformRoute()` + `@RequireRoles(CRM_ADMIN)` — Tenant Admin → 403; CRM still blocked from ledger (`CrmBoundaryGuard`)
- [x] Create transaction: Tenant + HO branch + `TENANT_ADMIN` user + `provisionTenantTemplate` (settings/COA/categories/FX)
- [x] Soft status only (D7); create response documents `limitsEnforced: false` (no seat/plan caps in v1)
- [x] Platform audit (`module: CRM`, `tenantId: null`) on create/update/delete
- [x] `backend/scripts/verify-mt5.js` Pass

**Exit criteria**
- [x] CRM Admin creates Tenant B; its admin can log in
- [x] Suspended tenant: login rejected (per addendum)
- [x] Tenant Admin cannot call CRM tenant APIs
- [x] `verify-mt5.js` Pass

**Not included:** CRM SPA (MT6); payment gateway.

---

### MT6 — CRM Admin UI + login UX

**Status:** **Done** (1 Oct 2026)

**Goal:** Operate tenancy without Postman.

**Delivered**
- [x] `/crm/tenants` SPA route gated to `CRM_ADMIN` (`RouteGuard` + CRM-only sidebar)
- [x] Tenant list, create dialog (admin + HO + template via MT5 API), suspend/activate toggles
- [x] Login UX for D4 (email/password; tenant inferred; CRM demo account in API mode)
- [x] Shell: no CRM nav for tenant users; no accounting nav / command palette for CRM Admin
- [x] `backend/scripts/verify-mt6.js` Pass; production SPA build OK

**Exit criteria**
- [x] Create tenant from UI end-to-end (wizard → MT5 API; verified payload + login)
- [x] New Tenant Admin sees only own tenant data (API scope; no CRM routes)
- [x] CRM UI does not expose Master Sheet / GL / reports

**Not included:** TN-ISO suite (MT8).

---

### MT7 — Frontend cutover (tenant context)

**Status:** **Done** (1 Oct 2026)

**Goal:** SPA never assumes one global company.

**Delivered**
- [x] Auth/`/me` + login payload: `tenantId` / `tenantCode` / `tenantName` / `tenantStatus`
- [x] SPA `useTenantContext` + settings `orgName` hydrated per tenant; shell shows tenant brand
- [x] No client-side tenant switcher; `apiFetch` strips forged `?tenantId=` query
- [x] Settings/branches/users copy = this organisation / Tenant Admin (not platform Super Admin)
- [x] Invoice preview/email uses tenant `orgName`
- [x] Production build still requires `VITE_API_URL` (`ProductionApiGuard`)
- [x] `backend/scripts/verify-mt7.js` Pass; SPA production build OK

**Exit criteria**
- [x] Smoke: CRM path + tenant path on same build
- [x] Tenant A API-mode regression smoke Pass

**Not included:** TN-ISO suite / upload path isolation (MT8).

---

### MT8 — TN-ISO QA + hardening + uploads

**Status:** **Done** (1 Oct 2026)

**Goal:** Prove isolation honestly (same bar as BR-ISO).

**Delivered**
- [x] Suite **TN-ISO-001…015** — [test cases](./qa/test-cases/17-tenant-isolation.md) · runner `backend/scripts/qa-run-tenant-isolation.js`
- [x] Uploads under `uploads/{tenantId}/…` (`DocumentsService`); cross-tenant document GET denied
- [x] Re-run **BR-ISO-001…020** inside Tenant A — Pass
- [x] Evidence: [TENANT-ISOLATION-RESULTS.md](./qa/TENANT-ISOLATION-RESULTS.md) · [BRANCH-ISOLATION-RESULTS.md](./qa/BRANCH-ISOLATION-RESULTS.md)

**Exit criteria**
- [x] TN-ISO: 0 Fail (15 Pass)
- [x] BR-ISO: Pass on Tenant A (20 Pass)
- [x] Evidence under `docs/qa/`

---

### MT9 — Migration runbook, dual-tenant proof, docs/UAT

**Status:** **Done** (1 Oct 2026) — engineering handover only

**Goal:** Operable handover — not “code exists.”

**Delivered**
- [x] Runbook: [MULTI-TENANT-MIGRATION-RUNBOOK.md](./MULTI-TENANT-MIGRATION-RUNBOOK.md) (backup, migrate, verify, rollback)
- [x] Staging proof: [DUAL-TENANT-PROOF.md](./DUAL-TENANT-PROOF.md) + `backend/scripts/verify-mt9-migration.js` Pass
- [x] Updated [DEPLOYMENT.md](./DEPLOYMENT.md), [USER-GUIDE.md](./USER-GUIDE.md), [UAT-CHECKLIST.md](./UAT-CHECKLIST.md), [README.md](../README.md)
- [x] Training: [TRAINING-CRM-VS-TENANT-ADMIN.md](./TRAINING-CRM-VS-TENANT-ADMIN.md) + agenda update

**Exit criteria**
- [x] Dry-run migration verify on current migrated DB succeeds (`verify-mt9-migration.js`)
- [x] Dual-tenant proof documented
- [x] Client UAT sign-off **not** claimed (sign-off table left blank)

**Not claimed by engineering alone:** Production deploy on client hosting; client signature on UAT.

---

## 4. Exclusions (v1 multi-tenant)

Do **not** mark any MT Done by including these unless a separate CR says so:

- Domain, SSL, hosting fees
- Payment / billing gateway (Stripe, JazzCash, …)
- DB-per-tenant or schema-per-tenant
- Native mobile apps
- CRM Admin impersonation (D3)
- Cross-tenant consolidated platform P&amp;L for CRM
- Full multi-agency Excel migration

---

## 5. Risks (honest)

| Risk | Mitigation |
|------|------------|
| One table missing `tenantId` | MT1 inventory + MT3 module checklist |
| Reports/CSV forgotten | MT3 + MT8 mandatory CSV cases |
| Unique constraints (`KHI` per tenant) | MT1 tenant-scoped uniques |
| CRM Admin over-permissioned | MT2 deny business modules; MT8 cases |
| False “multi-tenant Done” | No MT Done without exit criteria + evidence |

---

## 6. Next action

1. **MT0–MT9 engineering Done** — do not re-open D1–D7 without CR.  
2. Before **client prod** cutover: restore a client dump to scratch and re-run the migration runbook §7.  
3. Execute [UAT-CHECKLIST.md](./UAT-CHECKLIST.md) with the client; obtain **written** sign-off.  
4. Do **not** claim production host or UAT Done until those happen.

---

*End of multi-tenant milestones document.*
