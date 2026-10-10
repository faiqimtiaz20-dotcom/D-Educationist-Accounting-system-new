import { apiFetch } from '@/lib/api-client'
import type { Course, Currency, SubAgent, TenantCountry, University } from '@/types'

export type ApiUniversityCourseRate = {
  id: string
  courseId: string
  commissionRate: string | number
  course?: { id: string; name: string; isActive?: boolean } | null
}

export type ApiUniversity = {
  id: string
  universityNo: string
  name: string
  countryName: string
  countryCode: string | null
  address: string | null
  vatNumber: string | null
  defaultCommissionRate: string | number
  currencyCode: string
  isActive: boolean
  courseRates?: ApiUniversityCourseRate[]
}

export type ApiTenantCountry = {
  id: string
  name: string
  isoCode: string | null
  isActive: boolean
}

export type ApiCourse = {
  id: string
  name: string
  isActive: boolean
}

export type ApiSubAgent = {
  id: string
  subAgentNo: string
  name: string
  ntn: string | null
  email: string | null
  contact: string | null
  accountTitle: string | null
  iban: string | null
  accountNo: string | null
  isActive: boolean
}

export type ApiCategory = {
  id: string
  name: string
  isActive: boolean
}

export type ApiBankAccount = {
  id: string
  branchId: string
  name: string
  bankName: string
  accountNo: string
  currencyCode: string
  openingBalance: string | number
  isActive: boolean
}

export type ApiGlAccount = {
  id: string
  code: string
  name: string
  accountType: string
  parentId: string | null
  isPostable: boolean
  isActive: boolean
  sortOrder: number
}

const COUNTRY_TO_CODE: Record<string, string> = {
  UK: 'GB',
  USA: 'US',
  Canada: 'CA',
  Australia: 'AU',
  Germany: 'DE',
  Ireland: 'IE',
  'New Zealand': 'NZ',
}

export function mapApiUniversity(u: ApiUniversity): University {
  return {
    id: u.id,
    universityNo: u.universityNo,
    name: u.name,
    country: u.countryName,
    address: u.address ?? '',
    vatNumber: u.vatNumber ?? '',
    defaultCommissionRate: Number(u.defaultCommissionRate),
    courseRates: (u.courseRates ?? []).map((r) => ({
      courseId: r.courseId,
      courseName: r.course?.name,
      commissionRate: Number(r.commissionRate),
    })),
    currency: u.currencyCode as Currency,
  }
}

/** Resolve commission % for university + course (course rate, else university default). */
export function resolveUniversityCourseRate(
  uni: Pick<University, 'defaultCommissionRate' | 'courseRates'> | undefined,
  courseId: string | undefined,
): number {
  if (!uni) return 15
  if (courseId) {
    const match = uni.courseRates?.find((r) => r.courseId === courseId)
    if (match) return match.commissionRate
  }
  return uni.defaultCommissionRate
}

export function mapApiTenantCountry(c: ApiTenantCountry): TenantCountry {
  return {
    id: c.id,
    name: c.name,
    isoCode: c.isoCode ?? undefined,
    isActive: c.isActive,
  }
}

export function mapApiCourse(c: ApiCourse): Course {
  return {
    id: c.id,
    name: c.name,
    isActive: c.isActive,
  }
}

export function mapApiSubAgent(a: ApiSubAgent): SubAgent {
  return {
    id: a.id,
    subAgentNo: a.subAgentNo,
    name: a.name,
    ntn: a.ntn ?? '',
    email: a.email ?? '',
    contact: a.contact ?? '',
    accountTitle: a.accountTitle ?? '',
    iban: a.iban ?? '',
    accountNo: a.accountNo ?? '',
  }
}

export function universityToApiPayload(
  u: Omit<University, 'id' | 'universityNo'>,
  countries?: TenantCountry[],
) {
  const match = countries?.find(
    (c) => c.name.toLowerCase() === u.country.trim().toLowerCase(),
  )
  return {
    name: u.name,
    countryName: u.country,
    countryCode: match?.isoCode ?? COUNTRY_TO_CODE[u.country] ?? undefined,
    address: u.address?.trim() || null,
    vatNumber: u.vatNumber?.trim() || null,
    defaultCommissionRate: u.defaultCommissionRate,
    currencyCode: u.currency,
    courseRates: (u.courseRates ?? []).map((r) => ({
      courseId: r.courseId,
      commissionRate: r.commissionRate,
    })),
  }
}

export function listUniversities() {
  return apiFetch<ApiUniversity[]>('/universities')
}

export function createUniversity(
  body: Omit<University, 'id' | 'universityNo'>,
  countries?: TenantCountry[],
) {
  return apiFetch<ApiUniversity>('/universities', {
    method: 'POST',
    body: JSON.stringify(universityToApiPayload(body, countries)),
  })
}

export function updateUniversity(
  id: string,
  body: Partial<Omit<University, 'id'>>,
  countries?: TenantCountry[],
) {
  const payload: Record<string, unknown> = {}
  if (body.name !== undefined) payload.name = body.name
  if (body.country !== undefined) {
    payload.countryName = body.country
    const match = countries?.find(
      (c) => c.name.toLowerCase() === body.country!.trim().toLowerCase(),
    )
    payload.countryCode = match?.isoCode ?? COUNTRY_TO_CODE[body.country] ?? undefined
  }
  if (body.defaultCommissionRate !== undefined) {
    payload.defaultCommissionRate = body.defaultCommissionRate
  }
  if (body.currency !== undefined) payload.currencyCode = body.currency
  if (body.address !== undefined) payload.address = body.address?.trim() || null
  if (body.vatNumber !== undefined) payload.vatNumber = body.vatNumber?.trim() || null
  if (body.courseRates !== undefined) {
    payload.courseRates = body.courseRates.map((r) => ({
      courseId: r.courseId,
      commissionRate: r.commissionRate,
    }))
  }
  return apiFetch<ApiUniversity>(`/universities/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function deleteUniversity(id: string) {
  return apiFetch<{ success: boolean }>(`/universities/${id}`, { method: 'DELETE' })
}

export function listCountries(includeInactive = false) {
  const q = includeInactive ? '?includeInactive=true' : ''
  return apiFetch<ApiTenantCountry[]>(`/countries${q}`)
}

export function createCountry(body: { name: string; isoCode?: string | null }) {
  return apiFetch<ApiTenantCountry>('/countries', {
    method: 'POST',
    body: JSON.stringify({
      name: body.name,
      isoCode: body.isoCode || undefined,
    }),
  })
}

export function updateCountry(
  id: string,
  body: { name?: string; isoCode?: string | null; isActive?: boolean },
) {
  return apiFetch<ApiTenantCountry>(`/countries/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function deleteCountry(id: string) {
  return apiFetch<{ success: boolean }>(`/countries/${id}`, { method: 'DELETE' })
}

export function listCourses(includeInactive = false) {
  const q = includeInactive ? '?includeInactive=true' : ''
  return apiFetch<ApiCourse[]>(`/courses${q}`)
}

export function createCourse(body: { name: string; isActive?: boolean }) {
  return apiFetch<ApiCourse>('/courses', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateCourse(
  id: string,
  body: { name?: string; isActive?: boolean },
) {
  return apiFetch<ApiCourse>(`/courses/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function deleteCourse(id: string) {
  return apiFetch<{ success: boolean }>(`/courses/${id}`, { method: 'DELETE' })
}

export function listSubAgents() {
  return apiFetch<ApiSubAgent[]>('/sub-agents')
}

export function createSubAgent(body: Omit<SubAgent, 'id' | 'subAgentNo'>) {
  return apiFetch<ApiSubAgent>('/sub-agents', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateSubAgent(id: string, body: Partial<Omit<SubAgent, 'id' | 'subAgentNo'>>) {
  return apiFetch<ApiSubAgent>(`/sub-agents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function deleteSubAgent(id: string) {
  return apiFetch<{ success: boolean }>(`/sub-agents/${id}`, { method: 'DELETE' })
}

export function listPettyCashCategories() {
  return apiFetch<ApiCategory[]>('/petty-cash-categories')
}

export function createPettyCashCategory(name: string) {
  return apiFetch<ApiCategory>('/petty-cash-categories', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export function updatePettyCashCategory(id: string, name: string) {
  return apiFetch<ApiCategory>(`/petty-cash-categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  })
}

export function deletePettyCashCategory(id: string) {
  return apiFetch<{ success: boolean }>(`/petty-cash-categories/${id}`, {
    method: 'DELETE',
  })
}

export function listExpenseCategories() {
  return apiFetch<ApiCategory[]>('/expense-categories')
}

export function listVendors() {
  return apiFetch<
    Array<{ id: string; vendorNo: string; name: string; ntn: string | null; isActive: boolean }>
  >('/vendors')
}

export function listBankAccounts(branchId?: string) {
  const q = branchId ? `?branchId=${encodeURIComponent(branchId)}` : ''
  return apiFetch<ApiBankAccount[]>(`/bank-accounts${q}`)
}

export function createBankAccount(body: {
  branchId: string
  name: string
  bankName: string
  accountNo: string
  currencyCode: string
  openingBalance?: number
  isActive?: boolean
}) {
  return apiFetch<ApiBankAccount>('/bank-accounts', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateBankAccount(
  id: string,
  body: Partial<{
    branchId: string
    name: string
    bankName: string
    accountNo: string
    currencyCode: string
    openingBalance: number
    isActive: boolean
  }>,
) {
  return apiFetch<ApiBankAccount>(`/bank-accounts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function deleteBankAccount(id: string) {
  return apiFetch<{ success: boolean }>(`/bank-accounts/${id}`, { method: 'DELETE' })
}

export function listGlAccounts() {
  return apiFetch<ApiGlAccount[]>('/gl-accounts')
}

export function listCurrencies(enabledOnly = false) {
  const q = enabledOnly ? '?enabledOnly=true' : ''
  return apiFetch<
    Array<{ code: string; name: string; symbol: string | null; isEnabled: boolean }>
  >(`/currencies${q}`)
}

export function listFxRates() {
  return apiFetch<
    Array<{
      id: string
      currencyCode: string
      rateToPkr: string | number
      effectiveDate: string
    }>
  >('/fx-rates')
}

export function upsertFxRate(body: {
  currencyCode: string
  rateToPkr: number
  effectiveDate?: string
}) {
  return apiFetch<{
    id: string
    currencyCode: string
    rateToPkr: string | number
    effectiveDate: string
  }>('/fx-rates', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}
