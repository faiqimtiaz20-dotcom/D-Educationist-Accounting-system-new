# DEF-X-013 — JWT access secret falls back to a hard-coded value

## Status
Open

## Severity
S2

## TC
X-013

## Steps
1. Read how the API chooses the access-token secret.
2. Confirm whether a missing environment variable still boots with a known secret.

## Expected
The access and refresh secrets come only from the environment. There is no hard-coded fallback.

## Actual
`JWT_ACCESS_SECRET` is read from the environment in:

- `backend/src/auth/auth.module.ts`
- `backend/src/auth/auth.service.ts`
- `backend/src/auth/jwt.strategy.ts`

Each uses `|| 'dev-only-access-secret'` when the variable is missing. The same pattern exists for the refresh secret. The process under test has `JWT_ACCESS_SECRET` set, so it is not signing with the fallback. A deploy that omits the variable will.

Do not copy the live secret into the test log.
