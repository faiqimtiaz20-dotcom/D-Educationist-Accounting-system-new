# Operations — OPS-001 … OPS-010

**Module:** Approvals, documents, audit  
**FSD:** FR-OPS-01 … FR-OPS-04, NFR-03  
**Routes:** `/approvals`, `/documents`, `/audit-trail`

**Preconditions.** At least one pending expense exists that Ahmed submitted and has not approved (CASH-004 style). Use a **new** pending item if earlier cases already cleared the queue. Fiscal lock clear.

---

### OPS-001 — The queue lists expense, journal, and reimbursement

| | |
| --- | --- |
| **FSD** | FR-OPS-01 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. As Super Admin, ensure one pending item of each kind:
   - Expense (submit as Ahmed).
   - Manual journal (save as draft/pending, GL-003 style).
   - Reimbursement (PAY-010 style, leave it pending).
2. Open **Operations → Approvals**.
3. `GET /approvals`.

**Expected result**

- HTTP **200**. Body is a list.
- Each of the three types appears with type, amount or narration, requester, branch, and date.
- A Counsellor does not see an Approve action. Read Only does not see one.

---

### OPS-002 — Approve one pending item from the queue

| | |
| --- | --- |
| **FSD** | FR-OPS-01 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. As Super Admin, approve the pending expense from the queue (not from the expense screen, if both exist — use the queue).
2. Refresh the queue and the expense.

**Expected result**

- Approve returns **2xx**.
- The item leaves the pending queue.
- GL is posted (same oracle as CASH-005).
- If the queue was empty at the start, create the item first. Do not pass the case with “nothing to approve”.

---

### OPS-003 — Segregation of duties on the queue

| | |
| --- | --- |
| **FSD** | FR-OPS-02 |
| **Priority** | P1 |
| **Type** | Security |

**Steps**

1. As `ahmed@saa.com`, submit a fresh expense `QA SOD`.
2. As Ahmed, approve that row via the queue UI and via the approve API.

**Expected result**

- **403**. Item stays pending. No journal.
- The UI disables or hides Approve on his own row and the API still enforces it.
- He may still reject only if the product allows the requester to withdraw. Withdraw is not approval and must not post GL.

---

### OPS-004 — A different user can approve

| | |
| --- | --- |
| **FSD** | FR-OPS-02 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. As Super Admin, approve `QA SOD`.
2. Confirm the approver name on the expense and in the audit trail.

**Expected result**

- Approve succeeds.
- Approver is Super Admin, requester remains Ahmed.
- Journal exists and balances.

---

### OPS-005 — Upload a document

| | |
| --- | --- |
| **FSD** | FR-OPS-03 |
| **Priority** | P1 |
| **Type** | Functional |

**Test data.** A small PDF or PNG under the size limit, name `qa-evidence-<unique>.pdf`. Optional link to the QA expense if the form has a source.

**Steps**

1. Open **Operations → Documents**.
2. Upload the file with a title `QA evidence`.
3. Find it in the list.

**Expected result**

- Upload returns **201**.
- List shows title, file name, uploader, timestamp, and size.
- The file is under the server upload directory, not only in the browser.
- Branch scope: Ahmed does not see an LHR-only document.

---

### OPS-006 — Download the uploaded file

| | |
| --- | --- |
| **FSD** | FR-OPS-03 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. Download the OPS-005 file.
2. Open it locally.

**Expected result**

- `GET` download returns **200**.
- Bytes match the upload (same size, file opens).
- A user without permission receives **403** and not the file. Call download with no token and expect **401**.

---

### OPS-007 — Delete a document

| | |
| --- | --- |
| **FSD** | FR-OPS-03 |
| **Priority** | P2 |
| **Type** | Functional |

**Steps**

1. Delete the QA evidence document.
2. Search the list and try the old download URL.

**Expected result**

- Delete returns **2xx**.
- The row disappears.
- Download of that id returns **404**.
- Audit trail records the delete. Deleting another branch’s document as Ahmed returns **403**.

---

### OPS-008 — Audit log filters

| | |
| --- | --- |
| **FSD** | FR-OPS-04 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. Open **Operations → Audit Trail**.
2. Filter by module or action (students, login, or expenses) and by a date that includes today.
3. Apply, then clear the filter.

**Expected result**

- Filtered `GET /audit-logs` returns **200**.
- Every visible row matches the filter.
- Clearing the filter shows a wider set.
- Ahmed’s filter result does not show Sara’s LHR mutations if audit is branch-scoped. If audit is global for managers, record that and confirm a Counsellor still cannot see other people’s records. Super Admin sees the login events from AUTH-009 and AUTH-010.

---

### OPS-009 — Audit log is paginated

| | |
| --- | --- |
| **FSD** | FR-OPS-04, NFR-04 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. Request `GET /audit-logs?take=10&skip=0` and `skip=10`.
2. Use the on-screen pager.

**Expected result**

- Both responses include `items` and numeric `total`.
- Page size is 10.
- The two pages do not share the same first id.
- `total` is at least the number of actions you performed in this cycle.

---

### OPS-010 — Mutations in this cycle appear in the audit log

| | |
| --- | --- |
| **FSD** | NFR-03, FR-OPS-04 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. After STU-001, REV-003, CASH-005, and OPS-005, search the audit log for each.
2. Open one row and read actor, action, entity, and time.

**Expected result**

- `total` > 0.
- Each of those mutations has a row. Actor matches the user who performed it.
- The row does not contain passwords or raw tokens.
- A failed create (RBAC-010) is audited as a failure or is absent — it must not be stored as a successful create.
