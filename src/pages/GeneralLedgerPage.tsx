import { DataTable, type Column } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageDataSkeleton } from '@/components/shared/PageDataSkeleton'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useAccountingApiSync } from '@/hooks/useAccountingApiSync'
import { formatCurrency } from '@/lib/calculations'
import { getTrialBalance, sumBalance } from '@/lib/gl'
import {
  getGlAccountActivity,
  mapGlActivityEntries,
} from '@/lib/journals-api'
import { cn } from '@/lib/utils'
import { useDataStore } from '@/store/data-store'
import type { AccountNode, JournalEntry, LedgerEntry } from '@/types'
import { ChevronDown, ChevronRight, Eye } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

const typeColors: Record<AccountNode['type'], string> = {
  asset: 'text-blue-600 dark:text-blue-400',
  liability: 'text-orange-600 dark:text-orange-400',
  equity: 'text-purple-600 dark:text-purple-400',
  income: 'text-emerald-600 dark:text-emerald-400',
  expense: 'text-red-600 dark:text-red-600',
}

function buildLocalAccountActivity(
  code: string,
  accountType: AccountNode['type'],
  journals: JournalEntry[],
): { entries: LedgerEntry[]; closingBalance: number } {
  const posted = journals
    .filter((e) => e.approvalStatus === 'Approved')
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date) || a.entryNo.localeCompare(b.entryNo))

  const isDebitNormal = accountType === 'asset' || accountType === 'expense'
  let running = 0
  const entries: LedgerEntry[] = []

  for (const je of posted) {
    for (const line of je.lines) {
      if (line.accountCode !== code) continue
      running =
        Math.round(
          (running +
            (isDebitNormal
              ? line.debit - line.credit
              : line.credit - line.debit)) *
            100,
        ) / 100
      entries.push({
        id: `${je.id}-${line.accountCode}-${entries.length}`,
        date: je.date,
        description: je.description,
        debit: line.debit,
        credit: line.credit,
        reference: je.entryNo,
        balance: running,
      })
    }
  }

  return { entries, closingBalance: running }
}

function AccountTreeNode({
  node,
  depth = 0,
  onOpenActivity,
}: {
  node: AccountNode
  depth?: number
  onOpenActivity: (node: AccountNode) => void
}) {
  const [expanded, setExpanded] = useState(depth < 2)
  const hasChildren = Boolean(node.children?.length)
  const balance = sumBalance(node)
  const canViewActivity = !hasChildren

  return (
    <div>
      <div
        className={cn(
          'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted/60',
          canViewActivity && 'cursor-pointer',
        )}
        style={{ paddingLeft: `${depth * 20 + 12}px` }}
      >
        <button
          type="button"
          className="shrink-0"
          onClick={() => hasChildren && setExpanded((e) => !e)}
          aria-label={hasChildren ? (expanded ? 'Collapse' : 'Expand') : undefined}
          disabled={!hasChildren}
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )
          ) : (
            <span className="inline-block w-4" />
          )}
        </button>
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          onClick={() => {
            if (hasChildren) setExpanded((e) => !e)
            else onOpenActivity(node)
          }}
        >
          <span className="w-14 shrink-0 font-mono text-xs text-muted-foreground">
            {node.code}
          </span>
          <span className="min-w-0 flex-1 truncate font-medium">{node.name}</span>
          {canViewActivity ? (
            <Eye className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          ) : null}
          <span
            className={cn('w-20 shrink-0 text-xs capitalize', typeColors[node.type])}
          >
            {node.type}
          </span>
          <span className="w-32 shrink-0 text-right font-mono text-sm">
            {formatCurrency(balance)}
          </span>
        </button>
      </div>
      {hasChildren && expanded && (
        <div>
          {node.children!.map((child) => (
            <AccountTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              onOpenActivity={onOpenActivity}
            />
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

  const [selected, setSelected] = useState<AccountNode | null>(null)
  const [activityLoading, setActivityLoading] = useState(false)
  const [activityRows, setActivityRows] = useState<LedgerEntry[]>([])
  const [closingBalance, setClosingBalance] = useState(0)

  useEffect(() => {
    if (!api) reconcileGlPostings()
  }, [api, reconcileGlPostings])

  const chartOfAccounts = useMemo(
    () => (api && coa ? coa : getChartOfAccounts()),
    [api, coa, getChartOfAccounts, journalEntries],
  )
  const trialBalance = useMemo(() => getTrialBalance(journalEntries), [journalEntries])

  const totals = useMemo(() => {
    const assets = chartOfAccounts
      .filter((a) => a.type === 'asset')
      .reduce((s, a) => s + sumBalance(a), 0)
    const liabilities = chartOfAccounts
      .filter((a) => a.type === 'liability')
      .reduce((s, a) => s + sumBalance(a), 0)
    const equity = chartOfAccounts
      .filter((a) => a.type === 'equity')
      .reduce((s, a) => s + sumBalance(a), 0)
    const income = chartOfAccounts
      .filter((a) => a.type === 'income')
      .reduce((s, a) => s + sumBalance(a), 0)
    const expense = chartOfAccounts
      .filter((a) => a.type === 'expense')
      .reduce((s, a) => s + sumBalance(a), 0)
    return { assets, liabilities, equity, income, expense }
  }, [chartOfAccounts])

  const autoPostedCount = journalEntries.filter((e) => e.isAutoPosted).length

  const loadActivity = useCallback(
    async (node: AccountNode) => {
      setSelected(node)
      setActivityLoading(true)
      setActivityRows([])
      try {
        if (api) {
          const data = await getGlAccountActivity(node.code)
          setActivityRows(mapGlActivityEntries(data))
          setClosingBalance(data.closingBalance)
        } else {
          const local = buildLocalAccountActivity(
            node.code,
            node.type,
            journalEntries,
          )
          setActivityRows(local.entries)
          setClosingBalance(local.closingBalance)
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to load account activity',
        )
        setSelected(null)
      } finally {
        setActivityLoading(false)
      }
    },
    [api, journalEntries],
  )

  const columns: Column<LedgerEntry>[] = useMemo(
    () => [
      { key: 'date', header: 'Date', cell: (r) => r.date },
      {
        key: 'reference',
        header: 'JE No',
        cell: (r) => <span className="font-mono text-sm">{r.reference}</span>,
      },
      { key: 'description', header: 'Description', cell: (r) => r.description },
      {
        key: 'debit',
        header: 'Debit',
        className: 'text-right font-mono',
        cell: (r) => (r.debit > 0 ? formatCurrency(r.debit) : '—'),
      },
      {
        key: 'credit',
        header: 'Credit',
        className: 'text-right font-mono',
        cell: (r) => (r.credit > 0 ? formatCurrency(r.credit) : '—'),
      },
      {
        key: 'balance',
        header: 'Balance',
        className: 'text-right font-mono font-medium',
        cell: (r) => formatCurrency(r.balance),
      },
    ],
    [],
  )

  if (api && loading) return <PageDataSkeleton />

  return (
    <div>
      <PageHeader
        title="General Ledger"
        subtitle="Live chart of accounts — click an account to see posted transactions"
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
              <p className={cn('mt-1 text-lg font-bold', item.color)}>
                {formatCurrency(item.value)}
              </p>
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
              <AccountTreeNode
                key={node.id}
                node={node}
                onOpenActivity={(n) => void loadActivity(n)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Sheet
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      >
        <SheetContent
          side="right"
          className="flex w-full flex-col overflow-hidden sm:max-w-2xl"
        >
          <SheetHeader className="pr-8">
            <SheetTitle>
              {selected
                ? `${selected.code} · ${selected.name}`
                : 'Account activity'}
            </SheetTitle>
            {selected ? (
              <p className="text-sm text-muted-foreground capitalize">
                {selected.type} · Closing {formatCurrency(closingBalance)}
              </p>
            ) : null}
          </SheetHeader>
          <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
            {activityLoading ? (
              <PageDataSkeleton metrics={0} rows={6} />
            ) : activityRows.length === 0 ? (
              <EmptyState
                title="No posted transactions"
                description="This account has no approved journal lines yet."
              />
            ) : (
              <DataTable
                data={activityRows}
                columns={columns}
                searchPlaceholder="Search JE no or description…"
                searchFilter={(row, q) =>
                  row.description.toLowerCase().includes(q) ||
                  row.reference.toLowerCase().includes(q)
                }
                newestFirst={false}
                pageSize={20}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
