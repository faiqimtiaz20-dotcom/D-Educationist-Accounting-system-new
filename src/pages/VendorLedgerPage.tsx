import { DataTable, type Column } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { MetricCard } from '@/components/shared/MetricCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useBranchFilter } from '@/hooks/useBranchFilter'
import { useCashApiSync } from '@/hooks/useCashApiSync'
import { isApiMode } from '@/lib/api-client'
import { formatCurrency } from '@/lib/calculations'
import { getVendorLedger, mapPartyLedgerEntries } from '@/lib/journals-api'
import { useDataStore } from '@/store/data-store'
import type { Expense, LedgerEntry } from '@/types'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

function buildVendorLedger(vendorExpenses: Expense[]): LedgerEntry[] {
  const entries: Omit<LedgerEntry, 'balance'>[] = vendorExpenses.map((e) => ({
    id: e.id,
    date: e.date,
    description: `${e.category} — ${e.approvalStatus}`,
    debit: e.approvalStatus !== 'Approved' ? e.total : 0,
    credit: e.approvalStatus === 'Approved' ? e.total : 0,
    reference: e.id.toUpperCase(),
  }))
  entries.sort((a, b) => a.date.localeCompare(b.date))
  let balance = 0
  return entries.map((e) => {
    balance += e.debit - e.credit
    return { ...e, balance }
  })
}

export default function VendorLedgerPage() {
  const api = isApiMode()
  const { vendors: apiVendors } = useCashApiSync()
  const expenses = useDataStore((s) => s.expenses)
  const branchFiltered = useBranchFilter(expenses)
  const localVendors = useMemo(
    () => [...new Set(branchFiltered.map((e) => e.vendor))].sort(),
    [branchFiltered],
  )
  const vendorOptions = api && apiVendors.length > 0
      ? apiVendors.map((v) => ({
          value: v.id,
          label: v.vendorNo ? `${v.vendorNo} — ${v.name}` : v.name,
        }))
      : localVendors.map((v) => ({ value: v, label: v }))

  const [vendor, setVendor] = useState('')
  const effectiveVendor = vendor || vendorOptions[0]?.value || ''
  const [apiLedger, setApiLedger] = useState<LedgerEntry[] | null>(null)
  const [apiMeta, setApiMeta] = useState<{
    outstanding: number
    totalBills: number
    totalPaid: number
    name: string
  } | null>(null)

  useEffect(() => {
    if (!api || !effectiveVendor) {
      setApiLedger(null)
      setApiMeta(null)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const data = await getVendorLedger(effectiveVendor)
        if (cancelled) return
        setApiLedger(mapPartyLedgerEntries(data))
        setApiMeta({
          outstanding: data.outstanding,
          totalBills: data.totalBills ?? 0,
          totalPaid: data.totalPaid ?? 0,
          name: data.partyName,
        })
      } catch (err) {
        if (!cancelled) {
          setApiLedger([])
          toast.error(err instanceof Error ? err.message : 'Failed to load ledger')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [api, effectiveVendor, expenses])

  const vendorName = api && apiMeta
    ? apiMeta.name
    : (vendorOptions.find((v) => v.value === effectiveVendor)?.label ?? effectiveVendor)

  const vendorExpenses = useMemo(
    () => branchFiltered.filter((e) => e.vendor === vendorName || e.vendor === effectiveVendor),
    [branchFiltered, vendorName, effectiveVendor]
  )

  const localLedger = useMemo(() => buildVendorLedger(vendorExpenses), [vendorExpenses])
  const ledger = api && apiLedger ? apiLedger : localLedger
  const totalBills = api && apiMeta ? apiMeta.totalBills : vendorExpenses.reduce((s, e) => s + e.total, 0)
  const totalPaid = api && apiMeta
    ? apiMeta.totalPaid
    : vendorExpenses.filter((e) => e.approvalStatus === 'Approved').reduce((s, e) => s + e.total, 0)
  const outstanding = api && apiMeta
    ? apiMeta.outstanding
    : ledger.length
      ? ledger[ledger.length - 1].balance
      : 0

  const columns: Column<LedgerEntry>[] = useMemo(() => [
    { key: 'date', header: 'Date', cell: (r) => r.date },
    { key: 'reference', header: 'Ref', cell: (r) => <span className="font-mono text-sm">{r.reference}</span> },
    { key: 'description', header: 'Description', cell: (r) => r.description },
    { key: 'debit', header: 'Bill (Debit)', className: 'text-right font-mono', cell: (r) => r.debit > 0 ? formatCurrency(r.debit) : '—' },
    { key: 'credit', header: 'Paid (Credit)', className: 'text-right font-mono', cell: (r) => r.credit > 0 ? formatCurrency(r.credit) : '—' },
    { key: 'balance', header: 'Balance', className: 'text-right font-mono font-medium', cell: (r) => formatCurrency(r.balance) },
  ], [])

  return (
    <div>
      <PageHeader title="Vendor Ledger" subtitle="Bills, payments, and outstanding balance per vendor" />

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="space-y-2">
            <Label>Select Vendor</Label>
            <Select value={effectiveVendor} onValueChange={setVendor}>
              <SelectTrigger><SelectValue placeholder="Choose a vendor" /></SelectTrigger>
              <SelectContent>
                {vendorOptions.map((v) => (
                  <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {effectiveVendor && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <MetricCard title="Total Bills" value={formatCurrency(totalBills)} accent="blue" />
          <MetricCard title="Total Paid" value={formatCurrency(totalPaid)} accent="green" />
          <MetricCard title="Outstanding" value={formatCurrency(outstanding)} accent="orange" />
        </div>
      )}

      {ledger.length === 0 ? (
        <EmptyState title="No ledger entries" description="This vendor has no expenses yet." />
      ) : (
        <DataTable
          data={ledger}
          columns={columns}
          searchPlaceholder="Search ledger..."
          searchFilter={(row, q) => row.description.toLowerCase().includes(q)}
          newestFirst={false}
          pageSize={15}
        />
      )}
    </div>
  )
}
