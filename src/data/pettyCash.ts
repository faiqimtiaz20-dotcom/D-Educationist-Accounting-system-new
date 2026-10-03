import type { PettyCashEntry } from '@/types'
import { pettyCashTotal } from '@/lib/calculations'

const entries: Omit<PettyCashEntry, 'total'>[] = [
  { id: 'pc1', pettyCashNo: 'PC-KHI-2026-001', branchId: 'khi', date: '2026-07-01', category: 'Stationery', description: 'Office supplies', type: 'out', principal: 2500, salesTax: 375, srbSst: 125, incomeTax: 0, gst: 0 },
  { id: 'pc2', pettyCashNo: 'PC-KHI-2026-002', branchId: 'khi', date: '2026-07-02', category: 'Refreshments', description: 'Client meeting tea', type: 'out', principal: 1200, salesTax: 180, srbSst: 60, incomeTax: 0, gst: 0 },
  { id: 'pc3', pettyCashNo: 'PC-KHI-2026-003', branchId: 'lhr', date: '2026-07-02', category: 'Courier', description: 'Document dispatch', type: 'out', principal: 800, salesTax: 120, srbSst: 40, incomeTax: 0, gst: 0 },
  { id: 'pc4', pettyCashNo: 'PC-KHI-2026-004', branchId: 'khi', date: '2026-07-03', category: 'Imprest', description: 'Monthly top-up from HO', type: 'in', principal: 50000, salesTax: 0, srbSst: 0, incomeTax: 0, gst: 0 },
  { id: 'pc5', pettyCashNo: 'PC-KHI-2026-005', branchId: 'isb', date: '2026-07-03', category: 'Printing', description: 'Brochures', type: 'out', principal: 3500, salesTax: 525, srbSst: 175, incomeTax: 0, gst: 0 },
  { id: 'pc6', pettyCashNo: 'PC-KHI-2026-006', branchId: 'lhr', date: '2026-07-04', category: 'Transport', description: 'Staff travel', type: 'out', principal: 2000, salesTax: 0, srbSst: 0, incomeTax: 0, gst: 300 },
  { id: 'pc7', pettyCashNo: 'PC-KHI-2026-007', branchId: 'mul', date: '2026-07-05', category: 'Utilities', description: 'Internet bill', type: 'out', principal: 4500, salesTax: 675, srbSst: 225, incomeTax: 0, gst: 0 },
  { id: 'pc8', pettyCashNo: 'PC-KHI-2026-008', branchId: 'fsd', date: '2026-07-05', category: 'Maintenance', description: 'AC repair', type: 'out', principal: 6000, salesTax: 900, srbSst: 300, incomeTax: 0, gst: 0 },
  { id: 'pc9', pettyCashNo: 'PC-KHI-2026-009', branchId: 'khi', date: '2026-07-06', category: 'Stationery', description: 'Printer cartridges', type: 'out', principal: 4200, salesTax: 630, srbSst: 210, incomeTax: 0, gst: 0 },
  { id: 'pc10', pettyCashNo: 'PC-KHI-2026-010', branchId: 'isb', date: '2026-07-07', category: 'Refreshments', description: 'Seminar snacks', type: 'out', principal: 2800, salesTax: 420, srbSst: 140, incomeTax: 0, gst: 0 },
  { id: 'pc11', pettyCashNo: 'PC-KHI-2026-011', branchId: 'lhr', date: '2026-07-07', category: 'Imprest', description: 'HO replenishment', type: 'in', principal: 30000, salesTax: 0, srbSst: 0, incomeTax: 0, gst: 0 },
  { id: 'pc12', pettyCashNo: 'PC-KHI-2026-012', branchId: 'mul', date: '2026-07-08', category: 'Courier', description: 'Visa docs', type: 'out', principal: 1500, salesTax: 225, srbSst: 75, incomeTax: 0, gst: 0 },
  { id: 'pc13', pettyCashNo: 'PC-KHI-2026-013', branchId: 'fsd', date: '2026-07-08', category: 'Printing', description: 'Flyers', type: 'out', principal: 2200, salesTax: 330, srbSst: 110, incomeTax: 0, gst: 0 },
  { id: 'pc14', pettyCashNo: 'PC-KHI-2026-014', branchId: 'khi', date: '2026-07-09', category: 'Transport', description: 'Airport pickup', type: 'out', principal: 3500, salesTax: 0, srbSst: 0, incomeTax: 0, gst: 525 },
  { id: 'pc15', pettyCashNo: 'PC-KHI-2026-015', branchId: 'lhr', date: '2026-07-09', category: 'Stationery', description: 'Folders & files', type: 'out', principal: 1800, salesTax: 270, srbSst: 90, incomeTax: 0, gst: 0 },
  { id: 'pc16', pettyCashNo: 'PC-KHI-2026-016', branchId: 'isb', date: '2026-07-09', category: 'Utilities', description: 'Electricity', type: 'out', principal: 8500, salesTax: 1275, srbSst: 425, incomeTax: 0, gst: 0 },
  { id: 'pc17', pettyCashNo: 'PC-KHI-2026-017', branchId: 'mul', date: '2026-07-09', category: 'Refreshments', description: 'Team lunch', type: 'out', principal: 4500, salesTax: 675, srbSst: 225, incomeTax: 0, gst: 0 },
  { id: 'pc18', pettyCashNo: 'PC-KHI-2026-018', branchId: 'fsd', date: '2026-07-09', category: 'Maintenance', description: 'Office cleaning', type: 'out', principal: 3000, salesTax: 450, srbSst: 150, incomeTax: 0, gst: 0 },
  { id: 'pc19', pettyCashNo: 'PC-KHI-2026-019', branchId: 'khi', date: '2026-07-09', category: 'Courier', description: 'University docs', type: 'out', principal: 2200, salesTax: 330, srbSst: 110, incomeTax: 0, gst: 0 },
  { id: 'pc20', pettyCashNo: 'PC-KHI-2026-020', branchId: 'lhr', date: '2026-07-09', category: 'Printing', description: 'Offer letters', type: 'out', principal: 1600, salesTax: 240, srbSst: 80, incomeTax: 0, gst: 0 },
]

export const pettyCashEntries: PettyCashEntry[] = entries.map((e) => ({
  ...e,
  total: pettyCashTotal(e.principal, e.salesTax, e.srbSst, e.gst, e.incomeTax),
}))
