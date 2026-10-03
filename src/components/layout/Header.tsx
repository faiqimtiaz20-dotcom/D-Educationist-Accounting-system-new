import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCurrentUser } from '@/hooks/useAuth'
import { canViewAllBranches } from '@/lib/permissions'
import { isCrmAdminUser } from '@/lib/crm'
import { displayRoleLabel } from '@/lib/api-auth-types'
import { useTenantContext } from '@/lib/tenant-context'
import { useAuthStore } from '@/store/auth-store'
import { useAppStore } from '@/store/app-store'
import { useDataStore } from '@/store/data-store'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NotificationsBell } from '@/components/layout/NotificationsBell'
import { LogOut, Menu, Moon, Search, Sun, UserRound } from 'lucide-react'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

interface HeaderProps {
  onOpenSearch: () => void
}

export function Header({ onOpenSearch }: HeaderProps) {
  const navigate = useNavigate()
  const user = useCurrentUser()
  const apiUser = useAuthStore((s) => s.apiUser)
  const logout = useAuthStore((s) => s.logout)
  const branches = useDataStore((s) => s.branches)
  const {
    selectedBranchId,
    setSelectedBranchId,
    darkMode,
    toggleDarkMode,
    toggleSidebarOpen,
  } = useAppStore()

  const isCrm = isCrmAdminUser(apiUser)
  const isSuperAdmin = !isCrm && user ? canViewAllBranches(user.role) : false
  const { displayName, tenantCode, isTenantBound } = useTenantContext()
  const roleLabel = displayRoleLabel(user?.role ?? '', {
    isCrmAdmin: isCrm,
    roleName: apiUser?.roleName,
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        if (!isCrm) onOpenSearch()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onOpenSearch, isCrm])

  const handleLogout = () => {
    void logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-card px-3 sm:gap-4 sm:px-4 lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 lg:hidden"
        onClick={toggleSidebarOpen}
      >
        <Menu className="h-5 w-5" />
      </Button>
      {!isCrm ? (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 md:hidden"
            onClick={onOpenSearch}
            title="Search"
          >
            <Search className="h-4 w-4" />
          </Button>
          <div className="relative hidden min-w-0 flex-1 max-w-md md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search students, invoices, reports..."
              className="pl-9 bg-muted/50 cursor-pointer"
              readOnly
              onClick={onOpenSearch}
            />
            <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
              Ctrl+K
            </kbd>
          </div>
        </>
      ) : (
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Tenant lifecycle</p>
          <p className="text-xs text-muted-foreground">
            Platform console · no accounting modules
          </p>
        </div>
      )}
      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
        {isCrm ? (
          <Badge variant="outline" className="text-xs sm:text-sm">
            Platform
          </Badge>
        ) : (
          <>
            {isTenantBound && tenantCode ? (
              <Badge
                variant="secondary"
                className="hidden max-w-[140px] truncate text-xs sm:inline-flex"
                title={displayName}
              >
                {tenantCode}
              </Badge>
            ) : null}
            {isSuperAdmin ? (
              <>
                <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                  <SelectTrigger className="hidden h-8 w-[160px] sm:flex">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                  <SelectTrigger className="h-8 w-[100px] text-xs sm:hidden">
                    <SelectValue placeholder="Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            ) : (
              <Badge
                variant="outline"
                className="max-w-[88px] truncate text-xs sm:max-w-none sm:text-sm"
              >
                {branches.find((b) => b.id === user?.branchId)?.name ?? 'Branch'}
              </Badge>
            )}
          </>
        )}
        <Button variant="ghost" size="icon" onClick={toggleDarkMode}>
          {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        {!isCrm ? <NotificationsBell /> : null}
        <div className="flex items-center gap-1 border-l pl-1 sm:gap-2 sm:pl-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback>{user?.name?.charAt(0) ?? 'U'}</AvatarFallback>
                </Avatar>
                <div className="hidden text-left sm:block">
                  <p className="text-sm font-medium leading-none">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{roleLabel}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <UserRound className="mr-2 h-4 w-4" />
                My profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
