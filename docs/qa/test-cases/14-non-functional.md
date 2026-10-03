# Non-functional — X-001 … X-016

**FSD:** NFR-01 … NFR-06, BR-03, BR-08, BR-10  
These cases are part of the release pack, including the ones that need a production build or a browser.

---

### X-001 — Unauthenticated and forbidden calls stay closed

| | |
| --- | --- |
| **FSD** | NFR-02 |
| **Priority** | P1 |
| **Type** | Security |

**Steps**

1. `GET /invoices` with no token.
2. As `fatima@saa.com`, `GET /reports/trial-balance`.
3. As `hina@saa.com`, `POST /students` with a valid body.

**Expected result**

- Missing token: **401**.
- Counsellor trial balance: **403**.
- Read Only create: **403**.
- Response bodies contain no ledger balances or student lists.

---

### X-002 — Audit trail has rows after normal use

| | |
| --- | --- |
| **FSD** | NFR-03 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. Perform one create (a QA student) if the log might be empty.
2. `GET /audit-logs?take=20&skip=0` as Super Admin.

**Expected result**

- `total` > 0.
- Newest row matches the create (actor, entity, time within two minutes).

---

### X-003 — Students pagination contract

| | |
| --- | --- |
| **FSD** | NFR-04 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps.** `GET /students?take=5&skip=0` and `skip=5` as Super Admin.

**Expected result.** `items` length ≤ 5, `total` is a number, pages differ. Same oracle as STU-014; keep both, they fail independently if the UI paginates but the API does not (or the reverse).

---

### X-004 — Journal pagination contract

| | |
| --- | --- |
| **FSD** | NFR-04 |
| **Priority** | P2 |
| **Type** | Functional |

**Steps.** `GET /journal-entries?take=5&skip=0`.

**Expected result.** A page of items, not an unbounded array of every journal in the database. Same rule as GL-014.

---

### X-005 — Audit pagination contract

| | |
| --- | --- |
| **FSD** | NFR-04 |
| **Priority** | P2 |
| **Type** | Functional |

**Steps.** `GET /audit-logs?take=5&skip=0` and `skip=5`.

**Expected result.** `items` and `total`. Page size respected. Same rule as OPS-009.

---

### X-006 — Health reports API and database up

| | |
| --- | --- |
| **FSD** | NFR-05 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. `GET /api/v1/health` with no token.
2. Stop Postgres only in a throwaway environment if you are allowed to, then call health again, then start Postgres. Skip the stop step on a shared server and note **Blocked** for the down-path only. The up-path is still mandatory.

**Expected result**

- Up: `status` ok and `database` **up**.
- Down: the body says the database is not up, and the process does not pretend it is up.

---

### X-007 — API failure shows an error toast

| | |
| --- | --- |
| **FSD** | NFR-06 |
| **Priority** | P2 |
| **Type** | UI |

**Steps**

1. Sign in.
2. In devtools, set the network to **Offline** (or block the API host).
3. Open **Master Sheet** or trigger a save.

**Expected result**

- A toast or inline error tells the user the request failed.
- The screen does not look like a successful empty list with no explanation.
- Data already on screen is not wiped and replaced with a fake zero dashboard.

---

### X-008 — 403 shows a permission message

| | |
| --- | --- |
| **FSD** | NFR-06 |
| **Priority** | P1 |
| **Type** | UI |

**Steps**

1. As `fatima@saa.com`, open `/reports/trial-balance` and `/settings/users`.
2. Read the toast or the page message.

**Expected result**

- The user sees a permission / forbidden message, not a stack trace and not a blank dashboard of someone else’s numbers.
- The message does not include SQL or file paths.

---

### X-009 — Desktop layout of the primary path

| | |
| --- | --- |
| **FSD** | FR-UI-01 (FSD §6) |
| **Priority** | P2 |
| **Type** | UI |

**Viewport.** 1440×900.

**Steps.** Sign in. Open Dashboard, Master Sheet, one invoice, Journal Entries, and Reports. Open and close the sidebar.

**Expected result**

- No horizontal page scroll on those screens.
- Tables scroll inside the table region.
- Primary buttons (Add, Save, Export) are visible without overlapping the sidebar.
- Sidebar labels are readable.

---

### X-010 — Mobile layout of login and one module

| | |
| --- | --- |
| **FSD** | FR-UI-01, UAT F1 |
| **Priority** | P1 |
| **Type** | UI |

**Viewport.** 390×844.

**Steps**

1. Open `/login`. Sign in as Super Admin.
2. Open the navigation menu. Go to **Master Sheet**. Search a student.
3. Open **Expenses** and start (do not have to finish) a new expense.

**Expected result**

- Login fields and the submit button are on screen and usable.
- The menu opens and closes. A module can be reached.
- Form fields are not clipped off the right edge.
- Sticky headers do not cover the first row so that it cannot be tapped.

---

### X-011 — The client bundle does not contain secrets

| | |
| --- | --- |
| **FSD** | NFR-01 |
| **Priority** | P1 |
| **Type** | Security |

**Steps**

1. Build the production SPA (`npm run build` or the project’s build script).
2. Search the `dist` assets for `JWT_SECRET`, `DATABASE_URL`, `SEED_PASSWORD`, `ChangeMe123!`, and the live database password.

**Expected result**

- None of those strings are in the JavaScript bundles.
- `VITE_API_URL` may appear (it is public). Database and JWT secrets must not.

---

### X-012 — Production is served over HTTPS

| | |
| --- | --- |
| **FSD** | NFR-01 |
| **Priority** | P1 |
| **Type** | Security |

**Preconditions.** The deployed environment, not localhost.

**Steps**

1. Open the SPA URL.
2. Confirm the certificate is valid for that host.
3. Request `http://` and see whether it redirects to `https://`.

**Expected result**

- The site loads on HTTPS with a valid certificate.
- HTTP redirects to HTTPS.
- On localhost this case is **Blocked** with the reason “no TLS on the local runner”, and it is **not** a pass. A release to a public host cannot close with this case blocked.

---

### X-013 — JWT secret comes from the environment

| | |
| --- | --- |
| **FSD** | NFR-01 |
| **Priority** | P1 |
| **Type** | Security — configuration |

**Steps**

1. Read `backend/.env.example` (not the live `.env` into the report).
2. Confirm the API reads `JWT_SECRET` / access and refresh secrets from the environment.
3. Confirm a production checklist says the default secret must be replaced.

**Expected result**

- Secrets are environment variables, not hard-coded fallbacks that are the same in every install.
- If a hard-coded fallback exists, this case is a **Fail** even when the current `.env` overrides it.
- Do not paste the live secret into the test log.

---

### X-014 — Posted journals stay in balance after rounding

| | |
| --- | --- |
| **FSD** | BR-03 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. Post the balanced journal from GL-003 and the FX invoice from REV-012.
2. Re-open trial balance.

**Expected result**

- Debits equal credits on each journal after the system rounds.
- Trial balance still balances. No one-sided rounding difference is left on a suspense account unless the UI shows that suspense line and it is explained.

---

### X-015 — Posted source documents are not deleted

| | |
| --- | --- |
| **FSD** | BR-08 |
| **Priority** | P1 |
| **Type** | Negative |

**Steps.** Attempt delete on:

1. The sent invoice (REV-011).
2. An approved expense.
3. A paid sub-agent payment.
4. An approved manual journal (use Reverse instead).

**Expected result**

- Each delete returns **4xx**.
- The document and its journal remain.
- Reversal is offered where the FSD says reversal exists (journals).

---

### X-016 — FX rate table is used when the invoice has no override

| | |
| --- | --- |
| **FSD** | BR-10 |
| **Priority** | P1 |
| **Type** | Functional |

**Steps**

1. Read the latest GBP→PKR rate from the FX screen.
2. Create a draft invoice in GBP and do **not** type a rate, if the form allows a blank rate.
3. If the form always requires a rate, pick the proposed rate and confirm it equals the latest table rate before you change it.

**Expected result**

- The proposed or default rate equals the latest GBP row.
- `GET` FX rates returns **200**.
- An invoice that stored 355 keeps 355 even if you later edit the master rate (REV-012).
