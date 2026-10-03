import type { BankAccount, BankTransaction, Cheque } from '@/types'

export const bankAccounts: BankAccount[] = [
  { id: 'ba1', name: 'GBP Collection Account', bankName: 'Standard Chartered', accountNo: '0123456789', branchId: 'ho', currency: 'GBP', balance: 45200 },
  { id: 'ba2', name: 'CAD Collection Account', bankName: 'HBL', accountNo: '0234567890', branchId: 'ho', currency: 'CAD', balance: 28500 },
  { id: 'ba3', name: 'USD Collection Account', bankName: 'MCB', accountNo: '0345678901', branchId: 'ho', currency: 'USD', balance: 67800 },
  { id: 'ba4', name: 'AUD Collection Account', bankName: 'UBL', accountNo: '0456789012', branchId: 'ho', currency: 'AUD', balance: 19200 },
  { id: 'ba5', name: 'PKR Operating Account', bankName: 'Meezan Bank', accountNo: '0567890123', branchId: 'ho', currency: 'PKR', balance: 12500000 },
  { id: 'ba6', name: 'Karachi Branch Account', bankName: 'HBL', accountNo: '0678901234', branchId: 'khi', currency: 'PKR', balance: 3200000 },
  { id: 'ba7', name: 'Lahore Branch Account', bankName: 'UBL', accountNo: '0789012345', branchId: 'lhr', currency: 'PKR', balance: 2100000 },
  { id: 'ba8', name: 'Petty Cash Bank', bankName: 'MCB', accountNo: '0890123456', branchId: 'ho', currency: 'PKR', balance: 850000 },
]

export const bankTransactions: BankTransaction[] = [
  { id: 'bt1', bankAccountId: 'ba1', date: '2026-07-08', type: 'deposit', description: 'University of Manchester commission', amount: 8500, currency: 'GBP', reconciliationStatus: 'Matched' },
  { id: 'bt2', bankAccountId: 'ba3', date: '2026-07-09', type: 'deposit', description: 'Arizona State partial payment', amount: 1800, currency: 'USD', reconciliationStatus: 'Unmatched' },
  { id: 'bt3', bankAccountId: 'ba5', date: '2026-07-09', type: 'withdrawal', description: 'Sub-agent payment - Global Edu', amount: 854200, currency: 'PKR', reconciliationStatus: 'Matched' },
  { id: 'bt4', bankAccountId: 'ba5', date: '2026-07-07', type: 'transfer', description: 'Transfer to Karachi branch', amount: 500000, currency: 'PKR', reconciliationStatus: 'Matched' },
  { id: 'bt5', bankAccountId: 'ba2', date: '2026-07-09', type: 'deposit', description: 'U of Toronto partial', amount: 2800, currency: 'CAD', reconciliationStatus: 'Matched' },
  { id: 'bt6', bankAccountId: 'ba4', date: '2026-07-05', type: 'deposit', description: 'Monash University commission', amount: 4000, currency: 'AUD', reconciliationStatus: 'Matched' },
  { id: 'bt7', bankAccountId: 'ba6', date: '2026-07-09', type: 'deposit', description: 'Student fee collection', amount: 150000, currency: 'PKR', reconciliationStatus: 'Unmatched' },
  { id: 'bt8', bankAccountId: 'ba5', date: '2026-07-01', type: 'withdrawal', description: 'Office rent payment', amount: 200000, currency: 'PKR', reconciliationStatus: 'Matched' },
]

export const cheques: Cheque[] = [
  { id: 'ch1', chequeNo: 'CHQ-4521', bankAccountId: 'ba5', payee: 'Global Edu Partners', amount: 854200, date: '2026-05-01', status: 'Cleared' },
  { id: 'ch2', chequeNo: 'CHQ-4522', bankAccountId: 'ba5', payee: 'Global Edu Partners', amount: 639030, date: '2026-05-15', status: 'Cleared' },
  { id: 'ch3', chequeNo: 'CHQ-4523', bankAccountId: 'ba5', payee: 'Future Path Consultants', amount: 1165500, date: '2026-06-10', status: 'Cleared' },
  { id: 'ch4', chequeNo: 'CHQ-4524', bankAccountId: 'ba5', payee: 'EduBridge Pakistan', amount: 559650, date: '2026-06-20', status: 'Issued' },
  { id: 'ch5', chequeNo: 'CHQ-4525', bankAccountId: 'ba5', payee: 'Global Edu Partners', amount: 1176000, date: '2026-06-28', status: 'Cleared' },
  { id: 'ch6', chequeNo: 'CHQ-4526', bankAccountId: 'ba5', payee: 'Rent Properties', amount: 200000, date: '2026-07-01', status: 'Cleared' },
  { id: 'ch7', chequeNo: 'CHQ-4527', bankAccountId: 'ba7', payee: 'Office Mart', amount: 56250, date: '2026-07-09', status: 'Issued' },
]
