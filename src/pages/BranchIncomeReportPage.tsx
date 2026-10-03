import { ApiReportView } from '@/components/reports/ApiReportView'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { FilterPanel } from '@/components/shared/FilterPanel'
import { MetricCard } from '@/components/shared/MetricCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusPill } from '@/components/shared/StatusPill'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getBranchName } from '@/data/branches'
import { useCurrentUser, useEffectiveBranchId } from '@/hooks/useAuth'
import { isApiMode } from '@/lib/api-client'
import { formatCurrency } from '@/lib/calculations'
import { invoiceAmountPKR } from '@/lib/gl-posting'
import { getInvoiceOutstanding, getInvoicePaid, getInvoiceTotal } from '@/lib/invoice'
import { canViewAllBranches } from '@/lib/permissions'
import { useDataStore } from '@/store/data-store'
import type { Invoice } from '@/types'
import { Banknote, Eye, FileSpreadsheet, FileText, Printer, Receipt, TrendingUp, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

interface BranchIncomeSummary {
  branchId: string
  branchName: string
  invoiceCount: number
  earnedPKR: number
  receivedPKR: number
  outstanding: number
}

interface IncomeDetailRow {
  id: string
  invoiceNo: string
  invoiceDate: string
  branchId: string
  branchName: string
  studentName: string
  university: string
  country: string
  currency: string
  commission: number
  earnedPKR: number
  received: number
  outstanding: number
  status: Invoice['status']
}

export default function BranchIncomeReportPage() {
  if (isApiMode()) return <ApiReportView slug="branch-income" />
  return <BranchIncomeReportPageLocal />
}

function BranchIncomeReportPageLocal() {
  const user = useCurrentUser()
  const invoices = useDataStore((s) => s.invoices)
  const students = useDataStore((s) => s.students)
  const receivables = useDataStore((s) => s.receivables)
  const branches = useDataStore((s) => s.branches)
  const effectiveBranchId = useEffectiveBranchId()
  const isSuperAdmin = user ? canViewAllBranches(user.role) : false

  const [tab, setTab] = useState('summary')
  const [detailBranchId, setDetailBranchId] = useState<string | null>(null)

  const scopedInvoices = useMemo(() => {
    let rows = invoices.filter((inv) => inv.status !== 'Draft')
    if (!isSuperAdmin && user) {
      rows = rows.filter((inv) => inv.branchId === user.branchId)
    } else if (effectiveBranchId !== 'all') {
      rows = rows.filter((inv) => inv.branchId === effectiveBranchId)
    }
    return rows
  }, [invoices, isSuperAdmin, user, effectiveBranchId])

  const detailRows = useMemo((): IncomeDetailRow[] => {
    return scopedInvoices.map((inv) => {
      const student = students.find((s) => s.id === inv.lines?.[0]?.studentId)
      const earnedPKR = invoiceAmountPKR(inv)
      const received = getInvoicePaid(receivables, inv.id)
      const outstanding = getInvoiceOutstanding(inv, receivables)
      return {
        id: inv.id,
        invoiceNo: inv.invoiceNo,
        invoiceDate: inv.invoiceDate,
        branchId: inv.branchId,
        branchName: getBranchName(inv.branchId),
        studentName: student
          ? (inv.lines.length > 1
            ? `${student.studentId} — ${student.name} +${inv.lines.length - 1}`
            : `${student.studentId} — ${student.name}`)
          : '—',
        university: student?.university
          ? (inv.lines.length > 1
            ? `${[...new Set(inv.lines.map((l) => students.find((s) => s.id === l.studentId)?.university).filter(Boolean))].join(', ')}`
            : student.university)
          : '—',
        country: student?.country ?? '—',
        currency: inv.currency,
        commission: getInvoiceTotal(inv),
        earnedPKR,
        received,
        outstanding,
        status: inv.status,
      }
    })
  }, [scopedInvoices, students, receivables])

  const filteredDetails = useMemo(() => {
    if (!detailBranchId) return detailRows
    return detailRows.filter((r) => r.branchId === detailBranchId)
  }, [detailRows, detailBranchId])

  const summaries = useMemo((): BranchIncomeSummary[] => {
    const branchIds =
      isSuperAdmin && effectiveBranchId === 'all'
        ? branches.map((b) => b.id)
        : [...new Set(scopedInvoices.map((i) => i.branchId))]

    return branchIds
      .map((branchId) => {
        const rows = detailRows.filter((r) => r.branchId === branchId)
        return {
          branchId,
          branchName: getBranchName(branchId),
          invoiceCount: rows.length,
          earnedPKR: rows.reduce((s, r) => s + r.earnedPKR, 0),
          receivedPKR: rows.reduce((s, r) => s + r.received, 0),
          outstanding: rows.reduce((s, r) => s + r.outstanding, 0),
        }
      })
      .filter((s) => s.invoiceCount > 0 || (isSuperAdmin && effectiveBranchId === 'all'))
      .sort((a, b) => b.earnedPKR - a.earnedPKR)
  }, [branches, scopedInvoices, detailRows, isSuperAdmin, effectiveBranchId])

  const totals = useMemo(() => {
    const source = detailBranchId ? filteredDetails : detailRows
    return {
      earned: source.reduce((s, r) => s + r.earnedPKR, 0),
      received: source.reduce((s, r) => s + r.received, 0),
      outstanding: source.reduce((s, r) => s + r.outstanding, 0),
      invoices: source.length,
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
      description: 'Branch Income report will download shortly.',
    })
  }

  const summaryColumns: Column<BranchIncomeSummary>[] = [
    { key: 'branch', header: 'Branch', cell: (r) => <span className="font-medium">{r.branchName}</span> },
    {
      key: 'invoices',
      header: 'Invoices',
      cell: (r) => r.invoiceCount,
      className: 'text-right',
      sortAccessor: (r) => r.invoiceCount,
    },
    {
      key: 'earned',
      header: 'Earned (PKR)',
      cell: (r) => <span className="font-medium tabular-nums">{formatCurrency(r.earnedPKR)}</span>,
      className: 'text-right',
      sortAccessor: (r) => r.earnedPKR,
    },
    {
      key: 'received',
      header: 'Received (PKR)',
      cell: (r) => <span className="tabular-nums">{formatCurrency(r.receivedPKR)}</span>,
      className: 'text-right',
      sortAccessor: (r) => r.receivedPKR,
    },
    {
      key: 'outstanding',
      header: 'Outstanding',
      cell: (r) => <span className="tabular-nums">{formatCurrency(r.outstanding)}</span>,
      className: 'text-right',
      sortAccessor: (r) => r.outstanding,
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

  const detailColumns: Column<IncomeDetailRow>[] = [
    { key: 'invoiceNo', header: 'Invoice', cell: (r) => <span className="font-mono text-xs">{r.invoiceNo}</span> },
    { key: 'date', header: 'Date', cell: (r) => r.invoiceDate },
    { key: 'branch', header: 'Branch', cell: (r) => r.branchName },
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
      key: 'earned',
      header: 'Earned (PKR)',
      cell: (r) => <span className="font-medium tabular-nums">{formatCurrency(r.earnedPKR)}</span>,
      className: 'text-right',
      sortAccessor: (r) => r.earnedPKR,
    },
    {
      key: 'received',
      header: 'Received',
      cell: (r) => <span className="tabular-nums">{formatCurrency(r.received)}</span>,
      className: 'text-right',
      sortAccessor: (r) => r.received,
    },
    {
      key: 'outstanding',
      header: 'Outstanding',
      cell: (r) => <span className="tabular-nums">{formatCurrency(r.outstanding)}</span>,
      className: 'text-right',
      sortAccessor: (r) => r.outstanding,
    },
    { key: 'status', header: 'Status', cell: (r) => <StatusPill status={r.status} /> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branch Income"
        subtitle="Income by branch for selected period — summary and invoice-level detail"
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
        <MetricCard title="Invoices" value={totals.invoices} icon={Receipt} accent="blue" />
        <MetricCard title="Earned (PKR)" value={formatCurrency(totals.earned)} icon={TrendingUp} accent="green" />
        <MetricCard title="Received (PKR)" value={formatCurrency(totals.received)} icon={Banknote} accent="purple" />
        <MetricCard title="Outstanding" value={formatCurrency(totals.outstanding)} icon={Wallet} accent="orange" />
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
          Total earned: <strong className="tabular-nums">{formatCurrency(totals.earned)}</strong>
        </span>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="summary">By Branch</TabsTrigger>
          <TabsTrigger value="detail">Invoice Detail</TabsTrigger>
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
            searchPlaceholder="Search invoice, student, or university..."
            searchFilter={(row, q) =>
              row.invoiceNo.toLowerCase().includes(q) ||
              row.studentName.toLowerCase().includes(q) ||
              row.university.toLowerCase().includes(q) ||
              row.branchName.toLowerCase().includes(q)
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
                key: 'status',
                label: 'Status',
                type: 'select',
                options: toOptions(detailRows.map((r) => r.status)),
                accessor: (r) => r.status,
              },
              {
                key: 'country',
                label: 'Country',
                type: 'select',
                options: toOptions(detailRows.map((r) => r.country)),
                accessor: (r) => r.country,
              },
              {
                key: 'earned',
                label: 'Earned (PKR)',
                type: 'numberRange',
                accessor: (r) => r.earnedPKR,
              },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
