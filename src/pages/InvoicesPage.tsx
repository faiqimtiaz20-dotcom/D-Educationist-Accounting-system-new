import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageDataSkeleton } from '@/components/shared/PageDataSkeleton'
import { InvoicePaymentPanel } from '@/components/shared/InvoicePaymentPanel'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusPill } from '@/components/shared/StatusPill'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getBranchName } from '@/lib/org'
import { branchFilterOptions, currencyFilterOptions } from '@/lib/filter-options'
import { useBranchFilter } from '@/hooks/useBranchFilter'
import { useCurrentUser } from '@/hooks/useAuth'
import { useModulePermission } from '@/hooks/usePermission'
import { useSubmitState } from '@/hooks/useSubmitState'
import { canViewAllBranches } from '@/lib/permissions'
import { formatCurrency, netFee } from '@/lib/calculations'
import {
  getInvoiceLineTotal,
  getInvoiceStudentLabel,
  getInvoiceTotal,
  getInvoiceUniversities,
  linesFinanciallyEqual,
} from '@/lib/invoice'
import { invoiceHasPayments, useDataStore } from '@/store/data-store'
import { isDateLocked, useSettingsStore } from '@/store/settings-store'
import { fetchInvoiceLogoObjectUrl } from '@/lib/settings-api'
import { useRevenueApiSync } from '@/hooks/useRevenueApiSync'
import {
  createInvoice as apiCreateInvoice,
  deleteInvoice as apiDeleteInvoice,
  invoiceFormToApiLines,
  invoiceStatusToApi,
  sendInvoice as apiSendInvoice,
  updateInvoice as apiUpdateInvoice,
} from '@/lib/revenue-api'
import type { Currency, Invoice, InvoiceLine, InvoiceStatus } from '@/types'
import { CheckCircle2, Eye, FileText, MoreHorizontal, Pencil, Send, Trash2, Wallet } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

function applyTpl(
  template: string,
  vars: Record<string, string>,
) {
  let out = template
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{{${k}}}`, v)
  }
  return out
}

const COMMISSION_RATES = [10, 12.5, 15, 17.5, 20, 22.5]
const invoiceStatuses: InvoiceStatus[] = ['Draft', 'Sent', 'Partially Received', 'Fully Received', 'Closed']

const formatDate = (iso: string) => {
  const [year, month, day] = iso.split('-')
  if (!year || !month || !day) return iso
  return `${day}/${month}/${year}`
}

const emptyForm = {
  branchId: 'khi',
  invoiceDate: new Date().toISOString().slice(0, 10),
  poNumber: '',
  currency: 'GBP' as Currency,
  status: 'Draft' as InvoiceStatus,
  lines: [] as InvoiceLine[],
}

let lineSeq = 0
const nextLineId = () => `line-${Date.now()}-${++lineSeq}`

export default function InvoicesPage() {
  const currentUser = useCurrentUser()
  const orgName = useSettingsStore((s) => s.orgName)
  const branding = useSettingsStore((s) => s.invoiceBranding)
  const isSuperAdmin = currentUser ? canViewAllBranches(currentUser) : false
  const { canWrite } = useModulePermission('Invoices & Receivables')
  const { api, reload, loading } = useRevenueApiSync()
  const invoices = useDataStore((s) => s.invoices)
  const receivables = useDataStore((s) => s.receivables)
  const students = useDataStore((s) => s.students)
  const addInvoice = useDataStore((s) => s.addInvoice)
  const updateInvoice = useDataStore((s) => s.updateInvoice)
  const deleteInvoice = useDataStore((s) => s.deleteInvoice)
  const getInvoiceAmountPaid = useDataStore((s) => s.getInvoiceAmountPaid)

  const getStudent = (id: string) => students.find((s) => s.id === id)
  const brandName = orgName.trim() || "D' Educationist"
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!api || !branding.hasLogo) {
      setLogoUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      return
    }
    let cancelled = false
    void (async () => {
      const url = await fetchInvoiceLogoObjectUrl()
      if (cancelled) {
        if (url) URL.revokeObjectURL(url)
        return
      }
      setLogoUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return url
      })
    })()
    return () => {
      cancelled = true
    }
  }, [api, branding.hasLogo, branding.logoPath])

  const branchStudents = useBranchFilter(students)
  const branchInvoices = useBranchFilter(invoices)
  const [activeStatus, setActiveStatus] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null)
  const [paymentInvoiceId, setPaymentInvoiceId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [sendInvoice, setSendInvoice] = useState<Invoice | null>(null)
  const [isResend, setIsResend] = useState(false)
  const [emailForm, setEmailForm] = useState({ to: '', cc: '', subject: '', body: '' })
  const [studentSearch, setStudentSearch] = useState('')
  const [universityFilter, setUniversityFilter] = useState('all')
  const { submitting: saving, runSubmit: runSave } = useSubmitState()
  const { submitting: sending, runSubmit: runSend } = useSubmitState()
  const { submitting: markingSent, runSubmit: runMarkSent } = useSubmitState()

  const paymentInvoice = paymentInvoiceId
    ? invoices.find((i) => i.id === paymentInvoiceId) ?? null
    : null

  const filtered = useMemo(() => {
    if (activeStatus === 'all') return branchInvoices
    return branchInvoices.filter((i) => i.status === activeStatus)
  }, [branchInvoices, activeStatus])

  const statusPills = useMemo(() => {
    const counts = invoiceStatuses.reduce(
      (acc, status) => {
        acc[status] = branchInvoices.filter((i) => i.status === status).length
        return acc
      },
      {} as Record<string, number>
    )
    return [
      { label: 'All', value: 'all', count: branchInvoices.length },
      ...invoiceStatuses.map((status) => ({ label: status, value: status, count: counts[status] })),
    ]
  }, [branchInvoices])

  const totalDue = getInvoiceTotal({ ...form, id: '', invoiceNo: '', lines: form.lines } as Invoice)
  const selectedIds = useMemo(() => new Set(form.lines.map((l) => l.studentId)), [form.lines])
  const editingHasPayments = isEdit && editId ? invoiceHasPayments(receivables, editId) : false
  const lockedUniversity = useMemo(() => {
    if (form.lines.length === 0) return null
    return getStudent(form.lines[0].studentId)?.university ?? null
  }, [form.lines, students])

  const universityOptions = useMemo(() => {
    const names = [...new Set(branchStudents.map((s) => s.university).filter(Boolean))].sort()
    return names.map((name) => ({ label: name, value: name }))
  }, [branchStudents])

  const selectableStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase()
    const uni = lockedUniversity ?? (universityFilter !== 'all' ? universityFilter : null)
    return branchStudents.filter((s) => {
      if (uni && s.university !== uni) return false
      if (!q) return true
      return (
        s.name.toLowerCase().includes(q) ||
        s.studentId.toLowerCase().includes(q) ||
        s.university.toLowerCase().includes(q)
      )
    })
  }, [branchStudents, studentSearch, universityFilter, lockedUniversity])

  const openCreate = () => {
    setIsEdit(false)
    setEditId(null)
    setForm(emptyForm)
    setStudentSearch('')
    setUniversityFilter('all')
    setDialogOpen(true)
  }

  const openEdit = (invoice: Invoice) => {
    setIsEdit(true)
    setEditId(invoice.id)
    setForm({
      branchId: invoice.branchId,
      invoiceDate: invoice.invoiceDate,
      poNumber: invoice.poNumber ?? '',
      currency: invoice.currency,
      status: invoice.status,
      lines: invoice.lines.map((l) => ({ ...l })),
    })
    setStudentSearch('')
    const firstUni = invoice.lines[0]
      ? students.find((s) => s.id === invoice.lines[0].studentId)?.university
      : undefined
    setUniversityFilter(firstUni ?? 'all')
    setDialogOpen(true)
  }

  const prefillEmail = (invoice: Invoice) => {
    const amount = getInvoiceTotal(invoice)
    const label = getInvoiceStudentLabel(invoice, getStudent)
    const uni = getInvoiceUniversities(invoice, getStudent)
    const vars = {
      invoiceNo: invoice.invoiceNo,
      invoiceDate: formatDate(invoice.invoiceDate),
      amount: formatCurrency(amount, invoice.currency),
      orgName: brandName,
      students: label,
      universities: uni && uni !== '—' ? ` (${uni})` : '',
      documentTitle: branding.documentTitle || 'Commission Invoice',
    }
    setSendInvoice(invoice)
    // Commission invoices bill the university — do not prefill the student's email
    setEmailForm({
      to: '',
      cc: '',
      subject: applyTpl(
        branding.emailSubject || 'Commission Invoice {{invoiceNo}}',
        vars,
      ),
      body: applyTpl(branding.emailBody || '', vars),
    })
  }

  const openSend = (invoice: Invoice) => {
    if (!canWrite) {
      toast.error('You do not have permission to send invoices')
      return
    }
    if (invoice.status !== 'Draft') {
      toast.error('Only draft invoices can be sent')
      return
    }
    setIsResend(false)
    prefillEmail(invoice)
  }

  const openResend = (invoice: Invoice) => {
    if (!canWrite) {
      toast.error('You do not have permission to send invoices')
      return
    }
    if (invoice.status === 'Draft') {
      toast.error('Draft invoices must be sent first')
      return
    }
    setIsResend(true)
    prefillEmail(invoice)
  }

  /** Draft → Sent (+ GL) without requiring SMTP / recipient. */
  const handleMarkAsSent = async (invoice: Invoice) => {
    if (!canWrite) {
      toast.error('You do not have permission to send invoices')
      return
    }
    if (invoice.status !== 'Draft') {
      toast.error('Only draft invoices can be marked Sent')
      return
    }
    if (isDateLocked(invoice.invoiceDate)) {
      toast.error('This period is locked — cannot post to a closed fiscal period')
      return
    }
    await runMarkSent(async () => {
      try {
        if (api) {
          const res = await apiSendInvoice(invoice.id, {})
          await reload()
          toast.success(res.message ?? `Invoice ${invoice.invoiceNo} marked Sent`)
        } else {
          updateInvoice(invoice.id, { status: 'Sent' })
          toast.success(`Invoice ${invoice.invoiceNo} marked Sent`)
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Mark as Sent failed')
      }
    })
  }

  const handleSend = async () => {
    if (!sendInvoice) return
    if (!canWrite) {
      toast.error('You do not have permission to send invoices')
      return
    }
    if (isResend && !emailForm.to.trim()) {
      toast.error('Recipient (To) is required to resend')
      return
    }
    if (!isResend && isDateLocked(sendInvoice.invoiceDate)) {
      toast.error('This period is locked — cannot post to a closed fiscal period')
      return
    }
    await runSend(async () => {
      try {
        if (isResend) {
          if (api) {
            const res = await apiSendInvoice(sendInvoice.id, emailForm)
            toast.success(
              res.message ??
                (res.emailSent
                  ? `Invoice ${sendInvoice.invoiceNo} emailed to ${emailForm.to}`
                  : `Invoice ${sendInvoice.invoiceNo} resend logged`),
            )
            await reload()
          } else {
            toast.success(`Invoice ${sendInvoice.invoiceNo} resent to ${emailForm.to}`)
          }
          setSendInvoice(null)
          return
        }
        if (api) {
          const res = await apiSendInvoice(sendInvoice.id, {
            to: emailForm.to.trim() || undefined,
            cc: emailForm.cc.trim() || undefined,
            subject: emailForm.subject,
            body: emailForm.body,
          })
          await reload()
          if (res.emailSent) {
            toast.success(`Invoice ${sendInvoice.invoiceNo} sent to ${emailForm.to}`)
          } else if (emailForm.to.trim()) {
            toast.warning(
              res.message ??
                `Invoice marked Sent; email not delivered (configure Settings → Email)`,
            )
          } else {
            toast.success(res.message ?? `Invoice ${sendInvoice.invoiceNo} marked Sent`)
          }
        } else {
          updateInvoice(sendInvoice.id, { status: 'Sent' })
          toast.success(
            emailForm.to.trim()
              ? `Invoice ${sendInvoice.invoiceNo} sent to ${emailForm.to}`
              : `Invoice ${sendInvoice.invoiceNo} marked Sent`,
          )
        }
        setSendInvoice(null)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : isResend ? 'Resend failed' : 'Send failed')
      }
    })
  }

  const handleDelete = async (invoice: Invoice) => {
    if (!canWrite) return
    if (!confirm(`Delete invoice ${invoice.invoiceNo}?`)) return
    try {
      if (api) {
        await apiDeleteInvoice(invoice.id)
        await reload()
        toast.success('Invoice deleted')
      } else {
        const ok = deleteInvoice(invoice.id)
        if (ok) toast.success('Invoice deleted')
        else toast.error('Cannot delete invoice with recorded payments')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const toggleStudent = (studentId: string) => {
    if (editingHasPayments) {
      toast.error('Cannot change students after payments have been recorded')
      return
    }
    const student = students.find((s) => s.id === studentId)
    if (!student) return

    if (selectedIds.has(studentId)) {
      setForm((prev) => ({
        ...prev,
        lines: prev.lines.filter((l) => l.studentId !== studentId),
      }))
      return
    }

    if (form.lines.length > 0 && student.currency !== form.currency) {
      toast.error(`Student currency (${student.currency}) must match invoice currency (${form.currency})`)
      return
    }

    const invoiceUniversity = getStudent(form.lines[0]?.studentId)?.university
    if (form.lines.length > 0 && invoiceUniversity && student.university !== invoiceUniversity) {
      toast.error('Combined invoice allows students from one university only')
      return
    }

    const line: InvoiceLine = {
      id: nextLineId(),
      studentId,
      tuitionFee: student.tuitionFee,
      scholarship: student.scholarship,
      commissionRate: student.expectedCommissionRate,
      bonus: 0,
    }

    setForm((prev) => ({
      ...prev,
      branchId: prev.lines.length === 0 ? student.branchId : prev.branchId,
      currency: prev.lines.length === 0 ? student.currency : prev.currency,
      lines: [...prev.lines, line],
    }))
    if (form.lines.length === 0) {
      setUniversityFilter(student.university)
    }
  }

  const updateLine = (lineId: string, patch: Partial<InvoiceLine>) => {
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.map((l) => (l.id === lineId ? { ...l, ...patch } : l)),
    }))
  }

  const handleSave = async () => {
    if (!canWrite) {
      toast.error('You do not have permission to modify invoices')
      return
    }
    if (form.lines.length === 0) {
      toast.error('Select at least one student')
      return
    }
    const universities = new Set(
      form.lines.map((l) => getStudent(l.studentId)?.university).filter(Boolean)
    )
    if (universities.size > 1) {
      toast.error('All students on one invoice must belong to the same university')
      return
    }
    for (const line of form.lines) {
      if (line.scholarship > line.tuitionFee) {
        toast.error('Scholarship cannot exceed tuition fee on any line')
        return
      }
    }
    if (isDateLocked(form.invoiceDate)) {
      toast.error('This period is locked — cannot post to a closed fiscal period')
      return
    }
    if (isEdit && editId && invoiceHasPayments(receivables, editId)) {
      const existing = invoices.find((i) => i.id === editId)
      if (existing && !linesFinanciallyEqual(existing.lines, form.lines)) {
        toast.error('Cannot change financial amounts after payments have been recorded')
        return
      }
    }
    const payload = {
      branchId: form.branchId,
      invoiceDate: form.invoiceDate,
      poNumber: form.poNumber || undefined,
      currency: form.currency,
      status: form.status,
      lines: form.lines,
    }
    await runSave(async () => {
      try {
        if (api) {
          const uniId =
            form.lines
              .map((l) => getStudent(l.studentId)?.universityId)
              .find((id): id is string => Boolean(id)) ?? undefined
          if (!uniId) {
            toast.error('Selected students must have a registered university')
            return
          }
          const body = {
            branchId: form.branchId,
            universityId: uniId,
            invoiceDate: form.invoiceDate,
            poNumber: form.poNumber || undefined,
            currencyCode: form.currency,
            status: invoiceStatusToApi(isEdit ? form.status : 'Draft'),
            lines: invoiceFormToApiLines(form.lines),
          }
          if (isEdit && editId) {
            await apiUpdateInvoice(editId, body)
            toast.success('Invoice updated')
          } else {
            await apiCreateInvoice({ ...body, status: 'Draft' })
            toast.success('Invoice created as Draft')
          }
          await reload()
        } else if (isEdit && editId) {
          updateInvoice(editId, payload)
          toast.success('Invoice updated')
        } else {
          addInvoice({ ...payload, status: 'Draft' })
          toast.success('Invoice created as Draft')
        }
        setDialogOpen(false)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Save failed')
      }
    })
  }

  const sumTuition = (row: Invoice) => row.lines.reduce((s, l) => s + l.tuitionFee, 0)
  const sumScholarship = (row: Invoice) => row.lines.reduce((s, l) => s + l.scholarship, 0)
  const sumBonus = (row: Invoice) => row.lines.reduce((s, l) => s + l.bonus, 0)
  const rateLabel = (row: Invoice) => {
    const rates = [...new Set(row.lines.map((l) => l.commissionRate))]
    return rates.length === 1 ? `${rates[0]}%` : 'Mixed'
  }

  const columns: Column<Invoice>[] = [
    { key: 'date', header: 'Date', cell: (row) => formatDate(row.invoiceDate), sortAccessor: (row) => row.invoiceDate },
    { key: 'invoiceNo', header: 'Invoice No.', cell: (row) => <span className="font-medium">{row.invoiceNo}</span> },
    {
      key: 'students',
      header: 'Students',
      cell: (row) => (
        <span>
          {getInvoiceStudentLabel(row, getStudent)}
          {row.lines.length > 1 && (
            <span className="ml-1 text-xs text-muted-foreground">({row.lines.length})</span>
          )}
        </span>
      ),
    },
    ...(isSuperAdmin
      ? [{ key: 'branch', header: 'Branch', cell: (row: Invoice) => row.branchName || getBranchName(row.branchId) }]
      : []),
    { key: 'university', header: 'University', cell: (row) => getInvoiceUniversities(row, getStudent) },
    {
      key: 'tuitionFee',
      header: 'Tuition Fee',
      cell: (row) => formatCurrency(sumTuition(row), row.currency),
      className: 'text-right',
      sortAccessor: sumTuition,
    },
    {
      key: 'scholarship',
      header: 'Scholarship',
      cell: (row) => formatCurrency(sumScholarship(row), row.currency),
      className: 'text-right',
      sortAccessor: sumScholarship,
    },
    { key: 'currency', header: 'Currency', cell: (row) => row.currency },
    { key: 'commissionRate', header: 'Commission %', cell: (row) => rateLabel(row), className: 'text-right' },
    {
      key: 'bonus',
      header: 'Bonus',
      className: 'text-right',
      sortAccessor: sumBonus,
      cell: (row) => formatCurrency(sumBonus(row), row.currency),
    },
    {
      key: 'total',
      header: 'Inv Amount',
      className: 'text-right',
      sortAccessor: (row) => getInvoiceTotal(row),
      cell: (row) => formatCurrency(getInvoiceTotal(row), row.currency),
    },
    {
      key: 'paid',
      header: 'Amount Paid',
      sortAccessor: (row) => getInvoiceAmountPaid(row.id),
      cell: (row) => {
        const paid = getInvoiceAmountPaid(row.id)
        const total = getInvoiceTotal(row)
        return (
          <span className={paid >= total ? 'text-emerald-600 font-medium' : paid > 0 ? 'text-amber-600' : ''}>
            {formatCurrency(paid, row.currency)}
          </span>
        )
      },
    },
    {
      key: 'outstanding',
      header: 'Outstanding',
      sortAccessor: (row) => Math.max(0, getInvoiceTotal(row) - getInvoiceAmountPaid(row.id)),
      cell: (row) => {
        const out = Math.max(0, getInvoiceTotal(row) - getInvoiceAmountPaid(row.id))
        return formatCurrency(out, row.currency)
      },
    },
    { key: 'status', header: 'Status', cell: (row) => <StatusPill status={row.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" title="Actions">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canWrite && row.status === 'Draft' && (
              <>
                <DropdownMenuItem
                  className="text-primary"
                  disabled={markingSent}
                  onClick={(e) => {
                    e.preventDefault()
                    void handleMarkAsSent(row)
                  }}
                >
                  <CheckCircle2 /> Mark as Sent
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openSend(row)}>
                  <Send /> Email invoice
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem onClick={() => setPreviewInvoice(row)}>
              <Eye /> Preview
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPaymentInvoiceId(row.id)}>
              <Wallet /> Payment history
            </DropdownMenuItem>
            {canWrite && row.status !== 'Draft' && (
              <DropdownMenuItem onClick={() => openResend(row)}>
                <Send /> Resend invoice
              </DropdownMenuItem>
            )}
            {canWrite && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => openEdit(row)}>
                  <Pencil /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => void handleDelete(row)}
                >
                  <Trash2 /> Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  const previewPaid = previewInvoice ? getInvoiceAmountPaid(previewInvoice.id) : 0
  const previewTotal = previewInvoice ? getInvoiceTotal(previewInvoice) : 0

  if (api && loading) return <PageDataSkeleton />

  return (
    <div>
      <PageHeader
        title="Commission Invoices"
        subtitle="Generate and track university commission invoices (one invoice can include multiple students)"
        actionLabel={canWrite ? 'Create Invoice' : undefined}
        onAction={canWrite ? openCreate : undefined}
      />

      <DataTable
        data={filtered}
        columns={columns}
        searchPlaceholder="Search invoices, students..."
        searchFilter={(row, query) => {
          const names = row.lines
            .map((l) => getStudent(l.studentId)?.name?.toLowerCase() ?? '')
            .join(' ')
          return row.invoiceNo.toLowerCase().includes(query) || names.includes(query)
        }}
        statusPills={statusPills}
        activeStatus={activeStatus}
        onStatusChange={setActiveStatus}
        filters={[
          ...(isSuperAdmin
            ? [{ key: 'branch', label: 'Branch', type: 'select' as const, options: branchFilterOptions, accessor: (r: Invoice) => r.branchId }]
            : []),
          { key: 'currency', label: 'Currency', type: 'select', options: currencyFilterOptions, accessor: (r) => r.currency },
          { key: 'invoiceDate', label: 'Invoice Date', type: 'dateRange', accessor: (r) => r.invoiceDate },
          { key: 'amount', label: 'Invoice Amount', type: 'numberRange', accessor: (r) => getInvoiceTotal(r) },
        ]}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit Invoice' : 'Create Commission Invoice'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Invoice Date</Label>
                <Input type="date" value={form.invoiceDate} onChange={(e) => setForm((p) => ({ ...p, invoiceDate: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>PO Number</Label>
                <Input value={form.poNumber} onChange={(e) => setForm((p) => ({ ...p, poNumber: e.target.value }))} placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select
                  disabled={form.lines.length > 0 || editingHasPayments}
                  value={form.currency}
                  onValueChange={(v) => setForm((p) => ({ ...p, currency: v as Currency }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['GBP', 'USD', 'CAD', 'AUD', 'EUR'] as const).map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.lines.length > 0 && (
                  <p className="text-xs text-muted-foreground">Currency is set from the first selected student.</p>
                )}
              </div>
              {isEdit && (
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v as InvoiceStatus }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {invoiceStatuses.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Students (select one or more from the same university)</Label>
              {lockedUniversity && (
                <p className="text-xs text-muted-foreground">
                  Locked to <span className="font-medium text-foreground">{lockedUniversity}</span> — only students from this university can be added.
                </p>
              )}
              <div className="grid gap-2 sm:grid-cols-[1fr_minmax(12rem,16rem)]">
                <Input
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search by name or ID..."
                />
                <Select
                  value={lockedUniversity ?? universityFilter}
                  onValueChange={setUniversityFilter}
                  disabled={!!lockedUniversity}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by university" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All universities</SelectItem>
                    {universityOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="max-h-40 overflow-y-auto rounded-md border p-2">
                {selectableStudents.length === 0 ? (
                  <p className="p-2 text-sm text-muted-foreground">No students found</p>
                ) : (
                  selectableStudents.map((s) => {
                    const checked = selectedIds.has(s.id)
                    const currencyMismatch = form.lines.length > 0 && s.currency !== form.currency && !checked
                    const universityMismatch =
                      !!lockedUniversity && s.university !== lockedUniversity && !checked
                    const blocked = currencyMismatch || universityMismatch
                    return (
                      <label
                        key={s.id}
                        className={`flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50 ${blocked ? 'opacity-50' : ''}`}
                      >
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={checked}
                          disabled={editingHasPayments || blocked}
                          onChange={() => toggleStudent(s.id)}
                        />
                        <span>
                          <span className="font-medium">{s.studentId}</span> — {s.name}
                          <span className="block text-xs text-muted-foreground">
                            {s.university} · {s.currency}
                            {universityMismatch ? ' · different university' : ''}
                          </span>
                        </span>
                      </label>
                    )
                  })
                )}
              </div>
            </div>

            {form.lines.length > 0 && (
              <div className="space-y-3">
                <Label>Line items ({form.lines.length})</Label>
                {form.lines.map((line) => {
                  const student = getStudent(line.studentId)
                  return (
                    <Card key={line.id} className="bg-muted/20">
                      <CardContent className="space-y-3 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-sm">
                            <p className="font-medium">{student?.name ?? line.studentId}</p>
                            <p className="text-muted-foreground">
                              {student?.university} — {student?.course}
                            </p>
                          </div>
                          {!editingHasPayments && (
                            <Button type="button" variant="ghost" size="sm" onClick={() => toggleStudent(line.studentId)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <div className="space-y-1">
                            <Label className="text-xs">Tuition Fee</Label>
                            <Input
                              type="number"
                              disabled={editingHasPayments}
                              value={line.tuitionFee}
                              onChange={(e) => updateLine(line.id, { tuitionFee: Number(e.target.value) })}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Scholarship</Label>
                            <Input
                              type="number"
                              disabled={editingHasPayments}
                              value={line.scholarship}
                              onChange={(e) => updateLine(line.id, { scholarship: Number(e.target.value) })}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Commission %</Label>
                            <Select
                              disabled={editingHasPayments}
                              value={String(line.commissionRate)}
                              onValueChange={(v) => updateLine(line.id, { commissionRate: Number(v) })}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {COMMISSION_RATES.map((rate) => (
                                  <SelectItem key={rate} value={String(rate)}>{rate}%</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Bonus</Label>
                            <Input
                              type="number"
                              disabled={editingHasPayments}
                              value={line.bonus}
                              onChange={(e) => updateLine(line.id, { bonus: Number(e.target.value) })}
                            />
                          </div>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Net fee {formatCurrency(netFee(line.tuitionFee, line.scholarship), form.currency)}
                          </span>
                          <span className="font-medium">
                            Line total {formatCurrency(getInvoiceLineTotal(line), form.currency)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}

            {editingHasPayments && (
              <p className="text-xs text-amber-600">Financial fields and students are locked because payments exist on this invoice.</p>
            )}

            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="space-y-2 p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Students</span>
                  <span className="font-medium">{form.lines.length}</span>
                </div>
                <div className="flex justify-between border-t pt-2 text-base font-bold">
                  <span>Total Invoice Amount</span>
                  <span>{formatCurrency(totalDue, form.currency)}</span>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={() => void handleSave()} loading={saving}>
                {isEdit ? 'Save Changes' : 'Save as Draft'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewInvoice} onOpenChange={(open) => !open && setPreviewInvoice(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> Invoice Preview
            </DialogTitle>
          </DialogHeader>
          {previewInvoice && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4" style={{ borderTopWidth: 3, borderTopColor: branding.accentColor || '#0f766e' }}>
                <div className="mb-4 flex items-start justify-between gap-3 border-b pb-4">
                  <div className="flex min-h-12 items-center">
                    {logoUrl ? (
                      <img src={logoUrl} alt="" className="max-h-14 max-w-[160px] object-contain" />
                    ) : null}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{brandName}</p>
                    <p className="text-sm font-medium" style={{ color: branding.accentColor || '#0f766e' }}>
                      {branding.documentTitle || 'Commission Invoice'}
                    </p>
                    {[branding.address, branding.phone, branding.email, branding.website]
                      .filter(Boolean)
                      .length > 0 ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {[branding.address, branding.phone, branding.email, branding.website]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="mb-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                  <div><p className="text-muted-foreground">Invoice No.</p><p className="font-medium">{previewInvoice.invoiceNo}</p></div>
                  <div><p className="text-muted-foreground">Date</p><p className="font-medium">{formatDate(previewInvoice.invoiceDate)}</p></div>
                  <div><p className="text-muted-foreground">Status</p><StatusPill status={previewInvoice.status} /></div>
                  <div><p className="text-muted-foreground">Students</p><p className="font-medium">{previewInvoice.lines.length}</p></div>
                </div>
                <div className="mb-4 space-y-2">
                  {previewInvoice.lines.map((line) => {
                    const student = getStudent(line.studentId)
                    return (
                      <div key={line.id} className="rounded bg-muted/40 p-3 text-sm">
                        <p><strong>{student?.name ?? line.studentId}</strong></p>
                        <p className="text-muted-foreground">{student?.university} — {student?.course}</p>
                        <div className="mt-2 flex justify-between">
                          <span>Commission + Bonus</span>
                          <span>{formatCurrency(getInvoiceLineTotal(line), previewInvoice.currency)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between font-medium"><span>Total Invoice</span><span>{formatCurrency(previewTotal, previewInvoice.currency)}</span></div>
                  <div className="flex justify-between text-emerald-600"><span>Amount Paid</span><span>{formatCurrency(previewPaid, previewInvoice.currency)}</span></div>
                  <div className="flex justify-between font-bold border-t pt-2"><span>Outstanding</span><span>{formatCurrency(Math.max(0, previewTotal - previewPaid), previewInvoice.currency)}</span></div>
                </div>
                {branding.footer ? (
                  <p className="mt-4 text-xs text-muted-foreground">{branding.footer}</p>
                ) : null}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPreviewInvoice(null)}>Close</Button>
                {canWrite && previewInvoice.status === 'Draft' && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const inv = previewInvoice
                        setPreviewInvoice(null)
                        void handleMarkAsSent(inv)
                      }}
                    >
                      <CheckCircle2 className="mr-1.5 h-4 w-4" /> Mark as Sent
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => { openSend(previewInvoice); setPreviewInvoice(null) }}
                    >
                      <Send className="mr-1.5 h-4 w-4" /> Email Invoice
                    </Button>
                  </>
                )}
                <Button onClick={() => toast.success('PDF export started')}>Export PDF</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!sendInvoice} onOpenChange={(open) => !open && setSendInvoice(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" /> {isResend ? 'Resend' : 'Send'} Invoice {sendInvoice?.invoiceNo}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>To {isResend ? '' : '(optional — leave blank to mark Sent only)'}</Label>
              <Input
                type="email"
                value={emailForm.to}
                onChange={(e) => setEmailForm((p) => ({ ...p, to: e.target.value }))}
                placeholder="accounts@university.edu"
              />
              <p className="text-xs text-muted-foreground">
                Commission invoices are billed to the university — enter their accounts email, not the student&apos;s.
              </p>
            </div>
            <div className="space-y-2">
              <Label>CC</Label>
              <Input
                value={emailForm.cc}
                onChange={(e) => setEmailForm((p) => ({ ...p, cc: e.target.value }))}
                placeholder="Comma-separated emails (optional)"
              />
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={emailForm.subject}
                onChange={(e) => setEmailForm((p) => ({ ...p, subject: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Body</Label>
              <Textarea
                rows={8}
                value={emailForm.body}
                onChange={(e) => setEmailForm((p) => ({ ...p, body: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSendInvoice(null)} disabled={sending}>
                Cancel
              </Button>
              <Button onClick={() => void handleSend()} loading={sending}>
                <Send className="mr-1.5 h-4 w-4" />{' '}
                {isResend
                  ? 'Resend'
                  : emailForm.to.trim()
                    ? 'Send email'
                    : 'Mark as Sent'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Sheet open={!!paymentInvoiceId} onOpenChange={(open) => !open && setPaymentInvoiceId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Invoice Payment History</SheetTitle>
          </SheetHeader>
          {paymentInvoice && (
            <div className="mt-6">
              <InvoicePaymentPanel
                invoice={paymentInvoice}
                studentName={getInvoiceStudentLabel(paymentInvoice, getStudent)}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
