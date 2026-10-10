import { apiFetch } from '@/lib/api-client'

export type MailDeliveryMode = 'direct' | 'cloudways'

export type MailDeliverySettings = {
  mode: MailDeliveryMode
  url: string | null
  apiKeyConfigured: boolean
  relayReady: boolean
  envFallback: {
    urlConfigured: boolean
    apiKeyConfigured: boolean
  }
}

export function getCrmMailDelivery() {
  return apiFetch<MailDeliverySettings>('/crm/mail-delivery')
}

export function updateCrmMailDelivery(body: {
  mode: MailDeliveryMode
  url?: string | null
  apiKey?: string | null
}) {
  return apiFetch<MailDeliverySettings>('/crm/mail-delivery', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function pingCrmMailRelay() {
  return apiFetch<{ success: boolean; status?: string }>('/crm/mail-delivery/ping', {
    method: 'POST',
  })
}

export function testCrmMailRelay(to: string) {
  return apiFetch<{ success: boolean; messageId?: string }>('/crm/mail-delivery/test', {
    method: 'POST',
    body: JSON.stringify({ to }),
  })
}
