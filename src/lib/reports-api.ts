import { apiFetch, getApiBaseUrl, loadTokens } from '@/lib/api-client'

export type ReportColumn = { key: string; header: string }
export type ReportRow = Record<string, string | number | boolean | null>

export type ApiReportPayload = {
  slug: string
  title: string
  category: string
  description: string
  columns: ReportColumn[]
  rows: ReportRow[]
  details?: { columns: ReportColumn[]; rows: ReportRow[] }
  totals?: Record<string, number>
  filters: {
    from: string | null
    to: string | null
    branchId: string | null
    period: string | null
  }
  exportFormats: ['csv']
}

export type ReportCatalogItem = {
  slug: string
  title: string
  category: string
  description: string
  counsellorAllowed?: boolean
}

export type ReportQuery = {
  branchId?: string
  from?: string
  to?: string
  period?: string
  universityId?: string
  counsellorId?: string
  country?: string
}

function qs(params: ReportQuery = {}) {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '' && v !== 'all') sp.set(k, String(v))
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}

export async function listReports() {
  return apiFetch<ReportCatalogItem[]>('/reports')
}

export async function getReport(slug: string, params: ReportQuery = {}) {
  return apiFetch<ApiReportPayload>(`/reports/${encodeURIComponent(slug)}${qs(params)}`)
}

/** Download CSV via authenticated fetch (blob). */
export async function downloadReportCsv(slug: string, params: ReportQuery = {}) {
  const tokens = loadTokens()
  const res = await fetch(
    `${getApiBaseUrl()}/reports/${encodeURIComponent(slug)}/csv${qs(params)}`,
    {
      headers: tokens?.accessToken
        ? { Authorization: `Bearer ${tokens.accessToken}` }
        : undefined,
    },
  )
  if (!res.ok) throw new Error(`CSV export failed (${res.status})`)
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${slug}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
