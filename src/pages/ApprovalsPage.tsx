import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusPill } from '@/components/shared/StatusPill'
import { Button } from '@/components/ui/button'
import { useBranchFilter } from '@/hooks/useBranchFilter'
import { useCurrentUser } from '@/hooks/useAuth'
import { useModulePermission } from '@/hooks/usePermission'
import { isApiMode } from '@/lib/api-client'
import { formatCurrency } from '@/lib/calculations'
import { branchFilterOptions } from '@/lib/filter-options'
import { getBranchName } from '@/lib/org'
import {
  decideApproval,
  listApprovals,
  mapApiApproval,
} from '@/lib/operations-api'
import { listBranches } from '@/lib/settings-api'
import { useDataStore } from '@/store/data-store'
import type { Approval, ApprovalStatus, Branch } from '@/types'
import { Check, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

export default function ApprovalsPage() {
  const api = isApiMode()
  const storeApprovals = useDataStore((s) => s.approvals)
  const processApproval = useDataStore((s) => s.processApproval)
  const user = useCurrentUser()
  const { canApprove } = useModulePermission('Approvals')
  const [statusFilter, setStatusFilter] = useState('Pending')
  const [apiApprovals, setApiApprovals] = useState<Approval[] | null>(null)
  const [loading, setLoading] = useState(api)

  const reload = useCallback(async () => {
    if (!api) return
    setLoading(true)
    try {
      const [rows, branchRows] = await Promise.all([listApprovals(), listBranches()])
      setApiApprovals(rows.map(mapApiApproval))
      useDataStore.setState({
        branches: branchRows.map(
          (b): Branch => ({
            id: b.id,
            name: b.name,
            code: b.code,
            city: b.city,
            isHeadOffice: b.isHeadOffice,
          }),
        ),
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load approvals')
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    void reload()
  }, [reload])

  const approvals = api && apiApprovals ? apiApprovals : storeApprovals
  const branchFiltered = useBranchFilter(approvals)
  const filtered = useMemo(() => {
    if (statusFilter === 'all') return branchFiltered
    return branchFiltered.filter((a) => a.status === statusFilter)
  }, [branchFiltered, statusFilter])

  const handleAction = async (id: string, status: 'Approved' | 'Rejected') => {
    if (!user || !canApprove) {
      toast.error('You do not have approval authority')
      return
    }
    const approval = approvals.find((a) => a.id === id)
    if (approval?.requestedById === user.id) {
      toast.error('Segregation of duties: you cannot approve your own request')
      return
    }
    try {
      if (api) {
        await decideApproval(id, status === 'Approved' ? 'approve' : 'reject')
        await reload()
        toast.success(`Request ${status.toLowerCase()}`)
      } else {
        const ok = processApproval(id, status, user.id)
        if (ok) toast.success(`Request ${status.toLowerCase()}`)
        else toast.error('Unable to process approval')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to process approval')
    }
  }

  const columns: Column<Approval>[] = useMemo(() => [
    {
      key: 'approvalNo',
      header: 'Approval ID',
      cell: (r) => <span className="font-medium">{r.approvalNo || '—'}</span>,
    },
    { key: 'type', header: 'Type', cell: (r) => r.type },
    { key: 'title', header: 'Title', cell: (r) => r.title },
    { key: 'amount', header: 'Amount', className: 'text-right font-mono', cell: (r) => formatCurrency(r.amount) },
    { key: 'requestedBy', header: 'Requested By', cell: (r) => r.requestedBy },
    { key: 'date', header: 'Date', cell: (r) => r.date },
    { key: 'branch', header: 'Branch', cell: (r) => getBranchName(r.branchId) },
    { key: 'status', header: 'Status', cell: (r) => <StatusPill status={r.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      cell: (r) =>
        r.status === 'Pending' && canApprove ? (
          <div className="flex flex-wrap gap-1">
            <Button size="sm" variant="outline" className="h-8 text-emerald-600" onClick={() => void handleAction(r.id, 'Approved')}>
              <Check className="h-3.5 w-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Approve</span>
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-destructive" onClick={() => void handleAction(r.id, 'Rejected')}>
              <X className="h-3.5 w-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Reject</span>
            </Button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
  ], [canApprove, approvals, api])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: branchFiltered.length }
    for (const s of ['Pending', 'Approved', 'Rejected'] as ApprovalStatus[]) {
      counts[s] = branchFiltered.filter((a) => a.status === s).length
    }
    return counts
  }, [branchFiltered])

  return (
    <div>
      <PageHeader
        title="Approvals"
        subtitle={
          api
            ? `Expense, journal, reimbursement queue${loading ? ' (loading…)' : ''}`
            : 'Expense, payment, journal, and refund approval queue'
        }
      />
      <DataTable
        data={filtered}
        columns={columns}
        searchPlaceholder="Search approvals..."
        searchFilter={(row, q) =>
          row.title.toLowerCase().includes(q) ||
          row.type.toLowerCase().includes(q) ||
          row.requestedBy.toLowerCase().includes(q)
        }
        filters={[
          { key: 'branch', label: 'Branch', type: 'select', options: branchFilterOptions, accessor: (r) => r.branchId },
          { key: 'type', label: 'Type', type: 'select', options: ['Expense', 'Sub-Agent Payout', 'Journal', 'Refund', 'Reimbursement', 'Payroll'].map((t) => ({ label: t, value: t })), accessor: (r) => r.type },
          { key: 'date', label: 'Date', type: 'dateRange', accessor: (r) => r.date },
          { key: 'amount', label: 'Amount', type: 'numberRange', accessor: (r) => r.amount },
        ]}
        statusPills={[
          { label: 'All', count: statusCounts.all, value: 'all' },
          { label: 'Pending', count: statusCounts.Pending, value: 'Pending' },
          { label: 'Approved', count: statusCounts.Approved, value: 'Approved' },
          { label: 'Rejected', count: statusCounts.Rejected, value: 'Rejected' },
        ]}
        activeStatus={statusFilter}
        onStatusChange={setStatusFilter}
      />
    </div>
  )
}
