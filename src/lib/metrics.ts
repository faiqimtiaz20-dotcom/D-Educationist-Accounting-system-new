import { getInvoiceLineTotal, getInvoiceOutstanding, getInvoiceTotal, invoiceHasStudent } from '@/lib/invoice'
import type { Expense, Invoice, PettyCashEntry, Receivable, Student } from '@/types'

export interface DashboardMetrics {
  todayCollection: number
  todayExpenses: number
  cashBalance: number
  bankBalance: number
  monthlyRevenue: number
  monthlyExpenses: number
  netProfit: number
  outstandingReceivables: number
  outstandingPayables: number
  pettyCashBalance: number
}

const today = () => new Date().toISOString().slice(0, 10)
const currentMonth = () => today().slice(0, 7)

export function computeDashboardMetrics(
  receivables: Receivable[],
  invoices: Invoice[],
  expenses: Expense[],
  pettyCash: PettyCashEntry[],
  branchId?: string
): DashboardMetrics {
  const inBranch = <T extends { branchId: string }>(items: T[]) =>
    !branchId || branchId === 'all' ? items : items.filter((i) => i.branchId === branchId)

  const branchInvoices = branchId && branchId !== 'all'
    ? invoices.filter((i) => i.branchId === branchId)
    : invoices
  const branchInvoiceIds = new Set(branchInvoices.map((i) => i.id))
  const branchReceivables = receivables.filter((r) => branchInvoiceIds.has(r.invoiceId))
  const branchExpenses = inBranch(expenses)
  const branchPettyCash = inBranch(pettyCash)

  const todayStr = today()
  const monthStr = currentMonth()

  const todayCollection = branchReceivables
    .filter((r) => r.receiptDate === todayStr)
    .reduce((s, r) => s + r.amountReceived * r.exchangeRate, 0)

  const todayExpenses = branchExpenses
    .filter((e) => e.date === todayStr && e.approvalStatus === 'Approved')
    .reduce((s, e) => s + e.total, 0)

  const monthlyRevenue = branchReceivables
    .filter((r) => r.receiptDate.startsWith(monthStr))
    .reduce((s, r) => s + r.amountReceived * r.exchangeRate * 0.99, 0)

  const monthlyExpenses = branchExpenses
    .filter((e) => e.date.startsWith(monthStr) && e.approvalStatus === 'Approved')
    .reduce((s, e) => s + e.total, 0)

  const outstandingReceivables = branchInvoices.reduce((s, inv) => {
    if (inv.status === 'Draft' || inv.status === 'Closed') return s
    return s + getInvoiceOutstanding(inv, receivables)
  }, 0)

  const pettyCashIn = branchPettyCash.filter((e) => e.type === 'in').reduce((s, e) => s + e.total, 0)
  const pettyCashOut = branchPettyCash.filter((e) => e.type === 'out').reduce((s, e) => s + e.total, 0)
  const pettyCashBalance = pettyCashIn - pettyCashOut

  return {
    todayCollection,
    todayExpenses,
    cashBalance: pettyCashBalance,
    bankBalance: 45_000_000,
    monthlyRevenue,
    monthlyExpenses,
    netProfit: monthlyRevenue - monthlyExpenses,
    outstandingReceivables,
    outstandingPayables: 8_500_000,
    pettyCashBalance,
  }
}

export function computeCommissionByUniversity(students: Student[], invoices: Invoice[]) {
  const map = new Map<string, number>()
  for (const inv of invoices) {
    if (inv.status === 'Draft') continue
    for (const line of inv.lines ?? []) {
      const student = students.find((s) => s.id === line.studentId)
      const uni = student?.university ?? 'Unknown'
      const commission = getInvoiceLineTotal(line)
      map.set(uni, (map.get(uni) ?? 0) + commission)
    }
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7)
}

export function computeReceivablesAgeing(invoices: Invoice[], receivables: Receivable[]) {
  const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 }
  const now = new Date()
  for (const inv of invoices) {
    const outstanding = getInvoiceOutstanding(inv, receivables)
    if (outstanding <= 0 || inv.status === 'Draft') continue
    const days = Math.floor((now.getTime() - new Date(inv.invoiceDate).getTime()) / 86400000)
    if (days <= 30) buckets['0-30'] += outstanding
    else if (days <= 60) buckets['31-60'] += outstanding
    else if (days <= 90) buckets['61-90'] += outstanding
    else buckets['90+'] += outstanding
  }
  return Object.entries(buckets).map(([name, value]) => ({ name, value }))
}

export function buildStudentLedger(
  studentId: string,
  invoices: Invoice[],
  receivables: Receivable[]
) {
  const studentInvoices = invoices.filter((i) => invoiceHasStudent(i, studentId))
  const entries: { id: string; date: string; description: string; debit: number; credit: number; reference: string }[] = []

  for (const inv of studentInvoices) {
    const line = (inv.lines ?? []).find((l) => l.studentId === studentId)
    const commission = line ? getInvoiceLineTotal(line) : 0
    const invTotal = getInvoiceTotal(inv)
    const share = invTotal > 0 ? commission / invTotal : 0
    entries.push({
      id: `inv-${inv.id}-${studentId}`,
      date: inv.invoiceDate,
      description: `Invoice ${inv.invoiceNo}`,
      debit: commission,
      credit: 0,
      reference: inv.invoiceNo,
    })
    for (const rec of receivables.filter((r) => r.invoiceId === inv.id)) {
      entries.push({
        id: `rec-${rec.id}-${studentId}`,
        date: rec.receiptDate,
        description: `Payment ${rec.receiptNo}${rec.isPartial ? ' (partial)' : ''}`,
        debit: 0,
        credit: rec.amountReceived * share,
        reference: rec.receiptNo,
      })
    }
  }

  entries.sort((a, b) => a.date.localeCompare(b.date))
  let balance = 0
  return entries.map((e) => {
    balance += e.debit - e.credit
    return { ...e, balance }
  })
}
