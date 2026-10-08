import { ApiReportView } from '@/components/reports/ApiReportView'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { FilterPanel } from '@/components/shared/FilterPanel'
import { MetricCard } from '@/components/shared/MetricCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCurrentUser, useEffectiveBranchId } from '@/hooks/useAuth'
import { isApiMode } from '@/lib/api-client'
import { formatCurrency } from '@/lib/calculations'
import { canViewAllBranches } from '@/lib/permissions'
import { useDataStore } from '@/store/data-store'
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Eye,
  FileSpreadsheet,
  FileText,
  Printer,
  Wallet,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

type CashFlowCategory = 'Operating' | 'Investing' | 'Financing'

interface CashFlowSummary {
  key: CashFlowCategory
  category: CashFlowCategory
  inflow: number
  outflow: number
  net: number
  entryCount: number
}

interface CashFlowDetailRow {
  id: string
  date: string
  branchId: string
  branchName: string
  category: CashFlowCategory
  reference: string
  description: string
  inflow: number
  outflow: number
  net: number
}

export default function ConsolidatedCashFlowReportPage() {
  if (isApiMode()) return <ApiReportView slug="consolidated-cf" />
  return <ConsolidatedCashFlowReportPageLocal />
}

function ConsolidatedCashFlowReportPageLocal() {
  const user = useCurrentUser()
  const invoices = useDataStore((s) => s.invoices)
  const receivables = useDataStore((s) => s.receivables)
  const expenses = useDataStore((s) => s.expenses)
  const pettyCash = useDataStore((s) => s.pettyCash)
  const subAgentCommissions = useDataStore((s) => s.subAgentCommissions)
  const subAgentPayments = useDataStore((s) => s.subAgentPayments)
  const payrollRuns = useDataStore((s) => s.payrollRuns)
  const branches = useDataStore((s) => s.branches)
  const effectiveBranchId = useEffectiveBranchId()
  const isSuperAdmin = user ? canViewAllBranches(user) : false

  const [tab, setTab] = useState('summary')
  const [detailCategory, setDetailCategory] = useState<CashFlowCategory | null>(null)

  const branchName = (id: string) => branches.find((b) => b.id === id)?.name ?? id

  const scopedBranchIds = useMemo(() => {
    if (!isSuperAdmin && user) return [user.branchId]
    if (effectiveBranchId !== 'all') return [effectiveBranchId]
    return branches.map((b) => b.id)
  }, [isSuperAdmin, user, effectiveBranchId, branches])

  const invoiceBranchMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const inv of invoices) map.set(inv.id, inv.branchId)
    return map
  }, [invoices])

  const commissionBranchMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of subAgentCommissions) map.set(c.id, c.branchId)
    return map
  }, [subAgentCommissions])

  const detailRows = useMemo((): CashFlowDetailRow[] => {
    const rows: CashFlowDetailRow[] = []

    for (const rec of receivables) {
      const branchId = invoiceBranchMap.get(rec.invoiceId)
      if (!branchId || !scopedBranchIds.includes(branchId)) continue
      const amountPKR = rec.amountReceived * rec.exchangeRate
      rows.push({
        id: `rec-${rec.id}`,
        date: rec.receiptDate,
        branchId,
        branchName: branchName(branchId),
        category: 'Operating',
        reference: rec.receiptNo,
        description: 'Commission remittance received',
        inflow: amountPKR,
        outflow: 0,
        net: amountPKR,
      })
    }

    for (const exp of expenses) {
      if (exp.approvalStatus !== 'Approved') continue
      if (!scopedBranchIds.includes(exp.branchId)) continue
      rows.push({
        id: `exp-${exp.id}`,
        date: exp.date,
        branchId: exp.branchId,
        branchName: branchName(exp.branchId),
        category: 'Operating',
        reference: exp.expenseNo || exp.vendor,
        description: `Expense — ${exp.category}`,
        inflow: 0,
        outflow: exp.total,
        net: -exp.total,
      })
    }

    for (const entry of pettyCash) {
      if (!scopedBranchIds.includes(entry.branchId)) continue
      const isIn = entry.type === 'in'
      rows.push({
        id: `pc-${entry.id}`,
        date: entry.date,
        branchId: entry.branchId,
        branchName: branchName(entry.branchId),
        category: 'Operating',
        reference: entry.pettyCashNo || entry.category,
        description: `Petty cash ${entry.type} — ${entry.description}`,
        inflow: isIn ? entry.total : 0,
        outflow: isIn ? 0 : entry.total,
        net: isIn ? entry.total : -entry.total,
      })
    }

    for (const pay of subAgentPayments) {
      const branchId = commissionBranchMap.get(pay.commissionId)
      if (!branchId || !scopedBranchIds.includes(branchId)) continue
      rows.push({
        id: `sp-${pay.id}`,
        date: pay.paymentDate,
        branchId,
        branchName: branchName(branchId),
        category: 'Operating',
        reference: pay.paymentNo || pay.chequeNo || '—',
        description: 'Sub-agent payout',
        inflow: 0,
        outflow: pay.amountPKR,
        net: -pay.amountPKR,
      })
    }

    for (const run of payrollRuns) {
      if (run.status === 'Draft') continue
      if (!scopedBranchIds.includes(run.branchId)) continue
      const outflow = run.totalNet + run.totalReimbursements
      rows.push({
        id: `pr-${run.id}`,
        date: run.paidDate || run.runDate,
        branchId: run.branchId,
        branchName: branchName(run.branchId),
        category: 'Operating',
        reference: run.runNo || run.period,
        description: 'Payroll disbursement',
        inflow: 0,
        outflow,
        net: -outflow,
      })
    }

    return rows.sort((a, b) => b.date.localeCompare(a.date))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    receivables,
    expenses,
    pettyCash,
    subAgentPayments,
    payrollRuns,
    invoiceBranchMap,
    commissionBranchMap,
    scopedBranchIds,
    branches,
  ])

  const filteredDetails = useMemo(() => {
    if (!detailCategory) return detailRows
    return detailRows.filter((r) => r.category === detailCategory)
  }, [detailRows, detailCategory])

  const summaries = useMemo((): CashFlowSummary[] => {
    const categories: CashFlowCategory[] = ['Operating', 'Investing', 'Financing']
    return categories.map((category) => {
      const rows = detailRows.filter((r) => r.category === category)
      const inflow = rows.reduce((s, r) => s + r.inflow, 0)
      const outflow = rows.reduce((s, r) => s + r.outflow, 0)
      return {
        key: category,
        category,
        inflow,
        outflow,
        net: inflow - outflow,
        entryCount: rows.length,
      }
    })
  }, [detailRows])

  const totals = useMemo(() => {
    const source = detailCategory
      ? summaries.filter((s) => s.category === detailCategory)
      : summaries
    return {
      inflow: source.reduce((s, r) => s + r.inflow, 0),
      outflow: source.reduce((s, r) => s + r.outflow, 0),
      net: source.reduce((s, r) => s + r.net, 0),
    }
  }, [summaries, detailCategory])

  const toOptions = (values: string[]) =>
    [...new Set(values)].filter(Boolean).map((v) => ({ label: v, value: v }))

  const openCategoryDetails = (category: CashFlowCategory) => {
    setDetailCategory(category)
    setTab('detail')
  }

  const clearDetailFilter = () => setDetailCategory(null)

  const handleExport = (format: 'PDF' | 'Excel' | 'CSV') => {
    toast.success(`${format} export started`, {
      description: 'Consolidated Cash Flow report will download shortly.',
    })
  }

  const summaryColumns: Column<CashFlowSummary>[] = [
    { key: 'category', header: 'Category', cell: (r) => <span className="font-medium">{r.category}</span> },
    {
      key: 'count',
      header: 'Entries',
      cell: (r) => r.entryCount,
      className: 'text-right',
      sortAccessor: (r) => r.entryCount,
    },
    {
      key: 'inflow',
      header: 'Inflow (PKR)',
      cell: (r) => (
        <span className="tabular-nums text-emerald-700 dark:text-emerald-400">{formatCurrency(r.inflow)}</span>
      ),
      className: 'text-right',
      sortAccessor: (r) => r.inflow,
    },
    {
      key: 'outflow',
      header: 'Outflow (PKR)',
      cell: (r) => (
        <span className="tabular-nums text-orange-700 dark:text-orange-400">{formatCurrency(r.outflow)}</span>
      ),
      className: 'text-right',
      sortAccessor: (r) => r.outflow,
    },
    {
      key: 'net',
      header: 'Net Cash Flow',
      cell: (r) => (
        <span className={`font-semibold tabular-nums ${r.net >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-destructive'}`}>
          {formatCurrency(r.net)}
        </span>
      ),
      className: 'text-right',
      sortAccessor: (r) => r.net,
    },
    {
      key: 'actions',
      header: '',
      sortable: false,
      cell: (r) => (
        <Button variant="outline" size="sm" className="h-8" onClick={() => openCategoryDetails(r.category)}>
          <Eye className="mr-1 h-3.5 w-3.5" /> Details
        </Button>
      ),
    },
  ]

  const detailColumns: Column<CashFlowDetailRow>[] = [
    { key: 'date', header: 'Date', cell: (r) => r.date || '—' },
    { key: 'branch', header: 'Branch', cell: (r) => r.branchName },
    {
      key: 'category',
      header: 'Category',
      cell: (r) => <Badge variant="secondary">{r.category}</Badge>,
    },
    { key: 'reference', header: 'Reference', cell: (r) => <span className="font-mono text-xs">{r.reference}</span> },
    { key: 'description', header: 'Description', cell: (r) => r.description },
    {
      key: 'inflow',
      header: 'Inflow',
      cell: (r) => <span className="tabular-nums">{r.inflow ? formatCurrency(r.inflow) : '—'}</span>,
      className: 'text-right',
      sortAccessor: (r) => r.inflow,
    },
    {
      key: 'outflow',
      header: 'Outflow',
      cell: (r) => <span className="tabular-nums">{r.outflow ? formatCurrency(r.outflow) : '—'}</span>,
      className: 'text-right',
      sortAccessor: (r) => r.outflow,
    },
    {
      key: 'net',
      header: 'Net',
      cell: (r) => (
        <span className={`font-medium tabular-nums ${r.net >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-orange-700 dark:text-orange-400'}`}>
          {formatCurrency(r.net)}
        </span>
      ),
      className: 'text-right',
      sortAccessor: (r) => r.net,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consolidated Cash Flow"
        subtitle="Cash flow statement from remittances, expenses, petty cash, payroll, and payouts"
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

      <FilterPanel showCountry={false} showIntake={false} showUser={false} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard title="Total Inflow" value={formatCurrency(totals.inflow)} icon={ArrowUpCircle} accent="green" />
        <MetricCard title="Total Outflow" value={formatCurrency(totals.outflow)} icon={ArrowDownCircle} accent="orange" />
        <MetricCard
          title="Net Cash Flow"
          value={formatCurrency(totals.net)}
          icon={Wallet}
          accent={totals.net >= 0 ? 'green' : 'pink'}
        />
      </div>

      <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span className="text-muted-foreground">
          Formula: <strong className="text-foreground">Net = Inflow − Outflow</strong>
          {detailCategory && (
            <>
              {' · '}
              Viewing: <strong className="text-foreground">{detailCategory}</strong>
              <Button variant="link" className="ml-2 h-auto p-0 text-sm" onClick={clearDetailFilter}>
                Clear filter
              </Button>
            </>
          )}
        </span>
        <span>
          Net cash flow: <strong className="tabular-nums">{formatCurrency(totals.net)}</strong>
        </span>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="summary">By Category</TabsTrigger>
          <TabsTrigger value="detail">Transaction Detail</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-4">
          <DataTable
            data={summaries}
            columns={summaryColumns}
            searchPlaceholder="Search category..."
            searchFilter={(row, q) => row.category.toLowerCase().includes(q)}
            newestFirst={false}
          />
        </TabsContent>

        <TabsContent value="detail" className="mt-4">
          <DataTable
            data={filteredDetails}
            columns={detailColumns}
            searchPlaceholder="Search reference, description, or branch..."
            searchFilter={(row, q) =>
              row.reference.toLowerCase().includes(q) ||
              row.description.toLowerCase().includes(q) ||
              row.branchName.toLowerCase().includes(q) ||
              row.category.toLowerCase().includes(q)
            }
            filters={[
              {
                key: 'branch',
                label: 'Branch',
                type: 'select',
                options: toOptions(detailRows.map((r) => r.branchName)),
                accessor: (r) => r.branchName,
              },
              {
                key: 'category',
                label: 'Category',
                type: 'select',
                options: toOptions(detailRows.map((r) => r.category)),
                accessor: (r) => r.category,
              },
              {
                key: 'net',
                label: 'Net (PKR)',
                type: 'numberRange',
                accessor: (r) => r.net,
              },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
