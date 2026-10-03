import { ApiReportView } from '@/components/reports/ApiReportView'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { MetricCard } from '@/components/shared/MetricCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusPill } from '@/components/shared/StatusPill'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getBranchName } from '@/data/branches'
import { useCurrentUser, useEffectiveBranchId } from '@/hooks/useAuth'
import { isApiMode } from '@/lib/api-client'
import { canViewAllBranches } from '@/lib/permissions'
import { useDataStore } from '@/store/data-store'
import type { ApplicationStatus, Student } from '@/types'
import { Award, FileSpreadsheet, FileText, Globe2, GraduationCap, Printer, Building2, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

export type DestinationReportMode = 'country' | 'university'

interface DestinationSummary {
  key: string
  label: string
  country?: string
  total: number
  applied: number
  offer: number
  visa: number
  enrolled: number
  deferred: number
  withdrawn: number
  conversionRate: number
}

function countByStatus(rows: Student[], status: ApplicationStatus) {
  return rows.filter((s) => s.applicationStatus === status).length
}

function buildSummaries(students: Student[], mode: DestinationReportMode): DestinationSummary[] {
  const groups = new Map<string, Student[]>()

  for (const s of students) {
    const key =
      mode === 'country'
        ? s.country || 'Unknown'
        : `${s.university || 'Unknown'}||${s.country || 'Unknown'}`
    const list = groups.get(key) ?? []
    list.push(s)
    groups.set(key, list)
  }

  return Array.from(groups.entries())
    .map(([key, rows]) => {
      const enrolled = countByStatus(rows, 'Enrolled')
      const total = rows.length
      if (mode === 'country') {
        return {
          key,
          label: key,
          total,
          applied: countByStatus(rows, 'Applied'),
          offer: countByStatus(rows, 'Offer'),
          visa: countByStatus(rows, 'Visa'),
          enrolled,
          deferred: countByStatus(rows, 'Deferred'),
          withdrawn: countByStatus(rows, 'Withdrawn'),
          conversionRate: total ? Math.round((enrolled / total) * 100) : 0,
        }
      }
      const [university, country] = key.split('||')
      return {
        key,
        label: university,
        country,
        total,
        applied: countByStatus(rows, 'Applied'),
        offer: countByStatus(rows, 'Offer'),
        visa: countByStatus(rows, 'Visa'),
        enrolled,
        deferred: countByStatus(rows, 'Deferred'),
        withdrawn: countByStatus(rows, 'Withdrawn'),
        conversionRate: total ? Math.round((enrolled / total) * 100) : 0,
      }
    })
    .sort((a, b) => b.total - a.total)
}

interface DestinationReportPageProps {
  mode: DestinationReportMode
}

export default function DestinationReportPage({ mode }: DestinationReportPageProps) {
  if (isApiMode()) {
    return <ApiReportView slug={mode === 'country' ? 'country-wise' : 'university-wise'} />
  }
  return <DestinationReportPageLocal mode={mode} />
}

function DestinationReportPageLocal({ mode }: DestinationReportPageProps) {
  const user = useCurrentUser()
  const students = useDataStore((s) => s.students)
  const users = useDataStore((s) => s.users)
  const effectiveBranchId = useEffectiveBranchId()
  const isCounsellor = user?.role === 'Counsellor'
  const isSuperAdmin = user ? canViewAllBranches(user.role) : false

  const [selectedKey, setSelectedKey] = useState('all')

  const title = mode === 'country' ? 'Country-wise Report' : 'University-wise Report'
  const subtitle =
    mode === 'country'
      ? 'Student pipeline and conversion by destination country'
      : 'Student pipeline and conversion by university'

  const scopedStudents = useMemo(() => {
    let rows = students
    if (isCounsellor && user) {
      rows = rows.filter((s) => s.consultantId === user.id)
    } else if (!isSuperAdmin && user) {
      rows = rows.filter((s) => s.branchId === user.branchId)
    } else if (effectiveBranchId !== 'all') {
      rows = rows.filter((s) => s.branchId === effectiveBranchId)
    }
    return rows
  }, [students, isCounsellor, user, isSuperAdmin, effectiveBranchId])

  const summaries = useMemo(() => buildSummaries(scopedStudents, mode), [scopedStudents, mode])

  const filterOptions = useMemo(
    () => summaries.map((s) => ({ value: s.key, label: mode === 'university' ? `${s.label} (${s.country})` : s.label })),
    [summaries, mode]
  )

  const filteredStudents = useMemo(() => {
    if (selectedKey === 'all') return scopedStudents
    if (mode === 'country') {
      return scopedStudents.filter((s) => (s.country || 'Unknown') === selectedKey)
    }
    return scopedStudents.filter(
      (s) => `${s.university || 'Unknown'}||${s.country || 'Unknown'}` === selectedKey
    )
  }, [scopedStudents, selectedKey, mode])

  const totals = useMemo(() => {
    const enrolled = countByStatus(filteredStudents, 'Enrolled')
    const total = filteredStudents.length
    return {
      total,
      offer: countByStatus(filteredStudents, 'Offer'),
      enrolled,
      conversion: total ? Math.round((enrolled / total) * 100) : 0,
      groups: summaries.length,
    }
  }, [filteredStudents, summaries.length])

  const toOptions = (values: string[]) =>
    [...new Set(values)].filter(Boolean).map((v) => ({ label: v, value: v }))

  const handleExport = (format: 'PDF' | 'Excel' | 'CSV') => {
    toast.success(`${format} export started`, {
      description: `${title} will download shortly.`,
    })
  }

  const summaryColumns: Column<DestinationSummary>[] = [
    {
      key: 'label',
      header: mode === 'country' ? 'Country' : 'University',
      cell: (r) => <span className="font-medium">{r.label}</span>,
    },
    ...(mode === 'university'
      ? [
          {
            key: 'country',
            header: 'Country',
            cell: (r: DestinationSummary) => r.country ?? '—',
          } as Column<DestinationSummary>,
        ]
      : []),
    { key: 'total', header: 'Students', cell: (r) => r.total, className: 'text-right', sortAccessor: (r) => r.total },
    { key: 'applied', header: 'Applied', cell: (r) => r.applied, className: 'text-right', sortAccessor: (r) => r.applied },
    { key: 'offer', header: 'Offer', cell: (r) => r.offer, className: 'text-right', sortAccessor: (r) => r.offer },
    { key: 'visa', header: 'Visa', cell: (r) => r.visa, className: 'text-right', sortAccessor: (r) => r.visa },
    { key: 'enrolled', header: 'Enrolled', cell: (r) => r.enrolled, className: 'text-right', sortAccessor: (r) => r.enrolled },
    {
      key: 'conversion',
      header: 'Conversion %',
      cell: (r) => <span className="font-medium tabular-nums">{r.conversionRate}%</span>,
      className: 'text-right',
      sortAccessor: (r) => r.conversionRate,
    },
  ]

  const detailColumns: Column<Student>[] = [
    { key: 'studentId', header: 'Student ID', cell: (r) => <span className="font-mono text-xs">{r.studentId}</span> },
    { key: 'name', header: 'Student', cell: (r) => r.name },
    {
      key: 'counsellor',
      header: 'Counsellor',
      cell: (r) => users.find((u) => u.id === r.consultantId)?.name ?? '—',
    },
    { key: 'branch', header: 'Branch', cell: (r) => getBranchName(r.branchId) },
    { key: 'country', header: 'Country', cell: (r) => r.country },
    { key: 'university', header: 'University', cell: (r) => r.university },
    { key: 'course', header: 'Course', cell: (r) => r.course },
    { key: 'intake', header: 'Intake', cell: (r) => r.intake },
    { key: 'status', header: 'Status', cell: (r) => <StatusPill status={r.applicationStatus} /> },
  ]

  const GroupIcon = mode === 'country' ? Globe2 : Building2

  return (
    <div className="space-y-6">
      <PageHeader title={title} subtitle={subtitle} backTo="/reports">
        <Button variant="outline" size="sm" onClick={() => handleExport('PDF')}>
          <FileText className="mr-1.5 h-4 w-4" /> PDF
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleExport('Excel')}>
          <FileSpreadsheet className="mr-1.5 h-4 w-4" /> Excel
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleExport('CSV')}>
          <Printer className="mr-1.5 h-4 w-4" /> CSV
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Filter by {mode === 'country' ? 'country' : 'university'}
        </p>
        <Select
          value={selectedKey}
          onValueChange={(v) => {
            setSelectedKey(v)
          }}
        >
          <SelectTrigger className="w-full sm:w-[280px]">
            <SelectValue placeholder={mode === 'country' ? 'All countries' : 'All universities'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{mode === 'country' ? 'All Countries' : 'All Universities'}</SelectItem>
            {filterOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title={mode === 'country' ? 'Countries' : 'Universities'}
          value={selectedKey === 'all' ? totals.groups : 1}
          icon={GroupIcon}
          accent="blue"
        />
        <MetricCard title="Total Students" value={totals.total} icon={Users} accent="purple" />
        <MetricCard title="Offers" value={totals.offer} icon={Award} accent="orange" />
        <MetricCard title="Enrolled" value={totals.enrolled} icon={GraduationCap} accent="green" />
      </div>

      <Tabs defaultValue="summary">
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="summary">{mode === 'country' ? 'By Country' : 'By University'}</TabsTrigger>
          <TabsTrigger value="detail">Student Detail</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-4">
          <DataTable
            data={selectedKey === 'all' ? summaries : summaries.filter((s) => s.key === selectedKey)}
            columns={summaryColumns}
            searchPlaceholder={
              mode === 'country' ? 'Search country...' : 'Search university or country...'
            }
            searchFilter={(row, q) =>
              row.label.toLowerCase().includes(q) ||
              (row.country?.toLowerCase().includes(q) ?? false)
            }
            filters={
              mode === 'university'
                ? [
                    {
                      key: 'country',
                      label: 'Country',
                      type: 'select' as const,
                      options: toOptions(summaries.map((s) => s.country ?? '')),
                      accessor: (r: DestinationSummary) => r.country,
                    },
                  ]
                : undefined
            }
            newestFirst={false}
          />
        </TabsContent>

        <TabsContent value="detail" className="mt-4">
          <DataTable
            data={filteredStudents}
            columns={detailColumns}
            searchPlaceholder="Search student, university, or course..."
            searchFilter={(row, q) =>
              row.name.toLowerCase().includes(q) ||
              row.studentId.toLowerCase().includes(q) ||
              row.university.toLowerCase().includes(q) ||
              row.course.toLowerCase().includes(q) ||
              row.country.toLowerCase().includes(q)
            }
            filters={[
              {
                key: 'status',
                label: 'Application Status',
                type: 'select',
                options: toOptions(filteredStudents.map((s) => s.applicationStatus)),
                accessor: (r) => r.applicationStatus,
              },
              {
                key: 'country',
                label: 'Country',
                type: 'select',
                options: toOptions(filteredStudents.map((s) => s.country)),
                accessor: (r) => r.country,
              },
              {
                key: 'university',
                label: 'University',
                type: 'select',
                options: toOptions(filteredStudents.map((s) => s.university)),
                accessor: (r) => r.university,
              },
              {
                key: 'intake',
                label: 'Intake',
                type: 'select',
                options: toOptions(filteredStudents.map((s) => s.intake)),
                accessor: (r) => r.intake,
              },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
