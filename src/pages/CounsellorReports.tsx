import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { reports } from '@/data/dashboard'
import { BarChart3, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

const OPERATIONS_REPORTS = reports.filter((r) => r.category === 'Operations')

/** Counsellor role: Operations reports only (own student scope applied on each page). */
export default function CounsellorReports() {
  return (
    <div>
      <PageHeader
        title="My Reports"
        subtitle="Pipeline reports for your assigned students"
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {OPERATIONS_REPORTS.map((report) => (
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
                  Operations
                </Badge>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
