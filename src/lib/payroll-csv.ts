import { parseCsv, downloadTextFile } from '@/lib/student-csv'
import type { Branch, PayrollEmployee } from '@/types'

export { downloadTextFile }

export const PAYROLL_CSV_HEADERS = [
  'Period',
  'Branch',
  'Employee Name',
  'Employee Code',
  'Designation',
  'Basic Salary',
  'Allowances',
  'Gross Salary',
  'Salary Tax',
  'Net Salary',
  'Reimbursements',
  'Total Payable',
] as const

export interface PayrollCsvLinePayload {
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
}

export interface PayrollCsvRowResult {
  rowNumber: number
  period: string
  branchId: string
  payload?: PayrollCsvLinePayload
  error?: string
}

export interface PayrollCsvParseResult {
  rows: PayrollCsvRowResult[]
  period: string | null
  branchGroups: { branchId: string; lines: PayrollCsvLinePayload[] }[]
  valid: number
  failed: number
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[%#]/g, '').replace(/[^a-z0-9]+/g, '_')
}

const HEADER_ALIASES: Record<string, string> = {
  period: 'period',
  payroll_period: 'period',
  month: 'period',
  branch: 'branch',
  branch_id: 'branch',
  branch_code: 'branch',
  employee_name: 'employeeName',
  name: 'employeeName',
  employee: 'employeeName',
  employee_code: 'employeeCode',
  emp_code: 'employeeCode',
  emp_id: 'employeeCode',
  employee_id: 'employeeCode',
  designation: 'designation',
  title: 'designation',
  basic_salary: 'basicSalary',
  basic: 'basicSalary',
  allowances: 'allowances',
  allowance: 'allowances',
  gross_salary: 'grossSalary',
  gross: 'grossSalary',
  salary_tax: 'salaryTax',
  tax: 'salaryTax',
  income_tax: 'salaryTax',
  net_salary: 'netSalary',
  net: 'netSalary',
  reimbursements: 'reimbursements',
  reimbursement: 'reimbursements',
  reimb: 'reimbursements',
  total_payable: 'totalPayable',
  total: 'totalPayable',
  payable: 'totalPayable',
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function parseNumber(raw: string): number | null {
  const cleaned = raw.trim().replace(/,/g, '')
  if (!cleaned) return 0
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

/** Accepts YYYY-MM or MMM-YYYY / month name styles → YYYY-MM */
export function normalizePayrollPeriod(raw: string): string | null {
  const v = raw.trim()
  if (/^\d{4}-\d{2}$/.test(v)) return v
  const slash = v.match(/^(\d{1,2})[/-](\d{4})$/)
  if (slash) {
    const month = Number(slash[1])
    if (month >= 1 && month <= 12) return `${slash[2]}-${String(month).padStart(2, '0')}`
  }
  const named = Date.parse(`1 ${v}`)
  if (!Number.isNaN(named)) {
    const d = new Date(named)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }
  return null
}

function resolveBranchId(raw: string, branchList: Branch[]): string | null {
  const v = raw.trim().toLowerCase()
  if (!v) return null
  const match = branchList.find(
    (b) =>
      !b.isHeadOffice &&
      (b.id.toLowerCase() === v ||
        b.code.toLowerCase() === v ||
        b.name.toLowerCase() === v ||
        b.name.toLowerCase().replace(/\s+branch$/, '') === v)
  )
  return match?.id ?? null
}

export function buildPayrollCsvTemplate(): string {
  const sample = [
    '2026-07',
    'Karachi Branch',
    'Sample Employee',
    'EMP-0001',
    'Counsellor',
    '50000',
    '10000',
    '60000',
    '2500',
    '57500',
    '0',
    '57500',
  ]
  return [PAYROLL_CSV_HEADERS.join(','), sample.map(csvEscape).join(',')].join('\n')
}

export function parsePayrollCsv(
  text: string,
  opts: { branches: Branch[] }
): PayrollCsvParseResult {
  const table = parseCsv(text)
  if (table.length < 2) {
    return { rows: [], period: null, branchGroups: [], valid: 0, failed: 0 }
  }

  const headerCells = table[0].map(normalizeHeader)
  const colIndex: Record<string, number> = {}
  headerCells.forEach((h, i) => {
    const key = HEADER_ALIASES[h]
    if (key && colIndex[key] === undefined) colIndex[key] = i
  })

  const required = ['period', 'branch', 'employeeName'] as const
  for (const key of required) {
    if (colIndex[key] === undefined) {
      return {
        rows: [
          {
            rowNumber: 1,
            period: '',
            branchId: '',
            error: `Missing required column: ${key}`,
          },
        ],
        period: null,
        branchGroups: [],
        valid: 0,
        failed: 1,
      }
    }
  }

  const get = (row: string[], key: string) => {
    const i = colIndex[key]
    return i === undefined ? '' : (row[i] ?? '').trim()
  }

  const rows: PayrollCsvRowResult[] = []
  let valid = 0
  let failed = 0
  let filePeriod: string | null = null
  const groups = new Map<string, PayrollCsvLinePayload[]>()

  for (let r = 1; r < table.length; r++) {
    const row = table[r]
    const rowNumber = r + 1
    const periodRaw = get(row, 'period')
    const period = normalizePayrollPeriod(periodRaw)
    const branchId = resolveBranchId(get(row, 'branch'), opts.branches)
    const employeeName = get(row, 'employeeName')
    const employeeCode = get(row, 'employeeCode') || undefined
    const designation = get(row, 'designation') || 'Staff'

    const basicSalary = parseNumber(get(row, 'basicSalary'))
    const allowances = parseNumber(get(row, 'allowances'))
    const grossSalary = parseNumber(get(row, 'grossSalary'))
    const salaryTax = parseNumber(get(row, 'salaryTax'))
    const netSalary = parseNumber(get(row, 'netSalary'))
    const reimbursements = parseNumber(get(row, 'reimbursements'))
    const totalPayable = parseNumber(get(row, 'totalPayable'))

    if (!period) {
      rows.push({ rowNumber, period: periodRaw, branchId: branchId ?? '', error: 'Invalid period (use YYYY-MM)' })
      failed++
      continue
    }
    if (!branchId) {
      rows.push({ rowNumber, period, branchId: '', error: `Unknown branch: ${get(row, 'branch')}` })
      failed++
      continue
    }
    if (!employeeName) {
      rows.push({ rowNumber, period, branchId, error: 'Employee name is required' })
      failed++
      continue
    }
    if (
      basicSalary === null ||
      allowances === null ||
      grossSalary === null ||
      salaryTax === null ||
      netSalary === null ||
      reimbursements === null ||
      totalPayable === null
    ) {
      rows.push({ rowNumber, period, branchId, error: 'Invalid numeric amount' })
      failed++
      continue
    }

    if (filePeriod === null) filePeriod = period
    else if (filePeriod !== period) {
      rows.push({
        rowNumber,
        period,
        branchId,
        error: `Period must match file period ${filePeriod}`,
      })
      failed++
      continue
    }

    const computedGross = basicSalary + allowances
    const gross = grossSalary > 0 ? grossSalary : computedGross
    const net = netSalary > 0 ? netSalary : Math.max(0, gross - salaryTax)
    const payable = totalPayable > 0 ? totalPayable : net + reimbursements

    const payload: PayrollCsvLinePayload = {
      employeeName,
      employeeCode,
      designation,
      basicSalary,
      allowances,
      grossSalary: gross,
      salaryTax,
      netSalary: net,
      reimbursements,
      totalPayable: payable,
    }

    rows.push({ rowNumber, period, branchId, payload })
    const list = groups.get(branchId) ?? []
    list.push(payload)
    groups.set(branchId, list)
    valid++
  }

  return {
    rows,
    period: filePeriod,
    branchGroups: [...groups.entries()].map(([branchId, lines]) => ({ branchId, lines })),
    valid,
    failed,
  }
}

/** Match existing employee by EMP code or name within branch. */
export function matchPayrollEmployee(
  employees: PayrollEmployee[],
  branchId: string,
  name: string,
  code?: string
): PayrollEmployee | undefined {
  const scoped = employees.filter((e) => e.branchId === branchId)
  if (code) {
    const normalized = code.trim().toUpperCase().replace(/^EMP-0*/, '').replace(/^PE/i, '')
    const byCode = scoped.find((e) => {
      const digits = e.id.replace(/\D/g, '')
      const display = `EMP-${digits.padStart(4, '0')}`
      return (
        e.id.toLowerCase() === code.toLowerCase() ||
        display === code.trim().toUpperCase() ||
        digits === normalized
      )
    })
    if (byCode) return byCode
  }
  const nameLower = name.trim().toLowerCase()
  return scoped.find((e) => e.name.trim().toLowerCase() === nameLower)
}
