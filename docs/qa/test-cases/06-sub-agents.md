# Sub-agents and payables — SA-001 … SA-009

**Module:** Sub-agent master, commission, payments, ledger  
**FSD:** FR-SA-01 … FR-SA-05, BR-02, BR-05  
**Routes:** `/sub-agents`, `/sub-agents/commissions`, `/sub-agents/payments`, `/ledgers/sub-agent`

**Formula (BR-05)**

`gross PKR = fee × (rate / 100) × FX + follow-on bonus`  
`net PKR = gross PKR − WHT`  
Net must be ≤ gross. WHT must be ≥ 0.

**Worked example**

| Input | Value |
| --- | --- |
| Student gross fee | 1,000 GBP |
| Sub-agent rate | 10% |
| FX | 355 |
| Follow-on bonus | 0 |
| Gross payable | 35,500 PKR |
| WHT (if 10%) | 3,550 PKR |
| Net payable | 31,950 PKR |

Use the WHT rate the commission screen applies. If it is not 10%, recompute net = gross − actual WHT and expect **that** net. Do not pass the case when net > gross.

**Preconditions.** Fiscal lock clear. KHI bank account exists. Actor Super Admin unless noted.

---

### SA-001 — Create a sub-agent

| | |
| --- | --- |
| **FSD** | FR-SA-01 |
| **Priority** | P1 |
| **Type** | Functional |

**Test data.** Name `QA Agent <unique>`. Phone and email filled. Bank name, account title, account number, branch KHI (or the master is global if the screen has no branch — record which). Active.

**Steps**

1. Open **Sub-Agents → Sub-Agent Master**.
2. Create the agent. Save. Reopen.

**Expected result**

- `POST /sub-agents` returns **201**.
- Identity and bank details persist.
- The agent appears on the commission sheet’s agent dropdown.

---

### SA-002 — Edit sub-agent bank details

| | |
| --- | --- |
| **FSD** | FR-SA-01 |
| **Priority** | P2 |
| **Type** | Functional |

**Steps**

1. Change the account number to `QA-ACC-<unique>`.
2. Save and reload.

**Expected result**

- PATCH returns **200**.
- The new account number is shown. Historical payments keep the account that was stored on the payment itself, if the payment snapshots it; the master shows the new number.

---

### SA-003 — Commission payable is calculated from fee, rate, FX, and bonus

| | |
| --- | --- |
| **FSD** | FR-SA-02, BR-05 |
| **Priority** | P1 |
| **Type** | Functional |

**Preconditions.** A sent KHI invoice line for Student A with gross fee 1,000 GBP, FX 355, and this sub-agent selected on the student or on the commission row at rate 10%. Bonus 0 unless you add a bonus and add it to 35,500.

**Steps**

1. Open **Sub-Agents → Commission Sheet**.
2. Generate or open the commission for that invoice line.
3. Read gross PKR, rate, FX, bonus, WHT, net.

**Expected result**

- Gross PKR = **35,500** when bonus is 0 and fee/rate/FX match the example.
- With a follow-on bonus of 500, gross PKR = **36,000**.
- `POST` commission returns **201** or the row is created by the invoice flow and is visible.
- Branch of the payable is KHI.

---

### SA-004 — WHT reduces net and net never exceeds gross

| | |
| --- | --- |
| **FSD** | FR-SA-02 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. On the SA-003 commission, read `whtPkr` and `payablePkrNet` versus gross.
2. If WHT is editable, set WHT to 0 and save; then set WHT equal to gross and save; then try WHT greater than gross.

**Expected result**

- `whtPkr` ≥ 0.
- Net = gross − WHT.
- WHT greater than gross is **400**.
- Net ≤ gross always.

---

### SA-005 — A partial payment sets status to Partial

| | |
| --- | --- |
| **FSD** | FR-SA-03, FR-SA-04 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. Note net payable **N** (status should be **Pending** before any payment).
2. Open **Sub-Agents → Payments**.
3. Pay **half of N** (rounded to the nearest rupee, at least 1) from the KHI bank, date today.
4. Reopen the commission.

**Expected result**

- Payment returns **201**.
- Status is **Partial**. Outstanding = N − amount paid.
- A balanced journal posts: expense (or payable clear), WHT if withheld on payment, and bank. Bank decreases by the cash paid.
- Fiscal lock was clear, so the post succeeds.

---

### SA-006 — Paying the remainder sets status to Paid

| | |
| --- | --- |
| **FSD** | FR-SA-03 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. Pay the remaining outstanding from SA-005.
2. Refresh the commission.

**Expected result**

- Status is **Paid**.
- Outstanding is 0.
- A second journal posts for the second cash amount. The two bank credits (payments) sum to the cash actually paid, and do not exceed net.

---

### SA-007 — Payment journal balances

| | |
| --- | --- |
| **FSD** | FR-SA-04, BR-03 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. Open each journal created by SA-005 and SA-006.
2. Sum lines.

**Expected result**

- Each journal: total debit = total credit.
- Source type identifies the sub-agent payment.
- Draft journals do not count. These are approved/posted.
- Trial balance still balances after both payments (GL-009 can be run immediately after).

---

### SA-008 — Payment inside a locked period is rejected

| | |
| --- | --- |
| **FSD** | FR-SA-04, BR-02 |
| **Priority** | P1 |
| **Type** | Negative |

**Steps**

1. Set fiscal lock to `2099-12-31`.
2. Attempt another sub-agent payment dated today.
3. Clear the lock.

**Expected result**

- Payment returns **4xx**. No bank movement. No new journal.
- After the lock is cleared, a payment dated today can succeed again (use a different commission if SA-006 already paid this one in full).

---

### SA-009 — Sub-agent ledger shows a running balance

| | |
| --- | --- |
| **FSD** | FR-SA-05 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. Open **Tax & Ledgers → Sub-Agent Ledger**.
2. Select the QA agent from SA-001.
3. Read the lines for the commission and the two payments.

**Expected result**

- `GET` ledger returns **200**.
- Commission increases the payable (credit or the product’s payable sign). Each payment reduces it.
- Running balance after the final payment is **0** for this commission.
- Another branch’s agent activity is not mixed in when a branch filter is set to KHI. Super Admin with All branches may see all, but each line shows its branch.
