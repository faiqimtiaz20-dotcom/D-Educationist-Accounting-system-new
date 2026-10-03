import type { TaxRecord } from '@/types'

export const taxRecords: TaxRecord[] = [
  { id: 'tx1', type: 'WHT Receivable', period: 'Jul 2026', amount: 285000, branchId: 'ho' },
  { id: 'tx2', type: 'WHT Payable', period: 'Jul 2026', amount: 142500, branchId: 'ho' },
  { id: 'tx3', type: 'GST Input', period: 'Jul 2026', amount: 185000, branchId: 'khi' },
  { id: 'tx4', type: 'GST Output', period: 'Jul 2026', amount: 95000, branchId: 'ho' },
  { id: 'tx5', type: 'SRB-SST', period: 'Jul 2026', amount: 62000, branchId: 'khi' },
  { id: 'tx6', type: 'Salary Tax', period: 'Jul 2026', amount: 425000, branchId: 'ho' },
  { id: 'tx7', type: 'WHT Receivable', period: 'Jun 2026', amount: 312000, branchId: 'lhr' },
  { id: 'tx8', type: 'WHT Payable', period: 'Jun 2026', amount: 156000, branchId: 'lhr' },
  { id: 'tx9', type: 'GST Input', period: 'Jun 2026', amount: 198000, branchId: 'isb' },
  { id: 'tx10', type: 'SRB-SST', period: 'Jun 2026', amount: 58000, branchId: 'mul' },
]
