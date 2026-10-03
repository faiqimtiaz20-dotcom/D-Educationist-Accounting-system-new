# FSD Addendum — Multi-tenant & CRM Admin

**Document ID:** FSD-DE-ACC-2026-MT  
**Parent FSD:** [FSD-DE-ACC-2026.md](./FSD-DE-ACC-2026.md)  
**Milestones:** [MULTI-TENANT-MILESTONES.md](./MULTI-TENANT-MILESTONES.md)  
**Version:** 0.1  
**Date:** 1 October 2026  
**Status:** **MT0 frozen** — functional rules for multi-tenant work. **MT1 schema/backfill delivered**; API/UI still behave as single-tenant until MT2+.

| Role | Name | Date |
|------|------|------|
| Prepared by | Delivery (engineering) | 1 Oct 2026 |
| Reviewed by | _________________ | |
| Approved by (Client) | _________________ | |

Where this addendum conflicts with the parent FSD on tenancy, **this addendum prevails for multi-tenant behaviour** after MT1+ is delivered. Until then, the live system remains single-tenant as described in the parent FSD.

---

## 1. Purpose

Define multi-tenant behaviour and the **CRM Admin** platform role so Tenant A’s data never appears to Tenant B, while preserving existing **branch isolation inside a tenant**.

---

## 2. Definitions

| Term | Meaning |
|------|---------|
| **Tenant** | One consultancy / company (D1). Examples: “D’ Educationist”, “Agency X” |
| **Branch** | Operating unit **inside** a tenant (KHI, LHR, …). Same rules as parent FSD branch isolation |
| **Platform** | Cross-tenant control plane used only by CRM Admin |
| **CRM Admin** | Platform operator: tenants and lifecycle only — **not** day-to-day accounting |
| **Tenant Admin** | Replaces today’s Super Admin: all branches **within one tenant** |

---

## 3. Frozen product decisions (D1–D7)

| ID | Decision | Value |
|----|----------|-------|
| D1 | Tenant | One company |
| D2 | Universities | Per tenant |
| D3 | Impersonation | Not in v1 |
| D4 | Login | Global unique email → infer tenant |
| D5 | Data store | Shared DB + `tenantId` |
| D6 | Super Admin | → `TENANT_ADMIN`; new `CRM_ADMIN` |
| D7 | Billing | Status metadata only; no payment gateway |

---

## 4. Roles (target)

| Role code | Scope | Intent |
|-----------|--------|--------|
| `CRM_ADMIN` | Platform (`tenantId` null) | Create/suspend tenants; first Tenant Admin; view tenant metadata. **No** students, invoices, GL, payroll, tenant reports |
| `TENANT_ADMIN` | One tenant, all its branches | Former Super Admin behaviour **limited to own tenant** |
| `BRANCH_MANAGER` | One tenant + home branch | Unchanged intent |
| `ACCOUNTANT` | One tenant + home branch | Unchanged |
| `CASHIER` | One tenant + home branch | Unchanged |
| `COUNSELLOR` | One tenant + home branch + own students | Unchanged |
| `READ_ONLY` | One tenant + home branch | Unchanged |

Permission levels (`none` / `read` / `limited` / `full`) remain as in the parent FSD, applied **within tenant**.

---

## 5. Data ownership

| Data | Ownership |
|------|-----------|
| Students, invoices, remittances, sub-agent txns, expenses, petty cash, bank txns, journals, tax, payroll, documents, approvals, audit (business) | **Tenant** (+ branch rules) |
| Branches, users (tenant staff), role assignments | **Tenant** |
| Universities, sub-agent masters, vendors, bank accounts, expense/petty categories, FX, GL/COA, system settings (org name, WHT %, fiscal lock) | **Tenant** |
| Country code list (reference) | **Platform-shared** (allowed) |
| Tenant registry, plan/status flags | **Platform** (CRM) |
| CRM Admin user accounts | **Platform** (no tenant) |

**Inside one tenant:** universities and shared settings remain common across that tenant’s branches (parent FSD rule preserved).

**Across tenants:** no shared universities or transactional data by default (D2).

---

## 6. Functional rules

### 6.1 Isolation

1. Tenant A must never see Tenant B data in lists, search, direct ID, dashboards, reports, CSV, or downloads.  
2. Branch isolation (BR-ISO rules) continues **inside** each tenant.  
3. Forged `tenantId` or `branchId` in query/body must be rejected (403) or ignored per existing branch writable rules — never grant foreign access.  
4. Suspended tenant: **login rejected** (v1).

### 6.2 CRM Admin

1. May CRUD tenant records and lifecycle status.  
2. May provision initial Tenant Admin + template masters/settings/COA on create.  
3. Must not open or API-access tenant accounting modules in v1.  
4. No impersonation (D3).

### 6.3 Tenant Admin

1. Manages branches/users/settings **for own tenant only**.  
2. Sees all branches of own tenant (like today’s Super Admin).  
3. Cannot list or mutate other tenants.

### 6.4 Login (D4)

1. User email is **globally unique**.  
2. Successful login loads that user’s `tenantId` (or platform role).  
3. Subdomain routing is **out of v1**.

---

## 7. Acceptance themes (to be exercised in MT8)

| Theme | Example |
|-------|---------|
| TN-ISO | Tenant A user cannot list/get/export Tenant B records |
| CRM boundary | CRM Admin 403 on `/students`, `/journal-entries`, `/reports/*` |
| Tenant boundary | Tenant Admin A 403 on CRM `/tenants` write/list beyond policy |
| Branch still works | BR-ISO Pass inside Tenant A after tenancy ships |
| Shared masters | Uni created in A visible to A’s branches; invisible to B |

Detailed TN-ISO case IDs will be added under `docs/qa/` during MT8 — **not claimed executed yet**.

---

## 8. Exclusions (this addendum / v1)

- Payment gateway / invoicing for SaaS fees  
- DB-per-tenant  
- CRM impersonation  
- Domain/SSL/hosting procurement  
- Cross-tenant platform P&amp;L for CRM  
- Native mobile apps  

---

## 9. Implementation status

| Item | Status |
|------|--------|
| Spec (this addendum + milestones MT0) | **Done** |
| Schema / APIs / UI (MT1–MT9) | **MT1–MT4 Done**; CRM tenant APIs = **MT5**; CRM UI = **MT6** |
| Live product multi-tenant | **No** — still single-tenant |

---

*End of FSD multi-tenant addendum.*
