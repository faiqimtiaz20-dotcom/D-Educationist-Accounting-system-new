import { useCallback, useEffect, useState } from 'react'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageDataSkeleton } from '@/components/shared/PageDataSkeleton'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useSubmitState } from '@/hooks/useSubmitState'
import { isApiMode } from '@/lib/api-client'
import {
  createSubAgent as apiCreateSubAgent,
  deleteSubAgent as apiDeleteSubAgent,
  listCourses,
  listSubAgents,
  mapApiCourse,
  mapApiSubAgent,
  updateSubAgent as apiUpdateSubAgent,
} from '@/lib/masters-api'
import { useDataStore } from '@/store/data-store'
import type { Course, SubAgent, SubAgentCourseRate } from '@/types'
import { Pencil, Plus, Trash2, Users } from 'lucide-react'
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
  defaultRatePercent: 10,
  courseRates: [],
}

export default function SubAgentsPage() {
  const storeSubAgents = useDataStore((s) => s.subAgents)
  const addSubAgent = useDataStore((s) => s.addSubAgent)
  const updateSubAgent = useDataStore((s) => s.updateSubAgent)
  const deleteSubAgent = useDataStore((s) => s.deleteSubAgent)

  const api = isApiMode()
  const [apiSubAgents, setApiSubAgents] = useState<SubAgent[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(api)

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<SubAgentForm>(emptyForm)
  const { submitting, runSubmit } = useSubmitState()

  const load = useCallback(async () => {
    if (!api) return
    setLoading(true)
    try {
      const [rows, courseRows] = await Promise.all([listSubAgents(), listCourses()])
      setApiSubAgents(rows.map(mapApiSubAgent))
      setCourses(courseRows.map(mapApiCourse))
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
    setForm({ ...emptyForm, courseRates: [] })
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
      defaultRatePercent: agent.defaultRatePercent ?? 10,
      courseRates: agent.courseRates?.map((r) => ({ ...r })) ?? [],
    })
    setSheetOpen(true)
  }

  const addCourseRateRow = () => {
    setForm((prev) => {
      const used = new Set((prev.courseRates ?? []).map((r) => r.courseId))
      const next = courses.find((c) => c.isActive !== false && !used.has(c.id))
      if (!next) {
        toast.error(
          courses.length === 0
            ? 'Add courses under Settings → Courses first'
            : 'All courses already have a rate',
        )
        return prev
      }
      return {
        ...prev,
        courseRates: [
          ...(prev.courseRates ?? []),
          {
            courseId: next.id,
            courseName: next.name,
            commissionRate: prev.defaultRatePercent ?? 10,
          },
        ],
      }
    })
  }

  const updateCourseRateRow = (index: number, patch: Partial<SubAgentCourseRate>) => {
    setForm((prev) => {
      const rows = [...(prev.courseRates ?? [])]
      rows[index] = { ...rows[index], ...patch }
      return { ...prev, courseRates: rows }
    })
  }

  const removeCourseRateRow = (index: number) => {
    setForm((prev) => ({
      ...prev,
      courseRates: (prev.courseRates ?? []).filter((_, i) => i !== index),
    }))
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Sub-agent name is required')
      return
    }
    const rateIds = (form.courseRates ?? []).map((r) => r.courseId)
    if (rateIds.some((id) => !id)) {
      toast.error('Select a course for each course rate row')
      return
    }
    if (new Set(rateIds).size !== rateIds.length) {
      toast.error('Each course can only appear once in course rates')
      return
    }

    await runSubmit(async () => {
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
    })
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
    { key: 'ntn', header: 'NTN', cell: (r) => r.ntn || '—' },
    { key: 'email', header: 'Email', cell: (r) => r.email || '—' },
    { key: 'contact', header: 'Contact', cell: (r) => r.contact || '—' },
    {
      key: 'fallback',
      header: 'Fallback %',
      className: 'text-right',
      cell: (r) => (
        <span className="font-medium">
          {r.defaultRatePercent != null ? `${r.defaultRatePercent}%` : '—'}
        </span>
      ),
    },
    {
      key: 'courseRates',
      header: 'Course rates',
      className: 'text-right',
      cell: (r) => (r.courseRates?.length ? `${r.courseRates.length}` : '—'),
    },
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
        subtitle={`Manage agents with fallback and course-wise commission rates — used when creating sub-agent commissions${api ? ' (API)' : ''}`}
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
        <SheetContent className="overflow-y-auto sm:max-w-lg">
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
            <div className="space-y-2">
              <Label>Fallback Commission %</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step="0.1"
                value={form.defaultRatePercent ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    defaultRatePercent: e.target.value === '' ? undefined : Number(e.target.value),
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Used when a course has no specific rate below — picked on Sub-Agent Commission create.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Course-wise commission %</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={addCourseRateRow}
                  disabled={api && courses.length === 0}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add course rate
                </Button>
              </div>
              {(form.courseRates ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Optional — add rates per course. Commission form uses the matching rate when agent + student course are selected.
                </p>
              ) : (
                <div className="space-y-2 rounded-lg border p-3">
                  {(form.courseRates ?? []).map((row, index) => {
                    const usedElsewhere = new Set(
                      (form.courseRates ?? [])
                        .filter((_, i) => i !== index)
                        .map((r) => r.courseId),
                    )
                    const options = courses.filter(
                      (c) => c.isActive !== false && (!usedElsewhere.has(c.id) || c.id === row.courseId),
                    )
                    return (
                      <div key={`${row.courseId}-${index}`} className="grid grid-cols-[1fr_88px_36px] gap-2 items-end">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Course</Label>
                          <Select
                            value={row.courseId || undefined}
                            onValueChange={(courseId) => {
                              const c = courses.find((x) => x.id === courseId)
                              updateCourseRateRow(index, {
                                courseId,
                                courseName: c?.name,
                              })
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select course" />
                            </SelectTrigger>
                            <SelectContent>
                              {options.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name}
                                </SelectItem>
                              ))}
                              {row.courseId &&
                                !options.some((c) => c.id === row.courseId) && (
                                  <SelectItem value={row.courseId}>
                                    {row.courseName || row.courseId}
                                  </SelectItem>
                                )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">%</Label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step="0.1"
                            value={row.commissionRate}
                            onChange={(e) =>
                              updateCourseRateRow(index, {
                                commissionRate: Number(e.target.value),
                              })
                            }
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-muted-foreground"
                          onClick={() => removeCourseRateRow(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <Button className="w-full" onClick={() => void handleSave()} loading={submitting}>
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
