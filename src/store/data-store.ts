import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { isApiMode } from '@/lib/api-client'
import { students as initialStudents } from '@/data/students'
import { invoices as initialInvoices } from '@/data/invoices'
import { otherInvoices as initialOtherInvoices } from '@/data/otherInvoices'
import { receivables as initialReceivables, receivableAllocations as initialAllocations } from '@/data/receivables'
import { pettyCashEntries as initialPettyCash } from '@/data/pettyCash'
import { expenses as initialExpenses } from '@/data/expenses'
import { universities as initialUniversities } from '@/data/universities'
import { branches as initialBranches } from '@/data/branches'
import { users as initialUsers } from '@/data/users'
import { approvals as initialApprovals } from '@/data/documents'
import { payrollEmployees as initialPayrollEmployees, payrollRuns as initialPayrollRuns, payrollLines as initialPayrollLines, reimbursements as initialReimbursements } from '@/data/payroll'
import { journalEntries as initialJournalEntries } from '@/data/journalEntries'
import { subAgentCommissions as initialSubAgentCommissions, subAgentPayments as initialSubAgentPayments } from '@/data/subAgentCommissions'
import { subAgents as initialSubAgents } from '@/data/subAgents'
import { buildPayrollEmployee, buildPayrollLine, recalcEmployee } from '@/lib/payroll'
import { matchPayrollEmployee } from '@/lib/payroll-csv'
import { logAudit } from '@/lib/audit'
import { computeChartOfAccounts, isJournalBalanced } from '@/lib/gl'
import {
  appendAutoJournal,
  createExpensePaymentEntry,
  createInvoiceAccrualEntry,
  createPettyCashEntry,
  createReceivableReceiptEntry,
  createReversalEntry,
  createPayrollPaymentEntry,
  reconcileMissingPostings,
  removeJournalsForSource,
} from '@/lib/gl-posting'
import { subAgentPayable } from '@/lib/calculations'
import { getInvoiceTotal, invoiceHasStudent, linesFinanciallyEqual, normalizeInvoices } from '@/lib/invoice'
import { isDateLocked } from '@/store/settings-store'
import type {
  AccountNode,
  Approval,
  ApprovalStatus,
  Branch,
  Expense,
  Invoice,
  InvoiceStatus,
  OtherInvoice,
  JournalEntry,
  JournalLine,
  PettyCashEntry,
  PayrollEmployee,
  PayrollLine,
  PayrollRun,
  Receivable,
  ReceivableAllocation,
  Reimbursement,
  Student,
  SubAgent,
  SubAgentCommission,
  SubAgentPayment,
  University,
  User,
} from '@/types'

function nextId(prefix: string, existing: { id: string }[]) {
  const nums = existing
    .map((e) => parseInt(e.id.replace(/\D/g, ''), 10))
    .filter((n) => !Number.isNaN(n))
  const next = nums.length ? Math.max(...nums) + 1 : 1
  return `${prefix}${next}`
}

/** Demo seed only in local/mock mode — API mode starts empty to avoid hardcoded flash. */
function seed<T>(demo: T[]): T[] {
  return isApiMode() ? [] : demo
}

function invoiceTotal(invoice: Invoice) {
  return getInvoiceTotal(invoice)
}

function deriveInvoiceStatus(invoice: Invoice, paid: number): InvoiceStatus {
  const total = invoiceTotal(invoice)
  if (invoice.status === 'Draft' || invoice.status === 'Sent') {
    if (paid <= 0) return invoice.status
    if (paid >= total) return 'Fully Received'
    return 'Partially Received'
  }
  if (paid >= total) return 'Fully Received'
  if (paid > 0) return 'Partially Received'
  return invoice.status
}

function syncInvoiceStatuses(invoices: Invoice[], receivables: Receivable[]): Invoice[] {
  return invoices.map((inv) => {
    const paid = receivables
      .filter((r) => r.invoiceId === inv.id && !r.isBulkRemittance)
      .reduce((s, r) => s + r.amountReceived, 0)
    return { ...inv, status: deriveInvoiceStatus(inv, paid) }
  })
}

export function invoiceHasPayments(receivables: Receivable[], invoiceId: string) {
  return receivables.some((r) => r.invoiceId === invoiceId && !r.isBulkRemittance)
}

function deriveCommissionStatus(
  commission: SubAgentCommission,
  payments: SubAgentPayment[]
): SubAgentCommission['status'] {
  const payable = subAgentPayable(
    commission.grossFee,
    commission.rateGiven,
    commission.exchangeRate,
    commission.followOnBonus
  )
  const paid = payments
    .filter((p) => p.commissionId === commission.id)
    .reduce((sum, p) => sum + p.amountPKR, 0)
  if (paid <= 0) return 'Pending'
  if (paid >= payable - 0.001) return 'Paid'
  return 'Partial'
}

interface DataState {
  students: Student[]
  invoices: Invoice[]
  otherInvoices: OtherInvoice[]
  receivables: Receivable[]
  receivableAllocations: ReceivableAllocation[]
  pettyCash: PettyCashEntry[]
  expenses: Expense[]
  approvals: Approval[]
  universities: University[]
  branches: Branch[]
  users: User[]
  journalEntries: JournalEntry[]
  glReconciled: boolean
  payrollEmployees: PayrollEmployee[]
  payrollRuns: PayrollRun[]
  payrollLines: PayrollLine[]
  reimbursements: Reimbursement[]
  subAgents: SubAgent[]
  subAgentCommissions: SubAgentCommission[]
  subAgentPayments: SubAgentPayment[]

  getChartOfAccounts: () => AccountNode[]

  addStudent: (student: Omit<Student, 'id'>) => void
  updateStudent: (id: string, student: Partial<Student>) => void
  deleteStudent: (id: string) => void

  addSubAgent: (agent: Omit<SubAgent, 'id' | 'subAgentNo'>) => void
  updateSubAgent: (id: string, agent: Partial<Omit<SubAgent, 'id' | 'subAgentNo'>>) => void
  deleteSubAgent: (id: string) => boolean

  addInvoice: (invoice: Omit<Invoice, 'id' | 'invoiceNo'>) => void
  updateInvoice: (id: string, invoice: Partial<Invoice>) => void
  deleteInvoice: (id: string) => boolean

  addOtherInvoice: (invoice: Omit<OtherInvoice, 'id' | 'invoiceNo'>) => void
  updateOtherInvoice: (id: string, invoice: Partial<OtherInvoice>) => void
  deleteOtherInvoice: (id: string) => void

  addReceivable: (receivable: Omit<Receivable, 'id' | 'receiptNo' | 'isPartial'> & { isPartial?: boolean }) => boolean
  updateReceivable: (id: string, receivable: Partial<Receivable>) => void
  deleteReceivable: (id: string) => void
  getInvoiceAmountPaid: (invoiceId: string) => number
  confirmBulkAllocation: (receivableId: string, allocations: { invoiceId: string; allocatedAmount: number }[]) => boolean

  addPettyCash: (entry: Omit<PettyCashEntry, 'id' | 'pettyCashNo' | 'total'>) => void
  updatePettyCash: (id: string, entry: Partial<PettyCashEntry>) => void
  deletePettyCash: (id: string) => void

  addExpense: (expense: Omit<Expense, 'id' | 'total' | 'approvalStatus'> & { approvalStatus?: ApprovalStatus }, requestedById: string, requestedByName: string) => void
  updateExpense: (id: string, expense: Partial<Expense>) => void
  deleteExpense: (id: string) => void

  processApproval: (id: string, status: 'Approved' | 'Rejected', approverId: string) => boolean

  addUniversity: (university: Omit<University, 'id' | 'universityNo'>) => void
  updateUniversity: (id: string, university: Partial<University>) => void
  deleteUniversity: (id: string) => void

  addBranch: (branch: Omit<Branch, 'id'>) => void
  updateBranch: (id: string, branch: Partial<Branch>) => void
  deleteBranch: (id: string) => void

  addUser: (user: Omit<User, 'id'>) => void
  updateUser: (id: string, user: Partial<User>) => void
  deleteUser: (id: string) => void

  addManualJournal: (entry: Omit<JournalEntry, 'id' | 'entryNo' | 'approvalStatus' | 'isAutoPosted' | 'sourceType'> & { lines: JournalLine[] }) => boolean
  reconcileGlPostings: () => void

  addPayrollEmployee: (employee: Omit<PayrollEmployee, 'id' | 'employeeNo' | 'salaryTax' | 'netSalary'>) => void
  updatePayrollEmployee: (id: string, updates: Partial<PayrollEmployee>) => void
  deletePayrollEmployee: (id: string) => void

  addReimbursement: (claim: Omit<Reimbursement, 'id' | 'reimbursementNo' | 'status'>, requestedById: string, requestedByName: string) => void
  processPayrollRun: (period: string, branchId: string, processedByName: string) => string | null
  importPayrollRuns: (
    period: string,
    branchGroups: {
      branchId: string
      lines: {
        employeeName: string
        employeeCode?: string
        designation: string
        basicSalary: number
        allowances: number
        grossSalary: number
        salaryTax: number
        netSalary: number
        reimbursements: number
        totalPayable: number
      }[]
    }[],
    processedByName: string
  ) => { runIds: string[]; employeesCreated: number; error?: string }
  markPayrollPaid: (runId: string) => boolean

  addSubAgentCommission: (commission: Omit<SubAgentCommission, 'id' | 'commissionNo'>) => void
  updateSubAgentCommission: (id: string, commission: Partial<SubAgentCommission>) => void
  deleteSubAgentCommission: (id: string) => void

  addSubAgentPayment: (payment: Omit<SubAgentPayment, 'id' | 'paymentNo'>) => void
  updateSubAgentPayment: (id: string, payment: Partial<SubAgentPayment>) => void
  deleteSubAgentPayment: (id: string) => void
}

export const useDataStore = create<DataState>()(
  persist(
    (set, get) => ({
      students: seed(initialStudents),
      invoices: seed(initialInvoices),
      otherInvoices: seed(initialOtherInvoices),
      receivables: seed(initialReceivables),
      receivableAllocations: seed(initialAllocations),
      pettyCash: seed(initialPettyCash),
      expenses: seed(initialExpenses),
      approvals: seed(initialApprovals),
      universities: seed(initialUniversities),
      branches: seed(initialBranches),
      users: seed(initialUsers),
      journalEntries: seed(initialJournalEntries),
      glReconciled: false,
      payrollEmployees: seed(initialPayrollEmployees),
      payrollRuns: seed(initialPayrollRuns),
      payrollLines: seed(initialPayrollLines),
      reimbursements: seed(initialReimbursements),
      subAgents: seed(initialSubAgents),
      subAgentCommissions: seed(initialSubAgentCommissions),
      subAgentPayments: seed(initialSubAgentPayments),

      getChartOfAccounts: () => computeChartOfAccounts(get().journalEntries),

      reconcileGlPostings: () =>
        set((s) => {
          if (s.glReconciled) return s
          const journalEntries = reconcileMissingPostings({
            invoices: s.invoices,
            receivables: s.receivables,
            expenses: s.expenses,
            pettyCash: s.pettyCash,
            payrollRuns: s.payrollRuns,
            journalEntries: s.journalEntries,
          })
          return { journalEntries, glReconciled: true }
        }),

      addManualJournal: (entry) => {
        const s = get()
        if (!isJournalBalanced(entry.lines)) return false
        const count = s.journalEntries.length + 1
        const newEntry: JournalEntry = {
          ...entry,
          id: nextId('je', s.journalEntries),
          entryNo: `JE-2026-${String(count).padStart(3, '0')}`,
          approvalStatus: 'Pending',
          sourceType: 'Manual',
          isAutoPosted: false,
        }
        set({ journalEntries: [...s.journalEntries, newEntry] })
        logAudit({ module: 'Journal', action: 'Created manual journal', entityId: newEntry.id, details: newEntry.entryNo })
        return true
      },

      addStudent: (student) =>
        set((s) => {
          const newStudent = { ...student, id: nextId('s', s.students) }
          logAudit({ module: 'Master Sheet', action: 'Created student', entityId: newStudent.id, details: student.name })
          return { students: [...s.students, newStudent] }
        }),

      updateStudent: (id, updates) =>
        set((s) => {
          logAudit({ module: 'Master Sheet', action: 'Updated student', entityId: id })
          return { students: s.students.map((st) => (st.id === id ? { ...st, ...updates } : st)) }
        }),

      deleteStudent: (id) =>
        set((s) => {
          const hasInvoices = s.invoices.some((i) => invoiceHasStudent(i, id))
          if (hasInvoices) return s
          logAudit({ module: 'Master Sheet', action: 'Deleted student', entityId: id })
          return { students: s.students.filter((st) => st.id !== id) }
        }),

      addSubAgent: (agent) =>
        set((s) => {
          const seq =
            s.subAgents
              .map((a) => parseInt((a.subAgentNo ?? '').replace(/^SA-/i, ''), 10))
              .filter((n) => !Number.isNaN(n))
              .reduce((m, n) => Math.max(m, n), 0) + 1
          const newAgent: SubAgent = {
            ...agent,
            id: nextId('sa', s.subAgents),
            subAgentNo: `SA-${String(seq).padStart(3, '0')}`,
          }
          logAudit({ module: 'Sub-Agent Master', action: 'Created sub-agent', entityId: newAgent.id, details: agent.name })
          return { subAgents: [...s.subAgents, newAgent] }
        }),

      updateSubAgent: (id, updates) =>
        set((s) => {
          logAudit({ module: 'Sub-Agent Master', action: 'Updated sub-agent', entityId: id })
          return { subAgents: s.subAgents.map((a) => (a.id === id ? { ...a, ...updates } : a)) }
        }),

      deleteSubAgent: (id) => {
        const s = get()
        const inUse =
          s.subAgentCommissions.some((c) => c.subAgentId === id) ||
          s.students.some((st) => st.subAgentId === id)
        if (inUse) return false
        logAudit({ module: 'Sub-Agent Master', action: 'Deleted sub-agent', entityId: id })
        set({ subAgents: s.subAgents.filter((a) => a.id !== id) })
        return true
      },

      addInvoice: (invoice) =>
        set((s) => {
          if (isDateLocked(invoice.invoiceDate)) return s
          const branchCode = invoice.branchId.toUpperCase().slice(0, 3)
          const count = s.invoices.filter((i) => i.branchId === invoice.branchId).length + 1
          const newInvoice: Invoice = {
            ...invoice,
            id: nextId('inv', s.invoices),
            invoiceNo: `INV-${branchCode}-2026-${String(count).padStart(3, '0')}`,
          }
          let journalEntries = s.journalEntries
          if (newInvoice.status !== 'Draft') {
            journalEntries = appendAutoJournal(journalEntries, createInvoiceAccrualEntry(newInvoice, journalEntries))
          }
          logAudit({ module: 'Invoices', action: 'Created invoice', entityId: newInvoice.id, details: newInvoice.invoiceNo })
          return { invoices: [...s.invoices, newInvoice], journalEntries }
        }),

      updateInvoice: (id, updates) =>
        set((s) => {
          const existing = s.invoices.find((i) => i.id === id)
          if (!existing) return s
          const date = updates.invoiceDate ?? existing.invoiceDate
          if (isDateLocked(date)) return s
          const hasPayments = invoiceHasPayments(s.receivables, id)
          if (hasPayments && updates.lines !== undefined && !linesFinanciallyEqual(existing.lines, updates.lines)) {
            return s
          }
          const updated = { ...existing, ...updates }
          const invoices = s.invoices.map((inv) => (inv.id === id ? updated : inv))
          let journalEntries = s.journalEntries
          const wasDraft = existing.status === 'Draft'
          const nowSent = updated.status !== 'Draft'
          if (wasDraft && nowSent) {
            journalEntries = appendAutoJournal(journalEntries, createInvoiceAccrualEntry(updated, journalEntries))
          }
          logAudit({ module: 'Invoices', action: 'Updated invoice', entityId: id, details: existing.invoiceNo })
          return { invoices: syncInvoiceStatuses(invoices, s.receivables), journalEntries }
        }),

      deleteInvoice: (id) => {
        const s = get()
        if (invoiceHasPayments(s.receivables, id)) return false
        const inv = s.invoices.find((i) => i.id === id)
        const original = s.journalEntries.find((e) => e.sourceType === 'Invoice' && e.sourceId === id)
        let journalEntries = removeJournalsForSource(s.journalEntries, 'Invoice', id)
        if (original) {
          const reversal = createReversalEntry(original, journalEntries, 'Invoice deleted')
          if (reversal) journalEntries = [...journalEntries, reversal]
        }
        set({
          invoices: s.invoices.filter((inv) => inv.id !== id),
          receivables: s.receivables.filter((r) => r.invoiceId !== id),
          journalEntries,
        })
        logAudit({ module: 'Invoices', action: 'Deleted invoice', entityId: id, details: inv?.invoiceNo })
        return true
      },

      addOtherInvoice: (invoice) =>
        set((s) => {
          if (isDateLocked(invoice.invoiceDate)) return s
          const branchCode = invoice.branchId.toUpperCase().slice(0, 3)
          const count = s.otherInvoices.filter((i) => i.branchId === invoice.branchId).length + 1
          const newInvoice: OtherInvoice = {
            ...invoice,
            id: nextId('oinv', s.otherInvoices),
            invoiceNo: `OINV-${branchCode}-2026-${String(count).padStart(3, '0')}`,
          }
          logAudit({
            module: 'Other Invoices',
            action: 'Created other invoice',
            entityId: newInvoice.id,
            details: newInvoice.invoiceNo,
          })
          return { otherInvoices: [...s.otherInvoices, newInvoice] }
        }),

      updateOtherInvoice: (id, updates) =>
        set((s) => {
          const existing = s.otherInvoices.find((i) => i.id === id)
          if (!existing) return s
          const date = updates.invoiceDate ?? existing.invoiceDate
          if (isDateLocked(date)) return s
          logAudit({
            module: 'Other Invoices',
            action: 'Updated other invoice',
            entityId: id,
            details: existing.invoiceNo,
          })
          return {
            otherInvoices: s.otherInvoices.map((inv) => (inv.id === id ? { ...inv, ...updates } : inv)),
          }
        }),

      deleteOtherInvoice: (id) =>
        set((s) => {
          const inv = s.otherInvoices.find((i) => i.id === id)
          logAudit({
            module: 'Other Invoices',
            action: 'Deleted other invoice',
            entityId: id,
            details: inv?.invoiceNo,
          })
          return { otherInvoices: s.otherInvoices.filter((i) => i.id !== id) }
        }),

      getInvoiceAmountPaid: (invoiceId) =>
        get().receivables
          .filter((r) => r.invoiceId === invoiceId && !r.isBulkRemittance)
          .reduce((s, r) => s + r.amountReceived, 0),

      addReceivable: (receivable) => {
        const s = get()
        if (isDateLocked(receivable.receiptDate)) return false
        const invoice = s.invoices.find((i) => i.id === receivable.invoiceId)
        if (!invoice) return false
        if (invoice.status === 'Draft') return false
        if (invoice.status === 'Closed') return false

        const total = invoiceTotal(invoice)
        const paidBefore = s.receivables
          .filter((r) => r.invoiceId === receivable.invoiceId && !r.isBulkRemittance)
          .reduce((sum, r) => sum + r.amountReceived, 0)
        const outstanding = Math.max(0, total - paidBefore)
        if (receivable.amountReceived <= 0 || receivable.amountReceived > outstanding + 0.001) return false

        const count = s.receivables.length + 1
        const isPartial =
          receivable.isPartial ??
          (paidBefore + receivable.amountReceived < total - 0.001)
        const newReceivable: Receivable = {
          ...receivable,
          id: nextId('rec', s.receivables),
          receiptNo: `REC-2026-${String(count).padStart(4, '0')}`,
          isPartial,
        }
        const receivables = [...s.receivables, newReceivable]
        const journalEntries = appendAutoJournal(
          s.journalEntries,
          createReceivableReceiptEntry(newReceivable, invoice, s.journalEntries)
        )
        logAudit({ module: 'Receivables', action: 'Recorded receipt', entityId: newReceivable.id, details: newReceivable.receiptNo })
        set({ receivables, invoices: syncInvoiceStatuses(s.invoices, receivables), journalEntries })
        return true
      },

      updateReceivable: (id, updates) =>
        set((s) => {
          const receivables = s.receivables.map((r) => {
            if (r.id !== id) return r
            const merged = { ...r, ...updates }
            const invoice = s.invoices.find((i) => i.id === merged.invoiceId)
            if (invoice) {
              const total = invoiceTotal(invoice)
              const paidOthers = s.receivables
                .filter((rec) => rec.invoiceId === merged.invoiceId && rec.id !== id && !rec.isBulkRemittance)
                .reduce((sum, rec) => sum + rec.amountReceived, 0)
              merged.isPartial = paidOthers + merged.amountReceived < total - 0.001
            }
            return merged
          })
          logAudit({ module: 'Receivables', action: 'Updated receipt', entityId: id })
          return { receivables, invoices: syncInvoiceStatuses(s.invoices, receivables) }
        }),

      deleteReceivable: (id) =>
        set((s) => {
          const original = s.journalEntries.find((e) => e.sourceType === 'Receivable' && e.sourceId === id)
          let journalEntries = removeJournalsForSource(s.journalEntries, 'Receivable', id)
          if (original) {
            const reversal = createReversalEntry(original, journalEntries, 'Receipt deleted')
            if (reversal) journalEntries = [...journalEntries, reversal]
          }
          const receivables = s.receivables.filter((r) => r.id !== id)
          logAudit({ module: 'Receivables', action: 'Deleted receipt', entityId: id })
          return { receivables, invoices: syncInvoiceStatuses(s.invoices, receivables), journalEntries }
        }),

      confirmBulkAllocation: (receivableId, allocations) => {
        const s = get()
        const bulk = s.receivables.find((r) => r.id === receivableId && r.isBulkRemittance)
        if (!bulk || bulk.allocationStatus === 'allocated') return false

        const totalAllocated = allocations.reduce((sum, a) => sum + a.allocatedAmount, 0)
        if (Math.abs(totalAllocated - bulk.amountReceived) > 0.001) return false

        const newReceivables: Receivable[] = []
        const newAllocations: ReceivableAllocation[] = []
        let count = s.receivables.length

        for (const alloc of allocations) {
          if (alloc.allocatedAmount <= 0) continue
          count += 1
          const invoice = s.invoices.find((i) => i.id === alloc.invoiceId)
          const paidBefore = s.receivables
            .filter((r) => r.invoiceId === alloc.invoiceId && !r.isBulkRemittance)
            .reduce((sum, r) => sum + r.amountReceived, 0)
          const invTotal = invoice ? invoiceTotal(invoice) : 0
          newReceivables.push({
            id: nextId('rec', [...s.receivables, ...newReceivables]),
            receiptNo: `REC-2026-${String(count).padStart(4, '0')}`,
            invoiceId: alloc.invoiceId,
            bankAccountId: bulk.bankAccountId,
            currency: bulk.currency,
            amountReceived: alloc.allocatedAmount,
            exchangeRate: bulk.exchangeRate,
            receiptDate: bulk.receiptDate,
            reconciliationStatus: bulk.reconciliationStatus,
            isPartial: paidBefore + alloc.allocatedAmount < invTotal - 0.001,
            notes: `Allocated from ${bulk.receiptNo}`,
          })
          newAllocations.push({
            id: nextId('ra', [...s.receivableAllocations, ...newAllocations]),
            receivableId,
            invoiceId: alloc.invoiceId,
            allocatedAmount: alloc.allocatedAmount,
            currency: bulk.currency,
          })
        }

        const receivables = s.receivables.map((r) =>
          r.id === receivableId ? { ...r, allocationStatus: 'allocated' as const } : r
        )
        const allReceivables = [...receivables, ...newReceivables]

        let journalEntries = s.journalEntries
        for (const rec of newReceivables) {
          const inv = s.invoices.find((i) => i.id === rec.invoiceId)
          journalEntries = appendAutoJournal(
            journalEntries,
            createReceivableReceiptEntry(rec, inv, journalEntries)
          )
        }

        set({
          receivables: allReceivables,
          receivableAllocations: [...s.receivableAllocations.filter((a) => a.receivableId !== receivableId), ...newAllocations],
          invoices: syncInvoiceStatuses(s.invoices, allReceivables),
          journalEntries,
        })
        logAudit({ module: 'Allocation', action: 'Confirmed bulk allocation', entityId: receivableId, details: bulk.receiptNo })
        return true
      },

      addPettyCash: (entry) =>
        set((s) => {
          if (isDateLocked(entry.date)) return s
          const total =
            entry.principal +
            entry.salesTax +
            entry.srbSst +
            entry.gst +
            (entry.incomeTax ?? 0)
          const year = new Date().getFullYear()
          const branchCode = s.branches.find((b) => b.id === entry.branchId)?.code?.toUpperCase() ?? 'GEN'
          const prefix = `PC-${branchCode}-${year}-`
          const seq =
            s.pettyCash
              .filter((e) => e.pettyCashNo?.startsWith(prefix))
              .map((e) => parseInt(e.pettyCashNo.slice(prefix.length), 10))
              .filter((n) => !Number.isNaN(n))
              .reduce((m, n) => Math.max(m, n), 0) + 1
          const newEntry = {
            ...entry,
            id: nextId('pc', s.pettyCash),
            pettyCashNo: `${prefix}${String(seq).padStart(3, '0')}`,
            total,
          }
          const journalEntries = appendAutoJournal(
            s.journalEntries,
            createPettyCashEntry(newEntry, s.journalEntries)
          )
          logAudit({ module: 'Petty Cash', action: 'Added entry', entityId: newEntry.id })
          return { pettyCash: [...s.pettyCash, newEntry], journalEntries }
        }),

      updatePettyCash: (id, updates) =>
        set((s) => {
          logAudit({ module: 'Petty Cash', action: 'Updated entry', entityId: id })
          return {
            pettyCash: s.pettyCash.map((e) => {
              if (e.id !== id) return e
              const merged = { ...e, ...updates }
              merged.total =
                merged.principal +
                merged.salesTax +
                merged.srbSst +
                merged.gst +
                (merged.incomeTax ?? 0)
              return merged
            }),
          }
        }),

      deletePettyCash: (id) =>
        set((s) => {
          const original = s.journalEntries.find((e) => e.sourceType === 'PettyCash' && e.sourceId === id)
          let journalEntries = removeJournalsForSource(s.journalEntries, 'PettyCash', id)
          if (original) {
            const reversal = createReversalEntry(original, journalEntries, 'Petty cash deleted')
            if (reversal) journalEntries = [...journalEntries, reversal]
          }
          logAudit({ module: 'Petty Cash', action: 'Deleted entry', entityId: id })
          return { pettyCash: s.pettyCash.filter((e) => e.id !== id), journalEntries }
        }),

      addExpense: (expense, requestedById, requestedByName) =>
        set((s) => {
          if (isDateLocked(expense.date)) return s
          const total =
            expense.principal +
            expense.salesTax +
            expense.srbSst +
            expense.gst +
            (expense.incomeTax ?? 0)
          const branchCode =
            s.branches.find((b) => b.id === expense.branchId)?.code?.toUpperCase() ?? 'GEN'
          const year = new Date().getFullYear()
          const prefix = `EXP-${branchCode}-${year}-`
          const seq =
            s.expenses
              .filter((e) => e.expenseNo?.startsWith(prefix))
              .map((e) => parseInt(e.expenseNo.slice(prefix.length), 10))
              .filter((n) => !Number.isNaN(n))
              .reduce((m, n) => Math.max(m, n), 0) + 1
          const newExpense: Expense = {
            ...expense,
            id: nextId('ex', s.expenses),
            expenseNo: expense.expenseNo || `${prefix}${String(seq).padStart(3, '0')}`,
            total,
            approvalStatus: 'Pending',
            requestedById,
          }
          const yearAp = new Date().getFullYear()
          const apPrefix = `APR-${yearAp}-`
          const apSeq =
            s.approvals
              .filter((a) => a.approvalNo?.startsWith(apPrefix))
              .map((a) => parseInt(a.approvalNo.slice(apPrefix.length), 10))
              .filter((n) => !Number.isNaN(n))
              .reduce((m, n) => Math.max(m, n), 0) + 1
          const approval: Approval = {
            id: nextId('ap', s.approvals),
            approvalNo: `${apPrefix}${String(apSeq).padStart(3, '0')}`,
            type: 'Expense',
            title: `${expense.vendor} - ${expense.category}`,
            amount: total,
            requestedBy: requestedByName,
            requestedById,
            date: expense.date,
            status: 'Pending',
            branchId: expense.branchId,
            sourceId: newExpense.id,
          }
          logAudit({ module: 'Expenses', action: 'Submitted expense for approval', entityId: newExpense.id, details: expense.vendor })
          return {
            expenses: [...s.expenses, newExpense],
            approvals: [...s.approvals, approval],
          }
        }),

      updateExpense: (id, updates) =>
        set((s) => {
          const existing = s.expenses.find((e) => e.id === id)
          if (!existing) return s
          if (existing.approvalStatus === 'Approved' && updates.approvalStatus !== 'Rejected') {
            const { approvalStatus: _, ...safeUpdates } = updates
            updates = safeUpdates
          }
          logAudit({ module: 'Expenses', action: 'Updated expense', entityId: id })
          return {
            expenses: s.expenses.map((e) => {
              if (e.id !== id) return e
              const merged = { ...e, ...updates }
              merged.total =
                merged.principal +
                merged.salesTax +
                merged.srbSst +
                merged.gst +
                (merged.incomeTax ?? 0)
              return merged
            }),
          }
        }),

      deleteExpense: (id) =>
        set((s) => {
          const original = s.journalEntries.find((e) => e.sourceType === 'Expense' && e.sourceId === id)
          let journalEntries = removeJournalsForSource(s.journalEntries, 'Expense', id)
          if (original) {
            const reversal = createReversalEntry(original, journalEntries, 'Expense deleted')
            if (reversal) journalEntries = [...journalEntries, reversal]
          }
          logAudit({ module: 'Expenses', action: 'Deleted expense', entityId: id })
          return {
            expenses: s.expenses.filter((e) => e.id !== id),
            approvals: s.approvals.filter((a) => a.sourceId !== id),
            journalEntries,
          }
        }),

      processApproval: (id, status, approverId) => {
        const s = get()
        const approval = s.approvals.find((a) => a.id === id)
        if (!approval || approval.status !== 'Pending') return false
        if (approval.requestedById === approverId) return false

        const expenses =
          approval.type === 'Expense' && approval.sourceId
            ? s.expenses.map((e) =>
                e.id === approval.sourceId ? { ...e, approvalStatus: status } : e
              )
            : s.expenses

        const reimbursements =
          approval.type === 'Reimbursement' && approval.sourceId
            ? s.reimbursements.map((r) =>
                r.id === approval.sourceId ? { ...r, status } : r
              )
            : s.reimbursements

        let journalEntries = s.journalEntries
        if (status === 'Approved' && approval.type === 'Expense' && approval.sourceId) {
          const expense = expenses.find((e) => e.id === approval.sourceId)
          if (expense) {
            journalEntries = appendAutoJournal(
              journalEntries,
              createExpensePaymentEntry(expense, journalEntries)
            )
          }
        }

        set({
          approvals: s.approvals.map((a) => (a.id === id ? { ...a, status } : a)),
          expenses,
          reimbursements,
          journalEntries,
        })
        logAudit({ module: 'Approvals', action: `${status} ${approval.type}`, entityId: id, details: approval.title })
        return true
      },

      addUniversity: (university) =>
        set((s) => {
          const seq =
            s.universities
              .map((u) => parseInt((u.universityNo ?? '').replace(/^UNI-/i, ''), 10))
              .filter((n) => !Number.isNaN(n))
              .reduce((m, n) => Math.max(m, n), 0) + 1
          const newUni = {
            ...university,
            id: nextId('uni', s.universities),
            universityNo: `UNI-${String(seq).padStart(3, '0')}`,
          }
          logAudit({ module: 'Settings', action: 'Added university', entityId: newUni.id, details: university.name })
          return { universities: [...s.universities, newUni] }
        }),

      updateUniversity: (id, updates) =>
        set((s) => ({
          universities: s.universities.map((u) => (u.id === id ? { ...u, ...updates } : u)),
        })),

      deleteUniversity: (id) =>
        set((s) => ({ universities: s.universities.filter((u) => u.id !== id) })),

      addBranch: (branch) =>
        set((s) => ({
          branches: [...s.branches, { ...branch, id: nextId('br', s.branches) }],
        })),

      updateBranch: (id, updates) =>
        set((s) => ({
          branches: s.branches.map((b) => (b.id === id ? { ...b, ...updates } : b)),
        })),

      deleteBranch: (id) =>
        set((s) => ({ branches: s.branches.filter((b) => b.id !== id || b.isHeadOffice) })),

      addUser: (user) =>
        set((s) => ({
          users: [...s.users, { ...user, id: nextId('u', s.users) }],
        })),

      updateUser: (id, updates) =>
        set((s) => ({
          users: s.users.map((u) => (u.id === id ? { ...u, ...updates } : u)),
        })),

      deleteUser: (id) =>
        set((s) => ({ users: s.users.filter((u) => u.id !== id) })),

      addPayrollEmployee: (employee) =>
        set((s) => {
          const built = buildPayrollEmployee(employee)
          const seq =
            s.payrollEmployees
              .map((e) => parseInt((e.employeeNo ?? '').replace(/^EMP-/i, ''), 10))
              .filter((n) => !Number.isNaN(n))
              .reduce((m, n) => Math.max(m, n), 0) + 1
          const newEmployee: PayrollEmployee = {
            ...built,
            id: nextId('pe', s.payrollEmployees),
            employeeNo: `EMP-${String(seq).padStart(3, '0')}`,
          }
          logAudit({ module: 'Payroll', action: 'Added employee', entityId: newEmployee.id, details: newEmployee.name })
          return { payrollEmployees: [...s.payrollEmployees, newEmployee] }
        }),

      updatePayrollEmployee: (id, updates) =>
        set((s) => ({
          payrollEmployees: s.payrollEmployees.map((e) => {
            if (e.id !== id) return e
            return recalcEmployee({ ...e, ...updates })
          }),
        })),

      deletePayrollEmployee: (id) =>
        set((s) => {
          logAudit({ module: 'Payroll', action: 'Removed employee', entityId: id })
          return { payrollEmployees: s.payrollEmployees.filter((e) => e.id !== id) }
        }),

      addReimbursement: (claim, requestedById, requestedByName) =>
        set((s) => {
          const year = new Date().getFullYear()
          const prefix = `REIM-${year}-`
          const seq =
            s.reimbursements
              .filter((r) => r.reimbursementNo?.startsWith(prefix))
              .map((r) => parseInt(r.reimbursementNo.slice(prefix.length), 10))
              .filter((n) => !Number.isNaN(n))
              .reduce((m, n) => Math.max(m, n), 0) + 1
          const apPrefix = `APR-${year}-`
          const apSeq =
            s.approvals
              .filter((a) => a.approvalNo?.startsWith(apPrefix))
              .map((a) => parseInt(a.approvalNo.slice(apPrefix.length), 10))
              .filter((n) => !Number.isNaN(n))
              .reduce((m, n) => Math.max(m, n), 0) + 1
          const newClaim: Reimbursement = {
            ...claim,
            id: nextId('rb', s.reimbursements),
            reimbursementNo: `${prefix}${String(seq).padStart(3, '0')}`,
            status: 'Pending',
            requestedById,
          }
          const employee = s.payrollEmployees.find((e) => e.id === claim.employeeId)
          const approval: Approval = {
            id: nextId('ap', s.approvals),
            approvalNo: `${apPrefix}${String(apSeq).padStart(3, '0')}`,
            type: 'Reimbursement',
            title: `${employee?.name ?? 'Employee'} — ${claim.type} claim`,
            amount: claim.amount,
            requestedBy: requestedByName,
            requestedById,
            date: claim.date,
            status: 'Pending',
            branchId: claim.branchId,
            sourceId: newClaim.id,
          }
          logAudit({ module: 'Payroll', action: 'Submitted reimbursement', entityId: newClaim.id })
          return {
            reimbursements: [...s.reimbursements, newClaim],
            approvals: [...s.approvals, approval],
          }
        }),

      processPayrollRun: (period, branchId, processedByName) => {
        const s = get()
        const scopeBranch = branchId === 'all' ? 'ho' : branchId
        const duplicate = s.payrollRuns.some(
          (r) => r.period === period && r.branchId === scopeBranch && (r.status === 'Processed' || r.status === 'Paid')
        )
        if (duplicate) return null

        const employees = s.payrollEmployees.filter(
          (e) => e.isActive && (scopeBranch === 'ho' || e.branchId === scopeBranch)
        )
        if (employees.length === 0) return null

        const runId = nextId('pr', s.payrollRuns)
        let lineCounter = s.payrollLines.length
        const lines: PayrollLine[] = employees.map((emp) => {
          lineCounter += 1
          return buildPayrollLine(runId, emp, s.reimbursements, period, `pl${lineCounter}`)
        })

        const totalGross = lines.reduce((sum, l) => sum + l.grossSalary, 0)
        const totalTax = lines.reduce((sum, l) => sum + l.salaryTax, 0)
        const totalNet = lines.reduce((sum, l) => sum + l.netSalary, 0)
        const totalReimbursements = lines.reduce((sum, l) => sum + l.reimbursements, 0)

        const run: PayrollRun = {
          id: runId,
          period,
          branchId: scopeBranch,
          status: 'Processed',
          runDate: new Date().toISOString().slice(0, 10),
          totalGross,
          totalTax,
          totalNet,
          totalReimbursements,
          employeeCount: employees.length,
          processedByName,
          source: 'Internal',
        }

        set({
          payrollRuns: [...s.payrollRuns, run],
          payrollLines: [...s.payrollLines, ...lines],
        })
        logAudit({ module: 'Payroll', action: 'Processed payroll run', entityId: runId, details: period })
        return runId
      },

      importPayrollRuns: (period, branchGroups, processedByName) => {
        const s = get()
        if (!period || !/^\d{4}-\d{2}$/.test(period)) {
          return { runIds: [], employeesCreated: 0, error: 'Invalid payroll period' }
        }
        if (branchGroups.length === 0) {
          return { runIds: [], employeesCreated: 0, error: 'No payroll lines to import' }
        }

        for (const group of branchGroups) {
          const duplicate = s.payrollRuns.some(
            (r) =>
              r.period === period &&
              r.branchId === group.branchId &&
              (r.status === 'Processed' || r.status === 'Paid')
          )
          if (duplicate) {
            return {
              runIds: [],
              employeesCreated: 0,
              error: `Payroll for ${period} already exists for this branch`,
            }
          }
        }

        let payrollEmployees = [...s.payrollEmployees]
        let payrollRuns = [...s.payrollRuns]
        let payrollLines = [...s.payrollLines]
        let lineCounter = payrollLines.length
        let employeesCreated = 0
        const runIds: string[] = []

        for (const group of branchGroups) {
          if (group.lines.length === 0) continue

          const runId = nextId('pr', payrollRuns)
          const lines: PayrollLine[] = []

          for (const row of group.lines) {
            let employee = matchPayrollEmployee(
              payrollEmployees,
              group.branchId,
              row.employeeName,
              row.employeeCode
            )

            if (!employee) {
              const built = buildPayrollEmployee({
                name: row.employeeName.trim(),
                branchId: group.branchId,
                designation: row.designation.trim() || 'Staff',
                basicSalary: row.basicSalary,
                allowances: row.allowances,
                isActive: true,
              })
              employee = { ...built, id: nextId('pe', payrollEmployees) }
              // Prefer uploaded tax/net figures over FBR recalculation for the register snapshot
              employee = {
                ...employee,
                salaryTax: row.salaryTax,
                netSalary: row.netSalary,
              }
              payrollEmployees = [...payrollEmployees, employee]
              employeesCreated += 1
            }

            lineCounter += 1
            lines.push({
              id: `pl${lineCounter}`,
              payrollRunId: runId,
              employeeId: employee.id,
              basicSalary: row.basicSalary,
              allowances: row.allowances,
              grossSalary: row.grossSalary,
              salaryTax: row.salaryTax,
              netSalary: row.netSalary,
              reimbursements: row.reimbursements,
              totalPayable: row.totalPayable,
            })
          }

          const run: PayrollRun = {
            id: runId,
            period,
            branchId: group.branchId,
            status: 'Processed',
            runDate: new Date().toISOString().slice(0, 10),
            totalGross: lines.reduce((sum, l) => sum + l.grossSalary, 0),
            totalTax: lines.reduce((sum, l) => sum + l.salaryTax, 0),
            totalNet: lines.reduce((sum, l) => sum + l.netSalary, 0),
            totalReimbursements: lines.reduce((sum, l) => sum + l.reimbursements, 0),
            employeeCount: lines.length,
            processedByName,
            source: 'Uploaded',
          }

          payrollRuns = [...payrollRuns, run]
          payrollLines = [...payrollLines, ...lines]
          runIds.push(runId)
        }

        set({ payrollEmployees, payrollRuns, payrollLines })
        logAudit({
          module: 'Payroll',
          action: 'Uploaded external payroll',
          details: `${period} — ${runIds.length} run(s), ${employeesCreated} employee(s) created`,
        })
        return { runIds, employeesCreated }
      },

      markPayrollPaid: (runId) => {
        const s = get()
        const run = s.payrollRuns.find((r) => r.id === runId)
        if (!run || run.status !== 'Processed') return false

        const paidRun: PayrollRun = {
          ...run,
          status: 'Paid',
          paidDate: new Date().toISOString().slice(0, 10),
        }
        let journalEntries = appendAutoJournal(
          s.journalEntries,
          createPayrollPaymentEntry(paidRun, s.journalEntries)
        )

        set({
          payrollRuns: s.payrollRuns.map((r) => (r.id === runId ? paidRun : r)),
          journalEntries,
        })
        logAudit({ module: 'Payroll', action: 'Marked payroll paid', entityId: runId, details: run.period })
        return true
      },

      addSubAgentCommission: (commission) =>
        set((s) => {
          const year = new Date().getFullYear()
          const branchCode = s.branches.find((b) => b.id === commission.branchId)?.code?.toUpperCase() ?? 'GEN'
          const prefix = `COM-${branchCode}-${year}-`
          const seq =
            s.subAgentCommissions
              .filter((c) => c.commissionNo?.startsWith(prefix))
              .map((c) => parseInt(c.commissionNo.slice(prefix.length), 10))
              .filter((n) => !Number.isNaN(n))
              .reduce((m, n) => Math.max(m, n), 0) + 1
          const newCommission: SubAgentCommission = {
            ...commission,
            id: nextId('sc', s.subAgentCommissions),
            commissionNo: `${prefix}${String(seq).padStart(3, '0')}`,
          }
          logAudit({ module: 'Sub-Agent Commission', action: 'Created commission', entityId: newCommission.id })
          return { subAgentCommissions: [...s.subAgentCommissions, newCommission] }
        }),

      updateSubAgentCommission: (id, updates) =>
        set((s) => {
          logAudit({ module: 'Sub-Agent Commission', action: 'Updated commission', entityId: id })
          return {
            subAgentCommissions: s.subAgentCommissions.map((c) => (c.id === id ? { ...c, ...updates } : c)),
          }
        }),

      deleteSubAgentCommission: (id) =>
        set((s) => {
          logAudit({ module: 'Sub-Agent Commission', action: 'Deleted commission', entityId: id })
          return { subAgentCommissions: s.subAgentCommissions.filter((c) => c.id !== id) }
        }),

      addSubAgentPayment: (payment) =>
        set((s) => {
          const year = new Date().getFullYear()
          const prefix = `PV-${year}-`
          const seq =
            s.subAgentPayments
              .filter((p) => p.paymentNo?.startsWith(prefix))
              .map((p) => parseInt(p.paymentNo.slice(prefix.length), 10))
              .filter((n) => !Number.isNaN(n))
              .reduce((m, n) => Math.max(m, n), 0) + 1
          const newPayment: SubAgentPayment = {
            ...payment,
            id: nextId('sp', s.subAgentPayments),
            paymentNo: `${prefix}${String(seq).padStart(3, '0')}`,
          }
          const payments = [...s.subAgentPayments, newPayment]
          const subAgentCommissions = s.subAgentCommissions.map((c) =>
            c.id === newPayment.commissionId ? { ...c, status: deriveCommissionStatus(c, payments) } : c
          )
          logAudit({ module: 'Sub-Agent Payment', action: 'Recorded payment', entityId: newPayment.id, details: newPayment.chequeNo })
          return { subAgentPayments: payments, subAgentCommissions }
        }),

      updateSubAgentPayment: (id, updates) =>
        set((s) => {
          const existing = s.subAgentPayments.find((p) => p.id === id)
          if (!existing) return s
          const payments = s.subAgentPayments.map((p) => (p.id === id ? { ...p, ...updates } : p))
          const affectedIds = new Set([existing.commissionId, updates.commissionId ?? existing.commissionId])
          const subAgentCommissions = s.subAgentCommissions.map((c) =>
            affectedIds.has(c.id) ? { ...c, status: deriveCommissionStatus(c, payments) } : c
          )
          logAudit({ module: 'Sub-Agent Payment', action: 'Updated payment', entityId: id })
          return { subAgentPayments: payments, subAgentCommissions }
        }),

      deleteSubAgentPayment: (id) =>
        set((s) => {
          const removed = s.subAgentPayments.find((p) => p.id === id)
          const payments = s.subAgentPayments.filter((p) => p.id !== id)
          const subAgentCommissions = removed
            ? s.subAgentCommissions.map((c) =>
                c.id === removed.commissionId ? { ...c, status: deriveCommissionStatus(c, payments) } : c
              )
            : s.subAgentCommissions
          logAudit({ module: 'Sub-Agent Payment', action: 'Deleted payment', entityId: id })
          return { subAgentPayments: payments, subAgentCommissions }
        }),
    }),
    {
      name: 'saa-data-store',
      merge: (persisted, current) => {
        // API mode: never rehydrate demo/local rows — sync hooks own the data
        if (isApiMode()) return current
        const p = (persisted ?? {}) as Partial<DataState>
        return {
          ...current,
          ...p,
          invoices: normalizeInvoices((p.invoices as unknown[]) ?? current.invoices),
          otherInvoices: (p.otherInvoices as OtherInvoice[] | undefined) ?? current.otherInvoices,
          subAgents: ((p.subAgents as SubAgent[] | undefined)?.length
            ? (p.subAgents as SubAgent[])
            : current.subAgents
          ).map((a, i) => ({
            id: a.id,
            subAgentNo: a.subAgentNo || `SA-${String(i + 1).padStart(3, '0')}`,
            name: a.name,
            ntn: a.ntn,
            email: a.email,
            contact: a.contact,
            accountTitle: a.accountTitle,
            iban: a.iban,
            accountNo: a.accountNo,
          })),
        }
      },
      onRehydrateStorage: () => (state: DataState | undefined) => {
        if (!state || isApiMode()) return
        state.invoices = normalizeInvoices(state.invoices as unknown as unknown[])
        state.subAgents = state.subAgents.map((a, i) => ({
          ...a,
          subAgentNo: a.subAgentNo || `SA-${String(i + 1).padStart(3, '0')}`,
        }))
        state.reconcileGlPostings()
      },
      partialize: (state) =>
        isApiMode()
          ? ({} as Partial<DataState>)
          : state,
    }
  )
)
