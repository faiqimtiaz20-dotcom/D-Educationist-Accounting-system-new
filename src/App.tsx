import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { Toaster, toast } from 'sonner'
import { useEffect } from 'react'
import { routes } from '@/router/routes'
import { useAuthStore } from '@/store/auth-store'
import {
  isApiMode,
  isProductionBuild,
  setUnauthorizedHandler,
} from '@/lib/api-client'

const router = createBrowserRouter(routes)

function AuthHydrator({ children }: { children: React.ReactNode }) {
  const hydrateFromTokens = useAuthStore((s) => s.hydrateFromTokens)
  const logout = useAuthStore((s) => s.logout)

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void logout()
      toast.error('Session expired. Please sign in again.')
      // Hard navigate so hung skeletons / in-flight pages clear immediately
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.assign('/login')
      }
    })
    return () => setUnauthorizedHandler(null)
  }, [logout])

  useEffect(() => {
    if (isApiMode()) {
      void hydrateFromTokens()
    }
  }, [hydrateFromTokens])

  return children
}

function ProductionApiGuard({ children }: { children: React.ReactNode }) {
  if (isProductionBuild() && !isApiMode()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md space-y-3 rounded-xl border p-6 text-center">
          <h1 className="text-lg font-semibold">Configuration required</h1>
          <p className="text-sm text-muted-foreground">
            This production build must set <code className="rounded bg-muted px-1">VITE_API_URL</code>{' '}
            to the Nest API base (e.g. <code className="rounded bg-muted px-1">https://api.example.com/api/v1</code>).
            Demo/mock data mode is disabled in production.
          </p>
        </div>
      </div>
    )
  }
  return children
}

export default function App() {
  return (
    <ProductionApiGuard>
      <AuthHydrator>
        <RouterProvider router={router} />
        <Toaster position="top-right" richColors closeButton />
      </AuthHydrator>
    </ProductionApiGuard>
  )
}
