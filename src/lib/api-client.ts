const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.trim()

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/** True when the app should talk to Nest/Postgres for business data. */
export function isApiMode() {
  return Boolean(API_URL)
}

/** Production Vite build — mock/demo auth must not be used. */
export function isProductionBuild() {
  return Boolean(import.meta.env.PROD)
}

/**
 * Demo account shortcuts on the login page.
 * Disabled in production builds. Allowed in local/dev (mock or API) for seed users.
 */
export function isDemoLoginAllowed() {
  if (isProductionBuild()) return false
  return true
}

export function getApiBaseUrl() {
  if (!API_URL) {
    throw new Error('VITE_API_URL is not set')
  }
  return API_URL.replace(/\/$/, '')
}

type TokenBundle = {
  accessToken: string
  refreshToken: string
}

const TOKEN_KEY = 'dedu-auth-tokens'

export function loadTokens(): TokenBundle | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY)
    if (!raw) return null
    return JSON.parse(raw) as TokenBundle
  } catch {
    return null
  }
}

export function saveTokens(tokens: TokenBundle | null) {
  if (!tokens) {
    localStorage.removeItem(TOKEN_KEY)
    return
  }
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens))
}

let refreshPromise: Promise<TokenBundle | null> | null = null
let onUnauthorized: (() => void) | null = null

/** Register a handler for hard 401 after refresh failure (e.g. force logout). */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler
}

async function refreshTokens(): Promise<TokenBundle | null> {
  const current = loadTokens()
  if (!current?.refreshToken) return null
  const res = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: current.refreshToken }),
  })
  if (!res.ok) {
    saveTokens(null)
    return null
  }
  const data = (await res.json()) as {
    accessToken: string
    refreshToken: string
  }
  const next = { accessToken: data.accessToken, refreshToken: data.refreshToken }
  saveTokens(next)
  return next
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  // MT7: never send a client-forged tenantId query — tenant comes from JWT only.
  // (Branch filters remain allowed.)
  let safePath = path
  try {
    const u = new URL(path, 'http://local.invalid')
    if (u.searchParams.has('tenantId')) {
      u.searchParams.delete('tenantId')
      safePath = u.pathname + (u.search ? u.search : '')
    }
  } catch {
    safePath = path
  }

  const headers = new Headers(init.headers)
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json')
  }
  const tokens = loadTokens()
  const isAuthEndpoint =
    safePath.startsWith('/auth/login') || safePath.startsWith('/auth/refresh')
  if (tokens?.accessToken && !isAuthEndpoint) {
    headers.set('Authorization', `Bearer ${tokens.accessToken}`)
  }

  const res = await fetch(`${getApiBaseUrl()}${safePath}`, { ...init, headers })

  if (res.status === 401 && retry && tokens?.refreshToken && !isAuthEndpoint) {
    refreshPromise ??= refreshTokens().finally(() => {
      refreshPromise = null
    })
    const refreshed = await refreshPromise
    if (refreshed) return apiFetch<T>(path, init, false)
    onUnauthorized?.()
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const body = (await res.json()) as { message?: string | string[] }
      if (Array.isArray(body.message)) message = body.message.join(', ')
      else if (body.message) message = body.message
    } catch {
      /* ignore */
    }
    if (res.status === 403) {
      message = message || 'You do not have permission for this action'
    }
    if (res.status === 401) {
      onUnauthorized?.()
    }
    throw new ApiError(res.status, message)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export type PageResult<T> = {
  items: T[]
  total: number
  take: number
  skip: number
}

/** Normalize list endpoints that may return a bare array or a page envelope. */
export function unwrapPage<T>(data: T[] | PageResult<T>): PageResult<T> {
  if (Array.isArray(data)) {
    return { items: data, total: data.length, take: data.length, skip: 0 }
  }
  return data
}
