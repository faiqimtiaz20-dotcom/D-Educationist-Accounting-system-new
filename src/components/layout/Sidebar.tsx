import {
  LayoutDashboard,
  FileText,
  Wallet,
  HandCoins,
  BookOpen,
  Scale,
  BarChart3,
  Settings,
  ChevronDown,
  GraduationCap,
  Calculator,
  X,
  Building2,
  Mail,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/app-store'
import { useAuthStore } from '@/store/auth-store'
import { useCurrentUser } from '@/hooks/useAuth'
import { getPermissionLevel } from '@/lib/permissions'
import { SIDEBAR_MODULE_MAP } from '@/lib/module-permissions'
import { isCrmAdminUser } from '@/lib/crm'
import { useTenantContext } from '@/lib/tenant-context'

interface NavItem {
  label: string
  icon: React.ElementType
  path?: string
  children?: { label: string; path: string }[]
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Master Sheet', icon: GraduationCap, path: '/master-sheet' },
  {
    label: 'Revenue',
    icon: FileText,
    children: [
      { label: 'Invoices', path: '/invoices' },
      { label: 'Other Invoices', path: '/other-invoices' },
      { label: 'Remittance', path: '/receivables' },
    ],
  },
  {
    label: 'Sub-Agents',
    icon: HandCoins,
    children: [
      { label: 'Sub-Agent Master', path: '/sub-agents' },
      { label: 'Commission Sheet', path: '/sub-agents/commissions' },
      { label: 'Payments', path: '/sub-agents/payments' },
    ],
  },
  {
    label: 'Cash & Expenses',
    icon: Wallet,
    children: [
      { label: 'Petty Cash', path: '/petty-cash' },
      { label: 'Expenses', path: '/expenses' },
      { label: 'Bank & Cash', path: '/bank-cash' },
    ],
  },
  {
    label: 'Accounting',
    icon: BookOpen,
    children: [
      { label: 'General Ledger', path: '/general-ledger' },
      { label: 'Journal Entries', path: '/journal-entries' },
    ],
  },
  {
    label: 'Tax & Ledgers',
    icon: Scale,
    children: [
      { label: 'Tax Compliance', path: '/tax-compliance' },
      { label: 'Student Ledger', path: '/ledgers/student' },
      { label: 'Vendor Ledger', path: '/ledgers/vendor' },
      { label: 'Sub-Agent Ledger', path: '/ledgers/sub-agent' },
    ],
  },
  {
    label: 'Operations',
    icon: Calculator,
    children: [
      { label: 'Payroll', path: '/payroll' },
      { label: 'Documents', path: '/documents' },
      { label: 'Approvals', path: '/approvals' },
      { label: 'Audit Trail', path: '/audit-trail' },
    ],
  },
  { label: 'Reports', icon: BarChart3, path: '/reports' },
  {
    label: 'Settings',
    icon: Settings,
    children: [
      { label: 'Branches', path: '/settings/branches' },
      { label: 'Users & Roles', path: '/settings/users' },
      { label: 'System Settings', path: '/settings/system' },
      { label: 'Email / SMTP', path: '/settings/email' },
    ],
  },
]

const crmNavItems: NavItem[] = [
  { label: 'Tenants', icon: Building2, path: '/crm/tenants' },
  { label: 'Email delivery', icon: Mail, path: '/crm/mail-delivery' },
]

export function Sidebar() {
  const location = useLocation()
  const collapsed = useAppStore((s) => s.sidebarCollapsed)
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen)
  const [openMenus, setOpenMenus] = useState<string[]>(['Revenue', 'Sub-Agents'])
  const user = useCurrentUser()
  const matrix = useAuthStore((s) => s.permissionMatrix)
  const apiUser = useAuthStore((s) => s.apiUser)
  const isCrm = isCrmAdminUser(apiUser)
  const { displayName, tenantCode } = useTenantContext()

  const visibleLabels = new Set(
    Object.entries(SIDEBAR_MODULE_MAP)
      .filter(([, moduleName]) => {
        if (!user) return false
        return getPermissionLevel(moduleName, user.role, matrix) !== 'none'
      })
      .map(([label]) => label),
  )

  const visibleItems = isCrm
    ? crmNavItems
    : navItems.filter((item) => {
        if (!visibleLabels.has(item.label)) return false
        if (item.label === 'Revenue' && user?.role === 'Counsellor') return false
        return true
      })

  const closeMobile = () => setSidebarOpen(false)

  useEffect(() => {
    closeMobile()
  }, [location.pathname])

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [sidebarOpen])

  const toggleMenu = (label: string) => {
    setOpenMenus((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    )
  }

  const isActive = (path: string) => location.pathname === path
  const isChildActive = (children?: { path: string }[]) =>
    children?.some((c) => location.pathname.startsWith(c.path))

  const showLabels = !collapsed || sidebarOpen

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden',
          sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={closeMobile}
        aria-hidden={!sidebarOpen}
      />
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-screen flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)] transition-transform duration-300 lg:transition-[width]',
          'w-[260px]',
          collapsed ? 'lg:w-[68px]' : 'lg:w-[220px]',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-[var(--sidebar-border)] px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
            <img
              src="/deducationist-icon.png"
              alt="D' Educationist"
              className="h-8 w-8 object-contain"
            />
          </div>
          {showLabels && (
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-sm leading-tight">
                {isCrm ? "D' Educationist" : displayName}
              </p>
              <p className="truncate text-xs text-[var(--sidebar-foreground)]/60">
                {isCrm
                  ? 'Platform CRM'
                  : tenantCode
                    ? `${tenantCode} · Accounting`
                    : 'Accounting'}
              </p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto shrink-0 text-[var(--sidebar-foreground)] hover:bg-white/10 lg:hidden"
            onClick={closeMobile}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <ScrollArea className="flex-1 py-3">
          <nav className="space-y-0.5 px-2">
            {visibleItems.map((item) => {
              if (item.children) {
                const open = openMenus.includes(item.label)
                const active = isChildActive(item.children)
                return (
                  <div key={item.label}>
                    <button
                      onClick={() => toggleMenu(item.label)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-white/5',
                        active && 'text-[var(--sidebar-accent)]',
                      )}
                    >
                      <item.icon className="h-[18px] w-[18px] shrink-0" />
                      {showLabels && (
                        <>
                          <span className="flex-1 text-left">{item.label}</span>
                          <ChevronDown
                            className={cn(
                              'h-4 w-4 transition-transform',
                              open && 'rotate-180',
                            )}
                          />
                        </>
                      )}
                    </button>
                    {showLabels && open && (
                      <div className="ml-4 mt-0.5 space-y-0.5 border-l border-[var(--sidebar-border)] pl-3">
                        {item.children.map((child) => (
                          <NavLink
                            key={child.path}
                            to={child.path}
                            onClick={closeMobile}
                            className={cn(
                              'block rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/5',
                              isActive(child.path) &&
                                'bg-[var(--sidebar-accent)]/15 text-[var(--sidebar-accent)] font-medium',
                            )}
                          >
                            {child.label}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                )
              }
              return (
                <NavLink
                  key={item.path}
                  to={item.path!}
                  onClick={closeMobile}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-white/5',
                    isActive(item.path!) &&
                      'bg-[var(--sidebar-accent)]/15 text-[var(--sidebar-accent)] font-medium',
                  )}
                >
                  <item.icon className="h-[18px] w-[18px] shrink-0" />
                  {showLabels && <span>{item.label}</span>}
                </NavLink>
              )
            })}
          </nav>
        </ScrollArea>
      </aside>
    </>
  )
}
