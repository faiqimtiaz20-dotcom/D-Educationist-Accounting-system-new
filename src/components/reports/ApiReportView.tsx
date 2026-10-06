import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { MetricCard } from '@/components/shared/MetricCard'
import { PageDataSkeleton } from '@/components/shared/PageDataSkeleton'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useEffectiveBranchId } from '@/hooks/useAuth'
import { formatCurrency } from '@/lib/calculations'
import {
  downloadReportCsv,
  getReport,
  type ApiReportPayload,
  type ReportRow,
} from '@/lib/reports-api'
import { Printer } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

const TOTAL_LABELS: Record<string, string> = {
  incomePKR: 'Income',
  expensesPKR: 'Expenses',
  profitPKR: 'Profit',
  subAgentCostPKR: 'Sub-Agent Cost',
  earnedPKR: 'Earned',
  receivedPKR: 'Received',
  outstanding: 'Outstanding',
  assets: 'Assets',
  liabilities: 'Liabilities',
  equity: 'Equity',
  liabilitiesEquity: 'Liabilities & Equity',
  periodNetIncome: 'Period Net Income',
  balanced: 'Balanced',
  totalDebit: 'Total Debit',
  totalCredit: 'Total Credit',
  totalPKR: 'Total (PKR)',
  approvedPKR: 'Approved (PKR)',
  expenseCount: 'Expenses',
  invoiceCount: 'Invoices',
  amount: 'Amount',
}

function humanizeKey(key: string) {
  return (
    TOTAL_LABELS[key] ??
    key
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/_/g, ' ')
      .replace(/\bPKR\b/g, '(PKR)')
      .replace(/^\w/, (c) => c.toUpperCase())
  )
}

function formatCell(value: unknown, key?: string) {
  if (value == null) return '—'
  if (typeof value === 'number') {
    // Counts / flags — never currency-format
    if (
      key &&
      /(count|balanced|qty|quantity|invoices|expenses)$/i.test(key)
    ) {
      return String(value)
    }
    if (Number.isFinite(value) && !Number.isInteger(value)) {
      return formatCurrency(value)
    }
    // Integer money fields are typically large; small integers (0–999) that look like counts stay plain
    if (
      Number.isInteger(value) &&
      Math.abs(value) < 1000 &&
      key &&
      !/(pkr|amount|balance|debit|credit|income|expense|profit|cost|total|earned|received|outstanding)/i.test(
        key,
      )
    ) {
      return String(value)
    }
    if (Number.isFinite(value)) {
      return formatCurrency(value)
    }
    return String(value)
  }
  return String(value)
}

type Props = {
  slug: string
  /** Override title when catalog title differs */
  title?: string
  backTo?: string
}

/** Live API report viewer used by dedicated report routes in API mode. */
export function ApiReportView({ slug, title, backTo = '/reports' }: Props) {
  const effectiveBranchId = useEffectiveBranchId()
  const [data, setData] = useState<ApiReportPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState('summary')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getReport(slug, {
      branchId: effectiveBranchId !== 'all' ? effectiveBranchId : undefined,
    })
      .then((payload) => {
        if (!cancelled) setData(payload)
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message || 'Failed to load report')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [slug, effectiveBranchId])

  const columns: Column<ReportRow>[] = useMemo(() => {
    if (!data) return []
    return data.columns.map((c) => ({
      key: c.key,
      header: c.header,
      cell: (r: ReportRow) => (
        <span className={typeof r[c.key] === 'number' ? 'tabular-nums' : undefined}>
          {formatCell(r[c.key], c.key)}
        </span>
      ),
      className: typeof data.rows[0]?.[c.key] === 'number' ? 'text-right' : undefined,
    }))
  }, [data])

  const detailColumns: Column<ReportRow>[] = useMemo(() => {
    if (!data?.details) return []
    return data.details.columns.map((c) => ({
      key: c.key,
      header: c.header,
      cell: (r: ReportRow) => (
        <span className={typeof r[c.key] === 'number' ? 'tabular-nums' : undefined}>
          {formatCell(r[c.key], c.key)}
        </span>
      ),
      className:
        typeof data.details!.rows[0]?.[c.key] === 'number' ? 'text-right' : undefined,
    }))
  }, [data])

  const handleExport = async () => {
    try {
      await downloadReportCsv(slug, {
        branchId: effectiveBranchId !== 'all' ? effectiveBranchId : undefined,
      })
      toast.success('CSV downloaded')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'CSV export failed')
    }
  }

  const totals = data?.totals ?? {}
  const metricEntries = Object.entries(totals).slice(0, 4)

  return (
    <div className="space-y-6">
      <PageHeader
        title={title ?? data?.title ?? slug}
        subtitle={data?.description}
        backTo={backTo}
      >
        <Button variant="outline" size="sm" onClick={() => void handleExport()}>
          <Printer className="mr-1.5 h-4 w-4" /> CSV
        </Button>
      </PageHeader>

      {loading ? (
        <PageDataSkeleton metrics={4} />
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : data ? (
        <>
          {metricEntries.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {metricEntries.map(([key, value]) => (
                <MetricCard
                  key={key}
                  title={humanizeKey(key)}
                  value={
                    /(count|balanced)$/i.test(key)
                      ? String(value ?? 0)
                      : formatCurrency(Number(value) || 0)
                  }
                />
              ))}
            </div>
          ) : null}

          {data.details?.rows.length ? (
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList>
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="detail">Detail</TabsTrigger>
              </TabsList>
              <TabsContent value="summary" className="mt-4">
                <DataTable
                  data={data.rows}
                  columns={columns}
                  searchPlaceholder="Search…"
                  searchFilter={(row, q) =>
                    Object.values(row).some((v) =>
                      String(v ?? '').toLowerCase().includes(q),
                    )
                  }
                />
              </TabsContent>
              <TabsContent value="detail" className="mt-4">
                <DataTable
                  data={data.details.rows}
                  columns={detailColumns}
                  searchPlaceholder="Search detail…"
                  searchFilter={(row, q) =>
                    Object.values(row).some((v) =>
                      String(v ?? '').toLowerCase().includes(q),
                    )
                  }
                />
              </TabsContent>
            </Tabs>
          ) : (
            <DataTable
              data={data.rows}
              columns={columns}
              searchPlaceholder="Search…"
              searchFilter={(row, q) =>
                Object.values(row).some((v) =>
                  String(v ?? '').toLowerCase().includes(q),
                )
              }
            />
          )}
        </>
      ) : null}
    </div>
  )
}
