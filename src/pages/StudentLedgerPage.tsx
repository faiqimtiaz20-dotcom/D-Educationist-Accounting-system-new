import { DataTable, type Column } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { MetricCard } from '@/components/shared/MetricCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useBranchFilter } from '@/hooks/useBranchFilter'
import { isApiMode } from '@/lib/api-client'
import { buildStudentLedger } from '@/lib/metrics'
import { formatCurrency } from '@/lib/calculations'
import { getStudentLedger, mapPartyLedgerEntries } from '@/lib/journals-api'
import { listStudents, mapApiStudent } from '@/lib/students-api'
import { useDataStore } from '@/store/data-store'
import type { LedgerEntry } from '@/types'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

export default function StudentLedgerPage() {
  const api = isApiMode()
  const studentsStore = useDataStore((s) => s.students)
  const invoices = useDataStore((s) => s.invoices)
  const receivables = useDataStore((s) => s.receivables)
  const [studentsLoaded, setStudentsLoaded] = useState(!api)

  useEffect(() => {
    if (!api) return
    void (async () => {
      try {
        const rows = await listStudents()
        useDataStore.setState({ students: rows.map(mapApiStudent) })
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load students')
      } finally {
        setStudentsLoaded(true)
      }
    })()
  }, [api])

  const branchStudents = useBranchFilter(studentsStore)
  const [studentId, setStudentId] = useState('')
  const [apiLedger, setApiLedger] = useState<LedgerEntry[] | null>(null)
  const [apiMeta, setApiMeta] = useState<{ outstanding: number; totalDebit: number; totalCredit: number; currency?: string } | null>(null)

  const effectiveId = studentId || branchStudents[0]?.id || ''
  const student = studentsStore.find((s) => s.id === effectiveId)

  useEffect(() => {
    if (!api || !effectiveId) {
      setApiLedger(null)
      setApiMeta(null)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const data = await getStudentLedger(effectiveId)
        if (cancelled) return
        setApiLedger(mapPartyLedgerEntries(data))
        setApiMeta({
          outstanding: data.outstanding,
          totalDebit: data.totalDebit ?? 0,
          totalCredit: data.totalCredit ?? 0,
          currency: data.currencyCode,
        })
      } catch (err) {
        if (!cancelled) {
          setApiLedger([])
          toast.error(err instanceof Error ? err.message : 'Failed to load ledger')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [api, effectiveId])

  const localLedger = useMemo(
    () => (effectiveId ? buildStudentLedger(effectiveId, invoices, receivables) : []),
    [effectiveId, invoices, receivables]
  )
  const ledger = api && apiLedger ? apiLedger : localLedger

  const outstanding = api && apiMeta ? apiMeta.outstanding : ledger.length ? ledger[ledger.length - 1].balance : 0
  const totalInvoiced = api && apiMeta ? apiMeta.totalDebit : ledger.reduce((s, e) => s + e.debit, 0)
  const totalReceived = api && apiMeta ? apiMeta.totalCredit : ledger.reduce((s, e) => s + e.credit, 0)
  const currency = (api && apiMeta?.currency) || student?.currency

  const columns: Column<LedgerEntry>[] = useMemo(() => [
    { key: 'date', header: 'Date', cell: (r) => r.date },
    { key: 'reference', header: 'Reference', cell: (r) => <span className="font-mono text-sm">{r.reference}</span> },
    { key: 'description', header: 'Description', cell: (r) => r.description },
    { key: 'debit', header: 'Debit', className: 'text-right font-mono', cell: (r) => r.debit > 0 ? formatCurrency(r.debit, currency) : '—' },
    { key: 'credit', header: 'Credit', className: 'text-right font-mono', cell: (r) => r.credit > 0 ? formatCurrency(r.credit, currency) : '—' },
    { key: 'balance', header: 'Balance', className: 'text-right font-mono font-medium', cell: (r) => formatCurrency(r.balance, currency) },
  ], [currency])

  if (api && !studentsLoaded) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>
  }

  return (
    <div>
      <PageHeader title="Student Ledger" subtitle="Invoices, payments, and outstanding balance per student" />

      <Card className="mb-6">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label>Select Student</Label>
            <Select value={effectiveId} onValueChange={setStudentId}>
              <SelectTrigger><SelectValue placeholder="Choose a student" /></SelectTrigger>
              <SelectContent>
                {branchStudents.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.studentId} — {s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {student && (
            <div className="text-sm text-muted-foreground">
              <p>{student.university} · {student.country}</p>
              <p>Status: {student.applicationStatus}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {student && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <MetricCard title="Total Invoiced" value={formatCurrency(totalInvoiced, currency)} accent="blue" />
          <MetricCard title="Total Received" value={formatCurrency(totalReceived, currency)} accent="green" />
          <MetricCard title="Outstanding" value={formatCurrency(outstanding, currency)} accent="orange" />
        </div>
      )}

      {ledger.length === 0 ? (
        <EmptyState title="No ledger entries" description="This student has no invoices or payments yet." />
      ) : (
        <DataTable
          data={ledger}
          columns={columns}
          searchPlaceholder="Search ledger..."
          searchFilter={(row, q) => row.description.toLowerCase().includes(q) || row.reference.toLowerCase().includes(q)}
          newestFirst={false}
          pageSize={15}
        />
      )}
    </div>
  )
}
