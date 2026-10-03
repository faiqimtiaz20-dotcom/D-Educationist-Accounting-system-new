# Settings — SET-001 … SET-010

**Module:** Branches, users, permissions, fiscal lock, masters  
**FSD:** FR-SET-01 … FR-SET-05, BR-02  
**Routes:** `/settings/branches`, `/settings/users`, `/settings/system`

**Actor:** Super Admin unless the case says Branch Manager. Clean up: disable QA users at the end of the cycle. Do not leave a second Super Admin you created with the seed password.

---

### SET-001 — Super Admin creates, edits, and lists branches

| | |
| --- | --- |
| **FSD** | FR-SET-01 |
| **Priority** | P1 |
| **Type** | Functional |

**Test data.** Code unique, 3–6 letters, e.g. `QZ` + two characters. Name `QA Branch SET`. City `Karachi`. Not head office.

**Steps**

1. Open **Settings → Branches**.
2. Create the branch.
3. Edit the city to `Lahore`. Reload.

**Expected result**

- Create **201**. Edit **200**.
- Only one head office remains the head office.
- Duplicate code is **4xx**.
- The branch appears in Super Admin’s branch switcher.

---

### SET-002 — Branch Manager cannot create a branch

| | |
| --- | --- |
| **FSD** | FR-SET-01 |
| **Priority** | P1 |
| **Type** | Security |

**Steps**

1. Sign in as `ahmed@saa.com`.
2. Open `/settings/branches`.
3. `POST /branches` with Ahmed’s token and a unique code.

**Expected result**

- API **403**.
- No new branch in the Super Admin list.
- The UI hides the create action or shows a permission error.

---

### SET-003 — Super Admin creates a user and assigns a role

| | |
| --- | --- |
| **FSD** | FR-SET-02 |
| **Priority** | P1 |
| **Type** | Functional |

**Test data.** Email `qa.user.<unique>@example.com`. Name `QA User`. Role **Read Only**. Branch **FSD**. Temporary password recorded in the test notes (not in the audit screenshot).

**Steps**

1. Open **Settings → Users & Roles**.
2. Create the user.
3. Sign in as that user in a private window.

**Expected result**

- Create **201**.
- The user can sign in and cannot create a student (same oracle as RBAC-010).
- Duplicate email is **4xx**.
- Password is not shown back in the user list or the audit payload.

---

### SET-004 — Branch Manager cannot create a Super Admin

| | |
| --- | --- |
| **FSD** | FR-SET-02 |
| **Priority** | P1 |
| **Type** | Security |

**Steps**

1. As `ahmed@saa.com`, `POST /users` with role Super Admin (or the highest role the UI offers him).
2. If the UI only allows him to create cashiers/counsellors for KHI, try to submit Super Admin anyway via the API.

**Expected result**

- Create Super Admin returns **4xx**.
- He cannot assign a user to branch LHR.
- He cannot edit `admin@saa.com`.

---

### SET-005 — Permission matrix loads and Super Admin can change a cell

| | |
| --- | --- |
| **FSD** | FR-SET-03 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. As Super Admin, open the matrix.
2. Note Read Only’s level on Master Sheet.
3. If the product allows an edit, set a **non-production** test role or restore the same value immediately after proving PATCH works. Prefer PATCH of an unchanged value if a dry save exists.
4. `GET /permissions/matrix`.

**Expected result**

- GET **200** and shows modules × roles.
- A real change is enforced on the next request: if you set Cashier to `none` on Bank & Cash, Bilal’s `GET /bank-accounts` becomes **403** until you restore it.
- **Restore the original matrix before leaving this case.** Write the restored value in the actual result.
- Ahmed receives **403** on matrix edit.

---

### SET-006 — System settings save

| | |
| --- | --- |
| **FSD** | FR-SET-04 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. Open **Settings → System Settings**.
2. Change an organisation display name by appending ` QA` (note the original).
3. Save. Reload. Restore the original name.

**Expected result**

- PATCH `/settings` returns **200**.
- The new name survives reload, then the original is restored.
- Settings that are secrets (JWT secret) are not editable on this screen and are not returned to the browser.

---

### SET-007 — Fiscal lock date blocks posting

| | |
| --- | --- |
| **FSD** | FR-SET-04, BR-02 |
| **Priority** | P1 |
| **Type** | Negative |

**Steps**

1. Set **Fiscal period locked until** to yesterday’s date.
2. Try to post a balanced journal dated yesterday.
3. Post a balanced journal dated today.
4. Clear the lock (or restore the client’s previous lock) and record what you restored.

**Expected result**

- Yesterday’s journal is **4xx**.
- Today’s journal succeeds.
- The lock date shown after reload is the date you saved.
- This is the same rule as GL-010; both must agree.

---

### SET-008 — Create a university

| | |
| --- | --- |
| **FSD** | FR-SET-05 |
| **Priority** | P1 |
| **Type** | Functional |

**Test data.** Name `QA University <unique>`. Country United Kingdom. Active.

**Steps**

1. Open **System Settings** (or the universities master on that screen).
2. Add the university.
3. Open **Master Sheet → Add student** and find it in the dropdown.
4. As Ahmed and as Sara, confirm both can select it (universities are shared).

**Expected result**

- Create **201**.
- The university is on the student form for every branch.
- It does not carry a branch id that hides it from LHR.

---

### SET-009 — Create an expense category and a petty category

| | |
| --- | --- |
| **FSD** | FR-SET-05 |
| **Priority** | P2 |
| **Type** | Functional |

**Test data.** Expense category `QA Exp Cat`. Petty category `QA Petty Cat`.

**Steps**

1. Create both.
2. Use each on a new expense and a new petty in (you may cancel the documents after the dropdown proves they exist, or post a 1 PKR line and reverse it).

**Expected result**

- Both creates return **2xx**.
- They appear in the right dropdown and not in the other (petty category is not offered as a GL expense category unless the product intentionally shares them — if shared, the name appears and the case still passes).
- Inactive category is hidden from new documents.

---

### SET-010 — Currencies and FX rates are available for invoicing

| | |
| --- | --- |
| **FSD** | FR-SET-05, §4.5, BR-10 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. `GET /fx-rates` (or the currencies endpoint the settings screen uses) as Super Admin.
2. Confirm PKR, GBP, USD, CAD, AUD, EUR exist.
3. On a new invoice, pick GBP and confirm a rate is proposed from the table.
4. Override the rate on the draft and save.

**Expected result**

- FX list is **200** and not empty.
- Each non-PKR currency has a rate to PKR.
- The invoice stores the override. The FX master row is not changed by the invoice override.
- A rate of 0 or negative on an invoice is **400**.
