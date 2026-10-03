# Revenue — REV-001 … REV-013

**Module:** Invoices, other invoices, remittance, allocation  
**FSD:** FR-REV-01 … FR-REV-06, BR-02, BR-04, BR-08, BR-10  
**Routes:** `/invoices`, `/other-invoices`, `/receivables`, `/receivables/allocation`

**Preconditions**

- Fiscal lock **cleared** except where a case sets it.
- Student from STU-001 exists on branch **KHI**, currency GBP, university set, status at least Applied. Code referred to as **Student A**.
- KHI has a bank account.
- Actor: Super Admin, unless noted. Branch on every document is **KHI**.

**Invoice statuses that must exist:** Draft, Sent, Partially Received, Fully Received, Closed.

---

### REV-001 — Create a draft commission invoice linked to a student

| | |
| --- | --- |
| **FSD** | FR-REV-01 |
| **Priority** | P1 |
| **Type** | Functional |

**Test data**

- Branch KHI, university = Student A’s university, currency **GBP**, exchange rate **355** (PKR per 1 GBP).
- One line: Student A, gross fee **1000** GBP, commission rate **10%**. Expected commission = 100 GBP = **35,500 PKR**.

**Steps**

1. Open **Revenue → Invoices**.
2. Create a draft. Add the line. Save.
3. Reopen the draft.

**Expected result**

- Status is **Draft**.
- `POST /invoices` returns **201**. An invoice number is assigned.
- Line is tied to Student A. Currency GBP and rate 355 are stored.
- No journal is posted yet (Journal Register has no accrual for this invoice number).

---

### REV-002 — Draft accepts a second currency on another invoice

| | |
| --- | --- |
| **FSD** | FR-REV-01, BR-10 |
| **Priority** | P2 |
| **Type** | Functional |

**Steps**

1. Create a second draft in **USD** with an exchange rate that exists in the FX table (or an explicit rate on the invoice).
2. Save and reopen.

**Expected result**

- Currency remains USD. The rate is the rate you entered, not a silent overwrite to 1.
- PKR equivalent shown = foreign amount × rate.

---

### REV-003 — Send posts an accrual journal

| | |
| --- | --- |
| **FSD** | FR-REV-02, BR-04 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. Open the REV-001 draft.
2. **Send**.
3. Open **Accounting → Journal Entries** and search the invoice number.
4. Open **Accounting → General Ledger** / trial balance and note receivable and income movement.

**Expected result**

- Status changes from Draft to **Sent**.
- Exactly one accrual journal is created, status **Approved** (auto-posted), debits = credits.
- PKR amount uses rate 355 (100 GBP commission → 35,500 PKR if the line commission is 100 GBP).
- The journal’s branch is KHI.
- The source document link points at this invoice.

---

### REV-004 — Send is blocked when the invoice date is inside the fiscal lock

| | |
| --- | --- |
| **FSD** | FR-REV-02, BR-02 |
| **Priority** | P1 |
| **Type** | Negative |

**Steps**

1. As Super Admin, set **Fiscal period locked until** to `2099-12-31` (**Settings → System Settings**).
2. Create a draft dated today (or any date on/before that lock) and **Send**.
3. Clear the fiscal lock before continuing (`fiscalPeriodLockedUntil` empty).

**Expected result**

- Send returns **4xx**. Status stays **Draft**.
- No accrual journal is created for this invoice.
- After the lock is cleared, a new draft can be sent (do that only if you still need a sent invoice for later cases; keep the REV-003 invoice as the sent one).

---

### REV-005 — Create a non-commission (other) invoice

| | |
| --- | --- |
| **FSD** | FR-REV-03 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. Open **Revenue → Other Invoices**.
2. Create a bill-to invoice (party name `QA Other Bill <unique>`, amount 5000 PKR, branch KHI).
3. Save, then send if the screen has send.

**Expected result**

- `POST` for other invoices returns **201**.
- The document is not forced to have a student line.
- It appears on Other Invoices and not as a university commission line on the commission invoice list.
- If send posts a journal, that journal balances and is branch KHI.

---

### REV-006 — Record a remittance with gross, WHT, and net PKR

| | |
| --- | --- |
| **FSD** | FR-REV-04, BR-04 |
| **Priority** | P1 |
| **Type** | Functional |

**Test data.** Against the sent REV-003 invoice (or a dedicated sent invoice of 35,500 PKR commission):

- Gross PKR: **35,500**
- WHT: **3,550** (10% — use the rate the screen calculates if it overrides this)
- Net: gross − WHT
- Bank: KHI bank account
- Date: today (lock must be clear)

**Steps**

1. Open **Revenue → Remittance**.
2. Record the receipt against the invoice and the KHI bank.
3. Open the invoice and the journal register.

**Expected result**

- Remittance saves (**201**).
- Net PKR = gross − WHT. A net greater than gross is rejected.
- A balanced journal posts: bank (net), WHT receivable, and receivable clearance.
- Invoice status becomes **Fully Received** when the allocated amount covers the invoice, otherwise **Partially Received**.
- Bank balance for that KHI account increases by the net.

---

### REV-007 — Allocate a remittance to one invoice

| | |
| --- | --- |
| **FSD** | FR-REV-05 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. If REV-006 already allocated the full amount on the remittance screen, this case passes when the allocation row exists and the invoice open balance is zero.
2. Otherwise open **Remittance allocation** (`/receivables/allocation`), select the unallocated receipt, allocate 100% to the sent invoice, and save.

**Expected result**

- Allocation returns **2xx**.
- Invoice open balance falls by the allocated PKR.
- The same money cannot remain as unallocated and allocated.

---

### REV-008 — Allocate one bulk remittance across two invoices

| | |
| --- | --- |
| **FSD** | FR-REV-05 |
| **Priority** | P1 |
| **Type** | Functional |

**Preconditions.** Two **Sent** KHI invoices, open balances known (example 10,000 and 5,000 PKR). One remittance of **15,000** gross, WHT 0, net 15,000, not yet fully allocated.

**Steps**

1. Open allocation.
2. Split 10,000 to invoice 1 and 5,000 to invoice 2.
3. Save. Reopen both invoices.

**Expected result**

- Both allocations persist.
- Invoice 1 and invoice 2 move to **Fully Received** (or the correct partial if you allocated less).
- Sum of allocations = remittance net. No negative open balance.

---

### REV-009 — Over-allocation is rejected

| | |
| --- | --- |
| **FSD** | FR-REV-05 |
| **Priority** | P1 |
| **Type** | Negative |

**Steps**

1. On a sent invoice with open balance **B**, try to allocate **B + 1** PKR.
2. Also try to allocate more than the remittance’s unallocated remainder.

**Expected result**

- API returns **4xx**.
- Open balance and unallocated remainder are unchanged.
- The UI explains that the amount exceeds the invoice or the receipt.

---

### REV-010 — Invoice status follows the money

| | |
| --- | --- |
| **FSD** | FR-REV-06 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps.** Using the REV-003/006 invoice (or a fresh one if that one is already fully received), observe status at each point:

1. After save, before send.
2. After send, before any receipt.
3. After a receipt of about half the PKR open balance.
4. After the remainder is allocated.
5. Close the invoice if the UI has **Closed** (only when fully received).

**Expected result**

| Point | Status |
| --- | --- |
| Saved, not sent | Draft |
| Sent, nothing received | Sent |
| Part of the balance allocated | Partially Received |
| Balance covered | Fully Received |
| Closed after fully received | Closed |

- A Draft invoice cannot show Fully Received.
- Status on screen matches `GET /invoices/:id`.

---

### REV-011 — A sent invoice that posted a journal cannot be deleted

| | |
| --- | --- |
| **FSD** | BR-08 |
| **Priority** | P1 |
| **Type** | Negative |

**Steps**

1. On the sent REV-003 invoice, use Delete (UI or `DELETE /invoices/:id`).

**Expected result**

- Delete returns **4xx**.
- The invoice and its accrual journal remain.
- Reversal, if the product offers it, is the supported path and posts an opposite journal. Deletion is not that path.

---

### REV-012 — PKR amounts use the invoice exchange rate

| | |
| --- | --- |
| **FSD** | BR-10 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. On the sent GBP invoice, read commission in GBP and the stored rate (355).
2. Read the accrual journal PKR amount.
3. Calculate foreign commission × 355.

**Expected result**

- Journal PKR = foreign amount × invoice rate, within 1 PKR rounding.
- Changing the FX master **after** send does not rewrite this journal.

---

### REV-013 — Sending twice does not post a second accrual

| | |
| --- | --- |
| **FSD** | FR-REV-02, BR-04 |
| **Priority** | P1 |
| **Type** | Negative |

**Steps**

1. On an already **Sent** invoice, call send again (button or `POST` send endpoint).
2. Count journals whose source is this invoice.

**Expected result**

- Second send returns **4xx**, or it is a no-op.
- Accrual journal count for this invoice stays **1** until a genuine reversal is posted.
- Receivable is not doubled.
