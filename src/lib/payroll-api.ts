import { apiFetch } from '@/lib/api-client'
import type {
  PayrollEmployee,
  PayrollLine,
  PayrollRun,
  PayrollRunStatus,
  Reimbursement,
} from '@/types'

export type ApiEmployee = {
  id: string
  employeeNo: string
  fullName: string
  branchId: string
  designation: string
  basicSalary: number
  allowances: number
  salaryTax: number
  netSalary: number
  email: string | null
  bankAccount: string | null
  isActive: boolean
}

export type ApiPayrollLine = {
  id: string
  payrollRunId: string
  employeeId: string
  employeeName?: string
  basicSalary: number
  allowances: number
  grossSalary: number
  salaryTax: number
  netSalary: number
  reimbursements: number
  totalPayable: number
}

export type ApiPayrollRun = {
  id: string
  runNo: string
  period: string
  branchId: string
  status: PayrollRunStatus
  runDate: string
  paidDate: string | null
  totalGross: number
  totalTax: number
  totalNet: number
  totalReimbursements: number
  employeeCount: number
  processedByName: string | null
  source: 'Internal' | 'Uploaded'
  lines: ApiPayrollLine[]
}

export type ApiReimbursement = {
  id: string
  reimbursementNo: string
  employeeId: string
  branchId: string
  reimbursementType: 'Travel' | 'Fuel' | 'Reimbursement' | 'AdvanceSettlement'
  amount: string | number
  reimbursementDate: string
  status: 'Pending' | 'Approved' | 'Rejected'
  description: string | null
}

const REIMB_TYPE_MAP: Record<
  ApiReimbursement['reimbursementType'],
  Reimbursement['type']
> = {
  Travel: 'Travel',
  Fuel: 'Fuel',
  Reimbursement: 'Reimbursement',
  AdvanceSettlement: 'Advance Settlement',
}

const REIMB_TYPE_TO_API: Record<
  Reimbursement['type'],
  ApiReimbursement['reimbursementType']
> = {
  Travel: 'Travel',
  Fuel: 'Fuel',
  Reimbursement: 'Reimbursement',
  'Advance Settlement': 'AdvanceSettlement',
}

export function mapApiEmployee(e: ApiEmployee): PayrollEmployee {
  return {
    id: e.id,
    employeeNo: e.employeeNo,
    name: e.fullName,
    branchId: e.branchId,
    designation: e.designation,
    basicSalary: Number(e.basicSalary),
    allowances: Number(e.allowances),
    salaryTax: Number(e.salaryTax),
    netSalary: Number(e.netSalary),
    email: e.email ?? undefined,
    bankAccount: e.bankAccount ?? undefined,
    isActive: e.isActive,
  }
}

export function mapApiRun(r: ApiPayrollRun): PayrollRun {
  return {
    id: r.id,
    runNo: r.runNo,
    period: r.period,
    branchId: r.branchId,
    status: r.status,
    runDate: r.runDate.slice(0, 10),
    paidDate: r.paidDate ? r.paidDate.slice(0, 10) : undefined,
    totalGross: Number(r.totalGross),
    totalTax: Number(r.totalTax),
    totalNet: Number(r.totalNet),
    totalReimbursements: Number(r.totalReimbursements),
    employeeCount: r.employeeCount,
    processedByName: r.processedByName ?? undefined,
    source: r.source,
  }
}

export function mapApiLine(l: ApiPayrollLine): PayrollLine {
  return {
    id: l.id,
    payrollRunId: l.payrollRunId,
    employeeId: l.employeeId,
    basicSalary: Number(l.basicSalary),
    allowances: Number(l.allowances),
    grossSalary: Number(l.grossSalary),
    salaryTax: Number(l.salaryTax),
    netSalary: Number(l.netSalary),
    reimbursements: Number(l.reimbursements),
    totalPayable: Number(l.totalPayable),
  }
}

export function mapApiReimbursement(r: ApiReimbursement): Reimbursement {
  return {
    id: r.id,
    reimbursementNo: r.reimbursementNo,
    employeeId: r.employeeId,
    branchId: r.branchId,
    type: REIMB_TYPE_MAP[r.reimbursementType] ?? 'Reimbursement',
    amount: Number(r.amount),
    date: String(r.reimbursementDate).slice(0, 10),
    status: r.status,
    description: r.description ?? undefined,
  }
}

export async function listEmployees(includeInactive = false) {
  const q = includeInactive ? '?includeInactive=1' : ''
  return apiFetch<ApiEmployee[]>(`/employees${q}`)
}

export async function createEmployee(body: {
  fullName: string
  branchId: string
  designation: string
  basicSalary: number
  allowances?: number
  email?: string
  bankAccount?: string
  isActive?: boolean
}) {
  return apiFetch<ApiEmployee>('/employees', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateEmployee(
  id: string,
  body: Partial<{
    fullName: string
    branchId: string
    designation: string
    basicSalary: number
    allowances: number
    email: string
    bankAccount: string
    isActive: boolean
  }>,
) {
  return apiFetch<ApiEmployee>(`/employees/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function deleteEmployee(id: string) {
  return apiFetch(`/employees/${id}`, { method: 'DELETE' })
}

export async function listPayrollRuns(period?: string) {
  const q = period ? `?period=${encodeURIComponent(period)}` : ''
  return apiFetch<ApiPayrollRun[]>(`/payroll-runs${q}`)
}

export async function processPayrollRun(period: string, branchId: string) {
  return apiFetch<ApiPayrollRun>('/payroll-runs/process', {
    method: 'POST',
    body: JSON.stringify({ period, branchId }),
  })
}

export async function importPayrollRuns(body: {
  period: string
  branchGroups: Array<{
    branchId: string
    lines: Array<{
      employeeName: string
      employeeCode?: string
      designation: string
      basicSalary: number
      allowances: number
      grossSalary: number
      salaryTax: number
      netSalary: number
      reimbursements: number
      totalPayable: number
    }>
  }>
}) {
  return apiFetch<{
    runIds: string[]
    employeesCreated: number
    runs: ApiPayrollRun[]
  }>('/payroll-runs/import', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function markPayrollPaid(id: string) {
  return apiFetch<ApiPayrollRun>(`/payroll-runs/${id}/pay`, { method: 'POST' })
}

export async function listReimbursements() {
  return apiFetch<ApiReimbursement[]>('/reimbursements')
}

export async function createReimbursement(body: {
  employeeId: string
  branchId: string
  reimbursementType: ApiReimbursement['reimbursementType']
  amount: number
  reimbursementDate: string
  description?: string
}) {
  return apiFetch<ApiReimbursement>('/reimbursements', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function approveReimbursement(id: string) {
  return apiFetch<ApiReimbursement>(`/reimbursements/${id}/approve`, {
    method: 'POST',
  })
}

export async function rejectReimbursement(id: string) {
  return apiFetch<ApiReimbursement>(`/reimbursements/${id}/reject`, {
    method: 'POST',
  })
}

export { REIMB_TYPE_TO_API }
