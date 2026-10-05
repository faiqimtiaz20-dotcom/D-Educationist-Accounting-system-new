import { useMemo, useState } from 'react'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageDataSkeleton } from '@/components/shared/PageDataSkeleton'
import { MetricCard } from '@/components/shared/MetricCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { RowActions } from '@/components/shared/RowActions'
import { StatusPill } from '@/components/shared/StatusPill'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getBranchName } from '@/lib/org'
import { useBranchFilter } from '@/hooks/useBranchFilter'
import { usePayablesApiSync } from '@/hooks/usePayablesApiSync'
import { calcWHT, formatCurrency, subAgentPayable } from '@/lib/calculations'
import { branchFilterOptions, currencyFilterOptions } from '@/lib/filter-options'
import {
  createCommission as apiCreateCommission,
  deleteCommission as apiDeleteCommission,
  updateCommission as apiUpdateCommission,
} from '@/lib/payables-api'
import { useDataStore } from '@/store/data-store'
import type { Currency, SubAgentCommission } from '@/types'
import { HandCoins, Plus, Wallet } from 'lucide-react'
import { toast } from 'sonner'

function commissionGrossPKR(c: SubAgentCommission): number {
  return c.grossFee * (c.rateGiven / 100) * c.exchangeRate + c.followOnBonus
}

const emptyCommission = {
  subAgentId: '',
  invoiceId: '',
  studentId: '',
  branchId: '',
  grossFee: 0,
  rateGiven: 0,
  exchangeRate: 355,
  followOnBonus: 0,
  currency: 'GBP' as Currency,
  status: 'Pending' as SubAgentCommission['status'],
}

export default function SubAgentCommissionsPage() {
  const { api, reload, loading } = usePayablesApiSync()
  const subAgentCommissions = useDataStore((s) => s.subAgentCommissions)
  const subAgents = useDataStore((s) => s.subAgents)
  const addSubAgentCommission = useDataStore((s) => s.addSubAgentCommission)
  const updateSubAgentCommission = useDataStore((s) => s.updateSubAgentCommission)
  const deleteSubAgentCommission = useDataStore((s) => s.deleteSubAgentCommission)
  const invoices = useDataStore((s) => s.invoices)
  const students = useDataStore((s) => s.students)

  const getStudent = (id: string) => students.find((s) => s.id === id)
  const getSubAgent = (id: string) => subAgents.find((a) => a.id === id)

  const filtered = useBranchFilter(subAgentCommissions)
  const branchInvoices = useBranchFilter(invoices)
  const [statusFilter, setStatusFilter] = useState('all')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyCommission)

  const netPreview = subAgentPayable(form.grossFee, form.rateGiven, form.exchangeRate, form.followOnBonus)

  const openCreate = () => {
    setIsEdit(false)
    setEditId(null)
    setForm(emptyCommission)
    setDialogOpen(true)
  }

  const openEdit = (row: SubAgentCommission) => {
    setIsEdit(true)
    setEditId(row.id)
    setForm({
      subAgentId: row.subAgentId,
      invoiceId: row.invoiceId,
      studentId: row.studentId,
      branchId: row.branchId,
      grossFee: row.grossFee,
      rateGiven: row.rateGiven,
      exchangeRate: row.exchangeRate,
      followOnBonus: row.followOnBonus,
      currency: row.currency,
      status: row.status,
    })
    setDialogOpen(true)
  }

  const handleDelete = async (row: SubAgentCommission) => {
    if (!confirm('Delete this commission record?')) return
    try {
      if (api) {
        await apiDeleteCommission(row.id)
        await reload()
      } else {
        deleteSubAgentCommission(row.id)
      }
      toast.success('Commission deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const loadInvoice = (invoiceId: string) => {
    const invoice = invoices.find((i) => i.id === invoiceId)
    if (!invoice) {
      setForm((p) => ({ ...p, invoiceId }))
      return
    }
    const firstLine = invoice.lines?.[0]
    setForm((p) => ({
      ...p,
      invoiceId,
      studentId: firstLine?.studentId ?? '',
      branchId: invoice.branchId,
      currency: invoice.currency,
      grossFee: firstLine?.tuitionFee ?? 0,
    }))
  }

  const handleSave = () => {
    if (!form.subAgentId || !form.invoiceId) {
      toast.error('Sub-agent and invoice are required')
      return
    }
    if (form.grossFee <= 0 || form.rateGiven <= 0 || form.exchangeRate <= 0) {
      toast.error('Gross fee, rate, and exchange rate must be greater than zero')
      return
    }

    const payload = {
      subAgentId: form.subAgentId,
      invoiceId: form.invoiceId,
      studentId: form.studentId,
      branchId: form.branchId,
      grossFee: form.grossFee,
      rateGiven: form.rateGiven,
      exchangeRate: form.exchangeRate,
      followOnBonus: form.followOnBonus,
      currency: form.currency,
      status: form.status,
    }

    if (isEdit && editId) {
      void (async () => {
        try {
          if (api) {
            await apiUpdateCommission(editId, {
              grossFee: payload.grossFee,
              rateGiven: payload.rateGiven,
              exchangeRate: payload.exchangeRate,
              followOnBonus: payload.followOnBonus,
              currencyCode: payload.currency,
              status: payload.status,
            })
            await reload()
          } else {
            updateSubAgentCommission(editId, payload)
          }
          toast.success('Commission updated')
          setDialogOpen(false)
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Save failed')
        }
      })()
    } else {
      void (async () => {
        try {
          if (api) {
            await apiCreateCommission({
              subAgentId: payload.subAgentId,
              studentId: payload.studentId,
              invoiceId: payload.invoiceId,
              branchId: payload.branchId,
              grossFee: payload.grossFee,
              rateGiven: payload.rateGiven,
              exchangeRate: payload.exchangeRate,
              followOnBonus: payload.followOnBonus,
              currencyCode: payload.currency,
              status: payload.status,
            })
            await reload()
          } else {
            addSubAgentCommission(payload)
          }
          toast.success('Commission created')
          setDialogOpen(false)
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Save failed')
        }
      })()
    }
  }

  const statusPills = useMemo(() => [
    { label: 'All', value: 'all', count: filtered.length },
    { label: 'Pending', value: 'Pending', count: filtered.filter((c) => c.status === 'Pending').length },
    { label: 'Partial', value: 'Partial', count: filtered.filter((c) => c.status === 'Partial').length },
    { label: 'Paid', value: 'Paid', count: filtered.filter((c) => c.status === 'Paid').length },
  ], [filtered])

  const displayed = statusFilter === 'all'
    ? filtered
    : filtered.filter((c) => c.status === statusFilter)

  const totalPayable = filtered
    .filter((c) => c.status !== 'Paid')
    .reduce((sum, c) => sum + subAgentPayable(c.grossFee, c.rateGiven, c.exchangeRate, c.followOnBonus), 0)

  const totalWHT = filtered.reduce((sum, c) => sum + calcWHT(commissionGrossPKR(c)), 0)

  const columns: Column<SubAgentCommission>[] = [
    {
      key: 'commissionNo',
      header: 'Commission ID',
      cell: (r) => <span className="font-medium">{r.commissionNo || '—'}</span>,
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
        const s = getStudent(r.studentId)
        return s ? `${s.name} (${s.studentId})` : r.studentId
      },
    },
    {
      key: 'invoice',
      header: 'Invoice',
      cell: (r) => invoices.find((i) => i.id === r.invoiceId)?.invoiceNo ?? r.invoiceId,
    },
    { key: 'branch', header: 'Branch', cell: (r) => r.branchName || getBranchName(r.branchId) },
    {
      key: 'grossFee',
      header: 'Gross Fee',
      cell: (r) => formatCurrency(r.grossFee, r.currency),
      className: 'text-right',
    },
    {
      key: 'rate',
      header: 'Rate %',
      cell: (r) => `${r.rateGiven}%`,
      className: 'text-right',
    },
    {
      key: 'exchangeRate',
      header: 'Ex. Rate',
      cell: (r) => r.exchangeRate.toFixed(2),
      className: 'text-right',
    },
    {
      key: 'bonus',
      header: 'Bonus',
      cell: (r) => r.followOnBonus > 0 ? formatCurrency(r.followOnBonus) : '—',
      className: 'text-right',
    },
    {
      key: 'wht',
      header: 'WHT (1%)',
      cell: (r) => formatCurrency(calcWHT(commissionGrossPKR(r))),
      className: 'text-right text-muted-foreground',
    },
    {
      key: 'netPayable',
      header: 'Net Payable',
      cell: (r) => (
        <span className="font-semibold">
          {formatCurrency(subAgentPayable(r.grossFee, r.rateGiven, r.exchangeRate, r.followOnBonus))}
        </span>
      ),
      className: 'text-right',
    },
    { key: 'status', header: 'Status', cell: (r) => <StatusPill status={r.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      cell: (r) => <RowActions onEdit={() => openEdit(r)} onDelete={() => handleDelete(r)} />,
    },
  ]

  if (api && loading) return <PageDataSkeleton />

  return (
    <div>
      <PageHeader
        title="Sub-Agent Commission Sheet"
        subtitle="Per-student commission splits with WHT deduction"
        actionLabel="Create Commission"
        onAction={openCreate}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard title="Outstanding Payable" value={formatCurrency(totalPayable)} icon={Wallet} accent="orange" />
        <MetricCard title="Total WHT (1%)" value={formatCurrency(totalWHT)} icon={HandCoins} accent="purple" />
        <MetricCard title="Commission Records" value={filtered.length} icon={HandCoins} accent="blue" />
      </div>

      <DataTable
        data={displayed}
        columns={columns}
        searchPlaceholder="Search by sub-agent or student..."
        searchFilter={(row, q) => {
          const agent = getSubAgent(row.subAgentId)?.name.toLowerCase() ?? ''
          const student = getStudent(row.studentId)?.name.toLowerCase() ?? ''
          return agent.includes(q) || student.includes(q)
        }}
        filters={[
          { key: 'branch', label: 'Branch', type: 'select', options: branchFilterOptions, accessor: (r) => r.branchId },
          { key: 'subAgent', label: 'Sub-Agent', type: 'select', options: subAgents.map((a) => ({ label: a.name, value: a.id })), accessor: (r) => r.subAgentId },
          { key: 'currency', label: 'Currency', type: 'select', options: currencyFilterOptions, accessor: (r) => r.currency },
          { key: 'netPayable', label: 'Net Payable', type: 'numberRange', accessor: (r) => subAgentPayable(r.grossFee, r.rateGiven, r.exchangeRate, r.followOnBonus) },
        ]}
        statusPills={statusPills}
        activeStatus={statusFilter}
        onStatusChange={setStatusFilter}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" /> {isEdit ? 'Edit Commission' : 'Create Commission'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Sub-Agent</Label>
                <Select value={form.subAgentId} onValueChange={(v) => setForm((p) => ({ ...p, subAgentId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select sub-agent" /></SelectTrigger>
                  <SelectContent>
                    {subAgents.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Invoice</Label>
                <Select value={form.invoiceId} onValueChange={loadInvoice}>
                  <SelectTrigger><SelectValue placeholder="Select invoice" /></SelectTrigger>
                  <SelectContent>
                    {branchInvoices.map((i) => {
                      const first = i.lines?.[0]
                      const name = first ? getStudent(first.studentId)?.name ?? first.studentId : '—'
                      const suffix = (i.lines?.length ?? 0) > 1 ? ` +${i.lines.length - 1}` : ''
                      return (
                        <SelectItem key={i.id} value={i.id}>
                          {i.invoiceNo} — {name}{suffix}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Card className="bg-muted/30">
              <CardContent className="grid grid-cols-1 gap-3 p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                  <p className="text-muted-foreground">Student</p>
                  {(() => {
                    const inv = invoices.find((i) => i.id === form.invoiceId)
                    const lines = inv?.lines ?? []
                    if (lines.length > 1) {
                      return (
                        <Select
                          value={form.studentId}
                          onValueChange={(v) => {
                            const line = lines.find((l) => l.studentId === v)
                            setForm((p) => ({
                              ...p,
                              studentId: v,
                              grossFee: line?.tuitionFee ?? p.grossFee,
                            }))
                          }}
                        >
                          <SelectTrigger><SelectValue placeholder="Select student on invoice" /></SelectTrigger>
                          <SelectContent>
                            {lines.map((l) => (
                              <SelectItem key={l.id} value={l.studentId}>
                                {getStudent(l.studentId)?.name ?? l.studentId}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )
                    }
                    return (
                      <p className="font-medium">{form.studentId ? getStudent(form.studentId)?.name ?? '—' : '—'}</p>
                    )
                  })()}
                </div>
                <div>
                  <p className="text-muted-foreground">Branch</p>
                  <p className="font-medium">{form.branchId ? getBranchName(form.branchId) : '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Currency</p>
                  <p className="font-medium">{form.currency}</p>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Gross Fee ({form.currency})</Label>
                <Input type="number" min={0} step="0.01" value={form.grossFee || ''} onChange={(e) => setForm((p) => ({ ...p, grossFee: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Rate Given (%)</Label>
                <Input type="number" min={0} max={100} value={form.rateGiven || ''} onChange={(e) => setForm((p) => ({ ...p, rateGiven: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Exchange Rate (to PKR)</Label>
                <Input type="number" min={0} step="0.01" value={form.exchangeRate || ''} onChange={(e) => setForm((p) => ({ ...p, exchangeRate: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Follow-on Bonus (PKR)</Label>
                <Input type="number" min={0} step="0.01" value={form.followOnBonus || ''} onChange={(e) => setForm((p) => ({ ...p, followOnBonus: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={form.currency} onValueChange={(v) => setForm((p) => ({ ...p, currency: v as Currency }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {currencyFilterOptions.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v as SubAgentCommission['status'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Partial">Partial</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="space-y-2 p-4 text-sm">
                <div className="flex justify-between"><span>Gross Commission (PKR)</span><span>{formatCurrency(commissionGrossPKR({ ...form } as SubAgentCommission))}</span></div>
                <div className="flex justify-between text-amber-700"><span>1% WHT</span><span>- {formatCurrency(calcWHT(commissionGrossPKR({ ...form } as SubAgentCommission)))}</span></div>
                <div className="flex justify-between border-t pt-2 font-bold"><span>Net Payable (PKR)</span><span>{formatCurrency(netPreview)}</span></div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}>{isEdit ? 'Save Changes' : 'Create Commission'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
