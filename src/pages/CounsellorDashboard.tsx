import { MetricCard } from '@/components/shared/MetricCard'
import { PageDataSkeleton } from '@/components/shared/PageDataSkeleton'
import { StatusPill } from '@/components/shared/StatusPill'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useCurrentUser } from '@/hooks/useAuth'
import { isApiMode } from '@/lib/api-client'
import {
  getCounsellorDashboard,
  type CounsellorDashboardData,
} from '@/lib/dashboard-api'
import { useDataStore } from '@/store/data-store'
import type { ApplicationStatus, Student } from '@/types'
import {
  Award,
  GraduationCap,
  Plane,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1']

const APPLICATION_STATUSES: ApplicationStatus[] = ['Applied', 'Offer', 'Visa', 'Enrolled', 'Deferred', 'Withdrawn']

function countBy(students: Student[], key: (s: Student) => string) {
  const map = new Map<string, number>()
  for (const s of students) {
    const k = key(s)
    map.set(k, (map.get(k) ?? 0) + 1)
  }
  return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
}

export default function CounsellorDashboard() {
  const api = isApiMode()
  const user = useCurrentUser()
  const students = useDataStore((s) => s.students)
  const [apiData, setApiData] = useState<CounsellorDashboardData | null>(null)
  const [loading, setLoading] = useState(api)

  useEffect(() => {
    if (!api) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const data = await getCounsellorDashboard()
        if (!cancelled) setApiData(data)
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : 'Failed to load counsellor dashboard')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [api])

  const myStudents = useMemo(
    () => students.filter((s) => s.consultantId === user?.id),
    [students, user?.id],
  )

  const statusCounts = useMemo(() => {
    const counts = Object.fromEntries(APPLICATION_STATUSES.map((st) => [st, 0])) as Record<ApplicationStatus, number>
    for (const s of myStudents) counts[s.applicationStatus] += 1
    return counts
  }, [myStudents])

  const localStatusChart = useMemo(
    () => APPLICATION_STATUSES.map((st) => ({ name: st, value: statusCounts[st] })).filter((d) => d.value > 0),
    [statusCounts],
  )
  const localIntakeChart = useMemo(() => countBy(myStudents, (s) => s.intake), [myStudents])
  const localCountryChart = useMemo(() => countBy(myStudents, (s) => s.country), [myStudents])
  const localActive = myStudents.filter(
    (s) => s.applicationStatus !== 'Withdrawn' && s.applicationStatus !== 'Deferred',
  ).length
  const localRecent = useMemo(() => [...myStudents].reverse().slice(0, 8), [myStudents])

  const total = api && apiData ? apiData.totalStudents : myStudents.length
  const active = api && apiData ? apiData.activeStudents : localActive
  const offers = api && apiData ? apiData.offers : statusCounts.Offer
  const enrolled = api && apiData ? apiData.enrolled : statusCounts.Enrolled
  const statusChart = api && apiData ? apiData.statusChart : localStatusChart
  const intakeChart = api && apiData ? apiData.intakeChart : localIntakeChart
  const countryChart = api && apiData ? apiData.countryChart : localCountryChart
  const recentStudents = api && apiData ? apiData.recentStudents : localRecent.map((s) => ({
    id: s.id,
    name: s.name,
    university: s.university,
    intake: s.intake,
    applicationStatus: s.applicationStatus,
  }))

  if (api && loading) {
    return <PageDataSkeleton metrics={4} rows={5} />
  }

  return (
    <div className="space-y-6">
      <Card className="border-0 bg-[var(--sidebar)] text-[var(--sidebar-foreground)] shadow-md">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-[var(--sidebar-foreground)]/70">Welcome back, {user?.name ?? 'Counsellor'}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">My Students Dashboard</h1>
            <p className="mt-2 max-w-xl text-sm text-[var(--sidebar-foreground)]/70">
              {api
                ? 'Your pipeline from PostgreSQL'
                : "Track your students' applications, intakes, and destinations."}
            </p>
          </div>
          <div className="rounded-xl bg-white/10 px-5 py-4 text-right">
            <p className="text-xs uppercase tracking-wide text-[var(--sidebar-foreground)]/60">Total</p>
            <p className="mt-1 text-xl font-bold">{total}</p>
            <p className="text-xs text-[var(--sidebar-foreground)]/60">students</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="My Students" value={total} icon={Users} accent="blue" />
        <MetricCard title="Active Applications" value={active} icon={GraduationCap} accent="green" />
        <MetricCard title="Offers Received" value={offers} icon={Award} accent="purple" />
        <MetricCard title="Enrolled" value={enrolled} icon={Plane} accent="green" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Applications by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusChart.length === 0 ? (
              <p className="py-20 text-center text-sm text-muted-foreground">No students yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={statusChart}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {statusChart.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${Number(value)} students`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Students by Intake</CardTitle>
          </CardHeader>
          <CardContent>
            {intakeChart.length === 0 ? (
              <p className="py-20 text-center text-sm text-muted-foreground">No students yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={intakeChart}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip formatter={(value) => `${Number(value)} students`} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Students by Country</CardTitle>
          </CardHeader>
          <CardContent>
            {countryChart.length === 0 ? (
              <p className="py-20 text-center text-sm text-muted-foreground">No students yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={countryChart} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => `${Number(value)} students`} />
                  <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>University</TableHead>
                    <TableHead>Intake</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                        No students yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentStudents.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>{s.university}</TableCell>
                        <TableCell>{s.intake}</TableCell>
                        <TableCell><StatusPill status={s.applicationStatus} /></TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
