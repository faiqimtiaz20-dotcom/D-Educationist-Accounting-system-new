import { DataTable, type Column } from '@/components/shared/DataTable'
import { MetricCard } from '@/components/shared/MetricCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { taxRecords as mockTaxRecords } from '@/data'
import { getBranchName } from '@/lib/org'
import { useBranchFilter } from '@/hooks/useBranchFilter'
import { isApiMode } from '@/lib/api-client'
import { formatCurrency } from '@/lib/calculations'
import { branchFilterOptions } from '@/lib/filter-options'
import { listBranches } from '@/lib/settings-api'
import { getTaxSummary, mapApiTaxRecord, type ApiTaxSummary } from '@/lib/tax-api'
import { useDataStore } from '@/store/data-store'
import type { Branch, TaxRecord } from '@/types'
import { FileCheck, Receipt, Scale, Wallet } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

const DEFAULT_PERIOD = '2026-09'

function periodLabel(yyyyMm: string) {
  const [y, m] = yyyyMm.split('-').map(Number)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  if (!y || !m || m < 1 || m > 12) return yyyyMm
  return `${months[m - 1]} ${y}`
}

function mapBranch(b: { id: string; name: string; code: string; city: string; isHeadOffice: boolean }): Branch {
  return {
    id: b.id,
    name: b.name,
    code: b.code,
    city: b.city,
    isHeadOffice: b.isHeadOffice,
  }
}

export default function TaxCompliancePage() {
  const api = isApiMode()
  const [period, setPeriod] = useState(DEFAULT_PERIOD)
  const [summary, setSummary] = useState<ApiTaxSummary | null>(null)
  const [apiRecords, setApiRecords] = useState<TaxRecord[] | null>(null)
  const [loading, setLoading] = useState(api)

  useEffect(() => {
    if (!api) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const [data, branchRows] = await Promise.all([
          getTaxSummary(period),
          listBranches(),
        ])
        if (cancelled) return
        setSummary(data)
        setApiRecords(data.records.map(mapApiTaxRecord))
        useDataStore.setState({ branches: branchRows.map(mapBranch) })
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : 'Failed to load tax summary')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [api, period])

  const sourceRecords = api && apiRecords ? apiRecords : mockTaxRecords
  const filtered = useBranchFilter(sourceRecords)

  const mockSummary = useMemo(() => {
    const currentPeriod = 'Jul 2026'
    const periodRecords = filtered.filter((r) => r.period === currentPeriod)
    const sum = (type: TaxRecord['type']) =>
      periodRecords.filter((r) => r.type === type).reduce((s, r) => s + r.amount, 0)

    return {
      periodLabel: currentPeriod,
      whtReceivable: sum('WHT Receivable'),
      whtPayable: sum('WHT Payable'),
      gstInput: sum('GST Input'),
      gstOutput: sum('GST Output'),
      srbSst: sum('SRB-SST'),
      salaryTax: sum('Salary Tax'),
      totalLiability: sum('WHT Payable') + sum('GST Output') + sum('SRB-SST') + sum('Salary Tax'),
      totalReceivable: sum('WHT Receivable') + sum('GST Input'),
      gstNet: sum('GST Output') - sum('GST Input'),
    }
  }, [filtered])

  const metrics = api && summary
    ? {
        periodLabel: summary.periodLabel,
        whtReceivable: summary.whtReceivable,
        whtPayable: summary.whtPayable,
        gstInput: summary.gstInput,
        gstOutput: summary.gstOutput,
        srbSst: summary.srbSst,
        salaryTax: summary.salaryTax,
        totalLiability: summary.totalLiability,
        totalReceivable: summary.totalReceivable,
        gstNet: summary.gstNet,
      }
    : mockSummary

  const periodOptions = useMemo(() => {
    if (api) {
      return [
        { label: periodLabel(period), value: period },
        { label: 'Aug 2026', value: '2026-08' },
        { label: 'Jul 2026', value: '2026-07' },
        { label: 'Jun 2026', value: '2026-06' },
      ]
    }
    return [...new Set(filtered.map((r) => r.period))].map((p) => ({ label: p, value: p }))
  }, [api, period, filtered])

  const columns: Column<TaxRecord>[] = useMemo(() => [
    { key: 'type', header: 'Tax Type', cell: (r) => r.type },
    { key: 'period', header: 'Period', cell: (r) => r.period },
    {
      key: 'amount',
      header: 'Amount',
      className: 'text-right font-mono',
      cell: (r) => formatCurrency(r.amount),
    },
    { key: 'branch', header: 'Branch', cell: (r) => getBranchName(r.branchId) },
  ], [])

  const pl = metrics.periodLabel

  return (
    <div>
      <PageHeader
        title="Tax Compliance"
        subtitle={
          api
            ? `Unified tax dashboard — live from remittances, payables, expenses & payroll${loading ? ' (loading…)' : ''}`
            : 'Unified tax dashboard — WHT, GST, SRB-SST, and salary tax'
        }
      />

      {api && (
        <div className="mb-4 flex items-center gap-3">
          <label className="text-sm text-muted-foreground" htmlFor="tax-period">
            Period
          </label>
          <select
            id="tax-period"
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            {periodOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title={`WHT Receivable (${pl})`} value={formatCurrency(metrics.whtReceivable)} icon={Receipt} accent="green" />
        <MetricCard title={`WHT Payable (${pl})`} value={formatCurrency(metrics.whtPayable)} icon={Wallet} accent="orange" />
        <MetricCard title={`GST Net (${pl})`} value={formatCurrency(metrics.gstNet)} icon={Scale} accent="blue" />
        <MetricCard title="Total Tax Liability" value={formatCurrency(metrics.totalLiability)} icon={FileCheck} accent="purple" />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <MetricCard title="GST Input" value={formatCurrency(metrics.gstInput)} accent="blue" />
        <MetricCard title="GST Output" value={formatCurrency(metrics.gstOutput)} accent="orange" />
        <MetricCard title="SRB-SST + Salary Tax" value={formatCurrency(metrics.srbSst + metrics.salaryTax)} accent="yellow" />
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        searchPlaceholder="Search tax records..."
        searchFilter={(row, q) =>
          row.type.toLowerCase().includes(q) ||
          row.period.toLowerCase().includes(q)
        }
        filters={[
          { key: 'branch', label: 'Branch', type: 'select', options: branchFilterOptions, accessor: (r) => r.branchId },
          { key: 'type', label: 'Tax Type', type: 'select', options: ['WHT Receivable', 'WHT Payable', 'GST Input', 'GST Output', 'SRB-SST', 'Salary Tax'].map((t) => ({ label: t, value: t })), accessor: (r) => r.type },
          ...(api
            ? []
            : [{ key: 'period', label: 'Period', type: 'select' as const, options: periodOptions, accessor: (r: TaxRecord) => r.period }]),
          { key: 'amount', label: 'Amount', type: 'numberRange', accessor: (r) => r.amount },
        ]}
      />
    </div>
  )
}
