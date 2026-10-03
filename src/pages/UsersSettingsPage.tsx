import { PageHeader } from '@/components/shared/PageHeader'
import { RowActions } from '@/components/shared/RowActions'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useCurrentUser } from '@/hooks/useAuth'
import { useBranchFilter } from '@/hooks/useBranchFilter'
import {
  DEFAULT_PERMISSION_MATRIX,
  assignableRolesFor,
  canEditPermissionMatrix,
  canManageUsers,
  USER_ROLES,
  type PermissionLevel,
  type PermissionMatrixRow,
} from '@/lib/permissions'
import { getBranchName } from '@/lib/org'
import { isApiMode } from '@/lib/api-client'
import {
  MODULE_NAME_TO_CODE,
  ROLE_NAME_TO_CODE,
  createUser,
  deleteUser,
  getPermissionMatrix,
  listBranches,
  listUsers,
  putPermissionMatrix,
  updateUser,
  type ApiBranch,
  type ApiUser,
} from '@/lib/settings-api'
import { useAuthStore } from '@/store/auth-store'
import { useDataStore } from '@/store/data-store'
import type { User, UserRole } from '@/types'
import { Ban, Check, CheckCircle2, Minus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

type UserRow = User & { isActive: boolean }

const roleVariants: Record<UserRole, 'default' | 'purple' | 'info' | 'warning' | 'success' | 'secondary'> = {
  'Super Admin': 'default',
  'Branch Manager': 'purple',
  Accountant: 'info',
  Cashier: 'warning',
  Counsellor: 'success',
  'Read Only': 'secondary',
}

const PERMISSION_LEVELS: PermissionLevel[] = ['full', 'read', 'limited', 'none']

const emptyUser = (branchId: string): Omit<User, 'id'> & { password?: string; isActive: boolean } => ({
  name: '',
  email: '',
  role: 'Accountant',
  branchId,
  password: '',
  isActive: true,
})

function PermissionCell({ level }: { level: PermissionLevel }) {
  if (level === 'full') return <Check className="mx-auto h-4 w-4 text-emerald-600" />
  if (level === 'read' || level === 'limited')
    return <span className="text-xs font-medium text-amber-600">{level}</span>
  return <Minus className="mx-auto h-4 w-4 text-muted-foreground/40" />
}

function mapApiUser(u: ApiUser): UserRow {
  return {
    id: u.id,
    name: u.fullName,
    email: u.email,
    role: (u.role.name === 'Tenant Admin' ? 'Super Admin' : u.role.name) as UserRole,
    branchId: u.branchId,
    isActive: u.isActive,
  }
}

export function UsersSettingsPage() {
  const currentUser = useCurrentUser()
  const storeUsers = useDataStore((s) => s.users)
  const storeBranches = useDataStore((s) => s.branches)
  const addStoreUser = useDataStore((s) => s.addUser)
  const updateStoreUser = useDataStore((s) => s.updateUser)
  const deleteStoreUser = useDataStore((s) => s.deleteUser)
  const storeMatrix = useAuthStore((s) => s.permissionMatrix)
  const updateStorePermission = useAuthStore((s) => s.updatePermission)
  const resetStoreMatrix = useAuthStore((s) => s.resetPermissionMatrix)

  const api = isApiMode()
  const [apiUsers, setApiUsers] = useState<UserRow[]>([])
  const [apiBranches, setApiBranches] = useState<ApiBranch[]>([])
  const [apiMatrix, setApiMatrix] = useState<PermissionMatrixRow[]>(DEFAULT_PERMISSION_MATRIX)
  const [loading, setLoading] = useState(api)

  const canManage = currentUser ? canManageUsers(currentUser.role) : false
  const canEditMatrix = currentUser ? canEditPermissionMatrix(currentUser.role) : false

  const load = useCallback(async () => {
    if (!api) return
    setLoading(true)
    try {
      const [users, branches, matrixRes] = await Promise.all([
        listUsers(),
        listBranches(),
        getPermissionMatrix(),
      ])
      setApiUsers(users.map(mapApiUser))
      setApiBranches(branches)
      setApiMatrix(
        matrixRes.matrix.map((row, i) => ({
          id: `pm${i + 1}`,
          module: row.moduleName,
          permissions: Object.fromEntries(
            USER_ROLES.map((role) => [
              role,
              (row.permissions[ROLE_NAME_TO_CODE[role]] ??
                row.permissions[role] ??
                'none') as PermissionLevel,
            ]),
          ) as Record<UserRole, PermissionLevel>,
        })),
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    void load()
  }, [load])

  const users: UserRow[] = api
    ? apiUsers
    : storeUsers.map((u) => ({ ...u, isActive: true }))
  const branches = api
    ? apiBranches.map((b) => ({
        id: b.id,
        name: b.name,
        code: b.code,
        city: b.city,
        isHeadOffice: b.isHeadOffice,
      }))
    : storeBranches
  const permissionMatrix = api ? apiMatrix : storeMatrix

  const visibleUsers = useMemo(() => {
    if (currentUser?.role === 'Super Admin') return users
    if (currentUser?.role === 'Branch Manager') {
      return users.filter((u) => u.branchId === currentUser.branchId && u.role !== 'Super Admin')
    }
    return users.filter((u) => u.id === currentUser?.id)
  }, [users, currentUser])

  const branchFilteredUsers = useBranchFilter(visibleUsers)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyUser(currentUser?.branchId ?? ''))

  const assignableRoles = currentUser ? assignableRolesFor(currentUser.role) : []

  const openAdd = () => {
    setIsEdit(false)
    setEditId(null)
    setForm(emptyUser(currentUser?.branchId ?? branches[0]?.id ?? ''))
    setDialogOpen(true)
  }

  const openEdit = (u: UserRow) => {
    if (u.role === 'Super Admin' && currentUser?.role !== 'Super Admin') return
    setIsEdit(true)
    setEditId(u.id)
    setForm({
      name: u.name,
      email: u.email,
      role: u.role,
      branchId: u.branchId,
      password: '',
      isActive: u.isActive,
    })
    setDialogOpen(true)
  }

  const handleToggleActive = async (u: UserRow) => {
    if (u.id === currentUser?.id) {
      toast.error('You cannot disable your own account')
      return
    }
    if (u.role === 'Super Admin' && currentUser?.role !== 'Super Admin') {
      toast.error('Cannot change Tenant Admin status')
      return
    }
    const next = !u.isActive
    const label = next ? 'enable' : 'disable'
    if (!confirm(`${next ? 'Enable' : 'Disable'} account for ${u.name}?`)) return
    try {
      if (api) {
        await updateUser(u.id, { isActive: next })
        await load()
      } else {
        toast.error('Enable/disable requires API mode')
        return
      }
      toast.success(`User ${label}d`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${label} user`)
    }
  }

  const handleDelete = async (u: UserRow) => {
    if (u.id === currentUser?.id) {
      toast.error('You cannot delete your own account')
      return
    }
    if (u.role === 'Super Admin') {
      toast.error('Tenant Admin cannot be deleted')
      return
    }
    if (!confirm(`Delete user ${u.name}?`)) return
    try {
      if (api) {
        await deleteUser(u.id)
        await load()
      } else {
        deleteStoreUser(u.id)
      }
      toast.success('User deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Name and email are required')
      return
    }
    if (currentUser?.role === 'Branch Manager' && form.branchId !== currentUser.branchId) {
      toast.error('You can only add users to your own branch')
      return
    }
    if (api && !isEdit && (!form.password || form.password.length < 8)) {
      toast.error('Password must be at least 8 characters')
      return
    }
    try {
      if (api) {
        if (isEdit && editId) {
          await updateUser(editId, {
            fullName: form.name,
            email: form.email,
            roleCode: ROLE_NAME_TO_CODE[form.role],
            branchId: form.branchId,
            isActive: form.isActive,
            ...(form.password ? { password: form.password } : {}),
          })
          toast.success('User updated')
        } else {
          await createUser({
            fullName: form.name,
            email: form.email,
            password: form.password!,
            roleCode: ROLE_NAME_TO_CODE[form.role],
            branchId: form.branchId,
          })
          toast.success('User added')
        }
        await load()
      } else if (isEdit && editId) {
        updateStoreUser(editId, {
          name: form.name,
          email: form.email,
          role: form.role,
          branchId: form.branchId,
        })
        toast.success('User updated')
      } else {
        addStoreUser({
          name: form.name,
          email: form.email,
          role: form.role,
          branchId: form.branchId,
        })
        toast.success('User added')
      }
      setDialogOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    }
  }

  const handlePermissionChange = async (
    row: PermissionMatrixRow,
    role: UserRole,
    level: PermissionLevel,
  ) => {
    if (api) {
      try {
        await putPermissionMatrix([
          {
            roleCode: ROLE_NAME_TO_CODE[role],
            moduleCode: MODULE_NAME_TO_CODE[row.module] ?? row.module,
            level,
          },
        ])
        await load()
        toast.success('Permission updated')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Update failed')
      }
      return
    }
    updateStorePermission(row.id, role, level)
  }

  const columns: Column<UserRow>[] = [
    { key: 'name', header: 'Name', cell: (u) => <span className="font-medium">{u.name}</span> },
    { key: 'email', header: 'Email', cell: (u) => u.email },
    {
      key: 'status',
      header: 'Status',
      cell: (u) =>
        u.isActive ? (
          <Badge variant="success">Active</Badge>
        ) : (
          <Badge variant="secondary">Disabled</Badge>
        ),
    },
    { key: 'role', header: 'Role', cell: (u) => <Badge variant={roleVariants[u.role]}>{u.role === 'Super Admin' ? 'Tenant Admin' : u.role}</Badge> },
    {
      key: 'branch',
      header: 'Branch',
      cell: (u) => branches.find((b) => b.id === u.branchId)?.name ?? getBranchName(u.branchId),
    },
    ...(canManage
      ? [{
          key: 'actions',
          header: 'Actions',
          cell: (u: UserRow) =>
            u.role === 'Super Admin' && currentUser?.role !== 'Super Admin' ? null : (
              <div className="flex items-center gap-1">
                <RowActions onEdit={() => openEdit(u)} onDelete={() => void handleDelete(u)} />
                {u.id !== currentUser?.id ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    title={u.isActive ? 'Disable account' : 'Enable account'}
                    className={u.isActive ? 'text-amber-700 hover:text-amber-800' : 'text-emerald-700 hover:text-emerald-800'}
                    onClick={() => void handleToggleActive(u)}
                  >
                    {u.isActive ? (
                      <Ban className="h-4 w-4" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                  </Button>
                ) : null}
              </div>
            ),
        }]
      : []),
  ]

  return (
    <div className="space-y-8">
      <PageHeader
        title="Users & Roles"
        subtitle={
          currentUser?.role === 'Branch Manager'
            ? 'Manage staff for your branch within this organisation'
            : api
              ? 'Staff for this organisation only — Tenant Admin manages all branches'
              : 'Staff accounts and permission matrix'
        }
        actionLabel={canManage ? 'Add User' : undefined}
        onAction={canManage ? openAdd : undefined}
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading users…</p>
      ) : (
        <DataTable
          data={branchFilteredUsers}
          columns={columns}
          searchPlaceholder="Search users..."
          searchFilter={(u, q) =>
            u.name.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            u.role.toLowerCase().includes(q)
          }
          filters={[
            {
              key: 'status',
              label: 'Status',
              type: 'select',
              options: [
                { label: 'Active', value: 'active' },
                { label: 'Disabled', value: 'disabled' },
              ],
              accessor: (u) => (u.isActive ? 'active' : 'disabled'),
            },
            {
              key: 'role',
              label: 'Role',
              type: 'select',
              options: USER_ROLES.map((r) => ({
                label: r === 'Super Admin' ? 'Tenant Admin' : r,
                value: r,
              })),
              accessor: (u) => u.role,
            },
            {
              key: 'branch',
              label: 'Branch',
              type: 'select',
              options: branches.map((b) => ({ label: b.name, value: b.id })),
              accessor: (u) => u.branchId,
            },
          ]}
        />
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Role Permission Matrix</CardTitle>
            <CardDescription>
              {canEditMatrix
                ? 'Tenant Admin can configure module access per role (this organisation only)'
                : 'View-only permission overview'}
            </CardDescription>
          </div>
          {canEditMatrix && !api && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                resetStoreMatrix()
                toast.success('Matrix reset to defaults')
              }}
            >
              Reset Defaults
            </Button>
          )}
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">Module</TableHead>
                {USER_ROLES.map((role) => (
                  <TableHead key={role} className="text-center text-xs">
                    {role}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {permissionMatrix.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.module}</TableCell>
                  {USER_ROLES.map((role) => (
                    <TableCell key={role} className="text-center">
                      {canEditMatrix && role !== 'Super Admin' ? (
                        <Select
                          value={row.permissions[role]}
                          onValueChange={(v) =>
                            void handlePermissionChange(row, role, v as PermissionLevel)
                          }
                        >
                          <SelectTrigger className="mx-auto h-8 w-[88px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PERMISSION_LEVELS.map((level) => (
                              <SelectItem key={level} value={level}>
                                {level}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <PermissionCell level={row.permissions[role]} />
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit User' : 'Add User'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            {api && (
              <div className="space-y-2">
                <Label>{isEdit ? 'New password (optional)' : 'Password'}</Label>
                <Input
                  type="password"
                  value={form.password ?? ''}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={isEdit ? 'Leave blank to keep current' : 'Min 8 characters'}
                />
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => setForm({ ...form, role: v as UserRole })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableRoles.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r === 'Super Admin' ? 'Tenant Admin' : r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Branch</Label>
                {currentUser?.role === 'Super Admin' ? (
                  <Select
                    value={form.branchId}
                    onValueChange={(v) => setForm({ ...form, branchId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {branches
                        .filter((b) => !b.isHeadOffice)
                        .map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={
                      branches.find((b) => b.id === form.branchId)?.name ??
                      getBranchName(form.branchId)
                    }
                    readOnly
                    className="bg-muted/50"
                  />
                )}
              </div>
            </div>
            {isEdit && editId !== currentUser?.id ? (
              <div className="space-y-2">
                <Label>Account status</Label>
                <Select
                  value={form.isActive ? 'active' : 'disabled'}
                  onValueChange={(v) =>
                    setForm({ ...form, isActive: v === 'active' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active (can sign in)</SelectItem>
                    <SelectItem value="disabled">Disabled (blocked)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void handleSave()}>
                {isEdit ? 'Save Changes' : 'Add User'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
