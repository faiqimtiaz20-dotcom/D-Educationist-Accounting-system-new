import type { UserRole } from '@/types'

export type PermissionLevel = 'full' | 'read' | 'limited' | 'none'

export interface PermissionMatrixRow {
  id: string
  module: string
  permissions: Record<UserRole, PermissionLevel>
}

export const DEFAULT_PERMISSION_MATRIX: PermissionMatrixRow[] = [
  {
    id: 'pm1',
    module: 'Dashboard & Reports',
    permissions: {
      'Super Admin': 'full',
      'Branch Manager': 'full',
      Accountant: 'read',
      Cashier: 'read',
      Counsellor: 'read',
      'Read Only': 'read',
    },
  },
  {
    id: 'pm2',
    module: 'Master Sheet / Students',
    permissions: {
      'Super Admin': 'full',
      'Branch Manager': 'full',
      Accountant: 'read',
      Cashier: 'none',
      Counsellor: 'full',
      'Read Only': 'read',
    },
  },
  {
    id: 'pm3',
    module: 'Invoices & Receivables',
    permissions: {
      'Super Admin': 'full',
      'Branch Manager': 'full',
      Accountant: 'full',
      Cashier: 'read',
      Counsellor: 'none',
      'Read Only': 'read',
    },
  },
  {
    id: 'pm4',
    module: 'Expenses & Petty Cash',
    permissions: {
      'Super Admin': 'full',
      'Branch Manager': 'full',
      Accountant: 'full',
      Cashier: 'full',
      Counsellor: 'none',
      'Read Only': 'read',
    },
  },
  {
    id: 'pm5',
    module: 'Journal Entries',
    permissions: {
      'Super Admin': 'full',
      'Branch Manager': 'limited',
      Accountant: 'full',
      Cashier: 'none',
      Counsellor: 'none',
      'Read Only': 'read',
    },
  },
  {
    id: 'pm6',
    module: 'Approvals',
    permissions: {
      'Super Admin': 'full',
      'Branch Manager': 'full',
      Accountant: 'limited',
      Cashier: 'none',
      Counsellor: 'none',
      'Read Only': 'none',
    },
  },
  {
    id: 'pm7',
    module: 'Settings',
    permissions: {
      'Super Admin': 'full',
      'Branch Manager': 'limited',
      Accountant: 'none',
      Cashier: 'none',
      Counsellor: 'none',
      'Read Only': 'none',
    },
  },
  {
    id: 'pm8',
    module: 'Sub-Agents & Payables',
    permissions: {
      'Super Admin': 'full',
      'Branch Manager': 'full',
      Accountant: 'full',
      Cashier: 'read',
      Counsellor: 'none',
      'Read Only': 'read',
    },
  },
  {
    id: 'pm9',
    module: 'Bank & Cash',
    permissions: {
      'Super Admin': 'full',
      'Branch Manager': 'full',
      Accountant: 'full',
      Cashier: 'read',
      Counsellor: 'none',
      'Read Only': 'read',
    },
  },
  {
    id: 'pm10',
    module: 'Tax & Compliance',
    permissions: {
      'Super Admin': 'full',
      'Branch Manager': 'read',
      Accountant: 'full',
      Cashier: 'none',
      Counsellor: 'none',
      'Read Only': 'read',
    },
  },
  {
    id: 'pm11',
    module: 'Operations',
    permissions: {
      'Super Admin': 'full',
      'Branch Manager': 'full',
      Accountant: 'read',
      Cashier: 'none',
      Counsellor: 'none',
      'Read Only': 'read',
    },
  },
]

/** Merge persisted matrix with defaults so newly added modules stay visible after upgrades */
export function mergePermissionMatrix(
  persisted: PermissionMatrixRow[],
  defaults: PermissionMatrixRow[] = DEFAULT_PERMISSION_MATRIX
): PermissionMatrixRow[] {
  return defaults.map((defaultRow) => {
    const existing = persisted.find(
      (r) => r.id === defaultRow.id || r.module === defaultRow.module
    )
    if (!existing) return defaultRow
    return {
      ...defaultRow,
      permissions: { ...defaultRow.permissions, ...existing.permissions },
    }
  })
}

export function getPermissionLevel(
  moduleName: string,
  role: UserRole,
  matrix: PermissionMatrixRow[]
): PermissionLevel {
  const merged = mergePermissionMatrix(matrix)
  const row = merged.find((r) => r.module === moduleName)
  return row?.permissions[role] ?? 'none'
}

export const USER_ROLES: UserRole[] = [
  'Super Admin',
  'Branch Manager',
  'Accountant',
  'Cashier',
  'Counsellor',
  'Read Only',
]

export function isSuperAdmin(role: UserRole) {
  // Frontend alias: Super Admin === TENANT_ADMIN (all branches in one tenant). Not platform CRM.
  return role === 'Super Admin'
}

export function isBranchManager(role: UserRole) {
  return role === 'Branch Manager'
}

/** All branches within the current tenant — never cross-tenant. */
export function canViewAllBranches(role: UserRole) {
  return role === 'Super Admin'
}

export function canManageBranches(role: UserRole) {
  return role === 'Super Admin'
}

export function canManageUsers(role: UserRole) {
  return role === 'Super Admin' || role === 'Branch Manager'
}

export function canEditPermissionMatrix(role: UserRole) {
  return role === 'Super Admin'
}

export function assignableRolesFor(role: UserRole): UserRole[] {
  // Tenant Admin cannot create platform CRM_ADMIN or another Tenant Admin via this matrix UI.
  if (role === 'Super Admin') return USER_ROLES.filter((r) => r !== 'Super Admin')
  if (role === 'Branch Manager') return ['Accountant', 'Cashier', 'Counsellor', 'Read Only']
  return []
}
