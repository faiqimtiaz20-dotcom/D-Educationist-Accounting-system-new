import { useCallback, useEffect, useState } from 'react'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageDataSkeleton } from '@/components/shared/PageDataSkeleton'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { isApiMode } from '@/lib/api-client'
import {
  createSubAgent as apiCreateSubAgent,
  deleteSubAgent as apiDeleteSubAgent,
  listSubAgents,
  mapApiSubAgent,
  updateSubAgent as apiUpdateSubAgent,
} from '@/lib/masters-api'
import { useDataStore } from '@/store/data-store'
import type { SubAgent } from '@/types'
import { Pencil, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'

type SubAgentForm = Omit<SubAgent, 'id' | 'subAgentNo'>

const emptyForm: SubAgentForm = {
  name: '',
  ntn: '',
  email: '',
  contact: '',
  accountTitle: '',
  iban: '',
  accountNo: '',
}

export default function SubAgentsPage() {
  const storeSubAgents = useDataStore((s) => s.subAgents)
  const addSubAgent = useDataStore((s) => s.addSubAgent)
  const updateSubAgent = useDataStore((s) => s.updateSubAgent)
  const deleteSubAgent = useDataStore((s) => s.deleteSubAgent)

  const api = isApiMode()
  const [apiSubAgents, setApiSubAgents] = useState<SubAgent[]>([])
  const [loading, setLoading] = useState(api)

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<SubAgentForm>(emptyForm)

  const load = useCallback(async () => {
    if (!api) return
    setLoading(true)
    try {
      const rows = await listSubAgents()
      setApiSubAgents(rows.map(mapApiSubAgent))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load sub-agents')
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    void load()
  }, [load])

  const subAgents = api ? apiSubAgents : storeSubAgents

  const openAdd = () => {
    setEditingId(null)
    setForm({ ...emptyForm })
    setSheetOpen(true)
  }

  const openEdit = (agent: SubAgent) => {
    setEditingId(agent.id)
    setForm({
      name: agent.name,
      ntn: agent.ntn,
      email: agent.email,
      contact: agent.contact,
      accountTitle: agent.accountTitle,
      iban: agent.iban,
      accountNo: agent.accountNo,
    })
    setSheetOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Sub-agent name is required')
      return
    }

    try {
      if (api) {
        if (editingId) {
          await apiUpdateSubAgent(editingId, form)
          toast.success('Sub-agent updated')
        } else {
          await apiCreateSubAgent(form)
          toast.success('Sub-agent added')
        }
        await load()
      } else if (editingId) {
        updateSubAgent(editingId, form)
        toast.success('Sub-agent updated')
      } else {
        addSubAgent(form)
        toast.success('Sub-agent added')
      }
      setSheetOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    }
  }

  const handleDelete = async (agent: SubAgent) => {
    if (!confirm(`Delete sub-agent ${agent.name}?`)) return
    try {
      if (api) {
        await apiDeleteSubAgent(agent.id)
        await load()
        toast.success('Sub-agent deleted')
      } else {
        const ok = deleteSubAgent(agent.id)
        if (ok) toast.success('Sub-agent deleted')
        else toast.error('Cannot delete — sub-agent is linked to students or commissions')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const columns: Column<SubAgent>[] = [
    {
      key: 'subAgentNo',
      header: 'Sub-Agent ID',
      cell: (r) => <span className="font-medium">{r.subAgentNo || '—'}</span>,
    },
    { key: 'name', header: 'Sub-Agent Name', cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'ntn', header: 'NTN', cell: (r) => r.ntn },
    { key: 'email', header: 'Email', cell: (r) => r.email },
    { key: 'contact', header: 'Contact', cell: (r) => r.contact },
    { key: 'accountTitle', header: 'A/c Title', cell: (r) => r.accountTitle },
    { key: 'iban', header: 'IBAN', cell: (r) => <span className="font-mono text-xs">{r.iban}</span> },
    { key: 'accountNo', header: 'Account No.', cell: (r) => r.accountNo },
    {
      key: 'actions',
      header: '',
      className: 'w-24',
      cell: (r) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(r)} title="Edit">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => void handleDelete(r)} title="Delete">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      {api && loading ? (
        <PageDataSkeleton metrics={0} />
      ) : (
      <>
      <PageHeader
        title="Sub-Agent Master"
        subtitle={`${subAgents.length} sub-agents registered${api ? ' (API)' : ''}`}
        actionLabel="Add Sub-Agent"
        onAction={openAdd}
      >
        <Users className="h-5 w-5 text-muted-foreground" />
      </PageHeader>

      <DataTable
        data={subAgents}
        columns={columns}
        searchPlaceholder="Search by ID, name, NTN, email..."
        searchFilter={(row, q) =>
          (row.subAgentNo ?? '').toLowerCase().includes(q) ||
          row.name.toLowerCase().includes(q) ||
          row.ntn.includes(q) ||
          row.email.toLowerCase().includes(q) ||
          row.contact.includes(q)
        }
      />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editingId ? 'Edit Sub-Agent' : 'Add Sub-Agent'}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Sub-Agent Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>NTN</Label>
              <Input value={form.ntn} onChange={(e) => setForm({ ...form, ntn: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Contact No.</Label>
              <Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Account Title</Label>
              <Input value={form.accountTitle} onChange={(e) => setForm({ ...form, accountTitle: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>IBAN</Label>
              <Input value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Account No.</Label>
              <Input value={form.accountNo} onChange={(e) => setForm({ ...form, accountNo: e.target.value })} />
            </div>
            <Button className="w-full" onClick={() => void handleSave()}>
              {editingId ? 'Update' : 'Add'} Sub-Agent
            </Button>
          </div>
        </SheetContent>
      </Sheet>
      </>
      )}
    </div>
  )
}
