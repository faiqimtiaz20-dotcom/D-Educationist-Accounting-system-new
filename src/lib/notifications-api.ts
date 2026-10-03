import { apiFetch } from '@/lib/api-client'

export type AppNotification = {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  entityType: string | null
  entityId: string | null
  readAt: string | null
  createdAt: string
  isRead: boolean
}

export function listNotifications(opts?: { unreadOnly?: boolean; take?: number }) {
  const q = new URLSearchParams()
  if (opts?.unreadOnly) q.set('unreadOnly', 'true')
  if (opts?.take) q.set('take', String(opts.take))
  const qs = q.toString()
  return apiFetch<AppNotification[]>(`/notifications${qs ? `?${qs}` : ''}`)
}

export function getUnreadNotificationCount() {
  return apiFetch<{ count: number }>('/notifications/unread-count')
}

export function markNotificationRead(id: string) {
  return apiFetch<AppNotification>(`/notifications/${id}/read`, {
    method: 'PATCH',
  })
}

export function markAllNotificationsRead() {
  return apiFetch<{ success: boolean; count: number }>(
    '/notifications/read-all',
    { method: 'POST' },
  )
}
