import { apiFetch } from '@/lib/api-client'

export type SmtpProvider = 'GMAIL' | 'MICROSOFT365' | 'OUTLOOK' | 'CUSTOM'

export type EmailSettingsStatus = {
  configured: boolean
  connected: boolean
  provider: SmtpProvider | null
  authMode: 'PASSWORD' | 'OAUTH' | null
  fromEmail: string | null
  fromName: string | null
  host: string | null
  port: number | null
  secure: boolean
  username: string | null
  oauthEmail: string | null
  hasPassword: boolean
  connectedAt: string | null
  lastTestAt: string | null
  lastTestOk: boolean | null
  lastError: string | null
  oauth: {
    gmail: boolean
    microsoft365: boolean
    outlook: boolean
    callbackUrl: string
  }
}

export function getEmailSettings() {
  return apiFetch<EmailSettingsStatus>('/settings/email')
}

export function saveSmtpPassword(body: {
  provider: SmtpProvider
  fromEmail: string
  fromName?: string
  host?: string
  port?: number
  secure?: boolean
  username?: string
  password?: string
}) {
  return apiFetch<EmailSettingsStatus>('/settings/email/password', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function startEmailOauth(provider: SmtpProvider) {
  return apiFetch<{ url: string; provider: SmtpProvider }>(
    '/settings/email/oauth/start',
    {
      method: 'POST',
      body: JSON.stringify({ provider }),
    },
  )
}

export function testEmail(body: { to: string; subject?: string; body?: string }) {
  return apiFetch<{
    success: boolean
    messageId?: string
    status: EmailSettingsStatus
  }>('/settings/email/test', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function disconnectEmail() {
  return apiFetch<{ success: boolean }>('/settings/email', {
    method: 'DELETE',
  })
}
