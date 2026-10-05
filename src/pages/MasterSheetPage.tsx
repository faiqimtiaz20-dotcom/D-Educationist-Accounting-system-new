import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageDataSkeleton } from '@/components/shared/PageDataSkeleton'
import { PageHeader } from '@/components/shared/PageHeader'
import { RowActions } from '@/components/shared/RowActions'
import { StatusPill } from '@/components/shared/StatusPill'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { users as mockUsers } from '@/data'
import { useCurrentUser } from '@/hooks/useAuth'
import { useBranchFilter } from '@/hooks/useBranchFilter'
import { isApiMode } from '@/lib/api-client'
import { formatCurrency, netFee } from '@/lib/calculations'
import { toFrontendRole } from '@/lib/api-auth-types'
import { canViewAllBranches } from '@/lib/permissions'
import { getUserName } from '@/lib/org'
import { branchFilterOptions, currencyFilterOptions } from '@/lib/filter-options'
import {
  listUniversities,
  listSubAgents,
  mapApiUniversity,
  mapApiSubAgent,
} from '@/lib/masters-api'
import { listBranches, listUsers, type ApiBranch } from '@/lib/settings-api'
import {
  buildStudentCsvTemplate,
  downloadTextFile,
  parseStudentCsv,
} from '@/lib/student-csv'
import {
  createStudent as apiCreateStudent,
  deleteStudent as apiDeleteStudent,
  listStudentsPage,
  mapApiStudent,
  studentFormToApiPayload,
  updateStudent as apiUpdateStudent,
} from '@/lib/students-api'
import { useDataStore } from '@/store/data-store'
import type { ApplicationStatus, Branch, Student, SubAgent, University, User } from '@/types'
import { ChevronLeft, ChevronRight, Download, Upload } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

const statuses: ApplicationStatus[] = ['Applied', 'Offer', 'Visa', 'Enrolled', 'Deferred', 'Withdrawn']

function mapApiBranch(b: ApiBranch): Branch {
  return {
    id: b.id,
    name: b.name,
    code: b.code,
    city: b.city,
    isHeadOffice: b.isHeadOffice,
  }
}

function mapApiUserRow(u: {
  id: string
  email: string
  fullName: string
  branchId: string
  role: { name: string }
}): User {
  return {
    id: u.id,
    name: u.fullName,
    email: u.email,
    role: toFrontendRole(u.role.name),
    branchId: u.branchId,
  }
}

const emptyStudent = (branchId: string, consultantId: string): Omit<Student, 'id'> => ({
  studentId: `STU-2026-${String(Math.floor(Math.random() * 900) + 100)}`,
  name: '',
  cnicPassport: '',
  contact: '',
  email: '',
  branchId,
  consultantId,
  country: 'UK',
  university: '',
  course: '',
  intake: 'Sep-2026',
  group: 'G1',
  applicationStatus: 'Applied',
  tuitionFee: 0,
  scholarship: 0,
  expectedCommissionRate: 15,
  currency: 'GBP',
})

export default function MasterSheetPage() {
  const currentUser = useCurrentUser()
  const storeBranches = useDataStore((s) => s.branches)
  const storeStudents = useDataStore((s) => s.students)
  const storeUniversities = useDataStore((s) => s.universities)
  const storeSubAgents = useDataStore((s) => s.subAgents)
  const addStudent = useDataStore((s) => s.addStudent)
  const updateStudent = useDataStore((s) => s.updateStudent)
  const deleteStudent = useDataStore((s) => s.deleteStudent)

  const api = isApiMode()
  const [apiStudents, setApiStudents] = useState<Student[]>([])
  const [studentTotal, setStudentTotal] = useState(0)
  const [studentPage, setStudentPage] = useState(0)
  const STUDENT_PAGE = 50
  const [apiBranches, setApiBranches] = useState<Branch[]>([])
  const [apiUniversities, setApiUniversities] = useState<University[]>([])
  const [apiSubAgents, setApiSubAgents] = useState<SubAgent[]>([])
  const [apiUsers, setApiUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(api)
  /** universityId by university name for API writes */
  const [uniIdByName, setUniIdByName] = useState<Record<string, string>>({})

  const [activeStatus, setActiveStatus] = useState('all')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [isNew, setIsNew] = useState(false)
  const [form, setForm] = useState<Student | Omit<Student, 'id'>>(
    emptyStudent('khi', 'u5'),
  )
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isSuperAdmin = currentUser ? canViewAllBranches(currentUser.role) : false
  const isCounsellor = currentUser?.role === 'Counsellor'

  const branches = api ? apiBranches : storeBranches
  const universities = api ? apiUniversities : storeUniversities
  const subAgents = api ? apiSubAgents : storeSubAgents
  const allUsers = api ? apiUsers : mockUsers
  const counsellorUsers = useMemo(
    () => allUsers.filter((u) => u.role === 'Counsellor'),
    [allUsers],
  )
  /** Prefer Counsellors; new tenants with only Tenant Admin still get a named option */
  const consultantOptions = useMemo(() => {
    if (counsellorUsers.length > 0) return counsellorUsers
    const bootstrap = allUsers.filter(
      (u) => u.role === 'Super Admin' || u.role === 'Branch Manager',
    )
    if (bootstrap.length > 0) return bootstrap
    if (currentUser) {
      return [
        {
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          role: currentUser.role,
          branchId: currentUser.branchId,
        } satisfies User,
      ]
    }
    return []
  }, [counsellorUsers, allUsers, currentUser])

  const load = useCallback(async () => {
    if (!api) return
    setLoading(true)
    try {
      const [studentsPage, uniRows, saRows, branchRows, userRows] = await Promise.all([
        listStudentsPage({ take: STUDENT_PAGE, skip: studentPage * STUDENT_PAGE }),
        listUniversities(),
        listSubAgents(),
        listBranches(),
        listUsers(),
      ])
      setApiStudents(studentsPage.items.map(mapApiStudent))
      setStudentTotal(studentsPage.total)
      setApiUniversities(uniRows.map(mapApiUniversity))
      setUniIdByName(Object.fromEntries(uniRows.map((u) => [u.name, u.id])))
      setApiSubAgents(saRows.map(mapApiSubAgent))
      setApiBranches(branchRows.map(mapApiBranch))
      setApiUsers(userRows.map(mapApiUserRow))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load students')
    } finally {
      setLoading(false)
    }
  }, [api, studentPage])

  useEffect(() => {
    void load()
  }, [load])

  const students = api ? apiStudents : storeStudents
  const getSubAgent = (id?: string) => (id ? subAgents.find((a) => a.id === id) : undefined)

  const branchStudents = useBranchFilter(students)
  const scopedStudents = useMemo(() => {
    if (!isCounsellor || !currentUser) return branchStudents
    return branchStudents.filter((s) => s.consultantId === currentUser.id)
  }, [branchStudents, isCounsellor, currentUser])

  const branchOptions = useMemo(() => {
    const operating = branches.filter((b) => !b.isHeadOffice)
    // New tenants may only have HO until operating branches are added
    return operating.length > 0 ? operating : branches
  }, [branches])

  const filtered = useMemo(() => {
    if (activeStatus === 'all') return scopedStudents
    return scopedStudents.filter((s) => s.applicationStatus === activeStatus)
  }, [scopedStudents, activeStatus])

  const statusPills = useMemo(() => {
    const counts = statuses.reduce(
      (acc, status) => {
        acc[status] = scopedStudents.filter((s) => s.applicationStatus === status).length
        return acc
      },
      {} as Record<string, number>,
    )
    return [
      { label: 'All', value: 'all', count: scopedStudents.length },
      ...statuses.map((status) => ({ label: status, value: status, count: counts[status] })),
    ]
  }, [scopedStudents])

  const toOptions = (values: string[]) =>
    [...new Set(values.filter(Boolean))].sort().map((v) => ({ label: v, value: v }))
  const countryFilterOptions = useMemo(
    () => toOptions(scopedStudents.map((s) => s.country)),
    [scopedStudents],
  )
  const universityFilterOptions = useMemo(
    () => toOptions(scopedStudents.map((s) => s.university)),
    [scopedStudents],
  )
  const intakeFilterOptions = useMemo(
    () => toOptions(scopedStudents.map((s) => s.intake)),
    [scopedStudents],
  )

  const defaultBranchId = isSuperAdmin
    ? (branchOptions[0]?.id ?? '')
    : (currentUser?.branchId ?? '')
  // Only lock consultant for Counsellor role; otherwise leave empty (optional)
  const defaultCounsellorId =
    isCounsellor && currentUser?.id ? currentUser.id : ''

  const openAdd = () => {
    setIsNew(true)
    const base = emptyStudent(defaultBranchId, defaultCounsellorId)
    setForm(base)
    setSheetOpen(true)
  }

  const openEdit = (student: Student) => {
    setIsNew(false)
    setForm({ ...student })
    setSheetOpen(true)
  }

  const resolveUniversityId = (universityName: string) => {
    if (api) return uniIdByName[universityName]
    const uni = universities.find((u) => u.name === universityName)
    return uni?.id
  }

  const handleDelete = async (student: Student) => {
    if (!confirm(`Delete student ${student.name}?`)) return
    try {
      if (api) {
        await apiDeleteStudent(student.id)
        await load()
      } else {
        deleteStudent(student.id)
      }
      toast.success('Student deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const handleDownloadTemplate = () => {
    downloadTextFile('master-sheet-template.csv', buildStudentCsvTemplate())
    toast.success('CSV template downloaded')
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImportFile = async (file: File | undefined) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please select a .csv file')
      return
    }
    setImporting(true)
    try {
      const text = await file.text()
      const result = parseStudentCsv(text, {
        branches,
        users: counsellorUsers.length ? counsellorUsers : mockUsers,
        subAgents,
        existingStudents: students,
        lockedBranchId: isSuperAdmin ? undefined : currentUser?.branchId,
        defaultCounsellorId,
      })

      let created = 0
      let updated = 0
      const errors: string[] = [...result.rows.filter((r) => r.error).map((r) => `Row ${r.rowNumber}: ${r.error}`)]

      if (api) {
        const byCode = new Map(apiStudents.map((s) => [s.studentId.trim().toLowerCase(), s.id]))
        for (const row of result.rows) {
          if (row.error || !row.payload) continue
          const uniId = resolveUniversityId(row.payload.university)
          if (!uniId) {
            errors.push(`Row ${row.rowNumber}: Unknown university "${row.payload.university}"`)
            continue
          }
          const payload = studentFormToApiPayload(row.payload, uniId)
          try {
            const existingId = byCode.get(row.payload.studentId.trim().toLowerCase())
            if (existingId) {
              await apiUpdateStudent(existingId, payload)
              updated++
            } else {
              const createdRow = await apiCreateStudent(payload)
              byCode.set(row.payload.studentId.trim().toLowerCase(), createdRow.id)
              created++
            }
          } catch (err) {
            errors.push(
              `Row ${row.rowNumber}: ${err instanceof Error ? err.message : 'Save failed'}`,
            )
          }
        }
        await load()
      } else {
        const byStudentId = new Map(
          useDataStore.getState().students.map((s) => [s.studentId.trim().toLowerCase(), s.id]),
        )
        for (const row of result.rows) {
          if (row.error || !row.payload) continue
          const key = row.payload.studentId.trim().toLowerCase()
          const existingId = byStudentId.get(key)
          if (existingId) {
            updateStudent(existingId, row.payload)
            updated++
          } else {
            addStudent(row.payload)
            const fresh = useDataStore
              .getState()
              .students.find((s) => s.studentId.trim().toLowerCase() === key)
            if (fresh) byStudentId.set(key, fresh.id)
            created++
          }
        }
      }

      if (created === 0 && updated === 0) {
        toast.error(errors[0] ?? 'No valid rows to import')
        if (errors.length > 1) console.warn('CSV import errors', errors)
        return
      }

      const summary = `Imported: ${created} created, ${updated} updated`
      if (errors.length > 0) {
        toast.warning(`${summary}. ${errors.length} row(s) skipped`)
        console.warn('CSV import errors', errors)
      } else {
        toast.success(summary)
      }
    } catch {
      toast.error('Failed to read CSV file')
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const updateField = <K extends keyof Student>(key: K, value: Student[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const loadUniversity = (universityName: string) => {
    const uni = universities.find((u) => u.name === universityName)
    if (!uni) return
    setForm((prev) => ({
      ...prev,
      university: uni.name,
      country: uni.country,
      currency: uni.currency,
      expectedCommissionRate: uni.defaultCommissionRate,
    }))
  }

  const universityOptions = useMemo(() => {
    const names = universities.map((u) => u.name)
    if (form.university && !names.includes(form.university)) {
      return [form.university, ...names]
    }
    return names
  }, [universities, form.university])

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Student name is required')
      return
    }
    if (!form.university) {
      toast.error('Please select a university')
      return
    }
    const branchId = isSuperAdmin ? form.branchId : (currentUser?.branchId ?? form.branchId)
    const consultantId =
      isCounsellor && currentUser ? currentUser.id : form.consultantId
    try {
      if (api) {
        const uniId = resolveUniversityId(form.university)
        if (!uniId) {
          toast.error('Selected university is not registered in the API')
          return
        }
        const payload = studentFormToApiPayload(
          { ...form, branchId, consultantId } as Student,
          uniId,
        )
        if (isNew) {
          await apiCreateStudent(payload)
          toast.success('Student added successfully')
        } else if ('id' in form) {
          await apiUpdateStudent(form.id, payload)
          toast.success('Student updated successfully')
        }
        await load()
      } else if (isNew) {
        addStudent({
          ...(form as Omit<Student, 'id'>),
          branchId,
          consultantId,
        })
        toast.success('Student added successfully')
      } else if ('id' in form) {
        updateStudent(form.id, { ...form, branchId, consultantId })
        toast.success('Student updated successfully')
      }
      setSheetOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    }
  }

  const counsellorDisplayName = (id: string) => {
    if (!id) return 'Select consultant'
    const fromOptions = consultantOptions.find((u) => u.id === id)?.name
    if (fromOptions) return fromOptions
    const fromUsers = allUsers.find((u) => u.id === id)?.name
    if (fromUsers) return fromUsers
    if (currentUser?.id === id) return currentUser.name
    const fromStore = getUserName(id)
    return fromStore !== id ? fromStore : 'Select consultant'
  }

  const columns: Column<Student>[] = [
    { key: 'studentId', header: 'Student ID', cell: (row) => <span className="font-medium">{row.studentId}</span> },
    { key: 'name', header: 'Name', cell: (row) => row.name },
    {
      key: 'branch',
      header: 'Branch',
      cell: (row) => branches.find((b) => b.id === row.branchId)?.name ?? row.branchId,
    },
    { key: 'country', header: 'Country', cell: (row) => row.country },
    { key: 'university', header: 'University', cell: (row) => row.university },
    { key: 'course', header: 'Course', cell: (row) => row.course },
    { key: 'intake', header: 'Intake', cell: (row) => row.intake },
    { key: 'status', header: 'Status', cell: (row) => <StatusPill status={row.applicationStatus} /> },
    {
      key: 'tuitionFee',
      header: 'Tuition Fee',
      className: 'text-right',
      sortAccessor: (row) => row.tuitionFee,
      cell: (row) => formatCurrency(row.tuitionFee, row.currency),
    },
    {
      key: 'scholarship',
      header: 'Scholarship',
      className: 'text-right',
      sortAccessor: (row) => row.scholarship,
      cell: (row) => formatCurrency(row.scholarship, row.currency),
    },
    {
      key: 'netTuition',
      header: 'Net Tuition Fee',
      className: 'text-right',
      sortAccessor: (row) => netFee(row.tuitionFee, row.scholarship),
      cell: (row) => formatCurrency(netFee(row.tuitionFee, row.scholarship), row.currency),
    },
    ...(isCounsellor
      ? []
      : [
          {
            key: 'commission',
            header: 'Expected Commission',
            cell: (row: Student) =>
              formatCurrency(
                (row.tuitionFee - row.scholarship) * (row.expectedCommissionRate / 100),
                row.currency,
              ),
          },
        ]),
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => (
        <RowActions onEdit={() => openEdit(row)} onDelete={() => void handleDelete(row)} />
      ),
    },
  ]

  return (
    <div>
      {api && loading ? (
        <PageDataSkeleton metrics={0} />
      ) : (
      <>
      <PageHeader
        title="Master Sheet"
        subtitle={
          api
            ? 'Student records from API — single source of truth for invoices and receivables'
            : 'Student records — single source of truth for invoices and receivables'
        }
        actionLabel="Add Student"
        onAction={openAdd}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => void handleImportFile(e.target.files?.[0])}
        />
        <Button type="button" variant="outline" onClick={handleDownloadTemplate}>
          <Download className="mr-1 h-4 w-4" /> Template
        </Button>
        <Button type="button" variant="outline" disabled={importing} onClick={handleImportClick}>
          <Upload className="mr-1 h-4 w-4" /> {importing ? 'Importing…' : 'Import CSV'}
        </Button>
      </PageHeader>

      <DataTable
        data={filtered}
        columns={columns}
        pageSize={25}
        searchPlaceholder="Search students, universities, courses..."
        searchFilter={(row, query) =>
          row.name.toLowerCase().includes(query) ||
          row.studentId.toLowerCase().includes(query) ||
          row.university.toLowerCase().includes(query) ||
          row.course.toLowerCase().includes(query)
        }
        statusPills={statusPills}
        activeStatus={activeStatus}
        onStatusChange={setActiveStatus}
        filters={[
          {
            key: 'branch',
            label: 'Branch',
            type: 'select',
            options: api
              ? branchOptions.map((b) => ({ label: b.name, value: b.id }))
              : branchFilterOptions,
            accessor: (r) => r.branchId,
          },
          { key: 'country', label: 'Country', type: 'select', options: countryFilterOptions, accessor: (r) => r.country },
          {
            key: 'university',
            label: 'University',
            type: 'select',
            options: universityFilterOptions,
            accessor: (r) => r.university,
          },
          { key: 'intake', label: 'Intake', type: 'select', options: intakeFilterOptions, accessor: (r) => r.intake },
          { key: 'currency', label: 'Currency', type: 'select', options: currencyFilterOptions, accessor: (r) => r.currency },
          { key: 'tuitionFee', label: 'Tuition Fee', type: 'numberRange', accessor: (r) => r.tuitionFee },
        ]}
      />

      {api ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Server page {studentPage + 1} of {Math.max(1, Math.ceil(studentTotal / STUDENT_PAGE))} ·{' '}
            {studentTotal} students
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={studentPage <= 0 || loading}
              onClick={() => setStudentPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={loading || (studentPage + 1) * STUDENT_PAGE >= studentTotal}
              onClick={() => setStudentPage((p) => p + 1)}
            >
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{isNew ? 'Add Student' : (form as Student).name || 'Student Details'}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Student ID</Label>
                <Input
                  value={'studentId' in form ? form.studentId : ''}
                  onChange={(e) => updateField('studentId', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Student Name</Label>
                <Input value={form.name} onChange={(e) => updateField('name', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>CNIC / Passport</Label>
                <Input
                  value={form.cnicPassport}
                  onChange={(e) => updateField('cnicPassport', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Contact No.</Label>
                <Input value={form.contact} onChange={(e) => updateField('contact', e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Email</Label>
                <Input value={form.email} onChange={(e) => updateField('email', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Branch</Label>
                {isSuperAdmin ? (
                  <Select
                    value={form.branchId}
                    onValueChange={(v) => setForm((prev) => ({ ...prev, branchId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {branchOptions.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={branches.find((b) => b.id === form.branchId)?.name ?? ''}
                    readOnly
                    className="bg-muted/50"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label>Consultant</Label>
                {isCounsellor ? (
                  <Input
                    value={counsellorDisplayName(form.consultantId)}
                    readOnly
                    className="bg-muted/50"
                  />
                ) : (
                  <Select
                    value={form.consultantId || '__none'}
                    onValueChange={(v) =>
                      updateField('consultantId', v === '__none' ? '' : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select consultant (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">None</SelectItem>
                      {consultantOptions.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label>University</Label>
                <Select value={form.university || undefined} onValueChange={loadUniversity}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select registered university" />
                  </SelectTrigger>
                  <SelectContent>
                    {universityOptions.map((name) => {
                      const uni = universities.find((u) => u.name === name)
                      return (
                        <SelectItem key={name} value={name}>
                          {name}
                          {uni ? ` (${uni.country})` : ''}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                {universities.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No universities registered. Add them in Settings → Registered Universities.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input value={form.country} readOnly className="bg-muted/50" />
              </div>
              <div className="space-y-2">
                <Label>Course</Label>
                <Input value={form.course} onChange={(e) => updateField('course', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Intake</Label>
                <Input value={form.intake} onChange={(e) => updateField('intake', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Group</Label>
                <Input value={form.group} onChange={(e) => updateField('group', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Application Status</Label>
                <Select
                  value={form.applicationStatus}
                  onValueChange={(v) => updateField('applicationStatus', v as ApplicationStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sub-Agent</Label>
                <Select
                  value={form.subAgentId ?? 'none'}
                  onValueChange={(v) => updateField('subAgentId', v === 'none' ? undefined : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {subAgents.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tuition Fee</Label>
                <Input
                  type="number"
                  value={form.tuitionFee}
                  onChange={(e) => updateField('tuitionFee', Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Scholarship</Label>
                <Input
                  type="number"
                  value={form.scholarship}
                  onChange={(e) => updateField('scholarship', Number(e.target.value))}
                />
              </div>
              {!isCounsellor && (
                <div className="space-y-2">
                  <Label>Expected Commission %</Label>
                  <Input
                    type="number"
                    value={form.expectedCommissionRate}
                    readOnly
                    className="bg-muted/50"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Currency</Label>
                <Input value={form.currency} readOnly className="bg-muted/50" />
              </div>
            </div>
            {form.subAgentId && (
              <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                Sub-Agent: {getSubAgent(form.subAgentId)?.name}
              </div>
            )}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea placeholder="Additional notes..." rows={3} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setSheetOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void handleSave()}>{isNew ? 'Add Student' : 'Save Changes'}</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      </>
      )}
    </div>
  )
}
