/** Maps app routes to permission matrix module names */
export const ROUTE_PERMISSION_MODULE: Record<string, string> = {
  '/': 'Dashboard & Reports',
  '/master-sheet': 'Master Sheet / Students',
  '/invoices': 'Invoices & Receivables',
  '/other-invoices': 'Invoices & Receivables',
  '/receivables': 'Invoices & Receivables',
  '/receivables/allocation': 'Invoices & Receivables',
  '/sub-agents': 'Sub-Agents & Payables',
  '/sub-agents/commissions': 'Sub-Agents & Payables',
  '/sub-agents/payments': 'Sub-Agents & Payables',
  '/petty-cash': 'Expenses & Petty Cash',
  '/expenses': 'Expenses & Petty Cash',
  '/bank-cash': 'Bank & Cash',
  '/general-ledger': 'Journal Entries',
  '/journal-entries': 'Journal Entries',
  '/contra-entries': 'Journal Entries',
  '/tax-compliance': 'Tax & Compliance',
  '/ledgers/student': 'Tax & Compliance',
  '/ledgers/vendor': 'Tax & Compliance',
  '/ledgers/sub-agent': 'Tax & Compliance',
  '/payroll': 'Operations',
  '/documents': 'Operations',
  '/approvals': 'Approvals',
  '/audit-trail': 'Operations',
  '/reports': 'Dashboard & Reports',
  '/settings/branches': 'Settings',
  '/settings/users': 'Settings',
  '/settings/system': 'Settings',
  '/settings/email': 'Settings',
}

export const SIDEBAR_MODULE_MAP: Record<string, string> = {
  Dashboard: 'Dashboard & Reports',
  'Master Sheet': 'Master Sheet / Students',
  Revenue: 'Invoices & Receivables',
  'Sub-Agents': 'Sub-Agents & Payables',
  'Cash & Expenses': 'Expenses & Petty Cash',
  Accounting: 'Journal Entries',
  'Tax & Ledgers': 'Tax & Compliance',
  Operations: 'Operations',
  Reports: 'Dashboard & Reports',
  Settings: 'Settings',
}

export function getPermissionModuleForPath(pathname: string): string | undefined {
  if (pathname.startsWith('/crm')) return undefined // CRM gated by role, not matrix
  if (ROUTE_PERMISSION_MODULE[pathname]) return ROUTE_PERMISSION_MODULE[pathname]
  if (pathname.startsWith('/reports/')) return 'Dashboard & Reports'
  return undefined
}
