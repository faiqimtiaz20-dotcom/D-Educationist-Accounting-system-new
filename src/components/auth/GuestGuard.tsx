import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth-store'
import { defaultHomePath } from '@/lib/crm'

interface GuestGuardProps {
  children: React.ReactNode
}

export function GuestGuard({ children }: GuestGuardProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const apiUser = useAuthStore((s) => s.apiUser)

  if (isAuthenticated) {
    return <Navigate to={defaultHomePath(apiUser)} replace />
  }

  return <>{children}</>
}
