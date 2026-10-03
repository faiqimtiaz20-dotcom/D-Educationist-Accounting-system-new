# Payroll — PAY-001 … PAY-012

**Module:** Employees, salary tax, runs, reimbursements  
**FSD:** FR-PAY-01 … FR-PAY-05, BR-02, BR-09  
**Route:** `/payroll`  
**Formula:** see the worked table in [TEST-CASES.md](../TEST-CASES.md). Gross = basic + allowances. Taxable monthly = gross × 0.9. Annual taxable = taxable monthly × 12. Annual tax is 2.5% up to 600,000, 7.5% up to 1,200,000, otherwise 12.5%. Monthly tax = round(annual tax / 12). Net = round(gross − monthly tax).

**Preconditions.** Fiscal lock clear except PAY-009. KHI bank account exists. Actor Super Admin unless noted.

---

### PAY-001 — Create an employee

| | |
| --- | --- |
| **FSD** | FR-PAY-01 |
| **Priority** | P1 |
| **Type** | Functional |

**Test data.** Name `QA Emp <unique>`. Branch **KHI**. Designation `Counsellor`. Basic **50,000**. Allowances **10,000**. Email `qa.emp.<unique>@example.com`. Active.

**Steps**

1. Open **Operations → Payroll**.
2. Add the employee. Save. Reopen.

**Expected result**

- `POST /employees` returns **201**.
- Gross shown = **60,000**.
- Branch is KHI. Ahmed can see this employee; Sara (LHR) cannot.

---

### PAY-002 — 10% of gross is exempt before brackets

| | |
| --- | --- |
| **FSD** | FR-PAY-02, BR-09 |
| **Priority** | P1 |
| **Type** | Functional |

**Test data.** Basic **100,000**. Allowances **0**.

**Steps**

1. Enter these figures in the salary tax helper on the payroll screen (or create a throwaway employee and read the computed tax).
2. Compute by hand: taxable monthly = 90,000; annual taxable = 1,080,000; tax = 7.5%; monthly tax = round(81,000 / 12) = **6,750**; net = **93,250**.

**Expected result**

- Helper shows gross **100,000**, monthly tax **6,750**, net **93,250**.
- Tax is not computed on the full 100,000 (that would be a different monthly tax). Exempting 10% is visible in the breakdown if the UI shows taxable pay; if it only shows the tax amount, the amount must still be 6,750.

---

### PAY-003 — Bracket 2.5% when annual taxable is at or under 600,000

| | |
| --- | --- |
| **FSD** | FR-PAY-02 |
| **Priority** | P1 |
| **Type** | Functional |

**Test data.** Basic **40,000**. Allowances **0**. Annual taxable = 432,000.

**Steps.** Run the helper.

**Expected result.** Monthly tax **900**. Net **39,100**. Annual tax = 432,000 × 0.025 = 10,800.

---

### PAY-004 — Bracket 7.5% between 600,000 and 1,200,000

| | |
| --- | --- |
| **FSD** | FR-PAY-02 |
| **Priority** | P1 |
| **Type** | Functional |

**Test data.** Basic **80,000**. Allowances **0**. Annual taxable = 864,000.

**Expected result.** Monthly tax **5,400**. Net **74,600**.

Boundary check (same case, second step): basic such that annual taxable is exactly **600,000** uses **2.5%**, and **600,001** uses **7.5%**. Annual taxable = gross × 0.9 × 12, so gross = 600,000 / 10.8 = **55,555.56** sits on the 2.5% side. Record the UI’s rounding. A gross that is clearly inside a bracket must use that bracket.

---

### PAY-005 — Bracket 12.5% above 1,200,000

| | |
| --- | --- |
| **FSD** | FR-PAY-02 |
| **Priority** | P1 |
| **Type** | Functional |

**Test data.** Basic **150,000**. Allowances **0**. Annual taxable = 1,620,000.

**Expected result.** Monthly tax **16,875**. Net **133,125**.

---

### PAY-006 — Create a payroll run for a branch and period

| | |
| --- | --- |
| **FSD** | FR-PAY-03 |
| **Priority** | P1 |
| **Type** | Functional |

**Test data.** Period a month that has no run yet (example `2097-01` if the product allows future periods and the lock is clear — prefer the current month if no run exists). Branch **KHI**. Include the PAY-001 employee.

**Steps**

1. Start a run for that period and branch.
2. Open the run lines.

**Expected result**

- Create/process call returns **2xx**.
- The line shows the employee, gross 60,000, tax computed with BR-09 on basic 50,000 + allowances 10,000, and net = gross − tax.
- A second run for the same branch and period is rejected or reopens the same run. It must not pay the employee twice.

---

### PAY-007 — Process calculates every active employee in the branch

| | |
| --- | --- |
| **FSD** | FR-PAY-03 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. Process the run (if create did not already calculate).
2. Compare the employee count on the run to active KHI employees.

**Expected result**

- Process returns **2xx**.
- Every active KHI employee is a line. Inactive employees are omitted.
- LHR employees are omitted.
- Status is processed / ready to pay, and **no bank journal exists yet**.

---

### PAY-008 — Pay posts a journal

| | |
| --- | --- |
| **FSD** | FR-PAY-03 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. Pay the run from the KHI bank account. Date inside an open period.
2. Open the journal and the bank balance.
3. Open the tax summary for that period (TAX-008).

**Expected result**

- Pay returns **2xx**. Status is **Paid**.
- One balanced journal: salary expense (gross), salary tax payable, bank (net).
- Bank decreases by the total net pay.
- Paying the same run again returns **4xx**.

---

### PAY-009 — Pay is blocked by the fiscal lock

| | |
| --- | --- |
| **FSD** | FR-PAY-03, BR-02 |
| **Priority** | P1 |
| **Type** | Negative |

**Steps**

1. Set fiscal lock to `2099-12-31`.
2. Process a run in an open-looking period that is still on or before the lock, then **Pay**.
3. Clear the lock.

**Expected result**

- Pay returns **4xx**. Run is not Paid. No bank movement.
- After the lock is cleared, pay can succeed.

---

### PAY-010 — Approve a reimbursement

| | |
| --- | --- |
| **FSD** | FR-PAY-04 |
| **Priority** | P1 |
| **Type** | Functional |

**Test data.** Submit as `ahmed@saa.com`: employee = QA Emp, branch KHI, type **Travel**, amount **1,000**, date today, description `QA reimb`.

**Steps**

1. Submit the reimbursement.
2. As Super Admin, approve it from **Approvals** or the payroll reimbursements tab.
3. Read the journal.

**Expected result**

- Submit leaves it pending.
- Approve returns **2xx** and posts a balanced journal for 1,000, or marks it payable per the product rule — the amount must hit GL on approve, not on reject.
- Ahmed cannot approve his own reimbursement (same rule as CASH-007). If he can, **Fail** S1.

---

### PAY-011 — Reject a reimbursement

| | |
| --- | --- |
| **FSD** | FR-PAY-04 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. Submit a second reimbursement for **300**, description `QA reimb reject`.
2. Reject it with a reason.

**Expected result**

- Status is rejected.
- No journal. Bank unchanged.
- The reason is stored.

---

### PAY-012 — Import payroll lines

| | |
| --- | --- |
| **FSD** | FR-PAY-05 |
| **Priority** | P2 |
| **Type** | Functional |

**Steps**

1. Download the payroll import template if the screen has one.
2. Import a file with one line for the QA employee and a period that does not already have a paid run. Use amounts that match PAY-001 (basic 50,000, allowances 10,000) or the columns the template asks for.
3. Open the created run.

**Expected result**

- Import returns **2xx** and creates or fills a run.
- The line matches the file.
- A row with an unknown employee code is reported and not silently dropped into another employee.
- Tax on the imported gross still follows BR-09 unless the file supplies a tax override that the screen says it will honour. If tax is overridden, the net must equal gross − that tax.
