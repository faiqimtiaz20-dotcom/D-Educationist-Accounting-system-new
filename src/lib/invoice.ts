import { netCommission } from '@/lib/calculations'
import type { Currency, Invoice, InvoiceLine, InvoiceStatus, Receivable, Student } from '@/types'

export function getInvoiceLineTotal(line: InvoiceLine): number {
  return netCommission(line.tuitionFee, line.scholarship, line.commissionRate) + line.bonus
}

/** Migrate legacy single-student invoices persisted in localStorage. */
export function normalizeInvoice(raw: Record<string, unknown>): Invoice {
  const lines = raw.lines
  if (Array.isArray(lines) && lines.length > 0) {
    return raw as unknown as Invoice
  }
  const studentId = typeof raw.studentId === 'string' ? raw.studentId : ''
  const legacyLines: InvoiceLine[] = studentId
    ? [{
        id: `${String(raw.id)}-line1`,
        studentId,
        tuitionFee: Number(raw.tuitionFee ?? 0),
        scholarship: Number(raw.scholarship ?? 0),
        commissionRate: Number(raw.commissionRate ?? 0),
        bonus: Number(raw.bonus ?? 0),
      }]
    : []
  return {
    id: String(raw.id),
    invoiceNo: String(raw.invoiceNo),
    branchId: String(raw.branchId),
    invoiceDate: String(raw.invoiceDate),
    poNumber: typeof raw.poNumber === 'string' ? raw.poNumber : undefined,
    currency: raw.currency as Currency,
    status: raw.status as InvoiceStatus,
    lines: legacyLines,
  }
}

export function normalizeInvoices(list: unknown[]): Invoice[] {
  return list.map((item) => normalizeInvoice(item as Record<string, unknown>))
}

export function linesFinanciallyEqual(a: InvoiceLine[], b: InvoiceLine[]): boolean {
  if (a.length !== b.length) return false
  return a.every((line, i) => {
    const other = b[i]
    return (
      line.studentId === other.studentId &&
      line.tuitionFee === other.tuitionFee &&
      line.scholarship === other.scholarship &&
      line.commissionRate === other.commissionRate &&
      line.bonus === other.bonus
    )
  })
}

export function getInvoiceTotal(invoice: Invoice): number {
  return (invoice.lines ?? []).reduce((sum, line) => sum + getInvoiceLineTotal(line), 0)
}

export function getInvoiceStudentIds(invoice: Invoice): string[] {
  return (invoice.lines ?? []).map((l) => l.studentId)
}

export function invoiceHasStudent(invoice: Invoice, studentId: string): boolean {
  return (invoice.lines ?? []).some((l) => l.studentId === studentId)
}

export function getInvoiceStudentLabel(
  invoice: Invoice,
  getStudent: (id: string) => Student | undefined
): string {
  const lines = invoice.lines ?? []
  if (lines.length === 0) return '—'
  const first = getStudent(lines[0].studentId)
  const name = first?.name ?? lines[0].studentId
  if (lines.length === 1) return name
  return `${name} +${lines.length - 1}`
}

export function getInvoiceUniversities(
  invoice: Invoice,
  getStudent: (id: string) => Student | undefined
): string {
  const unis = [...new Set(
    (invoice.lines ?? [])
      .map((l) => getStudent(l.studentId)?.university)
      .filter(Boolean) as string[]
  )]
  if (unis.length === 0) return '—'
  if (unis.length === 1) return unis[0]
  return `${unis[0]} +${unis.length - 1}`
}

export function getInvoicePaid(receivables: Receivable[], invoiceId: string, excludeReceiptId?: string): number {
  return receivables
    .filter((r) => r.invoiceId === invoiceId && r.id !== excludeReceiptId)
    .reduce((sum, r) => sum + r.amountReceived, 0)
}

export function getInvoiceOutstanding(invoice: Invoice, receivables: Receivable[], excludeReceiptId?: string): number {
  const total = getInvoiceTotal(invoice)
  const paid = getInvoicePaid(receivables, invoice.id, excludeReceiptId)
  return Math.max(0, total - paid)
}

export function getInvoiceReceivables(receivables: Receivable[], invoiceId: string): Receivable[] {
  return receivables
    .filter((r) => r.invoiceId === invoiceId)
    .sort((a, b) => b.receiptDate.localeCompare(a.receiptDate))
}
