import { apiFetch } from '@/lib/api-client'

export type TenantStatus = 'Active' | 'Suspended' | 'Trial'

export type CrmTenantListItem = {
  id: string
  code: string
  name: string
  status: TenantStatus
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  _count?: { users: number; branches: number }
}

export type CreateTenantPayload = {
  code: string
  name: string
  status?: TenantStatus
  adminEmail: string
  adminPassword: string
  adminFullName: string
  branchCode?: string
  branchName?: string
  branchCity?: string
  orgName?: string
}

export type CreateTenantResult = {
  tenant: CrmTenantListItem
  branch: { id: string; code: string; name: string; city: string }
  admin: { id: string; email: string; fullName: string }
  limitsEnforced: boolean
  limitsNote?: string
}

export function listCrmTenants(includeDeleted = false) {
  const q = includeDeleted ? '?includeDeleted=true' : ''
  return apiFetch<CrmTenantListItem[]>(`/crm/tenants${q}`)
}

export function createCrmTenant(body: CreateTenantPayload) {
  return apiFetch<CreateTenantResult>('/crm/tenants', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateCrmTenant(
  id: string,
  body: { name?: string; status?: TenantStatus },
) {
  return apiFetch<CrmTenantListItem>(`/crm/tenants/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function suspendCrmTenant(id: string) {
  return apiFetch<CrmTenantListItem>(`/crm/tenants/${id}/suspend`, {
    method: 'POST',
  })
}

export function activateCrmTenant(id: string) {
  return apiFetch<CrmTenantListItem>(`/crm/tenants/${id}/activate`, {
    method: 'POST',
  })
}
