# Cash and expenses — CASH-001 … CASH-014

**Module:** Petty cash, expenses, bank, cheques, contra  
**FSD:** FR-CASH-01 … FR-CASH-06, BR-02, FR-OPS-02  
**Routes:** `/petty-cash`, `/expenses`, `/bank-cash`, `/contra-entries`, `/approvals`

**Preconditions.** Fiscal lock clear except CASH cases that expect a rejection for another reason. KHI has a petty float large enough for the out-entries below (seed or record a cash-in first). Two bank accounts exist for contra (same branch or the pair the screen allows). Actor for creates: Branch Manager `ahmed@saa.com` (KHI) where segregation of duties matters; Super Admin may approve.

---

### CASH-001 — Petty cash in

| | |
| --- | --- |
| **FSD** | FR-CASH-01 |
| **Priority** | P1 |
| **Type** | Functional |

**Test data.** Branch KHI. Type **In**. Amount **5,000** PKR. Category = an active petty category. Date today. Narration `QA petty in`.

**Steps**

1. Open **Cash & Expenses → Petty Cash**.
2. Record the cash in. Save.
3. Read the KHI petty balance before and after.

**Expected result**

- Save returns **201**.
- Balance increases by 5,000.
- The row shows category, branch KHI, and the narration.
- If the product posts a journal on petty in, the journal balances and the branch is KHI.

---

### CASH-002 — Petty cash out with a category

| | |
| --- | --- |
| **FSD** | FR-CASH-01 |
| **Priority** | P1 |
| **Type** | Functional |

**Test data.** Type **Out**. Amount **1,500**. Category set. Tax fields if shown: enter GST or leave 0. Narration `QA petty out`.

**Steps**

1. Record the cash out on KHI.
2. Read the balance.

**Expected result**

- Save returns **201**.
- Balance falls by 1,500 from the post-CASH-001 balance.
- Category is stored. Tax component is stored as entered (0 is valid).

---

### CASH-003 — Petty cash out cannot exceed the balance

| | |
| --- | --- |
| **FSD** | FR-CASH-01 |
| **Priority** | P1 |
| **Type** | Negative |

**Steps**

1. Note the KHI petty balance **B**.
2. Submit an out of **B + 10,000**.

**Expected result**

- API returns **4xx**. Message states insufficient petty cash.
- Balance remains **B**.
- No journal is posted for the rejected line.

---

### CASH-004 — Submit an expense

| | |
| --- | --- |
| **FSD** | FR-CASH-02 |
| **Priority** | P1 |
| **Type** | Functional |

**Test data.** Branch KHI. Vendor `QA Vendor <unique>` (create the vendor if required). Category = an expense category. Amount **2,000** PKR. Payment mode **Bank** or **Cash** as offered. Date today. Description `QA expense`. Submit as `ahmed@saa.com`, not as the approver you will use next.

**Steps**

1. Open **Cash & Expenses → Expenses**.
2. Create and submit.
3. Open **Operations → Approvals**.

**Expected result**

- Expense is saved (**201**) and is **Pending** (not yet posted to GL).
- It appears in the approvals queue as type Expense.
- Requester is Ahmed.

---

### CASH-005 — Approving an expense posts the GL

| | |
| --- | --- |
| **FSD** | FR-CASH-03 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. Sign in as a different user who may approve (Super Admin, or `sara@saa.com` if her branch scope includes this expense — if Sara is LHR-only she must not approve a KHI expense; use Super Admin).
2. Approve the CASH-004 expense.
3. Open Journal Entries and the expense.

**Expected result**

- Approve returns **2xx**.
- Status is approved. A balanced journal exists. Expense amount hits the expense account and bank or cash.
- Trial balance includes this journal (it is approved).
- The expense no longer sits in the pending queue.

---

### CASH-006 — Rejecting an expense does not post the GL

| | |
| --- | --- |
| **FSD** | FR-CASH-03 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. As Ahmed, submit a second expense `QA expense reject` for **750** PKR.
2. As Super Admin, **Reject** it with a reason.
3. Search journals for that description.

**Expected result**

- Reject returns **2xx**. Status is rejected.
- No journal is posted.
- Bank and petty balances are unchanged by this expense.
- The reason is visible on the expense or the approval history.

---

### CASH-007 — Requester cannot approve their own expense

| | |
| --- | --- |
| **FSD** | FR-CASH-03, FR-OPS-02 |
| **Priority** | P1 |
| **Type** | Security |

**Steps**

1. As `ahmed@saa.com`, submit expense `QA self approve`.
2. Still as Ahmed, open Approvals and approve that same item (UI and, if the button is hidden, `POST` the approve endpoint with Ahmed’s token).

**Expected result**

- Approve returns **403**.
- Status stays pending.
- No journal is posted.
- Super Admin can still approve it afterwards (do so, or reject it, so the queue is not left ambiguous).

---

### CASH-008 — Bank accounts show opening balance

| | |
| --- | --- |
| **FSD** | FR-CASH-04 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. Open **Cash & Expenses → Bank & Cash**.
2. List accounts. Open a KHI account.
3. Compare `GET /bank-accounts`.

**Expected result**

- At least one account per active test branch used in this cycle.
- Each account has an opening balance field (0 is valid; `null` is a **Fail**).
- Current balance = opening ± posted movements. Ahmed sees only KHI accounts (see BR-ISO-008).

---

### CASH-009 — Record a bank deposit

| | |
| --- | --- |
| **FSD** | FR-CASH-04 |
| **Priority** | P1 |
| **Type** | Functional |

**Test data.** KHI bank. Deposit **8,000** PKR. Date today. Narration `QA deposit`.

**Steps**

1. Record the deposit.
2. Read the balance and the bank book.

**Expected result**

- Save returns **201**.
- Balance increases by 8,000.
- A balanced journal is posted when the screen says movements post to GL.
- Branch is KHI.

---

### CASH-010 — Record a bank withdrawal

| | |
| --- | --- |
| **FSD** | FR-CASH-04 |
| **Priority** | P1 |
| **Type** | Functional |

**Test data.** Same account. Withdrawal **2,000**. Narration `QA withdraw`.

**Steps**

1. Record the withdrawal.
2. Read the balance.

**Expected result**

- Balance falls by 2,000 from the post-deposit balance.
- The withdrawal is listed separately from the deposit.
- Journal balances.

---

### CASH-011 — Transfer between two bank accounts

| | |
| --- | --- |
| **FSD** | FR-CASH-04 |
| **Priority** | P1 |
| **Type** | Functional |

**Preconditions.** Two bank accounts, A and B. Note both balances.

**Steps**

1. Transfer **1,000** from A to B. Date today.
2. Refresh both balances.

**Expected result**

- A decreases by 1,000. B increases by 1,000.
- Transfer returns **201**. One balanced journal (or a linked pair) — debit and credit accounts are the two banks, not income.
- Total cash+bank across A and B is unchanged.

---

### CASH-012 — Issue a cheque and mark it cleared

| | |
| --- | --- |
| **FSD** | FR-CASH-05 |
| **Priority** | P2 |
| **Type** | Functional |

**Test data.** New cheque on KHI bank. Payee `QA Payee`. Amount **500**. Number `QA-CHQ-<unique>`. Status path: issued → cleared.

**Steps**

1. On Bank & Cash, issue the cheque.
2. Mark it **cleared**.
3. Read the cheque list and the bank balance.

**Expected result**

- Cheque is stored (**201**) with number, payee, amount, and bank.
- After clear, status is cleared and the bank balance reflects the clearance rule the product uses (cleared cheques reduce the book balance; issued-but-not-cleared follow the screen’s definition — record the before/after so the rule is consistent on CASH-013).
- Issued, cleared, and bounced are all available statuses.

---

### CASH-013 — A bounced cheque reverses the clearance effect

| | |
| --- | --- |
| **FSD** | FR-CASH-05 |
| **Priority** | P2 |
| **Type** | Functional |

**Steps**

1. Issue a second cheque for **400** and clear it. Note the balance.
2. Mark that cheque **bounced**.

**Expected result**

- Status becomes bounced (**200** on the status update).
- The bank balance returns to the pre-clearance figure for this 400 (the bounce undoes the clear).
- The cheque remains in the register. It is not deleted.

---

### CASH-014 — Contra entry posts a journal

| | |
| --- | --- |
| **FSD** | FR-CASH-06 |
| **Priority** | P1 |
| **Type** | Functional |

**Route.** `/contra-entries` (command palette **Contra Entries**, or the URL).

**Steps**

1. Create a contra: type **Bank to bank** (or Cash to bank) for **600** PKR between two KHI accounts. Date today.
2. Save.
3. Open the journal and both account balances.

**Expected result**

- Save returns **201**.
- Journal debits = credits = 600 (plus any paired lines).
- Source account decreases and destination increases by 600.
- Contra is listed with date, type, and amount. Branch is KHI.
