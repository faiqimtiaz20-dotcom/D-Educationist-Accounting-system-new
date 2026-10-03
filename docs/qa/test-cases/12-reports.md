# Reports — RPT-001 … RPT-034

**Module:** Reports hub, live data, CSV, filters, counsellor restriction  
**FSD:** FR-RPT-01 … FR-RPT-06  
**Route:** `/reports` and the dedicated report routes  
**Actor:** Super Admin unless the case says Counsellor.

### Procedure RPT-OPEN

Use this for RPT-002 … RPT-027.

1. Sign in as `admin@saa.com`. Branch **All** unless the case sets a filter.
2. Open **Reports**. Open the named report (or its direct route).
3. For tax reports set period **2026-09**.
4. Confirm the page shows a table, and `GET /api/v1/reports/<slug>` returns **200** with `rows` (array) and `columns`.
5. Spot-check one figure against the source screen named in the case.

A **500**, an empty error toast, or a table that stays on mock/demo numbers while the API is connected is a **Fail**.

### Catalog

| TC ID | Title | Slug | What to tie back |
| --- | --- | --- | --- |
| RPT-002 | Branch Income | `branch-income` | Sent invoices / income journals in range, by branch |
| RPT-003 | Branch Expenses | `branch-expenses` | Approved expenses, not rejected ones |
| RPT-004 | Branch Profit | `branch-profit` | Income − expenses for the branch; consistent with RPT-002 and RPT-003 |
| RPT-005 | Branch Cash Position | `branch-cash` | Bank + cash + petty balances on Bank & Cash |
| RPT-006 | University-wise P&L | `university-wise-pl` | Income minus sub-agent cost; net profit presentation per FR-RPT-06 |
| RPT-007 | Consolidated P&L | `consolidated-pl` | All-branch P&L; Super Admin only in spirit — a branch user must not see other branches’ totals |
| RPT-008 | Consolidated Balance Sheet | `consolidated-bs` | Assets = liabilities + equity from **approved** journals |
| RPT-009 | Consolidated Cash Flow | `consolidated-cf` | Movements agree in direction with bank/cash/petty for the period |
| RPT-010 | Counsellor P&L | `counsellor` | Only that counsellor’s students; has a net profit field |
| RPT-011 | Country-wise | `country-wise` | Pipeline counts by country match Master Sheet |
| RPT-012 | University-wise | `university-wise` | Pipeline counts by university match Master Sheet |
| RPT-013 | Trial Balance | `trial-balance` | Same totals as General Ledger (GL-009) |
| RPT-014 | Cash Book | `cash-book` | Petty in/out from Petty Cash |
| RPT-015 | Bank Book | `bank-book` | Deposits, withdrawals, transfers |
| RPT-016 | Journal Register | `journal-register` | Approved and listed journals; draft exclusion matches GL-008 |
| RPT-017 | Expense Report | `expense-report` | Approved expenses; rejected absent |
| RPT-018 | Income Report | `income-report` | Income in the date range |
| RPT-019 | Receivable Ageing | `receivable-ageing` | Open invoices age from invoice/due date; fully received invoices are not outstanding |
| RPT-020 | Payable Ageing | `payable-ageing` | Unpaid and partial sub-agent commissions; paid ones are not outstanding |
| RPT-021 | Petty Cash | `petty-cash` | Petty register for the branch |
| RPT-022 | WHT Summary | `wht-summary` | Matches Tax Compliance for the same period |
| RPT-023 | GST/SRB Summary | `gst-summary` | Matches Tax Compliance GST/SRB |
| RPT-024 | Salary Tax Summary | `salary-tax` | Matches paid payroll tax for the period |
| RPT-025 | Commission Earned vs Received | `commission-tracking` | Earned = sent invoices; received = remittances |
| RPT-026 | Sub-Agent Payout Summary | `subagent-payout` | Payments recorded in SA-005/006 appear |
| RPT-027 | Net Margin per Student | `net-margin` | Commission minus sub-agent share for Student A |

---

### RPT-001 — Hub lists the catalog by category

| | |
| --- | --- |
| **FSD** | FR-RPT-01 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. As Super Admin, open `/reports`.
2. `GET /reports`.

**Expected result**

- HTTP **200**. At least the **26** reports in the table above.
- Categories shown: **Branch, Consolidated, Operations, Standard, Tax, Commission**.
- Each card shows the title from the catalog. No duplicate slugs.

---

Each case below is **P1**, type **Functional**, FSD **FR-RPT-02**, unless noted. Execute procedure RPT-OPEN, then the extra check. One failed report does not fail the others.

### RPT-002 — Branch Income returns live rows

**Extra check.** A sent invoice from this cycle appears as income for its branch. A draft invoice does not.

**Expected result.** HTTP **200**, `rows` is an array, columns labelled. KHI filter excludes LHR income.

### RPT-003 — Branch Expenses returns live rows

**Extra check.** The approved QA expense is included. The rejected expense is not.

**Expected result.** HTTP **200** and `rows`. Totals match approved expenses for the branch and range, not pending items.

### RPT-004 — Branch Profit returns live rows

**Extra check.** For one branch, profit = Branch Income − Branch Expenses for the same range (RPT-002 and RPT-003).

**Expected result.** HTTP **200**. The arithmetic holds within 1 PKR. A branch with no activity shows zero, not another branch’s profit.

### RPT-005 — Branch Cash Position returns live rows

**Extra check.** KHI cash + bank + petty on this report equals **Bank & Cash** for KHI at the same moment.

**Expected result.** HTTP **200**. Super Admin All-branches view lists each branch separately. Ahmed sees KHI only.

### RPT-006 — University-wise P&L returns live rows

**FSD.** FR-RPT-02, FR-RPT-06

**Extra check.** Income minus sub-agent cost is shown. **Net profit = Profit/(Loss) − Outstanding** on one university row that has both commission and an open balance.

**Expected result.** HTTP **200**. The identity holds on the row you calculated. Universities with no invoices may be omitted or shown as zero; they must not show another university’s income.

### RPT-007 — Consolidated P&L returns live rows

**Extra check.** All-branches profit is the sum of branch profits for the same range (compare RPT-004), not a single branch repeated.

**Expected result.** HTTP **200** for Super Admin. Ahmed’s call is KHI-only or **403**. It is never the consolidated total.

### RPT-008 — Consolidated Balance Sheet balances

**Extra check.** Assets = liabilities + equity from **approved** journals only. The unapproved draft from GL-008 is excluded.

**Expected result.** HTTP **200**. The statement balances within 1 PKR. A draft journal does not move assets.

### RPT-009 — Consolidated Cash Flow returns live rows

**Extra check.** A KHI deposit (CASH-009) and withdrawal (CASH-010) appear in the correct direction for that period.

**Expected result.** HTTP **200**. Inflows and outflows are signed so a deposit does not reduce cash. Contra (CASH-014) does not create income.

### RPT-010 — Counsellor P&L returns live rows and net profit

**FSD.** FR-RPT-02, FR-RPT-06

**Extra check.** One counsellor row: Net profit = Profit/(Loss) − Outstanding. As Fatima, only her students contribute.

**Expected result.** HTTP **200**. A net profit column is present (`netProfitPKR` or a header containing “net”). The arithmetic holds. Fatima does not see other counsellors’ earnings.

### RPT-011 — Country-wise report matches the student pipeline

**Extra check.** Count Master Sheet students for one country (example United Kingdom) in the same branch scope. Compare to the report.

**Expected result.** HTTP **200**. The count matches, including the QA student. Withdrawn/deleted students follow the same inclusion rule as Master Sheet’s default list (soft-deleted excluded).

### RPT-012 — University-wise report matches the student pipeline

**Extra check.** Count students for the QA university. Compare to this operations report (pipeline), not to the P&L in RPT-006.

**Expected result.** HTTP **200**. The student count matches. Commission money is not required on this operations report.

### RPT-013 — Trial Balance report matches the general ledger

**Extra check.** Debit total = credit total. The total equals **Accounting → General Ledger** for the same branch and date. Draft `QA draft only` is excluded.

**Expected result.** HTTP **200**, `rows` present. Totals match GL-009 within 1 PKR.

### RPT-014 — Cash Book lists petty cash

**Extra check.** `QA petty in` (5,000) and `QA petty out` (1,500) from CASH-001 and CASH-002 appear for KHI.

**Expected result.** HTTP **200**. The rejected overdraft (CASH-003) does not appear. Running balance matches the petty screen.

### RPT-015 — Bank Book lists bank movements

**Extra check.** `QA deposit` and `QA withdraw` appear. The transfer (CASH-011) appears on both accounts without being counted as income.

**Expected result.** HTTP **200**. KHI lines only when filtered to KHI. Balance ties to the bank account screen.

### RPT-016 — Journal Register lists vouchers

**Extra check.** The invoice accrual, the remittance journal, and the approved manual journal appear. The unapproved draft does not affect totals if the register is posted-only; if drafts are listed, they are marked Pending and are absent from RPT-013.

**Expected result.** HTTP **200**. Each row has date, number, and branch. Source documents can be identified.

### RPT-017 — Expense Report lists approved expenses only

**Extra check.** CASH-005 expense is present for 2,000. CASH-006 rejected expense is absent. CASH-004 is absent until it is approved.

**Expected result.** HTTP **200**. Sum of the report for KHI equals approved expenses in that range.

### RPT-018 — Income Report respects the source invoices

**Extra check.** The sent GBP invoice’s PKR commission (35,500 at rate 355 on a 100 GBP commission) appears in a range that contains the invoice date. The draft that was never sent does not.

**Expected result.** HTTP **200**. Amounts are PKR. Date filter is covered again in RPT-030; this case is the tie-back to invoices.

### RPT-019 — Receivable ageing shows only open invoices

**Extra check.** A sent unpaid invoice appears in an age bucket based on its date. The fully received E2E invoice does not appear as outstanding. A partial invoice appears for the **open** balance only.

**Expected result.** HTTP **200**. Outstanding total equals the sum of invoice open balances, not the original gross.

### RPT-020 — Payable ageing shows only unpaid commissions

**Extra check.** A **Pending** or **Partial** sub-agent commission appears for the outstanding amount. The **Paid** commission from SA-006 does not.

**Expected result.** HTTP **200**. Outstanding total matches the commission sheet’s unpaid balance for the same branch.

### RPT-021 — Petty Cash report matches the register

**Extra check.** Same rows as Petty Cash for KHI in the range: the 5,000 in and the 1,500 out.

**Expected result.** HTTP **200**. Opening/closing or running total agrees with the petty balance. LHR `ISO-B-PETTY` is absent when the viewer is Ahmed.

### RPT-022 — WHT Summary matches Tax Compliance

**Extra check.** Period **2026-09** (or the month of REV-006). WHT on this report equals WHT receivable and WHT payable on Tax Compliance for the same period and branch.

**Expected result.** HTTP **200**. The 3,550 WHT from the worked remittance is included when that remittance’s date is in the period. `GET /reports/wht-summary?period=2026-09`.

### RPT-023 — GST/SRB Summary matches Tax Compliance

**Extra check.** Period **2026-09**. GST input and SRB/SST match TAX-007’s figures for the same period.

**Expected result.** HTTP **200**. A rejected expense’s GST is absent. Query `?period=2026-09`.

### RPT-024 — Salary Tax Summary matches paid payroll

**Extra check.** Period of the paid run (PAY-008 / E2E-009). Tax on the report equals the run’s salary tax. An unpaid processed run is excluded unless Tax Compliance includes it — then both reports must still match each other.

**Expected result.** HTTP **200**. Figure equals TAX-008 for that period. Query `?period=2026-09` when the run is in September 2026.

### RPT-025 — Commission earned vs received

**Extra check.** Earned includes the sent invoice commission. Received includes the allocated remittance. A draft is in neither column. A sent unpaid invoice is earned and not received.

**Expected result.** HTTP **200**. Earned − received is the open commission, consistent with receivable ageing for the same invoices.

### RPT-026 — Sub-agent payout summary

**Extra check.** The partial payment and the final payment (SA-005, SA-006) appear against the QA agent. Unpaid commission is not shown as paid.

**Expected result.** HTTP **200**. Paid total equals the cash you recorded. WHT on the payout agrees with the payment screen.

### RPT-027 — Net margin per student

**Extra check.** For Student A: margin = commission earned minus the sub-agent share booked for that student. Use the 1,000 GBP / 10% / FX 355 example when that is the invoice you created.

**Expected result.** HTTP **200**. One row for Student A (or the student is included in a row you can identify). Margin is not the full commission when a sub-agent share exists. A student with no invoice may be omitted or zero; they must not inherit another student’s margin.

---

### RPT-028 — Trial balance exports to CSV

| | |
| --- | --- |
| **FSD** | FR-RPT-03 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. On Trial Balance, click **CSV** (wording may be Export).
2. Open the file. Also `GET /reports/trial-balance/csv` with the admin token.

**Expected result**

- HTTP **200**. `Content-Type` is CSV or text, not JSON.
- The file contains a header row and commas.
- A column of amounts matches the on-screen trial balance.
- There is no “PDF not available” blocker on CSV. PDF may be absent; that is out of scope and must not remove CSV.

---

### RPT-029 — Branch Income CSV respects the date filter

| | |
| --- | --- |
| **FSD** | FR-RPT-03, FR-RPT-04 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. Export **Branch Income** for `from=2026-01-01` and `to=2026-12-31`.
2. Export again for a range that excludes your QA invoice date.
3. Compare row counts.

**Expected result**

- Both downloads return **200** and a non-empty file (header at minimum).
- The wide range includes the QA invoice income.
- The narrow range excludes it.
- Counsellor export of this URL returns **403** (no file body with numbers).

---

### RPT-030 — Income report date filter

| | |
| --- | --- |
| **FSD** | FR-RPT-04 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. Open Income Report.
2. Set from **2026-01-01** to **2026-12-31**. Apply.
3. `GET /reports/income-report?from=2026-01-01&to=2026-12-31`.

**Expected result**

- HTTP **200**.
- Every row’s date is inside the range.
- Clearing the filter (or widening it) can show more rows. It never shows rows outside an applied range.

---

### RPT-031 — Branch filter limits Branch Income to one branch

| | |
| --- | --- |
| **FSD** | FR-RPT-04 |
| **Priority** | P1 |
| **Type** | Functional + security |

**Steps**

1. As Super Admin, open Branch Income filtered to **KHI** (`branchId` = KHI).
2. Repeat for **LHR**.
3. As `ahmed@saa.com`, open the same report and try to pass LHR’s id.

**Expected result**

- Super Admin KHI export/report does not include LHR income lines.
- LHR filter does not include KHI.
- Ahmed receives **403** or a KHI-only result when he asks for LHR. He never receives LHR figures.

---

### RPT-032 — University filter on University-wise P&L

| | |
| --- | --- |
| **FSD** | FR-RPT-04 |
| **Priority** | P2 |
| **Type** | Functional |

**Steps**

1. Open University-wise P&L.
2. Filter to one university that has a sent invoice.
3. `GET /reports/university-wise-pl?universityId=<id>`.

**Expected result**

- HTTP **200**.
- Rows are only that university.
- An unknown university id returns an empty set or **404**, not every university.

---

### RPT-033 — Counsellor P&L net profit field

| | |
| --- | --- |
| **FSD** | FR-RPT-06 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. As Super Admin, open Counsellor P&L (`/reports` → Counsellor, slug `counsellor`).
2. Read columns. Find net profit.
3. For one counsellor row, compute Profit/(Loss) − Outstanding.

**Expected result**

- HTTP **200**.
- A net profit column exists (`netProfitPKR` or a header containing “net”).
- The arithmetic matches FR-RPT-06.
- Fatima, signed in as herself, sees only her own row (or only rows for her students), not every counsellor’s earnings.

---

### RPT-034 — Counsellor cannot open Trial Balance or its CSV

| | |
| --- | --- |
| **FSD** | FR-RPT-05 |
| **Priority** | P1 |
| **Type** | Security |

**Steps**

1. Sign in as `fatima@saa.com`.
2. Open `/reports/trial-balance`.
3. `GET /reports/trial-balance` and `GET /reports/trial-balance/csv`.
4. Confirm she **can** open Country-wise and University-wise.

**Expected result**

- Trial balance page and both API calls return **403** with no financial rows and no CSV of accounts.
- Country-wise and University-wise return **200** and only her students.
- This duplicates RBAC-009 on purpose: run it again on the report UI after any change to the hub.
