# End to end — E2E-001 … E2E-010

**Purpose.** These cases walk a business outcome across modules. They are not duplicates you can skip because a unit case passed on a different day. Run them on the **build you intend to ship**, in order, on a known fiscal lock (cleared at the start).

**Branch:** KHI unless a case says otherwise.  
**Prefix:** `E2E-<date>-` on every code you create.

---

### E2E-001 — Money path from student to the general ledger

| | |
| --- | --- |
| **FSD** | §11 acceptance item 2; FR-STU, FR-REV, FR-SA, FR-CASH, FR-GL |
| **Priority** | P1 |
| **Type** | End to end |

**Steps**

1. Sign in as Super Admin. Confirm fiscal lock is clear. Note KHI bank balance and KHI petty balance.
2. Create student `E2E-<date>-STU` on **KHI**, counsellor Fatima, university any active UK university, tuition 10,000 GBP, commission rate 10%, currency GBP, status **Applied**.
3. Create a draft commission invoice: fee 1,000 GBP, rate on the line 10%, FX **355**. Save. **Send**.
4. Record remittance: gross PKR **35,500**, WHT **3,550**, net **31,950**, KHI bank, allocate 100% to this invoice.
5. Create or select a sub-agent `E2E Agent`. Raise commission at 10% of the fee (gross payable 35,500 PKR before WHT, or the screen’s WHT-reduced net). Pay that net from the KHI bank.
6. As `ahmed@saa.com`, submit expense `E2E expense` for **2,000** PKR, KHI, bank or cash.
7. As Super Admin, approve that expense.
8. Open the invoice, the journal register, trial balance (KHI), bank balance, and Branch Income / Expense for the invoice and expense dates.

**Expected result**

- Student exists and is visible to Fatima and to Ahmed, and not to Sara.
- Invoice status is **Fully Received**. One accrual journal and one remittance journal, each balanced, branch KHI.
- Sub-agent commission is **Paid**. Payment journal balanced. Bank has moved by the net receipt and the net payout.
- Expense is approved and has one balanced journal. The rejected path was not used.
- Trial balance debits = credits.
- Branch Income includes the commission. Branch Expenses includes the 2,000. Branch Cash Position matches the bank screen for KHI.
- Write the invoice number, journal numbers, and the three PKR amounts in the actual result.

---

### E2E-002 — Counsellor isolation across list, dashboard, and reports

| | |
| --- | --- |
| **FSD** | BR-06, FR-DASH-03, FR-RPT-05 |
| **Priority** | P1 |
| **Type** | End to end — security |

**Steps**

1. Sign in as `fatima@saa.com` in a private window.
2. Open Dashboard, Master Sheet (all pages), and Reports.
3. Open a direct URL to trial balance and to the E2E student only if she is the counsellor; also request one student id that belongs to someone else (create that student as admin first if needed).

**Expected result**

- Dashboard and Master Sheet show only her students. The E2E student from E2E-001 is visible **because** she is the counsellor. A student assigned to anyone else is not.
- Report hub shows exactly the three Operations reports.
- Trial balance, branch income, and settings users return **403** in the UI and the API.
- She cannot create an invoice or an expense.

---

### E2E-003 — Branch manager cannot cross into the other branch

| | |
| --- | --- |
| **FSD** | §4.2, acceptance isolation |
| **Priority** | P1 |
| **Type** | End to end — security |

**Steps**

1. As `sara@saa.com` (LHR), create student `E2E-<date>-LHR` (or note an existing LHR student id).
2. Sign in as `ahmed@saa.com`.
3. Search that code on Master Sheet.
4. `GET /students/<LHR id>`, `GET /invoices?branchId=<LHR>`, `GET /reports/branch-income?branchId=<LHR>` with Ahmed’s token.
5. Try to create an expense with `branchId` = LHR.

**Expected result**

- Search shows nothing.
- Each API call is **403** or returns only KHI data with **zero** LHR rows.
- The expense is not stored on LHR.
- Sara still sees her student.

---

### E2E-004 — Fiscal lock stops invoice send and journals, then releases

| | |
| --- | --- |
| **FSD** | BR-02 |
| **Priority** | P1 |
| **Type** | End to end — negative |

**Steps**

1. Set fiscal lock to **2099-12-31**.
2. Try to send a new draft invoice dated today.
3. Try to save a balanced manual journal dated today.
4. Clear the lock.
5. Send a new draft and save a balanced journal dated today.

**Expected result**

- Both locked attempts return **4xx** and post nothing.
- Both attempts after the clear return **2xx** and post balanced journals.
- Lock value after the clear is empty (or the value you restored). Record it.

---

### E2E-005 — Draft journal stays out of the trial balance until approval

| | |
| --- | --- |
| **FSD** | BR-01 |
| **Priority** | P1 |
| **Type** | End to end |

**Steps**

1. Export or screenshot KHI trial balance totals.
2. As Ahmed, save a draft journal debit/credit **25,000**, narration `E2E draft`.
3. Reload trial balance as Super Admin. Compare totals.
4. Approve the journal as Super Admin.
5. Reload trial balance again.
6. Reverse it so the cycle does not leave a 25,000 plug, unless you want it in income testing. If you reverse, totals return to the original.

**Expected result**

- After step 3, totals are unchanged and the journal is Pending.
- After step 4, the two accounts have moved by 25,000 and the journal is Approved.
- Debits still equal credits.

---

### E2E-006 — Tax summary picks up the money path

| | |
| --- | --- |
| **FSD** | FR-TAX-03 |
| **Priority** | P1 |
| **Type** | End to end |

**Steps**

1. Note the period of the E2E-001 remittance (the month of its date) and of the paid payroll if PAY-008 was in that month.
2. Open Tax Compliance for that `YYYY-MM`, branch KHI and All.
3. Add a manual WHT adjustment of 10 PKR and delete it.

**Expected result**

- WHT receivable includes the 3,550 from E2E-001 (KHI). All-branches is greater than or equal to KHI.
- After the +10 adjustment the total rises by 10; after delete it returns.
- Salary tax includes a paid run in that month and excludes a mere draft run.

---

### E2E-007 — Filtered CSV matches the on-screen report

| | |
| --- | --- |
| **FSD** | FR-RPT-03, FR-RPT-04 |
| **Priority** | P1 |
| **Type** | End to end |

**Steps**

1. Open Branch Income for **2026-01-01 … 2026-12-31**, branch KHI.
2. Note row count and one amount.
3. Export CSV with the same filters.
4. Open the CSV.

**Expected result**

- Row count matches (allowing for the header).
- The noted amount is in the file.
- LHR-only income from E2E-003 is absent.
- File opens in Excel without a broken encoding of the branch name.

---

### E2E-008 — The path above is in the audit trail

| | |
| --- | --- |
| **FSD** | NFR-03 |
| **Priority** | P1 |
| **Type** | End to end |

**Steps**

1. Open Audit Trail as Super Admin.
2. Find the E2E student create, the invoice send, the expense approval, and the journal approval from E2E-005.

**Expected result**

- All four are present, with the correct actor (Ahmed created the draft and the expense; Super Admin approved).
- Timestamps are in order.
- Pagination still works (`total` includes these rows).

---

### E2E-009 — Payroll run pays and posts

| | |
| --- | --- |
| **FSD** | FR-PAY-03 |
| **Priority** | P1 |
| **Type** | End to end |

**Steps**

1. If PAY-008 already paid the only KHI employees for this month, use a new period or a new employee `E2E Emp` basic 40,000.
2. Process the run. Read tax (900 if basic is 40,000 and allowances are 0 — see PAY-003).
3. Pay from the KHI bank.
4. Try to pay again.

**Expected result**

- Tax matches the helper before you pay.
- First pay posts one balanced journal and reduces the bank by the net.
- Second pay is rejected.
- The run appears on the salary tax summary for that period.

---

### E2E-010 — Invoice status lifecycle on one document

| | |
| --- | --- |
| **FSD** | FR-REV-06 |
| **Priority** | P1 |
| **Type** | End to end |

**Steps.** On a **new** invoice (do not reuse the fully received E2E-001 invoice):

1. Save draft. Record status.
2. Send. Record status.
3. Allocate a receipt for roughly half the PKR. Record status.
4. Allocate the rest. Record status.
5. Close if the action exists.

**Expected result**

- Draft → Sent → Partially Received → Fully Received → Closed.
- You never see Fully Received while a balance remains.
- Each status matches `GET /invoices/:id` after refresh.
- Journals exist only from the send step onward, plus each receipt. The draft had none.
