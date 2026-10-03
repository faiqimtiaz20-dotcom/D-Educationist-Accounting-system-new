import { apiFetch } from '@/lib/api-client'
import type { Currency, SubAgentCommission, SubAgentPayment } from '@/types'

export type ApiCommission = {
  id: string
  commissionNo: string
  subAgentId: string
  studentId: string
  invoiceId: string
  branchId: string
  grossFee: string | number
  rateGiven: string | number
  exchangeRate: string | number
  followOnBonus: string | number
  currencyCode: string
  payablePkrGross: string | number
  whtPkr: string | number
  payablePkrNet: string | number
  status: 'Pending' | 'Partial' | 'Paid'
  subAgent?: { id: string; name: string }
  student?: { id: string; studentCode: string; fullName: string }
  invoice?: { id: string; invoiceNo: string }
  branch?: { id: string; code: string; name: string } | null
  payments?: Array<{ id: string; amountPkr: string | number }>
}

export type ApiPayment = {
  id: string
  paymentNo: string
  commissionId: string
  subAgentId: string
  bankAccountId: string
  chequeNo: string | null
  amountPkr: string | number
  paymentDate: string
  currencyCode: string
}

export type ApiLedger = {
  subAgentId: string
  totalPayable: number
  totalPaid: number
  outstanding: number
  entries: Array<{
    date: string
    type: 'commission' | 'payment'
    ref: string
    debit: number
    credit: number
    balance: number
    commissionId?: string
    paymentId?: string
  }>
}

export function mapApiCommission(c: ApiCommission): SubAgentCommission {
  return {
    id: c.id,
    commissionNo: c.commissionNo,
    subAgentId: c.subAgentId,
    studentId: c.studentId,
    invoiceId: c.invoiceId,
    branchId: c.branchId,
    branchName: c.branch?.name,
    grossFee: Number(c.grossFee),
    rateGiven: Number(c.rateGiven),
    exchangeRate: Number(c.exchangeRate),
    followOnBonus: Number(c.followOnBonus),
    currency: c.currencyCode as Currency,
    status: c.status,
  }
}

export function mapApiPayment(p: ApiPayment): SubAgentPayment {
  return {
    id: p.id,
    paymentNo: p.paymentNo,
    commissionId: p.commissionId,
    subAgentId: p.subAgentId,
    chequeNo: p.chequeNo ?? '',
    bankAccountId: p.bankAccountId,
    amountPKR: Number(p.amountPkr),
    paymentDate: p.paymentDate.slice(0, 10),
    currency: (p.currencyCode || 'PKR') as Currency,
  }
}

export function listCommissions(subAgentId?: string) {
  const q = subAgentId ? `?subAgentId=${encodeURIComponent(subAgentId)}` : ''
  return apiFetch<ApiCommission[]>(`/sub-agent-commissions${q}`)
}

export function createCommission(body: {
  subAgentId: string
  studentId: string
  invoiceId: string
  branchId: string
  grossFee: number
  rateGiven: number
  exchangeRate: number
  followOnBonus?: number
  currencyCode: string
  status?: SubAgentCommission['status']
}) {
  return apiFetch<ApiCommission>('/sub-agent-commissions', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateCommission(
  id: string,
  body: Partial<{
    grossFee: number
    rateGiven: number
    exchangeRate: number
    followOnBonus: number
    currencyCode: string
    status: SubAgentCommission['status']
  }>,
) {
  return apiFetch<ApiCommission>(`/sub-agent-commissions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function deleteCommission(id: string) {
  return apiFetch<{ success: boolean }>(`/sub-agent-commissions/${id}`, {
    method: 'DELETE',
  })
}

export function listPayments(subAgentId?: string) {
  const q = subAgentId ? `?subAgentId=${encodeURIComponent(subAgentId)}` : ''
  return apiFetch<ApiPayment[]>(`/sub-agent-payments${q}`)
}

export function createPayment(body: {
  commissionId: string
  bankAccountId: string
  amountPkr: number
  paymentDate: string
  chequeNo?: string
  currencyCode?: string
}) {
  return apiFetch<ApiPayment>('/sub-agent-payments', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function deletePayment(id: string) {
  return apiFetch<{ success: boolean }>(`/sub-agent-payments/${id}`, {
    method: 'DELETE',
  })
}

export function getSubAgentLedger(subAgentId: string) {
  return apiFetch<ApiLedger>(`/sub-agents/${subAgentId}/ledger`)
}
