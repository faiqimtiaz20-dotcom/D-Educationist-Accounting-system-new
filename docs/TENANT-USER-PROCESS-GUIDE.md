# Tenant User Process Guide — D’ Educationist Accounting

**Document:** Full end-to-end process for **tenant (consultancy) users only**  
**Audience:** Tenant Admin, Branch Manager, Accountant, Cashier, Counsellor, Read Only  
**Out of scope:** CRM Admin / platform console (`/crm/tenants`) — that is for platform operators only  
**Related:** [USER-GUIDE.md](./USER-GUIDE.md) · [TRAINING-AGENDA.md](./TRAINING-AGENDA.md) · [UAT-CHECKLIST.md](./UAT-CHECKLIST.md)

---

## 0. What this product is (for you)

Your organisation is one **tenant**. All students, invoices, banks, universities, countries, and reports belong **only to your company**.

| You (tenant user) | Not you (CRM Admin) |
|-------------------|---------------------|
| Login → **Dashboard** + accounting menus | Login → **Tenants** console only |
| Manage your branches, users, students, money | Creates / suspends companies |
| Cannot see other consultancies | Cannot open Master Sheet / GL / reports |

You never enter a tenant code. Login is **email + password**; the system already knows your organisation.

If your organisation is **Suspended**, login is blocked — contact your platform operator.

---

## 1. Roles (inside your organisation)

UI may still show **“Super Admin”** in permission labels — that means **Tenant Admin**.

| Role | Scope | Typical work |
|------|--------|----------------|
| **Tenant Admin** | All branches in your org | Setup, users, settings, full money path, all reports |
| **Branch Manager** | Own branch | Branch operations, limited settings |
| **Accountant** | As permitted | Invoices, remittance, journals, tax, expenses |
| **Cashier** | As permitted | Petty cash, expenses, bank view |
| **Counsellor** | Own students | Master Sheet (own), Operations reports only |
| **Read Only** | View where allowed | No create / edit / approve |

Permissions are controlled under **Settings → Users & Roles**. If a menu is missing or a button is disabled, ask Tenant Admin.

**Branch switcher:** Tenant Admin can choose **All branches** or one branch. Other roles stay on their home branch.

**Submit buttons:** On save actions, the primary button shows a **spinner** and is **disabled** until the request finishes (prevents double-submit).

---

## 2. Recommended first-time setup (Tenant Admin)

Do this **before** daily student / invoice work.

### Step A — Branches

1. Open **Settings → Branches**.  
2. Confirm **Head Office** exists (created when your tenant was provisioned).  
3. **Add Branch** for each operating location (name, code, city).  
4. Head Office cannot be deleted.

### Step B — Users & roles

1. Open **Settings → Users & Roles**.  
2. **Add User**: name, email, password, **branch**, **role**.  
3. Adjust module permissions if needed (full / limited / read / none).  
4. Users can later change their own password under **Profile**.

### Step C — System masters (critical)

Open **Settings → System Settings**.

| Tab | What to do | Used by |
|-----|------------|---------|
| **Organisation** | Org name, logo, currencies, tax defaults | Branding, FX, WHT |
| **Countries** | Add destination countries (e.g. UK, Canada) | Student Country dropdown; university country |
| **Registered Universities** | Name, country (from Countries), default commission %, currency | Student University dropdown; invoices |
| **Categories** | Expense / petty-cash categories | Expenses & Petty Cash |

> **Rule:** Country and University must exist in Settings before (or while) adding students. Student form loads both from these masters — same pattern for both.

### Step D — Bank accounts

1. Open **Cash & Expenses → Bank & Cash**.  
2. Click **Add Bank Account**.  
3. Enter: account name, bank name, account number, **branch**, **currency**, opening balance.  
4. Edit / delete from the Accounts tab actions (full permission required).

Banks are required for remittances, expenses paid by transfer, contra, and payroll payouts.

### Step E — Sub-agents (if you use agents)

1. **Sub-Agents → Sub-Agent Master** → add agents (NTN, bank details if paying).  
2. Later attach students to a sub-agent on the Master Sheet.

### Step F — Email (optional)

**Settings → Email / SMTP** — connect SMTP to send invoices / notifications from your org mailbox.

---

## 3. End-to-end money path (happy path)

This is the core business process for a consultancy.

```text
Settings masters
      ↓
Master Sheet (student)
      ↓
Commission Invoice (draft → send)
      ↓
Remittance (university pays you)  [+ Allocation if bulk]
      ↓
Sub-agent commission → Sub-agent payment   (if applicable)
      ↓
GL / Bank / Tax / Reports update automatically where rules apply
```

Parallel tracks (any time after setup):

- Petty cash & expenses → Approvals → GL  
- Payroll → process → mark paid → GL  
- Manual journals / contra  
- Documents & audit trail  

---

## 4. Master Sheet (students)

**Menu:** Master Sheet  

### 4.1 Add a student

1. Click **Add Student**.  
2. Fill identity: Student ID (suggested), name, CNIC/passport, contact, email.  
3. **Branch** — operating branch.  
4. **Consultant** — optional (**None** allowed; no auto-pick). Counsellors are locked to themselves.  
5. **Country** — dropdown from **Settings → Countries** (required).  
6. **University** — dropdown from **Settings → Registered Universities**, filtered by selected country. Selecting a university fills currency and expected commission % from the university master.  
7. Course, intake, group, application status.  
8. **Sub-Agent** — optional.  
9. Tuition, scholarship, expected commission %, currency.  
10. Click **Add Student** (button shows loader while saving).

### 4.2 Maintain pipeline

- Edit student → update **Application Status**: Applied → Offer → Visa → Enrolled (or Deferred / Withdrawn).  
- Filters: branch, country, university, status, intake, amounts.  
- **CSV Template** / **Import** for bulk load (API mode).

### 4.3 Counsellor rules

- Sees students where they are the consultant.  
- Cannot open full accounting reports (Operations reports only).

---

## 5. Revenue

### 5.1 Commission invoices

**Menu:** Revenue → Invoices  

1. **Create Invoice**.  
2. Pick student(s) / lines (tuition, scholarship, commission %, bonus as applicable).  
3. Save as **Draft**.  
4. **Send** when ready — invoice becomes payable/receivable for remittance; GL posts per rules.  
5. Track status: Draft → Sent → Partially Received → Closed (etc.).

Branch name in the grid comes from live branch master (not raw IDs).

### 5.2 Other invoices

**Menu:** Revenue → Other Invoices  

Use for non-commission billing (services, misc.). Same draft → send pattern.

### 5.3 Remittance (university payment to you)

**Menu:** Revenue → Remittance  

1. Select a **Sent** (or open) invoice — not Draft / Closed.  
2. Enter amount received, exchange rate, bank account, date, WHT if applicable.  
3. Save — system calculates gross PKR, 1% WHT, net, and posts bank / receivable / FX where configured.  
4. Partial remittances are supported until the invoice is fully received / closed.

### 5.4 Bulk remittance allocation

**Menu:** Revenue → Remittance → Allocation (or `/receivables/allocation`)  

When one university payment covers many invoices:

1. Record the bulk remittance.  
2. Open **Allocation**.  
3. Allocate amounts across invoices until the bulk is cleared.  
4. Bank JE and invoice clearing follow allocation rules (including FX gain/loss where rates differ).

---

## 6. Sub-agents

### 6.1 Master

**Sub-Agents → Sub-Agent Master** — create / edit / delete agents.

### 6.2 Commission sheet

**Sub-Agents → Commission Sheet**  

1. Create commission payable linked to invoice / student / agent.  
2. Amounts and WHT share follow your configured rules.  
3. Accrual posts to AP when applicable.

### 6.3 Payments

**Sub-Agents → Payments**  

1. Record payout against commission.  
2. Choose bank / mode, date, WHT.  
3. Payment posts clear the payable and bank.

**Tax & Ledgers → Sub-Agent Ledger** for running balance.

---

## 7. Cash & expenses

### 7.1 Petty cash

**Cash & Expenses → Petty Cash**  

- Add in / out entries with category, branch, amounts (principal + taxes if used).  
- Categories come from System Settings.

### 7.2 Expenses

**Cash & Expenses → Expenses**  

1. **Add Expense**: vendor, category, date, amounts, payment mode, bank/cheque if needed.  
2. Status **Pending** → go to **Operations → Approvals** (or approve if your role allows).  
3. On **Approve**, GL posts; reject leaves it out of books.

### 7.3 Bank & cash

**Cash & Expenses → Bank & Cash**  

| Tab | Use |
|-----|-----|
| **Bank Accounts** | Add / edit / delete accounts; see balances |
| **Transactions** | Deposits, withdrawals, transfers |
| **Reconciliation** | Match unmatched items |
| **Cheque Register** | Issued cheques; mark cleared |

Contra (bank↔bank / cash↔cash) is handled so same-control accounts do not mis-post.

---

## 8. Accounting

### 8.1 Journal entries

**Accounting → Journal Entries**  

1. Create entry: description, date, balanced debit/credit lines.  
2. Save (must balance).  
3. **Approve** / **Reverse** per permission and SoD.  
4. Fiscal period lock (System Settings) blocks closed-period posts.

### 8.2 General ledger

**Accounting → General Ledger**  

- Chart of accounts, balances, drill into activity.  
- Auto posts from invoices, remittances, expenses, payroll, commissions, tax, FX, etc. appear here.

### 8.3 Contra entries

**Accounting → Contra Entries** (or linked under journals)  

- Transfer between bank/cash accounts with correct control accounts.

---

## 9. Tax & ledgers

| Screen | Purpose |
|--------|---------|
| **Tax Compliance** | Period (`YYYY-MM`) WHT, GST/SRB, salary tax summaries aligned with GL |
| **Student Ledger** | Per-student money movement |
| **Vendor Ledger** | Vendor / expense side |
| **Sub-Agent Ledger** | Agent payables / payments |

---

## 10. Operations

### 10.1 Payroll

**Operations → Payroll**  

1. Maintain **employees**.  
2. **Process payroll** for a period (or import).  
3. Approve / **Mark paid** — posts salary expense, payable, bank, and tax as configured.  
4. **Reimbursements**: staff submit → approve/reject → pay.

### 10.2 Documents

**Operations → Documents**  

Upload / download / delete supporting files (invoices, bills, contracts) stored under your tenant.

### 10.3 Approvals

**Operations → Approvals**  

Queue for expenses, journals, reimbursements (and similar). Approve or reject with reason where required.

### 10.4 Audit trail

**Operations → Audit Trail**  

Who created / updated / deleted what, when — use when investigating mistakes.

---

## 11. Reports

**Menu:** Reports  

Open the hub, then a report. Export **CSV / Excel / PDF** where the screen provides buttons.

### Typical tenant reports

- Branch income / expenses / profit / cash position  
- Consolidated P&L, balance sheet, cash flow (Tenant Admin)  
- Counsellor P&L, country-wise, university-wise (and university-wise P&L)  
- Trial balance and other ledger reports via report hub  

**Counsellor:** only **Operations**-style reports (counsellor / country / university), not full financial consolidation.

---

## 12. Profile

**Profile** (user menu)  

- Update display name / contact fields where allowed.  
- Change password.  

---

## 13. Daily / weekly / monthly checklists

### Daily (ops)

- [ ] Update student statuses on Master Sheet  
- [ ] Create / send invoices for enrolled / billable students  
- [ ] Record remittances when bank credit arrives  
- [ ] Enter petty cash / expenses; clear Approvals queue  
- [ ] Match bank reconciliation items  

### Weekly (accounts)

- [ ] Allocate any open bulk remittances  
- [ ] Post / pay sub-agent commissions  
- [ ] Review Trial Balance and obvious imbalance  
- [ ] Check Tax Compliance for the current month  

### Monthly (Tenant Admin / Accountant)

- [ ] Close period checks; set fiscal lock if used  
- [ ] Payroll run → mark paid  
- [ ] Branch P&L and consolidated reports for management  
- [ ] Audit trail spot-check  
- [ ] Confirm Countries / Universities masters still complete for new destinations  

---

## 14. Common issues (tenant side)

| Symptom | Likely cause | What to do |
|---------|--------------|------------|
| Country dropdown empty | No countries in Settings | Settings → Countries → Add |
| University dropdown empty / “select country first” | No uni for that country, or country not selected | Add university under Settings with matching country |
| Branch shows a long ID | Rare stale cache / branches not loaded | Refresh page; confirm Branches exist |
| Cannot Add Bank Account | Not API mode, or no **Bank & Cash** full permission | Tenant Admin grants full on Bank & Cash |
| Save button spins then error | Validation / fiscal lock / missing master | Read toast message; check period lock & required fields |
| 403 / menu missing | Role permission | Settings → Users & Roles |
| Login rejected | Wrong password or tenant Suspended | Reset password / contact platform |

---

## 15. Process map by role (quick)

| Process | Tenant Admin | Branch Mgr | Accountant | Cashier | Counsellor |
|---------|:------------:|:----------:|:----------:|:-------:|:----------:|
| Settings masters | ● | ○ | — | — | — |
| Add students | ● | ● | ○ | — | ● (own) |
| Invoices / remittance | ● | ● | ● | — | — |
| Sub-agent pay | ● | ● | ● | ○ | — |
| Expenses / petty cash | ● | ● | ● | ● | — |
| Bank accounts | ● | ● | ● | ○ | — |
| Journals / GL | ● | ○ | ● | — | — |
| Tax / payroll | ● | ○ | ● | — | — |
| Approvals | ● | ● | ○ | — | — |
| Full reports | ● | ○ | ● | — | Ops only |

● = primary · ○ = limited / read · — = typically none  

---

## 16. What this guide deliberately excludes

- CRM Admin tenant create / suspend / activate  
- Platform hosting, DNS, deployments  
- FBR or bank API integrations  
- Payment gateway / subscription billing UI  
- Impersonation (“login as another user”)  

For a short overview, see [USER-GUIDE.md](./USER-GUIDE.md).  
For training timing, see [TRAINING-AGENDA.md](./TRAINING-AGENDA.md).

---

*Last updated: October 2026 — includes Countries master, university-linked student form, bank account CRUD on Bank & Cash, optional consultant, remittance/allocation GL path, and submit-button loading states.*
