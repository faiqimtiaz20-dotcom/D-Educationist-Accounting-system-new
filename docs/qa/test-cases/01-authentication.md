# Authentication — AUTH-001 … AUTH-012

**Module:** Authentication & security  
**FSD:** FR-AUTH-01 … FR-AUTH-07  
**Route:** `/login`  
**Accounts:** see [TEST-CASES.md](../TEST-CASES.md)

Use a private window. Password below means `SEED_PASSWORD` (staging default `ChangeMe123!`).

---

### AUTH-001 — Sign in with a valid email and password

| | |
| --- | --- |
| **FSD** | FR-AUTH-01 |
| **Priority** | P1 |
| **Type** | Functional — positive |

**Objective.** A known user authenticates against Postgres and reaches the dashboard.

**Preconditions.** Logged out. `admin@saa.com` is active.

**Test data.** Email `admin@saa.com`. Password = seed password.

**Steps**

1. Open `/login`.
2. Enter the email and password.
3. Submit **Sign in**.

**Expected result**

- `POST /api/v1/auth/login` returns **200**.
- Body contains `accessToken`, `refreshToken`, and `user` with role Super Admin.
- Toast **Welcome back!**
- App navigates to `/` (Dashboard). Sidebar shows Dashboard, Master Sheet, Revenue, Sub-Agents, Cash & Expenses, Accounting, Tax & Ledgers, Operations, Reports, Settings.

---

### AUTH-002 — Reject a wrong password

| | |
| --- | --- |
| **FSD** | FR-AUTH-01 |
| **Priority** | P1 |
| **Type** | Negative |

**Objective.** A correct email with a wrong password does not create a session.

**Preconditions.** Logged out.

**Test data.** Email `admin@saa.com`. Password `WrongPassword!!!`.

**Steps**

1. Open `/login`.
2. Enter the email and the wrong password.
3. Submit **Sign in**.

**Expected result**

- `POST /auth/login` returns **401** (or 400).
- No `accessToken` in the response.
- The page stays on `/login`.
- An inline error is shown (not a blank screen). The message does not reveal whether the email exists as a separate fact from the password (same class of failure as AUTH-003 is acceptable).
- Dashboard data is not visible.

---

### AUTH-003 — Reject an unknown email

| | |
| --- | --- |
| **FSD** | FR-AUTH-01 |
| **Priority** | P1 |
| **Type** | Negative |

**Test data.** Email `unknown@example.com`. Password = seed password.

**Steps**

1. Open `/login`.
2. Submit the unknown email and the seed password.

**Expected result**

- Login returns **4xx**. No token is issued.
- User remains on `/login` with an error message.
- No user record is created.

---

### AUTH-004 — Empty login form is blocked in the UI

| | |
| --- | --- |
| **FSD** | FR-AUTH-01 |
| **Priority** | P2 |
| **Type** | Negative — UI |

**Steps**

1. Open `/login`.
2. Clear email and password.
3. Submit **Sign in**.
4. Repeat with email filled and password empty, then password filled and email empty.

**Expected result**

- The form does not navigate away.
- Message **Email and password are required** (or equivalent field validation).
- No `POST /auth/login` is sent for a fully empty submit. If a request is sent, it must be **4xx** and must not return a token.

---

### AUTH-005 — Login issues access and refresh tokens

| | |
| --- | --- |
| **FSD** | FR-AUTH-02 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. Sign in as `admin@saa.com` (AUTH-001).
2. Inspect the login response and stored session (application storage / auth store).

**Expected result**

- Both `accessToken` and `refreshToken` are non-empty strings.
- A following `GET /auth/me` with the access token returns **200** and the same user email.

---

### AUTH-006 — Refresh rotates a usable access token

| | |
| --- | --- |
| **FSD** | FR-AUTH-03 |
| **Priority** | P1 |
| **Type** | Functional |

**Preconditions.** A valid refresh token from AUTH-005.

**Steps**

1. Call `POST /auth/refresh` with `{ "refreshToken": "<current>" }`.
2. Call `GET /auth/me` with the new access token.

**Expected result**

- Refresh returns **200** and a new `accessToken`.
- `/auth/me` with that token returns **200**.

---

### AUTH-007 — A bad refresh token forces re-login

| | |
| --- | --- |
| **FSD** | FR-AUTH-03, FR-AUTH-07 |
| **Priority** | P1 |
| **Type** | Negative |

**Steps**

1. Call `POST /auth/refresh` with `{ "refreshToken": "invalid-token" }`.
2. Call `GET /auth/me` with `Authorization: Bearer invalid`.
3. In the UI, if the access token is expired or cleared, open `/master-sheet`.

**Expected result**

- Refresh returns **4xx**. No new access token.
- `/auth/me` returns **401**.
- The SPA sends the user to `/login` and shows **Session expired. Please sign in again.** when the session is rejected.

---

### AUTH-008 — Logout invalidates the refresh token

| | |
| --- | --- |
| **FSD** | FR-AUTH-04 |
| **Priority** | P1 |
| **Type** | Functional |

**Test data.** Sign in as `sara@saa.com` so the admin session from other cases is not destroyed.

**Steps**

1. Sign in as `sara@saa.com`. Note the refresh token.
2. Use the UI **Log out** control (or `POST /auth/logout` with that refresh token).
3. Try `POST /auth/refresh` with the same refresh token.
4. Open `/invoices` in that browser.

**Expected result**

- Logout returns **2xx**.
- Refresh with the old token returns **4xx**.
- Protected routes redirect to `/login`.
- Back button does not restore the dashboard without a new login.

---

### AUTH-009 — A successful login is written to the audit trail

| | |
| --- | --- |
| **FSD** | FR-AUTH-05 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. Sign in as `admin@saa.com`.
2. Open **Operations → Audit Trail** (`/audit-trail`).
3. Find the newest login / auth event for this user.

**Expected result**

- A row exists for the successful sign-in (action or module indicates login/auth).
- Actor is the user who signed in.
- Timestamp is within the last few minutes.
- The row is visible to Super Admin. It is paginated with the rest of the log (not only a client-side dump of one page with no total).

---

### AUTH-010 — A failed login is auditable

| | |
| --- | --- |
| **FSD** | FR-AUTH-05 |
| **Priority** | P2 |
| **Type** | Functional |

**Steps**

1. From a logged-out browser, submit `admin@saa.com` with password `bad-again`.
2. Sign in as Super Admin.
3. Open **Audit Trail** and filter or scan the latest rows.

**Expected result**

- The failed attempt is stored (action indicates failure and login).
- The audit row does not store the attempted password.
- If the product only audits successful logins, this case is **Fail** against FR-AUTH-05 (“failed/successful login events shall be auditable”). Do not pass it on “some audit rows exist”.

---

### AUTH-011 — Production build has no demo-password fill

| | |
| --- | --- |
| **FSD** | FR-AUTH-06 |
| **Priority** | P1 |
| **Type** | UI — production |

**Preconditions.** A **production** build (`import.meta.env.PROD`) with `VITE_API_URL` set. The Vite dev server is not sufficient for this case.

**Steps**

1. Open `/login` on that build.
2. Look for demo account buttons, “fill password”, or any control that writes `demo123` or the seed password into the form.

**Expected result**

- No demo account list and no one-click password fill.
- `isDemoLoginAllowed` is false: the demo panel is not rendered.
- Signing in still works with a real password (repeat AUTH-001 on this build).

---

### AUTH-012 — Unauthenticated users cannot open the app

| | |
| --- | --- |
| **FSD** | FR-AUTH-07 |
| **Priority** | P1 |
| **Type** | Security — UI |

**Preconditions.** Logged out. Clear site data for the app origin.

**Steps**

1. Navigate directly to `/`.
2. Repeat for `/master-sheet`, `/invoices`, `/reports`, `/settings/users`, `/journal-entries`.
3. Call `GET /api/v1/invoices` with no `Authorization` header.

**Expected result**

- Each UI route redirects to `/login`. The shell (sidebar, data tables) is not shown.
- The API call returns **401**.
- After a successful login, the user returns to the page they originally requested when the app stored that path.
