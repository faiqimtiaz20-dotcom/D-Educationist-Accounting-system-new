# DEF-X-011 — Production bundle contains demo and seed passwords

## Status
Open

## Severity
S2

## TC
X-011

## Steps
1. `npm run build` in the frontend.
2. Search `dist/assets/*.js` for `ChangeMe123!`, `demo123`, `JWT_SECRET`, and `DATABASE_URL`.

## Expected
Those secrets are absent from the client bundle. `VITE_API_URL` may be present.

## Actual
`dist/assets/index-DxqP81us.js` contains `ChangeMe123!` and `demo123` (from `src/lib/auth-credentials.ts`). `JWT_SECRET`, `DATABASE_URL`, and the database password were not in the bundle.

The production login page does not render the demo panel (AUTH-011 passed on `vite preview`). The strings are still shipped in the JavaScript.
