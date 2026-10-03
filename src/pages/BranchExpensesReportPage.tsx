import { ApiReportView } from '@/components/reports/ApiReportView'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { FilterPanel } from '@/components/shared/FilterPanel'
import { MetricCard } from '@/components/shared/MetricCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusPill } from '@/components/shared/StatusPill'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getBranchName } from '@/data/branches'
import { getUserName } from '@/data/users'
import { useCurrentUser, useEffectiveBranchId } from '@/hooks/useAuth'
import { isApiMode } from '@/lib/api-client'
import { formatCurrency } from '@/lib/calculations'
import { canViewAllBranches } from '@/lib/permissions'
import { useDataStore } from '@/store/data-store'
import type { ApprovalStatus, Expense } from '@/types'
import { Eye, FileSpreadsheet, FileText, Printer, Receipt, ShoppingCart, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

interface BranchExpenseSummary {
  branchId: string
  branchName: string
  expenseCount: number
  total: number
  approved: number
  pending: number
  rejected: number
}

interface ExpenseDetailRow {
  id: string
  expenseNo: string
  date: string
  branchId: string
  branchName: string
  vendor: string
  category: string
  principal: number
  tax: number
  total: number
  paymentMode: string
  approvalStatus: ApprovalStatus
  requestedBy: string
}

export default function BranchExpensesReportPage() {
  if (isApiMode()) return <ApiReportView slug="branch-expenses" />
  return <BranchExpensesReportPageLocal />
}

function BranchExpensesReportPageLocal() {
  const user = useCurrentUser()
  const expenses = useDataStore((s) => s.expenses)
  const branches = useDataStore((s) => s.branches)
  const effectiveBranchId = useEffectiveBranchId()
  const isSuperAdmin = user ? canViewAllBranches(user.role) : false

  const [tab, setTab] = useState('summary')
  const [detailBranchId, setDetailBranchId] = useState<string | null>(null)

  const scopedExpenses = useMemo(() => {
    let rows = expenses
    if (!isSuperAdmin && user) {
      rows = rows.filter((e) => e.branchId === user.branchId)
    } else if (effectiveBranchId !== 'all') {
      rows = rows.filter((e) => e.branchId === effectiveBranchId)
    }
    return rows
  }, [expenses, isSuperAdmin, user, effectiveBranchId])

  const detailRows = useMemo((): ExpenseDetailRow[] => {
    return scopedExpenses.map((e: Expense) => ({
      id: e.id,
      expenseNo: e.expenseNo || '—',
      date: e.date,
      branchId: e.branchId,
      branchName: getBranchName(e.branchId),
      vendor: e.vendor,
      category: e.category,
      principal: e.principal,
      tax: e.salesTax + e.srbSst + e.gst + (e.incomeTax ?? 0),
      total: e.total,
      paymentMode: e.paymentMode,
      approvalStatus: e.approvalStatus,
      requestedBy: e.requestedById ? getUserName(e.requestedById) : '—',
    }))
  }, [scopedExpenses])

  const filteredDetails = useMemo(() => {
    if (!detailBranchId) return detailRows
    return detailRows.filter((r) => r.branchId === detailBranchId)
  }, [detailRows, detailBranchId])

  const summaries = useMemo((): BranchExpenseSummary[] => {
    const branchIds =
      isSuperAdmin && effectiveBranchId === 'all'
        ? branches.map((b) => b.id)
        : [...new Set(scopedExpenses.map((e) => e.branchId))]

    return branchIds
      .map((branchId) => {
        const rows = detailRows.filter((r) => r.branchId === branchId)
        return {
          branchId,
          branchName: getBranchName(branchId),
          expenseCount: rows.length,
          total: rows.reduce((s, r) => s + r.total, 0),
          approved: rows
            .filter((r) => r.approvalStatus === 'Approved')
            .reduce((s, r) => s + r.total, 0),
          pending: rows
            .filter((r) => r.approvalStatus === 'Pending')
            .reduce((s, r) => s + r.total, 0),
          rejected: rows
            .filter((r) => r.approvalStatus === 'Rejected')
            .reduce((s, r) => s + r.total, 0),
        }
      })
      .filter((s) => s.expenseCount > 0 || (isSuperAdmin && effectiveBranchId === 'all'))
      .sort((a, b) => b.total - a.total)
  }, [branches, scopedExpenses, detailRows, isSuperAdmin, effectiveBranchId])

  const totals = useMemo(() => {
    const source = detailBranchId ? filteredDetails : detailRows
    return {
      count: source.length,
      total: source.reduce((s, r) => s + r.total, 0),
      approved: source
        .filter((r) => r.approvalStatus === 'Approved')
        .reduce((s, r) => s + r.total, 0),
      pending: source
        .filter((r) => r.approvalStatus === 'Pending')
        .reduce((s, r) => s + r.total, 0),
    }
  }, [detailRows, filteredDetails, detailBranchId])

  const toOptions = (values: string[]) =>
    [...new Set(values)].filter(Boolean).map((v) => ({ label: v, value: v }))

  const openBranchDetails = (branchId: string) => {
    setDetailBranchId(branchId)
    setTab('detail')
  }

  const clearDetailFilter = () => {
    setDetailBranchId(null)
  }

  const handleExport = (format: 'PDF' | 'Excel' | 'CSV') => {
    toast.success(`${format} export started`, {
      description: 'Branch Expenses report will download shortly.',
    })
  }

  const summaryColumns: Column<BranchExpenseSummary>[] = [
    { key: 'branch', header: 'Branch', cell: (r) => <span className="font-medium">{r.branchName}</span> },
    {
      key: 'count',
      header: 'Expenses',
      cell: (r) => r.expenseCount,
      className: 'text-right',
      sortAccessor: (r) => r.expenseCount,
    },
    {
      key: 'total',
      header: 'Total (PKR)',
      cell: (r) => <span className="font-medium tabular-nums">{formatCurrency(r.total)}</span>,
      className: 'text-right',
      sortAccessor: (r) => r.total,
    },
    {
      key: 'approved',
      header: 'Approved',
      cell: (r) => <span className="tabular-nums">{formatCurrency(r.approved)}</span>,
      className: 'text-right',
      sortAccessor: (r) => r.approved,
    },
    {
      key: 'pending',
      header: 'Pending',
      cell: (r) => <span className="tabular-nums">{formatCurrency(r.pending)}</span>,
      className: 'text-right',
      sortAccessor: (r) => r.pending,
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

  const detailColumns: Column<ExpenseDetailRow>[] = [
    { key: 'expenseNo', header: 'Expense ID', cell: (r) => <span className="font-mono text-xs">{r.expenseNo}</span> },
    { key: 'date', header: 'Date', cell: (r) => r.date },
    { key: 'branch', header: 'Branch', cell: (r) => r.branchName },
    { key: 'vendor', header: 'Vendor', cell: (r) => r.vendor },
    { key: 'category', header: 'Category', cell: (r) => r.category },
    {
      key: 'principal',
      header: 'Principal',
      cell: (r) => <span className="tabular-nums">{formatCurrency(r.principal)}</span>,
      className: 'text-right',
      sortAccessor: (r) => r.principal,
    },
    {
      key: 'tax',
      header: 'Tax',
      cell: (r) => <span className="tabular-nums">{formatCurrency(r.tax)}</span>,
      className: 'text-right',
      sortAccessor: (r) => r.tax,
    },
    {
      key: 'total',
      header: 'Total (PKR)',
      cell: (r) => <span className="font-medium tabular-nums">{formatCurrency(r.total)}</span>,
      className: 'text-right',
      sortAccessor: (r) => r.total,
    },
    { key: 'paymentMode', header: 'Payment', cell: (r) => r.paymentMode },
    { key: 'requestedBy', header: 'Requested By', cell: (r) => r.requestedBy },
    { key: 'status', header: 'Status', cell: (r) => <StatusPill status={r.approvalStatus} /> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branch Expenses"
        subtitle="Expenses by branch — summary and transaction-level detail"
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
        <MetricCard title="Expenses" value={totals.count} icon={Receipt} accent="blue" />
        <MetricCard title="Total (PKR)" value={formatCurrency(totals.total)} icon={ShoppingCart} accent="orange" />
        <MetricCard title="Approved" value={formatCurrency(totals.approved)} icon={Wallet} accent="green" />
        <MetricCard title="Pending" value={formatCurrency(totals.pending)} icon={Wallet} accent="yellow" />
      </div>

      <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span className="text-muted-foreground">
          Category: <strong className="text-foreground">Branch</strong>
          {detailBranchId && (
            <>
              {' · '}
              Viewing: <strong className="text-foreground">{getBranchName(detailBranchId)}</strong>
              <Button variant="link" className="ml-2 h-auto p-0 text-sm" onClick={clearDetailFilter}>
                Clear filter
              </Button>
            </>
          )}
        </span>
        <span>
          Total: <strong className="tabular-nums">{formatCurrency(totals.total)}</strong>
        </span>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="summary">By Branch</TabsTrigger>
          <TabsTrigger value="detail">Expense Detail</TabsTrigger>
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
            searchPlaceholder="Search vendor, category, or branch..."
            searchFilter={(row, q) =>
              row.expenseNo.toLowerCase().includes(q) ||
              row.vendor.toLowerCase().includes(q) ||
              row.category.toLowerCase().includes(q) ||
              row.branchName.toLowerCase().includes(q) ||
              row.requestedBy.toLowerCase().includes(q)
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
                key: 'status',
                label: 'Status',
                type: 'select',
                options: toOptions(detailRows.map((r) => r.approvalStatus)),
                accessor: (r) => r.approvalStatus,
              },
              {
                key: 'total',
                label: 'Total (PKR)',
                type: 'numberRange',
                accessor: (r) => r.total,
              },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
