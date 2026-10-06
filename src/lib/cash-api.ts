import { apiFetch } from '@/lib/api-client'
import type {
  BankAccount,
  BankTransaction,
  Cheque,
  ContraEntry,
  Currency,
  Expense,
  PettyCashEntry,
  ReconciliationStatus,
} from '@/types'

export type ApiPettyCash = {
  id: string
  pettyCashNo: string
  branchId: string
  entryDate: string
  categoryId: string
  description: string
  entryType: 'in' | 'out'
  principal: string | number
  salesTax: string | number
  srbSst: string | number
  gst: string | number
  incomeTax: string | number
  total: string | number
  category?: { id: string; name: string }
}

export type ApiExpense = {
  id: string
  expenseNo: string
  branchId: string
  vendorId: string | null
  vendorName: string | null
  categoryId: string
  expenseDate: string
  principal: string | number
  salesTax: string | number
  srbSst: string | number
  gst: string | number
  incomeTax: string | number
  total: string | number
  paymentModeCode: string
  bankAccountId: string | null
  chequeId: string | null
  approvalStatus: 'Pending' | 'Approved' | 'Rejected'
  requestedById: string | null
  category?: { id: string; name: string }
  vendor?: { id: string; name: string } | null
  branch?: { id: string; code: string; name: string } | null
  cheque?: { id: string; chequeNo: string; status: string } | null
}

export type ApiBankAccountBalanced = {
  id: string
  branchId: string
  name: string
  bankName: string
  accountNo: string
  currencyCode: string
  openingBalance: string | number
  balance: number
  isActive: boolean
}

export type ApiBankTxn = {
  id: string
  bankAccountId: string
  txnDate: string
  txnType: 'deposit' | 'withdrawal' | 'transfer'
  description: string
  amount: string | number
  currencyCode: string
  reconciliationStatus: ReconciliationStatus
}

export type ApiCheque = {
  id: string
  chequeNo: string
  bankAccountId: string
  payee: string
  amount: string | number
  issueDate: string
  status: 'Issued' | 'Cleared' | 'Bounced'
  clearedDate: string | null
}

export type ApiContra = {
  id: string
  contraNo: string
  entryDate: string
  contraType: 'CashBank' | 'BankBank' | 'CashCash'
  fromBankAccountId: string | null
  toBankAccountId: string | null
  fromIsCash: boolean
  toIsCash: boolean
  amount: string | number
  branchId: string
  fromBankAccount?: { id: string; name: string } | null
  toBankAccount?: { id: string; name: string } | null
}

const CONTRA_TYPE_MAP: Record<ApiContra['contraType'], ContraEntry['type']> = {
  CashBank: 'Cash-Bank',
  BankBank: 'Bank-Bank',
  CashCash: 'Cash-Cash',
}

const PAYMENT_MODE_LABEL: Record<string, string> = {
  Cash: 'Cash',
  Bank: 'Bank Transfer',
  Cheque: 'Cheque',
  Online: 'Credit Card',
}

export function mapApiPettyCash(e: ApiPettyCash): PettyCashEntry {
  return {
    id: e.id,
    pettyCashNo: e.pettyCashNo,
    branchId: e.branchId,
    date: e.entryDate.slice(0, 10),
    category: e.category?.name ?? e.categoryId,
    description: e.description,
    type: e.entryType,
    principal: Number(e.principal),
    salesTax: Number(e.salesTax),
    srbSst: Number(e.srbSst),
    gst: Number(e.gst),
    incomeTax: Number(e.incomeTax),
    total: Number(e.total),
  }
}

export function mapApiExpense(e: ApiExpense): Expense {
  return {
    id: e.id,
    expenseNo: e.expenseNo,
    branchId: e.branchId,
    branchName: e.branch?.name,
    vendor: e.vendorName || e.vendor?.name || '—',
    category: e.category?.name ?? e.categoryId,
    date: e.expenseDate.slice(0, 10),
    principal: Number(e.principal),
    salesTax: Number(e.salesTax),
    srbSst: Number(e.srbSst),
    gst: Number(e.gst),
    incomeTax: Number(e.incomeTax),
    total: Number(e.total),
    paymentMode: PAYMENT_MODE_LABEL[e.paymentModeCode] ?? e.paymentModeCode,
    chequeNo: e.cheque?.chequeNo,
    approvalStatus: e.approvalStatus,
    requestedById: e.requestedById ?? undefined,
  }
}

export function mapApiBankAccount(a: ApiBankAccountBalanced): BankAccount {
  return {
    id: a.id,
    name: a.name,
    bankName: a.bankName,
    accountNo: a.accountNo,
    branchId: a.branchId,
    currency: a.currencyCode as Currency,
    balance: Number(a.balance),
    openingBalance: Number(a.openingBalance),
  }
}

export function mapApiBankTxn(t: ApiBankTxn): BankTransaction {
  return {
    id: t.id,
    bankAccountId: t.bankAccountId,
    date: t.txnDate.slice(0, 10),
    type: t.txnType,
    description: t.description,
    amount: Number(t.amount),
    currency: t.currencyCode as Currency,
    reconciliationStatus: t.reconciliationStatus,
  }
}

export function mapApiCheque(c: ApiCheque): Cheque {
  return {
    id: c.id,
    chequeNo: c.chequeNo,
    bankAccountId: c.bankAccountId,
    payee: c.payee,
    amount: Number(c.amount),
    date: c.issueDate.slice(0, 10),
    status: c.status,
  }
}

export function mapApiContra(c: ApiContra): ContraEntry {
  return {
    id: c.id,
    contraNo: c.contraNo,
    date: c.entryDate.slice(0, 10),
    type: CONTRA_TYPE_MAP[c.contraType],
    fromAccount: c.fromIsCash
      ? 'Cash in Hand'
      : (c.fromBankAccount?.name ?? 'Bank'),
    toAccount: c.toIsCash ? 'Cash in Hand' : (c.toBankAccount?.name ?? 'Bank'),
    amount: Number(c.amount),
    branchId: c.branchId,
  }
}

export function toPaymentModeCode(label: string): string {
  const map: Record<string, string> = {
    Cash: 'Cash',
    'Bank Transfer': 'Bank',
    Bank: 'Bank',
    Cheque: 'Cheque',
    'Credit Card': 'Online',
    Online: 'Online',
  }
  return map[label] ?? label
}

export function listPettyCash() {
  return apiFetch<ApiPettyCash[]>('/petty-cash')
}

export function createPettyCash(body: {
  branchId: string
  entryDate: string
  categoryId: string
  description: string
  entryType: 'in' | 'out'
  principal: number
  salesTax?: number
  srbSst?: number
  gst?: number
  incomeTax?: number
}) {
  return apiFetch<ApiPettyCash>('/petty-cash', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function deletePettyCash(id: string) {
  return apiFetch<{ success: boolean }>(`/petty-cash/${id}`, { method: 'DELETE' })
}

export function listExpenses() {
  return apiFetch<ApiExpense[]>('/expenses')
}

export function createExpense(body: {
  branchId: string
  vendorId?: string
  vendorName?: string
  categoryId: string
  expenseDate: string
  principal: number
  salesTax?: number
  srbSst?: number
  gst?: number
  incomeTax?: number
  paymentMode: string
  bankAccountId?: string
  chequeNo?: string
}) {
  return apiFetch<ApiExpense>('/expenses', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateExpense(
  id: string,
  body: Partial<{
    vendorName: string
    categoryId: string
    expenseDate: string
    principal: number
    salesTax: number
    srbSst: number
    gst: number
    incomeTax: number
    paymentMode: string
    bankAccountId: string
    chequeNo: string
  }>,
) {
  return apiFetch<ApiExpense>(`/expenses/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function approveExpense(id: string) {
  return apiFetch<ApiExpense>(`/expenses/${id}/approve`, { method: 'POST' })
}

export function rejectExpense(id: string) {
  return apiFetch<ApiExpense>(`/expenses/${id}/reject`, { method: 'POST' })
}

export function deleteExpense(id: string) {
  return apiFetch<{ success: boolean }>(`/expenses/${id}`, { method: 'DELETE' })
}

export function listBankBalances() {
  return apiFetch<ApiBankAccountBalanced[]>('/bank-accounts-balances')
}

export function listBankTransactions() {
  return apiFetch<ApiBankTxn[]>('/bank-transactions')
}

export function createBankTransaction(body: {
  bankAccountId: string
  txnDate: string
  txnType: 'deposit' | 'withdrawal' | 'transfer'
  description: string
  amount: number
  counterpartyBankAccountId?: string
  reconciliationStatus?: ReconciliationStatus
}) {
  return apiFetch<ApiBankTxn>('/bank-transactions', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateBankTransaction(
  id: string,
  body: { reconciliationStatus?: ReconciliationStatus; description?: string },
) {
  return apiFetch<ApiBankTxn>(`/bank-transactions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function listChequesApi() {
  return apiFetch<ApiCheque[]>('/cheques')
}

export function createCheque(body: {
  chequeNo: string
  bankAccountId: string
  payee: string
  amount: number
  issueDate: string
}) {
  return apiFetch<ApiCheque>('/cheques', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateChequeStatus(
  id: string,
  body: { status: 'Issued' | 'Cleared' | 'Bounced'; clearedDate?: string },
) {
  return apiFetch<ApiCheque>(`/cheques/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function listContraEntries() {
  return apiFetch<ApiContra[]>('/contra-entries')
}

export function createContraEntry(body: {
  branchId: string
  entryDate: string
  contraType: 'CashBank' | 'BankBank' | 'CashCash'
  amount: number
  fromBankAccountId?: string
  toBankAccountId?: string
  fromIsCash?: boolean
  toIsCash?: boolean
}) {
  return apiFetch<ApiContra>('/contra-entries', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
