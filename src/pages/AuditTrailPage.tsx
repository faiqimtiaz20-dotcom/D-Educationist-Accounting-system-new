import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { getUserName } from '@/data/users'
import { isApiMode } from '@/lib/api-client'
import { listAuditLogsPage } from '@/lib/operations-api'
import { useAuditStore } from '@/store/audit-store'
import type { AuditLog } from '@/types'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

type Row = AuditLog & { userName: string }

const PAGE_SIZE = 50

export default function AuditTrailPage() {
  const api = isApiMode()
  const localLogs = useAuditStore((s) => s.logs)
  const [apiLogs, setApiLogs] = useState<Row[] | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(api)

  const load = useCallback(async () => {
    if (!api) return
    setLoading(true)
    try {
      const result = await listAuditLogsPage({
        take: PAGE_SIZE,
        skip: page * PAGE_SIZE,
      })
      setTotal(result.total)
      setApiLogs(
        result.items.map((l) => ({
          id: l.id,
          userId: l.userId ?? 'system',
          userName: l.userName || 'System',
          action: l.action,
          module: l.module,
          timestamp: l.timestamp,
          ip: l.ip || '—',
          entityId: l.entityId ?? undefined,
        })),
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }, [api, page])

  useEffect(() => {
    void load()
  }, [load])

  const logs: Row[] = api && apiLogs
    ? apiLogs
    : localLogs.map((l) => ({ ...l, userName: getUserName(l.userId) }))

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const moduleOptions = useMemo(
    () => [...new Set(logs.map((l) => l.module))].sort().map((m) => ({ label: m, value: m })),
    [logs],
  )
  const userOptions = useMemo(
    () =>
      [...new Map(logs.map((l) => [l.userId, l.userName])).entries()].map(([value, label]) => ({
        label,
        value,
      })),
    [logs],
  )

  const columns: Column<Row>[] = useMemo(
    () => [
      {
        key: 'timestamp',
        header: 'Timestamp',
        cell: (r) => <span className="font-mono text-sm">{r.timestamp}</span>,
      },
      { key: 'user', header: 'User', cell: (r) => r.userName },
      { key: 'module', header: 'Module', cell: (r) => r.module },
      { key: 'action', header: 'Action', cell: (r) => r.action },
      {
        key: 'entity',
        header: 'Entity',
        cell: (r) => r.entityId ?? '—',
      },
      { key: 'ip', header: 'IP', cell: (r) => r.ip },
    ],
    [],
  )

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Trail" subtitle="Immutable activity log across modules" />

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading audit logs…
        </div>
      ) : (
        <>
          <DataTable
            data={logs}
            columns={columns}
            searchPlaceholder="Search audit…"
            pageSize={PAGE_SIZE}
            filters={[
              {
                key: 'module',
                label: 'Module',
                type: 'select',
                options: moduleOptions,
                accessor: (r) => r.module,
              },
              {
                key: 'user',
                label: 'User',
                type: 'select',
                options: userOptions,
                accessor: (r) => r.userId,
              },
            ]}
          />
          {api ? (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Showing {logs.length} of {total} · page {page + 1}/{pageCount}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" /> Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page + 1 >= pageCount}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
