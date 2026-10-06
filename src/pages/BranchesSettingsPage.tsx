import { PageHeader } from '@/components/shared/PageHeader'
import { PageDataSkeleton } from '@/components/shared/PageDataSkeleton'
import { RowActions } from '@/components/shared/RowActions'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCurrentUser } from '@/hooks/useAuth'
import { canManageBranches } from '@/lib/permissions'
import { isApiMode } from '@/lib/api-client'
import {
  createBranch,
  deleteBranch,
  listBranches,
  updateBranch,
  type ApiBranch,
} from '@/lib/settings-api'
import { useDataStore } from '@/store/data-store'
import type { Branch } from '@/types'
import { useSubmitState } from '@/hooks/useSubmitState'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

const emptyBranch = (): Omit<Branch, 'id'> => ({
  name: '',
  code: '',
  city: '',
})

function mapApiBranch(b: ApiBranch): Branch {
  return {
    id: b.id,
    name: b.name,
    code: b.code,
    city: b.city,
    isHeadOffice: b.isHeadOffice,
  }
}

export function BranchesSettingsPage() {
  const user = useCurrentUser()
  const storeBranches = useDataStore((s) => s.branches)
  const addBranch = useDataStore((s) => s.addBranch)
  const updateStoreBranch = useDataStore((s) => s.updateBranch)
  const deleteStoreBranch = useDataStore((s) => s.deleteBranch)

  const api = isApiMode()
  const [apiBranches, setApiBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(api)

  const canManage = user ? canManageBranches(user.role) : false
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyBranch())
  const { submitting, runSubmit } = useSubmitState()

  const load = useCallback(async () => {
    if (!api) return
    setLoading(true)
    try {
      const rows = await listBranches()
      setApiBranches(rows.map(mapApiBranch))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load branches')
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    void load()
  }, [load])

  const branches = api ? apiBranches : storeBranches

  const openAdd = () => {
    setIsEdit(false)
    setEditId(null)
    setForm(emptyBranch())
    setDialogOpen(true)
  }

  const openEdit = (branch: Branch) => {
    if (branch.isHeadOffice) return
    setIsEdit(true)
    setEditId(branch.id)
    setForm({ name: branch.name, code: branch.code, city: branch.city })
    setDialogOpen(true)
  }

  const handleDelete = async (branch: Branch) => {
    if (branch.isHeadOffice) {
      toast.error('Head Office cannot be deleted')
      return
    }
    if (!confirm(`Delete branch ${branch.name}?`)) return
    try {
      if (api) {
        await deleteBranch(branch.id)
        await load()
      } else {
        deleteStoreBranch(branch.id)
      }
      toast.success('Branch deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      toast.error('Name and code are required')
      return
    }
    await runSubmit(async () => {
      try {
        if (api) {
          if (isEdit && editId) {
            await updateBranch(editId, form)
            toast.success('Branch updated')
          } else {
            await createBranch(form)
            toast.success('Branch added')
          }
          await load()
        } else if (isEdit && editId) {
          updateStoreBranch(editId, form)
          toast.success('Branch updated')
        } else {
          addBranch(form)
          toast.success('Branch added')
        }
        setDialogOpen(false)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Save failed')
      }
    })
  }

  const columns: Column<Branch>[] = [
    { key: 'code', header: 'Code', cell: (b) => <span className="font-mono font-medium">{b.code}</span> },
    { key: 'name', header: 'Branch Name', cell: (b) => b.name },
    { key: 'city', header: 'City', cell: (b) => b.city },
    {
      key: 'type',
      header: 'Type',
      cell: (b) =>
        b.isHeadOffice ? (
          <Badge variant="purple">Head Office</Badge>
        ) : (
          <Badge variant="secondary">Branch</Badge>
        ),
    },
    ...(canManage
      ? [{
          key: 'actions',
          header: 'Actions',
          cell: (b: Branch) =>
            b.isHeadOffice ? null : (
              <RowActions onEdit={() => openEdit(b)} onDelete={() => void handleDelete(b)} />
            ),
        }]
      : []),
  ]

  const tableData = canManage
    ? branches
    : branches.filter((b) => b.id === user?.branchId || b.isHeadOffice)

  return (
    <div>
      <PageHeader
        title="Branches"
        subtitle={
          canManage
            ? api
              ? 'Branches for this organisation only — Tenant Admin'
              : 'Manage branch locations — Tenant Admin only'
            : 'Branch locations for this organisation (view only)'
        }
        actionLabel={canManage ? 'Add Branch' : undefined}
        onAction={canManage ? openAdd : undefined}
      />
      {loading ? (
        <PageDataSkeleton metrics={0} />
      ) : (
        <DataTable
          data={tableData}
          columns={canManage ? columns : columns.filter((c) => c.key !== 'actions')}
          searchPlaceholder="Search branches..."
          searchFilter={(b, q) =>
            b.name.toLowerCase().includes(q) ||
            b.code.toLowerCase().includes(q) ||
            b.city.toLowerCase().includes(q)
          }
          filters={[
            {
              key: 'type',
              label: 'Type',
              type: 'select',
              options: [
                { label: 'Head Office', value: 'ho' },
                { label: 'Branch', value: 'branch' },
              ],
              accessor: (b) => (b.isHeadOffice ? 'ho' : 'branch'),
            },
          ]}
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit Branch' : 'Add Branch'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Branch Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. KHI"
                />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={() => void handleSave()} loading={submitting}>
                {isEdit ? 'Save' : 'Add Branch'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
