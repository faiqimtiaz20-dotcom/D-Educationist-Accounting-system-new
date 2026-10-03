import { useModulePermission } from '@/hooks/usePermission'

interface PermissionGateProps {
  module: string
  require?: 'view' | 'write' | 'approve'
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function PermissionGate({ module, require = 'view', children, fallback = null }: PermissionGateProps) {
  const { canView, canWrite, canApprove } = useModulePermission(module)

  const allowed =
    require === 'write' ? canWrite :
    require === 'approve' ? canApprove :
    canView

  if (!allowed) return <>{fallback}</>
  return <>{children}</>
}
