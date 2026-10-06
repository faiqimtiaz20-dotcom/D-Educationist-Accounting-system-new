import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DEMO_ACCOUNTS, getDemoPassword } from '@/lib/auth-credentials'
import { isApiMode, isDemoLoginAllowed } from '@/lib/api-client'
import { defaultHomePath, isCrmAdminUser } from '@/lib/crm'
import { useAuthStore } from '@/store/auth-store'
import { useSubmitState } from '@/hooks/useSubmitState'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const login = useAuthStore((s) => s.login)
  const rememberedEmail = useAuthStore((s) => s.rememberedEmail)
  const showDemo = isDemoLoginAllowed()

  const [email, setEmail] = useState(rememberedEmail || '')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(!!rememberedEmail)
  const [showPassword, setShowPassword] = useState(false)
  const { submitting, runSubmit } = useSubmitState()
  const [error, setError] = useState('')

  const from = (location.state as { from?: string })?.from ?? '/'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password) {
      setError('Email and password are required')
      return
    }

    await runSubmit(async () => {
      const result = await login(email, password, remember)
      if (result.success) {
        toast.success('Welcome back!')
        const apiUser = useAuthStore.getState().apiUser
        const home = defaultHomePath(apiUser)
        // CRM always lands on CRM console; tenant users honor deep-link unless it's a CRM path
        const dest =
          isCrmAdminUser(apiUser) || from.startsWith('/crm')
            ? home
            : from || home
        navigate(dest, { replace: true })
      } else {
        setError(result.error ?? 'Login failed')
      }
    })
  }

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail)
    setPassword(getDemoPassword())
    setError('')
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between bg-[var(--sidebar)] p-10 text-[var(--sidebar-foreground)]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-white">
            <img src="/deducationist-icon.png" alt="D' Educationist" className="h-9 w-9 object-contain" />
          </div>
          <div>
            <p className="font-semibold text-lg leading-tight">D&apos; Educationist</p>
            <p className="text-sm text-[var(--sidebar-foreground)]/60">Accounting System</p>
          </div>
        </div>

        <div className="space-y-6">
          <h1 className="text-3xl font-bold leading-tight tracking-tight">
            Multi-branch commission accounting for study abroad consultancies
          </h1>
          <p className="text-[var(--sidebar-foreground)]/70 text-lg leading-relaxed max-w-md">
            Manage students, university invoices, receivables, sub-agent commissions, payroll, and
            consolidated financial reporting — all in one place.
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {['Multi-currency invoicing', 'Branch-level RBAC', 'Audit-ready controls', 'GL auto-posting'].map(
              (item) => (
                <div key={item} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--sidebar-accent)]" />
                  {item}
                </div>
              ),
            )}
          </div>
        </div>

        <p className="text-xs text-[var(--sidebar-foreground)]/40">
          © 2026 D&apos; Educationist · Secure enterprise access
          {isApiMode() ? ' · API mode' : ' · Local demo mode'}
        </p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center bg-background p-6 sm:p-10">
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border bg-white">
            <img src="/deducationist-icon.png" alt="D' Educationist" className="h-8 w-8 object-contain" />
          </div>
          <div>
            <p className="font-semibold">D&apos; Educationist Accounting</p>
            <p className="text-xs text-muted-foreground">Sign in to continue</p>
          </div>
        </div>

        <Card className="w-full max-w-md border-0 shadow-lg sm:border">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-bold">Sign in</CardTitle>
            <CardDescription>
              Email and password only — your organisation is inferred from your account
              (D4). No tenant code required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="name@company.com"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="pl-9 pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword((s) => !s)}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="remember"
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-input accent-[var(--sidebar-accent)]"
                />
                <Label htmlFor="remember" className="cursor-pointer text-sm font-normal">
                  Remember email on this device
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full bg-[var(--sidebar)] hover:bg-[var(--sidebar)]/90"
                loading={submitting}
              >
                Sign in
              </Button>
            </form>

            {showDemo ? (
              <div className="mt-6 space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Demo accounts · password:{' '}
                  <code className="rounded bg-muted px-1">{getDemoPassword()}</code>
                </p>
                <div className="grid gap-2">
                  {DEMO_ACCOUNTS.filter(
                    (acc) => isApiMode() || acc.email !== 'crm@platform.local',
                  ).map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => fillDemo(acc.email)}
                      className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/60"
                    >
                      <div>
                        <p className="font-medium">{acc.label}</p>
                        <p className="text-xs text-muted-foreground">{acc.email}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{acc.hint}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
