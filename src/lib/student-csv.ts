import type { ApplicationStatus, Branch, Currency, Student, SubAgent, User } from '@/types'

export const STUDENT_CSV_HEADERS = [
  'Student ID',
  'Name',
  'CNIC/Passport',
  'Contact',
  'Email',
  'Branch',
  'Counsellor',
  'Country',
  'University',
  'Course',
  'Intake',
  'Group',
  'Status',
  'Sub-Agent',
  'Tuition Fee',
  'Scholarship',
  'Commission %',
  'Currency',
] as const

const STATUSES: ApplicationStatus[] = ['Applied', 'Offer', 'Visa', 'Enrolled', 'Deferred', 'Withdrawn']
const CURRENCIES: Currency[] = ['GBP', 'USD', 'CAD', 'AUD', 'EUR', 'PKR']

export type StudentCsvPayload = Omit<Student, 'id'>

export interface StudentCsvRowResult {
  rowNumber: number
  studentId: string
  payload?: StudentCsvPayload
  error?: string
}

export interface StudentCsvParseResult {
  rows: StudentCsvRowResult[]
  created: number
  updated: number
  failed: number
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[%#]/g, '').replace(/[^a-z0-9]+/g, '_')
}

const HEADER_ALIASES: Record<string, string> = {
  student_id: 'studentId',
  studentid: 'studentId',
  id: 'studentId',
  name: 'name',
  student_name: 'name',
  cnic_passport: 'cnicPassport',
  cnic: 'cnicPassport',
  passport: 'cnicPassport',
  contact: 'contact',
  phone: 'contact',
  mobile: 'contact',
  email: 'email',
  branch: 'branch',
  branch_id: 'branch',
  branch_code: 'branch',
  counsellor: 'counsellor',
  consultant: 'counsellor',
  consultant_id: 'counsellor',
  country: 'country',
  university: 'university',
  course: 'course',
  intake: 'intake',
  group: 'group',
  status: 'status',
  application_status: 'status',
  sub_agent: 'subAgent',
  subagent: 'subAgent',
  tuition_fee: 'tuitionFee',
  tuition: 'tuitionFee',
  scholarship: 'scholarship',
  commission: 'commissionRate',
  commission_rate: 'commissionRate',
  expected_commission_rate: 'commissionRate',
  currency: 'currency',
}

/** Minimal CSV parser with quoted-field support. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  const pushCell = () => {
    row.push(cell)
    cell = ''
  }
  const pushRow = () => {
    // skip completely empty trailing lines
    if (row.length === 1 && row[0].trim() === '') {
      row = []
      return
    }
    rows.push(row)
    row = []
  }

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const next = text[i + 1]
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        cell += ch
      }
      continue
    }
    if (ch === '"') {
      inQuotes = true
      continue
    }
    if (ch === ',') {
      pushCell()
      continue
    }
    if (ch === '\n') {
      pushCell()
      pushRow()
      continue
    }
    if (ch === '\r') continue
    cell += ch
  }
  pushCell()
  if (row.length > 1 || (row.length === 1 && row[0].trim() !== '')) pushRow()
  return rows
}

export function buildStudentCsvTemplate(): string {
  const sample = [
    'STU-2026-100',
    'Sample Student',
    '42101-1234567-1',
    '+92 300 0000000',
    'sample@email.com',
    'Karachi Branch',
    'Fatima Noor',
    'UK',
    'University of Manchester',
    'MSc Data Science',
    'Sep-2026',
    'G1',
    'Applied',
    '',
    '22000',
    '2000',
    '15',
    'GBP',
  ]
  return [STUDENT_CSV_HEADERS.join(','), sample.map(csvEscape).join(',')].join('\n')
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function resolveBranchId(raw: string, branches: Branch[]): string | null {
  const v = raw.trim().toLowerCase()
  if (!v) return null
  const matches = (b: Branch) =>
    b.id.toLowerCase() === v ||
    b.code.toLowerCase() === v ||
    b.name.toLowerCase() === v ||
    b.name.toLowerCase().replace(/\s+branch$/, '') === v
  const operating = branches.filter((b) => !b.isHeadOffice)
  const pool = operating.length > 0 ? operating : branches
  return pool.find(matches)?.id ?? null
}

function resolveCounsellorId(raw: string, usersList: User[]): string | null {
  const v = raw.trim().toLowerCase()
  if (!v) return null
  const match = usersList.find(
    (u) =>
      u.role === 'Counsellor' &&
      (u.id.toLowerCase() === v || u.name.toLowerCase() === v || u.email.toLowerCase() === v)
  )
  return match?.id ?? null
}

function resolveSubAgentId(raw: string, agents: SubAgent[]): string | undefined {
  const v = raw.trim().toLowerCase()
  if (!v) return undefined
  const match = agents.find(
    (a) =>
      a.id.toLowerCase() === v ||
      a.name.toLowerCase() === v ||
      (a.subAgentNo ?? '').toLowerCase() === v,
  )
  return match?.id
}

function parseStatus(raw: string): ApplicationStatus | null {
  const v = raw.trim()
  if (!v) return 'Applied'
  const match = STATUSES.find((s) => s.toLowerCase() === v.toLowerCase())
  return match ?? null
}

function parseCurrency(raw: string): Currency | null {
  const v = raw.trim().toUpperCase()
  if (!v) return null
  return CURRENCIES.includes(v as Currency) ? (v as Currency) : null
}

export interface StudentCsvContext {
  branches: Branch[]
  users: User[]
  subAgents: SubAgent[]
  existingStudents: Student[]
  /** If set, force all imported rows to this branch (non–super-admin). */
  lockedBranchId?: string
  defaultCounsellorId?: string
}

export function parseStudentCsv(text: string, ctx: StudentCsvContext): StudentCsvParseResult {
  const table = parseCsv(text)
  if (table.length < 2) {
    return { rows: [{ rowNumber: 1, studentId: '', error: 'CSV has no data rows' }], created: 0, updated: 0, failed: 1 }
  }

  const headerCells = table[0].map(normalizeHeader)
  const fieldIndex = new Map<string, number>()
  headerCells.forEach((h, i) => {
    const key = HEADER_ALIASES[h]
    if (key) fieldIndex.set(key, i)
  })

  if (!fieldIndex.has('studentId') || !fieldIndex.has('name')) {
    return {
      rows: [{ rowNumber: 1, studentId: '', error: 'CSV must include Student ID and Name columns' }],
      created: 0,
      updated: 0,
      failed: 1,
    }
  }

  const get = (cells: string[], key: string) => {
    const idx = fieldIndex.get(key)
    return idx === undefined ? '' : (cells[idx] ?? '').trim()
  }

  const existingByStudentId = new Map(
    ctx.existingStudents.map((s) => [s.studentId.trim().toLowerCase(), s])
  )

  const rows: StudentCsvRowResult[] = []
  let created = 0
  let updated = 0
  let failed = 0

  for (let i = 1; i < table.length; i++) {
    const cells = table[i]
    const rowNumber = i + 1
    const studentId = get(cells, 'studentId')
    const name = get(cells, 'name')

    if (!studentId && !name) continue

    if (!studentId) {
      rows.push({ rowNumber, studentId: '', error: 'Student ID is required' })
      failed++
      continue
    }
    if (!name) {
      rows.push({ rowNumber, studentId, error: 'Name is required' })
      failed++
      continue
    }

    const branchRaw = get(cells, 'branch')
    let branchId = resolveBranchId(branchRaw, ctx.branches)
    if (ctx.lockedBranchId) {
      if (branchId && branchId !== ctx.lockedBranchId) {
        rows.push({ rowNumber, studentId, error: `Branch must be your assigned branch` })
        failed++
        continue
      }
      branchId = ctx.lockedBranchId
    } else if (!branchId) {
      rows.push({
        rowNumber,
        studentId,
        error: branchRaw ? `Unknown branch "${branchRaw}"` : 'Branch is required',
      })
      failed++
      continue
    }

    const counsellorRaw = get(cells, 'counsellor')
    let consultantId = resolveCounsellorId(counsellorRaw, ctx.users)
    if (!consultantId) {
      consultantId = ctx.defaultCounsellorId ?? null
    }
    if (!consultantId) {
      rows.push({
        rowNumber,
        studentId,
        error: counsellorRaw ? `Unknown counsellor "${counsellorRaw}"` : 'Counsellor is required',
      })
      failed++
      continue
    }

    const status = parseStatus(get(cells, 'status'))
    if (!status) {
      rows.push({ rowNumber, studentId, error: `Invalid status "${get(cells, 'status')}"` })
      failed++
      continue
    }

    const currency = parseCurrency(get(cells, 'currency'))
    if (!currency) {
      rows.push({
        rowNumber,
        studentId,
        error: get(cells, 'currency') ? `Invalid currency "${get(cells, 'currency')}"` : 'Currency is required',
      })
      failed++
      continue
    }

    const tuitionFee = Number(get(cells, 'tuitionFee') || 0)
    const scholarship = Number(get(cells, 'scholarship') || 0)
    const commissionRate = Number(get(cells, 'commissionRate') || 15)
    if (Number.isNaN(tuitionFee) || Number.isNaN(scholarship) || Number.isNaN(commissionRate)) {
      rows.push({ rowNumber, studentId, error: 'Tuition, scholarship, and commission % must be numbers' })
      failed++
      continue
    }
    if (scholarship > tuitionFee) {
      rows.push({ rowNumber, studentId, error: 'Scholarship cannot exceed tuition fee' })
      failed++
      continue
    }

    const subAgentRaw = get(cells, 'subAgent')
    const subAgentId = resolveSubAgentId(subAgentRaw, ctx.subAgents)
    if (subAgentRaw && !subAgentId) {
      rows.push({ rowNumber, studentId, error: `Unknown sub-agent "${subAgentRaw}"` })
      failed++
      continue
    }

    const payload: StudentCsvPayload = {
      studentId,
      name,
      cnicPassport: get(cells, 'cnicPassport'),
      contact: get(cells, 'contact'),
      email: get(cells, 'email'),
      branchId,
      consultantId,
      country: get(cells, 'country') || 'UK',
      university: get(cells, 'university'),
      course: get(cells, 'course'),
      intake: get(cells, 'intake') || 'Sep-2026',
      group: get(cells, 'group') || 'G1',
      applicationStatus: status,
      subAgentId,
      tuitionFee,
      scholarship,
      expectedCommissionRate: commissionRate,
      currency,
    }

    const existing = existingByStudentId.get(studentId.toLowerCase())
    if (existing) updated++
    else created++

    rows.push({ rowNumber, studentId, payload })
  }

  return { rows, created, updated, failed }
}

export function downloadTextFile(filename: string, content: string, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
