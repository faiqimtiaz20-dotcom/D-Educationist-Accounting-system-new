import type { PayrollEmployee, PayrollLine, PayrollRun, Reimbursement } from '@/types'
import { buildPayrollEmployee } from '@/lib/payroll'

const rawEmployees = [
  { name: 'Ahmed Khan', branchId: 'khi', designation: 'Branch Manager', basicSalary: 180000, allowances: 45000, email: 'ahmed@deducationist.com', bankAccount: 'PK12****4521', isActive: true },
  { name: 'Sara Malik', branchId: 'lhr', designation: 'Senior Accountant', basicSalary: 120000, allowances: 25000, email: 'sara@deducationist.com', bankAccount: 'PK45****8832', isActive: true },
  { name: 'Bilal Hassan', branchId: 'isb', designation: 'Cashier', basicSalary: 65000, allowances: 10000, email: 'bilal@deducationist.com', isActive: true },
  { name: 'Fatima Noor', branchId: 'khi', designation: 'Senior Counsellor', basicSalary: 95000, allowances: 20000, email: 'fatima@deducationist.com', isActive: true },
  { name: 'Usman Ali', branchId: 'mul', designation: 'Accountant', basicSalary: 85000, allowances: 15000, email: 'usman@deducationist.com', isActive: true },
  { name: 'Hina Shah', branchId: 'fsd', designation: 'Office Assistant', basicSalary: 45000, allowances: 5000, email: 'hina@deducationist.com', isActive: true },
  { name: 'Zain Tariq', branchId: 'lhr', designation: 'Branch Manager', basicSalary: 175000, allowances: 40000, email: 'zain@deducationist.com', isActive: true },
  { name: 'Nadia Hussain', branchId: 'mul', designation: 'Counsellor', basicSalary: 75000, allowances: 15000, email: 'nadia@deducationist.com', isActive: true },
  { name: 'Imran Butt', branchId: 'khi', designation: 'IT Support', basicSalary: 70000, allowances: 12000, email: 'imran@deducationist.com', isActive: true },
  { name: 'Rabia Akhtar', branchId: 'isb', designation: 'HR Officer', basicSalary: 80000, allowances: 18000, email: 'rabia@deducationist.com', isActive: true },
]

export const payrollEmployees: PayrollEmployee[] = rawEmployees.map((e, i) => ({
  id: `pe${i + 1}`,
  employeeNo: `EMP-${String(i + 1).padStart(3, '0')}`,
  ...buildPayrollEmployee(e),
}))

export const reimbursements: Reimbursement[] = [
  { id: 'rb1', reimbursementNo: 'REIM-2026-001', employeeId: 'pe4', branchId: 'khi', type: 'Travel', amount: 12500, date: '2026-07-01', status: 'Approved', description: 'Client visit Lahore' },
  { id: 'rb2', reimbursementNo: 'REIM-2026-002', employeeId: 'pe2', branchId: 'lhr', type: 'Fuel', amount: 8500, date: '2026-07-03', status: 'Pending', description: 'July fuel claim' },
  { id: 'rb3', reimbursementNo: 'REIM-2026-003', employeeId: 'pe5', branchId: 'mul', type: 'Reimbursement', amount: 15000, date: '2026-07-05', status: 'Approved', description: 'Office supplies' },
  { id: 'rb4', reimbursementNo: 'REIM-2026-004', employeeId: 'pe9', branchId: 'khi', type: 'Advance Settlement', amount: 22000, date: '2026-07-07', status: 'Pending', description: 'Advance against travel' },
  { id: 'rb5', reimbursementNo: 'REIM-2026-005', employeeId: 'pe7', branchId: 'lhr', type: 'Travel', amount: 35000, date: '2026-07-08', status: 'Approved', description: 'Education fair Dubai' },
  { id: 'rb6', reimbursementNo: 'REIM-2026-006', employeeId: 'pe3', branchId: 'isb', type: 'Fuel', amount: 6000, date: '2026-07-09', status: 'Pending', description: 'Field visits' },
]

export const payrollRuns: PayrollRun[] = [
  {
    id: 'pr1',
    runNo: 'PR-HO-2026-001',
    period: '2026-06',
    branchId: 'ho',
    status: 'Paid',
    runDate: '2026-06-28',
    paidDate: '2026-06-30',
    totalGross: 892000,
    totalTax: 89400,
    totalNet: 802600,
    totalReimbursements: 28000,
    employeeCount: 10,
    processedByName: 'Sara Malik',
  },
]

export const payrollLines: PayrollLine[] = []
