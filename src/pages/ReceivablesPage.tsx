import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageDataSkeleton } from '@/components/shared/PageDataSkeleton'
import { PageHeader } from '@/components/shared/PageHeader'
import { RowActions } from '@/components/shared/RowActions'
import { StatusPill } from '@/components/shared/StatusPill'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { bankAccounts as mockBankAccounts } from '@/data'
import { useBranchFilter } from '@/hooks/useBranchFilter'
import { useRevenueApiSync } from '@/hooks/useRevenueApiSync'
import { useSubmitState } from '@/hooks/useSubmitState'
import { calcWHT, formatCurrency, grossPKR, netPKR } from '@/lib/calculations'
import {
  getInvoiceOutstanding,
  getInvoiceReceivables,
  getInvoiceStudentLabel,
  getInvoiceTotal,
  getInvoiceUniversities,
} from '@/lib/invoice'
import { branchFilterOptions, currencyFilterOptions } from '@/lib/filter-options'
import { useDataStore } from '@/store/data-store'
import { isDateLocked } from '@/store/settings-store'
import {
  createReceivable as apiCreateReceivable,
} from '@/lib/revenue-api'
import type { Currency, Receivable, ReconciliationStatus } from '@/types'
import { History, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

type ReceivableRow = Receivable & { branchId: string }

const emptyReceipt = {
  invoiceId: '',
  bankAccountId: '',
  currency: 'GBP' as Currency,
  amountReceived: 0,
  exchangeRate: 355,
  receiptDate: new Date().toISOString().slice(0, 10),
  reconciliationStatus: 'Unmatched' as ReconciliationStatus,
  notes: '',
}

export default function ReceivablesPage() {
  const { api, reload, banks, loading } = useRevenueApiSync()
  const invoices = useDataStore((s) => s.invoices)
  const students = useDataStore((s) => s.students)
  const receivables = useDataStore((s) => s.receivables)
  const addReceivable = useDataStore((s) => s.addReceivable)
  const updateReceivable = useDataStore((s) => s.updateReceivable)
  const deleteReceivable = useDataStore((s) => s.deleteReceivable)

  const bankAccounts = api ? banks : mockBankAccounts
  const getStudent = (id: string) => students.find((s) => s.id === id)
  const getBankName = (id: string) => bankAccounts.find((b) => b.id === id)?.name ?? '—'

  const branchInvoices = useBranchFilter(invoices)
  const branchInvoiceIds = new Set(branchInvoices.map((i) => i.id))

  const branchReceivables: ReceivableRow[] = useMemo(
    () =>
      receivables
        .filter((r) => branchInvoiceIds.has(r.invoiceId))
        .map((r) => {
          const invoice = invoices.find((i) => i.id === r.invoiceId)
          return { ...r, branchId: invoice?.branchId ?? 'ho' }
        }),
    [receivables, branchInvoiceIds, invoices]
  )

  const [dialogOpen, setDialogOpen] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyReceipt)
  const { submitting, runSubmit } = useSubmitState()

  const selectedInvoice = invoices.find((i) => i.id === form.invoiceId)
  const outstanding = selectedInvoice
    ? getInvoiceOutstanding(selectedInvoice, receivables, isEdit ? editId ?? undefined : undefined)
    : 0
  const invoiceTotal = selectedInvoice ? getInvoiceTotal(selectedInvoice) : 0
  const paidSoFar = selectedInvoice ? invoiceTotal - outstanding : 0
  const paymentHistory = selectedInvoice
    ? getInvoiceReceivables(receivables, selectedInvoice.id).filter((r) => r.id !== editId)
    : []

  const gross = grossPKR(form.amountReceived, form.exchangeRate)
  const wht = calcWHT(gross)
  const net = netPKR(gross)
  const willBePartial =
    selectedInvoice &&
    paidSoFar + form.amountReceived < invoiceTotal - 0.001

  const openCreate = () => {
    setIsEdit(false)
    setEditId(null)
    setForm(emptyReceipt)
    setDialogOpen(true)
  }

  const openEdit = (row: Receivable) => {
    setIsEdit(true)
    setEditId(row.id)
    setForm({
      invoiceId: row.invoiceId,
      bankAccountId: row.bankAccountId,
      currency: row.currency,
      amountReceived: row.amountReceived,
      exchangeRate: row.exchangeRate,
      receiptDate: row.receiptDate,
      reconciliationStatus: row.reconciliationStatus,
      notes: row.notes ?? '',
    })
    setDialogOpen(true)
  }

  const handleDelete = (row: Receivable) => {
    if (!confirm('Delete this receipt?')) return
    deleteReceivable(row.id)
    toast.success('Receipt deleted')
  }

  const loadInvoice = (invoiceId: string) => {
    const invoice = invoices.find((i) => i.id === invoiceId)
    if (!invoice) return
    const out = getInvoiceOutstanding(invoice, receivables, isEdit ? editId ?? undefined : undefined)
    setForm((prev) => ({
      ...prev,
      invoiceId,
      currency: invoice.currency,
      amountReceived: out > 0 ? out : 0,
    }))
  }

  const handleSave = () => {
    if (!form.invoiceId || !form.bankAccountId) {
      toast.error('Invoice and bank account are required')
      return
    }
    if (!selectedInvoice) {
      toast.error('Selected invoice was not found')
      return
    }
    if (selectedInvoice.status === 'Draft') {
      toast.error('Send the invoice first — remittance cannot be recorded on Draft invoices')
      return
    }
    if (selectedInvoice.status === 'Closed') {
      toast.error('Cannot record remittance against a closed invoice')
      return
    }
    if (isDateLocked(form.receiptDate)) {
      toast.error('This period is locked — cannot post to a closed fiscal period')
      return
    }
    if (form.amountReceived <= 0) {
      toast.error('Amount must be greater than zero')
      return
    }
    if (!isEdit && form.amountReceived > outstanding + 0.001) {
      toast.error(`Amount exceeds outstanding ${formatCurrency(outstanding, form.currency)}`)
      return
    }
    if (isEdit && editId && selectedInvoice) {
      const maxAllowed = getInvoiceOutstanding(selectedInvoice, receivables, editId) + form.amountReceived
      if (form.amountReceived > maxAllowed + 0.001) {
        toast.error('Amount exceeds allowed outstanding for this invoice')
        return
      }
    }

    const payload = {
      ...form,
      isPartial: willBePartial ?? true,
      notes: form.notes || undefined,
    }

    void runSubmit(async () => {
      if (isEdit && editId) {
        updateReceivable(editId, payload)
        toast.success('Receipt updated')
        setDialogOpen(false)
        return
      }

      try {
        if (api) {
          await apiCreateReceivable({
            branchId: selectedInvoice.branchId,
            invoiceId: form.invoiceId,
            bankAccountId: form.bankAccountId,
            currencyCode: form.currency,
            amountReceived: form.amountReceived,
            exchangeRate: form.exchangeRate,
            receiptDate: form.receiptDate,
            reconciliationStatus: form.reconciliationStatus,
            isPartial: willBePartial ?? true,
            notes: form.notes || undefined,
          })
          await reload()
          toast.success('Remittance recorded')
        } else {
          const ok = addReceivable(payload)
          if (!ok) {
            toast.error('Could not record remittance — check invoice status, amount, and fiscal period')
            return
          }
          toast.success('Remittance recorded')
        }
        setDialogOpen(false)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Save failed')
      }
    })
  }

  const columns: Column<ReceivableRow>[] = [
    { key: 'receiptNo', header: 'Receipt No.', cell: (row) => <span className="font-mono text-xs">{row.receiptNo}</span> },
    {
      key: 'invoice',
      header: 'Invoice',
      cell: (row) => {
        const invoice = invoices.find((i) => i.id === row.invoiceId)
        return invoice?.invoiceNo ?? row.invoiceId
      },
    },
    {
      key: 'student',
      header: 'Student',
      cell: (row) => {
        const invoice = invoices.find((i) => i.id === row.invoiceId)
        return invoice ? getInvoiceStudentLabel(invoice, getStudent) : '—'
      },
    },
    {
      key: 'university',
      header: 'University',
      cell: (row) => {
        const invoice = invoices.find((i) => i.id === row.invoiceId)
        return invoice ? getInvoiceUniversities(invoice, getStudent) : '—'
      },
    },
    { key: 'bank', header: 'Bank Name', cell: (row) => getBankName(row.bankAccountId) },
    { key: 'date', header: 'Receipt Date', cell: (row) => row.receiptDate },
    { key: 'currency', header: 'Currency', cell: (row) => row.currency },
    {
      key: 'bonus',
      header: 'Bonus',
      className: 'text-right',
      sortAccessor: (row) => {
        const invoice = invoices.find((i) => i.id === row.invoiceId)
        return invoice ? invoice.lines?.reduce((s, l) => s + l.bonus, 0) ?? 0 : 0
      },
      cell: (row) => {
        const invoice = invoices.find((i) => i.id === row.invoiceId)
        if (!invoice) return '—'
        const bonus = invoice.lines?.reduce((s, l) => s + l.bonus, 0) ?? 0
        return formatCurrency(bonus, invoice.currency)
      },
    },
    { key: 'amount', header: 'Amount Received', cell: (row) => formatCurrency(row.amountReceived, row.currency) },
    { key: 'rate', header: 'Exchange Rate', cell: (row) => row.exchangeRate.toFixed(2) },
    { key: 'gross', header: 'Gross (PKR)', cell: (row) => formatCurrency(grossPKR(row.amountReceived, row.exchangeRate)) },
    { key: 'wht', header: 'WHT 1%', cell: (row) => formatCurrency(calcWHT(grossPKR(row.amountReceived, row.exchangeRate))) },
    { key: 'net', header: 'Net (PKR)', cell: (row) => formatCurrency(netPKR(grossPKR(row.amountReceived, row.exchangeRate))) },
    { key: 'recon', header: 'Reconciliation', cell: (row) => <StatusPill status={row.reconciliationStatus} /> },
    { key: 'partial', header: 'Type', cell: (row) => <StatusPill status={row.isPartial ? 'Partial' : 'Fully Received'} /> },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => <RowActions onEdit={() => openEdit(row)} onDelete={() => handleDelete(row)} />,
    },
  ]

  if (api && loading) return <PageDataSkeleton />

  return (
    <div>
      <PageHeader
        title="Remittance"
        subtitle="University remittances with partial payments and full transaction history"
        actionLabel="Record Receipt"
        onAction={openCreate}
      />

      <DataTable
        data={branchReceivables}
        columns={columns}
        searchPlaceholder="Search by invoice, receipt no, or student..."
        searchFilter={(row, query) => {
          const invoice = invoices.find((i) => i.id === row.invoiceId)
          const studentLabel = invoice ? getInvoiceStudentLabel(invoice, getStudent).toLowerCase() : ''
          const uniLabel = invoice ? getInvoiceUniversities(invoice, getStudent).toLowerCase() : ''
          return (
            row.receiptNo.toLowerCase().includes(query) ||
            (invoice?.invoiceNo.toLowerCase().includes(query) ?? false) ||
            studentLabel.includes(query) ||
            uniLabel.includes(query) ||
            getBankName(row.bankAccountId).toLowerCase().includes(query)
          )
        }}
        filters={[
          { key: 'branch', label: 'Branch', type: 'select', options: branchFilterOptions, accessor: (r) => r.branchId },
          { key: 'currency', label: 'Currency', type: 'select', options: currencyFilterOptions, accessor: (r) => r.currency },
          { key: 'recon', label: 'Reconciliation', type: 'select', options: [{ label: 'Matched', value: 'Matched' }, { label: 'Unmatched', value: 'Unmatched' }], accessor: (r) => r.reconciliationStatus },
          { key: 'type', label: 'Payment Type', type: 'select', options: [{ label: 'Partial', value: 'partial' }, { label: 'Full', value: 'full' }], accessor: (r) => (r.isPartial ? 'partial' : 'full') },
          { key: 'receiptDate', label: 'Receipt Date', type: 'dateRange', accessor: (r) => r.receiptDate },
          { key: 'amount', label: 'Amount Received', type: 'numberRange', accessor: (r) => r.amountReceived },
        ]}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" /> {isEdit ? 'Edit Receipt' : 'Record Partial / Full Receipt'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Linked Invoice</Label>
              <Select value={form.invoiceId} onValueChange={loadInvoice}>
                <SelectTrigger><SelectValue placeholder="Select invoice" /></SelectTrigger>
                <SelectContent>
                  {branchInvoices
                    .filter((i) => i.status !== 'Closed' && i.status !== 'Draft')
                    .map((i) => {
                      const out = getInvoiceOutstanding(i, receivables, isEdit ? editId ?? undefined : undefined)
                      return (
                        <SelectItem key={i.id} value={i.id} disabled={!isEdit && out <= 0}>
                          {i.invoiceNo} — {getInvoiceStudentLabel(i, getStudent)} (Outstanding: {formatCurrency(out, i.currency)})
                        </SelectItem>
                      )
                    })}
                </SelectContent>
              </Select>
            </div>

            {selectedInvoice && (
              <Card className="bg-muted/30">
                <CardContent className="grid grid-cols-1 gap-3 p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <p className="text-muted-foreground">Invoice Amount</p>
                    <p className="font-semibold">{formatCurrency(invoiceTotal, selectedInvoice.currency)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Paid</p>
                    <p className="font-semibold text-emerald-600">{formatCurrency(paidSoFar, selectedInvoice.currency)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Outstanding</p>
                    <p className="font-semibold text-amber-600">{formatCurrency(outstanding, selectedInvoice.currency)}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Bank Account</Label>
                <Select value={form.bankAccountId} onValueChange={(v) => setForm((p) => ({ ...p, bankAccountId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select bank" /></SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name} ({'currency' in b ? b.currency : b.currencyCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Receipt Date</Label>
                <Input type="date" value={form.receiptDate} onChange={(e) => setForm((p) => ({ ...p, receiptDate: e.target.value }))} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Payment Amount ({form.currency})</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.amountReceived || ''}
                    onChange={(e) => setForm((p) => ({ ...p, amountReceived: Number(e.target.value) }))}
                  />
                  {selectedInvoice && outstanding > 0 && (
                    <Button type="button" variant="outline" onClick={() => setForm((p) => ({ ...p, amountReceived: outstanding }))}>
                      Pay Full
                    </Button>
                  )}
                </div>
                {selectedInvoice && (
                  <p className="text-xs text-muted-foreground">
                    Max partial/full: {formatCurrency(outstanding, selectedInvoice.currency)}
                    {willBePartial && form.amountReceived > 0 && ' — partial payment'}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Exchange Rate (to PKR)</Label>
                <Input type="number" value={form.exchangeRate} onChange={(e) => setForm((p) => ({ ...p, exchangeRate: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Reconciliation</Label>
                <Select value={form.reconciliationStatus} onValueChange={(v) => setForm((p) => ({ ...p, reconciliationStatus: v as ReconciliationStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Matched">Matched</SelectItem>
                    <SelectItem value="Unmatched">Unmatched</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Notes</Label>
                <Input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="e.g. Installment 2" />
              </div>
            </div>

            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="space-y-2 p-4 text-sm">
                <div className="flex justify-between"><span>Gross (PKR)</span><span>{formatCurrency(gross)}</span></div>
                <div className="flex justify-between text-amber-700"><span>1% WHT</span><span>- {formatCurrency(wht)}</span></div>
                <div className="flex justify-between border-t pt-2 font-bold"><span>Net (PKR)</span><span>{formatCurrency(net)}</span></div>
              </CardContent>
            </Card>

            {selectedInvoice && paymentHistory.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <History className="h-4 w-4" /> Previous payments on this invoice
                </div>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Receipt</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Type</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentHistory.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-mono text-xs">{r.receiptNo}</TableCell>
                          <TableCell>{r.receiptDate}</TableCell>
                          <TableCell>{formatCurrency(r.amountReceived, r.currency)}</TableCell>
                          <TableCell><StatusPill status={r.isPartial ? 'Partial' : 'Fully Received'} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleSave} loading={submitting}>
                {isEdit ? 'Save Changes' : 'Save Receipt'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
