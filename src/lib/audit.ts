import { useAuditStore } from '@/store/audit-store'
import { useAuthStore } from '@/store/auth-store'

export function logAudit(params: {
  module: string
  action: string
  entityId?: string
  details?: string
}) {
  const userId = useAuthStore.getState().currentUserId ?? 'system'
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19)
  useAuditStore.getState().append({
    userId,
    module: params.module,
    action: params.details ? `${params.action} — ${params.details}` : params.action,
    entityId: params.entityId,
    timestamp,
    ip: '127.0.0.1',
  })
}
