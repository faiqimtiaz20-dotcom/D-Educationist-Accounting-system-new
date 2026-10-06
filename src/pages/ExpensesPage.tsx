import { useMemo, useState } from 'react'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageDataSkeleton } from '@/components/shared/PageDataSkeleton'
import { MetricCard } from '@/components/shared/MetricCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { RowActions } from '@/components/shared/RowActions'
import { StatusPill } from '@/components/shared/StatusPill'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getBranchName } from '@/lib/org'
import { useBranchFilter } from '@/hooks/useBranchFilter'
import { useCashApiSync } from '@/hooks/useCashApiSync'
import { useSubmitState } from '@/hooks/useSubmitState'
import { formatCurrency, pettyCashTotal } from '@/lib/calculations'
import {
  approveExpense as apiApproveExpense,
  createExpense as apiCreateExpense,
  deleteExpense as apiDeleteExpense,
  rejectExpense as apiRejectExpense,
  toPaymentModeCode,
  updateExpense as apiUpdateExpense,
} from '@/lib/cash-api'
import { useAppStore } from '@/store/app-store'
import { useDataStore } from '@/store/data-store'
import { useCurrentUser } from '@/hooks/useAuth'
import { useModulePermission } from '@/hooks/usePermission'
import { isDateLocked } from '@/store/settings-store'
import type { Expense } from '@/types'
import { AlertCircle, CheckCircle, Receipt } from 'lucide-react'
import { toast } from 'sonner'

const demoCategories = ['IT Equipment', 'Furniture', 'Marketing', 'Rent', 'Utilities', 'Printing', 'Events', 'Legal', 'Maintenance', 'Travel', 'Insurance', 'Office Supplies']
const demoPaymentModes = ['Bank Transfer', 'Cheque', 'Cash', 'Credit Card']

const emptyForm = {
  branchId: 'khi',
  vendor: '',
  category: 'Office Supplies',
  date: new Date().toISOString().slice(0, 10),
  principal: 0,
  salesTax: 0,
  srbSst: 0,
  gst: 0,
  incomeTax: 0,
  paymentMode: 'Bank Transfer',
  chequeNo: '',
}

export default function ExpensesPage() {
  const user = useCurrentUser()
  const { canWrite } = useModulePermission('Expenses & Petty Cash')
  const { api, reload, expenseCategories, vendors, banks, loading } = useCashApiSync()
  const expenses = useDataStore((s) => s.expenses)
  const branches = useDataStore((s) => s.branches)
  const addExpense = useDataStore((s) => s.addExpense)
  const updateExpense = useDataStore((s) => s.updateExpense)
  const deleteExpense = useDataStore((s) => s.deleteExpense)
  const selectedBranchId = useAppStore((s) => s.selectedBranchId)

  const categories = api ? expenseCategories.map((c) => c.name) : demoCategories
  const paymentModes = api ? ['Bank Transfer', 'Cheque', 'Cash', 'Credit Card'] : demoPaymentModes
  const defaultBranchId =
    selectedBranchId === 'all'
      ? (branches.find((b) => b.code === 'KHI')?.id ?? branches[0]?.id ?? 'khi')
      : selectedBranchId

  const filtered = useBranchFilter(expenses)
  const [statusFilter, setStatusFilter] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({
    ...emptyForm,
    branchId: defaultBranchId,
    category: categories[0] ?? emptyForm.category,
  })
  const { submitting, runSubmit } = useSubmitState()

  const statusPills = useMemo(() => [
    { label: 'All', value: 'all', count: filtered.length },
    { label: 'Pending', value: 'Pending', count: filtered.filter((e) => e.approvalStatus === 'Pending').length },
    { label: 'Approved', value: 'Approved', count: filtered.filter((e) => e.approvalStatus === 'Approved').length },
    { label: 'Rejected', value: 'Rejected', count: filtered.filter((e) => e.approvalStatus === 'Rejected').length },
  ], [filtered])

  const displayed = statusFilter === 'all' ? filtered : filtered.filter((e) => e.approvalStatus === statusFilter)
  const totalApproved = filtered.filter((e) => e.approvalStatus === 'Approved').reduce((s, e) => s + e.total, 0)
  const pendingCount = filtered.filter((e) => e.approvalStatus === 'Pending').length
  const totalTax = filtered.reduce((s, e) => s + e.salesTax + e.srbSst + e.gst + e.incomeTax, 0)
  const computedTotal = pettyCashTotal(form.principal, form.salesTax, form.srbSst, form.gst, form.incomeTax)

  const openAdd = () => {
    setIsEdit(false)
    setEditId(null)
    setForm({
      ...emptyForm,
      branchId: defaultBranchId,
      category: categories[0] ?? emptyForm.category,
    })
    setDialogOpen(true)
  }

  const openEdit = (expense: Expense) => {
    if (expense.approvalStatus === 'Approved') {
      toast.error('Approved expenses cannot be edited')
      return
    }
    setIsEdit(true)
    setEditId(expense.id)
    setForm({
      branchId: expense.branchId,
      vendor: expense.vendor,
      category: expense.category,
      date: expense.date,
      principal: expense.principal,
      salesTax: expense.salesTax,
      srbSst: expense.srbSst,
      gst: expense.gst,
      incomeTax: expense.incomeTax ?? 0,
      paymentMode: expense.paymentMode,
      chequeNo: expense.chequeNo ?? '',
    })
    setDialogOpen(true)
  }

  const handleDelete = async (expense: Expense) => {
    if (!canWrite) return
    if (expense.approvalStatus === 'Approved') {
      toast.error('Cannot delete an approved expense')
      return
    }
    if (!confirm(`Delete expense from ${expense.vendor}?`)) return
    try {
      if (api) {
        await apiDeleteExpense(expense.id)
        await reload()
      } else {
        deleteExpense(expense.id)
      }
      toast.success('Expense deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const handleApprove = async (expense: Expense) => {
    if (!canWrite || expense.approvalStatus !== 'Pending') return
    try {
      if (api) {
        await apiApproveExpense(expense.id)
        await reload()
      } else {
        updateExpense(expense.id, { approvalStatus: 'Approved' })
      }
      toast.success('Expense approved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Approve failed')
    }
  }

  const handleReject = async (expense: Expense) => {
    if (!canWrite || expense.approvalStatus !== 'Pending') return
    try {
      if (api) {
        await apiRejectExpense(expense.id)
        await reload()
      } else {
        updateExpense(expense.id, { approvalStatus: 'Rejected' })
      }
      toast.success('Expense rejected')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reject failed')
    }
  }

  const handleSave = () => {
    if (!canWrite) {
      toast.error('You do not have permission to modify expenses')
      return
    }
    if (!form.vendor.trim()) {
      toast.error('Vendor name is required')
      return
    }
    if (form.principal <= 0) {
      toast.error('Principal amount must be greater than zero')
      return
    }
    if (form.paymentMode === 'Cheque' && !form.chequeNo.trim()) {
      toast.error('Cheque number is required for cheque payments')
      return
    }
    if (isDateLocked(form.date)) {
      toast.error('This period is locked — cannot post to a closed fiscal period')
      return
    }
    const payload = {
      ...form,
      chequeNo: form.paymentMode === 'Cheque' ? form.chequeNo.trim() : undefined,
    }

    void runSubmit(async () => {
      try {
        if (api) {
          const cat = expenseCategories.find((c) => c.name === form.category)
          if (!cat) {
            toast.error('Select a valid category')
            return
          }
          const vendorMatch = vendors.find((v) => v.name === form.vendor.trim())
          const pkrBank = banks.find((b) => b.currency === 'PKR' && b.branchId === form.branchId)
            ?? banks.find((b) => b.currency === 'PKR')
          const body = {
            branchId: form.branchId,
            vendorId: vendorMatch?.id,
            vendorName: form.vendor.trim(),
            categoryId: cat.id,
            expenseDate: form.date,
            principal: form.principal,
            salesTax: form.salesTax,
            srbSst: form.srbSst,
            gst: form.gst,
            incomeTax: form.incomeTax,
            paymentMode: toPaymentModeCode(form.paymentMode),
            bankAccountId: pkrBank?.id,
            chequeNo: payload.chequeNo,
          }
          if (isEdit && editId) {
            await apiUpdateExpense(editId, body)
            toast.success('Expense updated')
          } else {
            await apiCreateExpense(body)
            toast.success('Expense submitted — pending approval')
          }
          await reload()
        } else if (isEdit && editId) {
          const existing = expenses.find((e) => e.id === editId)
          if (existing?.approvalStatus === 'Approved') {
            toast.error('Approved expenses cannot be edited')
            return
          }
          updateExpense(editId, payload)
          toast.success('Expense updated')
        } else if (user) {
          addExpense(payload, user.id, user.name)
          toast.success('Expense submitted — pending approval')
        }
        setDialogOpen(false)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Save failed')
      }
    })
  }

  const columns: Column<Expense>[] = [
    {
      key: 'expenseNo',
      header: 'Expense ID',
      cell: (r) => <span className="font-medium">{r.expenseNo || '—'}</span>,
    },
    { key: 'date', header: 'Date', cell: (r) => new Date(r.date).toLocaleDateString('en-PK') },
    { key: 'vendor', header: 'Vendor', cell: (r) => <span className="font-medium">{r.vendor}</span> },
    { key: 'category', header: 'Category', cell: (r) => r.category },
    {
      key: 'branch',
      header: 'Branch',
      cell: (r) => r.branchName || branches.find((b) => b.id === r.branchId)?.name || getBranchName(r.branchId),
    },
    { key: 'principal', header: 'Principal', cell: (r) => formatCurrency(r.principal), className: 'text-right' },
    { key: 'salesTax', header: 'Sales Tax', cell: (r) => formatCurrency(r.salesTax), className: 'text-right' },
    { key: 'srbSst', header: 'SRB-SST', cell: (r) => formatCurrency(r.srbSst), className: 'text-right' },
    { key: 'gst', header: 'GST', cell: (r) => formatCurrency(r.gst), className: 'text-right' },
    { key: 'incomeTax', header: 'Income Tax', cell: (r) => formatCurrency(r.incomeTax ?? 0), className: 'text-right' },
    { key: 'total', header: 'Total', cell: (r) => <span className="font-semibold">{formatCurrency(r.total)}</span>, className: 'text-right' },
    { key: 'paymentMode', header: 'Payment Mode', cell: (r) => (
      <span>
        {r.paymentMode}
        {r.paymentMode === 'Cheque' && r.chequeNo ? (
          <span className="ml-1 text-xs text-muted-foreground">({r.chequeNo})</span>
        ) : null}
      </span>
    ) },
    { key: 'status', header: 'Approval', cell: (r) => <StatusPill status={r.approvalStatus} /> },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) =>
        canWrite ? (
          <div className="flex items-center gap-1">
            {row.approvalStatus === 'Pending' && (
              <>
                <Button size="sm" variant="outline" onClick={() => void handleApprove(row)}>
                  Approve
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void handleReject(row)}>
                  Reject
                </Button>
              </>
            )}
            {row.approvalStatus !== 'Approved' && (
              <RowActions onEdit={() => openEdit(row)} onDelete={() => void handleDelete(row)} />
            )}
          </div>
        ) : null,
    },
  ]

  if (api && loading) return <PageDataSkeleton />

  return (
    <div>
      <PageHeader title="Expense Management" subtitle="Vendor bills with tax breakdown and approval workflow" actionLabel={canWrite ? 'New Expense' : undefined} onAction={canWrite ? openAdd : undefined} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard title="Approved Expenses" value={formatCurrency(totalApproved)} icon={CheckCircle} accent="green" />
        <MetricCard title="Pending Approval" value={pendingCount} icon={AlertCircle} accent="orange" />
        <MetricCard title="Input Tax (GST/SRB/IT)" value={formatCurrency(totalTax)} icon={Receipt} accent="purple" />
      </div>

      <DataTable
        data={displayed}
        columns={columns}
        searchPlaceholder="Search by expense ID, vendor or category..."
        searchFilter={(row, q) =>
          (row.expenseNo ?? '').toLowerCase().includes(q) ||
          row.vendor.toLowerCase().includes(q) ||
          row.category.toLowerCase().includes(q)
        }
        statusPills={statusPills}
        activeStatus={statusFilter}
        onStatusChange={setStatusFilter}
        filters={[
          {
            key: 'branch',
            label: 'Branch',
            type: 'select',
            options: branches.map((b) => ({ label: b.name, value: b.id })),
            accessor: (r) => r.branchId,
          },
          { key: 'category', label: 'Category', type: 'select', options: categories.map((c) => ({ label: c, value: c })), accessor: (r) => r.category },
          { key: 'paymentMode', label: 'Payment Mode', type: 'select', options: paymentModes.map((m) => ({ label: m, value: m })), accessor: (r) => r.paymentMode },
          { key: 'date', label: 'Date', type: 'dateRange', accessor: (r) => r.date },
          { key: 'total', label: 'Total Amount', type: 'numberRange', accessor: (r) => r.total },
        ]}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit Expense' : 'New Expense'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Vendor</Label>
                {api && vendors.length > 0 ? (
                  <Select
                    value={vendors.find((v) => v.name === form.vendor)?.id ?? '__custom__'}
                    onValueChange={(v) => {
                      if (v === '__custom__') setForm({ ...form, vendor: '' })
                      else {
                        const vend = vendors.find((x) => x.id === v)
                        setForm({ ...form, vendor: vend?.name ?? '' })
                      }
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                    <SelectContent>
                      {vendors.map((v) => (
                        <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                      ))}
                      <SelectItem value="__custom__">Other (type name)</SelectItem>
                    </SelectContent>
                  </Select>
                ) : null}
                <Input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} placeholder="Vendor name" />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Payment Mode</Label>
                <Select
                  value={form.paymentMode}
                  onValueChange={(v) =>
                    setForm({
                      ...form,
                      paymentMode: v,
                      chequeNo: v === 'Cheque' ? form.chequeNo : '',
                    })
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{paymentModes.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {form.paymentMode === 'Cheque' && (
                <div className="space-y-2">
                  <Label>Cheque Number</Label>
                  <Input
                    value={form.chequeNo}
                    onChange={(e) => setForm({ ...form, chequeNo: e.target.value })}
                    placeholder="e.g. CHQ-4521"
                  />
                </div>
              )}
              <div className="space-y-2"><Label>Principal</Label><Input type="number" value={form.principal || ''} onChange={(e) => setForm({ ...form, principal: Number(e.target.value) })} /></div>
              <div className="space-y-2"><Label>Sales Tax</Label><Input type="number" value={form.salesTax || ''} onChange={(e) => setForm({ ...form, salesTax: Number(e.target.value) })} /></div>
              <div className="space-y-2"><Label>SRB-SST</Label><Input type="number" value={form.srbSst || ''} onChange={(e) => setForm({ ...form, srbSst: Number(e.target.value) })} /></div>
              <div className="space-y-2"><Label>GST</Label><Input type="number" value={form.gst || ''} onChange={(e) => setForm({ ...form, gst: Number(e.target.value) })} /></div>
              <div className="space-y-2"><Label>Income Tax</Label><Input type="number" value={form.incomeTax || ''} onChange={(e) => setForm({ ...form, incomeTax: Number(e.target.value) })} /></div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-lg font-bold">{formatCurrency(computedTotal)}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleSave} loading={submitting}>
                {isEdit ? 'Save Changes' : 'Add Expense'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
