# General ledger — GL-001 … GL-014

**Module:** Chart of accounts, journals, trial balance, party ledgers, fiscal lock  
**FSD:** FR-GL-01 … FR-GL-07, BR-01, BR-02, BR-03, BR-08  
**Routes:** `/general-ledger`, `/journal-entries`, `/ledgers/student`, `/ledgers/vendor`, `/ledgers/sub-agent`

**Preconditions.** Fiscal lock clear except GL-010. Actor: Super Admin for setup; approval of a manual journal must be a **different** user from the creator when segregation is enforced (creator `ahmed@saa.com` or `sara@saa.com` on her own branch, approver Super Admin).

Pick two posting accounts of the right type from the chart (example: an expense and a bank, or two balance-sheet accounts the journal form allows). Call them **Dr account** and **Cr account**.

---

### GL-001 — Chart of accounts can be extended

| | |
| --- | --- |
| **FSD** | FR-GL-01 |
| **Priority** | P1 |
| **Type** | Functional |

**Test data.** Code `QA<unique 4 digits>`. Name `QA Expense Account`. Type **expense**. Active.

**Steps**

1. Open the chart of accounts (General Ledger page or Settings masters for GL accounts).
2. Create the account.
3. Reload and confirm it is offered on a new journal line.

**Expected result**

- Create returns **201** (if the API allows new accounts) or the seeded chart already contains asset, liability, equity, income, and expense and this case verifies those types in GL-002. A 403 for a role that should manage accounts is a **Fail** for Super Admin.
- The new account’s type is expense, not a free-text type.

---

### GL-002 — All five account types exist

| | |
| --- | --- |
| **FSD** | FR-GL-01 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. `GET /gl-accounts` as Super Admin.
2. List distinct `type` values.

**Expected result**

- The set includes **asset, liability, equity, income, expense**.
- Every account has exactly one of those types.
- Inactive accounts can be hidden from new journals but remain on historical lines.

---

### GL-003 — A balanced manual journal can be saved

| | |
| --- | --- |
| **FSD** | FR-GL-02 |
| **Priority** | P1 |
| **Type** | Functional |

**Test data.** Date today. Branch KHI. Narration `QA balanced JE`. Line 1: Dr account **1,000**. Line 2: Cr account **1,000**.

**Steps**

1. Open **Accounting → Journal Entries**.
2. Create the draft and save.
3. Reopen it.

**Expected result**

- Save returns **201**.
- Status is draft / **Pending** approval, not yet in the trial balance (confirm after GL-009’s method: draft must not change TB).
- Displayed debit total equals credit total.

---

### GL-004 — An unbalanced journal is rejected

| | |
| --- | --- |
| **FSD** | FR-GL-02, BR-03 |
| **Priority** | P1 |
| **Type** | Negative |

**Test data.** Debit **1,000**. Credit **900**. Same accounts and branch.

**Steps**

1. Save the journal.
2. Search the register for the narration `QA unbalanced`.

**Expected result**

- API returns **400**.
- Nothing is posted and nothing is left as an approved journal.
- The UI shows that debits and credits do not match. It does not “fix” the numbers silently.

---

### GL-005 — Rounding tolerance

| | |
| --- | --- |
| **FSD** | BR-03 |
| **Priority** | P2 |
| **Type** | Boundary |

**Steps**

1. Submit a journal with debit **100.00** and credit **100.004** (or the smallest difference you can type).
2. Submit a second journal with debit **100.00** and credit **100.05**.

**Expected result**

- A difference inside the product’s rounding tolerance (1 paisa / 0.01 PKR, or the tolerance in the journal service) is accepted or rounded and still balances after save.
- A difference of 0.05 PKR is **rejected** if the tolerance is 0.01. Record the actual tolerance if the first call’s behaviour differs, and fail the case when a clearly unbalanced journal (GL-004) was accepted.
- After save, stored debit total equals stored credit total.

---

### GL-006 — Approving a journal posts it to the trial balance

| | |
| --- | --- |
| **FSD** | FR-GL-03, BR-01 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. Note the trial balance amount for the Dr account (approved lines only).
2. Approve the GL-003 journal as a user who is not the requester.
3. Reload the trial balance and the journal.

**Expected result**

- Approve returns **2xx**. Status is **Approved**.
- The Dr account balance moves by 1,000 in the debit direction. The Cr account moves by 1,000.
- The journal shows an approver different from the creator.
- Auto-posted documents (invoice send, remittance) also appear in this register with their source link. Open one invoice accrual and confirm the link opens the invoice.

---

### GL-007 — Reversing an approved journal posts the opposite entry

| | |
| --- | --- |
| **FSD** | FR-GL-03, BR-08 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. Reverse the approved GL-003 journal. Date today. Reason `QA reversal`.
2. Reload both journals and the two account balances.

**Expected result**

- Reversal returns **201**. A new approved journal exists with debits and credits swapped.
- Net effect on both accounts from the pair is zero.
- The original journal remains. It is not deleted.
- Reversing a draft is rejected.

---

### GL-008 — A draft does not affect the trial balance

| | |
| --- | --- |
| **FSD** | BR-01 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. Note trial balance totals and the Dr account balance.
2. Save a new **draft** (do not approve): debit 50,000 / credit 50,000. Narration `QA draft only`.
3. Reload the trial balance without approving.

**Expected result**

- Draft status is **Pending**.
- Trial balance totals and the Dr account balance are unchanged.
- The draft appears on the journal list so it can still be approved or discarded.

---

### GL-009 — Trial balance uses approved lines and balances

| | |
| --- | --- |
| **FSD** | FR-GL-04 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. Open **General Ledger** trial balance as Super Admin, branch **All** and then **KHI**.
2. Sum the debit column and the credit column.
3. `GET /gl/trial-balance`.

**Expected result**

- HTTP **200**. Response has `rows`.
- Total debits = total credits (within 1 PKR).
- The unapproved `QA draft only` journal is excluded.
- KHI filter excludes LHR-only balances.
- Account activity for one account lists the approved QA journal and the reversal, and not the draft.

---

### GL-010 — Fiscal lock blocks a journal dated inside the lock

| | |
| --- | --- |
| **FSD** | FR-GL-05, BR-02 |
| **Priority** | P1 |
| **Type** | Negative |

**Steps**

1. Set **Fiscal period locked until** to `2099-12-31`.
2. Save a balanced journal dated today.
3. Clear the lock.
4. Save the same journal again.

**Expected result**

- While locked, save or approve returns **4xx**. No approved lines.
- After the lock is cleared, the same payload returns **201**.
- A date after the lock (only if you set a past lock, for example lock = yesterday and date = today) is allowed. A date on the lock date is blocked.

---

### GL-011 — Student ledger

| | |
| --- | --- |
| **FSD** | FR-GL-06 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. Open **Tax & Ledgers → Student Ledger**.
2. Select Student A (the invoiced student).
3. Read invoice, receipt, and running balance.

**Expected result**

- HTTP **200**.
- The sent invoice increases the student/receivable position. The remittance decreases it.
- Running balance matches the invoice open balance from Revenue.
- Another branch’s student is not selectable by Ahmed.

---

### GL-012 — Vendor ledger

| | |
| --- | --- |
| **FSD** | FR-GL-06 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. Open **Vendor Ledger**.
2. Select `QA Vendor` from CASH-004 (create a vendor and an approved expense first if the list is empty).

**Expected result**

- HTTP **200** when the vendor exists.
- The approved expense appears. The rejected expense from CASH-006 does not affect the balance.
- Running balance is explained by the lines shown. An empty vendor list with a broken page (error toast, 500) is a **Fail**.

---

### GL-013 — Sub-agent ledger agrees with payments

| | |
| --- | --- |
| **FSD** | FR-GL-06, FR-SA-05 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. Open **Sub-Agent Ledger** for the QA agent used in SA-009.
2. Compare the closing balance to the commission outstanding.

**Expected result**

- HTTP **200**.
- Closing balance equals the commission outstanding (0 if SA-006 paid it in full).
- This is the same ledger as SA-009; both must agree. A difference between the two screens is a **Fail**.

---

### GL-014 — Journal list is paginated

| | |
| --- | --- |
| **FSD** | FR-GL-07, NFR-04 |
| **Priority** | P2 |
| **Type** | Functional |

**Steps**

1. Open Journal Entries.
2. Move to the next page.
3. Capture `GET /journal-entries?take=&skip=`.

**Expected result**

- Response has a page of items and a total (or an equivalent server page contract the UI uses).
- Page size is respected.
- Sorting is stable: page 2 does not repeat page 1’s first voucher.
