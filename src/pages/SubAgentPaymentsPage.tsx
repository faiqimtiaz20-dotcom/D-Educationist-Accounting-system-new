import { useMemo, useState } from 'react'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { MetricCard } from '@/components/shared/MetricCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { bankAccounts as mockBankAccounts, getBranchName } from '@/data'
import { useBranchFilter } from '@/hooks/useBranchFilter'
import { usePayablesApiSync } from '@/hooks/usePayablesApiSync'
import { formatCurrency, subAgentPayable } from '@/lib/calculations'
import {
  createPayment as apiCreatePayment,
  deletePayment as apiDeletePayment,
} from '@/lib/payables-api'
import { useDataStore } from '@/store/data-store'
import type { SubAgentPayment } from '@/types'
import { Eye, Pencil, Plus, Receipt, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

const emptyPayment = {
  commissionId: '',
  subAgentId: '',
  chequeNo: '',
  bankAccountId: '',
  amountPKR: 0,
  paymentDate: new Date().toISOString().slice(0, 10),
}

export default function SubAgentPaymentsPage() {
  const { api, reload, banks } = usePayablesApiSync()
  const subAgentCommissions = useDataStore((s) => s.subAgentCommissions)
  const subAgentPayments = useDataStore((s) => s.subAgentPayments)
  const subAgents = useDataStore((s) => s.subAgents)
  const invoices = useDataStore((s) => s.invoices)
  const students = useDataStore((s) => s.students)
  const addSubAgentPayment = useDataStore((s) => s.addSubAgentPayment)
  const updateSubAgentPayment = useDataStore((s) => s.updateSubAgentPayment)
  const deleteSubAgentPayment = useDataStore((s) => s.deleteSubAgentPayment)

  const bankAccounts = api
    ? banks.map((b) => ({ id: b.id, name: b.name, currency: b.currencyCode }))
    : mockBankAccounts

  const getStudent = (id: string) => students.find((s) => s.id === id)
  const getSubAgent = (id: string) => subAgents.find((a) => a.id === id)

  const filteredCommissions = useBranchFilter(subAgentCommissions)
  const commissionIds = new Set(filteredCommissions.map((c) => c.id))
  const filtered = subAgentPayments.filter((p) => commissionIds.has(p.commissionId))

  const [voucher, setVoucher] = useState<SubAgentPayment | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyPayment)

  const outstandingFor = (commissionId: string, excludeId?: string) => {
    const commission = filteredCommissions.find((c) => c.id === commissionId)
    if (!commission) return 0
    const payable = subAgentPayable(commission.grossFee, commission.rateGiven, commission.exchangeRate, commission.followOnBonus)
    const paid = subAgentPayments
      .filter((p) => p.commissionId === commissionId && p.id !== excludeId)
      .reduce((sum, p) => sum + p.amountPKR, 0)
    return Math.max(0, payable - paid)
  }

  const payableCommissions = filteredCommissions.filter((c) => outstandingFor(c.id) > 0.001)

  const selectableCommissions = useMemo(() => {
    const list = [...payableCommissions]
    if (isEdit && form.commissionId && !list.some((c) => c.id === form.commissionId)) {
      const current = filteredCommissions.find((c) => c.id === form.commissionId)
      if (current) list.push(current)
    }
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payableCommissions, isEdit, form.commissionId, filteredCommissions])

  const openCreate = () => {
    setIsEdit(false)
    setEditId(null)
    setForm(emptyPayment)
    setDialogOpen(true)
  }

  const openEdit = (row: SubAgentPayment) => {
    if (api) {
      toast.error('Posted payments cannot be edited (reversal comes in M8)')
      return
    }
    setIsEdit(true)
    setEditId(row.id)
    setForm({
      commissionId: row.commissionId,
      subAgentId: row.subAgentId,
      chequeNo: row.chequeNo,
      bankAccountId: row.bankAccountId,
      amountPKR: row.amountPKR,
      paymentDate: row.paymentDate,
    })
    setDialogOpen(true)
  }

  const loadCommission = (commissionId: string) => {
    const commission = filteredCommissions.find((c) => c.id === commissionId)
    setForm((p) => ({
      ...p,
      commissionId,
      subAgentId: commission?.subAgentId ?? '',
      amountPKR: outstandingFor(commissionId, isEdit ? editId ?? undefined : undefined),
    }))
  }

  const handleSave = () => {
    if (!form.commissionId || !form.bankAccountId || !form.chequeNo.trim()) {
      toast.error('Commission, cheque no, and paying bank are required')
      return
    }
    if (form.amountPKR <= 0) {
      toast.error('Amount must be greater than zero')
      return
    }
    const outstanding = outstandingFor(form.commissionId, isEdit ? editId ?? undefined : undefined)
    if (form.amountPKR > outstanding + 0.001) {
      toast.error(`Amount exceeds outstanding ${formatCurrency(outstanding)}`)
      return
    }
    const payload = {
      commissionId: form.commissionId,
      subAgentId: form.subAgentId,
      chequeNo: form.chequeNo.trim(),
      bankAccountId: form.bankAccountId,
      amountPKR: form.amountPKR,
      paymentDate: form.paymentDate,
      currency: 'PKR' as const,
    }

    if (isEdit && editId) {
      updateSubAgentPayment(editId, payload)
      toast.success('Payment updated')
      setDialogOpen(false)
      return
    }

    void (async () => {
      try {
        if (api) {
          await apiCreatePayment({
            commissionId: payload.commissionId,
            bankAccountId: payload.bankAccountId,
            amountPkr: payload.amountPKR,
            paymentDate: payload.paymentDate,
            chequeNo: payload.chequeNo,
            currencyCode: 'PKR',
          })
          await reload()
        } else {
          addSubAgentPayment(payload)
        }
        toast.success('Payment recorded')
        setDialogOpen(false)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Save failed')
      }
    })()
  }

  const handleDelete = async (row: SubAgentPayment) => {
    if (!confirm('Delete this payment?')) return
    try {
      if (api) {
        await apiDeletePayment(row.id)
        await reload()
      } else {
        deleteSubAgentPayment(row.id)
      }
      toast.success('Payment deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const totalPaid = filtered.reduce((sum, p) => sum + p.amountPKR, 0)
  const selectedOutstanding = form.commissionId ? outstandingFor(form.commissionId, isEdit ? editId ?? undefined : undefined) : 0

  const columns: Column<SubAgentPayment>[] = [
    {
      key: 'paymentNo',
      header: 'Voucher No.',
      cell: (r) => <span className="font-medium">{r.paymentNo || '—'}</span>,
    },
    {
      key: 'date',
      header: 'Payment Date',
      cell: (r) => new Date(r.paymentDate).toLocaleDateString('en-PK'),
    },
    {
      key: 'subAgent',
      header: 'Sub-Agent',
      cell: (r) => getSubAgent(r.subAgentId)?.name ?? r.subAgentId,
    },
    {
      key: 'student',
      header: 'Student',
      cell: (r) => {
        const commission = subAgentCommissions.find((c) => c.id === r.commissionId)
        const student = commission ? getStudent(commission.studentId) : undefined
        return student?.name ?? '—'
      },
    },
    { key: 'chequeNo', header: 'Cheque No.', cell: (r) => r.chequeNo },
    {
      key: 'bank',
      header: 'Paying Bank',
      cell: (r) => bankAccounts.find((b) => b.id === r.bankAccountId)?.name ?? r.bankAccountId,
    },
    {
      key: 'amount',
      header: 'Amount (PKR)',
      cell: (r) => <span className="font-semibold">{formatCurrency(r.amountPKR)}</span>,
      className: 'text-right',
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (r) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setVoucher(r)} title="View voucher">
            <Eye className="h-4 w-4" />
          </Button>
          {!api && (
            <Button variant="ghost" size="icon" onClick={() => openEdit(r)} title="Edit">
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void handleDelete(r)}
            title="Delete"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  const commission = voucher
    ? subAgentCommissions.find((c) => c.id === voucher.commissionId)
    : undefined
  const agent = voucher ? getSubAgent(voucher.subAgentId) : undefined
  const student = commission ? getStudent(commission.studentId) : undefined
  const invoice = commission ? invoices.find((i) => i.id === commission.invoiceId) : undefined
  const bank = voucher ? bankAccounts.find((b) => b.id === voucher.bankAccountId) : undefined

  return (
    <div>
      <PageHeader
        title="Sub-Agent Payments"
        subtitle="Payment vouchers and disbursement history"
        actionLabel="Record Payment"
        onAction={openCreate}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <MetricCard title="Total Disbursed" value={formatCurrency(totalPaid)} icon={Receipt} accent="green" />
        <MetricCard title="Payment Vouchers" value={filtered.length} icon={Receipt} accent="blue" />
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        searchPlaceholder="Search by sub-agent or cheque no..."
        searchFilter={(row, q) => {
          const agentName = getSubAgent(row.subAgentId)?.name.toLowerCase() ?? ''
          return agentName.includes(q) || row.chequeNo.toLowerCase().includes(q)
        }}
        filters={[
          { key: 'subAgent', label: 'Sub-Agent', type: 'select', options: subAgents.map((a) => ({ label: a.name, value: a.id })), accessor: (r) => r.subAgentId },
          { key: 'bank', label: 'Paying Bank', type: 'select', options: bankAccounts.map((b) => ({ label: b.name, value: b.id })), accessor: (r) => r.bankAccountId },
          { key: 'date', label: 'Payment Date', type: 'dateRange', accessor: (r) => r.paymentDate },
          { key: 'amount', label: 'Amount (PKR)', type: 'numberRange', accessor: (r) => r.amountPKR },
        ]}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" /> {isEdit ? 'Edit Payment' : 'Record Payment'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Commission</Label>
              <Select value={form.commissionId} onValueChange={loadCommission}>
                <SelectTrigger><SelectValue placeholder="Select commission" /></SelectTrigger>
                <SelectContent>
                  {selectableCommissions.length === 0 ? (
                    <SelectItem value="none" disabled>No outstanding commissions</SelectItem>
                  ) : (
                    selectableCommissions.map((c) => {
                      const student = getStudent(c.studentId)
                      return (
                        <SelectItem key={c.id} value={c.id}>
                          {getSubAgent(c.subAgentId)?.name ?? c.subAgentId} — {student?.name ?? c.studentId} (Outstanding: {formatCurrency(outstandingFor(c.id))})
                        </SelectItem>
                      )
                    })
                  )}
                </SelectContent>
              </Select>
            </div>

            {form.commissionId && (
              <Card className="bg-muted/30">
                <CardContent className="grid grid-cols-1 gap-3 p-4 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-muted-foreground">Sub-Agent</p>
                    <p className="font-medium">{getSubAgent(form.subAgentId)?.name ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Outstanding</p>
                    <p className="font-semibold text-amber-600">{formatCurrency(selectedOutstanding)}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Cheque No.</Label>
                <Input value={form.chequeNo} onChange={(e) => setForm((p) => ({ ...p, chequeNo: e.target.value }))} placeholder="e.g. CHQ-4526" />
              </div>
              <div className="space-y-2">
                <Label>Paying Bank</Label>
                <Select value={form.bankAccountId} onValueChange={(v) => setForm((p) => ({ ...p, bankAccountId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select bank" /></SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name} ({b.currency})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Payment Date</Label>
                <Input type="date" value={form.paymentDate} onChange={(e) => setForm((p) => ({ ...p, paymentDate: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Amount (PKR)</Label>
                <div className="flex gap-2">
                  <Input type="number" min={0} step="0.01" value={form.amountPKR || ''} onChange={(e) => setForm((p) => ({ ...p, amountPKR: Number(e.target.value) }))} />
                  {selectedOutstanding > 0 && (
                    <Button type="button" variant="outline" onClick={() => setForm((p) => ({ ...p, amountPKR: selectedOutstanding }))}>
                      Full
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}>{isEdit ? 'Save Changes' : 'Save Payment'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!voucher} onOpenChange={(open) => !open && setVoucher(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payment Voucher</DialogTitle>
          </DialogHeader>
          {voucher && (
            <div className="space-y-4 text-sm">
              <div className="rounded-lg border bg-muted/30 p-4 text-center">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Payment Voucher</p>
                <p className="mt-1 text-lg font-bold">{voucher.chequeNo}</p>
                <p className="text-muted-foreground">{new Date(voucher.paymentDate).toLocaleDateString('en-PK', { dateStyle: 'long' })}</p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground">Payee</p>
                  <p className="font-medium">{agent?.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">NTN</p>
                  <p className="font-medium">{agent?.ntn}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Student</p>
                  <p className="font-medium">{student?.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Invoice</p>
                  <p className="font-medium">{invoice?.invoiceNo}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Branch</p>
                  <p className="font-medium">{commission ? getBranchName(commission.branchId) : '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Bank</p>
                  <p className="font-medium">{bank?.name}</p>
                </div>
              </div>

              <Separator />

              {commission && (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gross Commission (PKR)</span>
                    <span>{formatCurrency(commission.grossFee * (commission.rateGiven / 100) * commission.exchangeRate + commission.followOnBonus)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">WHT @ 1%</span>
                    <span>{formatCurrency((commission.grossFee * (commission.rateGiven / 100) * commission.exchangeRate + commission.followOnBonus) * 0.01)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Net Payable</span>
                    <span>{formatCurrency(subAgentPayable(commission.grossFee, commission.rateGiven, commission.exchangeRate, commission.followOnBonus))}</span>
                  </div>
                </div>
              )}

              <Separator />

              <div className="flex justify-between text-base font-bold">
                <span>Amount Paid</span>
                <span>{formatCurrency(voucher.amountPKR)}</span>
              </div>

              <div className="rounded-lg border p-3 text-xs text-muted-foreground">
                <p>Account: {agent?.accountTitle}</p>
                <p>IBAN: {agent?.iban}</p>
                <p>A/c No: {agent?.accountNo}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
