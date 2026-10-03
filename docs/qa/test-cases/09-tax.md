# Tax and compliance — TAX-001 … TAX-008

**Module:** Period tax summary and manual adjustments  
**FSD:** FR-TAX-01 … FR-TAX-03  
**Route:** `/tax-compliance`  
**Period used in this pack:** `2026-09` (September 2026). If you post fresh documents “today”, also run the same checks for the current `YYYY-MM`.

**Preconditions.** Signed in as Super Admin or as Accountant on the branch under test. Remittance WHT (REV-006), a sub-agent payment with WHT (SA-005), an expense or petty line with GST/SRB if those fields were filled, and a paid payroll run (PAY-008) exist **inside the period** you query. If they were dated in another month, either re-date a small adjustment or query that month and say so in the actual result. The case fails if the summary ignores a document you can see in the source screen for the same period.

---

### TAX-001 — Period summary loads for YYYY-MM

| | |
| --- | --- |
| **FSD** | FR-TAX-01 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. Open **Tax & Ledgers → Tax Compliance**.
2. Select period **2026-09**.
3. Confirm `GET /tax/summary?period=2026-09` (use the query name the page sends) returns **200**.

**Expected result**

- The screen shows WHT receivable, WHT payable, GST input, GST output, SRB/SST, and salary tax.
- An invalid period `2026-13` or `Sep-2026` is rejected or normalized. It must not return another month’s figures labelled as 2026-09.
- Branch filter: Super Admin All branches vs KHI changes the totals when the other branch has tax in that month.

---

### TAX-002 — Create a manual tax adjustment

| | |
| --- | --- |
| **FSD** | FR-TAX-02 |
| **Priority** | P1 |
| **Type** | Functional |

**Test data.** Period `2026-09`. Type **WHT receivable** (or the type control’s equivalent). Amount **+100** PKR. Note `QA tax adj`. Branch KHI.

**Steps**

1. Note the WHT receivable total.
2. Add the adjustment. Save.
3. Reload the summary.

**Expected result**

- Create returns **201**.
- WHT receivable increases by 100.
- The adjustment row is listed with note, period, and user.

---

### TAX-003 — Edit a manual adjustment

| | |
| --- | --- |
| **FSD** | FR-TAX-02 |
| **Priority** | P2 |
| **Type** | Functional |

**Steps**

1. Change the QA adjustment from 100 to **150**.
2. Reload the summary.

**Expected result**

- PATCH returns **200**.
- The total moves by **+50** relative to TAX-002 (the 100 is replaced, not added again).
- Source-document WHT (remittances) is unchanged.

---

### TAX-004 — Delete a manual adjustment

| | |
| --- | --- |
| **FSD** | FR-TAX-02 |
| **Priority** | P2 |
| **Type** | Functional |

**Steps**

1. Delete the QA adjustment.
2. Reload the summary.

**Expected result**

- Delete returns **2xx**.
- WHT receivable returns to the pre-TAX-002 figure.
- Live WHT from remittances and payments remains.

---

### TAX-005 — WHT receivable includes remittances

| | |
| --- | --- |
| **FSD** | FR-TAX-01, FR-TAX-03 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. From **Remittance**, sum WHT for KHI (and All, as Super Admin) in September 2026.
2. Compare to the summary’s **WHT receivable**, with manual adjustments at zero.

**Expected result**

- The summary field is present (not null).
- It equals the sum of remittance WHT in that period and branch, plus any other receivable-WHT source the screen documents.
- A remittance you just posted in range appears without a manual refresh beyond reloading the page.

---

### TAX-006 — WHT payable includes sub-agent payments

| | |
| --- | --- |
| **FSD** | FR-TAX-03 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. Sum WHT withheld on sub-agent payments in the period.
2. Compare to **WHT payable** on the summary.

**Expected result**

- The field is present.
- It matches those payments (and petty/expense WHT if the product classifies that as payable — then the sum of those sources must match, and the case notes which sources).
- WHT receivable and WHT payable are not the same number unless the underlying documents really match.

---

### TAX-007 — GST / SRB summary includes expense and petty tax

| | |
| --- | --- |
| **FSD** | FR-TAX-03 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. On one petty-cash out and one approved expense in the period, enter GST input **80** and SRB/SST **20** if the forms have those fields. Approve the expense.
2. Reload the tax summary.

**Expected result**

- `gstInput` and `srbSst` (names may match the API) are present.
- They increase by the amounts you entered.
- A rejected expense does not add its GST.

---

### TAX-008 — Salary tax on the summary matches payroll

| | |
| --- | --- |
| **FSD** | FR-TAX-03, FR-PAY-02 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. Complete PAY-008 for a period inside `2026-09` (or open the summary for the payroll period you actually paid).
2. Read salary tax on the payroll run and on the tax summary.

**Expected result**

- `salaryTax` is present.
- It equals the sum of salary tax on **paid** payroll runs in that period. A processed-but-unpaid run does not count, unless the product documents that it accrues at process time — then process-time is the oracle and PAY-008’s journal period must still match.
- The figure matches the helper brackets in the test-case cover (BR-09), not a different undocumented table.
