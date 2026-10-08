export type Currency = 'PKR' | 'GBP' | 'USD' | 'CAD' | 'AUD' | 'EUR'

export type UserRole =
  | 'Super Admin'
  | 'Branch Manager'
  | 'Accountant'
  | 'Cashier'
  | 'Read Only'
  | 'Counsellor'

export type ApplicationStatus =
  | 'Applied'
  | 'Offer'
  | 'Visa'
  | 'Enrolled'
  | 'Deferred'
  | 'Withdrawn'

export type InvoiceStatus =
  | 'Draft'
  | 'Sent'
  | 'Partially Received'
  | 'Fully Received'
  | 'Closed'

export type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected'

export type ReconciliationStatus = 'Matched' | 'Unmatched'

export interface University {
  id: string
  universityNo: string
  name: string
  country: string
  defaultCommissionRate: number
  currency: Currency
}

/** Tenant-registered destination country (Settings master). */
export interface TenantCountry {
  id: string
  name: string
  isoCode?: string
  isActive?: boolean
}

export interface Branch {
  id: string
  name: string
  code: string
  city: string
  isHeadOffice?: boolean
}

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  branchId: string
  /** True when home branch is Head Office (API sessions). */
  branchIsHeadOffice?: boolean
  /** Tenant Admin, or HO Branch Manager / Accountant. */
  canViewAllBranches?: boolean
}

export interface Student {
  id: string
  studentId: string
  name: string
  cnicPassport: string
  contact: string
  email: string
  branchId: string
  consultantId: string
  country: string
  university: string
  /** API university master id — used when creating invoices */
  universityId?: string
  course: string
  intake: string
  group: string
  applicationStatus: ApplicationStatus
  subAgentId?: string
  tuitionFee: number
  scholarship: number
  expectedCommissionRate: number
  currency: Currency
}

export interface InvoiceLine {
  id: string
  studentId: string
  tuitionFee: number
  scholarship: number
  commissionRate: number
  bonus: number
}

export interface Invoice {
  id: string
  invoiceNo: string
  branchId: string
  branchName?: string
  invoiceDate: string
  poNumber?: string
  currency: Currency
  status: InvoiceStatus
  /** One or more student commission lines on this invoice. */
  lines: InvoiceLine[]
}

export type OtherInvoiceStatus = 'Draft' | 'Sent' | 'Paid' | 'Closed'

export interface OtherInvoiceLine {
  id: string
  description: string
  quantity: number
  unitPrice: number
}

/** Non-university invoices (marketing, services, etc.). */
export interface OtherInvoice {
  id: string
  invoiceNo: string
  branchId: string
  branchName?: string
  invoiceDate: string
  billTo: string
  /** Free-text category, e.g. Marketing, Services. */
  category: string
  currency: Currency
  status: OtherInvoiceStatus
  notes?: string
  lines: OtherInvoiceLine[]
}

export interface Receivable {
  id: string
  receiptNo: string
  invoiceId: string
  bankAccountId: string
  currency: Currency
  amountReceived: number
  exchangeRate: number
  receiptDate: string
  reconciliationStatus: ReconciliationStatus
  isPartial: boolean
  notes?: string
  isBulkRemittance?: boolean
  allocationStatus?: 'pending' | 'allocated'
}

export interface ReceivableAllocation {
  id: string
  receivableId: string
  invoiceId: string
  allocatedAmount: number
  currency: Currency
}

export interface SubAgent {
  id: string
  subAgentNo: string
  name: string
  ntn: string
  email: string
  contact: string
  accountTitle: string
  iban: string
  accountNo: string
}

export interface SubAgentCommission {
  id: string
  commissionNo: string
  subAgentId: string
  studentId: string
  invoiceId: string
  branchId: string
  branchName?: string
  grossFee: number
  rateGiven: number
  exchangeRate: number
  followOnBonus: number
  currency: Currency
  status: 'Pending' | 'Paid' | 'Partial'
}

export interface SubAgentPayment {
  id: string
  paymentNo: string
  commissionId: string
  subAgentId: string
  chequeNo: string
  bankAccountId: string
  amountPKR: number
  paymentDate: string
  currency: Currency
}

export interface PettyCashEntry {
  id: string
  pettyCashNo: string
  branchId: string
  date: string
  category: string
  description: string
  type: 'in' | 'out'
  principal: number
  salesTax: number
  srbSst: number
  gst: number
  incomeTax: number
  total: number
}

export interface Expense {
  id: string
  expenseNo: string
  branchId: string
  /** Resolved from API include when store branch lookup is stale */
  branchName?: string
  vendor: string
  category: string
  date: string
  principal: number
  salesTax: number
  srbSst: number
  gst: number
  incomeTax: number
  total: number
  paymentMode: string
  chequeNo?: string
  approvalStatus: ApprovalStatus
  requestedById?: string
}

export interface PayrollEmployee {
  id: string
  employeeNo: string
  name: string
  branchId: string
  designation: string
  basicSalary: number
  allowances: number
  salaryTax: number
  netSalary: number
  email?: string
  bankAccount?: string
  isActive: boolean
}

export type PayrollRunStatus = 'Draft' | 'Processed' | 'Paid'

export interface PayrollRun {
  id: string
  runNo: string
  period: string
  branchId: string
  status: PayrollRunStatus
  runDate: string
  paidDate?: string
  totalGross: number
  totalTax: number
  totalNet: number
  totalReimbursements: number
  employeeCount: number
  processedByName?: string
  /** Internal = generated in-app; Uploaded = imported from external payroll CSV. */
  source?: 'Internal' | 'Uploaded'
}

export interface PayrollLine {
  id: string
  payrollRunId: string
  employeeId: string
  basicSalary: number
  allowances: number
  grossSalary: number
  salaryTax: number
  netSalary: number
  reimbursements: number
  totalPayable: number
}

export interface Reimbursement {
  id: string
  reimbursementNo: string
  employeeId: string
  branchId: string
  type: 'Travel' | 'Fuel' | 'Reimbursement' | 'Advance Settlement'
  amount: number
  date: string
  status: ApprovalStatus
  description?: string
  requestedById?: string
}

export interface BankAccount {
  id: string
  name: string
  bankName: string
  accountNo: string
  branchId: string
  currency: Currency
  balance: number
  openingBalance?: number
}

export interface BankTransaction {
  id: string
  bankAccountId: string
  date: string
  type: 'deposit' | 'withdrawal' | 'transfer'
  description: string
  amount: number
  currency: Currency
  reconciliationStatus: ReconciliationStatus
}

export interface Cheque {
  id: string
  chequeNo: string
  bankAccountId: string
  payee: string
  amount: number
  date: string
  status: 'Issued' | 'Cleared' | 'Bounced'
}

export interface AccountNode {
  id: string
  code: string
  name: string
  type: 'asset' | 'liability' | 'equity' | 'income' | 'expense'
  balance: number
  children?: AccountNode[]
}

export interface JournalLine {
  accountCode: string
  accountName: string
  debit: number
  credit: number
}

export type JournalSourceType =
  | 'Manual'
  | 'Invoice'
  | 'Receivable'
  | 'Expense'
  | 'PettyCash'
  | 'Payroll'
  | 'Reversal'
  | 'OtherInvoice'
  | 'SubAgentPayment'
  | 'Contra'

export interface JournalEntry {
  id: string
  entryNo: string
  date: string
  branchId: string
  description: string
  lines: JournalLine[]
  approvalStatus: ApprovalStatus
  sourceType?: JournalSourceType
  sourceId?: string
  isAutoPosted?: boolean
}

export interface ContraEntry {
  id: string
  contraNo: string
  date: string
  type: 'Cash-Bank' | 'Bank-Bank' | 'Cash-Cash'
  fromAccount: string
  toAccount: string
  amount: number
  branchId: string
}

export interface TaxRecord {
  id: string
  type: 'WHT Receivable' | 'WHT Payable' | 'GST Input' | 'GST Output' | 'SRB-SST' | 'Salary Tax'
  period: string
  amount: number
  branchId: string
}

export interface LedgerEntry {
  id: string
  date: string
  description: string
  debit: number
  credit: number
  balance: number
  reference: string
}

export interface Document {
  id: string
  name: string
  type: 'Invoice' | 'Receipt' | 'Bill' | 'Contract' | 'Agreement'
  linkedType: string
  linkedId: string
  uploadDate: string
  size: string
}

export interface Approval {
  id: string
  approvalNo: string
  type: 'Expense' | 'Sub-Agent Payout' | 'Journal' | 'Refund' | 'Reimbursement' | 'Payroll'
  title: string
  amount: number
  requestedBy: string
  requestedById?: string
  date: string
  status: ApprovalStatus
  branchId: string
  sourceId?: string
}

export interface AuditLog {
  id: string
  userId: string
  action: string
  module: string
  timestamp: string
  ip: string
  entityType?: string
  entityId?: string
}

export interface DashboardMetrics {
  todayCollection: number
  todayExpenses: number
  cashBalance: number
  bankBalance: number
  monthlyRevenue: number
  monthlyExpenses: number
  netProfit: number
  outstandingReceivables: number
  outstandingPayables: number
  pettyCashBalance: number
}

export interface ReportDefinition {
  id: string
  title: string
  category: string
  description: string
  path: string
}
