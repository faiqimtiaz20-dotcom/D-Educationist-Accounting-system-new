import { PageHeader } from '@/components/shared/PageHeader'
import { PageDataSkeleton } from '@/components/shared/PageDataSkeleton'
import { StatusPill } from '@/components/shared/StatusPill'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { isApiMode } from '@/lib/api-client'
import {
  activateCrmTenant,
  createCrmTenant,
  listCrmTenants,
  suspendCrmTenant,
  type CrmTenantListItem,
  type TenantStatus,
} from '@/lib/crm-api'
import { useSubmitState } from '@/hooks/useSubmitState'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

type CreateForm = {
  code: string
  name: string
  status: TenantStatus
  adminFullName: string
  adminEmail: string
  adminPassword: string
  branchCity: string
  orgName: string
}

const emptyForm = (): CreateForm => ({
  code: '',
  name: '',
  status: 'Active',
  adminFullName: '',
  adminEmail: '',
  adminPassword: '',
  branchCity: 'Karachi',
  orgName: '',
})

export default function CrmTenantsPage() {
  const api = isApiMode()
  const [rows, setRows] = useState<CrmTenantListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const { submitting: saving, runSubmit } = useSubmitState()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm())

  const load = useCallback(async () => {
    if (!api) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      setRows(await listCrmTenants())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load tenants')
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    setForm(emptyForm())
    setDialogOpen(true)
  }

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.code.trim() || !form.name.trim()) {
      toast.error('Code and name are required')
      return
    }
    if (!form.adminEmail.trim() || !form.adminPassword || !form.adminFullName.trim()) {
      toast.error('Tenant admin details are required')
      return
    }
    await runSubmit(async () => {
      try {
        const result = await createCrmTenant({
          code: form.code.trim().toUpperCase(),
          name: form.name.trim(),
          status: form.status,
          adminEmail: form.adminEmail.trim().toLowerCase(),
          adminPassword: form.adminPassword,
          adminFullName: form.adminFullName.trim(),
          branchCity: form.branchCity.trim() || 'Karachi',
          orgName: form.orgName.trim() || form.name.trim(),
        })
        toast.success(
          `Tenant ${result.tenant.code} created` +
            (result.limitsEnforced === false
              ? ' (status-only billing; no seat caps)'
              : ''),
        )
        setDialogOpen(false)
        await load()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Create failed')
      }
    })
  }

  const toggleStatus = async (row: CrmTenantListItem) => {
    setBusyId(row.id)
    try {
      if (row.status === 'Suspended') {
        await activateCrmTenant(row.id)
        toast.success(`${row.code} activated`)
      } else {
        await suspendCrmTenant(row.id)
        toast.success(`${row.code} suspended — tenant users cannot sign in`)
      }
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Status update failed')
    } finally {
      setBusyId(null)
    }
  }

  const columns: Column<CrmTenantListItem>[] = [
    {
      key: 'code',
      header: 'Code',
      cell: (r) => <span className="font-mono font-medium">{r.code}</span>,
    },
    { key: 'name', header: 'Name', cell: (r) => r.name },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => <StatusPill status={r.status} />,
    },
    {
      key: 'counts',
      header: 'Users / Branches',
      cell: (r) => `${r._count?.users ?? '—'} / ${r._count?.branches ?? '—'}`,
    },
    {
      key: 'createdAt',
      header: 'Created',
      cell: (r) => new Date(r.createdAt).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: '',
      sortable: false,
      cell: (r) => (
        <Button
          variant="outline"
          size="sm"
          disabled={busyId === r.id}
          onClick={() => void toggleStatus(r)}
        >
          {busyId === r.id ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : r.status === 'Suspended' ? (
            'Activate'
          ) : (
            'Suspend'
          )}
        </Button>
      ),
    },
  ]

  if (!api) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Tenants"
          subtitle="Platform CRM — requires API mode (VITE_API_URL)"
        />
        <p className="text-sm text-muted-foreground">
          CRM tenant management is only available when connected to the Nest API.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tenants"
        subtitle="Platform CRM · create and suspend consultancies (no ledger access)"
        actionLabel="Create tenant"
        onAction={openCreate}
      />

      <p className="text-xs text-muted-foreground">
        Billing in v1 is status-only (Active / Suspended / Trial). Seat and plan
        numeric limits are not enforced.
      </p>

      {loading ? (
        <PageDataSkeleton metrics={0} />
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          searchPlaceholder="Search tenants…"
          searchFilter={(row, q) =>
            row.code.toLowerCase().includes(q) ||
            row.name.toLowerCase().includes(q) ||
            row.status.toLowerCase().includes(q)
          }
          newestFirst={false}
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create tenant</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => void submitCreate(e)} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="code">Tenant code</Label>
                <Input
                  id="code"
                  placeholder="ACME"
                  value={form.code}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
                  }
                  required
                  maxLength={40}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Initial status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, status: v as TenantStatus }))
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Trial">Trial</SelectItem>
                    <SelectItem value="Suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Company name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="orgName">Org name (settings)</Label>
              <Input
                id="orgName"
                placeholder="Defaults to company name"
                value={form.orgName}
                onChange={(e) => setForm((f) => ({ ...f, orgName: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="branchCity">Head office city</Label>
              <Input
                id="branchCity"
                value={form.branchCity}
                onChange={(e) =>
                  setForm((f) => ({ ...f, branchCity: e.target.value }))
                }
              />
            </div>

            <div className="border-t pt-3">
              <p className="mb-3 text-sm font-medium">Tenant Admin account</p>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="adminFullName">Full name</Label>
                  <Input
                    id="adminFullName"
                    value={form.adminFullName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, adminFullName: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminEmail">Email (global unique)</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    value={form.adminEmail}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, adminEmail: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminPassword">Password</Label>
                  <Input
                    id="adminPassword"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={form.adminPassword}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, adminPassword: e.target.value }))
                    }
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                Create tenant
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
