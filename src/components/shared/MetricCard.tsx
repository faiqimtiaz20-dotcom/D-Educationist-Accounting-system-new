import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string | number
  icon?: LucideIcon
  accent?: 'blue' | 'green' | 'orange' | 'yellow' | 'purple' | 'pink'
  className?: string
}

const accents = {
  blue: 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20',
  green: 'border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20',
  orange: 'border-l-orange-500 bg-orange-50/50 dark:bg-orange-950/20',
  yellow: 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20',
  purple: 'border-l-purple-500 bg-purple-50/50 dark:bg-purple-950/20',
  pink: 'border-l-pink-500 bg-pink-50/50 dark:bg-pink-950/20',
}

const iconColors = {
  blue: 'text-blue-500 bg-blue-100 dark:bg-blue-900/40',
  green: 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/40',
  orange: 'text-orange-500 bg-orange-100 dark:bg-orange-900/40',
  yellow: 'text-amber-500 bg-amber-100 dark:bg-amber-900/40',
  purple: 'text-purple-500 bg-purple-100 dark:bg-purple-900/40',
  pink: 'text-pink-500 bg-pink-100 dark:bg-pink-900/40',
}

export function MetricCard({ title, value, icon: Icon, accent = 'blue', className }: MetricCardProps) {
  return (
    <div className={cn('rounded-xl border border-l-4 bg-card p-5 shadow-sm', accents[accent], className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
        </div>
        {Icon && (
          <div className={cn('rounded-lg p-2.5', iconColors[accent])}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  )
}
