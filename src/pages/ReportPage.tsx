import { PageHeader } from '@/components/shared/PageHeader'
import { FilterPanel } from '@/components/shared/FilterPanel'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { reports } from '@/data/dashboard'
import { branches } from '@/data/branches'
import { useCurrentUser, useEffectiveBranchId } from '@/hooks/useAuth'
import { isApiMode } from '@/lib/api-client'
import { formatCurrency } from '@/lib/calculations'
import { canViewAllBranches } from '@/lib/permissions'
import {
  downloadReportCsv,
  getReport,
  type ApiReportPayload,
  type ReportRow,
} from '@/lib/reports-api'
import { Loader2, Printer } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import type { Branch } from '@/types'

interface MockReportRow {
  id: string
  label: string
  branch: string
  amount: number
  period: string
}

function resolveReport(reportId?: string) {
  if (!reportId) return undefined
  return (
    reports.find((r) => r.id === reportId) ??
    reports.find((r) => r.path === `/reports/${reportId}`) ??
    reports.find((r) => r.path.endsWith(`/${reportId}`))
  )
}

function pathSlug(reportId?: string, path?: string) {
  if (reportId && !reportId.startsWith('r')) return reportId
  if (path?.startsWith('/reports/')) return path.slice('/reports/'.length)
  return reportId ?? ''
}

/** Demo-only mock rows when VITE_API_URL is not set. Never used in API mode. */
function buildMockRows(reportId: string, title: string, branchList: Branch[]): MockReportRow[] {
  const seed = reportId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return branchList.map((branch, i) => ({
    id: `${reportId}-${branch.id}`,
    label: `${title} — ${branch.code}`,
    branch: branch.name,
    amount: Math.round((seed + i + 1) * 125000 + ((seed * (i + 3)) % 500000)),
    period: 'Jul 2026',
  }))
}

function formatCell(value: unknown) {
  if (value == null) return '—'
  if (typeof value === 'number') {
    if (Number.isFinite(value) && Math.abs(value) >= 100) {
      return formatCurrency(value)
    }
    return String(value)
  }
  return String(value)
}

export function ReportPage() {
  const { reportId } = useParams<{ reportId: string }>()
  const report = resolveReport(reportId)
  const user = useCurrentUser()
  const effectiveBranchId = useEffectiveBranchId()
  const api = isApiMode()
  const slug = pathSlug(reportId, report?.path)

  const [apiData, setApiData] = useState<ApiReportPayload | null>(null)
  const [loading, setLoading] = useState(api)
  const [error, setError] = useState<string | null>(null)

  const visibleBranches = useMemo(
    () =>
      user && canViewAllBranches(user.role)
        ? branches
        : branches.filter((b) => b.id === user?.branchId),
    [user],
  )

  useEffect(() => {
    if (!api || !slug) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    getReport(slug, {
      branchId: effectiveBranchId !== 'all' ? effectiveBranchId : undefined,
    })
      .then((data) => {
        if (!cancelled) setApiData(data)
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setApiData(null)
          setError(e.message || 'Failed to load report')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [api, slug, effectiveBranchId])

  const mockRows = useMemo(
    () =>
      !api && report
        ? buildMockRows(reportId ?? report.id, report.title, visibleBranches)
        : [],
    [api, report, reportId, visibleBranches],
  )

  const mockColumns: Column<MockReportRow>[] = [
    { key: 'label', header: 'Description', cell: (r) => r.label },
    { key: 'branch', header: 'Branch', cell: (r) => r.branch },
    { key: 'period', header: 'Period', cell: (r) => r.period },
    {
      key: 'amount',
      header: 'Amount (PKR)',
      cell: (r) => <span className="font-medium tabular-nums">{formatCurrency(r.amount)}</span>,
      className: 'text-right',
    },
  ]

  const apiColumns: Column<ReportRow>[] = useMemo(() => {
    if (!apiData) return []
    return apiData.columns.map((c) => ({
      key: c.key,
      header: c.header,
      cell: (r: ReportRow) => (
        <span className={typeof r[c.key] === 'number' ? 'tabular-nums' : undefined}>
          {formatCell(r[c.key])}
        </span>
      ),
      className: typeof apiData.rows[0]?.[c.key] === 'number' ? 'text-right' : undefined,
    }))
  }, [apiData])

  const handleExport = async () => {
    if (api && slug) {
      try {
        await downloadReportCsv(slug, {
          branchId: effectiveBranchId !== 'all' ? effectiveBranchId : undefined,
        })
        toast.success('CSV downloaded')
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'CSV export failed')
      }
      return
    }
    toast.success('CSV export started', {
      description: `${report?.title ?? 'Report'} will download shortly.`,
    })
  }

  if (!report && !api) {
    return (
      <div>
        <PageHeader title="Report not found" backTo="/reports" />
        <p className="text-muted-foreground">No report matches &ldquo;{reportId}&rdquo;.</p>
      </div>
    )
  }

  const title = apiData?.title ?? report?.title ?? slug
  const subtitle = apiData?.description ?? report?.description
  const category = apiData?.category ?? report?.category ?? 'Standard'
  const total =
    apiData?.totals?.amount ??
    apiData?.totals?.earnedPKR ??
    apiData?.totals?.total ??
    apiData?.totals?.incomePKR ??
    (api
      ? Object.values(apiData?.totals ?? {}).find((v) => typeof v === 'number') ?? 0
      : mockRows.reduce((sum, r) => sum + r.amount, 0))

  return (
    <div className="space-y-6">
      <PageHeader title={title} subtitle={subtitle} backTo="/reports">
        <Button variant="outline" size="sm" onClick={() => void handleExport()}>
          <Printer className="mr-1.5 h-4 w-4" /> CSV
        </Button>
      </PageHeader>

      <FilterPanel showCountry={category === 'Commission'} showIntake={false} />

      <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span className="text-muted-foreground">
          Category: <strong className="text-foreground">{category}</strong>
          {api ? (
            <span className="ml-2 text-xs text-muted-foreground">(live API)</span>
          ) : null}
        </span>
        <span>
          Total: <strong className="tabular-nums">{formatCurrency(Number(total) || 0)}</strong>
        </span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading report…
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : api && apiData ? (
        <DataTable
          data={apiData.rows}
          columns={apiColumns}
          searchPlaceholder="Search report rows..."
          searchFilter={(row, q) =>
            Object.values(row).some((v) => String(v ?? '').toLowerCase().includes(q))
          }
        />
      ) : (
        <DataTable
          data={mockRows}
          columns={mockColumns}
          searchPlaceholder="Search report rows..."
          searchFilter={(row, q) =>
            row.label.toLowerCase().includes(q) || row.branch.toLowerCase().includes(q)
          }
          filters={[
            {
              key: 'branch',
              label: 'Branch',
              type: 'select',
              options: [...new Set(mockRows.map((r) => r.branch))].map((b) => ({
                label: b,
                value: b,
              })),
              accessor: (r) => r.branch,
            },
            { key: 'amount', label: 'Amount (PKR)', type: 'numberRange', accessor: (r) => r.amount },
          ]}
        />
      )}
    </div>
  )
}
