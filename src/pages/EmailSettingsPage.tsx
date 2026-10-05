import { PageHeader } from '@/components/shared/PageHeader'
import { PageDataSkeleton } from '@/components/shared/PageDataSkeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { isApiMode } from '@/lib/api-client'
import {
  disconnectEmail,
  getEmailSettings,
  saveSmtpPassword,
  startEmailOauth,
  testEmail,
  type EmailSettingsStatus,
  type SmtpProvider,
} from '@/lib/email-settings-api'
import { useModulePermission } from '@/hooks/usePermission'
import { Loader2, Mail, Unplug } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

const PROVIDER_LABEL: Record<SmtpProvider, string> = {
  GMAIL: 'Gmail',
  MICROSOFT365: 'Microsoft 365',
  OUTLOOK: 'Outlook',
  CUSTOM: 'Custom SMTP',
}

export default function EmailSettingsPage() {
  const api = isApiMode()
  const { canWrite } = useModulePermission('Settings')
  const [searchParams, setSearchParams] = useSearchParams()
  const [status, setStatus] = useState<EmailSettingsStatus | null>(null)
  const [loading, setLoading] = useState(api)
  const [busy, setBusy] = useState(false)

  const [provider, setProvider] = useState<SmtpProvider>('GMAIL')
  const [fromEmail, setFromEmail] = useState('')
  const [fromName, setFromName] = useState('')
  const [host, setHost] = useState('')
  const [port, setPort] = useState('465')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [testTo, setTestTo] = useState('')

  const load = useCallback(async () => {
    if (!api) return
    setLoading(true)
    try {
      const s = await getEmailSettings()
      setStatus(s)
      if (s.provider) setProvider(s.provider)
      if (s.fromEmail) setFromEmail(s.fromEmail)
      if (s.fromName) setFromName(s.fromName)
      if (s.host) setHost(s.host)
      if (s.port) setPort(String(s.port))
      if (s.username) setUsername(s.username)
      if (s.fromEmail || s.oauthEmail) setTestTo(s.fromEmail || s.oauthEmail || '')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load email settings')
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const connected = searchParams.get('connected')
    const error = searchParams.get('error')
    if (connected) {
      toast.success('Email account connected')
      setSearchParams({}, { replace: true })
      void load()
    } else if (error) {
      toast.error(decodeURIComponent(error))
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams, load])

  const onConnect = async (p: SmtpProvider) => {
    if (!canWrite) return
    setBusy(true)
    try {
      const { url } = await startEmailOauth(p)
      window.location.href = url
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'OAuth start failed')
      setBusy(false)
    }
  }

  const onSavePassword = async () => {
    if (!canWrite) return
    if (!fromEmail.trim()) {
      toast.error('From email is required')
      return
    }
    setBusy(true)
    try {
      const s = await saveSmtpPassword({
        provider,
        fromEmail: fromEmail.trim(),
        fromName: fromName.trim() || undefined,
        host: provider === 'CUSTOM' ? host.trim() : undefined,
        port: provider === 'CUSTOM' ? Number(port) || undefined : undefined,
        username: username.trim() || undefined,
        password: password || undefined,
      })
      setStatus(s)
      setPassword('')
      toast.success('SMTP settings saved for this organisation')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  const onTest = async () => {
    if (!testTo.trim()) {
      toast.error('Enter a test recipient')
      return
    }
    setBusy(true)
    try {
      const res = await testEmail({ to: testTo.trim() })
      setStatus(res.status)
      toast.success('Test email sent')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Test failed')
      await load()
    } finally {
      setBusy(false)
    }
  }

  const onDisconnect = async () => {
    if (!canWrite) return
    if (!confirm('Disconnect email for this organisation?')) return
    setBusy(true)
    try {
      await disconnectEmail()
      toast.success('Email disconnected')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Disconnect failed')
    } finally {
      setBusy(false)
    }
  }

  if (!api) {
    return (
      <div>
        <PageHeader title="Email / SMTP" subtitle="Requires API mode (VITE_API_URL)" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email / SMTP"
        subtitle="Per-organisation outbound email — Gmail, Microsoft 365, Outlook, or custom SMTP"
      />

      {loading ? (
        <PageDataSkeleton metrics={0} rows={4} />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4" /> Connection status
              </CardTitle>
              <CardDescription>
                Settings apply only to your tenant. Other organisations cannot use this mailbox.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3 text-sm">
              {status?.connected ? (
                <Badge variant="success">Connected</Badge>
              ) : (
                <Badge variant="outline">Not connected</Badge>
              )}
              {status?.provider ? (
                <span>{PROVIDER_LABEL[status.provider]}</span>
              ) : null}
              {status?.authMode ? (
                <Badge variant="secondary">{status.authMode}</Badge>
              ) : null}
              <span className="text-muted-foreground">
                {status?.oauthEmail || status?.fromEmail || '—'}
              </span>
              {status?.lastTestAt ? (
                <span className="text-xs text-muted-foreground">
                  Last test:{' '}
                  {status.lastTestOk ? 'OK' : 'Failed'} ·{' '}
                  {new Date(status.lastTestAt).toLocaleString()}
                </span>
              ) : null}
              {status?.lastError ? (
                <p className="w-full text-xs text-destructive">{status.lastError}</p>
              ) : null}
              {status?.connected && canWrite ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto"
                  disabled={busy}
                  onClick={() => void onDisconnect()}
                >
                  <Unplug className="mr-1 h-3.5 w-3.5" /> Disconnect
                </Button>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">One-click connect</CardTitle>
              <CardDescription>
                Opens Google or Microsoft login, then stores tokens for this tenant only.
                Register OAuth apps and set env vars (see callback URL below).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={busy || !canWrite || !status?.oauth.gmail}
                  onClick={() => void onConnect('GMAIL')}
                >
                  Connect Gmail
                </Button>
                <Button
                  disabled={busy || !canWrite || !status?.oauth.microsoft365}
                  onClick={() => void onConnect('MICROSOFT365')}
                >
                  Connect Microsoft 365
                </Button>
                <Button
                  disabled={busy || !canWrite || !status?.oauth.outlook}
                  onClick={() => void onConnect('OUTLOOK')}
                >
                  Connect Outlook
                </Button>
              </div>
              <p className="text-xs text-muted-foreground break-all">
                OAuth redirect URI (add in Google Cloud / Azure app):{' '}
                <code className="rounded bg-muted px-1">{status?.oauth.callbackUrl}</code>
              </p>
              {!status?.oauth.gmail && !status?.oauth.microsoft365 ? (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  OAuth buttons stay disabled until{' '}
                  <code>GOOGLE_OAUTH_*</code> and/or{' '}
                  <code>MICROSOFT_OAUTH_*</code> are set on the API.
                  You can still use app password / SMTP below.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">SMTP / app password</CardTitle>
              <CardDescription>
                Gmail: use an App Password. Microsoft 365 / Outlook: SMTP AUTH password
                or custom host.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select
                  value={provider}
                  onValueChange={(v) => setProvider(v as SmtpProvider)}
                  disabled={!canWrite}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PROVIDER_LABEL) as SmtpProvider[]).map((p) => (
                      <SelectItem key={p} value={p}>
                        {PROVIDER_LABEL[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>From email</Label>
                <Input
                  type="email"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  disabled={!canWrite}
                />
              </div>
              <div className="space-y-2">
                <Label>From name</Label>
                <Input
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  disabled={!canWrite}
                />
              </div>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Defaults to from email"
                  disabled={!canWrite}
                />
              </div>
              {provider === 'CUSTOM' ? (
                <>
                  <div className="space-y-2">
                    <Label>Host</Label>
                    <Input
                      value={host}
                      onChange={(e) => setHost(e.target.value)}
                      disabled={!canWrite}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Port</Label>
                    <Input
                      value={port}
                      onChange={(e) => setPort(e.target.value)}
                      disabled={!canWrite}
                    />
                  </div>
                </>
              ) : null}
              <div className="space-y-2 sm:col-span-2">
                <Label>Password / app password</Label>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    status?.hasPassword ? '•••••••• (leave blank to keep)' : ''
                  }
                  disabled={!canWrite}
                />
              </div>
              {canWrite ? (
                <div className="sm:col-span-2">
                  <Button disabled={busy} onClick={() => void onSavePassword()}>
                    {busy ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Save SMTP
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Send test email</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-end gap-3">
              <div className="min-w-[220px] flex-1 space-y-2">
                <Label>To</Label>
                <Input
                  type="email"
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                />
              </div>
              <Button
                disabled={busy || !status?.connected}
                onClick={() => void onTest()}
              >
                Send test
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
