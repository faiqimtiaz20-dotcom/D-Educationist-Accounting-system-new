import { GL_ACCOUNTS, DEFAULT_FX_RATES, findAccountName } from '@/lib/coa'
import { calcWHT, grossPKR, netPKR } from '@/lib/calculations'
import { getInvoiceTotal } from '@/lib/invoice'
import { isJournalBalanced } from '@/lib/gl'
import type {
  Expense,
  Invoice,
  JournalEntry,
  JournalLine,
  JournalSourceType,
  PayrollRun,
  PettyCashEntry,
  Receivable,
} from '@/types'

function line(code: string, debit: number, credit: number): JournalLine {
  return { accountCode: code, accountName: findAccountName(code), debit, credit }
}

function nextEntryNo(entries: JournalEntry[]): string {
  const nums = entries
    .map((e) => parseInt(e.entryNo.replace(/\D/g, ''), 10))
    .filter((n) => !Number.isNaN(n))
  const next = nums.length ? Math.max(...nums) + 1 : 1
  return `JE-2026-${String(next).padStart(3, '0')}`
}

function nextJeId(entries: JournalEntry[]): string {
  const nums = entries.map((e) => parseInt(e.id.replace(/\D/g, ''), 10)).filter((n) => !Number.isNaN(n))
  const next = nums.length ? Math.max(...nums) + 1 : 1
  return `je${next}`
}

export function journalExists(
  entries: JournalEntry[],
  sourceType: JournalSourceType,
  sourceId: string
): boolean {
  return entries.some((e) => e.sourceType === sourceType && e.sourceId === sourceId)
}

export function invoiceAmountPKR(invoice: Invoice, exchangeRate?: number): number {
  const amount = getInvoiceTotal(invoice)
  const rate = exchangeRate ?? DEFAULT_FX_RATES[invoice.currency]
  return grossPKR(amount, rate)
}

export function createInvoiceAccrualEntry(
  invoice: Invoice,
  existingEntries: JournalEntry[],
  exchangeRate?: number
): JournalEntry | null {
  if (invoice.status === 'Draft') return null
  if (journalExists(existingEntries, 'Invoice', invoice.id)) return null

  const pkr = invoiceAmountPKR(invoice, exchangeRate)
  const lines: JournalLine[] = [
    line(GL_ACCOUNTS.AR, pkr, 0),
    line(GL_ACCOUNTS.COMMISSION_INCOME, 0, pkr),
  ]
  if (!isJournalBalanced(lines)) return null

  return {
    id: nextJeId(existingEntries),
    entryNo: nextEntryNo(existingEntries),
    date: invoice.invoiceDate,
    branchId: invoice.branchId,
    description: `Commission accrual — ${invoice.invoiceNo}`,
    lines,
    approvalStatus: 'Approved',
    sourceType: 'Invoice',
    sourceId: invoice.id,
    isAutoPosted: true,
  }
}

export function createReceivableReceiptEntry(
  receivable: Receivable,
  invoice: Invoice | undefined,
  existingEntries: JournalEntry[]
): JournalEntry | null {
  if (receivable.isBulkRemittance) return null
  if (journalExists(existingEntries, 'Receivable', receivable.id)) return null

  const gross = grossPKR(receivable.amountReceived, receivable.exchangeRate)
  const wht = calcWHT(gross)
  const net = netPKR(gross)

  const lines: JournalLine[] = [
    line(GL_ACCOUNTS.BANK, net, 0),
    line(GL_ACCOUNTS.WHT_RECEIVABLE, wht, 0),
    line(GL_ACCOUNTS.AR, 0, gross),
  ]
  if (!isJournalBalanced(lines)) return null

  const invNo = invoice?.invoiceNo ?? receivable.invoiceId
  return {
    id: nextJeId(existingEntries),
    entryNo: nextEntryNo(existingEntries),
    date: receivable.receiptDate,
    branchId: invoice?.branchId ?? 'ho',
    description: `University receipt ${receivable.receiptNo} — ${invNo}`,
    lines,
    approvalStatus: 'Approved',
    sourceType: 'Receivable',
    sourceId: receivable.id,
    isAutoPosted: true,
  }
}

export function createExpensePaymentEntry(
  expense: Expense,
  existingEntries: JournalEntry[]
): JournalEntry | null {
  if (expense.approvalStatus !== 'Approved') return null
  if (journalExists(existingEntries, 'Expense', expense.id)) return null

  const inputTax =
    (expense.salesTax ?? 0) + (expense.srbSst ?? 0) + (expense.gst ?? 0)
  const wht = expense.incomeTax ?? 0
  const cashOut = expense.principal + inputTax - wht
  const creditAccount =
    expense.paymentMode === 'Cash' ? GL_ACCOUNTS.CASH : GL_ACCOUNTS.BANK

  const lines: JournalLine[] = [
    line(GL_ACCOUNTS.OPERATING_EXPENSE, expense.principal, 0),
  ]
  if (inputTax > 0) {
    lines.push(line(GL_ACCOUNTS.INPUT_TAX, inputTax, 0))
  }
  if (wht > 0) {
    lines.push(line(GL_ACCOUNTS.TAX_PAYABLE, 0, wht))
  }
  lines.push(line(creditAccount, 0, cashOut))

  if (!isJournalBalanced(lines)) return null

  return {
    id: nextJeId(existingEntries),
    entryNo: nextEntryNo(existingEntries),
    date: expense.date,
    branchId: expense.branchId,
    description: `Expense payment — ${expense.vendor} (${expense.category})`,
    lines,
    approvalStatus: 'Approved',
    sourceType: 'Expense',
    sourceId: expense.id,
    isAutoPosted: true,
  }
}

export function createPettyCashEntry(
  entry: PettyCashEntry,
  existingEntries: JournalEntry[]
): JournalEntry | null {
  if (journalExists(existingEntries, 'PettyCash', entry.id)) return null

  const inputTax =
    (entry.salesTax ?? 0) + (entry.srbSst ?? 0) + (entry.gst ?? 0)
  const wht = entry.incomeTax ?? 0
  const cashOut = entry.principal + inputTax - wht
  const lines: JournalLine[] = entry.type === 'in'
    ? [
        line(GL_ACCOUNTS.CASH, entry.total, 0),
        line(GL_ACCOUNTS.BANK, 0, entry.total),
      ]
    : [
        line(GL_ACCOUNTS.OPERATING_EXPENSE, entry.principal, 0),
        ...(inputTax > 0 ? [line(GL_ACCOUNTS.INPUT_TAX, inputTax, 0)] : []),
        ...(wht > 0 ? [line(GL_ACCOUNTS.TAX_PAYABLE, 0, wht)] : []),
        line(GL_ACCOUNTS.CASH, 0, cashOut),
      ]

  if (!isJournalBalanced(lines)) return null

  return {
    id: nextJeId(existingEntries),
    entryNo: nextEntryNo(existingEntries),
    date: entry.date,
    branchId: entry.branchId,
    description: `Petty cash ${entry.type === 'in' ? 'replenishment' : 'expense'} — ${entry.category}`,
    lines,
    approvalStatus: 'Approved',
    sourceType: 'PettyCash',
    sourceId: entry.id,
    isAutoPosted: true,
  }
}

export function createPayrollPaymentEntry(
  run: PayrollRun,
  existingEntries: JournalEntry[]
): JournalEntry | null {
  if (run.status !== 'Paid') return null
  if (journalExists(existingEntries, 'Payroll', run.id)) return null

  const totalBank = run.totalNet + run.totalReimbursements
  const lines: JournalLine[] = [
    line(GL_ACCOUNTS.PAYROLL, run.totalGross, 0),
    ...(run.totalReimbursements > 0
      ? [line(GL_ACCOUNTS.OPERATING_EXPENSE, run.totalReimbursements, 0)]
      : []),
    line(GL_ACCOUNTS.TAX_PAYABLE, 0, run.totalTax),
    line(GL_ACCOUNTS.BANK, 0, totalBank),
  ]

  if (!isJournalBalanced(lines)) return null

  return {
    id: nextJeId(existingEntries),
    entryNo: nextEntryNo(existingEntries),
    date: run.paidDate ?? run.runDate,
    branchId: run.branchId,
    description: `Payroll disbursement — ${run.period} (${run.employeeCount} employees)`,
    lines,
    approvalStatus: 'Approved',
    sourceType: 'Payroll',
    sourceId: run.id,
    isAutoPosted: true,
  }
}

export function createReversalEntry(
  original: JournalEntry,
  existingEntries: JournalEntry[],
  reason: string
): JournalEntry | null {
  if (journalExists(existingEntries, 'Reversal', original.sourceId ?? original.id)) return null

  const lines = original.lines.map((l) => ({
    ...l,
    debit: l.credit,
    credit: l.debit,
  }))

  return {
    id: nextJeId(existingEntries),
    entryNo: nextEntryNo(existingEntries),
    date: new Date().toISOString().slice(0, 10),
    branchId: original.branchId,
    description: `Reversal: ${original.description} — ${reason}`,
    lines,
    approvalStatus: 'Approved',
    sourceType: 'Reversal',
    sourceId: original.sourceId ?? original.id,
    isAutoPosted: true,
  }
}

/** Backfill auto-postings for transactions that pre-date the GL engine */
export function reconcileMissingPostings(params: {
  invoices: Invoice[]
  receivables: Receivable[]
  expenses: Expense[]
  pettyCash: PettyCashEntry[]
  payrollRuns?: PayrollRun[]
  journalEntries: JournalEntry[]
}): JournalEntry[] {
  let entries = [...params.journalEntries]
  const add = (entry: JournalEntry | null) => {
    if (entry) entries = [...entries, entry]
  }

  for (const invoice of params.invoices) {
    if (invoice.status !== 'Draft') {
      add(createInvoiceAccrualEntry(invoice, entries))
    }
  }
  for (const receivable of params.receivables) {
    const invoice = params.invoices.find((i) => i.id === receivable.invoiceId)
    add(createReceivableReceiptEntry(receivable, invoice, entries))
  }
  for (const expense of params.expenses) {
    add(createExpensePaymentEntry(expense, entries))
  }
  for (const pc of params.pettyCash) {
    add(createPettyCashEntry(pc, entries))
  }
  for (const run of params.payrollRuns ?? []) {
    if (run.status === 'Paid') add(createPayrollPaymentEntry(run, entries))
  }

  return entries
}

export function appendAutoJournal(
  entries: JournalEntry[],
  entry: JournalEntry | null
): JournalEntry[] {
  if (!entry) return entries
  if (journalExists(entries, entry.sourceType!, entry.sourceId!)) return entries
  return [...entries, entry]
}

export function removeJournalsForSource(
  entries: JournalEntry[],
  sourceType: JournalSourceType,
  sourceId: string
): JournalEntry[] {
  return entries.filter((e) => !(e.sourceType === sourceType && e.sourceId === sourceId))
}
