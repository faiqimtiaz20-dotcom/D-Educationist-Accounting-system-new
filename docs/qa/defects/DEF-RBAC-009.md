# DEF-RBAC-009 — Counsellor trial balance page shows a zero total

## Status
Open

## Severity
S3

## TC
RBAC-009, X-008

## Steps
1. Sign in as `fatima@saa.com`.
2. Open `/reports/trial-balance`.
3. Call `GET /reports/trial-balance` and `GET /reports/trial-balance/csv` with her token.

## Expected
403, a permission message, and no trial-balance figures or export of the ledger.

## Actual
Both API calls return **403** with `Counsellors may only open Operations reports`. The report hub correctly lists only the three Operations reports.

The trial-balance screen still renders the report title, PDF / Excel / CSV buttons, category **Standard (live API)**, and **Total: PKR 0**, with the 403 message under that total. The zero is the page's fallback when `apiData` is missing, not a returned trial balance. It reads as an empty report.
