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
import type { AccountNode } from '@/types'
import {
  Building2,
  Eye,
  FileSpreadsheet,
  FileText,
  Landmark,
  Printer,
  Scale,
  Wallet,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

interface BSSectionSummary {
  key: string
  section: string
  accountCount: number
  balance: number
}

interface BSAccountRow {
  id: string
  code: string
  name: string
  section: string
  type: AccountNode['type']
  balance: number
}

interface BSJournalDetailRow {
  id: string
  date: string
  entryNo: string
  branchId: string
  branchName: string
  accountCode: string
  accountName: string
  description: string
  debit: number
  credit: number
  section: string
}

function flattenAccounts(nodes: AccountNode[], section?: string): BSAccountRow[] {
  const rows: BSAccountRow[] = []
  for (const node of nodes) {
    const currentSection = section ?? (
      node.type === 'asset' ? 'Assets'
        : node.type === 'liability' ? 'Liabilities'
          : node.type === 'equity' ? 'Equity'
            : node.type === 'income' ? 'Income'
              : 'Expenses'
    )
    if (node.children?.length) {
      rows.push(...flattenAccounts(node.children, currentSection))
    } else {
      rows.push({
        id: node.id,
        code: node.code,
        name: node.name,
        section: currentSection,
        type: node.type,
        balance: node.balance,
      })
    }
  }
  return rows
}

export default function ConsolidatedBalanceSheetReportPage() {
  if (isApiMode()) return <ApiReportView slug="consolidated-bs" />
  return <ConsolidatedBalanceSheetReportPageLocal />
}

function ConsolidatedBalanceSheetReportPageLocal() {
  const user = useCurrentUser()
  const journalEntries = useDataStore((s) => s.journalEntries)
  const getChartOfAccounts = useDataStore((s) => s.getChartOfAccounts)
  const reconcileGlPostings = useDataStore((s) => s.reconcileGlPostings)
  const branches = useDataStore((s) => s.branches)
  const effectiveBranchId = useEffectiveBranchId()
  const isSuperAdmin = user ? canViewAllBranches(user) : false

  const [tab, setTab] = useState('summary')
  const [detailSection, setDetailSection] = useState<string | null>(null)

  useEffect(() => {
    reconcileGlPostings()
  }, [reconcileGlPostings])

  const branchName = (id: string) => branches.find((b) => b.id === id)?.name ?? id

  const scopedJournals = useMemo(() => {
    let rows = journalEntries.filter((e) => e.approvalStatus === 'Approved' || e.isAutoPosted)
    if (!isSuperAdmin && user) {
      rows = rows.filter((e) => e.branchId === user.branchId)
    } else if (effectiveBranchId !== 'all') {
      rows = rows.filter((e) => e.branchId === effectiveBranchId)
    }
    return rows
  }, [journalEntries, isSuperAdmin, user, effectiveBranchId])

  const chartOfAccounts = useMemo(() => getChartOfAccounts(), [getChartOfAccounts, journalEntries])

  const accountRows = useMemo(() => {
    // Prefer full COA from store; when branch-scoped, rebuild balances from scoped journals only
    if (isSuperAdmin && effectiveBranchId === 'all') {
      return flattenAccounts(chartOfAccounts).filter((r) =>
        r.type === 'asset' || r.type === 'liability' || r.type === 'equity'
      )
    }

    // Branch-scoped: aggregate leaf balances from scoped journal lines
    const balanceMap = new Map<string, { name: string; type: AccountNode['type']; balance: number }>()
    const seed = flattenAccounts(chartOfAccounts)
    for (const a of seed) {
      if (a.type === 'asset' || a.type === 'liability' || a.type === 'equity') {
        balanceMap.set(a.code, { name: a.name, type: a.type, balance: 0 })
      }
    }
    for (const entry of scopedJournals) {
      for (const line of entry.lines) {
        const meta = balanceMap.get(line.accountCode)
        if (!meta) continue
        const delta =
          meta.type === 'asset' || meta.type === 'expense'
            ? line.debit - line.credit
            : line.credit - line.debit
        meta.balance += delta
      }
    }
    return Array.from(balanceMap.entries()).map(([code, meta]) => ({
      id: code,
      code,
      name: meta.name,
      section:
        meta.type === 'asset' ? 'Assets'
          : meta.type === 'liability' ? 'Liabilities'
            : 'Equity',
      type: meta.type,
      balance: meta.balance,
    }))
  }, [chartOfAccounts, scopedJournals, isSuperAdmin, effectiveBranchId])

  const summaries = useMemo((): BSSectionSummary[] => {
    const sections = ['Assets', 'Liabilities', 'Equity'] as const
    return sections.map((section) => {
      const rows = accountRows.filter((r) => r.section === section)
      return {
        key: section,
        section,
        accountCount: rows.filter((r) => Math.abs(r.balance) > 0.001).length,
        balance: rows.reduce((s, r) => s + r.balance, 0),
      }
    })
  }, [accountRows])

  const filteredAccounts = useMemo(() => {
    const rows = accountRows.filter((r) => Math.abs(r.balance) > 0.001 || !detailSection)
    if (!detailSection) return rows.filter((r) => Math.abs(r.balance) > 0.001)
    return rows.filter((r) => r.section === detailSection)
  }, [accountRows, detailSection])

  const journalDetails = useMemo((): BSJournalDetailRow[] => {
    const sectionByCode = new Map(accountRows.map((a) => [a.code, a.section]))
    const rows: BSJournalDetailRow[] = []
    for (const entry of scopedJournals) {
      for (const line of entry.lines) {
        const section = sectionByCode.get(line.accountCode)
        if (!section) continue
        if (detailSection && section !== detailSection) continue
        rows.push({
          id: `${entry.id}-${line.accountCode}-${line.debit}-${line.credit}`,
          date: entry.date,
          entryNo: entry.entryNo,
          branchId: entry.branchId,
          branchName: branchName(entry.branchId),
          accountCode: line.accountCode,
          accountName: line.accountName,
          description: entry.description,
          debit: line.debit,
          credit: line.credit,
          section,
        })
      }
    }
    return rows.sort((a, b) => b.date.localeCompare(a.date))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopedJournals, accountRows, detailSection, branches])

  const totals = useMemo(() => {
    const assets = summaries.find((s) => s.section === 'Assets')?.balance ?? 0
    const liabilities = summaries.find((s) => s.section === 'Liabilities')?.balance ?? 0
    const equity = summaries.find((s) => s.section === 'Equity')?.balance ?? 0
    return {
      assets,
      liabilities,
      equity,
      balanced: Math.abs(assets - (liabilities + equity)) < 1,
    }
  }, [summaries])

  const toOptions = (values: string[]) =>
    [...new Set(values)].filter(Boolean).map((v) => ({ label: v, value: v }))

  const openSectionDetails = (section: string) => {
    setDetailSection(section)
    setTab('accounts')
  }

  const clearDetailFilter = () => setDetailSection(null)

  const handleExport = (format: 'PDF' | 'Excel' | 'CSV') => {
    toast.success(`${format} export started`, {
      description: 'Consolidated Balance Sheet will download shortly.',
    })
  }

  const summaryColumns: Column<BSSectionSummary>[] = [
    { key: 'section', header: 'Section', cell: (r) => <span className="font-medium">{r.section}</span> },
    {
      key: 'count',
      header: 'Accounts',
      cell: (r) => r.accountCount,
      className: 'text-right',
      sortAccessor: (r) => r.accountCount,
    },
    {
      key: 'balance',
      header: 'Balance (PKR)',
      cell: (r) => <span className="font-semibold tabular-nums">{formatCurrency(r.balance)}</span>,
      className: 'text-right',
      sortAccessor: (r) => r.balance,
    },
    {
      key: 'actions',
      header: '',
      sortable: false,
      cell: (r) => (
        <Button variant="outline" size="sm" className="h-8" onClick={() => openSectionDetails(r.section)}>
          <Eye className="mr-1 h-3.5 w-3.5" /> Details
        </Button>
      ),
    },
  ]

  const accountColumns: Column<BSAccountRow>[] = [
    { key: 'code', header: 'Code', cell: (r) => <span className="font-mono text-xs">{r.code}</span> },
    { key: 'name', header: 'Account', cell: (r) => r.name },
    {
      key: 'section',
      header: 'Section',
      cell: (r) => (
        <Badge variant="secondary">{r.section}</Badge>
      ),
    },
    {
      key: 'balance',
      header: 'Balance (PKR)',
      cell: (r) => <span className="font-medium tabular-nums">{formatCurrency(r.balance)}</span>,
      className: 'text-right',
      sortAccessor: (r) => r.balance,
    },
  ]

  const journalColumns: Column<BSJournalDetailRow>[] = [
    { key: 'date', header: 'Date', cell: (r) => r.date },
    { key: 'entryNo', header: 'Entry', cell: (r) => <span className="font-mono text-xs">{r.entryNo}</span> },
    { key: 'branch', header: 'Branch', cell: (r) => r.branchName },
    { key: 'account', header: 'Account', cell: (r) => `${r.accountCode} — ${r.accountName}` },
    { key: 'description', header: 'Description', cell: (r) => r.description },
    {
      key: 'debit',
      header: 'Debit',
      cell: (r) => <span className="tabular-nums">{r.debit ? formatCurrency(r.debit) : '—'}</span>,
      className: 'text-right',
      sortAccessor: (r) => r.debit,
    },
    {
      key: 'credit',
      header: 'Credit',
      cell: (r) => <span className="tabular-nums">{r.credit ? formatCurrency(r.credit) : '—'}</span>,
      className: 'text-right',
      sortAccessor: (r) => r.credit,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consolidated Balance Sheet"
        subtitle="Overall balance sheet from GL — assets, liabilities, and equity"
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
        <MetricCard title="Assets" value={formatCurrency(totals.assets)} icon={Wallet} accent="blue" />
        <MetricCard title="Liabilities" value={formatCurrency(totals.liabilities)} icon={Landmark} accent="orange" />
        <MetricCard title="Equity" value={formatCurrency(totals.equity)} icon={Building2} accent="purple" />
        <MetricCard
          title="Equation"
          value={totals.balanced ? 'Balanced' : 'Check'}
          icon={Scale}
          accent={totals.balanced ? 'green' : 'pink'}
        />
      </div>

      <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span className="text-muted-foreground">
          Equation: <strong className="text-foreground">Assets = Liabilities + Equity</strong>
          {detailSection && (
            <>
              {' · '}
              Viewing: <strong className="text-foreground">{detailSection}</strong>
              <Button variant="link" className="ml-2 h-auto p-0 text-sm" onClick={clearDetailFilter}>
                Clear filter
              </Button>
            </>
          )}
        </span>
        <span>
          A {formatCurrency(totals.assets)} · L+E {formatCurrency(totals.liabilities + totals.equity)}
        </span>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="summary">By Section</TabsTrigger>
          <TabsTrigger value="accounts">Account Detail</TabsTrigger>
          <TabsTrigger value="journals">Journal Detail</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-4">
          <DataTable
            data={summaries}
            columns={summaryColumns}
            searchPlaceholder="Search section..."
            searchFilter={(row, q) => row.section.toLowerCase().includes(q)}
            newestFirst={false}
          />
        </TabsContent>

        <TabsContent value="accounts" className="mt-4">
          <DataTable
            data={filteredAccounts}
            columns={accountColumns}
            searchPlaceholder="Search account code or name..."
            searchFilter={(row, q) =>
              row.code.toLowerCase().includes(q) ||
              row.name.toLowerCase().includes(q) ||
              row.section.toLowerCase().includes(q)
            }
            filters={[
              {
                key: 'section',
                label: 'Section',
                type: 'select',
                options: toOptions(accountRows.map((r) => r.section)),
                accessor: (r) => r.section,
              },
              {
                key: 'balance',
                label: 'Balance (PKR)',
                type: 'numberRange',
                accessor: (r) => r.balance,
              },
            ]}
            newestFirst={false}
          />
        </TabsContent>

        <TabsContent value="journals" className="mt-4">
          <DataTable
            data={journalDetails}
            columns={journalColumns}
            searchPlaceholder="Search entry, account, or description..."
            searchFilter={(row, q) =>
              row.entryNo.toLowerCase().includes(q) ||
              row.accountCode.toLowerCase().includes(q) ||
              row.accountName.toLowerCase().includes(q) ||
              row.description.toLowerCase().includes(q) ||
              row.branchName.toLowerCase().includes(q)
            }
            filters={[
              {
                key: 'branch',
                label: 'Branch',
                type: 'select',
                options: toOptions(journalDetails.map((r) => r.branchName)),
                accessor: (r) => r.branchName,
              },
              {
                key: 'section',
                label: 'Section',
                type: 'select',
                options: toOptions(journalDetails.map((r) => r.section)),
                accessor: (r) => r.section,
              },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
