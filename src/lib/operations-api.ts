import { apiFetch, getApiBaseUrl, loadTokens } from '@/lib/api-client'
import type { Approval, AuditLog, Document } from '@/types'

export type ApiApproval = {
  id: string
  approvalNo: string
  type: Approval['type']
  title: string
  amount: number
  requestedBy: string
  requestedById: string
  date: string
  status: Approval['status']
  branchId: string
  sourceId: string
  sourceType: string
}

export type ApiDocument = {
  id: string
  name: string
  type: Document['type']
  linkedType: string
  linkedId: string
  uploadDate: string
  size: string
}

export type ApiAuditLog = {
  id: string
  userId: string | null
  userName: string
  action: string
  module: string
  entityType: string | null
  entityId: string | null
  timestamp: string
  ip: string
}

export function mapApiApproval(a: ApiApproval): Approval {
  return {
    id: a.id,
    approvalNo: a.approvalNo,
    type: a.type,
    title: a.title,
    amount: Number(a.amount),
    requestedBy: a.requestedBy,
    requestedById: a.requestedById,
    date: a.date.slice(0, 10),
    status: a.status,
    branchId: a.branchId,
    sourceId: a.sourceId,
  }
}

export function mapApiDocument(d: ApiDocument): Document {
  return {
    id: d.id,
    name: d.name,
    type: d.type,
    linkedType: d.linkedType,
    linkedId: d.linkedId,
    uploadDate: d.uploadDate.slice(0, 10),
    size: d.size,
  }
}

export function mapApiAuditLog(l: ApiAuditLog): AuditLog {
  return {
    id: l.id,
    userId: l.userId ?? 'system',
    action: l.action,
    module: l.module,
    timestamp: l.timestamp,
    ip: l.ip || '—',
    entityType: l.entityType ?? undefined,
    entityId: l.entityId ?? undefined,
  }
}

export async function listApprovals(status?: string) {
  const q = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : ''
  return apiFetch<ApiApproval[]>(`/approvals${q}`)
}

export async function decideApproval(
  id: string,
  decision: 'approve' | 'reject',
  note?: string,
) {
  return apiFetch<ApiApproval>(`/approvals/${id}/${decision}`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  })
}

export async function listDocuments() {
  return apiFetch<ApiDocument[]>('/documents')
}

export async function uploadDocument(input: {
  file: File
  name?: string
  docType: Document['type']
  linkedType: string
  linkedId: string
}) {
  const tokens = loadTokens()
  const form = new FormData()
  form.append('file', input.file)
  form.append('docType', input.docType)
  form.append('linkedType', input.linkedType)
  form.append('linkedId', input.linkedId)
  if (input.name) form.append('name', input.name)

  const res = await fetch(`${getApiBaseUrl()}/documents`, {
    method: 'POST',
    headers: tokens?.accessToken
      ? { Authorization: `Bearer ${tokens.accessToken}` }
      : undefined,
    body: form,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Upload failed (${res.status})`)
  }
  return (await res.json()) as ApiDocument
}

export async function deleteDocument(id: string) {
  return apiFetch(`/documents/${id}`, { method: 'DELETE' })
}

export function documentDownloadUrl(id: string) {
  return `${getApiBaseUrl()}/documents/${id}/download`
}

export async function listAuditLogs(params?: {
  module?: string
  userId?: string
  take?: number
  skip?: number
}) {
  const page = await listAuditLogsPage(params)
  return page.items
}

export async function listAuditLogsPage(params?: {
  module?: string
  userId?: string
  take?: number
  skip?: number
}) {
  const q = new URLSearchParams()
  if (params?.module) q.set('module', params.module)
  if (params?.userId) q.set('userId', params.userId)
  if (params?.take) q.set('take', String(params.take))
  if (params?.skip != null) q.set('skip', String(params.skip))
  const qs = q.toString()
  return apiFetch<{
    items: ApiAuditLog[]
    total: number
    take: number
    skip: number
  }>(`/audit-logs${qs ? `?${qs}` : ''}`)
}
