import { apiFetch } from '@/lib/api-client'
import type { DashboardMetrics } from '@/types'

export type ApiDashboardMetrics = DashboardMetrics & {
  asOf: string
  period: string
  profitMargin: number
  expenseRatio: number
  totalCashPosition: number
}

export type ChartPoint = { name: string; value: number; pct?: number }
export type BranchProfitPoint = {
  name: string
  code: string
  profit: number
  revenue: number
  expenses: number
}
export type MonthlyTrendPoint = {
  month: string
  period: string
  revenue: number
  expenses: number
}

export type CounsellorDashboardData = {
  totalStudents: number
  activeStudents: number
  offers: number
  enrolled: number
  statusChart: ChartPoint[]
  intakeChart: ChartPoint[]
  countryChart: ChartPoint[]
  recentStudents: Array<{
    id: string
    name: string
    university: string
    intake: string
    applicationStatus: string
  }>
}

function branchQuery(branchId?: string) {
  if (!branchId || branchId === 'all') return ''
  return `?branchId=${encodeURIComponent(branchId)}`
}

export async function getDashboardMetrics(branchId?: string) {
  return apiFetch<ApiDashboardMetrics>(`/dashboard/metrics${branchQuery(branchId)}`)
}

export async function getCommissionByUniversity(branchId?: string) {
  return apiFetch<ChartPoint[]>(
    `/dashboard/charts/commission-by-university${branchQuery(branchId)}`,
  )
}

export async function getReceivablesAgeing(branchId?: string) {
  return apiFetch<Array<ChartPoint & { pct: number }>>(
    `/dashboard/charts/receivables-ageing${branchQuery(branchId)}`,
  )
}

export async function getBranchProfit(branchId?: string) {
  return apiFetch<BranchProfitPoint[]>(
    `/dashboard/charts/branch-profit${branchQuery(branchId)}`,
  )
}

export async function getMonthlyTrend(branchId?: string) {
  return apiFetch<MonthlyTrendPoint[]>(
    `/dashboard/charts/monthly-trend${branchQuery(branchId)}`,
  )
}

export async function getCounsellorDashboard(branchId?: string) {
  return apiFetch<CounsellorDashboardData>(
    `/dashboard/counsellor${branchQuery(branchId)}`,
  )
}
