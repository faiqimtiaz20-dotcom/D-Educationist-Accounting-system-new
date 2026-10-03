# Branch isolation — BR-ISO-001 … BR-ISO-020

**Rule.** Super Admin sees every branch. Every other user is confined to the **home branch**. Universities, currencies, FX, and other shared masters are visible to all branches. Students, invoices, remittances, expenses, petty cash, bank balances, journals, and report lines **never** cross branches.

**Actors**

| Code | User | Branch |
| --- | --- | --- |
| A | ahmed@saa.com (Branch Manager) | KHI |
| B | sara@saa.com (Accountant) | LHR |
| SA | admin@saa.com | All |

**Setup (do this once before BR-ISO-001)**

1. As SA, fiscal lock clear.
2. As A, create student `ISO-A-<unique>` on KHI (the UI must not ask him to pick LHR; if it does and he can pick LHR, stop and fail BR-ISO-011).
3. As B, create student `ISO-B-<unique>` on LHR.
4. As SA, confirm both exist when branch = All.
5. Note both student ids, and note one LHR invoice id if any (create a draft LHR invoice as B if the list is empty).

A case **fails** if a response is 200 and the body contains the other branch’s code, name, or id. A 403 with an empty body passes. A 404 that does not echo the other branch’s fields passes for direct-by-id.

Record counts in the actual result (`n`, `foreign`, HTTP status).

---

### BR-ISO-001 — Branch A student list has no Branch B rows

| | |
| --- | --- |
| **Priority** | P1 |
| **Type** | Security |

**Steps.** As A, open Master Sheet and page through every page. `GET /students?take=100` with A’s token. Search for `ISO-B`.

**Expected result.** `ISO-A` is present. `ISO-B` is absent. Every row’s branch is KHI. `foreignLHR = 0`.

---

### BR-ISO-002 — Search does not find the other branch’s student

| | |
| --- | --- |
| **Priority** | P1 |
| **Type** | Security |

**Steps.** As A, search Master Sheet for the exact code `ISO-B-<unique>` and for the student’s last name. Repeat `GET /students?search=<code>`.

**Expected result.** Zero hits. HTTP 200 with an empty page is correct. HTTP 200 with the LHR student is a **Fail**.

---

### BR-ISO-003 — Direct id of a Branch B student is denied

| | |
| --- | --- |
| **Priority** | P1 |
| **Type** | Security |

**Steps.** As A, `GET /students/<ISO-B id>`.

**Expected result.** **403** or **404**. Body does not include the LHR student’s CNIC, phone, or email. **200** is an S1 fail.

---

### BR-ISO-004 — Invoices stay in the home branch

| | |
| --- | --- |
| **Priority** | P1 |
| **Type** | Security |

**Steps.** As A, open **Revenue → Invoices** and `GET /invoices`. Count rows whose branch is LHR.

**Expected result.** `foreignLHR = 0`. KHI invoices may appear. B’s draft invoice is not in the list.

---

### BR-ISO-005 — Remittances stay in the home branch

| | |
| --- | --- |
| **Priority** | P1 |
| **Type** | Security |

**Steps.** As A, open Remittance and `GET /receivables` (or the list path the app uses).

**Expected result.** No LHR receipt. Amounts shown match KHI only.

---

### BR-ISO-006 — Expenses stay in the home branch

| | |
| --- | --- |
| **Priority** | P1 |
| **Type** | Security |

**Steps.** As B, if needed, submit an LHR expense `ISO-B-EXP` and leave it pending. As A, open Expenses and Approvals. `GET /expenses`.

**Expected result.** `ISO-B-EXP` is not visible to A and cannot be approved by A. A’s expense list has `foreignLHR = 0`.

---

### BR-ISO-007 — Petty cash stays in the home branch

| | |
| --- | --- |
| **Priority** | P1 |
| **Type** | Security |

**Steps.** As B, record a petty in of 100 PKR narration `ISO-B-PETTY` if LHR has a float. As A, open Petty Cash and `GET /petty-cash`.

**Expected result.** A does not see `ISO-B-PETTY`. A’s balance does not include that 100.

---

### BR-ISO-008 — Bank accounts and balances stay in the home branch

| | |
| --- | --- |
| **Priority** | P1 |
| **Type** | Security |

**Steps.** As A, open Bank & Cash. `GET /bank-accounts` and the balance endpoint the page uses.

**Expected result.** Every account’s branch is KHI. No LHR account number is shown. LHR balance is not added into KHI’s cash position.

---

### BR-ISO-009 — Journals and trial balance stay in the home branch

| | |
| --- | --- |
| **Priority** | P1 |
| **Type** | Security |

**Steps.** As A, open Journal Entries (page through) and Trial Balance. `GET /journal-entries` and `GET /gl/trial-balance`.

**Expected result.** No journal with branch LHR. Trial balance HTTP **200** and its scope is KHI. An LHR accrual from B’s invoice is absent.

---

### BR-ISO-010 — Branch reports for A contain only KHI

| | |
| --- | --- |
| **Priority** | P1 |
| **Type** | Security |

**Steps.** As A, open Branch Income and Branch Cash Position. `GET /reports/branch-income` and `GET /reports/branch-cash`.

**Expected result.** Both **200**. No LHR column, row, or amount. KHI figures are present (or a true zero if KHI has no income). CSV export of Branch Income also has no LHR (see BR-ISO-020).

---

### BR-ISO-011 — Forged branchId on query and body is rejected

| | |
| --- | --- |
| **Priority** | P1 |
| **Type** | Security |

**Steps.** With A’s token:

1. `GET /students?branchId=<LHR id>`.
2. `GET /reports/branch-income?branchId=<LHR id>`.
3. `POST /students` with required fields and `"branchId": "<LHR id>"`.
4. `POST /expenses` with `"branchId": "<LHR id>"`.

**Expected result.** Each call **403** (or the create is forced to KHI **and** a follow-up as B does not show the row — forced-to-home is acceptable only if the response branchId is KHI and B cannot see a KHI row). A row stored as LHR is a **Fail**. The report body contains no LHR amounts.

---

### BR-ISO-012 — A broad search still cannot see the other branch

| | |
| --- | --- |
| **Priority** | P1 |
| **Type** | Security |

**Steps.** As A, search students with `search=ISO` (matches both `ISO-A` and `ISO-B`). Repeat on invoices and expenses if those screens have search.

**Expected result.** Hits include `ISO-A` only. `foreign = 0`.

---

### BR-ISO-013 — Super Admin can open Branch A

| | |
| --- | --- |
| **Priority** | P1 |
| **Type** | Functional |

**Steps.** As SA, set branch filter to **KHI**. Open Master Sheet. `GET /students?branchId=<KHI id>`.

**Expected result.** HTTP **200**. `ISO-A` is in the list. `ISO-B` is not in this filtered list.

---

### BR-ISO-014 — Super Admin can open Branch B

| | |
| --- | --- |
| **Priority** | P1 |
| **Type** | Functional |

**Steps.** As SA, set the filter to **LHR**. Search `ISO-B`.

**Expected result.** HTTP **200**. `ISO-B` is visible. `ISO-A` is not in the LHR filter.

---

### BR-ISO-015 — Super Admin “all branches” shows both markers

| | |
| --- | --- |
| **Priority** | P1 |
| **Type** | Functional |

**Steps.** As SA, clear the branch filter / choose **All branches**. Search `ISO-`.

**Expected result.** Both `ISO-A` and `ISO-B` appear, each with the correct branch. Totals are the sum of the branches, not a single branch copied twice.

---

### BR-ISO-016 — A shared university is visible to both branches

| | |
| --- | --- |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. As SA, create university `ISO-UNI-<unique>` if SET-008 was not already done. Use a distinct name.
2. As A, open Add Student and find the university.
3. As B, open Add Student and find the same university.
4. `GET /universities` as A and as B.

**Expected result.** Both calls **200**. Both dropdowns contain `ISO-UNI-<unique>`. Creating a university does not create a student or an invoice.

---

### BR-ISO-017 — A shared organisation setting is the same for both branches

| | |
| --- | --- |
| **Priority** | P2 |
| **Type** | Functional |

**Steps**

1. As SA, set the organisation name to `ISO-ORG-<unique>` and save.
2. As A and as B, open System Settings or the shell where the organisation name is shown.
3. Restore the previous organisation name.

**Expected result.** Both users see `ISO-ORG-<unique>` after refresh (shared settings). Restoring the name is part of the pass. Neither user can set a different name for only their branch unless the product has a real per-branch name — the legal/organisation name in system settings is one value.

---

### BR-ISO-018 — A transactional row keeps its branch; the university does not leak the row

| | |
| --- | --- |
| **Priority** | P1 |
| **Type** | Security |

**Steps**

1. As A, create student `ISO-A2-<unique>` using university `ISO-UNI-<unique>`.
2. As B, `GET /students/<that id>` and search the code.
3. As B, open University-wise report filtered to that university.

**Expected result.** Create is **201** and `branchId` is KHI. B’s get is **403**. B’s university report does not list `ISO-A2` (pipeline counts for B are LHR students only, even when the university is shared).

---

### BR-ISO-019 — Counsellor on Branch A cannot see Branch B or other counsellors

| | |
| --- | --- |
| **Priority** | P1 |
| **Type** | Security |

**Steps**

1. Sign in as `fatima@saa.com` (counsellor, KHI).
2. Search `ISO-B` and `ISO-A`. She should see `ISO-A` only if she is its counsellor. If `ISO-A` was created with a different counsellor, she must see neither marker from the other counsellor, and still must not see `ISO-B`.
3. `GET /invoices` and `GET /reports/branch-income`.

**Expected result.** No LHR student and no LHR invoice. Branch income is **403** or contains no LHR and no other counsellor’s KHI students. `counsellorLeak = false`.

---

### BR-ISO-020 — CSV export does not leak the other branch

| | |
| --- | --- |
| **Priority** | P1 |
| **Type** | Security |

**Steps**

1. As A, export Branch Income CSV and the student list if export exists. Otherwise `GET /reports/branch-income/csv` with A’s token.
2. Open the file in a text editor. Search for `LHR`, `ISO-B`, and Sara’s student name.

**Expected result.** HTTP **200**. File contains KHI activity only. The strings `LHR` and `ISO-B-<unique>` do not appear. A Super Admin CSV for All branches **may** contain both, and that file must not be what Ahmed downloaded.
