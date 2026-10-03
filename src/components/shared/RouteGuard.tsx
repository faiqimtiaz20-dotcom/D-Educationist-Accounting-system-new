import { useLocation, Navigate } from 'react-router-dom'
import { useRoutePermission } from '@/hooks/usePermission'
import { useAuthStore } from '@/store/auth-store'
import { isCrmAdminUser } from '@/lib/crm'
import { toast } from 'sonner'
import { useEffect, useRef } from 'react'

interface RouteGuardProps {
  children: React.ReactNode
}

export function RouteGuard({ children }: RouteGuardProps) {
  const location = useLocation()
  const apiUser = useAuthStore((s) => s.apiUser)
  const isCrm = isCrmAdminUser(apiUser)
  const isCrmPath = location.pathname.startsWith('/crm')
  const { canView } = useRoutePermission(location.pathname)
  const notified = useRef(false)

  useEffect(() => {
    if (isCrm || isCrmPath) {
      notified.current = false
      return
    }
    if (!canView && !notified.current) {
      notified.current = true
      toast.error('You do not have permission to access this module')
    }
    if (canView) notified.current = false
  }, [canView, location.pathname, isCrm, isCrmPath])

  // Platform CRM: only /crm/* — no Master Sheet / GL / reports
  if (isCrm) {
    if (!isCrmPath) {
      return <Navigate to="/crm/tenants" replace />
    }
    return <>{children}</>
  }

  // Tenant users cannot open CRM console
  if (isCrmPath) {
    if (!notified.current) {
      notified.current = true
      toast.error('CRM console is restricted to platform CRM Admin')
    }
    return <Navigate to="/" replace />
  }

  if (!canView) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
