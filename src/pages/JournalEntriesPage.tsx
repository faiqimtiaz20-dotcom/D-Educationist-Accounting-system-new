import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageDataSkeleton } from '@/components/shared/PageDataSkeleton'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusPill } from '@/components/shared/StatusPill'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { chartOfAccountsTemplate, findAccountName } from '@/lib/coa'
import { useAccountingApiSync } from '@/hooks/useAccountingApiSync'
import { useBranchFilter } from '@/hooks/useBranchFilter'
import { useModulePermission } from '@/hooks/usePermission'
import { useSubmitState } from '@/hooks/useSubmitState'
import { formatCurrency } from '@/lib/calculations'
import { branchFilterOptions } from '@/lib/filter-options'
import {
  approveJournal as apiApprove,
  createJournal as apiCreate,
  reverseJournal as apiReverse,
} from '@/lib/journals-api'
import { cn } from '@/lib/utils'
import { useDataStore } from '@/store/data-store'
import type { JournalEntry, JournalLine } from '@/types'
import { Check, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

const TEMPLATE_CODES = (function flatten(nodes: typeof chartOfAccountsTemplate): { code: string; name: string }[] {
  const result: { code: string; name: string }[] = []
  for (const n of nodes) {
    if (n.children?.length) result.push(...flatten(n.children))
    else result.push({ code: n.code, name: n.name })
  }
  return result
})(chartOfAccountsTemplate)

const emptyLine = (): JournalLine => ({ accountCode: '', accountName: '', debit: 0, credit: 0 })

export default function JournalEntriesPage() {
  const { api, reload, postableAccounts, loading } = useAccountingApiSync()
  const journalEntries = useDataStore((s) => s.journalEntries)
  const branches = useDataStore((s) => s.branches)
  const addManualJournal = useDataStore((s) => s.addManualJournal)
  const { canWrite } = useModulePermission('Journal Entries')

  const accountOptions = api && postableAccounts.length > 0 ? postableAccounts : TEMPLATE_CODES
  const defaultBranchId = branches.find((b) => b.code === 'HO')?.id
    ?? branches.find((b) => b.code === 'KHI')?.id
    ?? branches[0]?.id
    ?? 'ho'

  const [showForm, setShowForm] = useState(false)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [branchId, setBranchId] = useState(defaultBranchId)
  const [description, setDescription] = useState('')
  const [lines, setLines] = useState<JournalLine[]>([emptyLine(), emptyLine()])
  const { submitting, runSubmit } = useSubmitState()

  const filtered = useBranchFilter(journalEntries)

  const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0)
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0)
  const balanced = totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.01

  const handleApprove = async (row: JournalEntry) => {
    if (!api || row.approvalStatus !== 'Pending') return
    try {
      await apiApprove(row.id)
      await reload()
      toast.success(`Approved ${row.entryNo}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Approve failed')
    }
  }

  const handleReverse = async (row: JournalEntry) => {
    if (!api || row.approvalStatus !== 'Approved' || row.sourceType === 'Reversal') return
    if (!confirm(`Reverse ${row.entryNo}?`)) return
    try {
      await apiReverse(row.id, { reason: `Reversal of ${row.entryNo}` })
      await reload()
      toast.success(`Reversed ${row.entryNo}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reverse failed')
    }
  }

  const columns: Column<JournalEntry>[] = useMemo(() => [
    { key: 'entryNo', header: 'Entry No.', cell: (r) => <span className="font-mono text-sm">{r.entryNo}</span> },
    {
      key: 'source',
      header: 'Source',
      cell: (r) => (
        <Badge variant={r.isAutoPosted ? 'secondary' : 'outline'} className="text-xs">
          {r.isAutoPosted ? r.sourceType ?? 'Auto' : 'Manual'}
        </Badge>
      ),
    },
    { key: 'date', header: 'Date', cell: (r) => r.date },
    {
      key: 'branch',
      header: 'Branch',
      cell: (r) => branches.find((b) => b.id === r.branchId)?.code ?? r.branchId,
    },
    { key: 'description', header: 'Description', cell: (r) => r.description },
    {
      key: 'amount',
      header: 'Amount',
      className: 'text-right',
      cell: (r) => formatCurrency(r.lines.reduce((s, l) => s + l.debit, 0)),
    },
    { key: 'status', header: 'Status', cell: (r) => <StatusPill status={r.approvalStatus} /> },
    ...(api && canWrite
      ? [
          {
            key: 'actions',
            header: 'Actions',
            cell: (r: JournalEntry) => (
              <div className="flex gap-1">
                {r.approvalStatus === 'Pending' && !r.isAutoPosted && (
                  <Button size="sm" variant="outline" onClick={() => void handleApprove(r)}>
                    <Check className="mr-1 h-3 w-3" /> Approve
                  </Button>
                )}
                {r.approvalStatus === 'Approved' && r.sourceType !== 'Reversal' && (
                  <Button size="sm" variant="ghost" onClick={() => void handleReverse(r)}>
                    <RotateCcw className="mr-1 h-3 w-3" /> Reverse
                  </Button>
                )}
              </div>
            ),
          } satisfies Column<JournalEntry>,
        ]
      : []),
  ], [api, canWrite, branches])

  const updateLine = (index: number, field: keyof JournalLine, value: string | number) => {
    setLines((prev) => prev.map((line, i) => {
      if (i !== index) return line
      const updated = { ...line, [field]: value }
      if (field === 'accountCode' && typeof value === 'string') {
        updated.accountName =
          accountOptions.find((a) => a.code === value)?.name ?? findAccountName(value)
      }
      return updated
    }))
  }

  const addLine = () => setLines((prev) => [...prev, emptyLine()])
  const removeLine = (index: number) => {
    if (lines.length <= 2) return
    setLines((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = () => {
    if (!canWrite) return
    if (!description || !balanced) {
      toast.error('Entry must be balanced with a description')
      return
    }
    const payloadLines = lines.filter((l) => l.accountCode && (l.debit > 0 || l.credit > 0))

    void runSubmit(async () => {
      try {
        if (api) {
          await apiCreate({
            branchId,
            entryDate: date,
            description,
            lines: payloadLines.map((l) => ({
              accountCode: l.accountCode,
              debit: l.debit,
              credit: l.credit,
            })),
            approveNow: false,
          })
          await reload()
          toast.success('Journal entry saved — pending approval')
        } else {
          const ok = addManualJournal({
            date,
            branchId,
            description,
            lines: payloadLines,
          })
          if (!ok) {
            toast.error('Could not save journal entry')
            return
          }
          toast.success('Journal entry saved — pending approval')
        }
        setDescription('')
        setLines([emptyLine(), emptyLine()])
        setShowForm(false)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Save failed')
      }
    })
  }

  if (api && loading) return <PageDataSkeleton />

  return (
    <div>
      <PageHeader
        title="Journal Entries"
        subtitle="Auto-posted from transactions plus manual adjustments"
        actionLabel={canWrite ? 'New Entry' : undefined}
        onAction={canWrite ? () => {
          setBranchId(defaultBranchId)
          setShowForm((s) => !s)
        } : undefined}
      />

      {showForm && canWrite && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Create Manual Journal Entry</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Branch</Label>
                <Select value={branchId} onValueChange={setBranchId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-1">
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Entry description" rows={1} />
              </div>
            </div>

            <div className="rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Select
                          value={line.accountCode}
                          onValueChange={(v) => updateLine(i, 'accountCode', v)}
                        >
                          <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                          <SelectContent>
                            {accountOptions.map((a) => (
                              <SelectItem key={a.code} value={a.code}>{a.code} — {a.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input type="number" className="text-right" value={line.debit || ''} onChange={(e) => updateLine(i, 'debit', Number(e.target.value))} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" className="text-right" value={line.credit || ''} onChange={(e) => updateLine(i, 'credit', Number(e.target.value))} />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeLine(i)} disabled={lines.length <= 2}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={addLine}>
                <Plus className="mr-1 h-4 w-4" /> Add Line
              </Button>
              <div className="flex items-center gap-4 text-sm">
                <span>Debit: <strong>{formatCurrency(totalDebit)}</strong></span>
                <span>Credit: <strong>{formatCurrency(totalCredit)}</strong></span>
                <span className={cn('font-medium', balanced ? 'text-emerald-600' : 'text-destructive')}>
                  {balanced ? 'Balanced' : 'Out of balance'}
                </span>
                <Button
                  onClick={handleSubmit}
                  disabled={!balanced || !description}
                  loading={submitting}
                >
                  Save Entry
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <DataTable
        data={filtered}
        columns={columns}
        searchPlaceholder="Search entries..."
        searchFilter={(row, q) =>
          row.entryNo.toLowerCase().includes(q) ||
          row.description.toLowerCase().includes(q)
        }
        filters={[
          { key: 'branch', label: 'Branch', type: 'select', options: branchFilterOptions, accessor: (r) => r.branchId },
          { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'Approved', 'Rejected'].map((s) => ({ label: s, value: s })), accessor: (r) => r.approvalStatus },
          { key: 'source', label: 'Source', type: 'select', options: ['Manual', 'Invoice', 'Receivable', 'Expense', 'PettyCash', 'Payroll', 'Reversal', 'OtherInvoice', 'SubAgentPayment', 'Contra'].map((s) => ({ label: s, value: s })), accessor: (r) => (r.isAutoPosted ? r.sourceType ?? 'Auto' : 'Manual') },
          { key: 'date', label: 'Date', type: 'dateRange', accessor: (r) => r.date },
          { key: 'amount', label: 'Amount', type: 'numberRange', accessor: (r) => r.lines.reduce((s, l) => s + l.debit, 0) },
        ]}
      />
    </div>
  )
}
