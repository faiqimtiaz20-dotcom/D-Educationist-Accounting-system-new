import { ApiReportView } from '@/components/reports/ApiReportView'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { FilterPanel } from '@/components/shared/FilterPanel'
import { MetricCard } from '@/components/shared/MetricCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusPill } from '@/components/shared/StatusPill'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { bankAccounts, bankTransactions } from '@/data/bankAccounts'
import { useCurrentUser, useEffectiveBranchId } from '@/hooks/useAuth'
import { isApiMode } from '@/lib/api-client'
import { formatCurrency } from '@/lib/calculations'
import { canViewAllBranches } from '@/lib/permissions'
import { useDataStore } from '@/store/data-store'
import {
  Building2,
  Eye,
  FileSpreadsheet,
  FileText,
  Printer,
  Wallet,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

interface BranchCashSummary {
  branchId: string
  branchName: string
  cashBalance: number
  bankBalancePKR: number
  bankAccounts: number
  totalPosition: number
  pettyCashEntries: number
}

type CashDetailType = 'Petty Cash' | 'Bank Account' | 'Bank Transaction'

interface BranchCashDetailRow {
  id: string
  date: string
  branchId: string
  branchName: string
  type: CashDetailType
  reference: string
  description: string
  currency: string
  amount: number
  amountPKR: number
  status: string
}

export default function BranchCashPositionReportPage() {
  if (isApiMode()) return <ApiReportView slug="branch-cash" />
  return <BranchCashPositionReportPageLocal />
}

function BranchCashPositionReportPageLocal() {
  const user = useCurrentUser()
  const pettyCash = useDataStore((s) => s.pettyCash)
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

  const scopedAccounts = useMemo(
    () => bankAccounts.filter((a) => scopedBranchIds.includes(a.branchId)),
    [scopedBranchIds]
  )

  const accountIds = useMemo(
    () => new Set(scopedAccounts.map((a) => a.id)),
    [scopedAccounts]
  )

  const detailRows = useMemo((): BranchCashDetailRow[] => {
    const rows: BranchCashDetailRow[] = []

    for (const entry of pettyCash) {
      if (!scopedBranchIds.includes(entry.branchId)) continue
      const signed = entry.type === 'in' ? entry.total : -entry.total
      rows.push({
        id: `pc-${entry.id}`,
        date: entry.date,
        branchId: entry.branchId,
        branchName: branchName(entry.branchId),
        type: 'Petty Cash',
        reference: entry.category,
        description: `${entry.type === 'in' ? 'In' : 'Out'} — ${entry.description}`,
        currency: 'PKR',
        amount: signed,
        amountPKR: signed,
        status: entry.type === 'in' ? 'In' : 'Out',
      })
    }

    for (const account of scopedAccounts) {
      rows.push({
        id: `ba-${account.id}`,
        date: '',
        branchId: account.branchId,
        branchName: branchName(account.branchId),
        type: 'Bank Account',
        reference: account.accountNo,
        description: `${account.name} (${account.bankName})`,
        currency: account.currency,
        amount: account.balance,
        amountPKR: account.currency === 'PKR' ? account.balance : 0,
        status: 'Balance',
      })
    }

    for (const tx of bankTransactions) {
      if (!accountIds.has(tx.bankAccountId)) continue
      const account = bankAccounts.find((a) => a.id === tx.bankAccountId)
      if (!account) continue
      const signed =
        tx.type === 'deposit' ? tx.amount : tx.type === 'withdrawal' ? -tx.amount : tx.amount
      rows.push({
        id: `bt-${tx.id}`,
        date: tx.date,
        branchId: account.branchId,
        branchName: branchName(account.branchId),
        type: 'Bank Transaction',
        reference: account.name,
        description: `${tx.type} — ${tx.description}`,
        currency: tx.currency,
        amount: signed,
        amountPKR: tx.currency === 'PKR' ? signed : 0,
        status: tx.reconciliationStatus,
      })
    }

    return rows.sort((a, b) => (b.date || '').localeCompare(a.date || '') || a.type.localeCompare(b.type))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pettyCash, scopedAccounts, accountIds, scopedBranchIds, branches])

  const filteredDetails = useMemo(() => {
    if (!detailBranchId) return detailRows
    return detailRows.filter((r) => r.branchId === detailBranchId)
  }, [detailRows, detailBranchId])

  const summaries = useMemo((): BranchCashSummary[] => {
    return scopedBranchIds
      .map((branchId) => {
        const branchPetty = pettyCash.filter((e) => e.branchId === branchId)
        const cashIn = branchPetty.filter((e) => e.type === 'in').reduce((s, e) => s + e.total, 0)
        const cashOut = branchPetty.filter((e) => e.type === 'out').reduce((s, e) => s + e.total, 0)
        const cashBalance = cashIn - cashOut

        const branchBankAccounts = bankAccounts.filter((a) => a.branchId === branchId)
        const bankBalancePKR = branchBankAccounts
          .filter((a) => a.currency === 'PKR')
          .reduce((s, a) => s + a.balance, 0)

        return {
          branchId,
          branchName: branchName(branchId),
          cashBalance,
          bankBalancePKR,
          bankAccounts: branchBankAccounts.length,
          totalPosition: cashBalance + bankBalancePKR,
          pettyCashEntries: branchPetty.length,
        }
      })
      .filter(
        (s) =>
          s.pettyCashEntries > 0 ||
          s.bankAccounts > 0 ||
          (isSuperAdmin && effectiveBranchId === 'all')
      )
      .sort((a, b) => b.totalPosition - a.totalPosition)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopedBranchIds, pettyCash, branches, isSuperAdmin, effectiveBranchId])

  const totals = useMemo(() => {
    const source = detailBranchId
      ? summaries.filter((s) => s.branchId === detailBranchId)
      : summaries
    return {
      cash: source.reduce((s, r) => s + r.cashBalance, 0),
      bank: source.reduce((s, r) => s + r.bankBalancePKR, 0),
      total: source.reduce((s, r) => s + r.totalPosition, 0),
      accounts: source.reduce((s, r) => s + r.bankAccounts, 0),
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
      description: 'Branch Cash Position report will download shortly.',
    })
  }

  const summaryColumns: Column<BranchCashSummary>[] = [
    { key: 'branch', header: 'Branch', cell: (r) => <span className="font-medium">{r.branchName}</span> },
    {
      key: 'cash',
      header: 'Cash (PKR)',
      cell: (r) => <span className="tabular-nums">{formatCurrency(r.cashBalance)}</span>,
      className: 'text-right',
      sortAccessor: (r) => r.cashBalance,
    },
    {
      key: 'bank',
      header: 'Bank PKR',
      cell: (r) => <span className="tabular-nums">{formatCurrency(r.bankBalancePKR)}</span>,
      className: 'text-right',
      sortAccessor: (r) => r.bankBalancePKR,
    },
    {
      key: 'accounts',
      header: 'Accounts',
      cell: (r) => r.bankAccounts,
      className: 'text-right',
      sortAccessor: (r) => r.bankAccounts,
    },
    {
      key: 'total',
      header: 'Total Position',
      cell: (r) => (
        <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
          {formatCurrency(r.totalPosition)}
        </span>
      ),
      className: 'text-right',
      sortAccessor: (r) => r.totalPosition,
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

  const detailColumns: Column<BranchCashDetailRow>[] = [
    { key: 'date', header: 'Date', cell: (r) => r.date || '—' },
    { key: 'branch', header: 'Branch', cell: (r) => r.branchName },
    {
      key: 'type',
      header: 'Type',
      cell: (r) => (
        <Badge
          variant="secondary"
          className={
            r.type === 'Petty Cash'
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
              : r.type === 'Bank Account'
                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                : 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300'
          }
        >
          {r.type}
        </Badge>
      ),
    },
    { key: 'reference', header: 'Reference', cell: (r) => <span className="font-mono text-xs">{r.reference}</span> },
    { key: 'description', header: 'Description', cell: (r) => r.description },
    { key: 'currency', header: 'Currency', cell: (r) => r.currency },
    {
      key: 'amount',
      header: 'Amount',
      cell: (r) => (
        <span className={`font-medium tabular-nums ${r.amount >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-orange-700 dark:text-orange-400'}`}>
          {formatCurrency(r.amount, r.currency)}
        </span>
      ),
      className: 'text-right',
      sortAccessor: (r) => r.amount,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => (r.status === 'In' || r.status === 'Out' || r.status === 'Balance'
        ? r.status
        : <StatusPill status={r.status} />),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branch Cash Position"
        subtitle="Cash and bank balances by branch — summary and account-level detail"
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
        <MetricCard title="Cash (PKR)" value={formatCurrency(totals.cash)} icon={Wallet} accent="blue" />
        <MetricCard title="Bank PKR" value={formatCurrency(totals.bank)} icon={Building2} accent="purple" />
        <MetricCard title="Bank Accounts" value={totals.accounts} icon={Building2} accent="orange" />
        <MetricCard title="Total Position" value={formatCurrency(totals.total)} icon={Wallet} accent="green" />
      </div>

      <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span className="text-muted-foreground">
          Category: <strong className="text-foreground">Branch</strong>
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
          Total position: <strong className="tabular-nums">{formatCurrency(totals.total)}</strong>
        </span>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="summary">By Branch</TabsTrigger>
          <TabsTrigger value="detail">Cash & Bank Detail</TabsTrigger>
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
            searchPlaceholder="Search account, description, or branch..."
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
                key: 'currency',
                label: 'Currency',
                type: 'select',
                options: toOptions(detailRows.map((r) => r.currency)),
                accessor: (r) => r.currency,
              },
              {
                key: 'amount',
                label: 'Amount',
                type: 'numberRange',
                accessor: (r) => r.amount,
              },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
