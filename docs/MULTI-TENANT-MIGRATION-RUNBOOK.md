# Multi-tenant migration runbook

**Document ID:** MT9-MIG-RUNBOOK  
**Date:** 1 October 2026  
**Audience:** Engineer migrating a **single-tenant** Postgres database to the multi-tenant schema (MT1+) and verifying CRM + Tenant B.

**Related:** [MULTI-TENANT-MILESTONES.md](./MULTI-TENANT-MILESTONES.md) · [MT1-TENANT-INVENTORY.md](./MT1-TENANT-INVENTORY.md) · [DEPLOYMENT.md](./DEPLOYMENT.md) · [FSD-MULTI-TENANT-ADDENDUM.md](./FSD-MULTI-TENANT-ADDENDUM.md)

---

## 0. What this migration does

| Step | Prisma migration | Effect |
|------|------------------|--------|
| MT1 | `20261001120000_mt1_tenant` | Creates `tenants`; adds `tenant_id` to business tables; backfills **DED** (`a0000000-0000-4000-8000-000000000001`); tenant-scoped uniques |
| MT2 | `20261001140000_mt2_crm_nullable_branch` | CRM platform users: nullable `users.branch_id` / `tenant_id`; `CRM_ADMIN` / `TENANT_ADMIN` roles |

Application code (MT3–MT8) enforces tenant ALS + CRM boundary. **Schema alone is not enough** — deploy the matching API/SPA build.

**Default after MT1:** all existing rows belong to tenant **DED** (D' Educationist). No data is deleted.

---

## 1. Preconditions

- [ ] Maintenance window agreed; users notified  
- [ ] Target Postgres **14+** (16 recommended); `citext` available  
- [ ] API/SPA build that includes MT1–MT8 code  
- [ ] Disk space ≥ 2× current DB size (for dump)  
- [ ] `UPLOAD_DIR` volume writable (new uploads use `uploads/{tenantId}/…`)  

---

## 2. Backup (mandatory)

```bash
# Replace connection values
export PGHOST=... PGPORT=5432 PGUSER=... PGDATABASE=dedu_accounting
pg_dump -Fc -f "backup-pre-mt-$(date +%Y%m%d%H%M).dump" "$PGDATABASE"

# Optional plain SQL for inspection
pg_dump -f "backup-pre-mt-$(date +%Y%m%d%H%M).sql" "$PGDATABASE"
```

Store the dump **off** the app server. Verify restore on a scratch DB at least once in staging:

```bash
createdb dedu_restore_test
pg_restore -d dedu_restore_test backup-pre-mt-….dump
```

---

## 3. Migrate

```bash
cd backend
# Point DATABASE_URL at the target DB
npx prisma generate
psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS citext;"
npx prisma migrate deploy
```

Expected applied migrations include at least:

- `20260928120000_m1_init` (or already applied)  
- `20261001120000_mt1_tenant`  
- `20261001140000_mt2_crm_nullable_branch`  

If `migrate deploy` fails mid-way: **do not continue** — restore from dump and fix the error on a copy first.

### 3.1 Seed roles / CRM (staging or empty prod)

```bash
# Staging: full sample data
SEED_PASSWORD='…' npx prisma db seed

# Production: prefer seed only for roles + first CRM/Tenant Admin, or create via SQL
# Never leave SEED_PASSWORD as ChangeMe123! in production
```

Seed creates (when run):

- Roles including `CRM_ADMIN`, `TENANT_ADMIN`  
- Platform user `crm@platform.local` (null tenant/branch)  
- Tenant `DED` admin `admin@saa.com`  
- Optional DEMO tenant for isolation proofs (staging)  

---

## 4. Verify (dry-run checklist)

Automated:

```bash
# API must be running against the migrated DB
API_BASE=http://127.0.0.1:3001/api/v1 node backend/scripts/verify-mt9-migration.js
```

Manual SQL spot-checks:

```sql
-- Tenants exist
SELECT id, code, name, status FROM tenants WHERE deleted_at IS NULL;

-- No orphan business rows (example: students)
SELECT COUNT(*) AS missing_tenant
FROM students s
LEFT JOIN tenants t ON t.id = s.tenant_id
WHERE t.id IS NULL;

-- DED backfill id
SELECT COUNT(*) FROM students
WHERE tenant_id = 'a0000000-0000-4000-8000-000000000001';

-- CRM user is platform
SELECT email, tenant_id, branch_id FROM users
WHERE email = 'crm@platform.local';
```

Smoke:

```bash
node backend/scripts/verify-mt5.js   # CRM create / suspend
node backend/scripts/verify-mt7.js   # tenant context on login
node backend/scripts/qa-run-tenant-isolation.js   # TN-ISO
node backend/scripts/qa-run-branch-isolation.js   # BR-ISO inside DED
```

---

## 5. Post-cutover application steps

1. Deploy Nest API build (MT8+) and confirm `GET /api/v1/health` → database `up`.  
2. Deploy SPA with `VITE_API_URL` (production builds refuse mock mode).  
3. Log in as Tenant Admin → accounting shell shows **tenant** brand.  
4. Log in as CRM Admin → `/crm/tenants` only (no Master Sheet / GL).  
5. Create Tenant B via CRM UI or API; confirm new admin login.  
6. Rotate JWT secrets and all seed passwords.  
7. Document dual-tenant proof: [DUAL-TENANT-PROOF.md](./DUAL-TENANT-PROOF.md).  

---

## 6. Rollback

1. Stop API writers.  
2. `pg_restore` (or `psql`) the **pre-MT** dump into the database (or swap to previous volume).  
3. Redeploy **previous** API/SPA artifacts that match the restored schema.  
4. Confirm `/health` and Tenant Admin login.  

**Note:** Rolling back schema while keeping the new SPA/API will break. Always pair dump + artifacts.

---

## 7. Dry-run on a dump (engineering evidence)

Perform once per release candidate:

1. Restore production (or staging) dump to a scratch database.  
2. Run `prisma migrate deploy` against scratch.  
3. Start API against scratch; run `verify-mt9-migration.js`.  
4. Record date, dump name, and Pass/Fail in [DUAL-TENANT-PROOF.md](./DUAL-TENANT-PROOF.md) § Dry-run log.  

---

## 8. Explicit non-claims

- This runbook does **not** claim client UAT sign-off or production hosting.  
- Payment gateway / seat billing remain out of scope (D7 status-only).  
- CRM Admin impersonation is not in v1 (D3).  

---

*End of multi-tenant migration runbook.*
