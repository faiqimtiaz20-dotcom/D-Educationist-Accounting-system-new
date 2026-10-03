import { apiFetch } from '@/lib/api-client'
import type {
  Currency,
  Invoice,
  InvoiceLine,
  InvoiceStatus,
  OtherInvoice,
  OtherInvoiceLine,
  OtherInvoiceStatus,
  Receivable,
  ReceivableAllocation,
  ReconciliationStatus,
} from '@/types'

const STATUS_TO_API: Record<InvoiceStatus, string> = {
  Draft: 'Draft',
  Sent: 'Sent',
  'Partially Received': 'PartiallyReceived',
  'Fully Received': 'FullyReceived',
  Closed: 'Closed',
}

const STATUS_FROM_API: Record<string, InvoiceStatus> = {
  Draft: 'Draft',
  Sent: 'Sent',
  PartiallyReceived: 'Partially Received',
  FullyReceived: 'Fully Received',
  Closed: 'Closed',
}

export type ApiInvoice = {
  id: string
  invoiceNo: string
  branchId: string
  universityId: string | null
  invoiceDate: string
  poNumber: string | null
  currencyCode: string
  status: string
  exchangeRate: string | number | null
  notes: string | null
  lines: Array<{
    id: string
    studentId: string
    tuitionFee: string | number
    scholarship: string | number
    commissionRate: string | number
    bonus: string | number
    commissionAmount: string | number
  }>
}

export type ApiOtherInvoice = {
  id: string
  invoiceNo: string
  branchId: string
  invoiceDate: string
  billTo: string
  category: string
  currencyCode: string
  status: OtherInvoiceStatus
  notes: string | null
  lines: Array<{
    id: string
    description: string
    quantity: string | number
    unitPrice: string | number
    lineTotal: string | number
  }>
}

export type ApiReceivable = {
  id: string
  receiptNo: string
  branchId: string
  invoiceId: string | null
  bankAccountId: string
  currencyCode: string
  amountReceived: string | number
  exchangeRate: string | number
  receiptDate: string
  reconciliationStatus: ReconciliationStatus
  isPartial: boolean
  isBulkRemittance: boolean
  allocationStatus: 'pending' | 'allocated' | null
  notes: string | null
  allocations?: Array<{
    id: string
    receivableId: string
    invoiceId: string
    allocatedAmount: string | number
    currencyCode: string
  }>
}

function toDateOnly(iso: string) {
  return iso.slice(0, 10)
}

export function mapApiInvoice(inv: ApiInvoice): Invoice {
  return {
    id: inv.id,
    invoiceNo: inv.invoiceNo,
    branchId: inv.branchId,
    invoiceDate: toDateOnly(inv.invoiceDate),
    poNumber: inv.poNumber ?? undefined,
    currency: inv.currencyCode as Currency,
    status: STATUS_FROM_API[inv.status] ?? 'Draft',
    lines: inv.lines.map((l) => ({
      id: l.id,
      studentId: l.studentId,
      tuitionFee: Number(l.tuitionFee),
      scholarship: Number(l.scholarship),
      commissionRate: Number(l.commissionRate),
      bonus: Number(l.bonus),
    })),
  }
}

export function mapApiOtherInvoice(inv: ApiOtherInvoice): OtherInvoice {
  return {
    id: inv.id,
    invoiceNo: inv.invoiceNo,
    branchId: inv.branchId,
    invoiceDate: toDateOnly(inv.invoiceDate),
    billTo: inv.billTo,
    category: inv.category,
    currency: inv.currencyCode as Currency,
    status: inv.status,
    notes: inv.notes ?? undefined,
    lines: inv.lines.map((l) => ({
      id: l.id,
      description: l.description,
      quantity: Number(l.quantity),
      unitPrice: Number(l.unitPrice),
    })),
  }
}

export function mapApiReceivable(r: ApiReceivable): Receivable {
  return {
    id: r.id,
    receiptNo: r.receiptNo,
    invoiceId: r.invoiceId ?? '',
    bankAccountId: r.bankAccountId,
    currency: r.currencyCode as Currency,
    amountReceived: Number(r.amountReceived),
    exchangeRate: Number(r.exchangeRate),
    receiptDate: toDateOnly(r.receiptDate),
    reconciliationStatus: r.reconciliationStatus,
    isPartial: r.isPartial,
    notes: r.notes ?? undefined,
    isBulkRemittance: r.isBulkRemittance,
    allocationStatus: r.allocationStatus ?? undefined,
  }
}

export function mapApiAllocations(rows: ApiReceivable[]): ReceivableAllocation[] {
  const out: ReceivableAllocation[] = []
  for (const r of rows) {
    for (const a of r.allocations ?? []) {
      out.push({
        id: a.id,
        receivableId: a.receivableId,
        invoiceId: a.invoiceId,
        allocatedAmount: Number(a.allocatedAmount),
        currency: a.currencyCode as Currency,
      })
    }
  }
  return out
}

export function listInvoices() {
  return apiFetch<ApiInvoice[]>('/invoices')
}

export function createInvoice(body: {
  branchId: string
  universityId?: string
  invoiceDate: string
  poNumber?: string
  currencyCode: string
  status?: string
  exchangeRate?: number
  notes?: string
  lines: Array<{
    studentId: string
    tuitionFee: number
    scholarship?: number
    commissionRate: number
    bonus?: number
  }>
}) {
  return apiFetch<ApiInvoice>('/invoices', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateInvoice(
  id: string,
  body: {
    universityId?: string | null
    invoiceDate?: string
    poNumber?: string | null
    currencyCode?: string
    status?: string
    exchangeRate?: number | null
    notes?: string | null
    lines?: Array<{
      studentId: string
      tuitionFee: number
      scholarship?: number
      commissionRate: number
      bonus?: number
    }>
  },
) {
  return apiFetch<ApiInvoice>(`/invoices/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function sendInvoice(
  id: string,
  email?: { to?: string; cc?: string; subject?: string; body?: string },
) {
  return apiFetch<
    ApiInvoice & {
      message?: string
      emailSent?: boolean
      emailError?: string | null
    }
  >(`/invoices/${id}/send`, {
    method: 'POST',
    body: JSON.stringify(email ?? {}),
  })
}

export function deleteInvoice(id: string) {
  return apiFetch<{ success: boolean }>(`/invoices/${id}`, { method: 'DELETE' })
}

export function invoiceFormToApiLines(lines: InvoiceLine[]) {
  return lines.map((l) => ({
    studentId: l.studentId,
    tuitionFee: l.tuitionFee,
    scholarship: l.scholarship,
    commissionRate: l.commissionRate,
    bonus: l.bonus,
  }))
}

export function invoiceStatusToApi(status: InvoiceStatus) {
  return STATUS_TO_API[status]
}

export function listOtherInvoices() {
  return apiFetch<ApiOtherInvoice[]>('/other-invoices')
}

export function createOtherInvoice(body: {
  branchId: string
  invoiceDate: string
  billTo: string
  category: string
  currencyCode: string
  status?: OtherInvoiceStatus
  notes?: string
  lines: OtherInvoiceLine[]
}) {
  return apiFetch<ApiOtherInvoice>('/other-invoices', {
    method: 'POST',
    body: JSON.stringify({
      ...body,
      lines: body.lines.map((l) => ({
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
      })),
    }),
  })
}

export function updateOtherInvoice(
  id: string,
  body: Partial<{
    invoiceDate: string
    billTo: string
    category: string
    currencyCode: string
    status: OtherInvoiceStatus
    notes: string | null
    lines: OtherInvoiceLine[]
  }>,
) {
  return apiFetch<ApiOtherInvoice>(`/other-invoices/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      ...body,
      lines: body.lines?.map((l) => ({
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
      })),
    }),
  })
}

export function deleteOtherInvoice(id: string) {
  return apiFetch<{ success: boolean }>(`/other-invoices/${id}`, { method: 'DELETE' })
}

export function listReceivables() {
  return apiFetch<ApiReceivable[]>('/receivables')
}

export function createReceivable(body: {
  branchId: string
  invoiceId?: string | null
  bankAccountId: string
  currencyCode: string
  amountReceived: number
  exchangeRate: number
  receiptDate: string
  reconciliationStatus?: ReconciliationStatus
  isPartial?: boolean
  isBulkRemittance?: boolean
  notes?: string
}) {
  return apiFetch<ApiReceivable>('/receivables', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function allocateReceivable(
  id: string,
  allocations: Array<{ invoiceId: string; allocatedAmount: number }>,
) {
  return apiFetch<ApiReceivable>(`/receivables/${id}/allocate`, {
    method: 'POST',
    body: JSON.stringify({ allocations }),
  })
}

export function deleteReceivable(id: string) {
  return apiFetch<{ success: boolean }>(`/receivables/${id}`, { method: 'DELETE' })
}
