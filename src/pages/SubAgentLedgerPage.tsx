import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageDataSkeleton } from '@/components/shared/PageDataSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { MetricCard } from '@/components/shared/MetricCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusPill } from '@/components/shared/StatusPill'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usePayablesApiSync } from '@/hooks/usePayablesApiSync'
import { subAgentPayable, formatCurrency } from '@/lib/calculations'
import { getSubAgentLedger, type ApiLedger } from '@/lib/payables-api'
import { useDataStore } from '@/store/data-store'
import type { LedgerEntry, SubAgentCommission, SubAgentPayment } from '@/types'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

function buildSubAgentLedger(
  subAgentId: string,
  subAgentCommissions: SubAgentCommission[],
  subAgentPayments: SubAgentPayment[]
): LedgerEntry[] {
  const commissions = subAgentCommissions.filter((c) => c.subAgentId === subAgentId)
  const payments = subAgentPayments.filter((p) => p.subAgentId === subAgentId)
  const entries: Omit<LedgerEntry, 'balance'>[] = []

  for (const c of commissions) {
    const payable = subAgentPayable(c.grossFee, c.rateGiven, c.exchangeRate, c.followOnBonus)
    entries.push({
      id: `sc-${c.id}`,
      date: '2026-06-01',
      description: `Commission — ${c.status}`,
      debit: payable,
      credit: 0,
      reference: c.id.toUpperCase(),
    })
  }

  for (const p of payments) {
    entries.push({
      id: `sp-${p.id}`,
      date: p.paymentDate,
      description: `Payment — ${p.chequeNo}`,
      debit: 0,
      credit: p.amountPKR,
      reference: p.chequeNo,
    })
  }

  entries.sort((a, b) => a.date.localeCompare(b.date))

  let balance = 0
  return entries.map((e) => {
    balance += e.debit - e.credit
    return { ...e, balance }
  })
}

function mapApiLedger(api: ApiLedger): LedgerEntry[] {
  return api.entries.map((e, i) => ({
    id: e.paymentId ?? e.commissionId ?? `le-${i}`,
    date: e.date,
    description: e.type === 'commission' ? 'Commission payable' : `Payment — ${e.ref}`,
    debit: e.debit,
    credit: e.credit,
    reference: e.ref,
    balance: e.balance,
  }))
}

export default function SubAgentLedgerPage() {
  const { api, loading } = usePayablesApiSync()
  const subAgents = useDataStore((s) => s.subAgents)
  const subAgentCommissions = useDataStore((s) => s.subAgentCommissions)
  const subAgentPayments = useDataStore((s) => s.subAgentPayments)
  const [subAgentId, setSubAgentId] = useState('')
  const [apiLedger, setApiLedger] = useState<ApiLedger | null>(null)

  const effectiveSubAgentId = subAgentId || subAgents[0]?.id || ''
  const subAgent = subAgents.find((a) => a.id === effectiveSubAgentId)

  useEffect(() => {
    if (!api || !effectiveSubAgentId) {
      setApiLedger(null)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const data = await getSubAgentLedger(effectiveSubAgentId)
        if (!cancelled) setApiLedger(data)
      } catch (err) {
        if (!cancelled) {
          setApiLedger(null)
          toast.error(err instanceof Error ? err.message : 'Failed to load ledger')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [api, effectiveSubAgentId, subAgentCommissions, subAgentPayments])

  const localLedger = useMemo(
    () => (effectiveSubAgentId ? buildSubAgentLedger(effectiveSubAgentId, subAgentCommissions, subAgentPayments) : []),
    [effectiveSubAgentId, subAgentCommissions, subAgentPayments]
  )
  const ledger = api && apiLedger ? mapApiLedger(apiLedger) : localLedger

  const commissions = subAgentCommissions.filter((c) => c.subAgentId === effectiveSubAgentId)
  const totalPayable = api && apiLedger
    ? apiLedger.totalPayable
    : commissions.reduce(
        (s, c) => s + subAgentPayable(c.grossFee, c.rateGiven, c.exchangeRate, c.followOnBonus),
        0
      )
  const totalPaid = api && apiLedger
    ? apiLedger.totalPaid
    : subAgentPayments
        .filter((p) => p.subAgentId === effectiveSubAgentId)
        .reduce((s, p) => s + p.amountPKR, 0)
  const runningBalance = api && apiLedger
    ? apiLedger.outstanding
    : ledger.length
      ? ledger[ledger.length - 1].balance
      : 0

  const columns: Column<LedgerEntry>[] = useMemo(() => [
    { key: 'date', header: 'Date', cell: (r) => r.date },
    { key: 'reference', header: 'Reference', cell: (r) => <span className="font-mono text-sm">{r.reference}</span> },
    { key: 'description', header: 'Description', cell: (r) => r.description },
    {
      key: 'debit',
      header: 'Payable (Debit)',
      className: 'text-right font-mono',
      cell: (r) => r.debit > 0 ? formatCurrency(r.debit) : '—',
    },
    {
      key: 'credit',
      header: 'Payment (Credit)',
      className: 'text-right font-mono',
      cell: (r) => r.credit > 0 ? formatCurrency(r.credit) : '—',
    },
    {
      key: 'balance',
      header: 'Running Balance',
      className: 'text-right font-mono font-medium',
      cell: (r) => formatCurrency(r.balance),
    },
  ], [])

  const commissionColumns: Column<(typeof commissions)[0]>[] = useMemo(() => [
    { key: 'student', header: 'Student', cell: (r) => r.studentId },
    {
      key: 'payable',
      header: 'Payable (PKR)',
      className: 'text-right font-mono',
      cell: (r) => formatCurrency(subAgentPayable(r.grossFee, r.rateGiven, r.exchangeRate, r.followOnBonus)),
    },
    { key: 'status', header: 'Status', cell: (r) => <StatusPill status={r.status} /> },
  ], [])

  if (api && loading) return <PageDataSkeleton />

  return (
    <div>
      <PageHeader title="Sub-Agent Ledger" subtitle="Running balance, payment history, and outstanding payables" />

      <Card className="mb-6">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label>Select Sub-Agent</Label>
            <Select value={effectiveSubAgentId} onValueChange={setSubAgentId}>
              <SelectTrigger><SelectValue placeholder="Choose a sub-agent" /></SelectTrigger>
              <SelectContent>
                {subAgents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {subAgent && (
            <div className="text-sm text-muted-foreground">
              <p>NTN: {subAgent.ntn}</p>
              <p>{subAgent.email}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {subAgent && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <MetricCard title="Total Payable" value={formatCurrency(totalPayable)} accent="blue" />
          <MetricCard title="Total Paid" value={formatCurrency(totalPaid)} accent="green" />
          <MetricCard title="Running Balance" value={formatCurrency(runningBalance)} accent="orange" />
        </div>
      )}

      {ledger.length === 0 ? (
        <EmptyState title="No ledger entries" description="This sub-agent has no commissions or payments yet." />
      ) : (
        <>
          <DataTable
            data={ledger}
            columns={columns}
            searchPlaceholder="Search ledger..."
            searchFilter={(row, q) => row.description.toLowerCase().includes(q)}
            filters={[
              { key: 'type', label: 'Entry Type', type: 'select', options: [{ label: 'Payable (Debit)', value: 'debit' }, { label: 'Payment (Credit)', value: 'credit' }], accessor: (r) => (r.debit > 0 ? 'debit' : 'credit') },
              { key: 'date', label: 'Date', type: 'dateRange', accessor: (r) => r.date },
              { key: 'amount', label: 'Amount', type: 'numberRange', accessor: (r) => (r.debit > 0 ? r.debit : r.credit) },
            ]}
            newestFirst={false}
            pageSize={15}
          />
          <div className="mt-8">
            <h2 className="mb-4 text-lg font-semibold">Commission Breakdown</h2>
            <DataTable data={commissions} columns={commissionColumns} pageSize={10} />
          </div>
        </>
      )}
    </div>
  )
}
