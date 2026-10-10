# D' Educationist Accounting

Multi-tenant, multi-branch commission accounting for study-abroad consultancies (proposal DE-ACC-2026-182). Platform **CRM Admin** provisions tenants; each **Tenant Admin** runs accounting inside one organisation.

| Layer | Stack |
|-------|--------|
| Frontend | Vite + React + TypeScript + Tailwind (`src/`) |
| Backend | NestJS + Prisma + PostgreSQL (`backend/`) |
| Auth | JWT (access + refresh), RBAC, branch + **tenant** scope |

## Quick start (local)

### 1. Database

```bash
# Create DB, then enable citext
psql -U postgres -c "CREATE DATABASE dedu_accounting;"
psql -U postgres -d dedu_accounting -c "CREATE EXTENSION IF NOT EXISTS citext;"
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit DATABASE_URL, JWT secrets
npm install
npx prisma migrate deploy
npm run prisma:seed
npm run start:dev
```

API: `http://localhost:3001/api/v1` · Health: `/api/v1/health`

Seed accounts (password `ChangeMe123!` or `SEED_PASSWORD`):

- Tenant Admin: `admin@saa.com` (tenant **DED**)
- CRM Admin: `crm@platform.local` (platform)
- Demo tenant: `admin@demo.local` (isolation sample)

### 3. Frontend

```bash
# from repo root
cp .env.example .env
# VITE_API_URL=http://localhost:3001/api/v1
npm install
npm run dev
```

App: `http://localhost:5173`

## Documentation

| Doc | Purpose |
|-----|---------|
| [docs/BACKEND-MILESTONES.md](docs/BACKEND-MILESTONES.md) | Milestone map M0–M15 (single-tenant delivery) |
| [docs/MULTI-TENANT-MILESTONES.md](docs/MULTI-TENANT-MILESTONES.md) | Multi-tenant + CRM Admin **MT0–MT9** |
| [docs/MULTI-TENANT-MIGRATION-RUNBOOK.md](docs/MULTI-TENANT-MIGRATION-RUNBOOK.md) | Single-tenant DB → multi-tenant cutover |
| [docs/DUAL-TENANT-PROOF.md](docs/DUAL-TENANT-PROOF.md) | Staging dual-tenant proof (engineering) |
| [docs/TRAINING-CRM-VS-TENANT-ADMIN.md](docs/TRAINING-CRM-VS-TENANT-ADMIN.md) | CRM vs Tenant Admin training |
| [docs/FSD-DE-ACC-2026.md](docs/FSD-DE-ACC-2026.md) | Functional Specification Document (FSD) |
| [docs/FSD-MULTI-TENANT-ADDENDUM.md](docs/FSD-MULTI-TENANT-ADDENDUM.md) | Multi-tenant / CRM Admin rules |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Staging/production deploy |
| [docs/CLOUDWAYS-MAIL-RELAY.md](docs/CLOUDWAYS-MAIL-RELAY.md) | Optional Cloudways SMTP relay (Railway SMTP block) |
| [cloudways-mail-api/README.md](cloudways-mail-api/README.md) | Separate PHP mail API (Cloudways deploy) |
| [docs/UAT-CHECKLIST.md](docs/UAT-CHECKLIST.md) | Client UAT + sign-off (**unsigned until client signs**) |
| [docs/USER-GUIDE.md](docs/USER-GUIDE.md) | End-user guide (API-backed) |
| [docs/TRAINING-AGENDA.md](docs/TRAINING-AGENDA.md) | Remote training outline |
| [docs/HANDOVER.md](docs/HANDOVER.md) | Source + credentials handover |
| [docs/M14-SMOKE-CHECKLIST.md](docs/M14-SMOKE-CHECKLIST.md) | Sidebar API smoke |

## Verify scripts

```bash
cd backend
node scripts/verify-m14.js              # sidebar APIs + pagination
node scripts/verify-m15.js              # go-live readiness / golden path
node scripts/verify-mt9-migration.js    # multi-tenant + dual-tenant smoke
node scripts/qa-run-tenant-isolation.js # TN-ISO-001…015
node scripts/qa-run-branch-isolation.js # BR-ISO-001…020
```

## Modes

- **API mode:** set `VITE_API_URL` → talks to Nest/Postgres (production path).
- **Mock mode:** unset `VITE_API_URL` → local Zustand demo only (dev). Disabled in production builds.

## Explicit non-claims

Hosting, DNS/SSL, FBR/bank APIs, native mobile, payment gateway, and full Excel migration are **not** included unless separately agreed. Client UAT sign-off is **not** claimed by engineering alone. See milestones §4–§6.
