import { salaryTax } from '@/lib/calculations'
import type { PayrollEmployee, PayrollLine, Reimbursement } from '@/types'

/** Portion of gross salary exempt from tax before applying Pakistan slabs. */
const TAX_EXEMPT_RATE = 0.1

export function computeSalary(basicSalary: number, allowances: number) {
  const gross = basicSalary + allowances
  const taxableMonthly = gross * (1 - TAX_EXEMPT_RATE)
  const annualTax = salaryTax(taxableMonthly * 12)
  const monthlyTax = Math.round(annualTax / 12)
  const netSalary = Math.round(gross - monthlyTax)
  return { gross, salaryTax: monthlyTax, netSalary }
}

export function buildPayrollEmployee(
  data: Omit<PayrollEmployee, 'id' | 'employeeNo' | 'salaryTax' | 'netSalary'>
): Omit<PayrollEmployee, 'id' | 'employeeNo'> {
  const { salaryTax: tax, netSalary } = computeSalary(data.basicSalary, data.allowances)
  return { ...data, salaryTax: tax, netSalary }
}

export function recalcEmployee(employee: PayrollEmployee): PayrollEmployee {
  const { salaryTax: tax, netSalary } = computeSalary(employee.basicSalary, employee.allowances)
  return { ...employee, salaryTax: tax, netSalary }
}

export function approvedReimbursementsForEmployee(
  reimbursements: Reimbursement[],
  employeeId: string,
  period: string
): number {
  return reimbursements
    .filter(
      (r) =>
        r.employeeId === employeeId &&
        r.status === 'Approved' &&
        r.date.startsWith(period)
    )
    .reduce((s, r) => s + r.amount, 0)
}

export function buildPayrollLine(
  payrollRunId: string,
  employee: PayrollEmployee,
  reimbursements: Reimbursement[],
  period: string,
  lineId: string
): PayrollLine {
  const reimb = approvedReimbursementsForEmployee(reimbursements, employee.id, period)
  const { gross, salaryTax: tax, netSalary } = computeSalary(employee.basicSalary, employee.allowances)
  return {
    id: lineId,
    payrollRunId,
    employeeId: employee.id,
    basicSalary: employee.basicSalary,
    allowances: employee.allowances,
    grossSalary: gross,
    salaryTax: tax,
    netSalary,
    reimbursements: reimb,
    totalPayable: netSalary + reimb,
  }
}

/** Formats an internal employee id (e.g. "pe1") into a display code (e.g. "EMP-0001"). */
export function formatEmployeeCode(id: string): string {
  const num = id.replace(/\D/g, '')
  return num ? `EMP-${num.padStart(4, '0')}` : id.toUpperCase()
}

export function formatPayrollPeriod(period: string): string {
  const [year, month] = period.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('en-PK', { month: 'long', year: 'numeric' })
}

export function currentPayrollPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}
