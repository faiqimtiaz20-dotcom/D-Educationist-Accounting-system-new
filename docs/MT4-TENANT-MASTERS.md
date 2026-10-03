# MT4 — Masters & settings per tenant

**Date:** 1 October 2026  
**Status:** Done (exit criteria verified)

## What is tenant-owned

| Asset | Ownership |
|-------|-----------|
| Universities, sub-agents, vendors, bank accounts | Tenant (MT1 columns + MT3 filter) |
| Expense / petty categories, FX rates, GL/COA | Tenant |
| System settings (`org_name`, WHT %, fiscal lock, enabled currencies) | Tenant |
| Country codes, currencies catalogue, payment modes | Platform-shared |

## Template provisioner

`provisionTenantTemplate(prisma, tenantId, options)` in  
`backend/src/tenants/tenant-template.service.ts`

Creates **without** copying Tenant A transactions:

- System settings (orgName / WHT / fiscal / currencies list)
- Default expense + petty categories
- Full COA (`COA_SEED`)
- Baseline FX rates

Used by seed for DEMO; Nest `TenantTemplateService` exported for **MT5** tenant create.

## Evidence

`node backend/scripts/verify-mt4.js` → `ok: true`

| Check | DED | DEMO |
|-------|-----|------|
| Universities | 24 (no Demo Isolation Uni) | 1 (Demo Isolation Uni) |
| orgName | D' Educationist | Demo Agency (MT4) |
| WHT % | 1 | 2.5 |
| Fiscal lock | 2026-06-30 | 2025-12-31 |
| GL accounts | 27 | 22 (distinct ids) |

## Honest limit

Tenant **create API** (CRM lifecycle) is **MT5**. This milestone only delivers the template + per-tenant settings wiring.
