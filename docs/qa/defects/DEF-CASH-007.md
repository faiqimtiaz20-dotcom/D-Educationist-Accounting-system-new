# DEF-CASH-007 — Expense self-approval allowed (SoD)

## Status
**Resolved** (29 Sep 2026)

## Fix
`ExpensesService.approve` returns 403 when `requestedById === user.id`.

## TC
CASH-007, OPS-003
