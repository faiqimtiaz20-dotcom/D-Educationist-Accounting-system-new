import { apiFetch, unwrapPage, type PageResult } from '@/lib/api-client'
import type { AccountNode, Currency, JournalEntry, JournalLine, LedgerEntry } from '@/types'

export type ApiJournalLine = {
  lineNo: number
  debit: string | number
  credit: string | number
  memo: string | null
  glAccount: { id: string; code: string; name: string; accountType: string }
}

export type ApiJournal = {
  id: string
  entryNo: string
  entryDate: string
  branchId: string
  description: string
  approvalStatus: 'Pending' | 'Approved' | 'Rejected'
  sourceType: string | null
  sourceId: string | null
  isAutoPosted: boolean
  lines: ApiJournalLine[]
  branch?: { id: string; code: string; name: string }
}

export type ApiTrialBalance = {
  rows: Array<{
    code: string
    name: string
    type: string
    periodDebit: number
    periodCredit: number
    balanceDebit: number
    balanceCredit: number
  }>
  totalDebit: number
  totalCredit: number
  balanced: boolean
}

export type ApiCoaNode = {
  id: string
  code: string
  name: string
  type: string
  balance: number
  isPostable: boolean
  children?: ApiCoaNode[]
}

export type ApiPartyLedger = {
  partyType: string
  partyId: string | null
  partyName: string
  partyCode?: string
  currencyCode?: string
  totalDebit?: number
  totalCredit?: number
  totalPayable?: number
  totalPaid?: number
  totalBills?: number
  outstanding: number
  entries: Array<{
    date: string
    type: string
    ref: string
    debit: number
    credit: number
    balance: number
    description: string
  }>
}

export function mapApiJournal(j: ApiJournal): JournalEntry {
  return {
    id: j.id,
    entryNo: j.entryNo,
    date: j.entryDate.slice(0, 10),
    branchId: j.branchId,
    description: j.description,
    lines: j.lines.map(
      (l): JournalLine => ({
        accountCode: l.glAccount.code,
        accountName: l.glAccount.name,
        debit: Number(l.debit),
        credit: Number(l.credit),
      }),
    ),
    approvalStatus: j.approvalStatus,
    sourceType: (j.sourceType as JournalEntry['sourceType']) ?? undefined,
    sourceId: j.sourceId ?? undefined,
    isAutoPosted: j.isAutoPosted,
  }
}

export function mapApiCoa(nodes: ApiCoaNode[]): AccountNode[] {
  return nodes.map((n) => ({
    id: n.id,
    code: n.code,
    name: n.name,
    type: n.type as AccountNode['type'],
    balance: n.balance,
    children: n.children?.length ? mapApiCoa(n.children) : undefined,
  }))
}

export function mapPartyLedgerEntries(ledger: ApiPartyLedger): LedgerEntry[] {
  return ledger.entries.map((e, i) => ({
    id: `${e.type}-${e.ref}-${i}`,
    date: e.date,
    description: e.description,
    debit: e.debit,
    credit: e.credit,
    reference: e.ref,
    balance: e.balance,
  }))
}

export async function listJournalEntries(params?: {
  sourceType?: string
  approvalStatus?: string
  from?: string
  to?: string
  take?: number
  skip?: number
}): Promise<ApiJournal[]> {
  const page = await listJournalEntriesPage(params)
  return page.items
}

export async function listJournalEntriesPage(params?: {
  sourceType?: string
  approvalStatus?: string
  from?: string
  to?: string
  take?: number
  skip?: number
}): Promise<PageResult<ApiJournal>> {
  const q = new URLSearchParams()
  if (params?.sourceType) q.set('sourceType', params.sourceType)
  if (params?.approvalStatus) q.set('approvalStatus', params.approvalStatus)
  if (params?.from) q.set('from', params.from)
  if (params?.to) q.set('to', params.to)
  if (params?.take != null) q.set('take', String(params.take))
  if (params?.skip != null) q.set('skip', String(params.skip))
  const qs = q.toString()
  const data = await apiFetch<ApiJournal[] | PageResult<ApiJournal>>(
    `/journal-entries${qs ? `?${qs}` : ''}`,
  )
  return unwrapPage(data)
}

export function createJournal(body: {
  branchId: string
  entryDate: string
  description: string
  lines: Array<{ accountCode: string; debit: number; credit: number; memo?: string }>
  approveNow?: boolean
}) {
  return apiFetch<ApiJournal>('/journal-entries', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function approveJournal(id: string) {
  return apiFetch<ApiJournal>(`/journal-entries/${id}/approve`, { method: 'POST' })
}

export function reverseJournal(id: string, body?: { reverseDate?: string; reason?: string }) {
  return apiFetch<ApiJournal>(`/journal-entries/${id}/reverse`, {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
  })
}

export function deleteJournal(id: string) {
  return apiFetch<{ success: boolean }>(`/journal-entries/${id}`, { method: 'DELETE' })
}

export function getTrialBalance(from?: string, to?: string) {
  const q = new URLSearchParams()
  if (from) q.set('from', from)
  if (to) q.set('to', to)
  const qs = q.toString()
  return apiFetch<ApiTrialBalance>(`/gl/trial-balance${qs ? `?${qs}` : ''}`)
}

export function getGlChart() {
  return apiFetch<ApiCoaNode[]>('/gl/chart')
}

export function getStudentLedger(id: string) {
  return apiFetch<ApiPartyLedger>(`/ledgers/students/${id}`)
}

export function getVendorLedger(id: string) {
  return apiFetch<ApiPartyLedger>(`/ledgers/vendors/${encodeURIComponent(id)}`)
}

export function getSubAgentPartyLedger(id: string) {
  return apiFetch<ApiPartyLedger>(`/ledgers/sub-agents/${id}`)
}

export type { Currency }
