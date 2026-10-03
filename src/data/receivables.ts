import type { Receivable, ReceivableAllocation } from '@/types'

export const receivables: Receivable[] = [
  { id: 'rec1', receiptNo: 'REC-2026-0001', invoiceId: 'inv1', bankAccountId: 'ba1', currency: 'GBP', amountReceived: 3000, exchangeRate: 355, receiptDate: '2026-04-20', reconciliationStatus: 'Matched', isPartial: true, notes: 'Installment 1' },
  { id: 'rec2', receiptNo: 'REC-2026-0002', invoiceId: 'inv3', bankAccountId: 'ba2', currency: 'CAD', amountReceived: 3500, exchangeRate: 205, receiptDate: '2026-05-05', reconciliationStatus: 'Matched', isPartial: true, notes: 'Partial remittance' },
  { id: 'rec3', receiptNo: 'REC-2026-0003', invoiceId: 'inv4', bankAccountId: 'ba1', currency: 'GBP', amountReceived: 2550, exchangeRate: 358, receiptDate: '2026-05-10', reconciliationStatus: 'Matched', isPartial: false },
  { id: 'rec4', receiptNo: 'REC-2026-0004', invoiceId: 'inv7', bankAccountId: 'ba3', currency: 'USD', amountReceived: 2500, exchangeRate: 278, receiptDate: '2026-05-25', reconciliationStatus: 'Unmatched', isPartial: true, notes: 'Installment 1' },
  { id: 'rec5', receiptNo: 'REC-2026-0005', invoiceId: 'inv8', bankAccountId: 'ba4', currency: 'AUD', amountReceived: 6300, exchangeRate: 185, receiptDate: '2026-06-01', reconciliationStatus: 'Matched', isPartial: false },
  { id: 'rec6', receiptNo: 'REC-2026-0006', invoiceId: 'inv11', bankAccountId: 'ba3', currency: 'USD', amountReceived: 5250, exchangeRate: 280, receiptDate: '2026-06-15', reconciliationStatus: 'Matched', isPartial: false },
  { id: 'rec7', receiptNo: 'REC-2026-0007', invoiceId: 'inv14', bankAccountId: 'ba3', currency: 'USD', amountReceived: 3000, exchangeRate: 279, receiptDate: '2026-06-25', reconciliationStatus: 'Unmatched', isPartial: true },
  { id: 'rec8', receiptNo: 'REC-2026-0008', invoiceId: 'inv18', bankAccountId: 'ba4', currency: 'AUD', amountReceived: 4000, exchangeRate: 186, receiptDate: '2026-07-05', reconciliationStatus: 'Matched', isPartial: true },
  { id: 'rec9', receiptNo: 'REC-2026-0009', invoiceId: 'inv1', bankAccountId: 'ba1', currency: 'GBP', amountReceived: 8500, exchangeRate: 360, receiptDate: '2026-07-08', reconciliationStatus: 'Matched', isPartial: false, notes: 'Final installment' },
  { id: 'rec10', receiptNo: 'REC-2026-0010', invoiceId: 'inv3', bankAccountId: 'ba2', currency: 'CAD', amountReceived: 2800, exchangeRate: 206, receiptDate: '2026-07-09', reconciliationStatus: 'Matched', isPartial: true },
  { id: 'rec11', receiptNo: 'REC-2026-0011', invoiceId: 'inv7', bankAccountId: 'ba3', currency: 'USD', amountReceived: 1800, exchangeRate: 277, receiptDate: '2026-07-09', reconciliationStatus: 'Unmatched', isPartial: true, notes: 'Installment 2' },
  { id: 'rec12', receiptNo: 'REC-2026-0012', invoiceId: 'bulk1', bankAccountId: 'ba1', currency: 'GBP', amountReceived: 12000, exchangeRate: 357, receiptDate: '2026-07-01', reconciliationStatus: 'Matched', isPartial: false, isBulkRemittance: true, allocationStatus: 'pending' },
]

export const receivableAllocations: ReceivableAllocation[] = [
  { id: 'ra1', receivableId: 'rec12', invoiceId: 'inv1', allocatedAmount: 4000, currency: 'GBP' },
  { id: 'ra2', receivableId: 'rec12', invoiceId: 'inv4', allocatedAmount: 3500, currency: 'GBP' },
  { id: 'ra3', receivableId: 'rec12', invoiceId: 'inv15', allocatedAmount: 4500, currency: 'GBP' },
]
