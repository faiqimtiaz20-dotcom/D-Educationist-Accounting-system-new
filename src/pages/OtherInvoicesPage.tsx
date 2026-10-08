import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageDataSkeleton } from '@/components/shared/PageDataSkeleton'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusPill } from '@/components/shared/StatusPill'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { getBranchName } from '@/lib/org'
import { useBranchFilter } from '@/hooks/useBranchFilter'
import { useCurrentUser } from '@/hooks/useAuth'
import { useModulePermission } from '@/hooks/usePermission'
import { useSubmitState } from '@/hooks/useSubmitState'
import { formatCurrency } from '@/lib/calculations'
import { branchFilterOptions, currencyFilterOptions } from '@/lib/filter-options'
import { getOtherInvoiceLineTotal, getOtherInvoiceTotal } from '@/lib/other-invoice'
import { canViewAllBranches } from '@/lib/permissions'
import { useAppStore } from '@/store/app-store'
import { useDataStore } from '@/store/data-store'
import { isDateLocked } from '@/store/settings-store'
import { useRevenueApiSync } from '@/hooks/useRevenueApiSync'
import {
  createOtherInvoice as apiCreateOther,
  deleteOtherInvoice as apiDeleteOther,
  updateOtherInvoice as apiUpdateOther,
} from '@/lib/revenue-api'
import type { Currency, OtherInvoice, OtherInvoiceLine, OtherInvoiceStatus } from '@/types'
import { Eye, FileText, MoreHorizontal, Pencil, Plus, Send, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

const otherInvoiceStatuses: OtherInvoiceStatus[] = ['Draft', 'Sent', 'Paid', 'Closed']
const currencies: Currency[] = ['PKR', 'GBP', 'USD', 'CAD', 'AUD', 'EUR']

const formatDate = (iso: string) => {
  const [year, month, day] = iso.split('-')
  if (!year || !month || !day) return iso
  return `${day}/${month}/${year}`
}

let lineSeq = 0
const nextLineId = () => `oil-${Date.now()}-${++lineSeq}`

const blankLine = (): OtherInvoiceLine => ({
  id: nextLineId(),
  description: '',
  quantity: 1,
  unitPrice: 0,
})

const emptyForm = (branchId: string) => ({
  branchId,
  invoiceDate: new Date().toISOString().slice(0, 10),
  billTo: '',
  category: '',
  currency: 'PKR' as Currency,
  status: 'Draft' as OtherInvoiceStatus,
  notes: '',
  lines: [blankLine()],
})

export default function OtherInvoicesPage() {
  const currentUser = useCurrentUser()
  const isSuperAdmin = currentUser ? canViewAllBranches(currentUser) : false
  const { canWrite } = useModulePermission('Invoices & Receivables')
  const { api, reload, loading } = useRevenueApiSync()
  const selectedBranchId = useAppStore((s) => s.selectedBranchId)
  const otherInvoices = useDataStore((s) => s.otherInvoices)
  const addOtherInvoice = useDataStore((s) => s.addOtherInvoice)
  const updateOtherInvoice = useDataStore((s) => s.updateOtherInvoice)
  const deleteOtherInvoice = useDataStore((s) => s.deleteOtherInvoice)

  const branchInvoices = useBranchFilter(otherInvoices)
  const defaultBranch = selectedBranchId === 'all' ? 'khi' : selectedBranchId

  const [activeStatus, setActiveStatus] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [previewInvoice, setPreviewInvoice] = useState<OtherInvoice | null>(null)
  const [form, setForm] = useState(() => emptyForm(defaultBranch))
  const { submitting, runSubmit } = useSubmitState()

  const filtered = useMemo(() => {
    if (activeStatus === 'all') return branchInvoices
    return branchInvoices.filter((i) => i.status === activeStatus)
  }, [branchInvoices, activeStatus])

  const statusPills = useMemo(() => {
    const counts = otherInvoiceStatuses.reduce(
      (acc, status) => {
        acc[status] = branchInvoices.filter((i) => i.status === status).length
        return acc
      },
      {} as Record<string, number>
    )
    return [
      { label: 'All', value: 'all', count: branchInvoices.length },
      ...otherInvoiceStatuses.map((status) => ({ label: status, value: status, count: counts[status] })),
    ]
  }, [branchInvoices])

  const formTotal = getOtherInvoiceTotal({ lines: form.lines })

  const openCreate = () => {
    setIsEdit(false)
    setEditId(null)
    setForm(emptyForm(defaultBranch))
    setDialogOpen(true)
  }

  const openEdit = (invoice: OtherInvoice) => {
    setIsEdit(true)
    setEditId(invoice.id)
    setForm({
      branchId: invoice.branchId,
      invoiceDate: invoice.invoiceDate,
      billTo: invoice.billTo,
      category: invoice.category,
      currency: invoice.currency,
      status: invoice.status,
      notes: invoice.notes ?? '',
      lines: invoice.lines.map((l) => ({ ...l })),
    })
    setDialogOpen(true)
  }

  const handleSend = async (invoice: OtherInvoice): Promise<boolean> => {
    if (!canWrite) {
      toast.error('You do not have permission to send invoices')
      return false
    }
    if (invoice.status !== 'Draft') {
      toast.error('Only draft invoices can be sent')
      return false
    }
    if (isDateLocked(invoice.invoiceDate)) {
      toast.error('This period is locked — cannot post to a closed fiscal period')
      return false
    }
    const result = await runSubmit(async () => {
      try {
        if (api) {
          await apiUpdateOther(invoice.id, { status: 'Sent' })
          await reload()
        } else {
          updateOtherInvoice(invoice.id, { status: 'Sent' })
        }
        toast.success(`Invoice ${invoice.invoiceNo} marked as Sent`)
        return true
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Send failed')
        return false
      }
    })
    return result === true
  }

  const handleDelete = async (invoice: OtherInvoice) => {
    if (!canWrite) return
    if (!confirm(`Delete invoice ${invoice.invoiceNo}?`)) return
    try {
      if (api) {
        await apiDeleteOther(invoice.id)
        await reload()
      } else {
        deleteOtherInvoice(invoice.id)
      }
      toast.success('Invoice deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const addLine = () => {
    setForm((prev) => ({ ...prev, lines: [...prev.lines, blankLine()] }))
  }

  const removeLine = (lineId: string) => {
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.length <= 1 ? prev.lines : prev.lines.filter((l) => l.id !== lineId),
    }))
  }

  const updateLine = (lineId: string, patch: Partial<OtherInvoiceLine>) => {
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.map((l) => (l.id === lineId ? { ...l, ...patch } : l)),
    }))
  }

  const handleSave = () => {
    if (!canWrite) {
      toast.error('You do not have permission to modify invoices')
      return
    }
    if (!form.billTo.trim()) {
      toast.error('Bill To is required')
      return
    }
    if (!form.category.trim()) {
      toast.error('Category is required')
      return
    }
    if (form.lines.length === 0) {
      toast.error('Add at least one line item')
      return
    }
    for (const line of form.lines) {
      if (!line.description.trim()) {
        toast.error('Each line needs a description')
        return
      }
      if (line.quantity <= 0) {
        toast.error('Quantity must be greater than zero')
        return
      }
      if (line.unitPrice < 0) {
        toast.error('Unit price cannot be negative')
        return
      }
    }
    if (isDateLocked(form.invoiceDate)) {
      toast.error('This period is locked — cannot post to a closed fiscal period')
      return
    }

    const payload = {
      branchId: form.branchId,
      invoiceDate: form.invoiceDate,
      billTo: form.billTo.trim(),
      category: form.category.trim(),
      currency: form.currency,
      status: form.status,
      notes: form.notes.trim() || undefined,
      lines: form.lines,
    }

    void runSubmit(async () => {
      try {
        if (api) {
          const body = {
            branchId: form.branchId,
            invoiceDate: form.invoiceDate,
            billTo: form.billTo.trim(),
            category: form.category.trim(),
            currencyCode: form.currency,
            status: form.status,
            notes: form.notes.trim() || undefined,
            lines: form.lines,
          }
          if (isEdit && editId) {
            await apiUpdateOther(editId, body)
            toast.success('Invoice updated')
          } else {
            await apiCreateOther({ ...body, status: 'Draft' })
            toast.success('Invoice created as Draft')
          }
          await reload()
        } else if (isEdit && editId) {
          updateOtherInvoice(editId, payload)
          toast.success('Invoice updated')
        } else {
          addOtherInvoice({ ...payload, status: 'Draft' })
          toast.success('Invoice created as Draft')
        }
        setDialogOpen(false)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Save failed')
      }
    })
  }

  const columns: Column<OtherInvoice>[] = [
    {
      key: 'date',
      header: 'Date',
      cell: (row) => formatDate(row.invoiceDate),
      sortAccessor: (row) => row.invoiceDate,
    },
    {
      key: 'invoiceNo',
      header: 'Invoice No.',
      cell: (row) => <span className="font-medium">{row.invoiceNo}</span>,
    },
    { key: 'billTo', header: 'Bill To', cell: (row) => row.billTo },
    { key: 'category', header: 'Category', cell: (row) => row.category },
    ...(isSuperAdmin
      ? [{ key: 'branch', header: 'Branch', cell: (row: OtherInvoice) => row.branchName || getBranchName(row.branchId) }]
      : []),
    { key: 'currency', header: 'Currency', cell: (row) => row.currency },
    {
      key: 'lines',
      header: 'Lines',
      className: 'text-right',
      cell: (row) => row.lines.length,
      sortAccessor: (row) => row.lines.length,
    },
    {
      key: 'total',
      header: 'Amount',
      className: 'text-right',
      sortAccessor: (row) => getOtherInvoiceTotal(row),
      cell: (row) => formatCurrency(getOtherInvoiceTotal(row), row.currency),
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
              <DropdownMenuItem
                className="text-primary"
                disabled={submitting}
                onSelect={(e) => {
                  e.preventDefault()
                  void handleSend(row)
                }}
              >
                <Send /> Mark as Sent
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => setPreviewInvoice(row)}>
              <Eye /> Preview
            </DropdownMenuItem>
            {canWrite && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => openEdit(row)}>
                  <Pencil /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => handleDelete(row)}
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

  const previewTotal = previewInvoice ? getOtherInvoiceTotal(previewInvoice) : 0

  if (api && loading) return <PageDataSkeleton />

  return (
    <div>
      <PageHeader
        title="Other Invoices"
        subtitle="Generate invoices for marketing, services, and other non-university billing"
        actionLabel={canWrite ? 'Create Invoice' : undefined}
        onAction={canWrite ? openCreate : undefined}
      />

      <DataTable
        data={filtered}
        columns={columns}
        searchPlaceholder="Search invoice no., bill to, category..."
        searchFilter={(row, query) =>
          row.invoiceNo.toLowerCase().includes(query) ||
          row.billTo.toLowerCase().includes(query) ||
          row.category.toLowerCase().includes(query)
        }
        statusPills={statusPills}
        activeStatus={activeStatus}
        onStatusChange={setActiveStatus}
        filters={[
          ...(isSuperAdmin
            ? [
                {
                  key: 'branch',
                  label: 'Branch',
                  type: 'select' as const,
                  options: branchFilterOptions,
                  accessor: (r: OtherInvoice) => r.branchId,
                },
              ]
            : []),
          {
            key: 'currency',
            label: 'Currency',
            type: 'select',
            options: currencyFilterOptions,
            accessor: (r) => r.currency,
          },
          { key: 'invoiceDate', label: 'Invoice Date', type: 'dateRange', accessor: (r) => r.invoiceDate },
          { key: 'amount', label: 'Amount', type: 'numberRange', accessor: (r) => getOtherInvoiceTotal(r) },
        ]}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit Other Invoice' : 'Create Other Invoice'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Invoice Date</Label>
                <Input
                  type="date"
                  value={form.invoiceDate}
                  onChange={(e) => setForm((p) => ({ ...p, invoiceDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select
                  value={form.currency}
                  onValueChange={(v) => setForm((p) => ({ ...p, currency: v as Currency }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Bill To</Label>
                <Input
                  value={form.billTo}
                  onChange={(e) => setForm((p) => ({ ...p, billTo: e.target.value }))}
                  placeholder="Client / company name"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  placeholder="e.g. Marketing, Services"
                />
              </div>
              {isEdit && (
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm((p) => ({ ...p, status: v as OtherInvoiceStatus }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {otherInvoiceStatuses.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {isSuperAdmin && (
                <div className="space-y-2">
                  <Label>Branch</Label>
                  <Select
                    value={form.branchId}
                    onValueChange={(v) => setForm((p) => ({ ...p, branchId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {branchFilterOptions.map((b) => (
                        <SelectItem key={b.value} value={b.value}>
                          {b.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Line items</Label>
                <Button type="button" variant="outline" size="sm" onClick={addLine}>
                  <Plus className="mr-1 h-4 w-4" /> Add line
                </Button>
              </div>
              {form.lines.map((line) => (
                <Card key={line.id} className="bg-muted/20">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">Description</Label>
                        <Input
                          value={line.description}
                          onChange={(e) => updateLine(line.id, { description: e.target.value })}
                          placeholder="Item or service description"
                        />
                      </div>
                      {form.lines.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeLine(line.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Quantity</Label>
                        <Input
                          type="number"
                          min={0}
                          value={line.quantity || ''}
                          onChange={(e) => updateLine(line.id, { quantity: Number(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Unit Price</Label>
                        <Input
                          type="number"
                          min={0}
                          value={line.unitPrice || ''}
                          onChange={(e) => updateLine(line.id, { unitPrice: Number(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Line Total</Label>
                        <p className="flex h-9 items-center text-sm font-medium">
                          {formatCurrency(getOtherInvoiceLineTotal(line), form.currency)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Optional notes"
                rows={2}
              />
            </div>

            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="flex justify-between p-4 text-base font-bold">
                <span>Total</span>
                <span>{formatCurrency(formTotal, form.currency)}</span>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleSave} loading={submitting}>
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
              <div className="rounded-lg border p-4">
                <div className="mb-4 border-b pb-4 text-center">
                  <p className="text-lg font-bold">D&apos; Educationist</p>
                  <p className="text-sm text-muted-foreground">Invoice — {previewInvoice.category}</p>
                </div>
                <div className="mb-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-muted-foreground">Invoice No.</p>
                    <p className="font-medium">{previewInvoice.invoiceNo}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Date</p>
                    <p className="font-medium">{formatDate(previewInvoice.invoiceDate)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Bill To</p>
                    <p className="font-medium">{previewInvoice.billTo}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <StatusPill status={previewInvoice.status} />
                  </div>
                </div>
                <div className="mb-4 space-y-2">
                  {previewInvoice.lines.map((line) => (
                    <div key={line.id} className="rounded bg-muted/40 p-3 text-sm">
                      <p className="font-medium">{line.description}</p>
                      <div className="mt-1 flex justify-between text-muted-foreground">
                        <span>
                          {line.quantity} × {formatCurrency(line.unitPrice, previewInvoice.currency)}
                        </span>
                        <span className="font-medium text-foreground">
                          {formatCurrency(getOtherInvoiceLineTotal(line), previewInvoice.currency)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {previewInvoice.notes && (
                  <p className="mb-4 text-sm text-muted-foreground">{previewInvoice.notes}</p>
                )}
                <div className="flex justify-between border-t pt-2 text-base font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(previewTotal, previewInvoice.currency)}</span>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPreviewInvoice(null)}>
                  Close
                </Button>
                {canWrite && previewInvoice.status === 'Draft' && (
                  <Button
                    variant="outline"
                    loading={submitting}
                    onClick={() => {
                      void (async () => {
                        const ok = await handleSend(previewInvoice)
                        if (ok) setPreviewInvoice(null)
                      })()
                    }}
                  >
                    <Send className="mr-1.5 h-4 w-4" /> Mark as Sent
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
