import { PageHeader } from '@/components/shared/PageHeader'
import { PageDataSkeleton } from '@/components/shared/PageDataSkeleton'
import { Button } from '@/components/ui/button'
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
  getCrmMailDelivery,
  pingCrmMailRelay,
  testCrmMailRelay,
  updateCrmMailDelivery,
  type MailDeliveryMode,
  type MailDeliverySettings,
} from '@/lib/crm-mail-api'
import { useSubmitState } from '@/hooks/useSubmitState'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export default function CrmMailDeliveryPage() {
  const api = isApiMode()
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<MailDeliverySettings | null>(null)
  const [mode, setMode] = useState<MailDeliveryMode>('direct')
  const [url, setUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [testTo, setTestTo] = useState('')
  const { submitting: saving, runSubmit } = useSubmitState()
  const [pinging, setPinging] = useState(false)
  const [testing, setTesting] = useState(false)

  const load = useCallback(async () => {
    if (!api) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await getCrmMailDelivery()
      setSettings(data)
      setMode(data.mode)
      setUrl(data.url || '')
      setApiKey('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load mail delivery')
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    void load()
  }, [load])

  const onSave = () =>
    runSubmit(async () => {
      try {
        const body: {
          mode: MailDeliveryMode
          url?: string | null
          apiKey?: string | null
        } = {
          mode,
          url: url.trim() || null,
        }
        if (apiKey.trim()) body.apiKey = apiKey.trim()
        const data = await updateCrmMailDelivery(body)
        setSettings(data)
        setMode(data.mode)
        setUrl(data.url || '')
        setApiKey('')
        toast.success(
          data.mode === 'cloudways'
            ? 'Cloudways mail relay enabled'
            : 'Direct SMTP (Nest) enabled',
        )
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Save failed')
      }
    })

  const onPing = async () => {
    setPinging(true)
    try {
      const res = await pingCrmMailRelay()
      toast.success(res.status ? `Relay OK (${res.status})` : 'Relay OK')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ping failed')
    } finally {
      setPinging(false)
    }
  }

  const onTest = async () => {
    if (!testTo.trim()) {
      toast.error('Enter a test recipient email')
      return
    }
    setTesting(true)
    try {
      const res = await testCrmMailRelay(testTo.trim())
      toast.success(`Relay test sent${res.messageId ? ` (${res.messageId})` : ''}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Test failed')
    } finally {
      setTesting(false)
    }
  }

  if (!api) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Email delivery"
          subtitle="Platform CRM — requires API mode (VITE_API_URL)"
        />
        <p className="text-sm text-muted-foreground">
          Mail delivery settings are only available when connected to the Nest API.
        </p>
      </div>
    )
  }

  if (loading || !settings) {
    return <PageDataSkeleton />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email delivery"
        subtitle="Platform CRM · choose Direct SMTP or Cloudways mail API for all tenants"
      />

      <div className="max-w-xl space-y-6 rounded-lg border bg-card p-6">
        <div className="space-y-2">
          <Label>Delivery mode</Label>
          <Select
            value={mode}
            onValueChange={(v) => setMode(v as MailDeliveryMode)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="direct">Direct SMTP (Nest — current)</SelectItem>
              <SelectItem value="cloudways">Cloudways Mail API</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Tenant Settings → Email configs stay the same. This only changes how the
            server sends (local nodemailer vs Cloudways relay).
          </p>
        </div>

        <div className="space-y-2">
          <Label>Cloudways send URL</Label>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://mail.example.com/api/v1/send"
          />
          <p className="text-xs text-muted-foreground">
            Leave empty to use env{' '}
            <code className="text-[11px]">CLOUDWAYS_MAIL_URL</code>
            {settings.envFallback.urlConfigured ? ' (set)' : ' (not set)'}.
          </p>
        </div>

        <div className="space-y-2">
          <Label>API key</Label>
          <Input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={
              settings.apiKeyConfigured
                ? '•••••••• (leave blank to keep)'
                : 'Enter API key'
            }
            autoComplete="new-password"
          />
          <p className="text-xs text-muted-foreground">
            Stored encrypted. Env fallback{' '}
            <code className="text-[11px]">CLOUDWAYS_MAIL_API_KEY</code>
            {settings.envFallback.apiKeyConfigured ? ' (set)' : ' (not set)'}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span
            className={
              settings.relayReady
                ? 'rounded bg-emerald-500/15 px-2 py-1 text-emerald-700 dark:text-emerald-400'
                : 'rounded bg-amber-500/15 px-2 py-1 text-amber-800 dark:text-amber-300'
            }
          >
            {settings.relayReady ? 'Relay credentials ready' : 'Relay not fully configured'}
          </span>
          <span className="text-muted-foreground">
            Active mode: <strong>{settings.mode}</strong>
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void onSave()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void onPing()}
            disabled={pinging || !settings.relayReady}
          >
            {pinging ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Ping relay
          </Button>
        </div>

        <div className="border-t pt-4 space-y-2">
          <Label>Relay self-test (uses Cloudways server SMTP, not tenant config)</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="email"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              placeholder="you@example.com"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => void onTest()}
              disabled={testing || !settings.relayReady}
            >
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Send test
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
