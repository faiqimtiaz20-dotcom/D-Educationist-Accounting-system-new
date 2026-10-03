# QA Results Summary — D' Educationist Accounting

**Latest cycle (30 Sep 2026):** [QA-CYCLE-2026-09-30.md](./QA-CYCLE-2026-09-30.md). Branch isolation 20 Pass. API suite 180 Pass, REV-008 runner fail retested **Pass**. Five open defects (no S1): STU-010, STU-013, RBAC-009 UI, X-011, X-013. X-012 blocked (no HTTPS host).

**Test cases (executable spec):** [TEST-CASES.md](./TEST-CASES.md) — 215 cases (AUTH through E2E, plus BR-ISO-001 … 020).

## Previous cycle (29 Sep 2026)

**Environment:** Local API `http://localhost:3001/api/v1` + SPA `http://localhost:5173` (seeded Postgres).
**Merged:** 2026-09-29T15:20:00.125Z
**Cases executed:** 195 (no skips)

## Totals

| Status | Count |
| --- | ---: |
| Pass | 195 |
| Fail | 0 |
| Blocked | 0 |
| N/A | 0 |
| DeferredUI (should be 0 after merge) | 0 |

> Overall verdict: **195 Pass / 0 Fail / 0 Blocked**.

## Branch isolation suite (BR-ISO-001 … 020)

Strict rule: Super Admin = all branches; all other users = home branch only. Universities + shared settings are common; transactional data never crosses branches.

| Status | Count |
| --- | ---: |
| Pass | 20 |
| Fail | 0 |

Full table: [`BRANCH-ISOLATION-RESULTS.md`](./BRANCH-ISOLATION-RESULTS.md) · runner: `backend/scripts/qa-run-branch-isolation.js` · sheet **Branch Isolation** in the workbook.

## By module

| Module | Pass | Fail | Blocked |
| --- | ---: | ---: | ---: |
| AUTH | 12 | 0 | 0 |
| CASH | 14 | 0 | 0 |
| DASH | 7 | 0 | 0 |
| E2E | 10 | 0 | 0 |
| GL | 14 | 0 | 0 |
| OPS | 10 | 0 | 0 |
| PAY | 12 | 0 | 0 |
| RBAC | 12 | 0 | 0 |
| REV | 13 | 0 | 0 |
| RPT | 34 | 0 | 0 |
| SA | 9 | 0 | 0 |
| SET | 10 | 0 | 0 |
| STU | 14 | 0 | 0 |
| TAX | 8 | 0 | 0 |
| X | 16 | 0 | 0 |

## Failures (defects)


## Blocked


## Evidence

- API: `docs/qa/evidence/api-results.json`
- Final merged: `docs/qa/evidence/final-results.json`
- UI/code: `docs/qa/evidence/ui-code-evidence.md`
- Workbook: `docs/qa/D_Educationist_Accounting_QA_Test_Cases.xlsx`
- Runner: `backend/scripts/qa-run-api.js` (workbook columns matched: TC ID, Module, FSD Ref, Test Case, Preconditions, Steps, Test Data, Expected Result, Priority, Type, Status, Actual Result, Defect ID; filled 195)
