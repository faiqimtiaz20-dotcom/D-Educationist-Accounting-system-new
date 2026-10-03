import { PageHeader } from '@/components/shared/PageHeader'
import { StatusPill } from '@/components/shared/StatusPill'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { bankAccounts as mockBankAccounts } from '@/data'
import { useBranchFilter } from '@/hooks/useBranchFilter'
import { useModulePermission } from '@/hooks/usePermission'
import { useRevenueApiSync } from '@/hooks/useRevenueApiSync'
import { calcWHT, formatCurrency, grossPKR, netPKR } from '@/lib/calculations'
import { useDataStore } from '@/store/data-store'
import { allocateReceivable } from '@/lib/revenue-api'
import { ArrowRightLeft, CheckCircle2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

export default function AllocationPage() {
  const { api, reload, banks } = useRevenueApiSync()
  const receivables = useDataStore((s) => s.receivables)
  const invoices = useDataStore((s) => s.invoices)
  const students = useDataStore((s) => s.students)
  const receivableAllocations = useDataStore((s) => s.receivableAllocations)
  const confirmBulkAllocation = useDataStore((s) => s.confirmBulkAllocation)
  const { canWrite } = useModulePermission('Invoices & Receivables')
  const bankAccounts = api ? banks : mockBankAccounts

  const bulkReceivables = receivables.filter(
    (r) => r.isBulkRemittance && r.allocationStatus !== 'allocated'
  )
  const [selectedReceivableId, setSelectedReceivableId] = useState(bulkReceivables[0]?.id ?? '')

  const bulkReceivable = receivables.find((r) => r.id === selectedReceivableId)
  const branchInvoices = useBranchFilter(invoices)

  const existingAllocations = useMemo(
    () => receivableAllocations.filter((a) => a.receivableId === selectedReceivableId),
    [receivableAllocations, selectedReceivableId]
  )

  const [allocations, setAllocations] = useState<{ invoiceId: string; allocatedAmount: number }[]>([])

  const initAllocations = useMemo(() => {
    if (!bulkReceivable) return []
    if (existingAllocations.length > 0) {
      return existingAllocations.map((a) => ({
        invoiceId: a.invoiceId,
        allocatedAmount: a.allocatedAmount,
      }))
    }
    return branchInvoices.slice(0, 3).map((inv) => ({
      invoiceId: inv.id,
      allocatedAmount: 0,
    }))
  }, [bulkReceivable?.id, existingAllocations, branchInvoices])

  const activeAllocations = allocations.length > 0 ? allocations : initAllocations

  const totalAllocated = activeAllocations.reduce((sum, a) => sum + a.allocatedAmount, 0)
  const remaining = (bulkReceivable?.amountReceived ?? 0) - totalAllocated

  const bank = bulkReceivable ? bankAccounts.find((b) => b.id === bulkReceivable.bankAccountId) : null
  const grossTotal = bulkReceivable ? grossPKR(bulkReceivable.amountReceived, bulkReceivable.exchangeRate) : 0
  const whtTotal = calcWHT(grossTotal)
  const netTotal = netPKR(grossTotal)

  const allocationRows = useMemo(
    () =>
      activeAllocations.map((alloc) => {
        const invoice = invoices.find((i) => i.id === alloc.invoiceId)
        const student = invoice
          ? students.find((s) => s.id === invoice.lines?.[0]?.studentId) ?? null
          : null
        const studentLabel = invoice
          ? (invoice.lines.length > 1
            ? `${student?.name ?? '—'} +${invoice.lines.length - 1}`
            : student?.name ?? '—')
          : '—'
        return { ...alloc, invoice, student, studentLabel }
      }),
    [activeAllocations, invoices, students]
  )

  const updateAllocation = (index: number, amount: number) => {
    const base = allocations.length > 0 ? allocations : initAllocations
    setAllocations(base.map((a, i) => (i === index ? { ...a, allocatedAmount: amount } : a)))
  }

  const handleConfirm = () => {
    if (!bulkReceivable || !canWrite) return
    if (Math.abs(remaining) > 0.001) {
      toast.error('Allocated total must equal remittance amount')
      return
    }
    void (async () => {
      try {
        if (api) {
          await allocateReceivable(
            bulkReceivable.id,
            activeAllocations.filter((a) => a.allocatedAmount > 0),
          )
          await reload()
          toast.success('Bulk allocation confirmed — invoice receipts created')
          setAllocations([])
        } else {
          const ok = confirmBulkAllocation(bulkReceivable.id, activeAllocations)
          if (ok) {
            toast.success('Bulk allocation confirmed — invoice receipts created')
            setAllocations([])
            setSelectedReceivableId(bulkReceivables.find((r) => r.id !== bulkReceivable.id)?.id ?? '')
          } else {
            toast.error('Allocation failed — check amounts and try again')
          }
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Allocation failed')
      }
    })()
  }

  if (bulkReceivables.length === 0) {
    return (
      <div>
        <PageHeader title="Bulk Remittance Allocation" subtitle="Split university payments across invoices" backTo="/receivables" />
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No pending bulk remittances. Record a bulk university payment from Receivables with the bulk remittance flag.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bulk Remittance Allocation"
        subtitle="Split one university payment across multiple student invoices"
        backTo="/receivables"
      />

      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label>Select Bulk Remittance</Label>
            <Select value={selectedReceivableId} onValueChange={(v) => { setSelectedReceivableId(v); setAllocations([]) }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {bulkReceivables.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.receiptNo} — {formatCurrency(r.amountReceived, r.currency)} ({r.receiptDate})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {bulkReceivable && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ArrowRightLeft className="h-5 w-5" />
                Remittance {bulkReceivable.receiptNo}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div><p className="text-sm text-muted-foreground">Receipt Date</p><p className="font-medium">{bulkReceivable.receiptDate}</p></div>
                <div><p className="text-sm text-muted-foreground">Bank Account</p><p className="font-medium">{bank?.name ?? bulkReceivable.bankAccountId}</p></div>
                <div><p className="text-sm text-muted-foreground">Total Received</p><p className="font-medium">{formatCurrency(bulkReceivable.amountReceived, bulkReceivable.currency)}</p></div>
                <div><p className="text-sm text-muted-foreground">Exchange Rate</p><p className="font-medium">{bulkReceivable.exchangeRate}</p></div>
                <div><p className="text-sm text-muted-foreground">Gross (PKR)</p><p className="font-medium">{formatCurrency(grossTotal)}</p></div>
                <div><p className="text-sm text-muted-foreground">WHT</p><p className="font-medium">{formatCurrency(whtTotal)}</p></div>
                <div><p className="text-sm text-muted-foreground">Net (PKR)</p><p className="font-medium">{formatCurrency(netTotal)}</p></div>
                <div><p className="text-sm text-muted-foreground">Reconciliation</p><StatusPill status={bulkReceivable.reconciliationStatus} /></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Allocate to Invoices</CardTitle>
              <div className="text-sm">
                <span className="text-muted-foreground">Remaining: </span>
                <span className={Math.abs(remaining) < 0.001 ? 'font-bold text-emerald-600' : 'font-bold text-amber-600'}>
                  {formatCurrency(remaining, bulkReceivable.currency)}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>University</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Allocated ({bulkReceivable.currency})</TableHead>
                      <TableHead className="text-right">Net PKR</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allocationRows.map((row, index) => (
                      <TableRow key={row.invoiceId}>
                        <TableCell className="font-medium">{row.invoice?.invoiceNo}</TableCell>
                        <TableCell>{row.studentLabel}</TableCell>
                        <TableCell>{row.student?.university}</TableCell>
                        <TableCell>{row.invoice && <StatusPill status={row.invoice.status} />}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            className="ml-auto w-32 text-right"
                            value={row.allocatedAmount || ''}
                            disabled={!canWrite}
                            onChange={(e) => updateAllocation(index, Number(e.target.value))}
                          />
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(netPKR(grossPKR(row.allocatedAmount, bulkReceivable.exchangeRate)))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {canWrite && (
                <div className="mt-4 flex justify-end">
                  <Button disabled={Math.abs(remaining) > 0.001} onClick={handleConfirm}>
                    <CheckCircle2 className="mr-1 h-4 w-4" />
                    Confirm Allocation
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
