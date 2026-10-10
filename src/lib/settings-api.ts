import { apiFetch } from '@/lib/api-client'
import type { UserRole } from '@/types'
import type { PermissionLevel } from '@/lib/permissions'

export type ApiBranch = {
  id: string
  code: string
  name: string
  city: string
  isHeadOffice: boolean
  isActive: boolean
}

export type ApiUser = {
  id: string
  email: string
  fullName: string
  branchId: string
  isActive: boolean
  role: { id: string; code: string; name: string }
  branch: { id: string; code: string; name: string; city: string }
}

export type InvoiceBranding = {
  logoPath: string | null
  hasLogo: boolean
  address: string
  phone: string
  email: string
  website: string
  footer: string
  documentTitle: string
  accentColor: string
  emailSubject: string
  emailBody: string
  companyLegalName: string
  bankName: string
  bankBranch: string
  bankCity: string
  accountTitle: string
  accountNo: string
  swiftCode: string
  iban: string
}

export type ApiSettings = {
  whtRatePercent: number
  enabledCurrencies: string[]
  fiscalPeriodLockedUntil: string | null
  orgName: string
  invoiceBranding?: InvoiceBranding
}

export const ROLE_NAME_TO_CODE: Record<UserRole, string> = {
  'Super Admin': 'TENANT_ADMIN',
  'Branch Manager': 'BRANCH_MANAGER',
  Accountant: 'ACCOUNTANT',
  Cashier: 'CASHIER',
  Counsellor: 'COUNSELLOR',
  'Read Only': 'READ_ONLY',
}

export const MODULE_NAME_TO_CODE: Record<string, string> = {
  'Dashboard & Reports': 'DASHBOARD_REPORTS',
  'Master Sheet / Students': 'MASTER_SHEET',
  'Invoices & Receivables': 'INVOICES_RECEIVABLES',
  'Expenses & Petty Cash': 'EXPENSES_PETTY_CASH',
  'Journal Entries': 'JOURNAL_ENTRIES',
  Approvals: 'APPROVALS',
  Settings: 'SETTINGS',
  'Sub-Agents & Payables': 'SUB_AGENTS_PAYABLES',
  'Bank & Cash': 'BANK_CASH',
  'Tax & Compliance': 'TAX_COMPLIANCE',
  Operations: 'OPERATIONS',
}

export function listBranches() {
  return apiFetch<ApiBranch[]>('/branches')
}

export function createBranch(body: {
  code: string
  name: string
  city: string
  isHeadOffice?: boolean
}) {
  return apiFetch<ApiBranch>('/branches', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateBranch(
  id: string,
  body: Partial<{ code: string; name: string; city: string; isActive: boolean }>,
) {
  return apiFetch<ApiBranch>(`/branches/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function deleteBranch(id: string) {
  return apiFetch<{ success: boolean }>(`/branches/${id}`, { method: 'DELETE' })
}

export function listUsers() {
  return apiFetch<ApiUser[]>('/users')
}

export function createUser(body: {
  email: string
  password: string
  fullName: string
  roleCode: string
  branchId: string
}) {
  return apiFetch<ApiUser>('/users', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateUser(
  id: string,
  body: Partial<{
    email: string
    password: string
    fullName: string
    roleCode: string
    branchId: string
    isActive: boolean
  }>,
) {
  return apiFetch<ApiUser>(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function deleteUser(id: string) {
  return apiFetch<{ success: boolean }>(`/users/${id}`, { method: 'DELETE' })
}

export function getSettings() {
  return apiFetch<ApiSettings>('/settings')
}

export function patchSettings(
  body: Partial<
    ApiSettings & {
      invoiceAddress?: string
      invoicePhone?: string
      invoiceEmail?: string
      invoiceWebsite?: string
      invoiceFooter?: string
      invoiceDocumentTitle?: string
      invoiceAccentColor?: string
      invoiceEmailSubject?: string
      invoiceEmailBody?: string
      invoiceCompanyLegalName?: string
      invoiceBankName?: string
      invoiceBankBranch?: string
      invoiceBankCity?: string
      invoiceAccountTitle?: string
      invoiceAccountNo?: string
      invoiceSwiftCode?: string
      invoiceIban?: string
    }
  >,
) {
  return apiFetch<ApiSettings>('/settings', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function uploadInvoiceLogo(file: File) {
  const { getApiBaseUrl, loadTokens, ApiError } = await import('@/lib/api-client')
  const tokens = loadTokens()
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${getApiBaseUrl()}/settings/invoice-logo`, {
    method: 'POST',
    headers: tokens?.accessToken
      ? { Authorization: `Bearer ${tokens.accessToken}` }
      : {},
    body: form,
  })
  if (!res.ok) {
    let message = res.statusText
    try {
      const data = (await res.json()) as { message?: string | string[] }
      if (Array.isArray(data.message)) message = data.message.join(', ')
      else if (data.message) message = data.message
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, message)
  }
  return (await res.json()) as ApiSettings
}

export function deleteInvoiceLogo() {
  return apiFetch<ApiSettings>('/settings/invoice-logo', { method: 'DELETE' })
}

export async function fetchInvoiceLogoObjectUrl(): Promise<string | null> {
  const { getApiBaseUrl, loadTokens } = await import('@/lib/api-client')
  const tokens = loadTokens()
  if (!tokens?.accessToken) return null
  const res = await fetch(`${getApiBaseUrl()}/settings/invoice-logo`, {
    headers: { Authorization: `Bearer ${tokens.accessToken}` },
  })
  if (!res.ok) return null
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}

export function getPermissionMatrix() {
  return apiFetch<{
    roles: { code: string; name: string }[]
    modules: { code: string; name: string }[]
    matrix: {
      moduleCode: string
      moduleName: string
      permissions: Record<string, PermissionLevel | string>
    }[]
  }>('/permissions/matrix')
}

export function putPermissionMatrix(
  cells: { roleCode: string; moduleCode: string; level: PermissionLevel }[],
) {
  return apiFetch('/permissions/matrix', {
    method: 'PUT',
    body: JSON.stringify({ cells }),
  })
}
