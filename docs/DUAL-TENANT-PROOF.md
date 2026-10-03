# Dual-tenant staging proof (MT9)

**Document ID:** MT9-DUAL-PROOF  
**Date:** 1 October 2026  
**Environment:** Local / staging API `http://127.0.0.1:3001/api/v1` (update if different)  
**Build:** MT0–MT8 engineering complete; this proof exercises migrated Tenant A + CRM-created Tenant B.

**Honesty:** Client UAT sign-off and production hosting are **not** claimed here.

---

## 1. Actors

| Actor | Email (seed) | Tenant | Role |
|-------|--------------|--------|------|
| Tenant A admin | `admin@saa.com` | **DED** (`a0000000-0000-4000-8000-000000000001`) | TENANT_ADMIN |
| Tenant B admin | created by CRM (unique email) | New code e.g. `MT5…` / proof tenant | TENANT_ADMIN |
| Isolation sample | `admin@demo.local` | **DEMO** | TENANT_ADMIN |
| Platform CRM | `crm@platform.local` | null | CRM_ADMIN |

Default seed password: `ChangeMe123!` (or `SEED_PASSWORD`) — **change in production**.

---

## 2. Proof steps executed

| # | Step | Evidence |
|---|------|----------|
| 1 | Schema migrated (MT1+MT2 present) | `verify-mt9-migration.js` → migrations / tenant table checks |
| 2 | Tenant A login returns `tenantId` + `tenantCode` + `tenantName` | verify-mt7 / verify-mt9 |
| 3 | CRM lists tenants; cannot open `/gl-accounts` | verify-mt5 / TN-ISO-010 |
| 4 | CRM creates Tenant B (HO + admin + template) | verify-mt5 create |
| 5 | Tenant B admin logs in; sees only own settings/org | verify-mt5 + settings orgName |
| 6 | Suspend B → login rejected; activate → OK | verify-mt5 |
| 7 | Tenant A ↛ DEMO on students/invoices/reports/CSV | TN-ISO 15/15 Pass |
| 8 | Branch isolation inside DED | BR-ISO 20/20 Pass |
| 9 | Uploads under `uploads/{tenantId}/` | TN-ISO-014 |

Automated one-shot:

```bash
cd backend
node scripts/verify-mt9-migration.js
node scripts/verify-mt5.js
node scripts/qa-run-tenant-isolation.js
```

---

## 3. Dry-run migration log

| Date | Dump / source | Scratch DB | `migrate deploy` | verify-mt9 | Notes |
|------|---------------|------------|------------------|------------|-------|
| 1 Oct 2026 | Live local DB already on MT1+MT2 (post-dev migrate) | n/a — verify against running API | Applied earlier in MT1/MT2 | **Pass** (`verify-mt9-migration.js` ok; CRM create `P9…`; DED+DEMO orgs differ; `clientUatSigned: false`) | Full pg_dump → scratch restore still required before first **client** prod cutover |

**Prod cutover requirement:** Before touching client production, restore a client dump to scratch and fill a new row in this table with Pass.

---

## 4. Dual-tenant expected behaviour (quick)

| Action | Tenant A | Tenant B | CRM |
|--------|----------|----------|-----|
| Students list | Own only | Own only | 403 |
| Create university | Own tenant | Own tenant | 403 |
| `/crm/tenants` | 403 | 403 | 200 |
| Suspend tenant | n/a | n/a | Allowed; blocks B login |
| Branch switcher | Branches **within A** | Branches **within B** | Hidden |

---

## 5. Sign-off (engineering only)

| Role | Name | Date | Result |
|------|------|------|--------|
| Engineering | Auto / delivery | 1 Oct 2026 | Dual-tenant **API proof Pass** on staging/local |
| Client UAT | — | — | **Not signed** |

---

*End of dual-tenant proof.*
