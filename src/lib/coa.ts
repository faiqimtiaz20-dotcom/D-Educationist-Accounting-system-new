import type { AccountNode, Currency } from '@/types'

/** Leaf-account codes used by the GL posting engine */
export const GL_ACCOUNTS = {
  CASH: '1110',
  BANK: '1120',
  AR: '1200',
  WHT_RECEIVABLE: '1210',
  INPUT_TAX: '1310',
  AP: '2100',
  TAX_PAYABLE: '2200',
  COMMISSION_INCOME: '4100',
  OTHER_INCOME: '4200',
  FX_GAIN: '4300',
  PAYROLL: '5300',
  OPERATING_EXPENSE: '5200',
  SALARY_PAYABLE: '2300',
} as const

export const DEFAULT_FX_RATES: Record<Currency, number> = {
  PKR: 1,
  GBP: 355,
  USD: 278,
  CAD: 205,
  AUD: 185,
  EUR: 300,
}

/** Chart of accounts template — balances computed from journal entries */
export const chartOfAccountsTemplate: AccountNode[] = [
  {
    id: 'a1', code: '1000', name: 'Assets', type: 'asset', balance: 0,
    children: [
      {
        id: 'a1-1', code: '1100', name: 'Cash & Bank', type: 'asset', balance: 0,
        children: [
          { id: 'a1-1-1', code: '1110', name: 'Cash in Hand', type: 'asset', balance: 0 },
          { id: 'a1-1-2', code: '1120', name: 'Bank Accounts', type: 'asset', balance: 0 },
        ],
      },
      { id: 'a1-2', code: '1200', name: 'Accounts Receivable', type: 'asset', balance: 0 },
      { id: 'a1-2-1', code: '1210', name: 'WHT Receivable', type: 'asset', balance: 0 },
      { id: 'a1-3', code: '1310', name: 'Input Tax Credit', type: 'asset', balance: 0 },
      { id: 'a1-4', code: '1300', name: 'Prepaid Expenses', type: 'asset', balance: 0 },
    ],
  },
  {
    id: 'a2', code: '2000', name: 'Liabilities', type: 'liability', balance: 0,
    children: [
      { id: 'a2-1', code: '2100', name: 'Accounts Payable', type: 'liability', balance: 0 },
      { id: 'a2-2', code: '2200', name: 'Tax Payable', type: 'liability', balance: 0 },
      { id: 'a2-3', code: '2300', name: 'Salary Payable', type: 'liability', balance: 0 },
    ],
  },
  { id: 'a3', code: '3000', name: 'Equity', type: 'equity', balance: 0 },
  {
    id: 'a4', code: '4000', name: 'Revenue', type: 'income', balance: 0,
    children: [
      { id: 'a4-1', code: '4100', name: 'Commission Income', type: 'income', balance: 0 },
      { id: 'a4-2', code: '4200', name: 'Other Income', type: 'income', balance: 0 },
      { id: 'a4-3', code: '4300', name: 'FX Gain', type: 'income', balance: 0 },
    ],
  },
  {
    id: 'a5', code: '5000', name: 'Expenses', type: 'expense', balance: 0,
    children: [
      { id: 'a5-1', code: '5100', name: 'Sub-Agent Commission', type: 'expense', balance: 0 },
      { id: 'a5-2', code: '5200', name: 'Operating Expenses', type: 'expense', balance: 0 },
      { id: 'a5-3', code: '5300', name: 'Payroll', type: 'expense', balance: 0 },
      { id: 'a5-4', code: '5400', name: 'Depreciation', type: 'expense', balance: 0 },
    ],
  },
]

export function findAccountName(code: string, nodes: AccountNode[] = chartOfAccountsTemplate): string {
  for (const node of nodes) {
    if (node.code === code) return node.name
    if (node.children) {
      const found = findAccountName(code, node.children)
      if (found) return found
    }
  }
  return code
}

export function findAccountType(code: string, nodes: AccountNode[] = chartOfAccountsTemplate): AccountNode['type'] | null {
  for (const node of nodes) {
    if (node.code === code) return node.type
    if (node.children) {
      const found = findAccountType(code, node.children)
      if (found) return found
    }
  }
  return null
}
