# DEF-CASH-003 — Petty cash excess outflow not rejected

## Status
**Resolved** (29 Sep 2026)

## Fix
`PettyCashService.create` rejects `out` when amount exceeds branch float (`sum(in) − sum(out)`).

## TC
CASH-003
