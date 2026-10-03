import { useAuthStore } from '@/store/auth-store'
import type { ApiAuthUser } from '@/lib/api-auth-types'

export function isCrmAdminUser(user: ApiAuthUser | null | undefined): boolean {
  if (!user) return false
  return Boolean(user.isCrmAdmin || user.roleCode === 'CRM_ADMIN')
}

/** Hook: current session is platform CRM Admin. */
export function useIsCrmAdmin(): boolean {
  const apiUser = useAuthStore((s) => s.apiUser)
  return isCrmAdminUser(apiUser)
}

/** Post-login / guest redirect target. */
export function defaultHomePath(user: ApiAuthUser | null | undefined): string {
  return isCrmAdminUser(user) ? '/crm/tenants' : '/'
}
