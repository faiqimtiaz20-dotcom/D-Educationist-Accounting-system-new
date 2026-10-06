import { useMemo, useState } from 'react'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageDataSkeleton } from '@/components/shared/PageDataSkeleton'
import { MetricCard } from '@/components/shared/MetricCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { RowActions } from '@/components/shared/RowActions'
import { StatusPill } from '@/components/shared/StatusPill'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  bankAccounts as mockAccounts,
  bankTransactions as mockTxns,
  cheques as mockCheques,
} from '@/data'
import { useBranchFilter } from '@/hooks/useBranchFilter'
import { useCashApiSync } from '@/hooks/useCashApiSync'
import { useModulePermission } from '@/hooks/usePermission'
import { useSubmitState } from '@/hooks/useSubmitState'
import { formatCurrency } from '@/lib/calculations'
import { updateBankTransaction, updateChequeStatus } from '@/lib/cash-api'
import { branchFilterOptions, currencyFilterOptions } from '@/lib/filter-options'
import {
  createBankAccount,
  deleteBankAccount,
  updateBankAccount,
} from '@/lib/masters-api'
import { getBranchName } from '@/lib/org'
import { useAppStore } from '@/store/app-store'
import { useDataStore } from '@/store/data-store'
import type { BankAccount, BankTransaction, Cheque, Currency } from '@/types'
import { Building2, CreditCard, FileCheck, Landmark } from 'lucide-react'
import { toast } from 'sonner'

const currencies: Currency[] = ['PKR', 'GBP', 'USD', 'CAD', 'AUD', 'EUR']

type BankForm = {
  branchId: string
  name: string
  bankName: string
  accountNo: string
  currency: Currency
  openingBalance: number
}

export default function BankCashPage() {
  const { canWrite } = useModulePermission('Bank & Cash')
  const { api, reload, banks, transactions, cheques, loading } = useCashApiSync()
  const branches = useDataStore((s) => s.branches)
  const selectedBranchId = useAppStore((s) => s.selectedBranchId)

  const bankAccounts = api ? banks : mockAccounts
  const bankTransactions = api ? transactions : mockTxns
  const chequeList = api ? cheques : mockCheques

  const filteredAccounts = useBranchFilter(bankAccounts)
  const accountIds = new Set(filteredAccounts.map((a) => a.id))

  const filteredTransactions = bankTransactions.filter((t) => accountIds.has(t.bankAccountId))
  const filteredCheques = chequeList.filter((c) => accountIds.has(c.bankAccountId))
  const unmatched = filteredTransactions.filter((t) => t.reconciliationStatus === 'Unmatched')

  const defaultBranchId =
    selectedBranchId === 'all'
      ? (branches.find((b) => b.code === 'KHI')?.id ?? branches[0]?.id ?? '')
      : selectedBranchId

  const emptyForm = (): BankForm => ({
    branchId: defaultBranchId,
    name: '',
    bankName: '',
    accountNo: '',
    currency: 'PKR',
    openingBalance: 0,
  })

  const [dialogOpen, setDialogOpen] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<BankForm>(emptyForm)
  const { submitting, runSubmit } = useSubmitState()

  const canManage = Boolean(api && canWrite)

  const totalBalance = filteredAccounts.reduce((s, a) => {
    if (a.currency === 'PKR') return s + a.balance
    return s
  }, 0)

  const openAdd = () => {
    setIsEdit(false)
    setEditId(null)
    setForm(emptyForm())
    setDialogOpen(true)
  }

  const openEdit = (row: BankAccount) => {
    setIsEdit(true)
    setEditId(row.id)
    setForm({
      branchId: row.branchId,
      name: row.name,
      bankName: row.bankName,
      accountNo: row.accountNo,
      currency: row.currency,
      openingBalance: row.openingBalance ?? 0,
    })
    setDialogOpen(true)
  }

  const handleDelete = async (row: BankAccount) => {
    if (!canManage) return
    if (!confirm(`Delete bank account "${row.name}"?`)) return
    try {
      await deleteBankAccount(row.id)
      await reload()
      toast.success('Bank account deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const handleSave = async () => {
    if (!canManage) return
    if (!form.name.trim() || !form.bankName.trim() || !form.accountNo.trim()) {
      toast.error('Name, bank, and account number are required')
      return
    }
    if (!form.branchId) {
      toast.error('Branch is required')
      return
    }
    await runSubmit(async () => {
      try {
        const body = {
          branchId: form.branchId,
          name: form.name.trim(),
          bankName: form.bankName.trim(),
          accountNo: form.accountNo.trim(),
          currencyCode: form.currency,
          openingBalance: Number(form.openingBalance) || 0,
        }
        if (isEdit && editId) {
          await updateBankAccount(editId, body)
          toast.success('Bank account updated')
        } else {
          await createBankAccount(body)
          toast.success('Bank account added')
        }
        setDialogOpen(false)
        await reload()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Save failed')
      }
    })
  }

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
    ...(canManage
      ? [
          {
            key: 'actions',
            header: 'Actions',
            cell: (r: BankAccount) => (
              <RowActions onEdit={() => openEdit(r)} onDelete={() => void handleDelete(r)} />
            ),
          } satisfies Column<BankAccount>,
        ]
      : []),
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

  if (api && loading) return <PageDataSkeleton />

  return (
    <div>
      <PageHeader
        title="Bank & Cash Management"
        subtitle="Accounts, transactions, reconciliation, and cheque register"
        actionLabel={canManage ? 'Add Bank Account' : undefined}
        onAction={canManage ? openAdd : undefined}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit Bank Account' : 'Add Bank Account'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Account Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. HBL Current – KHI"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Bank Name</Label>
                <Input
                  value={form.bankName}
                  onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                  placeholder="e.g. Habib Bank"
                />
              </div>
              <div className="space-y-2">
                <Label>Account No.</Label>
                <Input
                  value={form.accountNo}
                  onChange={(e) => setForm({ ...form, accountNo: e.target.value })}
                  placeholder="Account number"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Branch</Label>
                <Select
                  value={form.branchId || undefined}
                  onValueChange={(v) => setForm({ ...form, branchId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select
                  value={form.currency}
                  onValueChange={(v) => setForm({ ...form, currency: v as Currency })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Opening Balance</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.openingBalance}
                onChange={(e) => setForm({ ...form, openingBalance: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={() => void handleSave()} loading={submitting}>
                {isEdit ? 'Save' : 'Add Account'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
