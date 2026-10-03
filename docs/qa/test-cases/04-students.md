# Master Sheet (students) — STU-001 … STU-014

**Module:** Students  
**FSD:** FR-STU-01 … FR-STU-07, BR-06, BR-07  
**Route:** `/master-sheet`  
**Actor unless noted:** Super Admin `admin@saa.com`, or Branch Manager `ahmed@saa.com` for KHI writes.

**Shared test student (create in STU-001, reuse until STU-003 deletes a copy):**

| Field | Value |
| --- | --- |
| Code | `QA-STU-<unique>` |
| Name | `QA Student <unique>` |
| CNIC / passport | `42101-1234567-1` (use a unique passport if the code must be unique and CNIC is unique too) |
| Branch | KHI |
| Counsellor | Fatima (`fatima@saa.com`) |
| Country | United Kingdom |
| University | first active university in Settings |
| Course | `QA BSc Business` |
| Intake | `Sep-2026` |
| Status | Applied |
| Tuition | 10000 |
| Expected commission rate | 10 |
| Currency | GBP |

Clear the fiscal lock before creates. Soft-deleted rows must not be reused as if they were active.

---

### STU-001 — Create a student

| | |
| --- | --- |
| **FSD** | FR-STU-01, FR-STU-02 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. Open **Master Sheet**.
2. **Add** student. Fill every field in the table above.
3. Save.
4. Search by the student code.

**Expected result**

- `POST /students` returns **201**.
- The row shows code, name, CNIC/passport, contact if entered, email if entered, branch KHI, counsellor Fatima, country, university, course, intake, status **Applied**, tuition, rate 10, currency GBP.
- Audit Trail has a create event (actor = the signed-in user).

---

### STU-002 — Update a student

| | |
| --- | --- |
| **FSD** | FR-STU-01 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. Open the student from STU-001.
2. Change course to `QA MSc Finance` and tuition to `12000`.
3. Save and reopen.

**Expected result**

- `PATCH /students/:id` returns **200**.
- Course and tuition persist after refresh.
- Student code does not change.
- Branch does not silently move to another branch.

---

### STU-003 — Soft-delete a student

| | |
| --- | --- |
| **FSD** | FR-STU-01, BR-07 |
| **Priority** | P1 |
| **Type** | Functional |

**Preconditions.** Use a **second** student created the same way as STU-001 (do not delete a student that later revenue cases need). Code `QA-STU-DEL-<unique>`.

**Steps**

1. Delete that student from the list (confirm the dialog).
2. Search the default list for the code.

**Expected result**

- Delete returns **200** (soft delete).
- The student is absent from the default list.
- Database retains the row with a deleted flag (if you can see it via a direct get, the get is 404 on the default API). Invoices already linked to a different student are untouched.

---

### STU-004 — Deleted student stays out of the default list

| | |
| --- | --- |
| **FSD** | BR-07 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. After STU-003, call `GET /students?take=100&search=<deleted code>` (or the UI search).
2. Page through results.

**Expected result**

- The deleted code is not in `items`.
- Creating a new student with the same code is allowed only if the product’s uniqueness ignores soft-deleted codes. If create returns a unique-constraint error, record the actual behaviour — the list exclusion itself must still pass.

---

### STU-005 — Reject a student missing required fields

| | |
| --- | --- |
| **FSD** | FR-STU-02 |
| **Priority** | P1 |
| **Type** | Negative |

**Steps**

1. **Add** student.
2. Leave name blank, or omit branch / university / counsellor, and save.
3. Also submit `POST /students` with `{}`.

**Expected result**

- UI blocks save and names the missing field.
- API returns **400**. No partial row appears in the list.

---

### STU-006 — Student stores a non-PKR currency

| | |
| --- | --- |
| **FSD** | FR-STU-02, §4.5 |
| **Priority** | P2 |
| **Type** | Functional |

**Test data.** Same as STU-001 with currency **USD** and code `QA-STU-USD-<unique>`.

**Steps**

1. Create the student with currency USD.
2. Reopen the record.

**Expected result**

- `currencyCode` is `USD`.
- The list shows USD, not a silent conversion to PKR on the student master (conversion belongs on invoices and reports).

---

### STU-007 — Application status can be moved along the pipeline

| | |
| --- | --- |
| **FSD** | FR-STU-03 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. Open the STU-001 student (status Applied).
2. Set status to **Offer**. Save.
3. Confirm the list filter **Offer** includes this student and **Applied** does not.

**Expected result**

- PATCH returns **200** and `applicationStatus` is `Offer`.
- Allowed values that must be selectable: **Applied, Offer, Visa, Enrolled, Deferred, Withdrawn**. A missing status in the dropdown is a **Fail**.

---

### STU-008 — Status changes keep history

| | |
| --- | --- |
| **FSD** | FR-STU-04 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. On the same student, change status Offer → **Visa**.
2. Open status history in the UI, or `GET` the student including history.

**Expected result**

- At least two history rows exist (Applied→Offer and Offer→Visa), or one row per change with from/to and timestamp.
- History is not wiped when the current status updates.
- The latest history row matches the current status **Visa**.

---

### STU-009 — Counsellor cannot open another counsellor’s student

| | |
| --- | --- |
| **FSD** | FR-STU-05, BR-06 |
| **Priority** | P1 |
| **Type** | Security |

**Preconditions.** A KHI student whose counsellor is **not** Fatima (create one as Super Admin assigned to another user, or use seed). Note its id. If the seed has no such student, create `QA-STU-OTHER-<unique>` assigned to `ahmed@saa.com` as counsellor if the field allows a non-counsellor user; otherwise create a second counsellor user and assign them. Do not skip this case for lack of data — create the data.

**Steps**

1. Sign in as `fatima@saa.com`.
2. Search Master Sheet for that student code.
3. `GET /students/<that id>` with Fatima’s token.

**Expected result**

- The student is not in Fatima’s list.
- Direct get returns **403** (or 404 with an empty body). **200** with the other student’s payload is an S1 **Fail**.

---

### STU-010 — Download the student CSV template

| | |
| --- | --- |
| **FSD** | FR-STU-06 |
| **Priority** | P2 |
| **Type** | Functional — UI |

**Steps**

1. As Super Admin or Branch Manager, open **Master Sheet**.
2. Download **Template**.
3. Open the file.

**Expected result**

- A CSV downloads.
- Header row includes the import columns the screen documents (code, name, CNIC/passport, contact, email, branch, counsellor, country, university, course, intake, status, sub-agent, tuition, scholarship, commission rate, currency).
- The file is empty of data rows or contains only the header / example row that the importer will not silently load as a real student.

---

### STU-011 — Import creates students

| | |
| --- | --- |
| **FSD** | FR-STU-06 |
| **Priority** | P1 |
| **Type** | Functional — UI |

**Test data.** Two new rows, codes `QA-IMP-1-<unique>` and `QA-IMP-2-<unique>`, branch KHI, counsellor Fatima, valid university name/code as the template expects, status Applied, currency GBP, tuition 5000, rate 10.

**Steps**

1. Fill the template with those two rows.
2. **Import** the file.
3. Search each code.

**Expected result**

- Both students exist after refresh (`POST /students` per row, each **201**).
- Branch is KHI, not the importer’s other branches.
- A success count of 2 is shown.

---

### STU-012 — Import updates an existing student matched by code

| | |
| --- | --- |
| **FSD** | FR-STU-06 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. Re-import a file whose code is `QA-IMP-1-<unique>` and whose course is `QA Updated By CSV`.
2. Open that student.

**Expected result**

- The existing row is updated. A second active student with the same code is not created.
- Course is `QA Updated By CSV`.
- Status history rules still apply if the status column changed.

---

### STU-013 — Import reports an invalid row and keeps the valid ones

| | |
| --- | --- |
| **FSD** | FR-STU-06 |
| **Priority** | P2 |
| **Type** | Negative |

**Test data.** Row A valid (`QA-IMP-OK-<unique>`). Row B missing the student name. Row C unknown university `Not A Real Uni`.

**Steps**

1. Import the three-row file.
2. Search for row A’s code and confirm row B was not created (no blank-name student).

**Expected result**

- The UI lists row numbers and the reason for B and C.
- Row A is created.
- The import does not abort in a way that hides which rows failed, and it does not create B or C.

---

### STU-014 — Student list is paginated on the server

| | |
| --- | --- |
| **FSD** | FR-STU-07, NFR-04 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. Open Master Sheet as Super Admin.
2. Go to page 2 (or set page size and move next).
3. Capture `GET /students?take=<n>&skip=<n>`.

**Expected result**

- Response includes `items` and a numeric `total`.
- `items.length` ≤ `take`.
- Page 2’s first code is not page 1’s first code.
- Changing page does not download the entire table in one response when `take` is set. The UI total matches `total`.
