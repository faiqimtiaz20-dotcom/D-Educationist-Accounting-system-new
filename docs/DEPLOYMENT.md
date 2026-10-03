# Deployment runbook — D' Educationist Accounting

**Audience:** engineer deploying staging or production.  
**Does not include:** purchasing hosting, DNS, or SSL certificates (client or add-on).

## Architecture

```
Browser (Vite SPA)
    │  HTTPS
    ▼
Static host / CDN  ── VITE_API_URL ──►  Nest API (/api/v1)
                                              │
                                              ▼
                                         PostgreSQL 16
                                              │
                                         uploads/ (local disk or mount)
```

## Prerequisites

- Node.js 20+
- PostgreSQL 14+ (16 recommended)
- Ability to set env vars and run process managers (systemd, PM2, Docker, Railway, Render, etc.)

## Backend

### 1. Environment

Copy `backend/.env.example` → `.env` (or platform secrets):

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | Postgres connection string with `?schema=public` |
| `PORT` | e.g. `3001` or platform-assigned |
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | Exact frontend origin(s), comma-separated |
| `JWT_ACCESS_SECRET` | Long random secret (**not** the example value) |
| `JWT_REFRESH_SECRET` | Different long random secret |
| `JWT_ACCESS_EXPIRES_IN` | e.g. `15m` |
| `JWT_REFRESH_EXPIRES_IN` | e.g. `7d` |
| `SEED_PASSWORD` | Only for seed; change after first login in production |
| `UPLOAD_DIR` | Persistent volume for documents; files stored as `{UPLOAD_DIR}/{tenantId}/…` |

### 2. Database

```bash
cd backend
npm ci
npx prisma generate
# Enable citext once per database
psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS citext;"
npx prisma migrate deploy
# Optional sample data (dev/staging only — skip or use empty seed for clean prod)
npm run prisma:seed
```

### 3. Build & run

```bash
npm run build
NODE_ENV=production node dist/main.js
# or: npm run start:prod
```

Health check: `GET /api/v1/health` → `{ status: "ok", database: "up", milestone: "M15" }`.

### 4. Uploads

Ensure `UPLOAD_DIR` exists and survives restarts (bind mount / volume). Back up with the database.

## Frontend

### 1. Environment at **build** time

Vite embeds env at build:

```bash
# .env.production or CI secret
VITE_API_URL=https://api.your-domain.com/api/v1
```

Production builds **refuse** to run without `VITE_API_URL` and hide demo-login shortcuts.

### 2. Build

```bash
npm ci
npm run build
# Output: dist/
```

Serve `dist/` via nginx, Cloudflare Pages, S3+CloudFront, Netlify, etc. Configure SPA fallback to `index.html`.

### 3. CORS

Backend `CORS_ORIGIN` must include the exact SPA origin (scheme + host + port).

## Suggested first go-live order

1. Provision Postgres + run migrations (`prisma migrate deploy` — includes MT1/MT2 tenant)  
2. Deploy API, confirm `/health`  
3. Seed **or** create Tenant Admin + CRM Admin; change passwords  
4. Build SPA with production `VITE_API_URL`  
5. Smoke: `node backend/scripts/verify-m15.js` and `node backend/scripts/verify-mt9-migration.js`  
6. Dual-tenant proof notes: [DUAL-TENANT-PROOF.md](./DUAL-TENANT-PROOF.md)  
7. Run [UAT-CHECKLIST.md](./UAT-CHECKLIST.md) with client (**do not claim signed until signed**)  

### Migrating an existing single-tenant database

Follow [MULTI-TENANT-MIGRATION-RUNBOOK.md](./MULTI-TENANT-MIGRATION-RUNBOOK.md): backup → `migrate deploy` → verify → optional CRM create Tenant B.

## Rollback

- Database: restore Postgres dump taken before migration  
- API: redeploy previous `dist/` artifact  
- SPA: redeploy previous static build  

## Security checklist

- [ ] Rotate JWT secrets from examples  
- [ ] Change all seed user passwords  
- [ ] `NODE_ENV=production`  
- [ ] HTTPS only for SPA and API (`HTTPS_KEY_PATH`/`HTTPS_CERT_PATH` on Nest, or TLS terminator + `FORCE_HTTPS=true`)  
- [ ] Restrict DB to private network  
- [ ] Quota / backup for `UPLOAD_DIR`  

## HTTPS options

### A — Nest serves TLS directly

```bash
# Generate local/self-signed for staging (do not use self-signed in real prod)
node scripts/generate-https-certs.js
# In .env:
# HTTPS_KEY_PATH=./certs/key.pem
# HTTPS_CERT_PATH=./certs/cert.pem
# PORT=3443
npm run start:prod
# Verify: curl -k https://localhost:3443/api/v1/health
```

### B — Reverse proxy / CDN terminates TLS (recommended for production)

1. nginx / Cloudflare / ALB terminates HTTPS and forwards to Nest over private HTTP (or mTLS).
2. Set `FORCE_HTTPS=true` so Nest rejects requests missing `X-Forwarded-Proto: https`.
3. SPA `VITE_API_URL` must be `https://…`.

Smoke: `node scripts/verify-https.js` (self-signed local proof for QA X-012).
