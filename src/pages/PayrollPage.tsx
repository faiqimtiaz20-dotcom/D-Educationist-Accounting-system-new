import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageDataSkeleton } from '@/components/shared/PageDataSkeleton'
import { MetricCard } from '@/components/shared/MetricCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { RowActions } from '@/components/shared/RowActions'
import { StatusPill } from '@/components/shared/StatusPill'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { branches as mockBranches } from '@/data'
import { getBranchName } from '@/lib/org'
import { isApiMode } from '@/lib/api-client'
import { useCurrentUser, useEffectiveBranchId } from '@/hooks/useAuth'
import { useBranchFilter } from '@/hooks/useBranchFilter'
import { usePayrollApiSync } from '@/hooks/usePayrollApiSync'
import { useModulePermission } from '@/hooks/usePermission'
import { useSubmitState } from '@/hooks/useSubmitState'
import { computeSalary, currentPayrollPeriod, formatEmployeeCode, formatPayrollPeriod } from '@/lib/payroll'
import {
  approveReimbursement,
  createEmployee,
  createReimbursement,
  deleteEmployee as apiDeleteEmployee,
  importPayrollRuns as apiImportPayrollRuns,
  markPayrollPaid as apiMarkPayrollPaid,
  processPayrollRun as apiProcessPayrollRun,
  rejectReimbursement,
  REIMB_TYPE_TO_API,
  updateEmployee,
} from '@/lib/payroll-api'
import {
  buildPayrollCsvTemplate,
  downloadTextFile,
  parsePayrollCsv,
} from '@/lib/payroll-csv'
import { formatCurrency } from '@/lib/calculations'
import { branchFilterOptions } from '@/lib/filter-options'
import { useDataStore } from '@/store/data-store'
import type { PayrollEmployee, PayrollLine, PayrollRun, Reimbursement } from '@/types'
import { Banknote, CheckCircle, Download, FileText, Play, Upload, Users } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

const REIMBURSEMENT_TYPES = ['Travel', 'Fuel', 'Reimbursement', 'Advance Settlement'] as const

const emptyEmployee = {
  name: '',
  branchId: '',
  designation: '',
  basicSalary: 0,
  allowances: 0,
  email: '',
  bankAccount: '',
  isActive: true,
}

const emptyReimbursement = {
  employeeId: '',
  branchId: '',
  type: 'Travel' as Reimbursement['type'],
  amount: 0,
  date: new Date().toISOString().slice(0, 10),
  description: '',
}

export default function PayrollPage() {
  const user = useCurrentUser()
  const branchId = useEffectiveBranchId()
  const { canWrite, canApprove } = useModulePermission('Operations')
  const { api, reload, loading } = usePayrollApiSync()

  const payrollEmployees = useDataStore((s) => s.payrollEmployees)
  const payrollLines = useDataStore((s) => s.payrollLines)
  const runs = useDataStore((s) => s.payrollRuns)
  const reimbursements = useDataStore((s) => s.reimbursements)
  const processApproval = useDataStore((s) => s.processApproval)
  const approvals = useDataStore((s) => s.approvals)

  const addPayrollEmployee = useDataStore((s) => s.addPayrollEmployee)
  const updatePayrollEmployee = useDataStore((s) => s.updatePayrollEmployee)
  const deletePayrollEmployee = useDataStore((s) => s.deletePayrollEmployee)
  const addReimbursement = useDataStore((s) => s.addReimbursement)
  const processPayrollRun = useDataStore((s) => s.processPayrollRun)
  const importPayrollRuns = useDataStore((s) => s.importPayrollRuns)
  const markPayrollPaid = useDataStore((s) => s.markPayrollPaid)
  const storeBranches = useDataStore((s) => s.branches)
  const branches = storeBranches.length > 0
    ? storeBranches
    : isApiMode()
      ? []
      : mockBranches

  const employees = useBranchFilter(payrollEmployees.filter((e) => e.isActive))
  const branchRuns = useBranchFilter(runs)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const defaultBranchId = () => {
    if (branchId !== 'all') return branchId
    return (
      branches.find((b) => b.isHeadOffice)?.id ??
      branches[0]?.id ??
      ''
    )
  }

  const resolveProcessBranchId = () => {
    if (branchId !== 'all') return branchId
    return defaultBranchId() || branchId
  }

  const [period, setPeriod] = useState(currentPayrollPeriod())
  const [importing, setImporting] = useState(false)
  const [empDialogOpen, setEmpDialogOpen] = useState(false)
  const [isEditEmp, setIsEditEmp] = useState(false)
  const [editEmpId, setEditEmpId] = useState<string | null>(null)
  const [empForm, setEmpForm] = useState(emptyEmployee)

  const [reimbDialogOpen, setReimbDialogOpen] = useState(false)
  const [reimbForm, setReimbForm] = useState(emptyReimbursement)

  const [payslipRun, setPayslipRun] = useState<PayrollRun | null>(null)
  const [reimbStatus, setReimbStatus] = useState('all')
  const { submitting: savingEmployee, runSubmit: runSaveEmployee } = useSubmitState()
  const { submitting: processingPayroll, runSubmit: runProcessPayroll } = useSubmitState()
  const { submitting: savingReimb, runSubmit: runSaveReimb } = useSubmitState()

  const previewLines = useMemo(() => {
    return employees.map((emp) => {
      const reimb = reimbursements
        .filter((r) => r.employeeId === emp.id && r.status === 'Approved' && r.date.startsWith(period))
        .reduce((s, r) => s + r.amount, 0)
      const { gross, salaryTax, netSalary } = computeSalary(emp.basicSalary, emp.allowances)
      return { emp, gross, salaryTax, netSalary, reimb, total: netSalary + reimb }
    })
  }, [employees, reimbursements, period])

  const previewTotals = useMemo(() => ({
    gross: previewLines.reduce((s, l) => s + l.gross, 0),
    tax: previewLines.reduce((s, l) => s + l.salaryTax, 0),
    net: previewLines.reduce((s, l) => s + l.netSalary, 0),
    reimb: previewLines.reduce((s, l) => s + l.reimb, 0),
    payable: previewLines.reduce((s, l) => s + l.total, 0),
  }), [previewLines])

  const existingRunForPeriod = runs.find(
    (r) =>
      r.period === period &&
      (r.branchId === branchId ||
        r.branchId === resolveProcessBranchId() ||
        (branchId === 'all' &&
          (storeBranches.find((b) => b.id === r.branchId)?.isHeadOffice ||
            r.branchId === 'ho')))
  )

  const branchReimbursements = useBranchFilter(reimbursements)
  const filteredReimbursements = reimbStatus === 'all'
    ? branchReimbursements
    : branchReimbursements.filter((r) => r.status === reimbStatus)

  const employeeMap = useMemo(
    () => Object.fromEntries(payrollEmployees.map((e) => [e.id, e.name])),
    [payrollEmployees]
  )

  const openAddEmployee = () => {
    setIsEditEmp(false)
    setEditEmpId(null)
    setEmpForm({ ...emptyEmployee, branchId: defaultBranchId() })
    setEmpDialogOpen(true)
  }

  const openEditEmployee = (emp: PayrollEmployee) => {
    setIsEditEmp(true)
    setEditEmpId(emp.id)
    setEmpForm({
      name: emp.name,
      branchId: emp.branchId,
      designation: emp.designation,
      basicSalary: emp.basicSalary,
      allowances: emp.allowances,
      email: emp.email ?? '',
      bankAccount: emp.bankAccount ?? '',
      isActive: emp.isActive,
    })
    setEmpDialogOpen(true)
  }

  const saveEmployee = async () => {
    if (!empForm.name.trim() || !empForm.designation.trim()) {
      toast.error('Name and designation are required')
      return
    }
    if (!empForm.branchId) {
      toast.error('Branch is required')
      return
    }
    await runSaveEmployee(async () => {
      try {
        if (api) {
          if (isEditEmp && editEmpId) {
            await updateEmployee(editEmpId, {
              fullName: empForm.name,
              branchId: empForm.branchId,
              designation: empForm.designation,
              basicSalary: empForm.basicSalary,
              allowances: empForm.allowances,
              email: empForm.email || undefined,
              bankAccount: empForm.bankAccount || undefined,
              isActive: empForm.isActive,
            })
            toast.success('Employee updated')
          } else {
            await createEmployee({
              fullName: empForm.name,
              branchId: empForm.branchId,
              designation: empForm.designation,
              basicSalary: empForm.basicSalary,
              allowances: empForm.allowances,
              email: empForm.email || undefined,
              bankAccount: empForm.bankAccount || undefined,
              isActive: empForm.isActive,
            })
            toast.success('Employee added')
          }
          await reload()
        } else if (isEditEmp && editEmpId) {
          updatePayrollEmployee(editEmpId, empForm)
          toast.success('Employee updated')
        } else {
          addPayrollEmployee(empForm)
          toast.success('Employee added')
        }
        setEmpDialogOpen(false)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to save employee')
      }
    })
  }

  const handleProcessPayroll = async () => {
    if (!canWrite || !user) return
    if (existingRunForPeriod?.status === 'Processed' || existingRunForPeriod?.status === 'Paid') {
      toast.error(`Payroll for ${formatPayrollPeriod(period)} already processed`)
      return
    }
    await runProcessPayroll(async () => {
      try {
        if (api) {
          const targetBranch = resolveProcessBranchId()
          if (!targetBranch || targetBranch === 'all') {
            toast.error('Select a branch to process payroll')
            return
          }
          await apiProcessPayrollRun(period, targetBranch)
          await reload()
          toast.success(`Payroll processed for ${formatPayrollPeriod(period)}`)
        } else {
          const runId = processPayrollRun(period, branchId, user.name)
          if (runId) toast.success(`Payroll processed for ${formatPayrollPeriod(period)}`)
          else toast.error('Could not process payroll — check employees and period')
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not process payroll')
      }
    })
  }

  const handleMarkPaid = async (run: PayrollRun) => {
    if (!canWrite) return
    try {
      if (api) {
        await apiMarkPayrollPaid(run.id)
        await reload()
        toast.success('Payroll marked paid — GL entry posted')
      } else if (markPayrollPaid(run.id)) {
        toast.success('Payroll marked paid — GL entry posted')
      } else {
        toast.error('Could not mark payroll as paid')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not mark payroll as paid')
    }
  }

  const handleDownloadPayrollTemplate = () => {
    downloadTextFile('payroll-upload-template.csv', buildPayrollCsvTemplate())
    toast.success('Payroll CSV template downloaded')
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImportFile = async (file: File | undefined) => {
    if (!file || !user || !canWrite) return
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please select a .csv file')
      return
    }
    setImporting(true)
    try {
      const text = await file.text()
      const parsed = parsePayrollCsv(text, { branches })
      if (parsed.valid === 0) {
        const firstError = parsed.rows.find((r) => r.error)?.error
        toast.error(firstError ?? 'No valid payroll rows found in CSV')
        return
      }
      if (!parsed.period) {
        toast.error('Could not determine payroll period from CSV')
        return
      }

      if (api) {
        const result = await apiImportPayrollRuns({
          period: parsed.period,
          branchGroups: parsed.branchGroups,
        })
        await reload()
        const failNote = parsed.failed > 0 ? ` (${parsed.failed} row(s) skipped)` : ''
        const createdNote =
          result.employeesCreated > 0 ? ` · ${result.employeesCreated} employee(s) auto-created` : ''
        toast.success(
          `Imported ${parsed.valid} line(s) into ${result.runIds.length} payroll run(s)${createdNote}${failNote}`
        )
      } else {
        const result = importPayrollRuns(parsed.period, parsed.branchGroups, user.name)
        if (result.error) {
          toast.error(result.error)
          return
        }
        const failNote = parsed.failed > 0 ? ` (${parsed.failed} row(s) skipped)` : ''
        const createdNote =
          result.employeesCreated > 0 ? ` · ${result.employeesCreated} employee(s) auto-created` : ''
        toast.success(
          `Imported ${parsed.valid} line(s) into ${result.runIds.length} payroll run(s)${createdNote}${failNote}`
        )
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to read CSV file')
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const openReimbursement = () => {
    setReimbForm({
      ...emptyReimbursement,
      branchId: defaultBranchId() || employees[0]?.branchId || '',
      employeeId: employees[0]?.id ?? '',
    })
    setReimbDialogOpen(true)
  }

  const saveReimbursement = async () => {
    if (!user || !reimbForm.employeeId || reimbForm.amount <= 0) {
      toast.error('Employee and amount are required')
      return
    }
    const emp = payrollEmployees.find((e) => e.id === reimbForm.employeeId)
    await runSaveReimb(async () => {
      try {
        if (api) {
          await createReimbursement({
            employeeId: reimbForm.employeeId,
            branchId: emp?.branchId ?? reimbForm.branchId,
            reimbursementType: REIMB_TYPE_TO_API[reimbForm.type],
            amount: reimbForm.amount,
            reimbursementDate: reimbForm.date,
            description: reimbForm.description || undefined,
          })
          await reload()
        } else {
          addReimbursement(
            { ...reimbForm, branchId: emp?.branchId ?? reimbForm.branchId },
            user.id,
            user.name
          )
        }
        toast.success('Reimbursement submitted for approval')
        setReimbDialogOpen(false)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to submit reimbursement')
      }
    })
  }

  const handleReimbAction = async (reimb: Reimbursement, status: 'Approved' | 'Rejected') => {
    if (!user || !canApprove) return
    try {
      if (api) {
        if (status === 'Approved') await approveReimbursement(reimb.id)
        else await rejectReimbursement(reimb.id)
        await reload()
        toast.success(`Claim ${status.toLowerCase()}`)
        return
      }
      const approval = approvals.find((a) => a.sourceId === reimb.id && a.type === 'Reimbursement')
      if (!approval) {
        toast.error('Approval record not found')
        return
      }
      if (approval.requestedById === user.id) {
        toast.error('You cannot approve your own claim')
        return
      }
      if (processApproval(approval.id, status, user.id)) {
        toast.success(`Claim ${status.toLowerCase()}`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update claim')
    }
  }

  const salaryColumns: Column<PayrollEmployee>[] = [
    { key: 'empId', header: 'Employee ID', cell: (r) => <span className="font-mono text-xs">{r.employeeNo || formatEmployeeCode(r.id)}</span> },
    { key: 'name', header: 'Employee', cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'designation', header: 'Designation', cell: (r) => r.designation },
    { key: 'branch', header: 'Branch', cell: (r) => getBranchName(r.branchId) },
    { key: 'bankAccount', header: 'Bank Account', cell: (r) => <span className="font-mono text-xs">{r.bankAccount || '—'}</span> },
    { key: 'basic', header: 'Basic', className: 'text-right font-mono', cell: (r) => formatCurrency(r.basicSalary) },
    { key: 'allowances', header: 'Allowances', className: 'text-right font-mono', cell: (r) => formatCurrency(r.allowances) },
    { key: 'tax', header: 'Salary Tax', className: 'text-right font-mono text-destructive', cell: (r) => formatCurrency(r.salaryTax) },
    { key: 'net', header: 'Net Salary', className: 'text-right font-mono font-medium', cell: (r) => formatCurrency(r.netSalary) },
    {
      key: 'actions',
      header: '',
      cell: (row) => canWrite ? <RowActions onEdit={() => openEditEmployee(row)} onDelete={async () => {
        try {
          if (api) {
            await apiDeleteEmployee(row.id)
            await reload()
          } else {
            deletePayrollEmployee(row.id)
          }
          toast.success('Employee removed')
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Failed to remove employee')
        }
      }} /> : null,
    },
  ]

  const runColumns: Column<PayrollRun>[] = [
    {
      key: 'runNo',
      header: 'Run ID',
      cell: (r) => <span className="font-mono text-xs">{r.runNo || '—'}</span>,
    },
    { key: 'period', header: 'Period', cell: (r) => formatPayrollPeriod(r.period) },
    { key: 'branch', header: 'Branch', cell: (r) => getBranchName(r.branchId) },
    {
      key: 'source',
      header: 'Source',
      cell: (r) => (
        <Badge variant={r.source === 'Uploaded' ? 'secondary' : 'outline'}>
          {r.source === 'Uploaded' ? 'Uploaded' : 'Internal'}
        </Badge>
      ),
    },
    { key: 'employees', header: 'Employees', cell: (r) => r.employeeCount },
    { key: 'gross', header: 'Gross', className: 'text-right font-mono', cell: (r) => formatCurrency(r.totalGross) },
    { key: 'tax', header: 'Tax', className: 'text-right font-mono text-destructive', cell: (r) => formatCurrency(r.totalTax) },
    { key: 'net', header: 'Net + Reimb.', className: 'text-right font-mono font-medium', cell: (r) => formatCurrency(r.totalNet + r.totalReimbursements) },
    { key: 'status', header: 'Status', cell: (r) => <StatusPill status={r.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      cell: (r) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => setPayslipRun(r)}>
            <FileText className="h-4 w-4" />
          </Button>
          {canWrite && r.status === 'Processed' && (
            <Button size="sm" variant="outline" onClick={() => handleMarkPaid(r)}>
              <CheckCircle className="mr-1 h-3.5 w-3.5" /> Mark Paid
            </Button>
          )}
        </div>
      ),
    },
  ]

  const reimbColumns: Column<Reimbursement>[] = [
    {
      key: 'reimbursementNo',
      header: 'Claim ID',
      cell: (r) => <span className="font-mono text-xs">{r.reimbursementNo || '—'}</span>,
    },
    { key: 'employee', header: 'Employee', cell: (r) => employeeMap[r.employeeId] ?? r.employeeId },
    { key: 'type', header: 'Type', cell: (r) => r.type },
    { key: 'date', header: 'Date', cell: (r) => r.date },
    { key: 'desc', header: 'Description', cell: (r) => r.description ?? '—' },
    { key: 'amount', header: 'Amount', className: 'text-right font-mono', cell: (r) => formatCurrency(r.amount) },
    { key: 'status', header: 'Status', cell: (r) => <StatusPill status={r.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      cell: (r) =>
        r.status === 'Pending' && canApprove ? (
          <div className="flex gap-1">
            <Button size="sm" variant="outline" className="h-8 text-emerald-600" onClick={() => handleReimbAction(r, 'Approved')}>Approve</Button>
            <Button size="sm" variant="outline" className="h-8 text-destructive" onClick={() => handleReimbAction(r, 'Rejected')}>Reject</Button>
          </div>
        ) : null,
    },
  ]

  const payslipLines: PayrollLine[] = payslipRun
    ? payrollLines.filter((l) => l.payrollRunId === payslipRun.id)
    : []

  const computedPreview = computeSalary(empForm.basicSalary, empForm.allowances)

  if (api && loading) return <PageDataSkeleton />

  return (
    <div>
      <PageHeader
        title="Payroll"
        subtitle={
          api
            ? `Employee register, pay runs, salary tax, reimbursements${loading ? ' (loading…)' : ''}`
            : 'Employee register, monthly pay runs, salary tax, and reimbursements'
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Active Employees" value={String(employees.length)} icon={Users} accent="blue" />
        <MetricCard title="Monthly Gross" value={formatCurrency(previewTotals.gross)} icon={Banknote} accent="purple" />
        <MetricCard title="Salary Tax (FBR)" value={formatCurrency(previewTotals.tax)} icon={Banknote} accent="orange" />
        <MetricCard title="Total Payable" value={formatCurrency(previewTotals.payable)} icon={CheckCircle} accent="green" />
      </div>

      <Tabs defaultValue="run">
        <TabsList className="mb-4 flex flex-wrap h-auto">
          <TabsTrigger value="run">Run Payroll</TabsTrigger>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="history">Payroll History</TabsTrigger>
          <TabsTrigger value="reimbursements">Reimbursements</TabsTrigger>
        </TabsList>

        <TabsContent value="run" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">Monthly Payroll Run</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Process salaries with FBR tax deduction and approved reimbursements
                </p>
              </div>
              {existingRunForPeriod && (
                <Badge variant={existingRunForPeriod.status === 'Paid' ? 'default' : 'secondary'}>
                  {formatPayrollPeriod(period)}: {existingRunForPeriod.status}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-2">
                  <Label>Payroll Period</Label>
                  <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="w-44" />
                </div>
                {canWrite && (
                  <Button
                    onClick={() => void handleProcessPayroll()}
                    disabled={!!existingRunForPeriod && existingRunForPeriod.status !== 'Draft'}
                    loading={processingPayroll}
                  >
                    <Play className="mr-1 h-4 w-4" /> Process Payroll
                  </Button>
                )}
              </div>

              <div className="rounded-xl border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee ID</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Designation</TableHead>
                      <TableHead>Bank Account</TableHead>
                      <TableHead className="text-right">Gross</TableHead>
                      <TableHead className="text-right">Tax</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                      <TableHead className="text-right">Reimb.</TableHead>
                      <TableHead className="text-right">Total Payable</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewLines.map((row) => (
                      <TableRow key={row.emp.id}>
                        <TableCell className="font-mono text-xs">{formatEmployeeCode(row.emp.id)}</TableCell>
                        <TableCell className="font-medium">{row.emp.name}</TableCell>
                        <TableCell>{row.emp.designation}</TableCell>
                        <TableCell className="font-mono text-xs">{row.emp.bankAccount || '—'}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(row.gross)}</TableCell>
                        <TableCell className="text-right font-mono text-destructive">{formatCurrency(row.salaryTax)}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(row.netSalary)}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(row.reimb)}</TableCell>
                        <TableCell className="text-right font-mono font-medium">{formatCurrency(row.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-wrap gap-6 rounded-lg bg-muted/40 p-4 text-sm">
                <span>Gross: <strong>{formatCurrency(previewTotals.gross)}</strong></span>
                <span>Tax: <strong className="text-destructive">{formatCurrency(previewTotals.tax)}</strong></span>
                <span>Net Salaries: <strong>{formatCurrency(previewTotals.net)}</strong></span>
                <span>Reimbursements: <strong>{formatCurrency(previewTotals.reimb)}</strong></span>
                <span>Total Disbursement: <strong className="text-emerald-600">{formatCurrency(previewTotals.payable)}</strong></span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employees" className="space-y-4">
          {canWrite && (
            <div className="flex justify-end">
              <Button onClick={openAddEmployee}>Add Employee</Button>
            </div>
          )}
          <DataTable
            data={employees}
            columns={salaryColumns}
            searchPlaceholder="Search employees..."
            searchFilter={(row, q) =>
              row.name.toLowerCase().includes(q) ||
              row.designation.toLowerCase().includes(q) ||
              formatEmployeeCode(row.id).toLowerCase().includes(q) ||
              (row.bankAccount?.toLowerCase().includes(q) ?? false)
            }
            filters={[
              { key: 'branch', label: 'Branch', type: 'select', options: branchFilterOptions, accessor: (r) => r.branchId },
              { key: 'net', label: 'Net Salary', type: 'numberRange', accessor: (r) => r.netSalary },
              { key: 'tax', label: 'Salary Tax', type: 'numberRange', accessor: (r) => r.salaryTax },
            ]}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {canWrite && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Upload payroll processed outside the system — amounts are stored as-is; use Mark Paid to post GL.
              </p>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => void handleImportFile(e.target.files?.[0])}
                />
                <Button type="button" variant="outline" onClick={handleDownloadPayrollTemplate}>
                  <Download className="mr-1 h-4 w-4" /> Template
                </Button>
                <Button type="button" variant="outline" loading={importing} onClick={handleImportClick}>
                  <Upload className="mr-1 h-4 w-4" /> Upload Payroll
                </Button>
              </div>
            </div>
          )}
          <DataTable
            data={branchRuns}
            columns={runColumns}
            searchPlaceholder="Search payroll runs..."
            searchFilter={(row, q) =>
              Boolean(row.period.includes(q) || row.processedByName?.toLowerCase().includes(q))
            }
            filters={[
              { key: 'branch', label: 'Branch', type: 'select', options: branchFilterOptions, accessor: (r) => r.branchId },
              { key: 'status', label: 'Status', type: 'select', options: ['Draft', 'Processed', 'Paid'].map((s) => ({ label: s, value: s })), accessor: (r) => r.status },
              { key: 'net', label: 'Net + Reimb.', type: 'numberRange', accessor: (r) => r.totalNet + r.totalReimbursements },
            ]}
          />
        </TabsContent>

        <TabsContent value="reimbursements" className="space-y-4">
          {canWrite && (
            <div className="flex justify-end">
              <Button onClick={openReimbursement}>Submit Claim</Button>
            </div>
          )}
          <DataTable
            data={filteredReimbursements}
            columns={reimbColumns}
            searchPlaceholder="Search claims..."
            searchFilter={(row, q) =>
              (employeeMap[row.employeeId] ?? '').toLowerCase().includes(q) ||
              row.type.toLowerCase().includes(q)
            }
            filters={[
              { key: 'type', label: 'Claim Type', type: 'select', options: [...REIMBURSEMENT_TYPES].map((t) => ({ label: t, value: t })), accessor: (r) => r.type },
              { key: 'date', label: 'Date', type: 'dateRange', accessor: (r) => r.date },
              { key: 'amount', label: 'Amount', type: 'numberRange', accessor: (r) => r.amount },
            ]}
            statusPills={[
              { label: 'All', count: branchReimbursements.length, value: 'all' },
              { label: 'Pending', count: branchReimbursements.filter((r) => r.status === 'Pending').length, value: 'Pending' },
              { label: 'Approved', count: branchReimbursements.filter((r) => r.status === 'Approved').length, value: 'Approved' },
              { label: 'Rejected', count: branchReimbursements.filter((r) => r.status === 'Rejected').length, value: 'Rejected' },
            ]}
            activeStatus={reimbStatus}
            onStatusChange={setReimbStatus}
          />
        </TabsContent>
      </Tabs>

      {/* Employee dialog */}
      <Dialog open={empDialogOpen} onOpenChange={setEmpDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEditEmp ? 'Edit Employee' : 'Add Employee'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Full Name</Label>
                <Input value={empForm.name} onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Designation</Label>
                <Input value={empForm.designation} onChange={(e) => setEmpForm({ ...empForm, designation: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Branch</Label>
                <Select
                  value={empForm.branchId || undefined}
                  onValueChange={(v) => setEmpForm({ ...empForm, branchId: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Basic Salary (PKR)</Label>
                <Input type="number" value={empForm.basicSalary || ''} onChange={(e) => setEmpForm({ ...empForm, basicSalary: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Allowances (PKR)</Label>
                <Input type="number" value={empForm.allowances || ''} onChange={(e) => setEmpForm({ ...empForm, allowances: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={empForm.email} onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Bank Account</Label>
                <Input value={empForm.bankAccount} onChange={(e) => setEmpForm({ ...empForm, bankAccount: e.target.value })} placeholder="IBAN / Account" />
              </div>
            </div>
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="space-y-1 p-3 text-sm">
                <div className="flex justify-between"><span>Gross (monthly)</span><span>{formatCurrency(computedPreview.gross)}</span></div>
                <div className="flex justify-between text-destructive"><span>Salary Tax (FBR)</span><span>- {formatCurrency(computedPreview.salaryTax)}</span></div>
                <div className="flex justify-between font-bold border-t pt-1"><span>Net Salary</span><span>{formatCurrency(computedPreview.netSalary)}</span></div>
              </CardContent>
            </Card>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEmpDialogOpen(false)} disabled={savingEmployee}>
                Cancel
              </Button>
              <Button onClick={() => void saveEmployee()} loading={savingEmployee}>
                {isEditEmp ? 'Save' : 'Add Employee'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reimbursement dialog */}
      <Dialog open={reimbDialogOpen} onOpenChange={setReimbDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Reimbursement Claim</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={reimbForm.employeeId} onValueChange={(v) => setReimbForm({ ...reimbForm, employeeId: v })}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Claim Type</Label>
                <Select value={reimbForm.type} onValueChange={(v) => setReimbForm({ ...reimbForm, type: v as Reimbursement['type'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REIMBURSEMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={reimbForm.date} onChange={(e) => setReimbForm({ ...reimbForm, date: e.target.value })} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Amount (PKR)</Label>
                <Input type="number" value={reimbForm.amount || ''} onChange={(e) => setReimbForm({ ...reimbForm, amount: Number(e.target.value) })} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Description</Label>
                <Textarea value={reimbForm.description} onChange={(e) => setReimbForm({ ...reimbForm, description: e.target.value })} rows={2} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Claim will be sent to the Approvals queue for manager sign-off.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReimbDialogOpen(false)} disabled={savingReimb}>
                Cancel
              </Button>
              <Button onClick={() => void saveReimbursement()} loading={savingReimb}>
                Submit for Approval
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payslip / run detail */}
      <Dialog open={!!payslipRun} onOpenChange={(open) => !open && setPayslipRun(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Payroll Detail — {payslipRun && formatPayrollPeriod(payslipRun.period)}
            </DialogTitle>
          </DialogHeader>
          {payslipRun && (
            <div className="space-y-4">
              <div className="grid gap-3 text-sm sm:grid-cols-4">
                <div><span className="text-muted-foreground">Status</span><p><StatusPill status={payslipRun.status} /></p></div>
                <div><span className="text-muted-foreground">Source</span><p className="font-medium">{payslipRun.source === 'Uploaded' ? 'Uploaded' : 'Internal'}</p></div>
                <div><span className="text-muted-foreground">Run Date</span><p className="font-medium">{payslipRun.runDate}</p></div>
                <div><span className="text-muted-foreground">Processed By</span><p className="font-medium">{payslipRun.processedByName ?? '—'}</p></div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Tax</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead className="text-right">Reimb.</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payslipLines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>{employeeMap[line.employeeId]}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(line.grossSalary)}</TableCell>
                      <TableCell className="text-right font-mono text-destructive">{formatCurrency(line.salaryTax)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(line.netSalary)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(line.reimbursements)}</TableCell>
                      <TableCell className="text-right font-mono font-medium">{formatCurrency(line.totalPayable)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-between rounded-lg bg-muted/40 p-3 text-sm font-medium">
                <span>Total Disbursement</span>
                <span>{formatCurrency(payslipRun.totalNet + payslipRun.totalReimbursements)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
