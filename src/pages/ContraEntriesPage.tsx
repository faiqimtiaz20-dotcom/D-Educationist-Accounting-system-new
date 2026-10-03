import { useMemo, useState } from 'react'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { contraEntries as mockContra } from '@/data'
import { getBranchName } from '@/lib/org'
import { useBranchFilter } from '@/hooks/useBranchFilter'
import { useCashApiSync } from '@/hooks/useCashApiSync'
import { formatCurrency } from '@/lib/calculations'
import { createContraEntry } from '@/lib/cash-api'
import { branchFilterOptions } from '@/lib/filter-options'
import { useAppStore } from '@/store/app-store'
import { useDataStore } from '@/store/data-store'
import type { ContraEntry } from '@/types'
import { toast } from 'sonner'

const typeVariant: Record<ContraEntry['type'], 'default' | 'secondary' | 'outline'> = {
  'Cash-Bank': 'default',
  'Bank-Bank': 'secondary',
  'Cash-Cash': 'outline',
}

const TYPE_TO_API: Record<ContraEntry['type'], 'CashBank' | 'BankBank' | 'CashCash'> = {
  'Cash-Bank': 'CashBank',
  'Bank-Bank': 'BankBank',
  'Cash-Cash': 'CashCash',
}

export default function ContraEntriesPage() {
  const { api, reload, contra, banks } = useCashApiSync()
  const branches = useDataStore((s) => s.branches)
  const selectedBranchId = useAppStore((s) => s.selectedBranchId)
  const source = api ? contra : mockContra
  const filtered = useBranchFilter(source)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({
    type: 'Cash-Bank' as ContraEntry['type'],
    amount: 0,
    entryDate: new Date().toISOString().slice(0, 10),
    toBankAccountId: '',
    fromBankAccountId: '',
  })

  const defaultBranchId =
    selectedBranchId === 'all'
      ? (branches.find((b) => b.code === 'KHI')?.id ?? branches[0]?.id ?? '')
      : selectedBranchId

  const pkrBanks = banks.filter((b) => b.currency === 'PKR')

  const columns: Column<ContraEntry>[] = useMemo(() => [
    {
      key: 'contraNo',
      header: 'Contra ID',
      cell: (r) => <span className="font-medium">{r.contraNo || '—'}</span>,
    },
    { key: 'date', header: 'Date', cell: (r) => r.date },
    {
      key: 'type',
      header: 'Type',
      cell: (r) => <Badge variant={typeVariant[r.type]}>{r.type}</Badge>,
    },
    { key: 'from', header: 'From Account', cell: (r) => r.fromAccount },
    { key: 'to', header: 'To Account', cell: (r) => r.toAccount },
    {
      key: 'amount',
      header: 'Amount',
      className: 'text-right font-mono',
      cell: (r) => formatCurrency(r.amount),
    },
    { key: 'branch', header: 'Branch', cell: (r) => getBranchName(r.branchId) },
  ], [])

  const handleCreate = () => {
    if (!api) {
      toast.error('Contra create requires API mode')
      return
    }
    if (form.amount <= 0) {
      toast.error('Amount must be greater than zero')
      return
    }
    void (async () => {
      try {
        const contraType = TYPE_TO_API[form.type]
        await createContraEntry({
          branchId: defaultBranchId,
          entryDate: form.entryDate,
          contraType,
          amount: form.amount,
          fromIsCash: form.type === 'Cash-Bank' || form.type === 'Cash-Cash',
          toIsCash: form.type === 'Cash-Cash',
          toBankAccountId:
            form.type === 'Cash-Bank' || form.type === 'Bank-Bank'
              ? form.toBankAccountId || pkrBanks[0]?.id
              : undefined,
          fromBankAccountId:
            form.type === 'Bank-Bank'
              ? form.fromBankAccountId || pkrBanks[1]?.id || pkrBanks[0]?.id
              : undefined,
        })
        await reload()
        toast.success('Contra entry posted')
        setDialogOpen(false)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Create failed')
      }
    })()
  }

  return (
    <div>
      <PageHeader
        title="Contra Entries"
        subtitle="Cash↔Bank, Bank↔Bank, and Cash↔Cash transfers"
        actionLabel={api ? 'New Contra' : undefined}
        onAction={api ? () => setDialogOpen(true) : undefined}
      />
      <DataTable
        data={filtered}
        columns={columns}
        searchPlaceholder="Search contra entries..."
        searchFilter={(row, q) =>
          row.fromAccount.toLowerCase().includes(q) ||
          row.toAccount.toLowerCase().includes(q) ||
          row.type.toLowerCase().includes(q)
        }
        filters={[
          { key: 'branch', label: 'Branch', type: 'select', options: branchFilterOptions, accessor: (r) => r.branchId },
          { key: 'type', label: 'Type', type: 'select', options: ['Cash-Bank', 'Bank-Bank', 'Cash-Cash'].map((t) => ({ label: t, value: t })), accessor: (r) => r.type },
          { key: 'date', label: 'Date', type: 'dateRange', accessor: (r) => r.date },
          { key: 'amount', label: 'Amount', type: 'numberRange', accessor: (r) => r.amount },
        ]}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Contra Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v as ContraEntry['type'] })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash-Bank">Cash-Bank</SelectItem>
                  <SelectItem value="Bank-Bank">Bank-Bank</SelectItem>
                  <SelectItem value="Cash-Cash">Cash-Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={form.entryDate}
                onChange={(e) => setForm({ ...form, entryDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Amount (PKR)</Label>
              <Input
                type="number"
                value={form.amount || ''}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
              />
            </div>
            {(form.type === 'Cash-Bank' || form.type === 'Bank-Bank') && (
              <div className="space-y-2">
                <Label>{form.type === 'Cash-Bank' ? 'To Bank' : 'To Bank'}</Label>
                <Select
                  value={form.toBankAccountId || pkrBanks[0]?.id}
                  onValueChange={(v) => setForm({ ...form, toBankAccountId: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select bank" /></SelectTrigger>
                  <SelectContent>
                    {pkrBanks.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {form.type === 'Bank-Bank' && (
              <div className="space-y-2">
                <Label>From Bank</Label>
                <Select
                  value={form.fromBankAccountId || pkrBanks[1]?.id || pkrBanks[0]?.id}
                  onValueChange={(v) => setForm({ ...form, fromBankAccountId: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select bank" /></SelectTrigger>
                  <SelectContent>
                    {pkrBanks.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate}>Post Contra</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
