import { PageHeader } from '@/components/shared/PageHeader'
import { PageDataSkeleton } from '@/components/shared/PageDataSkeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAccountingApiSync } from '@/hooks/useAccountingApiSync'
import { formatCurrency } from '@/lib/calculations'
import { getTrialBalance, sumBalance } from '@/lib/gl'
import { cn } from '@/lib/utils'
import { useDataStore } from '@/store/data-store'
import type { AccountNode } from '@/types'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

const typeColors: Record<AccountNode['type'], string> = {
  asset: 'text-blue-600 dark:text-blue-400',
  liability: 'text-orange-600 dark:text-orange-400',
  equity: 'text-purple-600 dark:text-purple-400',
  income: 'text-emerald-600 dark:text-emerald-400',
  expense: 'text-red-600 dark:text-red-600',
}

function AccountTreeNode({ node, depth = 0 }: { node: AccountNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2)
  const hasChildren = Boolean(node.children?.length)
  const balance = sumBalance(node)

  return (
    <div>
      <button
        type="button"
        onClick={() => hasChildren && setExpanded((e) => !e)}
        className={cn(
          'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted/60',
          !hasChildren && 'cursor-default'
        )}
        style={{ paddingLeft: `${depth * 20 + 12}px` }}
      >
        {hasChildren ? (
          expanded ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <span className="w-14 shrink-0 font-mono text-xs text-muted-foreground">{node.code}</span>
        <span className="flex-1 text-left font-medium">{node.name}</span>
        <span className={cn('w-20 shrink-0 text-xs capitalize', typeColors[node.type])}>{node.type}</span>
        <span className="w-32 shrink-0 text-right font-mono text-sm">{formatCurrency(balance)}</span>
      </button>
      {hasChildren && expanded && (
        <div>
          {node.children!.map((child) => (
            <AccountTreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function GeneralLedgerPage() {
  const { api, coa, loading } = useAccountingApiSync()
  const journalEntries = useDataStore((s) => s.journalEntries)
  const getChartOfAccounts = useDataStore((s) => s.getChartOfAccounts)
  const reconcileGlPostings = useDataStore((s) => s.reconcileGlPostings)

  useEffect(() => {
    if (!api) reconcileGlPostings()
  }, [api, reconcileGlPostings])

  const chartOfAccounts = useMemo(
    () => (api && coa ? coa : getChartOfAccounts()),
    [api, coa, getChartOfAccounts, journalEntries],
  )
  const trialBalance = useMemo(() => getTrialBalance(journalEntries), [journalEntries])

  const totals = useMemo(() => {
    const assets = chartOfAccounts.filter((a) => a.type === 'asset').reduce((s, a) => s + sumBalance(a), 0)
    const liabilities = chartOfAccounts.filter((a) => a.type === 'liability').reduce((s, a) => s + sumBalance(a), 0)
    const equity = chartOfAccounts.filter((a) => a.type === 'equity').reduce((s, a) => s + sumBalance(a), 0)
    const income = chartOfAccounts.filter((a) => a.type === 'income').reduce((s, a) => s + sumBalance(a), 0)
    const expense = chartOfAccounts.filter((a) => a.type === 'expense').reduce((s, a) => s + sumBalance(a), 0)
    return { assets, liabilities, equity, income, expense }
  }, [chartOfAccounts])

  const autoPostedCount = journalEntries.filter((e) => e.isAutoPosted).length

  if (api && loading) return <PageDataSkeleton />

  return (
    <div>
      <PageHeader
        title="General Ledger"
        subtitle="Live chart of accounts — balances derived from posted journal entries"
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge variant="outline">{journalEntries.length} journal entries</Badge>
        <Badge variant="secondary">{autoPostedCount} auto-posted</Badge>
        <Badge variant={trialBalance.balanced ? 'default' : 'destructive'}>
          Trial balance {trialBalance.balanced ? 'balanced' : 'out of balance'}
        </Badge>
      </div>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: 'Assets', value: totals.assets, color: 'text-blue-600' },
          { label: 'Liabilities', value: totals.liabilities, color: 'text-orange-600' },
          { label: 'Equity', value: totals.equity, color: 'text-purple-600' },
          { label: 'Income', value: totals.income, color: 'text-emerald-600' },
          { label: 'Expenses', value: totals.expense, color: 'text-red-600' },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className={cn('mt-1 text-lg font-bold', item.color)}>{formatCurrency(item.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Chart of Accounts</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 pb-2">
          <div className="min-w-[480px]">
          <div className="flex items-center gap-2 border-b px-4 py-2 text-xs font-medium text-muted-foreground">
            <span className="w-4" />
            <span className="w-14">Code</span>
            <span className="flex-1">Account Name</span>
            <span className="w-20">Type</span>
            <span className="w-32 text-right">Balance (PKR)</span>
          </div>
          {chartOfAccounts.map((node) => (
            <AccountTreeNode key={node.id} node={node} />
          ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
