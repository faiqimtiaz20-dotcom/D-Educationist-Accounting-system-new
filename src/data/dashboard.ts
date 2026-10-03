import type { DashboardMetrics, ReportDefinition } from '@/types'

export const dashboardMetrics: DashboardMetrics = {
  todayCollection: 2450000,
  todayExpenses: 385000,
  cashBalance: 425000,
  bankBalance: 18525000,
  monthlyRevenue: 8750000,
  monthlyExpenses: 4250000,
  netProfit: 4500000,
  outstandingReceivables: 8750000,
  outstandingPayables: 4250000,
  pettyCashBalance: 185000,
}

export const commissionByUniversity = [
  { name: 'U of Manchester', value: 3200000 },
  { name: 'Arizona State', value: 2800000 },
  { name: 'U of Toronto', value: 2500000 },
  { name: 'Monash', value: 2100000 },
  { name: 'Coventry', value: 1850000 },
  { name: 'Northeastern', value: 1650000 },
  { name: 'Others', value: 4200000 },
]

export const receivablesAgeing = [
  { name: '0-30 days', value: 45 },
  { name: '31-60 days', value: 28 },
  { name: '61-90 days', value: 15 },
  { name: '90+ days', value: 12 },
]

export const branchProfit = [
  { name: 'Karachi', profit: 1850000 },
  { name: 'Lahore', profit: 1420000 },
  { name: 'Islamabad', profit: 980000 },
  { name: 'Multan', profit: 650000 },
  { name: 'Faisalabad', profit: 420000 },
]

export const monthlyRevenueTrend = [
  { month: 'Jan', revenue: 5200000, expenses: 3100000 },
  { month: 'Feb', revenue: 5800000, expenses: 3400000 },
  { month: 'Mar', revenue: 6200000, expenses: 3600000 },
  { month: 'Apr', revenue: 7100000, expenses: 3800000 },
  { month: 'May', revenue: 7800000, expenses: 4000000 },
  { month: 'Jun', revenue: 8200000, expenses: 4100000 },
  { month: 'Jul', revenue: 8750000, expenses: 4250000 },
]

export const reports: ReportDefinition[] = [
  { id: 'r1', title: 'Branch Income', category: 'Branch', description: 'Income by branch for selected period', path: '/reports/branch-income' },
  { id: 'r2', title: 'Branch Expenses', category: 'Branch', description: 'Expenses by branch', path: '/reports/branch-expenses' },
  { id: 'r3', title: 'Branch Profit', category: 'Branch', description: 'Profit analysis by branch', path: '/reports/branch-profit' },
  { id: 'r4', title: 'Branch Cash Position', category: 'Branch', description: 'Cash and bank balances by branch', path: '/reports/branch-cash' },
  {
    id: 'r26',
    title: 'University-wise P&L',
    category: 'Consolidated',
    description: 'Profit and loss by university — income minus sub-agent cost',
    path: '/reports/university-wise-pl',
  },
  { id: 'r5', title: 'Consolidated P&L', category: 'Consolidated', description: 'All-branch profit and loss', path: '/reports/consolidated-pl' },
  { id: 'r6', title: 'Consolidated Balance Sheet', category: 'Consolidated', description: 'Overall balance sheet', path: '/reports/consolidated-bs' },
  { id: 'r7', title: 'Consolidated Cash Flow', category: 'Consolidated', description: 'Cash flow statement', path: '/reports/consolidated-cf' },
  { id: 'r8', title: 'Trial Balance', category: 'Standard', description: 'Trial balance report', path: '/reports/trial-balance' },
  { id: 'r9', title: 'Cash Book', category: 'Standard', description: 'Cash transactions register', path: '/reports/cash-book' },
  { id: 'r10', title: 'Bank Book', category: 'Standard', description: 'Bank transactions register', path: '/reports/bank-book' },
  { id: 'r11', title: 'Journal Register', category: 'Standard', description: 'All journal entries', path: '/reports/journal-register' },
  { id: 'r12', title: 'Expense Report', category: 'Standard', description: 'Detailed expense listing', path: '/reports/expense-report' },
  { id: 'r13', title: 'Income Report', category: 'Standard', description: 'Income breakdown', path: '/reports/income-report' },
  { id: 'r14', title: 'Receivable Ageing', category: 'Standard', description: 'Outstanding receivables by age', path: '/reports/receivable-ageing' },
  { id: 'r15', title: 'Payable Ageing', category: 'Standard', description: 'Outstanding payables by age', path: '/reports/payable-ageing' },
  { id: 'r16', title: 'WHT Summary', category: 'Tax', description: 'Withholding tax deducted/withheld', path: '/reports/wht-summary' },
  { id: 'r17', title: 'GST/SRB Summary', category: 'Tax', description: 'Input-output tax summary', path: '/reports/gst-summary' },
  { id: 'r18', title: 'Salary Tax Summary', category: 'Tax', description: 'Salary tax deduction summary', path: '/reports/salary-tax' },
  { id: 'r19', title: 'Commission Earned vs Received', category: 'Commission', description: 'Commission tracking by university', path: '/reports/commission-tracking' },
  { id: 'r20', title: 'Sub-Agent Payout Summary', category: 'Commission', description: 'Sub-agent payment analysis', path: '/reports/subagent-payout' },
  { id: 'r21', title: 'Net Margin per Student', category: 'Commission', description: 'Commission minus sub-agent share', path: '/reports/net-margin' },
  { id: 'r22', title: 'Petty Cash Report', category: 'Standard', description: 'Petty cash transactions', path: '/reports/petty-cash' },
  {
    id: 'r23',
    title: 'Counsellor Report Profit and Loss',
    category: 'Operations',
    description: 'Profit and loss by counsellor — income minus sub-agent cost and outstanding',
    path: '/reports/counsellor',
  },
  {
    id: 'r24',
    title: 'Country-wise Report',
    category: 'Operations',
    description: 'Student pipeline and conversion by destination country',
    path: '/reports/country-wise',
  },
  {
    id: 'r25',
    title: 'University-wise Report',
    category: 'Operations',
    description: 'Student pipeline and conversion by university',
    path: '/reports/university-wise',
  },
]
