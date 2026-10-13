import { useAuthStore } from '@/store/auth-store'
import { getPermissionLevel, type PermissionLevel } from '@/lib/permissions'
import { getPermissionModuleForPath } from '@/lib/module-permissions'
import { useCurrentUser } from '@/hooks/useAuth'

export function useModulePermission(moduleName: string) {
  const user = useCurrentUser()
  const matrix = useAuthStore((s) => s.permissionMatrix)
  const level: PermissionLevel = user
    ? getPermissionLevel(moduleName, user.role, matrix)
    : 'none'

  return {
    level,
    canView: level !== 'none',
    canWrite: level === 'full',
    canApprove: level === 'full' || level === 'limited',
    isReadOnly: level === 'read',
    isHidden: level === 'none',
  }
}

export function useRoutePermission(pathname: string) {
  const moduleName = getPermissionModuleForPath(pathname)
  // Always call the hook. /profile and /crm have no matrix module; skipping
  // the hook here changes the hook count and crashes the page.
  const perm = useModulePermission(moduleName ?? 'Dashboard & Reports')
  if (!moduleName) {
    return {
      canView: true,
      canWrite: true,
      canApprove: true,
      isReadOnly: false,
      isHidden: false,
      level: 'full' as PermissionLevel,
    }
  }
  return perm
}
