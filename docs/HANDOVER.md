# Handover pack — source, credentials, warranty

## What is handed over (engineering)

| Item | Location |
|------|----------|
| Frontend source | Repo root (`src/`, Vite config) |
| Backend source | `backend/src/` |
| Prisma schema + migrations | `backend/prisma/` |
| Seed script | `backend/prisma/seed.ts` |
| Env templates | `.env.example`, `backend/.env.example` |
| Milestone map | `docs/BACKEND-MILESTONES.md` |
| Deploy runbook | `docs/DEPLOYMENT.md` |
| UAT checklist | `docs/UAT-CHECKLIST.md` |
| User guide | `docs/USER-GUIDE.md` |
| Training agenda | `docs/TRAINING-AGENDA.md` |
| Functional Specification (FSD) | `docs/FSD-DE-ACC-2026.md` |
| Smoke scripts | `backend/scripts/verify-m*.js` |

Source handover timing follows **commercial payment terms** (proposal). This file does not override the signed agreement.

## Credentials checklist (client to complete on their infra)

| Secret / access | Provided by | Stored where | Rotated? |
|-----------------|-------------|--------------|----------|
| Postgres `DATABASE_URL` | Client / host | Vault / host secrets | ☐ |
| `JWT_ACCESS_SECRET` | Delivery at go-live | Vault | ☐ |
| `JWT_REFRESH_SECRET` | Delivery at go-live | Vault | ☐ |
| SPA host / DNS | Client | DNS panel | ☐ |
| API host / DNS | Client | DNS panel | ☐ |
| Super Admin password | Client after first login | Password manager | ☐ |
| Document volume `UPLOAD_DIR` | Ops | Backup policy | ☐ |

**Never commit** real `.env` files or production dumps to git.

## Warranty (proposal-aligned)

- **30-day bug-fix warranty** starts only after **formal delivery sign-off** (not after first staging deploy).  
- Scope: defects in delivered M1–M14 functionality against agreed scope.  
- Exclusions: hosting outages, client data mistakes, new feature requests, third-party APIs not in scope.

## Sign-off block

| Item | Status |
|------|--------|
| UAT checklist completed | ☐ |
| Training session held | ☐ |
| Production deploy assisted | ☐ / N/A |
| Source repos / archive delivered | ☐ |
| Formal delivery sign-off date | __________ |
| Warranty end date (sign-off + 30 days) | __________ |

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Client | | | |
| Delivery | | | |
