import CounsellorDashboard from '@/pages/CounsellorDashboard'
import { FilterPanel } from '@/components/shared/FilterPanel'
import { MetricCard } from '@/components/shared/MetricCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { branchProfit as mockBranchProfit, monthlyRevenueTrend as mockTrend } from '@/data/dashboard'
import { useCurrentUser, useEffectiveBranchId } from '@/hooks/useAuth'
import { isApiMode } from '@/lib/api-client'
import {
  getBranchProfit,
  getCommissionByUniversity,
  getDashboardMetrics,
  getMonthlyTrend,
  getReceivablesAgeing,
  type ApiDashboardMetrics,
  type BranchProfitPoint,
  type ChartPoint,
  type MonthlyTrendPoint,
} from '@/lib/dashboard-api'
import {
  computeCommissionByUniversity,
  computeDashboardMetrics,
  computeReceivablesAgeing,
} from '@/lib/metrics'
import { formatCurrency } from '@/lib/calculations'
import { useDataStore } from '@/store/data-store'
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  Building2,
  CreditCard,
  PiggyBank,
  Receipt,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1']

const kpiCards = [
  { title: "Today's Collection", key: 'todayCollection' as const, icon: ArrowUpCircle, accent: 'green' as const },
  { title: "Today's Expenses", key: 'todayExpenses' as const, icon: ArrowDownCircle, accent: 'orange' as const },
  { title: 'Cash Balance', key: 'cashBalance' as const, icon: Wallet, accent: 'blue' as const },
  { title: 'Bank Balance', key: 'bankBalance' as const, icon: Building2, accent: 'purple' as const },
  { title: 'Monthly Revenue', key: 'monthlyRevenue' as const, icon: TrendingUp, accent: 'green' as const },
  { title: 'Monthly Expenses', key: 'monthlyExpenses' as const, icon: TrendingDown, accent: 'orange' as const },
  { title: 'Net Profit', key: 'netProfit' as const, icon: Banknote, accent: 'green' as const },
  { title: 'Outstanding Receivables', key: 'outstandingReceivables' as const, icon: Receipt, accent: 'yellow' as const },
  { title: 'Outstanding Payables', key: 'outstandingPayables' as const, icon: CreditCard, accent: 'pink' as const },
]

export default function DashboardPage() {
  const user = useCurrentUser()
  const branchId = useEffectiveBranchId()
  const api = isApiMode()

  const receivables = useDataStore((s) => s.receivables)
  const invoices = useDataStore((s) => s.invoices)
  const expenses = useDataStore((s) => s.expenses)
  const pettyCash = useDataStore((s) => s.pettyCash)
  const students = useDataStore((s) => s.students)

  const [apiMetrics, setApiMetrics] = useState<ApiDashboardMetrics | null>(null)
  const [commissionByUniversity, setCommission] = useState<ChartPoint[]>([])
  const [receivablesAgeing, setAgeing] = useState<Array<ChartPoint & { pct?: number }>>([])
  const [branchProfit, setBranchProfit] = useState<BranchProfitPoint[]>([])
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrendPoint[]>([])
  const [loading, setLoading] = useState(api)

  useEffect(() => {
    if (!api || user?.role === 'Counsellor') return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const [metrics, commission, ageing, profit, trend] = await Promise.all([
          getDashboardMetrics(branchId),
          getCommissionByUniversity(branchId),
          getReceivablesAgeing(branchId),
          getBranchProfit(branchId),
          getMonthlyTrend(branchId),
        ])
        if (cancelled) return
        setApiMetrics(metrics)
        setCommission(commission)
        setAgeing(ageing)
        setBranchProfit(profit)
        setMonthlyTrend(trend)
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : 'Failed to load dashboard')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [api, branchId, user?.role])

  const localMetrics = useMemo(
    () => computeDashboardMetrics(receivables, invoices, expenses, pettyCash, branchId),
    [receivables, invoices, expenses, pettyCash, branchId],
  )
  const localCommission = useMemo(
    () => computeCommissionByUniversity(students, invoices),
    [students, invoices],
  )
  const localAgeing = useMemo(
    () => computeReceivablesAgeing(invoices, receivables),
    [invoices, receivables],
  )

  const dashboardMetrics = api && apiMetrics ? apiMetrics : localMetrics
  const commissionData = api && apiMetrics ? commissionByUniversity : localCommission
  const ageingData = api && apiMetrics
    ? receivablesAgeing.map((r) => ({ name: r.name, value: r.pct ?? r.value }))
    : localAgeing
  const profitData = api && apiMetrics ? branchProfit : mockBranchProfit
  const trendData = api && apiMetrics ? monthlyTrend : mockTrend

  const profitMargin = api && apiMetrics
    ? apiMetrics.profitMargin.toFixed(1)
    : dashboardMetrics.monthlyRevenue > 0
      ? ((dashboardMetrics.netProfit / dashboardMetrics.monthlyRevenue) * 100).toFixed(1)
      : '0.0'
  const expenseRatio = api && apiMetrics
    ? apiMetrics.expenseRatio.toFixed(1)
    : dashboardMetrics.monthlyRevenue > 0
      ? ((dashboardMetrics.monthlyExpenses / dashboardMetrics.monthlyRevenue) * 100).toFixed(1)
      : '0.0'
  const netCash = api && apiMetrics
    ? apiMetrics.totalCashPosition
    : dashboardMetrics.cashBalance + dashboardMetrics.bankBalance

  if (user?.role === 'Counsellor') {
    return <CounsellorDashboard />
  }

  return (
    <div className="space-y-6">
      <Card className="border-0 bg-[var(--sidebar)] text-[var(--sidebar-foreground)] shadow-md">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-[var(--sidebar-foreground)]/70">Welcome back, {user?.name ?? 'User'}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Dashboard Overview</h1>
            <p className="mt-2 max-w-xl text-sm text-[var(--sidebar-foreground)]/70">
              {api
                ? `Live metrics from PostgreSQL${loading ? ' (loading…)' : ''}`
                : 'Monitor collections, expenses, and branch performance across all study abroad operations.'}
            </p>
          </div>
          <div className="rounded-xl bg-white/10 px-5 py-4 text-right">
            <p className="text-xs uppercase tracking-wide text-[var(--sidebar-foreground)]/60">Today</p>
            <p className="mt-1 text-xl font-bold">{formatCurrency(dashboardMetrics.todayCollection)}</p>
            <p className="text-xs text-[var(--sidebar-foreground)]/60">collected</p>
          </div>
        </CardContent>
      </Card>

      <FilterPanel />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
        {kpiCards.map((kpi) => (
          <MetricCard
            key={kpi.key}
            title={kpi.title}
            value={formatCurrency(dashboardMetrics[kpi.key])}
            icon={kpi.icon}
            accent={kpi.accent}
          />
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Petty Cash Balance"
          value={formatCurrency(dashboardMetrics.pettyCashBalance)}
          icon={PiggyBank}
          accent="blue"
        />
        <MetricCard title="Profit Margin" value={`${profitMargin}%`} icon={TrendingUp} accent="green" />
        <MetricCard title="Expense Ratio" value={`${expenseRatio}%`} icon={TrendingDown} accent="orange" />
        <MetricCard title="Total Cash Position" value={formatCurrency(netCash)} icon={Wallet} accent="purple" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Commission by University</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={commissionData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Receivables Ageing</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={ageingData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, value }) => `${name}: ${Number(value).toFixed(0)}%`}
                >
                  {ageingData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Branch Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={profitData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="expenses" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
