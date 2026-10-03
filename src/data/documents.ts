import type { Document, Approval, AuditLog } from '@/types'

export const documents: Document[] = [
  { id: 'doc1', name: 'INV-KHI-2026-001.pdf', type: 'Invoice', linkedType: 'Invoice', linkedId: 'inv1', uploadDate: '2026-03-15', size: '245 KB' },
  { id: 'doc2', name: 'Receipt-UM-4521.pdf', type: 'Receipt', linkedType: 'Receivable', linkedId: 'rec1', uploadDate: '2026-04-20', size: '128 KB' },
  { id: 'doc3', name: 'SubAgent-Agreement-SA1.pdf', type: 'Agreement', linkedType: 'SubAgent', linkedId: 'sa1', uploadDate: '2026-01-10', size: '512 KB' },
  { id: 'doc4', name: 'Vendor-Bill-TechSolutions.pdf', type: 'Bill', linkedType: 'Expense', linkedId: 'ex1', uploadDate: '2026-06-15', size: '189 KB' },
  { id: 'doc5', name: 'INV-LHR-2026-002.pdf', type: 'Invoice', linkedType: 'Invoice', linkedId: 'inv2', uploadDate: '2026-03-20', size: '238 KB' },
  { id: 'doc6', name: 'Contract-OfficeMart.pdf', type: 'Contract', linkedType: 'Expense', linkedId: 'ex2', uploadDate: '2026-06-18', size: '1.2 MB' },
  { id: 'doc7', name: 'Receipt-ASU-Partial.pdf', type: 'Receipt', linkedType: 'Receivable', linkedId: 'rec4', uploadDate: '2026-05-25', size: '156 KB' },
  { id: 'doc8', name: 'INV-ISB-2026-003.pdf', type: 'Invoice', linkedType: 'Invoice', linkedId: 'inv3', uploadDate: '2026-04-01', size: '241 KB' },
  { id: 'doc9', name: 'Payment-Voucher-SP1.pdf', type: 'Receipt', linkedType: 'Payment', linkedId: 'sp1', uploadDate: '2026-05-01', size: '98 KB' },
  { id: 'doc10', name: 'SubAgent-Agreement-SA2.pdf', type: 'Agreement', linkedType: 'SubAgent', linkedId: 'sa2', uploadDate: '2026-02-15', size: '480 KB' },
  { id: 'doc11', name: 'PettyCash-Receipt-PC1.jpg', type: 'Receipt', linkedType: 'PettyCash', linkedId: 'pc1', uploadDate: '2026-07-01', size: '2.1 MB' },
  { id: 'doc12', name: 'INV-KHI-2026-007.pdf', type: 'Invoice', linkedType: 'Invoice', linkedId: 'inv7', uploadDate: '2026-05-01', size: '252 KB' },
  { id: 'doc13', name: 'Bank-Statement-Jul2026.pdf', type: 'Receipt', linkedType: 'Bank', linkedId: 'ba5', uploadDate: '2026-07-09', size: '890 KB' },
  { id: 'doc14', name: 'Vendor-Bill-DigitalMarketing.pdf', type: 'Bill', linkedType: 'Expense', linkedId: 'ex3', uploadDate: '2026-06-20', size: '312 KB' },
  { id: 'doc15', name: 'Journal-Entry-JE3.pdf', type: 'Receipt', linkedType: 'Journal', linkedId: 'je3', uploadDate: '2026-07-05', size: '76 KB' },
  { id: 'doc16', name: 'INV-MUL-2026-010.pdf', type: 'Invoice', linkedType: 'Invoice', linkedId: 'inv10', uploadDate: '2026-05-15', size: '229 KB' },
  { id: 'doc17', name: 'Rent-Agreement-2026.pdf', type: 'Contract', linkedType: 'Expense', linkedId: 'ex4', uploadDate: '2026-01-01', size: '1.5 MB' },
  { id: 'doc18', name: 'Receipt-Bulk-Remittance.pdf', type: 'Receipt', linkedType: 'Receivable', linkedId: 'rec12', uploadDate: '2026-07-01', size: '198 KB' },
  { id: 'doc19', name: 'Payroll-Jul2026.xlsx', type: 'Receipt', linkedType: 'Payroll', linkedId: 'pe1', uploadDate: '2026-07-01', size: '45 KB' },
  { id: 'doc20', name: 'Tax-Filing-Jun2026.pdf', type: 'Receipt', linkedType: 'Tax', linkedId: 'tx7', uploadDate: '2026-07-05', size: '167 KB' },
]

export const approvals: Approval[] = [
  { id: 'ap1', approvalNo: 'APR-2026-001', type: 'Expense', title: 'Office Mart - Furniture', amount: 56250, requestedBy: 'Sara Malik', date: '2026-06-18', status: 'Pending', branchId: 'lhr' },
  { id: 'ap2', approvalNo: 'APR-2026-002', type: 'Sub-Agent Payout', title: 'Study Link Associates - Commission', amount: 1251000, requestedBy: 'Ahmed Khan', date: '2026-07-05', status: 'Pending', branchId: 'lhr' },
  { id: 'ap3', approvalNo: 'APR-2026-003', type: 'Journal', title: 'WHT Provision Entry', amount: 12500, requestedBy: 'Usman Ali', date: '2026-07-05', status: 'Pending', branchId: 'lhr' },
  { id: 'ap4', approvalNo: 'APR-2026-004', type: 'Expense', title: 'SecureNet ISP - Utilities', amount: 18000, requestedBy: 'Hina Shah', date: '2026-07-02', status: 'Pending', branchId: 'fsd' },
  { id: 'ap5', approvalNo: 'APR-2026-005', type: 'Refund', title: 'Student fee refund - Maryam Javed', amount: 50000, requestedBy: 'Fatima Noor', date: '2026-07-08', status: 'Pending', branchId: 'lhr' },
  { id: 'ap6', approvalNo: 'APR-2026-006', type: 'Expense', title: 'Legal Associates - Consultation', amount: 60000, requestedBy: 'Zain Tariq', date: '2026-07-05', status: 'Pending', branchId: 'isb' },
  { id: 'ap7', approvalNo: 'APR-2026-007', type: 'Sub-Agent Payout', title: 'Overseas Connect - Commission', amount: 1003800, requestedBy: 'Bilal Hassan', date: '2026-07-09', status: 'Pending', branchId: 'isb' },
  { id: 'ap8', approvalNo: 'APR-2026-008', type: 'Journal', title: 'FX Gain on GBP Receipt', amount: 45000, requestedBy: 'Sara Malik', date: '2026-07-09', status: 'Pending', branchId: 'ho' },
]

export const auditLogs: AuditLog[] = [
  { id: 'al1', userId: 'u1', action: 'Created invoice INV-KHI-2026-016', module: 'Invoices', timestamp: '2026-07-09 09:15:22', ip: '192.168.1.10' },
  { id: 'al2', userId: 'u3', action: 'Recorded receivable for INV-ISB-2026-003', module: 'Receivables', timestamp: '2026-07-09 10:30:45', ip: '192.168.2.15' },
  { id: 'al3', userId: 'u2', action: 'Approved expense EX-006', module: 'Expenses', timestamp: '2026-07-09 11:00:12', ip: '192.168.1.25' },
  { id: 'al4', userId: 'u5', action: 'Updated student STU-2026-004 status to Applied', module: 'Master Sheet', timestamp: '2026-07-09 11:45:33', ip: '192.168.1.30' },
  { id: 'al5', userId: 'u4', action: 'Added petty cash entry PC-020', module: 'Petty Cash', timestamp: '2026-07-09 12:00:00', ip: '192.168.3.10' },
  { id: 'al6', userId: 'u1', action: 'Generated payment voucher SP-005', module: 'Sub-Agent Payments', timestamp: '2026-07-09 12:30:18', ip: '192.168.1.10' },
  { id: 'al7', userId: 'u6', action: 'Created journal entry JE-2026-005', module: 'Journal', timestamp: '2026-07-09 13:00:55', ip: '192.168.4.20' },
  { id: 'al8', userId: 'u3', action: 'Exported P&L report for Lahore branch', module: 'Reports', timestamp: '2026-07-09 13:30:40', ip: '192.168.2.15' },
  { id: 'al9', userId: 'u2', action: 'Rejected expense EX-007', module: 'Expenses', timestamp: '2026-07-08 16:20:10', ip: '192.168.1.25' },
  { id: 'al10', userId: 'u1', action: 'Updated system settings - WHT rate', module: 'Settings', timestamp: '2026-07-08 14:00:00', ip: '192.168.1.10' },
]
