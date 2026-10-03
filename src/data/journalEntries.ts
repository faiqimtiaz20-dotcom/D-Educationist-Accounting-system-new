import type { AccountNode, JournalEntry, ContraEntry } from '@/types'

export const chartOfAccounts: AccountNode[] = [
  { id: 'a1', code: '1000', name: 'Assets', type: 'asset', balance: 0, children: [
    { id: 'a1-1', code: '1100', name: 'Cash & Bank', type: 'asset', balance: 18950000, children: [
      { id: 'a1-1-1', code: '1110', name: 'Cash in Hand', type: 'asset', balance: 425000 },
      { id: 'a1-1-2', code: '1120', name: 'Bank Accounts', type: 'asset', balance: 18525000 },
    ]},
    { id: 'a1-2', code: '1200', name: 'Accounts Receivable', type: 'asset', balance: 8750000 },
    { id: 'a1-3', code: '1300', name: 'Prepaid Expenses', type: 'asset', balance: 350000 },
  ]},
  { id: 'a2', code: '2000', name: 'Liabilities', type: 'liability', balance: 0, children: [
    { id: 'a2-1', code: '2100', name: 'Accounts Payable', type: 'liability', balance: 4250000 },
    { id: 'a2-2', code: '2200', name: 'Tax Payable', type: 'liability', balance: 1850000 },
    { id: 'a2-3', code: '2300', name: 'Salary Payable', type: 'liability', balance: 920000 },
  ]},
  { id: 'a3', code: '3000', name: 'Equity', type: 'equity', balance: 15000000 },
  { id: 'a4', code: '4000', name: 'Revenue', type: 'income', balance: 0, children: [
    { id: 'a4-1', code: '4100', name: 'Commission Income', type: 'income', balance: 28500000 },
    { id: 'a4-2', code: '4200', name: 'Other Income', type: 'income', balance: 450000 },
  ]},
  { id: 'a5', code: '5000', name: 'Expenses', type: 'expense', balance: 0, children: [
    { id: 'a5-1', code: '5100', name: 'Sub-Agent Commission', type: 'expense', balance: 8200000 },
    { id: 'a5-2', code: '5200', name: 'Operating Expenses', type: 'expense', balance: 4500000 },
    { id: 'a5-3', code: '5300', name: 'Payroll', type: 'expense', balance: 9800000 },
  ]},
]

export const journalEntries: JournalEntry[] = [
  { id: 'je1', entryNo: 'JE-2026-001', date: '2026-07-01', branchId: 'ho', description: 'Monthly depreciation', lines: [{ accountCode: '5400', accountName: 'Depreciation', debit: 50000, credit: 0 }, { accountCode: '1500', accountName: 'Accumulated Depreciation', debit: 0, credit: 50000 }], approvalStatus: 'Approved', sourceType: 'Manual', isAutoPosted: false },
  { id: 'je2', entryNo: 'JE-2026-002', date: '2026-07-03', branchId: 'khi', description: 'Accrued commission income', lines: [{ accountCode: '1200', accountName: 'Accounts Receivable', debit: 1250000, credit: 0 }, { accountCode: '4100', accountName: 'Commission Income', debit: 0, credit: 1250000 }], approvalStatus: 'Approved', sourceType: 'Manual', isAutoPosted: false },
  { id: 'je3', entryNo: 'JE-2026-003', date: '2026-07-05', branchId: 'lhr', description: 'WHT provision', lines: [{ accountCode: '2200', accountName: 'Tax Payable', debit: 0, credit: 12500 }, { accountCode: '4100', accountName: 'Commission Income', debit: 12500, credit: 0 }], approvalStatus: 'Pending', sourceType: 'Manual', isAutoPosted: false },
  { id: 'je4', entryNo: 'JE-2026-004', date: '2026-07-07', branchId: 'isb', description: 'Prepaid insurance adjustment', lines: [{ accountCode: '5200', accountName: 'Insurance Expense', debit: 25000, credit: 0 }, { accountCode: '1300', accountName: 'Prepaid Expenses', debit: 0, credit: 25000 }], approvalStatus: 'Approved', sourceType: 'Manual', isAutoPosted: false },
  { id: 'je5', entryNo: 'JE-2026-005', date: '2026-07-09', branchId: 'ho', description: 'FX gain on GBP receipt', lines: [{ accountCode: '1120', accountName: 'Bank Accounts', debit: 45000, credit: 0 }, { accountCode: '4300', accountName: 'FX Gain', debit: 0, credit: 45000 }], approvalStatus: 'Pending', sourceType: 'Manual', isAutoPosted: false },
]

export const contraEntries: ContraEntry[] = [
  { id: 'ce1', contraNo: 'CE-2026-001', date: '2026-07-01', type: 'Cash-Bank', fromAccount: 'Cash in Hand', toAccount: 'PKR Operating Account', amount: 200000, branchId: 'khi' },
  { id: 'ce2', contraNo: 'CE-2026-002', date: '2026-07-05', type: 'Bank-Bank', fromAccount: 'PKR Operating Account', toAccount: 'Karachi Branch Account', amount: 500000, branchId: 'ho' },
  { id: 'ce3', contraNo: 'CE-2026-003', date: '2026-07-08', type: 'Bank-Bank', fromAccount: 'USD Collection Account', toAccount: 'PKR Operating Account', amount: 15000, branchId: 'ho' },
  { id: 'ce4', contraNo: 'CE-2026-004', date: '2026-07-09', type: 'Cash-Cash', fromAccount: 'Petty Cash KHI', toAccount: 'Petty Cash LHR', amount: 25000, branchId: 'ho' },
]
