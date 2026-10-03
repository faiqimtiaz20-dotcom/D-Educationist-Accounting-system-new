# Access control — RBAC-001 … RBAC-012

**Module:** Roles, permissions, branch scope  
**FSD:** §4, FR-SET, FR-RPT-05, BR-06  
**Rule under test.** Levels are `none` < `read` < `limited` < `full`. The API enforces permission and branch. The sidebar hides modules the role cannot use. Hiding a menu item is not a pass if the API still returns the data.

Sign out between roles. Password = seed password.

| Actor | Email | Home |
| --- | --- | --- |
| Super Admin | admin@saa.com | HO |
| Branch Manager A | ahmed@saa.com | KHI |
| Accountant | sara@saa.com | LHR |
| Cashier | bilal@saa.com | ISB |
| Counsellor | fatima@saa.com | KHI |
| Read Only | hina@saa.com | FSD |

---

### RBAC-001 — Super Admin loads management metrics for all branches

| | |
| --- | --- |
| **FSD** | FR-DASH-01, FR-DASH-04 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. Sign in as `admin@saa.com`.
2. Open **Dashboard**.
3. Set the branch control to **All branches** (or clear the branch filter).
4. Confirm `GET /dashboard/metrics` (no single-branch restriction) returns **200**.

**Expected result**

- Metrics render: revenue, expenses, net, cash / bank / petty, receivables indicators.
- HTTP 200. `monthlyRevenue` is a number (zero is valid on an empty period; seeded data should be non-zero).
- No 403.

---

### RBAC-002 — Super Admin can create a branch

| | |
| --- | --- |
| **FSD** | FR-SET-01 |
| **Priority** | P1 |
| **Type** | Functional |

**Test data.** Code `QA` + 4 unique characters (max 6). Name `QA Branch <date>`. City `TestCity`. Not head office.

**Steps**

1. As Super Admin, open **Settings → Branches**.
2. Create the branch with the test data.
3. Reload the list.

**Expected result**

- `POST /branches` returns **201**.
- The new branch appears in the list and can be selected by Super Admin.
- It is not visible as a data scope to `ahmed@saa.com` (KHI) or `sara@saa.com` (LHR).

---

### RBAC-003 — Super Admin can read the permission matrix

| | |
| --- | --- |
| **FSD** | FR-SET-03 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. As Super Admin, open **Settings → Users & Roles**.
2. Open the permission matrix.
3. Confirm `GET /permissions/matrix` returns **200**.

**Expected result**

- Matrix lists modules (Dashboard & Reports, Master Sheet, Invoices & Receivables, Sub-Agents & Payables, Expenses & Petty Cash, Bank & Cash, Journal Entries, Tax & Compliance, Approvals, Operations, Settings) and levels for each role.
- Counsellor’s report-related access is consistent with Operations-only reports (checked in RBAC-008).

---

### RBAC-004 — Branch Manager cannot list another branch’s students

| | |
| --- | --- |
| **FSD** | §4.2 branch scope |
| **Priority** | P1 |
| **Type** | Security |

**Steps**

1. Sign in as `ahmed@saa.com` (KHI).
2. Open **Master Sheet**. Note the branch shown. There is no working “switch to LHR”.
3. Call `GET /students?branchId=<LHR id>` with Ahmed’s token (browser devtools or API client).

**Expected result**

- Response is **403**.
- The body does not contain LHR student names, codes, or CNICs.
- The on-screen list contains only KHI students.

---

### RBAC-005 — Accountant can open the trial balance for the home branch

| | |
| --- | --- |
| **FSD** | §4.1 Accountant; FR-GL-04 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. Sign in as `sara@saa.com` (Accountant, LHR).
2. Open **Accounting → General Ledger** and the Trial Balance report (`/reports` → Trial Balance).
3. Confirm `GET /gl/trial-balance` and `GET /reports/trial-balance` with Sara’s token.

**Expected result**

- Both return **200**. A 403 here is a **Fail** (Accountant is granted journals and ledgers).
- Rows are LHR (or unscoped only if the report is explicitly consolidated and the role is allowed — Accountant is not Super Admin, so branch figures must be LHR only).
- Sidebar shows Accounting, Tax, Revenue, Expenses. Settings → full user administration is not offered as Super Admin would see it.

---

### RBAC-006 — Cashier cannot manage users

| | |
| --- | --- |
| **FSD** | §4.1 Cashier |
| **Priority** | P1 |
| **Type** | Security |

**Steps**

1. Sign in as `bilal@saa.com` (Cashier, ISB).
2. Look for **Settings → Users & Roles**.
3. Call `GET /users` with Bilal’s token.
4. Attempt `POST /users` with a dummy payload if the list call is not 403.

**Expected result**

- `GET /users` returns **403**.
- The users screen is absent or shows a permission error. It does not list emails.
- Create user is denied.

---

### RBAC-007 — Counsellor sees only assigned students

| | |
| --- | --- |
| **FSD** | FR-STU-05, BR-06, FR-DASH-03 |
| **Priority** | P1 |
| **Type** | Security |

**Steps**

1. Sign in as `fatima@saa.com`.
2. Open **Master Sheet**. Page through every page (or `GET /students?take=50`).
3. Open **Dashboard** (counsellor view).

**Expected result**

- Every student row has `counsellorId` = Fatima’s user id. Zero rows for other counsellors.
- Dashboard charts and the recent-student list use the same set.
- Students with no counsellor, or another counsellor at KHI, are absent.

---

### RBAC-008 — Counsellor report catalog is Operations only

| | |
| --- | --- |
| **FSD** | FR-RPT-05 |
| **Priority** | P1 |
| **Type** | Security |

**Steps**

1. Stay signed in as `fatima@saa.com`.
2. Open **Reports**.
3. Compare with `GET /reports`.

**Expected result**

- Catalog length is **3**, all `counsellorAllowed: true`:
  - Counsellor Report Profit and Loss (`counsellor`)
  - Country-wise Report (`country-wise`)
  - University-wise Report (`university-wise`)
- Branch, Consolidated, Standard, Tax, and Commission reports are not listed.
- Direct URL `/reports/trial-balance` is covered by RBAC-009.

---

### RBAC-009 — Counsellor is forbidden from Trial Balance

| | |
| --- | --- |
| **FSD** | FR-RPT-05 |
| **Priority** | P1 |
| **Type** | Security |

**Steps**

1. As `fatima@saa.com`, open `/reports/trial-balance` by URL.
2. Call `GET /reports/trial-balance`.
3. Repeat for `branch-income`, `consolidated-pl`, `wht-summary`.

**Expected result**

- Each call returns **403**.
- The page shows a permission / forbidden message (toast or inline). It does not render trial-balance figures.
- CSV `GET /reports/trial-balance/csv` is also **403**.

---

### RBAC-010 — Read Only cannot create a student

| | |
| --- | --- |
| **FSD** | §4.1 READ_ONLY |
| **Priority** | P1 |
| **Type** | Security |

**Steps**

1. Sign in as `hina@saa.com`.
2. Open **Master Sheet**. Confirm the list loads if the role has `read`.
3. Try **Add** student. If the button is hidden, still call `POST /students` with Hina’s token and a minimal valid body (code `RO-<unique>`, name `Should Fail`, branch FSD or KHI, required fields).

**Expected result**

- Create returns **403**.
- No new student row exists when Super Admin searches that code.
- Edit, delete, and CSV import are equally denied.

---

### RBAC-011 — Branch Manager cannot open another branch by id spoofing

| | |
| --- | --- |
| **FSD** | §4.2 |
| **Priority** | P1 |
| **Type** | Security |

**Preconditions.** Know one LHR student id (Super Admin list, or Sara’s list). Do not use that browser session for Ahmed.

**Steps**

1. Sign in as `ahmed@saa.com`.
2. `GET /students/<LHR student id>`.
3. `POST /students` with Ahmed’s token and `"branchId": "<LHR id>"` and otherwise valid fields.
4. `GET /invoices?branchId=<LHR id>`.

**Expected result**

- Direct get is **403** (or 404 that does not leak the student’s fields). A 200 with the LHR student is **Fail**.
- Create is **403** and the saved branch is not LHR.
- Invoice list does not return LHR invoices.

This case is the id/body spoof. RBAC-004 is the list query. Both must pass.

---

### RBAC-012 — Business APIs reject missing credentials

| | |
| --- | --- |
| **FSD** | NFR-02 |
| **Priority** | P1 |
| **Type** | Security |

**Steps.** With no Authorization header, call:

1. `GET /invoices`
2. `GET /students`
3. `GET /journal-entries`
4. `GET /reports/trial-balance`
5. `POST /auth/logout` is not in this list. `GET /health` may stay public.

**Expected result**

- Each business call returns **401**.
- Bodies contain no invoice numbers, student names, or balances.
