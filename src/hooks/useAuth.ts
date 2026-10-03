import { useAuthStore } from '@/store/auth-store'
import { useDataStore } from '@/store/data-store'
import { useAppStore } from '@/store/app-store'
import { canViewAllBranches } from '@/lib/permissions'
import { toFrontendRole } from '@/lib/api-auth-types'
import type { User } from '@/types'
import { useEffect } from 'react'

export function useCurrentUser(): User | undefined {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const currentUserId = useAuthStore((s) => s.currentUserId)
  const apiUser = useAuthStore((s) => s.apiUser)
  const users = useDataStore((s) => s.users)

  if (!isAuthenticated || !currentUserId) return undefined

  if (apiUser) {
    return {
      id: apiUser.id,
      name: apiUser.fullName,
      email: apiUser.email,
      role: toFrontendRole(apiUser.roleName),
      branchId: apiUser.branchId ?? '',
    }
  }

  return users.find((u) => u.id === currentUserId)
}

export function useEffectiveBranchId(): string {
  const user = useCurrentUser()
  const selectedBranchId = useAppStore((s) => s.selectedBranchId)
  if (user && canViewAllBranches(user.role)) return selectedBranchId
  return user?.branchId ?? 'khi'
}

/** Lock branch scope when a non–super-admin logs in */
export function useBranchScope() {
  const user = useCurrentUser()
  const setSelectedBranchId = useAppStore((s) => s.setSelectedBranchId)

  useEffect(() => {
    if (user && !canViewAllBranches(user.role)) {
      setSelectedBranchId(user.branchId)
    }
  }, [user?.id, user?.branchId, user?.role, setSelectedBranchId])
}
