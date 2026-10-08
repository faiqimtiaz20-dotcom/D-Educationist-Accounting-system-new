import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  DEFAULT_PERMISSION_MATRIX,
  mergePermissionMatrix,
  type PermissionLevel,
  type PermissionMatrixRow,
} from '@/lib/permissions'
import { verifyPassword } from '@/lib/auth-credentials'
import { logAudit } from '@/lib/audit'
import { useDataStore } from '@/store/data-store'
import { useAppStore } from '@/store/app-store'
import { canViewAllBranches } from '@/lib/permissions'
import type { UserRole } from '@/types'
import {
  apiFetch,
  isApiMode,
  isProductionBuild,
  loadTokens,
  saveTokens,
} from '@/lib/api-client'
import type { ApiAuthUser } from '@/lib/api-auth-types'
import { toFrontendRole } from '@/lib/api-auth-types'
import { getSettings } from '@/lib/settings-api'
import { useSettingsStore } from '@/store/settings-store'

type LoginResult = { success: boolean; error?: string }

interface AuthState {
  isAuthenticated: boolean
  currentUserId: string | null
  /** Populated when logged in via API (M2+). Mock mode may leave this null. */
  apiUser: ApiAuthUser | null
  accessToken: string | null
  refreshToken: string | null
  loginAt: string | null
  rememberedEmail: string
  permissionMatrix: PermissionMatrixRow[]
  authMode: 'api' | 'mock'

  login: (email: string, password: string, remember?: boolean) => Promise<LoginResult>
  logout: () => Promise<void>
  setRememberedEmail: (email: string) => void
  setCurrentUserId: (id: string) => void
  setApiUser: (user: ApiAuthUser | null) => void
  updatePermission: (rowId: string, role: UserRole, level: PermissionLevel) => void
  resetPermissionMatrix: () => void
  hydrateFromTokens: () => Promise<void>
}

function mapApiPermissions(
  permissions: { moduleName: string; level: string }[],
): PermissionMatrixRow[] {
  // Keep default shape; overlay levels for current session is handled via /me later.
  // Matrix editing still uses store defaults until settings screen is API-wired.
  void permissions
  return mergePermissionMatrix(DEFAULT_PERMISSION_MATRIX)
}

/** Load this tenant's settings into the SPA store (MT7 — no global org assumption). */
async function hydrateTenantSettings(user: ApiAuthUser) {
  if (user.isCrmAdmin || user.roleCode === 'CRM_ADMIN' || !user.tenantId) {
    useSettingsStore.getState().setOrgName('')
    return
  }
  try {
    const settings = await getSettings()
    useSettingsStore.getState().applyApiSettings(settings)
  } catch {
    if (user.tenantName) {
      useSettingsStore.getState().setOrgName(user.tenantName)
    }
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      currentUserId: null,
      apiUser: null,
      accessToken: null,
      refreshToken: null,
      loginAt: null,
      rememberedEmail: '',
      permissionMatrix: DEFAULT_PERMISSION_MATRIX,
      authMode: isApiMode() ? 'api' : 'mock',

      login: async (email, password, remember = false) => {
        const normalized = email.trim().toLowerCase()
        if (!normalized || !password) {
          return { success: false, error: 'Email and password are required' }
        }

        if (isApiMode()) {
          try {
            const data = await apiFetch<{
              accessToken: string
              refreshToken: string
              user: ApiAuthUser
            }>('/auth/login', {
              method: 'POST',
              body: JSON.stringify({ email: normalized, password }),
            })

            saveTokens({
              accessToken: data.accessToken,
              refreshToken: data.refreshToken,
            })

            const loginAt = new Date().toISOString()
            set({
              isAuthenticated: true,
              currentUserId: data.user.id,
              apiUser: data.user,
              accessToken: data.accessToken,
              refreshToken: data.refreshToken,
              loginAt,
              authMode: 'api',
              rememberedEmail: remember ? normalized : get().rememberedEmail,
            })

            if (
              data.user.canViewAllBranches ||
              data.user.isSuperAdmin ||
              canViewAllBranches({
                role: toFrontendRole(data.user.roleName),
                branchIsHeadOffice: data.user.branchIsHeadOffice,
                canViewAllBranches: data.user.canViewAllBranches,
                branchId: data.user.branchId ?? undefined,
              })
            ) {
              useAppStore.getState().setSelectedBranchId('all')
            } else if (data.user.branchId) {
              useAppStore.getState().setSelectedBranchId(data.user.branchId)
            }

            // Pull permission list for session (matrix UI still uses defaults until M2 settings UI wire)
            try {
              const me = await apiFetch<{
                user: ApiAuthUser
                permissions: { moduleName: string; level: string }[]
              }>('/auth/me')
              set({
                apiUser: me.user,
                permissionMatrix: mapApiPermissions(me.permissions),
              })
              await hydrateTenantSettings(me.user)
            } catch {
              await hydrateTenantSettings(data.user)
            }

            return { success: true }
          } catch (err) {
            return {
              success: false,
              error: err instanceof Error ? err.message : 'Login failed',
            }
          }
        }

        // Mock / local Zustand fallback — never in production or API mode
        if (isProductionBuild() || isApiMode()) {
          return {
            success: false,
            error: 'API mode requires a live server login. Set VITE_API_URL and use seeded credentials.',
          }
        }

        const user = useDataStore.getState().users.find(
          (u) => u.email.toLowerCase() === normalized,
        )

        if (!user || !verifyPassword(normalized, password)) {
          logAudit({
            module: 'Auth',
            action: 'Failed login attempt',
            details: normalized,
          })
          return { success: false, error: 'Invalid email or password' }
        }

        const loginAt = new Date().toISOString()
        set({
          isAuthenticated: true,
          currentUserId: user.id,
          apiUser: null,
          accessToken: null,
          refreshToken: null,
          loginAt,
          authMode: 'mock',
          rememberedEmail: remember ? normalized : get().rememberedEmail,
        })

        if (canViewAllBranches(user)) {
          useAppStore.getState().setSelectedBranchId('all')
        } else {
          useAppStore.getState().setSelectedBranchId(user.branchId)
        }

        logAudit({
          module: 'Auth',
          action: 'User signed in',
          entityId: user.id,
          details: `${user.name} (${user.role})`,
        })

        return { success: true }
      },

      logout: async () => {
        const { currentUserId, refreshToken, authMode } = get()
        if (authMode === 'api' && isApiMode()) {
          try {
            await apiFetch('/auth/logout', {
              method: 'POST',
              body: JSON.stringify({ refreshToken }),
            })
          } catch {
            /* ignore network errors on logout */
          }
        } else if (currentUserId) {
          logAudit({ module: 'Auth', action: 'User signed out', entityId: currentUserId })
        }

        saveTokens(null)
        useSettingsStore.getState().setOrgName('')
        set({
          isAuthenticated: false,
          currentUserId: null,
          apiUser: null,
          accessToken: null,
          refreshToken: null,
          loginAt: null,
        })
      },

      setRememberedEmail: (email) => set({ rememberedEmail: email }),

      setCurrentUserId: (id) => set({ currentUserId: id }),

      setApiUser: (user) => set({ apiUser: user }),

      updatePermission: (rowId, role, level) =>
        set((s) => ({
          permissionMatrix: s.permissionMatrix.map((row) =>
            row.id === rowId
              ? { ...row, permissions: { ...row.permissions, [role]: level } }
              : row
          ),
        })),

      resetPermissionMatrix: () => set({ permissionMatrix: DEFAULT_PERMISSION_MATRIX }),

      hydrateFromTokens: async () => {
        if (!isApiMode()) return
        const tokens = loadTokens()
        if (!tokens?.accessToken) return
        try {
          const me = await apiFetch<{
            user: ApiAuthUser
            permissions: { moduleName: string; level: string }[]
          }>('/auth/me')
          set({
            isAuthenticated: true,
            currentUserId: me.user.id,
            apiUser: me.user,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            authMode: 'api',
            permissionMatrix: mapApiPermissions(me.permissions),
            loginAt: get().loginAt ?? new Date().toISOString(),
          })
          if (
            me.user.canViewAllBranches ||
            me.user.isSuperAdmin ||
            canViewAllBranches({
              role: toFrontendRole(me.user.roleName),
              branchIsHeadOffice: me.user.branchIsHeadOffice,
              canViewAllBranches: me.user.canViewAllBranches,
              branchId: me.user.branchId ?? undefined,
            })
          ) {
            useAppStore.getState().setSelectedBranchId('all')
          } else if (me.user.branchId) {
            useAppStore.getState().setSelectedBranchId(me.user.branchId)
          }
          await hydrateTenantSettings(me.user)
        } catch {
          saveTokens(null)
          useSettingsStore.getState().setOrgName('')
          set({
            isAuthenticated: false,
            currentUserId: null,
            apiUser: null,
            accessToken: null,
            refreshToken: null,
          })
        }
      },
    }),
    {
      name: 'saa-auth-store',
      partialize: (s) => ({
        isAuthenticated: s.isAuthenticated,
        currentUserId: s.currentUserId,
        apiUser: s.apiUser,
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
        loginAt: s.loginAt,
        rememberedEmail: s.rememberedEmail,
        permissionMatrix: s.permissionMatrix,
        authMode: s.authMode,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<AuthState>
        if (p.accessToken && p.refreshToken) {
          saveTokens({
            accessToken: p.accessToken,
            refreshToken: p.refreshToken,
          })
        }
        return {
          ...current,
          ...p,
          isAuthenticated: p.isAuthenticated ?? false,
          currentUserId: p.isAuthenticated ? (p.currentUserId ?? null) : null,
          apiUser: p.isAuthenticated ? (p.apiUser ?? null) : null,
          authMode: isApiMode() ? 'api' : (p.authMode ?? 'mock'),
          permissionMatrix: mergePermissionMatrix(
            p.permissionMatrix ?? DEFAULT_PERMISSION_MATRIX
          ),
        }
      },
    }
  )
)

export function getSessionUserRole(): UserRole | undefined {
  const apiUser = useAuthStore.getState().apiUser
  if (apiUser) return toFrontendRole(apiUser.roleName)
  const id = useAuthStore.getState().currentUserId
  if (!id) return undefined
  return useDataStore.getState().users.find((u) => u.id === id)?.role
}
