import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const statusMap: Record<string, { variant: 'default' | 'secondary' | 'success' | 'warning' | 'info' | 'purple' | 'destructive' | 'outline'; label?: string }> = {
  Draft: { variant: 'secondary' },
  Sent: { variant: 'info' },
  'Partially Received': { variant: 'warning' },
  'Fully Received': { variant: 'success' },
  Closed: { variant: 'outline' },
  Pending: { variant: 'warning' },
  Approved: { variant: 'success' },
  Rejected: { variant: 'destructive' },
  Paid: { variant: 'success' },
  Partial: { variant: 'warning' },
  Matched: { variant: 'success' },
  Unmatched: { variant: 'warning' },
  Applied: { variant: 'info' },
  Offer: { variant: 'purple' },
  Visa: { variant: 'warning' },
  Enrolled: { variant: 'success' },
  Deferred: { variant: 'secondary' },
  Withdrawn: { variant: 'destructive' },
  Issued: { variant: 'info' },
  Cleared: { variant: 'success' },
  Bounced: { variant: 'destructive' },
  Active: { variant: 'success' },
  Suspended: { variant: 'destructive' },
  Trial: { variant: 'warning' },
}

interface StatusPillProps {
  status: string
  className?: string
}

export function StatusPill({ status, className }: StatusPillProps) {
  const config = statusMap[status] ?? { variant: 'outline' as const }
  return (
    <Badge variant={config.variant} className={cn('font-medium', className)}>
      {config.label ?? status}
    </Badge>
  )
}
