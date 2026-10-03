import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ArrowLeft, Plus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

interface PageHeaderProps {
  title: string
  subtitle?: string
  backTo?: string
  actionLabel?: string
  onAction?: () => void
  actionTo?: string
  children?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  subtitle,
  backTo,
  actionLabel,
  onAction,
  actionTo,
  children,
  className,
}: PageHeaderProps) {
  const navigate = useNavigate()

  return (
    <div className={cn('mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="flex items-start gap-3">
        {backTo && (
          <Button variant="outline" size="icon" onClick={() => navigate(backTo)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        {actionLabel && (
          actionTo ? (
            <Button asChild>
              <Link to={actionTo}><Plus className="mr-1 h-4 w-4" />{actionLabel}</Link>
            </Button>
          ) : (
            <Button onClick={onAction}><Plus className="mr-1 h-4 w-4" />{actionLabel}</Button>
          )
        )}
      </div>
    </div>
  )
}
