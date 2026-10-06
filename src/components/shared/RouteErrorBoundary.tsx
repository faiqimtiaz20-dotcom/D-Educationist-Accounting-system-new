import { Button } from '@/components/ui/button'
import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router-dom'

/** User-facing fallback for unmatched routes and render errors (hides React Router dev screen). */
export function RouteErrorBoundary() {
  const error = useRouteError()
  const navigate = useNavigate()

  const is404 = isRouteErrorResponse(error) && error.status === 404
  const title = is404 ? 'Page not found' : 'Something went wrong'
  const detail = is404
    ? 'That URL is not part of this application.'
    : error instanceof Error
      ? error.message
      : 'An unexpected error occurred.'

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <p className="max-w-md text-sm text-muted-foreground">{detail}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Go back
        </Button>
        <Button onClick={() => navigate('/')}>Dashboard</Button>
      </div>
    </div>
  )
}
