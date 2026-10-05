import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type PageDataSkeletonProps = {
  /** Metric cards above the table */
  metrics?: number
  /** Table body rows */
  rows?: number
  /** Table columns */
  cols?: number
  className?: string
}

/**
 * Shared page-loading placeholder used while API data is fetching.
 */
export function PageDataSkeleton({
  metrics = 4,
  rows = 8,
  cols = 6,
  className,
}: PageDataSkeletonProps) {
  return (
    <div className={cn('space-y-6', className)} aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      {metrics > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: metrics }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-9 w-28 ml-auto" />
          <Skeleton className="h-9 w-24" />
        </div>
        <div
          className="border-b px-4 py-3 grid gap-3"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-full" />
          ))}
        </div>
        <div className="divide-y">
          {Array.from({ length: rows }).map((_, r) => (
            <div
              key={r}
              className="px-4 py-3.5 grid gap-3"
              style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: cols }).map((_, c) => (
                <Skeleton
                  key={c}
                  className={cn('h-4', c === 0 ? 'w-3/4' : 'w-full')}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Early-return helper for API pages. */
export function PageLoadingGate({
  loading,
  children,
  metrics,
  rows,
}: {
  loading: boolean
  children: ReactNode
  metrics?: number
  rows?: number
}) {
  if (loading) {
    return <PageDataSkeleton metrics={metrics} rows={rows} />
  }
  return children
}
