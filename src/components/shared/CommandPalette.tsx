import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useIsCrmAdmin } from '@/lib/crm'

const tenantRoutes = [
  { label: 'Dashboard', path: '/', group: 'Main' },
  { label: 'Master Sheet', path: '/master-sheet', group: 'Students' },
  { label: 'Invoices', path: '/invoices', group: 'Revenue' },
  { label: 'Other Invoices', path: '/other-invoices', group: 'Revenue' },
  { label: 'Remittance', path: '/receivables', group: 'Revenue' },
  { label: 'Bulk Allocation', path: '/receivables/allocation', group: 'Revenue' },
  { label: 'Sub-Agent Master', path: '/sub-agents', group: 'Payables' },
  { label: 'Commission Sheet', path: '/sub-agents/commissions', group: 'Payables' },
  { label: 'Sub-Agent Payments', path: '/sub-agents/payments', group: 'Payables' },
  { label: 'Petty Cash', path: '/petty-cash', group: 'Cash' },
  { label: 'Expenses', path: '/expenses', group: 'Cash' },
  { label: 'Bank & Cash', path: '/bank-cash', group: 'Cash' },
  { label: 'General Ledger', path: '/general-ledger', group: 'Accounting' },
  { label: 'Journal Entries', path: '/journal-entries', group: 'Accounting' },
  { label: 'Contra Entries', path: '/contra-entries', group: 'Accounting' },
  { label: 'Tax Compliance', path: '/tax-compliance', group: 'Tax' },
  { label: 'Student Ledger', path: '/ledgers/student', group: 'Ledgers' },
  { label: 'Vendor Ledger', path: '/ledgers/vendor', group: 'Ledgers' },
  { label: 'Sub-Agent Ledger', path: '/ledgers/sub-agent', group: 'Ledgers' },
  { label: 'Payroll', path: '/payroll', group: 'Operations' },
  { label: 'Documents', path: '/documents', group: 'Operations' },
  { label: 'Approvals', path: '/approvals', group: 'Operations' },
  { label: 'Audit Trail', path: '/audit-trail', group: 'Operations' },
  { label: 'Reports', path: '/reports', group: 'Reports' },
  { label: 'Branches', path: '/settings/branches', group: 'Settings' },
  { label: 'Users & Roles', path: '/settings/users', group: 'Settings' },
  { label: 'System Settings', path: '/settings/system', group: 'Settings' },
  { label: 'Email / SMTP', path: '/settings/email', group: 'Settings' },
  { label: 'My Profile', path: '/profile', group: 'Account' },
]

const crmRoutes = [
  { label: 'Tenants', path: '/crm/tenants', group: 'CRM' },
]

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const isCrm = useIsCrmAdmin()
  const routes = isCrm ? crmRoutes : tenantRoutes

  const filtered = useMemo(() => {
    if (!query) return routes
    const q = query.toLowerCase()
    return routes.filter(
      (r) =>
        r.label.toLowerCase().includes(q) || r.group.toLowerCase().includes(q),
    )
  }, [query, routes])

  const handleSelect = (path: string) => {
    navigate(path)
    onOpenChange(false)
    setQuery('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0">
        <div className="flex items-center border-b px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search pages..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 shadow-none focus-visible:ring-0"
            autoFocus
          />
        </div>
        <ScrollArea className="max-h-[300px] p-2">
          {filtered.map((route) => (
            <button
              key={route.path}
              onClick={() => handleSelect(route.path)}
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-accent"
            >
              <span>{route.label}</span>
              <span className="text-xs text-muted-foreground">{route.group}</span>
            </button>
          ))}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
