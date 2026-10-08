export type ApiAuthUser = {
  id: string
  email: string
  fullName: string
  phone?: string | null
  roleId: string
  roleCode: string
  roleName: string
  tenantId: string | null
  /** Present for tenant users; null for CRM_ADMIN. */
  tenantCode?: string | null
  tenantName?: string | null
  tenantStatus?: string | null
  branchId: string | null
  branchCode: string | null
  branchName?: string | null
  /** True when home branch is Head Office. */
  branchIsHeadOffice?: boolean
  isSuperAdmin: boolean
  /** Tenant Admin, or HO Branch Manager / Accountant. */
  canViewAllBranches?: boolean
  isCrmAdmin?: boolean
}

/**
 * Map API role name to frontend UserRole union.
 * TENANT_ADMIN / Super Admin both map to 'Super Admin' (tenant-scoped full access).
 * CRM Admin is handled via isCrmAdmin — not a matrix role.
 */
export function toFrontendRole(
  roleName: string,
):
  | 'Super Admin'
  | 'Branch Manager'
  | 'Accountant'
  | 'Cashier'
  | 'Counsellor'
  | 'Read Only' {
  if (roleName === 'Tenant Admin' || roleName === 'Super Admin') {
    return 'Super Admin'
  }
  const allowed = [
    'Branch Manager',
    'Accountant',
    'Cashier',
    'Counsellor',
    'Read Only',
  ] as const
  if ((allowed as readonly string[]).includes(roleName)) {
    return roleName as (typeof allowed)[number]
  }
  return 'Read Only'
}

/** UI label: avoid implying platform-wide “Super Admin”. */
export function displayRoleLabel(
  role: string,
  opts?: { isCrmAdmin?: boolean; roleName?: string },
): string {
  if (opts?.isCrmAdmin) return 'CRM Admin'
  if (opts?.roleName === 'Tenant Admin' || role === 'Super Admin') {
    return 'Tenant Admin'
  }
  return opts?.roleName ?? role
}
