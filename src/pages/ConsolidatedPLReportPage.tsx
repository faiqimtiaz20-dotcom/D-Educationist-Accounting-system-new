import { ApiReportView } from '@/components/reports/ApiReportView'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { FilterPanel } from '@/components/shared/FilterPanel'
import { MetricCard } from '@/components/shared/MetricCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusPill } from '@/components/shared/StatusPill'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCurrentUser, useEffectiveBranchId } from '@/hooks/useAuth'
import { isApiMode } from '@/lib/api-client'
import { formatCurrency, subAgentPayable } from '@/lib/calculations'
import { invoiceAmountPKR } from '@/lib/gl-posting'
import { canViewAllBranches } from '@/lib/permissions'
import { useDataStore } from '@/store/data-store'
import {
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

interface PLSummary {
  branchId: string
  branchName: string
  incomePKR: number
  expensesPKR: number
  subAgentCostPKR: number
  profitPKR: number
  invoiceCount: number
  expenseCount: number
}

type DetailType = 'Income' | 'Expense' | 'Sub-Agent Cost'

interface PLDetailRow {
  id: string
  date: string
  branchId: string
  branchName: string
  type: DetailType
  reference: string
  description: string
  amountPKR: number
  status: string
}

export default function ConsolidatedPLReportPage() {
  if (isApiMode()) return <ApiReportView slug="consolidated-pl" />
  return <ConsolidatedPLReportPageLocal />
}

function ConsolidatedPLReportPageLocal() {
  const user = useCurrentUser()
  const invoices = useDataStore((s) => s.invoices)
  const students = useDataStore((s) => s.students)
  const expenses = useDataStore((s) => s.expenses)
  const subAgentCommissions = useDataStore((s) => s.subAgentCommissions)
  const branches = useDataStore((s) => s.branches)
  const effectiveBranchId = useEffectiveBranchId()
  const isSuperAdmin = user ? canViewAllBranches(user) : false

  const [tab, setTab] = useState('summary')
  const [detailBranchId, setDetailBranchId] = useState<string | null>(null)

  const branchName = (id: string) => branches.find((b) => b.id === id)?.name ?? id

  const scopedBranchIds = useMemo(() => {
    if (!isSuperAdmin && user) return [user.branchId]
    if (effectiveBranchId !== 'all') return [effectiveBranchId]
    return branches.map((b) => b.id)
  }, [isSuperAdmin, user, effectiveBranchId, branches])

  const detailRows = useMemo((): PLDetailRow[] => {
    const rows: PLDetailRow[] = []

    for (const inv of invoices) {
      if (inv.status === 'Draft') continue
      if (!scopedBranchIds.includes(inv.branchId)) continue
      const names = (inv.lines ?? [])
        .map((l) => students.find((s) => s.id === l.studentId)?.name ?? 'Student')
        .join(', ')
      const unis = [...new Set(
        (inv.lines ?? [])
          .map((l) => students.find((s) => s.id === l.studentId)?.university)
          .filter(Boolean)
      )].join(', ')
      rows.push({
        id: `inv-${inv.id}`,
        date: inv.invoiceDate,
        branchId: inv.branchId,
        branchName: branchName(inv.branchId),
        type: 'Income',
        reference: inv.invoiceNo,
        description: `${names || 'Student'} — ${unis || 'University'}`,
        amountPKR: invoiceAmountPKR(inv),
        status: inv.status,
      })
    }

    for (const exp of expenses) {
      if (exp.approvalStatus === 'Rejected') continue
      if (!scopedBranchIds.includes(exp.branchId)) continue
      rows.push({
        id: `exp-${exp.id}`,
        date: exp.date,
        branchId: exp.branchId,
        branchName: branchName(exp.branchId),
        type: 'Expense',
        reference: exp.expenseNo || exp.vendor,
        description: `${exp.vendor} — ${exp.category}`,
        amountPKR: exp.total,
        status: exp.approvalStatus,
      })
    }

    for (const c of subAgentCommissions) {
      if (!scopedBranchIds.includes(c.branchId)) continue
      const student = students.find((s) => s.id === c.studentId)
      const inv = invoices.find((i) => i.id === c.invoiceId)
      rows.push({
        id: `sac-${c.id}`,
        date: inv?.invoiceDate ?? '',
        branchId: c.branchId,
        branchName: branchName(c.branchId),
        type: 'Sub-Agent Cost',
        reference: c.commissionNo || inv?.invoiceNo || c.invoiceId,
        description: `${student?.studentId ?? ''} ${student?.name ?? 'Student'} — sub-agent commission`.trim(),
        amountPKR: subAgentPayable(c.grossFee, c.rateGiven, c.exchangeRate, c.followOnBonus),
        status: c.status,
      })
    }

    return rows.sort((a, b) => b.date.localeCompare(a.date) || a.type.localeCompare(b.type))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoices, expenses, subAgentCommissions, students, scopedBranchIds, branches])

  const filteredDetails = useMemo(() => {
    if (!detailBranchId) return detailRows
    return detailRows.filter((r) => r.branchId === detailBranchId)
  }, [detailRows, detailBranchId])

  const summaries = useMemo((): PLSummary[] => {
    return scopedBranchIds
      .map((branchId) => {
        const rows = detailRows.filter((r) => r.branchId === branchId)
        const incomePKR = rows.filter((r) => r.type === 'Income').reduce((s, r) => s + r.amountPKR, 0)
        const expensesPKR = rows
          .filter((r) => r.type === 'Expense' && r.status === 'Approved')
          .reduce((s, r) => s + r.amountPKR, 0)
        const subAgentCostPKR = rows
          .filter((r) => r.type === 'Sub-Agent Cost')
          .reduce((s, r) => s + r.amountPKR, 0)
        return {
          branchId,
          branchName: branchName(branchId),
          incomePKR,
          expensesPKR,
          subAgentCostPKR,
          profitPKR: incomePKR - expensesPKR - subAgentCostPKR,
          invoiceCount: rows.filter((r) => r.type === 'Income').length,
          expenseCount: rows.filter((r) => r.type === 'Expense').length,
        }
      })
      .filter(
        (s) =>
          s.invoiceCount > 0 ||
          s.expenseCount > 0 ||
          s.subAgentCostPKR > 0 ||
          (isSuperAdmin && effectiveBranchId === 'all')
      )
      .sort((a, b) => b.profitPKR - a.profitPKR)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopedBranchIds, detailRows, branches, isSuperAdmin, effectiveBranchId])

  const totals = useMemo(() => {
    const source = detailBranchId
      ? summaries.filter((s) => s.branchId === detailBranchId)
      : summaries
    return {
      income: source.reduce((s, r) => s + r.incomePKR, 0),
      expenses: source.reduce((s, r) => s + r.expensesPKR, 0),
      subAgent: source.reduce((s, r) => s + r.subAgentCostPKR, 0),
      profit: source.reduce((s, r) => s + r.profitPKR, 0),
    }
  }, [summaries, detailBranchId])

  const toOptions = (values: string[]) =>
    [...new Set(values)].filter(Boolean).map((v) => ({ label: v, value: v }))

  const openBranchDetails = (branchId: string) => {
    setDetailBranchId(branchId)
    setTab('detail')
  }

  const clearDetailFilter = () => setDetailBranchId(null)

  const handleExport = (format: 'PDF' | 'Excel' | 'CSV') => {
    toast.success(`${format} export started`, {
      description: 'Consolidated P&L report will download shortly.',
    })
  }

  const summaryColumns: Column<PLSummary>[] = [
    { key: 'branch', header: 'Branch', cell: (r) => <span className="font-medium">{r.branchName}</span> },
    {
      key: 'income',
      header: 'Income (PKR)',
      cell: (r) => (
        <span className="tabular-nums text-emerald-700 dark:text-emerald-400">{formatCurrency(r.incomePKR)}</span>
      ),
      className: 'text-right',
      sortAccessor: (r) => r.incomePKR,
    },
    {
      key: 'expenses',
      header: 'Expenses (PKR)',
      cell: (r) => (
        <span className="tabular-nums text-orange-700 dark:text-orange-400">{formatCurrency(r.expensesPKR)}</span>
      ),
      className: 'text-right',
      sortAccessor: (r) => r.expensesPKR,
    },
    {
      key: 'subAgent',
      header: 'Sub-Agent Cost',
      cell: (r) => <span className="tabular-nums">{formatCurrency(r.subAgentCostPKR)}</span>,
      className: 'text-right',
      sortAccessor: (r) => r.subAgentCostPKR,
    },
    {
      key: 'profit',
      header: 'Profit / (Loss)',
      cell: (r) => (
        <span className={`font-semibold tabular-nums ${r.profitPKR >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-destructive'}`}>
          {formatCurrency(r.profitPKR)}
        </span>
      ),
      className: 'text-right',
      sortAccessor: (r) => r.profitPKR,
    },
    {
      key: 'actions',
      header: '',
      sortable: false,
      cell: (r) => (
        <Button variant="outline" size="sm" className="h-8" onClick={() => openBranchDetails(r.branchId)}>
          <Eye className="mr-1 h-3.5 w-3.5" /> Details
        </Button>
      ),
    },
  ]

  const detailColumns: Column<PLDetailRow>[] = [
    { key: 'date', header: 'Date', cell: (r) => r.date || '—' },
    { key: 'branch', header: 'Branch', cell: (r) => r.branchName },
    {
      key: 'type',
      header: 'Type',
      cell: (r) => (
        <Badge
          variant="secondary"
          className={
            r.type === 'Income'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
              : r.type === 'Expense'
                ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                : 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300'
          }
        >
          {r.type}
        </Badge>
      ),
    },
    { key: 'reference', header: 'Reference', cell: (r) => <span className="font-mono text-xs">{r.reference}</span> },
    { key: 'description', header: 'Description', cell: (r) => r.description },
    {
      key: 'amount',
      header: 'Amount (PKR)',
      cell: (r) => (
        <span className={`font-medium tabular-nums ${r.type === 'Income' ? 'text-emerald-700 dark:text-emerald-400' : 'text-orange-700 dark:text-orange-400'}`}>
          {r.type === 'Income' ? '+' : '−'}
          {formatCurrency(r.amountPKR)}
        </span>
      ),
      className: 'text-right',
      sortAccessor: (r) => r.amountPKR,
    },
    { key: 'status', header: 'Status', cell: (r) => <StatusPill status={r.status} /> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consolidated P&L"
        subtitle="All-branch profit and loss — income minus expenses and sub-agent cost"
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Income (PKR)" value={formatCurrency(totals.income)} icon={TrendingUp} accent="green" />
        <MetricCard title="Expenses (PKR)" value={formatCurrency(totals.expenses)} icon={TrendingDown} accent="orange" />
        <MetricCard title="Sub-Agent Cost" value={formatCurrency(totals.subAgent)} icon={Receipt} accent="pink" />
        <MetricCard
          title="Profit / (Loss)"
          value={formatCurrency(totals.profit)}
          icon={Wallet}
          accent={totals.profit >= 0 ? 'green' : 'pink'}
        />
      </div>

      <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span className="text-muted-foreground">
          Formula: <strong className="text-foreground">Profit = Income − Expenses − Sub-Agent Cost</strong>
          {detailBranchId && (
            <>
              {' · '}
              Viewing: <strong className="text-foreground">{branchName(detailBranchId)}</strong>
              <Button variant="link" className="ml-2 h-auto p-0 text-sm" onClick={clearDetailFilter}>
                Clear filter
              </Button>
            </>
          )}
        </span>
        <span>
          Consolidated profit: <strong className="tabular-nums">{formatCurrency(totals.profit)}</strong>
        </span>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="summary">By Branch</TabsTrigger>
          <TabsTrigger value="detail">Transaction Detail</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-4">
          <DataTable
            data={summaries}
            columns={summaryColumns}
            searchPlaceholder="Search branch..."
            searchFilter={(row, q) => row.branchName.toLowerCase().includes(q)}
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
              row.type.toLowerCase().includes(q)
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
                key: 'type',
                label: 'Type',
                type: 'select',
                options: toOptions(detailRows.map((r) => r.type)),
                accessor: (r) => r.type,
              },
              {
                key: 'status',
                label: 'Status',
                type: 'select',
                options: toOptions(detailRows.map((r) => r.status)),
                accessor: (r) => r.status,
              },
              {
                key: 'amount',
                label: 'Amount (PKR)',
                type: 'numberRange',
                accessor: (r) => r.amountPKR,
              },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
