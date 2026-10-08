import { ApiReportView } from '@/components/reports/ApiReportView'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { FilterPanel } from '@/components/shared/FilterPanel'
import { MetricCard } from '@/components/shared/MetricCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusPill } from '@/components/shared/StatusPill'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCurrentUser, useEffectiveBranchId } from '@/hooks/useAuth'
import { isApiMode } from '@/lib/api-client'
import { formatCurrency, subAgentPayable } from '@/lib/calculations'
import { invoiceAmountPKR } from '@/lib/gl-posting'
import { getInvoiceLineTotal, getInvoiceOutstanding, getInvoicePaid, getInvoiceTotal } from '@/lib/invoice'
import { canViewAllBranches } from '@/lib/permissions'
import { useAppStore } from '@/store/app-store'
import { useDataStore } from '@/store/data-store'
import type { Invoice } from '@/types'
import {
  Building2,
  Eye,
  FileSpreadsheet,
  FileText,
  Printer,
  Receipt,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

interface UniversityPLSummary {
  key: string
  university: string
  country: string
  invoiceCount: number
  studentCount: number
  incomePKR: number
  costPKR: number
  profitPKR: number
  outstandingPKR: number
  /** profitPKR − outstandingPKR */
  netProfitPKR: number
  marginPct: number
  receivedPKR: number
}

interface UniversityPLDetailRow {
  id: string
  invoiceNo: string
  invoiceDate: string
  branchId: string
  branchName: string
  studentId: string
  studentName: string
  university: string
  country: string
  currency: string
  commission: number
  incomePKR: number
  costPKR: number
  profitPKR: number
  received: number
  outstanding: number
  /** profitPKR − outstanding */
  netProfitPKR: number
  status: Invoice['status']
}

const DEFAULT_DATE_FROM = '2026-01-01'
const DEFAULT_DATE_TO = '2026-12-31'

export default function UniversityWisePLReportPage() {
  if (isApiMode()) return <ApiReportView slug="university-wise-pl" />
  return <UniversityWisePLReportPageLocal />
}

function UniversityWisePLReportPageLocal() {
  const user = useCurrentUser()
  const invoices = useDataStore((s) => s.invoices)
  const students = useDataStore((s) => s.students)
  const receivables = useDataStore((s) => s.receivables)
  const subAgentCommissions = useDataStore((s) => s.subAgentCommissions)
  const branches = useDataStore((s) => s.branches)
  const universities = useDataStore((s) => s.universities)
  const effectiveBranchId = useEffectiveBranchId()
  const setSelectedBranchId = useAppStore((s) => s.setSelectedBranchId)
  const isSuperAdmin = user ? canViewAllBranches(user) : false

  const [tab, setTab] = useState('summary')
  const [detailUniversity, setDetailUniversity] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState(DEFAULT_DATE_FROM)
  const [dateTo, setDateTo] = useState(DEFAULT_DATE_TO)

  const branchName = (branchId: string) =>
    branches.find((b) => b.id === branchId)?.name ?? branchId

  const universityMeta = useMemo(() => {
    const map = new Map(universities.map((u) => [u.name, u]))
    return map
  }, [universities])

  const scopedInvoices = useMemo(() => {
    let rows = invoices.filter((inv) => inv.status !== 'Draft')
    if (!isSuperAdmin && user) {
      rows = rows.filter((inv) => inv.branchId === user.branchId)
    } else if (effectiveBranchId !== 'all') {
      rows = rows.filter((inv) => inv.branchId === effectiveBranchId)
    }
    if (dateFrom) {
      rows = rows.filter((inv) => inv.invoiceDate.slice(0, 10) >= dateFrom)
    }
    if (dateTo) {
      rows = rows.filter((inv) => inv.invoiceDate.slice(0, 10) <= dateTo)
    }
    return rows
  }, [invoices, isSuperAdmin, user, effectiveBranchId, dateFrom, dateTo])

  const scopedInvoiceIds = useMemo(
    () => new Set(scopedInvoices.map((inv) => inv.id)),
    [scopedInvoices]
  )

  /** Sub-agent cost only for invoices in the same filtered store set. */
  const costByInvoiceId = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of subAgentCommissions) {
      if (!scopedInvoiceIds.has(c.invoiceId)) continue
      if (!isSuperAdmin && user && c.branchId !== user.branchId) continue
      if (isSuperAdmin && effectiveBranchId !== 'all' && c.branchId !== effectiveBranchId) continue
      const payable = subAgentPayable(c.grossFee, c.rateGiven, c.exchangeRate, c.followOnBonus)
      map.set(c.invoiceId, (map.get(c.invoiceId) ?? 0) + payable)
    }
    return map
  }, [subAgentCommissions, scopedInvoiceIds, isSuperAdmin, user, effectiveBranchId])

  const detailRows = useMemo((): UniversityPLDetailRow[] => {
    return scopedInvoices.flatMap((inv) => {
      const invTotal = getInvoiceTotal(inv)
      const incomePKRTotal = invoiceAmountPKR(inv)
      const costPKRTotal = costByInvoiceId.get(inv.id) ?? 0
      const receivedTotal = getInvoicePaid(receivables, inv.id)
      const outstandingTotal = getInvoiceOutstanding(inv, receivables)
      const lines = inv.lines?.length ? inv.lines : []

      return lines.map((line) => {
        const student = students.find((s) => s.id === line.studentId)
        const uniName = student?.university || 'Unknown'
        const meta = universityMeta.get(uniName)
        const lineTotal = getInvoiceLineTotal(line)
        const share = invTotal > 0 ? lineTotal / invTotal : 0
        const incomePKR = incomePKRTotal * share
        const costPKR = costPKRTotal * share
        const profitPKR = incomePKR - costPKR
        const received = receivedTotal * share
        const outstanding = outstandingTotal * share
        return {
          id: `${inv.id}-${line.id}`,
          invoiceNo: inv.invoiceNo,
          invoiceDate: inv.invoiceDate,
          branchId: inv.branchId,
          branchName: branchName(inv.branchId),
          studentId: line.studentId,
          studentName: student?.name ?? '—',
          university: uniName,
          country: student?.country || meta?.country || '—',
          currency: inv.currency,
          commission: lineTotal,
          incomePKR,
          costPKR,
          profitPKR,
          received,
          outstanding,
          netProfitPKR: profitPKR - outstanding,
          status: inv.status,
        }
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- branchName uses store branches
  }, [scopedInvoices, students, receivables, costByInvoiceId, universityMeta, branches])

  const filteredDetails = useMemo(() => {
    if (!detailUniversity) return detailRows
    return detailRows.filter((r) => r.university === detailUniversity)
  }, [detailRows, detailUniversity])

  const summaries = useMemo((): UniversityPLSummary[] => {
    const groups = new Map<string, UniversityPLDetailRow[]>()
    for (const row of detailRows) {
      const list = groups.get(row.university) ?? []
      list.push(row)
      groups.set(row.university, list)
    }

    // Include store universities that have activity in the filtered set
    const keys = new Set([
      ...universities.map((u) => u.name),
      ...groups.keys(),
    ])

    return Array.from(keys)
      .map((university) => {
        const rows = groups.get(university) ?? []
        const meta = universityMeta.get(university)
        const incomePKR = rows.reduce((s, r) => s + r.incomePKR, 0)
        const costPKR = rows.reduce((s, r) => s + r.costPKR, 0)
        const profitPKR = incomePKR - costPKR
        const outstandingPKR = rows.reduce((s, r) => s + r.outstanding, 0)
        const netProfitPKR = profitPKR - outstandingPKR
        const studentIds = new Set(rows.map((r) => r.studentId))
        return {
          key: university,
          university,
          country: rows[0]?.country ?? meta?.country ?? '—',
          invoiceCount: new Set(rows.map((r) => r.invoiceNo)).size,
          studentCount: studentIds.size,
          incomePKR,
          costPKR,
          profitPKR,
          outstandingPKR,
          netProfitPKR,
          marginPct: incomePKR > 0 ? (netProfitPKR / incomePKR) * 100 : 0,
          receivedPKR: rows.reduce((s, r) => s + r.received, 0),
        }
      })
      .filter((s) => s.invoiceCount > 0)
      .sort((a, b) => b.netProfitPKR - a.netProfitPKR)
  }, [detailRows, universities, universityMeta])

  const totals = useMemo(() => {
    const source = detailUniversity ? filteredDetails : detailRows
    const income = source.reduce((s, r) => s + r.incomePKR, 0)
    const cost = source.reduce((s, r) => s + r.costPKR, 0)
    const profit = income - cost
    const outstanding = source.reduce((s, r) => s + r.outstanding, 0)
    const netProfit = profit - outstanding
    return {
      invoices: source.length,
      income,
      cost,
      profit,
      outstanding,
      netProfit,
      marginPct: income > 0 ? (netProfit / income) * 100 : 0,
    }
  }, [detailRows, filteredDetails, detailUniversity])

  const toOptions = (values: string[]) =>
    [...new Set(values)].filter(Boolean).map((v) => ({ label: v, value: v }))

  const openUniversityDetails = (university: string) => {
    setDetailUniversity(university)
    setTab('detail')
  }

  const clearDetailFilter = () => setDetailUniversity(null)

  const handleResetFilters = () => {
    setDateFrom(DEFAULT_DATE_FROM)
    setDateTo(DEFAULT_DATE_TO)
    setDetailUniversity(null)
    if (isSuperAdmin) setSelectedBranchId('all')
  }

  const handleExport = (format: 'PDF' | 'Excel' | 'CSV') => {
    toast.success(`${format} export started`, {
      description: 'University-wise P&L report will download shortly.',
    })
  }

  const summaryColumns: Column<UniversityPLSummary>[] = [
    {
      key: 'university',
      header: 'University',
      cell: (r) => (
        <div>
          <p className="font-medium">{r.university}</p>
          <p className="text-xs text-muted-foreground">{r.country}</p>
        </div>
      ),
      sortAccessor: (r) => r.university,
    },
    {
      key: 'invoices',
      header: 'Invoices',
      cell: (r) => r.invoiceCount,
      className: 'text-right',
      sortAccessor: (r) => r.invoiceCount,
    },
    {
      key: 'income',
      header: 'Income (PKR)',
      cell: (r) => <span className="tabular-nums text-emerald-700 dark:text-emerald-400">{formatCurrency(r.incomePKR)}</span>,
      className: 'text-right',
      sortAccessor: (r) => r.incomePKR,
    },
    {
      key: 'cost',
      header: 'Sub-Agent Cost',
      cell: (r) => <span className="tabular-nums text-orange-700 dark:text-orange-400">{formatCurrency(r.costPKR)}</span>,
      className: 'text-right',
      sortAccessor: (r) => r.costPKR,
    },
    {
      key: 'profit',
      header: 'Profit / (Loss)',
      cell: (r) => (
        <span className={`font-medium tabular-nums ${r.profitPKR >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-destructive'}`}>
          {formatCurrency(r.profitPKR)}
        </span>
      ),
      className: 'text-right',
      sortAccessor: (r) => r.profitPKR,
    },
    {
      key: 'outstanding',
      header: 'Outstanding',
      cell: (r) => <span className="tabular-nums">{formatCurrency(r.outstandingPKR)}</span>,
      className: 'text-right',
      sortAccessor: (r) => r.outstandingPKR,
    },
    {
      key: 'netProfit',
      header: 'Net Profit',
      cell: (r) => (
        <span className={`font-semibold tabular-nums ${r.netProfitPKR >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-destructive'}`}>
          {formatCurrency(r.netProfitPKR)}
        </span>
      ),
      className: 'text-right',
      sortAccessor: (r) => r.netProfitPKR,
    },
    {
      key: 'margin',
      header: 'Margin %',
      cell: (r) => <span className="tabular-nums">{r.marginPct.toFixed(1)}%</span>,
      className: 'text-right',
      sortAccessor: (r) => r.marginPct,
    },
    {
      key: 'actions',
      header: '',
      sortable: false,
      cell: (r) => (
        <Button variant="outline" size="sm" className="h-8" onClick={() => openUniversityDetails(r.university)}>
          <Eye className="mr-1 h-3.5 w-3.5" /> Details
        </Button>
      ),
    },
  ]

  const detailColumns: Column<UniversityPLDetailRow>[] = [
    { key: 'invoiceNo', header: 'Invoice', cell: (r) => <span className="font-mono text-xs">{r.invoiceNo}</span> },
    { key: 'date', header: 'Date', cell: (r) => r.invoiceDate },
    { key: 'branch', header: 'Branch', cell: (r) => r.branchName },
    {
      key: 'studentId',
      header: 'Student ID',
      cell: (r) => {
        const s = students.find((x) => x.id === r.studentId)
        return <span className="font-mono text-xs">{s?.studentId ?? '—'}</span>
      },
    },
    { key: 'student', header: 'Student', cell: (r) => r.studentName },
    { key: 'university', header: 'University', cell: (r) => r.university },
    { key: 'country', header: 'Country', cell: (r) => r.country },
    {
      key: 'commission',
      header: 'Commission',
      cell: (r) => (
        <span className="tabular-nums">
          {r.currency} {r.commission.toLocaleString()}
        </span>
      ),
      className: 'text-right',
      sortAccessor: (r) => r.commission,
    },
    {
      key: 'income',
      header: 'Income (PKR)',
      cell: (r) => <span className="tabular-nums">{formatCurrency(r.incomePKR)}</span>,
      className: 'text-right',
      sortAccessor: (r) => r.incomePKR,
    },
    {
      key: 'cost',
      header: 'Cost (PKR)',
      cell: (r) => <span className="tabular-nums">{formatCurrency(r.costPKR)}</span>,
      className: 'text-right',
      sortAccessor: (r) => r.costPKR,
    },
    {
      key: 'profit',
      header: 'Profit / (Loss)',
      cell: (r) => (
        <span className={`font-medium tabular-nums ${r.profitPKR >= 0 ? '' : 'text-destructive'}`}>
          {formatCurrency(r.profitPKR)}
        </span>
      ),
      className: 'text-right',
      sortAccessor: (r) => r.profitPKR,
    },
    {
      key: 'outstanding',
      header: 'Outstanding',
      cell: (r) => <span className="tabular-nums">{formatCurrency(r.outstanding)}</span>,
      className: 'text-right',
      sortAccessor: (r) => r.outstanding,
    },
    {
      key: 'netProfit',
      header: 'Net Profit',
      cell: (r) => (
        <span className={`font-semibold tabular-nums ${r.netProfitPKR >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-destructive'}`}>
          {formatCurrency(r.netProfitPKR)}
        </span>
      ),
      className: 'text-right',
      sortAccessor: (r) => r.netProfitPKR,
    },
    { key: 'status', header: 'Status', cell: (r) => <StatusPill status={r.status} /> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="University-wise P&L"
        subtitle="Net Profit = Profit/(Loss) − Outstanding — from store invoices, commissions & receivables"
        backTo="/reports"
      >
        <Button variant="outline" size="sm" onClick={() => handleExport('PDF')}>
          <FileText className="mr-1.5 h-4 w-4" /> PDF
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleExport('Excel')}>
          <FileSpreadsheet className="mr-1.5 h-4 w-4" /> Excel
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleExport('CSV')}>
          <Printer className="mr-1.5 h-4 w-4" /> CSV
        </Button>
      </PageHeader>

      <FilterPanel
        showCountry={false}
        showIntake={false}
        showUser={false}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onReset={handleResetFilters}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard title="Invoices" value={totals.invoices} icon={Receipt} accent="blue" />
        <MetricCard title="Income (PKR)" value={formatCurrency(totals.income)} icon={TrendingUp} accent="green" />
        <MetricCard title="Sub-Agent Cost" value={formatCurrency(totals.cost)} icon={TrendingDown} accent="orange" />
        <MetricCard
          title="Net Profit"
          value={formatCurrency(totals.netProfit)}
          icon={Wallet}
          accent={totals.netProfit >= 0 ? 'green' : 'pink'}
        />
        <MetricCard title="Margin" value={`${totals.marginPct.toFixed(1)}%`} icon={Building2} accent="purple" />
      </div>

      <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span className="text-muted-foreground">
          Formula: <strong className="text-foreground">Net Profit = Profit/(Loss) − Outstanding</strong>
          {detailUniversity && (
            <>
              {' · '}
              Viewing: <strong className="text-foreground">{detailUniversity}</strong>
              <Button variant="link" className="ml-2 h-auto p-0 text-sm" onClick={clearDetailFilter}>
                Clear filter
              </Button>
            </>
          )}
        </span>
        <span>
          Profit/(Loss): <strong className="tabular-nums">{formatCurrency(totals.profit)}</strong>
          {' − '}
          Outstanding: <strong className="tabular-nums">{formatCurrency(totals.outstanding)}</strong>
          {' = '}
          Net: <strong className="tabular-nums">{formatCurrency(totals.netProfit)}</strong>
        </span>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="summary">By University</TabsTrigger>
          <TabsTrigger value="detail">Invoice Detail</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-4">
          <DataTable
            data={summaries}
            columns={summaryColumns}
            searchPlaceholder="Search university or country..."
            searchFilter={(row, q) =>
              row.university.toLowerCase().includes(q) ||
              row.country.toLowerCase().includes(q)
            }
            filters={[
              {
                key: 'country',
                label: 'Country',
                type: 'select',
                options: toOptions(summaries.map((r) => r.country)),
                accessor: (r) => r.country,
              },
              {
                key: 'netProfit',
                label: 'Net Profit (PKR)',
                type: 'numberRange',
                accessor: (r) => r.netProfitPKR,
              },
            ]}
            newestFirst={false}
          />
        </TabsContent>

        <TabsContent value="detail" className="mt-4">
          <DataTable
            data={filteredDetails}
            columns={detailColumns}
            searchPlaceholder="Search invoice, student, or university..."
            searchFilter={(row, q) =>
              row.invoiceNo.toLowerCase().includes(q) ||
              row.studentName.toLowerCase().includes(q) ||
              row.university.toLowerCase().includes(q) ||
              row.branchName.toLowerCase().includes(q)
            }
            filters={[
              {
                key: 'university',
                label: 'University',
                type: 'select',
                options: toOptions([
                  ...universities.map((u) => u.name),
                  ...detailRows.map((r) => r.university),
                ]),
                accessor: (r) => r.university,
              },
              {
                key: 'branch',
                label: 'Branch',
                type: 'select',
                options: toOptions(branches.map((b) => b.name)),
                accessor: (r) => r.branchName,
              },
              {
                key: 'country',
                label: 'Country',
                type: 'select',
                options: toOptions(detailRows.map((r) => r.country)),
                accessor: (r) => r.country,
              },
              {
                key: 'status',
                label: 'Status',
                type: 'select',
                options: toOptions(detailRows.map((r) => r.status)),
                accessor: (r) => r.status,
              },
              {
                key: 'netProfit',
                label: 'Net Profit (PKR)',
                type: 'numberRange',
                accessor: (r) => r.netProfitPKR,
              },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
