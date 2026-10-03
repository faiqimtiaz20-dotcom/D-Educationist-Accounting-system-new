import { pettyCashTotal } from '@/lib/calculations'

const raw = [
  { id: 'ex1', expenseNo: 'EXP-KHI-2026-001', branchId: 'khi', vendor: 'Tech Solutions Pvt Ltd', category: 'IT Equipment', date: '2026-06-15', principal: 85000, salesTax: 12750, srbSst: 4250, incomeTax: 0, gst: 0, paymentMode: 'Bank Transfer', approvalStatus: 'Approved' as const },
  { id: 'ex2', expenseNo: 'EXP-LHR-2026-001', branchId: 'lhr', vendor: 'Office Mart', category: 'Furniture', date: '2026-06-18', principal: 45000, salesTax: 6750, srbSst: 2250, incomeTax: 0, gst: 0, paymentMode: 'Cheque', approvalStatus: 'Pending' as const },
  { id: 'ex3', expenseNo: 'EXP-ISB-2026-001', branchId: 'isb', vendor: 'Digital Marketing Co', category: 'Marketing', date: '2026-06-20', principal: 120000, salesTax: 18000, srbSst: 6000, incomeTax: 0, gst: 0, paymentMode: 'Bank Transfer', approvalStatus: 'Approved' as const },
  { id: 'ex4', expenseNo: 'EXP-MUL-2026-001', branchId: 'mul', vendor: 'Rent Properties', category: 'Rent', date: '2026-07-01', principal: 200000, salesTax: 0, srbSst: 0, incomeTax: 0, gst: 0, paymentMode: 'Cheque', approvalStatus: 'Approved' as const },
  { id: 'ex5', expenseNo: 'EXP-FSD-2026-001', branchId: 'fsd', vendor: 'SecureNet ISP', category: 'Utilities', date: '2026-07-02', principal: 15000, salesTax: 2250, srbSst: 750, incomeTax: 0, gst: 0, paymentMode: 'Cash', approvalStatus: 'Pending' as const },
  { id: 'ex6', expenseNo: 'EXP-KHI-2026-002', branchId: 'khi', vendor: 'Print House', category: 'Printing', date: '2026-07-03', principal: 28000, salesTax: 4200, srbSst: 1400, incomeTax: 0, gst: 0, paymentMode: 'Bank Transfer', approvalStatus: 'Approved' as const },
  { id: 'ex7', expenseNo: 'EXP-LHR-2026-002', branchId: 'lhr', vendor: 'Event Planners PK', category: 'Events', date: '2026-07-04', principal: 75000, salesTax: 11250, srbSst: 3750, incomeTax: 0, gst: 0, paymentMode: 'Cheque', approvalStatus: 'Rejected' as const },
  { id: 'ex8', expenseNo: 'EXP-ISB-2026-002', branchId: 'isb', vendor: 'Legal Associates', category: 'Legal', date: '2026-07-05', principal: 50000, salesTax: 7500, srbSst: 2500, incomeTax: 0, gst: 0, paymentMode: 'Bank Transfer', approvalStatus: 'Pending' as const },
  { id: 'ex9', expenseNo: 'EXP-MUL-2026-002', branchId: 'mul', vendor: 'CleanPro Services', category: 'Maintenance', date: '2026-07-06', principal: 12000, salesTax: 1800, srbSst: 600, incomeTax: 0, gst: 0, paymentMode: 'Cash', approvalStatus: 'Approved' as const },
  { id: 'ex10', expenseNo: 'EXP-FSD-2026-002', branchId: 'fsd', vendor: 'CloudHost Inc', category: 'IT Services', date: '2026-07-07', principal: 35000, salesTax: 0, srbSst: 0, incomeTax: 0, gst: 5250, paymentMode: 'Bank Transfer', approvalStatus: 'Approved' as const },
  { id: 'ex11', expenseNo: 'EXP-KHI-2026-003', branchId: 'khi', vendor: 'Travel Express', category: 'Travel', date: '2026-07-08', principal: 42000, salesTax: 0, srbSst: 0, incomeTax: 0, gst: 6300, paymentMode: 'Credit Card', approvalStatus: 'Pending' as const },
  { id: 'ex12', expenseNo: 'EXP-LHR-2026-003', branchId: 'lhr', vendor: 'Insurance Corp', category: 'Insurance', date: '2026-07-08', principal: 65000, salesTax: 9750, srbSst: 3250, incomeTax: 0, gst: 0, paymentMode: 'Cheque', approvalStatus: 'Approved' as const },
  { id: 'ex13', expenseNo: 'EXP-ISB-2026-003', branchId: 'isb', vendor: 'Stationery World', category: 'Office Supplies', date: '2026-07-09', principal: 8500, salesTax: 1275, srbSst: 425, incomeTax: 0, gst: 0, paymentMode: 'Cash', approvalStatus: 'Pending' as const },
  { id: 'ex14', expenseNo: 'EXP-MUL-2026-003', branchId: 'mul', vendor: 'PowerGen Ltd', category: 'Utilities', date: '2026-07-09', principal: 22000, salesTax: 3300, srbSst: 1100, incomeTax: 0, gst: 0, paymentMode: 'Bank Transfer', approvalStatus: 'Approved' as const },
  { id: 'ex15', expenseNo: 'EXP-FSD-2026-003', branchId: 'fsd', vendor: 'Sign Masters', category: 'Marketing', date: '2026-07-09', principal: 18000, salesTax: 2700, srbSst: 900, incomeTax: 0, gst: 0, paymentMode: 'Cheque', approvalStatus: 'Pending' as const },
]

export const expenses = raw.map((e) => ({
  ...e,
  total: pettyCashTotal(e.principal, e.salesTax, e.srbSst, e.gst, e.incomeTax),
}))
