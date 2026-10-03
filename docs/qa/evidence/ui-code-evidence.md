# UI / code / NFR evidence (local QA)

Environment: SPA `http://localhost:5173`, API `http://localhost:3001`, production `npm run build` → `dist/`.

## AUTH-004 — empty-form validation
- `src/pages/LoginPage.tsx`: email/password `<Input>` have **no** `required` attribute.
- `handleSubmit` always calls `login()` with no empty-field guard.
- **Status: Fail** (DEF-AUTH-004)

## AUTH-011 — production demo login
- `isDemoLoginAllowed()` in `src/lib/api-client.ts` returns `false` when `import.meta.env.PROD`.
- `LoginPage` gates demo shortcuts with `showDemo = isDemoLoginAllowed()`.
- Production build completed (`dist/assets/index-*.js`).
- **Status: Pass**

## AUTH-012 — unauthenticated redirect
- `src/components/auth/AuthGuard.tsx` navigates to `/login` when `!isAuthenticated`.
- SPA shell returns HTTP 200 for `/login` and protected paths (client-side guard).
- **Status: Pass**

## STU-010 — CSV template
- Master sheet toast: `CSV template downloaded` (`MasterSheetPage.tsx`).
- Headers from `STUDENT_CSV_HEADERS` in `src/lib/student-csv.ts`.
- **Status: Pass**

## STU-011 / STU-012 / STU-013 — CSV import/update/invalid rows
- `parseStudentCsv()` creates/updates counts and per-row `error` / `failed` (`student-csv.ts`).
- Import loop on MasterSheet posts students via API.
- **Status: Pass**

## X-007 — error toasts
- Widespread `toast.error(...)` via sonner on API/load failures (Dashboard, Documents, Receivables, etc.).
- **Status: Pass**

## X-008 — 403 / permission toasts
- `RouteGuard.tsx`: `toast.error('You do not have permission to access this module')`.
- `ApprovalsPage.tsx`: authority / SoD toasts.
- **Status: Pass**

## X-009 — desktop viewport
- Layout uses `lg:` breakpoints (`AppShell`, `Sidebar`, `Header`); desktop sidebar fixed, content padded.
- **Status: Pass**

## X-010 — mobile viewport
- Mobile overlay sidebar (`lg:hidden`), hamburger in Header, sidebar `-translate-x-full` until open.
- **Status: Pass**

## X-011 — secrets not in client bundle
- Scanned `dist/assets/index-*.js`: **no** `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, or `DATABASE_URL`.
- Note: seed password literal `ChangeMe123!` appears for demo shortcuts; usage gated by `isProductionBuild()` / `getDemoPassword()` returning `''` in PROD.
- **Status: Pass** (per JWT/DB secret criteria)

## X-012 — HTTPS production
- Nest supports TLS via `HTTPS_KEY_PATH` / `HTTPS_CERT_PATH` and `FORCE_HTTPS=true` (proxy).
- Verified: `node backend/scripts/verify-https.js` → `https://localhost:3443/api/v1/health` status 200.
- Evidence: `docs/qa/evidence/https-x012.json`
- **Status: Pass**

## X-013 — JWT secrets via env
- `backend/.env.example` documents `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, expiry vars.
- **Status: Pass**
