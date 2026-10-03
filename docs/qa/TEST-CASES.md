# QA Test Cases — D' Educationist Accounting

**Document ID:** QA-TC-DE-ACC-2026  
**Product:** D' Educationist Accounting System  
**Baseline:** [FSD-DE-ACC-2026](../FSD-DE-ACC-2026.md) v1.0  
**Version:** 1.0  
**Date:** 29 September 2026  
**Prepared by:** QA  
**Status:** Ready for execution  

This pack is the executable specification. Record Pass / Fail / Blocked / N/A against each **TC ID**. Do not change the ID. A failed case needs a defect ID before the cycle is closed.

**Case count:** 230 (195 functional + 20 branch isolation + 15 tenant isolation). No case is optional on a release candidate.

| Suite | File | Cases |
| --- | --- | ---: |
| Authentication | [01-authentication.md](./test-cases/01-authentication.md) | AUTH-001 … 012 |
| Access control | [02-rbac.md](./test-cases/02-rbac.md) | RBAC-001 … 012 |
| Dashboard | [03-dashboard.md](./test-cases/03-dashboard.md) | DASH-001 … 007 |
| Master Sheet | [04-students.md](./test-cases/04-students.md) | STU-001 … 014 |
| Revenue | [05-revenue.md](./test-cases/05-revenue.md) | REV-001 … 013 |
| Sub-agents | [06-sub-agents.md](./test-cases/06-sub-agents.md) | SA-001 … 009 |
| Cash and expenses | [07-cash.md](./test-cases/07-cash.md) | CASH-001 … 014 |
| General ledger | [08-general-ledger.md](./test-cases/08-general-ledger.md) | GL-001 … 014 |
| Tax | [09-tax.md](./test-cases/09-tax.md) | TAX-001 … 008 |
| Payroll | [10-payroll.md](./test-cases/10-payroll.md) | PAY-001 … 012 |
| Operations | [11-operations.md](./test-cases/11-operations.md) | OPS-001 … 010 |
| Reports | [12-reports.md](./test-cases/12-reports.md) | RPT-001 … 034 |
| Settings | [13-settings.md](./test-cases/13-settings.md) | SET-001 … 010 |
| Non-functional | [14-non-functional.md](./test-cases/14-non-functional.md) | X-001 … 016 |
| End to end | [15-end-to-end.md](./test-cases/15-end-to-end.md) | E2E-001 … 010 |
| Branch isolation | [16-branch-isolation.md](./test-cases/16-branch-isolation.md) | BR-ISO-001 … 020 |
| Tenant isolation | [17-tenant-isolation.md](./test-cases/17-tenant-isolation.md) | TN-ISO-001 … 015 |

---

## 1. How to execute

1. Use a **fresh browser profile** (or a private window) for every role change. Do not rely on a leftover token.
2. Confirm the SPA was built or started with `VITE_API_URL` pointing at the API under test. Mock mode (`VITE_API_URL` unset, password `demo123`) is **out of scope** for this pack.
3. Clear the fiscal lock before any write case (Super Admin → **Settings → System Settings** → clear **Fiscal period locked until**), unless the case itself sets a lock.
4. Execute P1 cases first: authentication, RBAC, branch isolation, then the money path (E2E-001 and the REV / SA / CASH / GL cases it depends on).
5. For each case record: **Status**, **Actual result** (what you saw, including HTTP status if you captured it), **Defect ID**, tester, date, build.
6. A case is **Blocked** only when a prior defect stops you from reaching the step. Name that defect. Do not mark a case N/A because it is inconvenient.
7. Restore shared settings after the cycle: fiscal lock cleared (or restored to the client’s value), and do not leave QA-created users as Super Admin.

**API base used in steps:** `/api/v1` (local default `http://localhost:3001/api/v1`).  
**SPA:** environment URL (local default `http://localhost:5173`).

Network tab (or the API directly) is part of the evidence for security and posting cases. UI-only confirmation is not enough when the expected result names a status code or a journal.

---

## 2. Environment and accounts

Staging seed only. Change these passwords before production. Password is `SEED_PASSWORD` (seed default **`ChangeMe123!`**).

| Email | Role | Home branch | Use for |
| --- | --- | --- | --- |
| admin@saa.com | Super Admin | HO | All-branch, settings, lock, matrix |
| ahmed@saa.com | Branch Manager | KHI | Branch A in isolation tests |
| sara@saa.com | Accountant | LHR | Branch B; journals, tax, revenue |
| bilal@saa.com | Cashier | ISB | Cash, bank; must not manage users |
| fatima@saa.com | Counsellor | KHI | Own students; Operations reports only |
| usman@saa.com | Accountant | MUL | Extra branch spot-check |
| hina@saa.com | Read Only | FSD | View allowed; create denied |
| zain@saa.com | Branch Manager | LHR | Second manager on Branch B |

**Branches:** HO, KHI, LHR, ISB, MUL, FSD.  
**Currencies:** PKR, GBP, USD, CAD, AUD, EUR. Reporting amounts are PKR via the document FX rate or the latest FX table.

**Prefix QA data** with `QA-` plus the date (example `QA-STU-20260929-01`) so it can be found in lists and audit.

---

## 3. Business rules the oracle uses

| Rule | What “pass” means |
| --- | --- |
| BR-01 | Trial balance and GL balances include **Approved** journals only. A draft does not move the trial balance. |
| BR-02 | A document dated on or before **Fiscal period locked until** cannot be created or posted. |
| BR-03 | A journal is rejected when total debit ≠ total credit (rounding tolerance only). |
| BR-04 | Sending an invoice and recording a remittance (including allocation) posts a journal. |
| BR-05 | Sub-agent payable = `gross fee × rate/100 × FX + follow-on bonus`, then WHT is deducted. Net ≤ gross. |
| BR-06 | A counsellor sees only students where `counsellorId` is that user. |
| BR-07 | Soft-deleted students and masters disappear from the default list. |
| BR-08 | A source document that already posted a journal cannot be deleted. Reverse it. |
| BR-09 | Salary tax helper: 10% of gross is exempt; annual taxable uses 2.5% / 7.5% / 12.5%. Monthly tax = round(annual tax / 12). This is the product helper, not the full FBR calendar. |
| BR-10 | Foreign amounts convert to PKR with the invoice exchange rate, else the latest FX rate. |
| Branch rule | Super Admin sees every branch and may choose **All branches**. Every other role is limited to the home branch. Universities and shared settings are common. Transactional rows never appear in another branch’s lists, search, reports, or direct-by-id calls. |

**Salary tax worked examples** (basic only, allowances 0):

| Case | Gross | Annual taxable (gross × 0.9 × 12) | Bracket | Monthly tax | Net |
| --- | ---: | ---: | --- | ---: | ---: |
| PAY-003 | 40,000 | 432,000 | 2.5% | 900 | 39,100 |
| PAY-004 | 80,000 | 864,000 | 7.5% | 5,400 | 74,600 |
| PAY-005 | 150,000 | 1,620,000 | 12.5% | 16,875 | 133,125 |
| PAY-002 | 100,000 | 1,080,000 | 7.5% (exempt already removed from the base) | 6,750 | 93,250 |

---

## 4. Severity when you raise a defect

| Severity | Use when |
| --- | --- |
| S1 | Login broken, cross-branch data leak, GL out of balance, posted document deleted, fiscal lock bypassed, counsellor sees another counsellor’s students or a non-Operations report. |
| S2 | A Must requirement fails but a workaround exists (export, one report, one approval path). |
| S3 | Validation message, label, or non-blocking UI issue. |
| S4 | Cosmetic. |

File defects as `DEF-<MODULE>-nnn` under `docs/qa/defects/`. Link the TC ID.

---

## 5. Entry and exit

**Entry**

- API health returns `status: ok` and `database: up` (X-006).
- Seed users above can sign in.
- At least one university, one bank account per test branch, expense and petty categories, and a chart of accounts exist.

**Exit (release candidate)**

- Every P1 case Pass.
- Zero open S1.
- S2 either fixed or accepted in writing by the client with the TC ID named.
- Branch isolation BR-ISO-001 … 020 all Pass.
- E2E-001 (student → invoice send → remittance → sub-agent payment → expense approval → visible in GL) Pass on this build.

---

## 6. Requirement traceability

| FSD | Cases |
| --- | --- |
| FR-AUTH-01 … 07 | AUTH-001 … 012 |
| FR-DASH-01 … 04 | DASH-001 … 007, RBAC-001 |
| FR-STU-01 … 07 | STU-001 … 014, RBAC-007, RBAC-010 |
| FR-REV-01 … 06 | REV-001 … 013, E2E-010 |
| FR-SA-01 … 05 | SA-001 … 009 |
| FR-CASH-01 … 06 | CASH-001 … 014 |
| FR-GL-01 … 07 | GL-001 … 014, E2E-005 |
| FR-TAX-01 … 03 | TAX-001 … 008, E2E-006 |
| FR-PAY-01 … 05 | PAY-001 … 012, E2E-009 |
| FR-OPS-01 … 04 | OPS-001 … 010, E2E-008 |
| FR-RPT-01 … 06 | RPT-001 … 034, RBAC-008, RBAC-009, E2E-007 |
| FR-SET-01 … 05 | SET-001 … 010 |
| NFR-01 … 06 | X-001 … 016 |
| BR-06 + branch rule | BR-ISO-001 … 020, E2E-002, E2E-003 |
| Acceptance §11 money path | E2E-001, E2E-004 |

---

## 7. Result log

Copy this header into the cycle sheet. One row per TC ID.

`TC ID | Module | Priority | Status | Actual result | Defect ID | Tester | Date | Build`
