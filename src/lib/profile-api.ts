import { apiFetch } from '@/lib/api-client'
import type { ApiAuthUser } from '@/lib/api-auth-types'

export function getMyProfile() {
  return apiFetch<{ user: ApiAuthUser; permissions: unknown[] }>('/auth/me')
}

export function updateMyProfile(body: {
  fullName?: string
  email?: string
  phone?: string | null
}) {
  return apiFetch<{ user: ApiAuthUser }>('/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function changeMyPassword(body: {
  currentPassword: string
  newPassword: string
}) {
  return apiFetch<{ success: boolean; message?: string }>(
    '/auth/change-password',
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  )
}
