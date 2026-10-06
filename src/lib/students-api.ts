import { apiFetch, unwrapPage, type PageResult } from '@/lib/api-client'
import type { ApplicationStatus, Currency, Student } from '@/types'

export type ApiStudent = {
  id: string
  studentCode: string
  fullName: string
  cnicPassport: string
  contact: string | null
  email: string | null
  branchId: string
  counsellorId: string | null
  country: string
  universityId: string
  course: string
  intake: string
  studentGroup: string | null
  applicationStatus: ApplicationStatus
  subAgentId: string | null
  tuitionFee: string | number
  scholarship: string | number
  expectedCommissionRate: string | number
  currencyCode: string
  university?: { id: string; name: string; countryName: string; currencyCode: string }
  counsellor?: { id: string; fullName: string; email: string } | null
  branch?: { id: string; code: string; name: string }
  subAgent?: { id: string; name: string } | null
}

export type StudentWritePayload = {
  studentCode: string
  fullName: string
  cnicPassport: string
  contact?: string
  email?: string
  branchId: string
  counsellorId?: string | null
  country: string
  universityId: string
  course: string
  intake: string
  studentGroup?: string
  applicationStatus?: ApplicationStatus
  subAgentId?: string | null
  tuitionFee: number
  scholarship?: number
  expectedCommissionRate: number
  currencyCode: string
}

export function mapApiStudent(s: ApiStudent): Student {
  return {
    id: s.id,
    studentId: s.studentCode,
    name: s.fullName,
    cnicPassport: s.cnicPassport,
    contact: s.contact ?? '',
    email: s.email ?? '',
    branchId: s.branchId,
    consultantId: s.counsellorId ?? '',
    country: s.country,
    university: s.university?.name ?? s.universityId,
    universityId: s.universityId,
    course: s.course,
    intake: s.intake,
    group: s.studentGroup ?? '',
    applicationStatus: s.applicationStatus,
    subAgentId: s.subAgentId ?? undefined,
    tuitionFee: Number(s.tuitionFee),
    scholarship: Number(s.scholarship),
    expectedCommissionRate: Number(s.expectedCommissionRate),
    currency: s.currencyCode as Currency,
  }
}

/** Map UI Student form → API write body (needs universityId resolved). */
export function studentFormToApiPayload(
  form: Omit<Student, 'id'> | Student,
  universityId: string,
): StudentWritePayload {
  return {
    studentCode: form.studentId.trim(),
    fullName: form.name.trim(),
    cnicPassport: form.cnicPassport.trim(),
    contact: form.contact?.trim() || undefined,
    email: form.email?.trim() || undefined,
    branchId: form.branchId,
    counsellorId: form.consultantId?.trim() ? form.consultantId : null,
    country: form.country,
    universityId,
    course: form.course.trim(),
    intake: form.intake.trim(),
    studentGroup: form.group?.trim() || undefined,
    applicationStatus: form.applicationStatus,
    subAgentId: form.subAgentId ?? null,
    tuitionFee: form.tuitionFee,
    scholarship: form.scholarship,
    expectedCommissionRate: form.expectedCommissionRate,
    currencyCode: form.currency,
  }
}

export async function listStudents(params?: {
  branchId?: string
  counsellorId?: string
  universityId?: string
  country?: string
  status?: ApplicationStatus
  intake?: string
  q?: string
  take?: number
  skip?: number
}): Promise<ApiStudent[]> {
  const page = await listStudentsPage(params)
  return page.items
}

export async function listStudentsPage(params?: {
  branchId?: string
  counsellorId?: string
  universityId?: string
  country?: string
  status?: ApplicationStatus
  intake?: string
  q?: string
  take?: number
  skip?: number
}): Promise<PageResult<ApiStudent>> {
  const qs = new URLSearchParams()
  if (params?.branchId) qs.set('branchId', params.branchId)
  if (params?.counsellorId) qs.set('counsellorId', params.counsellorId)
  if (params?.universityId) qs.set('universityId', params.universityId)
  if (params?.country) qs.set('country', params.country)
  if (params?.status) qs.set('status', params.status)
  if (params?.intake) qs.set('intake', params.intake)
  if (params?.q) qs.set('q', params.q)
  if (params?.take != null) qs.set('take', String(params.take))
  if (params?.skip != null) qs.set('skip', String(params.skip))
  const q = qs.toString()
  const data = await apiFetch<ApiStudent[] | PageResult<ApiStudent>>(
    `/students${q ? `?${q}` : ''}`,
  )
  return unwrapPage(data)
}

export function createStudent(body: StudentWritePayload) {
  return apiFetch<ApiStudent>('/students', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateStudent(id: string, body: Partial<StudentWritePayload>) {
  return apiFetch<ApiStudent>(`/students/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function deleteStudent(id: string) {
  return apiFetch<{ success: boolean }>(`/students/${id}`, { method: 'DELETE' })
}
