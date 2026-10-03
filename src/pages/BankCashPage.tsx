import { useMemo } from 'react'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { MetricCard } from '@/components/shared/MetricCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusPill } from '@/components/shared/StatusPill'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  bankAccounts as mockAccounts,
  bankTransactions as mockTxns,
  cheques as mockCheques,
  getBranchName,
} from '@/data'
import { useBranchFilter } from '@/hooks/useBranchFilter'
import { useCashApiSync } from '@/hooks/useCashApiSync'
import { formatCurrency } from '@/lib/calculations'
import { updateBankTransaction, updateChequeStatus } from '@/lib/cash-api'
import { branchFilterOptions, currencyFilterOptions } from '@/lib/filter-options'
import type { BankAccount, BankTransaction, Cheque } from '@/types'
import { Building2, CreditCard, FileCheck, Landmark } from 'lucide-react'
import { toast } from 'sonner'

export default function BankCashPage() {
  const { api, reload, banks, transactions, cheques } = useCashApiSync()
  const bankAccounts = api ? banks : mockAccounts
  const bankTransactions = api ? transactions : mockTxns
  const chequeList = api ? cheques : mockCheques

  const filteredAccounts = useBranchFilter(bankAccounts)
  const accountIds = new Set(filteredAccounts.map((a) => a.id))

  const filteredTransactions = bankTransactions.filter((t) => accountIds.has(t.bankAccountId))
  const filteredCheques = chequeList.filter((c) => accountIds.has(c.bankAccountId))
  const unmatched = filteredTransactions.filter((t) => t.reconciliationStatus === 'Unmatched')

  const totalBalance = filteredAccounts.reduce((s, a) => {
    if (a.currency === 'PKR') return s + a.balance
    return s
  }, 0)

  const markMatched = async (row: BankTransaction) => {
    if (!api || row.reconciliationStatus === 'Matched') return
    try {
      await updateBankTransaction(row.id, { reconciliationStatus: 'Matched' })
      await reload()
      toast.success('Marked matched')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    }
  }

  const clearCheque = async (row: Cheque) => {
    if (!api || row.status !== 'Issued') return
    try {
      await updateChequeStatus(row.id, {
        status: 'Cleared',
        clearedDate: new Date().toISOString().slice(0, 10),
      })
      await reload()
      toast.success('Cheque cleared')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    }
  }

  const accountColumns: Column<BankAccount>[] = [
    { key: 'name', header: 'Account Name', cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'bank', header: 'Bank', cell: (r) => r.bankName },
    { key: 'accountNo', header: 'Account No.', cell: (r) => r.accountNo },
    { key: 'branch', header: 'Branch', cell: (r) => getBranchName(r.branchId) },
    { key: 'currency', header: 'Currency', cell: (r) => r.currency },
    {
      key: 'balance',
      header: 'Balance',
      cell: (r) => <span className="font-semibold">{formatCurrency(r.balance, r.currency)}</span>,
      className: 'text-right',
    },
  ]

  const transactionColumns: Column<BankTransaction>[] = [
    { key: 'date', header: 'Date', cell: (r) => new Date(r.date).toLocaleDateString('en-PK') },
    {
      key: 'account',
      header: 'Account',
      cell: (r) => bankAccounts.find((a) => a.id === r.bankAccountId)?.name ?? r.bankAccountId,
    },
    {
      key: 'type',
      header: 'Type',
      cell: (r) => <span className="capitalize">{r.type}</span>,
    },
    { key: 'description', header: 'Description', cell: (r) => r.description },
    {
      key: 'amount',
      header: 'Amount',
      cell: (r) => (
        <span className={r.type === 'deposit' ? 'font-semibold text-emerald-600' : 'font-semibold'}>
          {r.type === 'deposit' ? '+' : '-'}{formatCurrency(r.amount, r.currency)}
        </span>
      ),
      className: 'text-right',
    },
    { key: 'status', header: 'Reconciliation', cell: (r) => <StatusPill status={r.reconciliationStatus} /> },
  ]

  const reconciliationColumns: Column<BankTransaction>[] = [
    { key: 'date', header: 'Date', cell: (r) => new Date(r.date).toLocaleDateString('en-PK') },
    {
      key: 'account',
      header: 'Account',
      cell: (r) => bankAccounts.find((a) => a.id === r.bankAccountId)?.name ?? r.bankAccountId,
    },
    { key: 'description', header: 'Description', cell: (r) => r.description },
    {
      key: 'amount',
      header: 'Amount',
      cell: (r) => formatCurrency(r.amount, r.currency),
      className: 'text-right',
    },
    { key: 'status', header: 'Status', cell: (r) => <StatusPill status={r.reconciliationStatus} /> },
    ...(api
      ? [
          {
            key: 'actions',
            header: 'Actions',
            cell: (r: BankTransaction) =>
              r.reconciliationStatus === 'Unmatched' ? (
                <Button size="sm" variant="outline" onClick={() => void markMatched(r)}>
                  Match
                </Button>
              ) : null,
          } satisfies Column<BankTransaction>,
        ]
      : []),
  ]

  const chequeColumns: Column<Cheque>[] = [
    { key: 'chequeNo', header: 'Cheque No.', cell: (r) => <span className="font-mono">{r.chequeNo}</span> },
    {
      key: 'account',
      header: 'Bank Account',
      cell: (r) => bankAccounts.find((a) => a.id === r.bankAccountId)?.name ?? r.bankAccountId,
    },
    { key: 'payee', header: 'Payee', cell: (r) => r.payee },
    { key: 'date', header: 'Date', cell: (r) => new Date(r.date).toLocaleDateString('en-PK') },
    {
      key: 'amount',
      header: 'Amount',
      cell: (r) => <span className="font-semibold">{formatCurrency(r.amount)}</span>,
      className: 'text-right',
    },
    { key: 'status', header: 'Status', cell: (r) => <StatusPill status={r.status} /> },
    ...(api
      ? [
          {
            key: 'actions',
            header: 'Actions',
            cell: (r: Cheque) =>
              r.status === 'Issued' ? (
                <Button size="sm" variant="outline" onClick={() => void clearCheque(r)}>
                  Clear
                </Button>
              ) : null,
          } satisfies Column<Cheque>,
        ]
      : []),
  ]

  const matchedCount = useMemo(
    () => filteredTransactions.filter((t) => t.reconciliationStatus === 'Matched').length,
    [filteredTransactions]
  )

  return (
    <div>
      <PageHeader
        title="Bank & Cash Management"
        subtitle="Accounts, transactions, reconciliation, and cheque register"
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="PKR Bank Balance" value={formatCurrency(totalBalance)} icon={Landmark} accent="blue" />
        <MetricCard title="Bank Accounts" value={filteredAccounts.length} icon={Building2} accent="green" />
        <MetricCard title="Unmatched Items" value={unmatched.length} icon={FileCheck} accent="orange" />
        <MetricCard title="Cheques Issued" value={filteredCheques.length} icon={CreditCard} accent="purple" />
      </div>

      <Tabs defaultValue="accounts">
        <TabsList>
          <TabsTrigger value="accounts">Bank Accounts</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
          <TabsTrigger value="cheques">Cheque Register</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts">
          <DataTable
            data={filteredAccounts}
            columns={accountColumns}
            searchPlaceholder="Search accounts..."
            searchFilter={(row, q) =>
              row.name.toLowerCase().includes(q) ||
              row.bankName.toLowerCase().includes(q) ||
              row.accountNo.includes(q)
            }
            filters={[
              { key: 'branch', label: 'Branch', type: 'select', options: branchFilterOptions, accessor: (r) => r.branchId },
              { key: 'currency', label: 'Currency', type: 'select', options: currencyFilterOptions, accessor: (r) => r.currency },
              { key: 'balance', label: 'Balance', type: 'numberRange', accessor: (r) => r.balance },
            ]}
          />
        </TabsContent>

        <TabsContent value="transactions">
          <DataTable
            data={filteredTransactions}
            columns={transactionColumns}
            searchPlaceholder="Search transactions..."
            searchFilter={(row, q) => row.description.toLowerCase().includes(q)}
            filters={[
              { key: 'type', label: 'Type', type: 'select', options: ['deposit', 'withdrawal', 'transfer'].map((t) => ({ label: t, value: t })), accessor: (r) => r.type },
              { key: 'recon', label: 'Reconciliation', type: 'select', options: ['Matched', 'Unmatched'].map((s) => ({ label: s, value: s })), accessor: (r) => r.reconciliationStatus },
              { key: 'date', label: 'Date', type: 'dateRange', accessor: (r) => r.date },
              { key: 'amount', label: 'Amount', type: 'numberRange', accessor: (r) => r.amount },
            ]}
          />
        </TabsContent>

        <TabsContent value="reconciliation">
          <div className="mb-4 rounded-lg border bg-muted/30 p-4 text-sm">
            <span className="font-medium">{matchedCount}</span> matched ·{' '}
            <span className="font-medium text-amber-600">{unmatched.length}</span> unmatched transactions
          </div>
          <DataTable
            data={filteredTransactions}
            columns={reconciliationColumns}
            searchPlaceholder="Search for reconciliation..."
            searchFilter={(row, q) => row.description.toLowerCase().includes(q)}
            filters={[
              { key: 'recon', label: 'Reconciliation', type: 'select', options: ['Matched', 'Unmatched'].map((s) => ({ label: s, value: s })), accessor: (r) => r.reconciliationStatus },
              { key: 'date', label: 'Date', type: 'dateRange', accessor: (r) => r.date },
              { key: 'amount', label: 'Amount', type: 'numberRange', accessor: (r) => r.amount },
            ]}
          />
        </TabsContent>

        <TabsContent value="cheques">
          <DataTable
            data={filteredCheques}
            columns={chequeColumns}
            searchPlaceholder="Search by cheque no. or payee..."
            searchFilter={(row, q) =>
              row.chequeNo.toLowerCase().includes(q) ||
              row.payee.toLowerCase().includes(q)
            }
            filters={[
              { key: 'status', label: 'Status', type: 'select', options: ['Issued', 'Cleared', 'Bounced'].map((s) => ({ label: s, value: s })), accessor: (r) => r.status },
              { key: 'date', label: 'Date', type: 'dateRange', accessor: (r) => r.date },
              { key: 'amount', label: 'Amount', type: 'numberRange', accessor: (r) => r.amount },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
