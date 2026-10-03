import { apiFetch } from '@/lib/api-client'
import type { TaxRecord } from '@/types'

export type ApiTaxType =
  | 'WhtReceivable'
  | 'WhtPayable'
  | 'GstInput'
  | 'GstOutput'
  | 'SrbSst'
  | 'SalaryTax'

export type ApiTaxRecordRow = {
  id: string
  taxType: ApiTaxType
  type: TaxRecord['type']
  period: string
  periodLabel: string
  amount: number
  branchId: string
  source: 'aggregated' | 'manual'
  sourceType: string | null
  sourceId: string | null
}

export type ApiTaxSummary = {
  period: string
  periodLabel: string
  whtReceivable: number
  whtPayable: number
  gstInput: number
  gstOutput: number
  srbSst: number
  salaryTax: number
  totalLiability: number
  totalReceivable: number
  gstNet: number
  records: ApiTaxRecordRow[]
}

export function mapApiTaxRecord(r: ApiTaxRecordRow): TaxRecord {
  return {
    id: r.id,
    type: r.type,
    period: r.periodLabel || r.period,
    amount: Number(r.amount),
    branchId: r.branchId,
  }
}

export async function getTaxSummary(period: string, branchId?: string) {
  const q = new URLSearchParams({ period })
  if (branchId && branchId !== 'all') q.set('branchId', branchId)
  return apiFetch<ApiTaxSummary>(`/tax/summary?${q}`)
}

export async function listTaxRecords(period: string, branchId?: string) {
  const q = new URLSearchParams({ period })
  if (branchId && branchId !== 'all') q.set('branchId', branchId)
  return apiFetch<ApiTaxRecordRow[]>(`/tax/records?${q}`)
}

export async function createTaxRecord(body: {
  taxType: ApiTaxType
  period: string
  branchId: string
  amount: number
  note?: string
}) {
  return apiFetch(`/tax/records`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function deleteTaxRecord(id: string) {
  return apiFetch(`/tax/records/${id}`, { method: 'DELETE' })
}
