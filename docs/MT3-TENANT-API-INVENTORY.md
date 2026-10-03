# MT3 — Tenant-scoped API inventory

**Date:** 1 October 2026  
**Mechanism:** `TenantContext` (ALS) + Prisma client `$extends` query middleware (`backend/src/prisma/tenant-prisma.ts`)  
**Bound in:** `JwtStrategy.validate` + `TenantScopeInterceptor`

When a tenant user is authenticated, all Prisma ops on tenanted models automatically:

| Op family | Behaviour |
|-----------|-----------|
| `findMany` / `findFirst` / `count` / `aggregate` / `groupBy` / `updateMany` / `deleteMany` | `where` AND `tenantId` |
| `create` / `createMany` | inject `tenantId` if omitted |
| `findUnique` | return `null` if row `tenantId` ≠ context |
| `update` / `delete` by `id` | pre-check same tenant or 404 |
| `upsert` | inject `tenantId` on `create` |

Platform CRM (`tenantId` null): extension is a no-op (CRM already blocked from business routes by `CrmBoundaryGuard`).

## Families (MT3 checklist)

| Family | Surfaces | Scoped how | Evidence |
|--------|----------|------------|----------|
| Students | list/get/CRUD | Prisma extension | `verify-mt3` DED list excludes DEMO-STU-001; cross get → 404 |
| Revenue | invoices, other invoices, receivables | Prisma extension | DED invoices list ok; no DEMO tenantId |
| Sub-agents | commissions, payments, masters | Prisma extension | masters lists tenant-filtered |
| Cash | petty, expenses, bank, cheques, contra | Prisma extension | via tenanted models |
| GL | journals, COA, inquiry, posting FX | Prisma extension | DED gl=27, DEMO gl=0 (no shared ids) |
| Tax / payroll / ops | tax, employees, payroll, reimbursements, approvals, documents, audit | Prisma extension | tenanted models in set |
| Dashboard / reports | metrics + report JSON + **CSV** | Prisma extension on underlying queries | `branch-income` CSV has no DEMO markers |
| Settings | branches, users (MT2 explicit) + system settings / categories / FX | extension + MT2 filters | universities DED=24 / DEMO=1 |

## Platform-shared (not tenant-filtered)

`Role`, `AppModule`, `RoleModulePermission`, `Currency`, `PaymentMode`, `Country`, `SalaryTaxSlab`, `RefreshToken`, child line tables (inherit via parent).

## Exit criteria

- [x] Second tenant (DEMO) with sample university + student  
- [x] Tenant A token never returns Tenant B IDs on list + get-by-id + report CSV  
- [x] Module inventory (this file)  
- [x] Not only students — reports CSV included  

**Script:** `node backend/scripts/verify-mt3.js` → `ok: true`

**Honest limit:** MT4 still owns tenant-create **template** (clone COA into new tenants). DEMO has 0 GL accounts until that template exists — isolation still holds.
