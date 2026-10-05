import { useMemo, useState } from 'react'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageDataSkeleton } from '@/components/shared/PageDataSkeleton'
import { MetricCard } from '@/components/shared/MetricCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { RowActions } from '@/components/shared/RowActions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { dashboardMetrics } from '@/data'
import { useBranchFilter } from '@/hooks/useBranchFilter'
import { useCashApiSync } from '@/hooks/useCashApiSync'
import { formatCurrency, pettyCashTotal } from '@/lib/calculations'
import { createPettyCash as apiCreatePettyCash } from '@/lib/cash-api'
import { branchFilterOptions } from '@/lib/filter-options'
import { useAppStore } from '@/store/app-store'
import { useDataStore } from '@/store/data-store'
import { useSettingsStore } from '@/store/settings-store'
import type { PettyCashEntry } from '@/types'
import { ArrowDownLeft, ArrowUpRight, Banknote, PiggyBank, Wallet } from 'lucide-react'
import { toast } from 'sonner'

const emptyForm = {
  branchId: 'khi',
  date: new Date().toISOString().slice(0, 10),
  category: '',
  description: '',
  type: 'out' as 'in' | 'out',
  principal: 0,
  salesTax: 0,
  srbSst: 0,
  gst: 0,
  incomeTax: 0,
}

export default function PettyCashPage() {
  const { api, reload, pettyCategories, loading } = useCashApiSync()
  const pettyCash = useDataStore((s) => s.pettyCash)
  const branches = useDataStore((s) => s.branches)
  const addPettyCash = useDataStore((s) => s.addPettyCash)
  const updatePettyCash = useDataStore((s) => s.updatePettyCash)
  const deletePettyCash = useDataStore((s) => s.deletePettyCash)
  const selectedBranchId = useAppStore((s) => s.selectedBranchId)
  const settingsCategories = useSettingsStore((s) => s.pettyCashCategories)

  const categoryNames = api
    ? pettyCategories.map((c) => c.name)
    : settingsCategories
  const defaultCategory = categoryNames[0] ?? ''
  const defaultBranchId =
    selectedBranchId === 'all'
      ? (branches.find((b) => b.code === 'KHI')?.id ?? branches[0]?.id ?? 'khi')
      : selectedBranchId

  const filtered = useBranchFilter(pettyCash)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({
    ...emptyForm,
    branchId: defaultBranchId,
    category: defaultCategory,
  })

  const today = new Date().toISOString().slice(0, 10)
  const todayEntries = filtered.filter((e) => e.date === today)
  const cashIn = todayEntries.filter((e) => e.type === 'in').reduce((s, e) => s + e.total, 0)
  const cashOut = todayEntries.filter((e) => e.type === 'out').reduce((s, e) => s + e.total, 0)
  const openingBalance = dashboardMetrics.pettyCashBalance - cashIn + cashOut
  const closingBalance = openingBalance + cashIn - cashOut
  const computedTotal = pettyCashTotal(form.principal, form.salesTax, form.srbSst, form.gst, form.incomeTax)

  const totalTax = useMemo(
    () => filtered.reduce((s, e) => s + e.salesTax + e.srbSst + e.gst + (e.incomeTax ?? 0), 0),
    [filtered]
  )

  const openAdd = () => {
    setIsEdit(false)
    setEditId(null)
    setForm({
      ...emptyForm,
      branchId: defaultBranchId,
      date: today,
      category: defaultCategory,
    })
    setSheetOpen(true)
  }

  const openEdit = (entry: PettyCashEntry) => {
    if (api) {
      toast.error('Posted petty cash entries cannot be edited (reversal comes in M8)')
      return
    }
    setIsEdit(true)
    setEditId(entry.id)
    setForm({
      branchId: entry.branchId,
      date: entry.date,
      category: entry.category,
      description: entry.description,
      type: entry.type,
      principal: entry.principal,
      salesTax: entry.salesTax,
      srbSst: entry.srbSst,
      gst: entry.gst,
      incomeTax: entry.incomeTax ?? 0,
    })
    setSheetOpen(true)
  }

  const handleDelete = async (entry: PettyCashEntry) => {
    if (!confirm(`Delete petty cash entry "${entry.description}"?`)) return
    try {
      if (api) {
        toast.error('Posted petty cash entries cannot be deleted (reversal comes in M8)')
        return
      }
      deletePettyCash(entry.id)
      toast.success('Entry deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const handleSave = () => {
    if (!form.category.trim()) {
      toast.error('Category is required')
      return
    }
    if (!form.description.trim()) {
      toast.error('Description is required')
      return
    }
    if (form.principal <= 0 && form.type === 'out') {
      toast.error('Principal must be greater than zero')
      return
    }

    if (isEdit && editId) {
      updatePettyCash(editId, form)
      toast.success('Entry updated')
      setSheetOpen(false)
      return
    }

    void (async () => {
      try {
        if (api) {
          const cat = pettyCategories.find((c) => c.name === form.category)
          if (!cat) {
            toast.error('Select a valid category')
            return
          }
          await apiCreatePettyCash({
            branchId: form.branchId,
            entryDate: form.date,
            categoryId: cat.id,
            description: form.description,
            entryType: form.type,
            principal: form.principal || computedTotal,
            salesTax: form.salesTax,
            srbSst: form.srbSst,
            gst: form.gst,
            incomeTax: form.incomeTax,
          })
          await reload()
        } else {
          addPettyCash(form)
        }
        toast.success('Entry added')
        setSheetOpen(false)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Save failed')
      }
    })()
  }

  const columns: Column<PettyCashEntry>[] = [
    {
      key: 'pettyCashNo',
      header: 'Entry ID',
      cell: (r) => <span className="font-medium">{r.pettyCashNo || '—'}</span>,
    },
    { key: 'date', header: 'Date', cell: (r) => new Date(r.date).toLocaleDateString('en-PK') },
    { key: 'category', header: 'Category', cell: (r) => r.category },
    { key: 'description', header: 'Description', cell: (r) => r.description },
    {
      key: 'type',
      header: 'Type',
      cell: (r) => (
        <span className={r.type === 'in' ? 'text-emerald-600' : 'text-red-600'}>
          {r.type === 'in' ? 'Cash In' : 'Cash Out'}
        </span>
      ),
    },
    { key: 'principal', header: 'Principal', cell: (r) => formatCurrency(r.principal), className: 'text-right' },
    { key: 'salesTax', header: 'Sales Tax', cell: (r) => formatCurrency(r.salesTax), className: 'text-right' },
    { key: 'srbSst', header: 'SRB-SST', cell: (r) => formatCurrency(r.srbSst), className: 'text-right' },
    { key: 'gst', header: 'GST', cell: (r) => formatCurrency(r.gst), className: 'text-right' },
    { key: 'incomeTax', header: 'Income Tax', cell: (r) => formatCurrency(r.incomeTax ?? 0), className: 'text-right' },
    { key: 'total', header: 'Total', cell: (r) => <span className="font-semibold">{formatCurrency(r.total)}</span>, className: 'text-right' },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) =>
        api ? null : <RowActions onEdit={() => openEdit(row)} onDelete={() => void handleDelete(row)} />,
    },
  ]

  if (api && loading) return <PageDataSkeleton />

  return (
    <div>
      <PageHeader title="Petty Cash" subtitle="Branch petty cash with tax breakdown" actionLabel="Add Entry" onAction={openAdd} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Petty Cash Balance" value={formatCurrency(dashboardMetrics.pettyCashBalance)} icon={Wallet} accent="green" />
        <MetricCard title="Today's Cash In" value={formatCurrency(cashIn)} icon={ArrowDownLeft} accent="blue" />
        <MetricCard title="Today's Cash Out" value={formatCurrency(cashOut)} icon={ArrowUpRight} accent="orange" />
        <MetricCard title="Total Tax (Period)" value={formatCurrency(totalTax)} icon={Banknote} accent="purple" />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><PiggyBank className="h-4 w-4" /> Imprest Replenishment</CardTitle>
            <CardDescription>Request top-up from Head Office</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>Requested Amount</Label><Input type="number" defaultValue={50000} /></div>
            <Button className="w-full" onClick={() => toast.success('Replenishment request submitted')}>Submit Replenishment Request</Button>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Daily Closing Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">Opening</p><p className="text-xl font-bold">{formatCurrency(openingBalance)}</p></div>
              <div className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">Cash In</p><p className="text-xl font-bold text-emerald-600">+{formatCurrency(cashIn)}</p></div>
              <div className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">Cash Out</p><p className="text-xl font-bold text-red-600">-{formatCurrency(cashOut)}</p></div>
              <div className="rounded-lg border bg-primary/5 p-4"><p className="text-sm text-muted-foreground">Closing</p><p className="text-xl font-bold">{formatCurrency(closingBalance)}</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        searchPlaceholder="Search by category or description..."
        searchFilter={(row, q) => row.category.toLowerCase().includes(q) || row.description.toLowerCase().includes(q)}
        filters={[
          { key: 'branch', label: 'Branch', type: 'select', options: branchFilterOptions, accessor: (r) => r.branchId },
          { key: 'category', label: 'Category', type: 'select', options: categoryNames.map((c) => ({ label: c, value: c })), accessor: (r) => r.category },
          { key: 'type', label: 'Type', type: 'select', options: [{ label: 'Cash In', value: 'in' }, { label: 'Cash Out', value: 'out' }], accessor: (r) => r.type },
          { key: 'date', label: 'Date', type: 'dateRange', accessor: (r) => r.date },
          { key: 'total', label: 'Total', type: 'numberRange', accessor: (r) => r.total },
        ]}
      />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{isEdit ? 'Edit Entry' : 'Add Petty Cash Entry'}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {[...new Set([...categoryNames, form.category].filter(Boolean))].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as 'in' | 'out' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="out">Cash Out (Expense)</SelectItem>
                  <SelectItem value="in">Cash In (Replenishment)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
            <Button className="w-full" onClick={handleSave}>{isEdit ? 'Save Changes' : 'Add Entry'}</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
