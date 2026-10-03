import { useAuthStore } from '@/store/auth-store'
import { useSettingsStore } from '@/store/settings-store'
import { isCrmAdminUser } from '@/lib/crm'

/**
 * Tenant context for the SPA (MT7).
 * CRM Admin has null tenantId — platform shell only.
 * There is no client-side tenant switcher for normal users.
 */
export function useTenantContext() {
  const apiUser = useAuthStore((s) => s.apiUser)
  const orgName = useSettingsStore((s) => s.orgName)
  const isCrm = isCrmAdminUser(apiUser)

  const tenantId = apiUser?.tenantId ?? null
  const tenantCode = apiUser?.tenantCode ?? null
  const tenantName =
    apiUser?.tenantName || orgName || (isCrm ? 'Platform' : null)
  const displayName = isCrm
    ? 'Platform CRM'
    : tenantName || orgName || 'Your organisation'

  return {
    tenantId,
    tenantCode,
    tenantName: apiUser?.tenantName ?? null,
    tenantStatus: apiUser?.tenantStatus ?? null,
    orgName: orgName || null,
    displayName,
    isCrm,
    /** True when session is bound to one tenant (not platform). */
    isTenantBound: Boolean(tenantId) && !isCrm,
  }
}

export function getTenantDisplayName(): string {
  const apiUser = useAuthStore.getState().apiUser
  const orgName = useSettingsStore.getState().orgName
  if (isCrmAdminUser(apiUser)) return 'Platform CRM'
  return apiUser?.tenantName || orgName || 'Your organisation'
}
