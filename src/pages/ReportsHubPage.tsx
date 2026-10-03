import CounsellorReports from '@/pages/CounsellorReports'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { reports } from '@/data/dashboard'
import { useCurrentUser } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { BarChart3, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useMemo } from 'react'

const categoryColors: Record<string, string> = {
  Branch: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  Consolidated: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  Operations: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  Standard: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  Tax: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  Commission: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
}

const CATEGORY_ORDER = ['Branch', 'Consolidated', 'Operations', 'Standard', 'Tax', 'Commission']

export function ReportsHubPage() {
  const user = useCurrentUser()
  const grouped = useMemo(() => {
    const map = new Map<string, typeof reports>()
    for (const report of reports) {
      const list = map.get(report.category) ?? []
      list.push(report)
      map.set(report.category, list)
    }
    return CATEGORY_ORDER
      .filter((category) => map.has(category))
      .map((category) => [category, map.get(category)!] as const)
      .concat(
        [...map.entries()].filter(([category]) => !CATEGORY_ORDER.includes(category))
      )
  }, [])

  if (user?.role === 'Counsellor') {
    return <CounsellorReports />
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Financial, tax, and commission reports across all branches"
      />

      <div className="space-y-8">
        {grouped.map(([category, items]) => (
          <section key={category}>
            <div className="mb-4 flex items-center gap-2">
              <h2 className="text-lg font-semibold">{category}</h2>
              <Badge variant="outline" className={cn('font-medium', categoryColors[category])}>
                {items.length} reports
              </Badge>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((report) => (
                <Link key={report.id} to={report.path} className="group">
                  <Card className="h-full transition-shadow hover:shadow-md">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="rounded-lg bg-primary/10 p-2 text-primary">
                          <BarChart3 className="h-4 w-4" />
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                      <CardTitle className="text-base">{report.title}</CardTitle>
                      <CardDescription className="line-clamp-2">{report.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Badge variant="secondary" className="text-xs">
                        {category}
                      </Badge>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
