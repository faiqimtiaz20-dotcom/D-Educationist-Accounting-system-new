import { PageHeader } from '@/components/shared/PageHeader'
import { RowActions } from '@/components/shared/RowActions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useDataStore } from '@/store/data-store'
import { useSettingsStore } from '@/store/settings-store'
import { logAudit } from '@/lib/audit'
import { isApiMode } from '@/lib/api-client'
import { getSettings, patchSettings, uploadInvoiceLogo, deleteInvoiceLogo, fetchInvoiceLogoObjectUrl } from '@/lib/settings-api'
import {
  createCountry as apiCreateCountry,
  createPettyCashCategory as apiCreatePettyCat,
  createUniversity as apiCreateUniversity,
  deleteCountry as apiDeleteCountry,
  deletePettyCashCategory as apiDeletePettyCat,
  deleteUniversity as apiDeleteUniversity,
  listCountries,
  listPettyCashCategories,
  listUniversities,
  mapApiTenantCountry,
  mapApiUniversity,
  updateCountry as apiUpdateCountry,
  updatePettyCashCategory as apiUpdatePettyCat,
  updateUniversity as apiUpdateUniversity,
  type ApiCategory,
} from '@/lib/masters-api'
import type { Currency, TenantCountry, University } from '@/types'
import { DEFAULT_INVOICE_BRANDING } from '@/store/settings-store'
import { FileImage, Globe2, GraduationCap, Plus, Settings, Wallet } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Textarea } from '@/components/ui/textarea'

const ALL_CURRENCIES: Currency[] = ['PKR', 'GBP', 'USD', 'CAD', 'AUD', 'EUR']
const FALLBACK_COUNTRIES = ['UK', 'USA', 'Canada', 'Australia', 'Germany', 'Ireland', 'New Zealand']

const emptyUniversity = (defaultCountry = 'UK'): Omit<University, 'id' | 'universityNo'> => ({
  name: '',
  country: defaultCountry,
  defaultCommissionRate: 15,
  currency: 'GBP',
})

const emptyCountry = (): { name: string; isoCode: string } => ({
  name: '',
  isoCode: '',
})

export function SystemSettingsPage() {
  const storeUniversities = useDataStore((s) => s.universities)
  const addUniversity = useDataStore((s) => s.addUniversity)
  const updateUniversity = useDataStore((s) => s.updateUniversity)
  const deleteUniversity = useDataStore((s) => s.deleteUniversity)

  const whtRatePercent = useSettingsStore((s) => s.whtRatePercent)
  const enabledCurrencies = useSettingsStore((s) => s.enabledCurrencies)
  const fiscalPeriodLockedUntil = useSettingsStore((s) => s.fiscalPeriodLockedUntil)
  const storeOrgName = useSettingsStore((s) => s.orgName)
  const invoiceBranding = useSettingsStore((s) => s.invoiceBranding)
  const storePettyCashCategories = useSettingsStore((s) => s.pettyCashCategories)
  const setWhtRatePercent = useSettingsStore((s) => s.setWhtRatePercent)
  const setEnabledCurrencies = useSettingsStore((s) => s.setEnabledCurrencies)
  const setFiscalPeriodLockedUntil = useSettingsStore((s) => s.setFiscalPeriodLockedUntil)
  const applyApiSettings = useSettingsStore((s) => s.applyApiSettings)
  const setOrgName = useSettingsStore((s) => s.setOrgName)
  const setInvoiceBranding = useSettingsStore((s) => s.setInvoiceBranding)
  const addPettyCashCategory = useSettingsStore((s) => s.addPettyCashCategory)
  const updatePettyCashCategory = useSettingsStore((s) => s.updatePettyCashCategory)
  const deletePettyCashCategory = useSettingsStore((s) => s.deletePettyCashCategory)

  const [whtRate, setWhtRate] = useState(String(whtRatePercent))
  const [orgNameDraft, setOrgNameDraft] = useState(storeOrgName)
  const [brandDraft, setBrandDraft] = useState(invoiceBranding)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null)
  const [logoBusy, setLogoBusy] = useState(false)
  const [uniDialogOpen, setUniDialogOpen] = useState(false)
  const [isEditUni, setIsEditUni] = useState(false)
  const [editUniId, setEditUniId] = useState<string | null>(null)
  const [uniForm, setUniForm] = useState(emptyUniversity())

  const [countryDialogOpen, setCountryDialogOpen] = useState(false)
  const [isEditCountry, setIsEditCountry] = useState(false)
  const [editCountryId, setEditCountryId] = useState<string | null>(null)
  const [countryForm, setCountryForm] = useState(emptyCountry())

  const [catDialogOpen, setCatDialogOpen] = useState(false)
  const [isEditCat, setIsEditCat] = useState(false)
  const [editCatName, setEditCatName] = useState<string | null>(null)
  const [editCatId, setEditCatId] = useState<string | null>(null)
  const [catName, setCatName] = useState('')
  const api = isApiMode()

  const [apiUniversities, setApiUniversities] = useState<University[]>([])
  const [apiCountries, setApiCountries] = useState<TenantCountry[]>([])
  const [apiPettyCats, setApiPettyCats] = useState<ApiCategory[]>([])
  const [mastersLoading, setMastersLoading] = useState(api)

  const loadMasters = useCallback(async () => {
    if (!api) return
    setMastersLoading(true)
    try {
      const [unis, cats, countries] = await Promise.all([
        listUniversities(),
        listPettyCashCategories(),
        listCountries(),
      ])
      setApiUniversities(unis.map(mapApiUniversity))
      setApiPettyCats(cats)
      setApiCountries(countries.map(mapApiTenantCountry))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load masters')
    } finally {
      setMastersLoading(false)
    }
  }, [api])

  useEffect(() => {
    void loadMasters()
  }, [loadMasters])

  useEffect(() => {
    if (!api) return
    void (async () => {
      try {
        const s = await getSettings()
        setWhtRate(String(s.whtRatePercent))
        setOrgNameDraft(s.orgName)
        applyApiSettings(s)
        if (s.invoiceBranding) {
          setBrandDraft({ ...DEFAULT_INVOICE_BRANDING, ...s.invoiceBranding })
        }
        if (s.invoiceBranding?.hasLogo) {
          const url = await fetchInvoiceLogoObjectUrl()
          setLogoPreviewUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev)
            return url
          })
        } else {
          setLogoPreviewUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev)
            return null
          })
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load settings')
      }
    })()
  }, [api, applyApiSettings])

  useEffect(() => {
    if (!api) setOrgNameDraft(storeOrgName)
  }, [api, storeOrgName])

  const universities = api ? apiUniversities : storeUniversities
  const countries: TenantCountry[] = api
    ? apiCountries
    : FALLBACK_COUNTRIES.map((name, i) => ({
        id: `local-${i}`,
        name,
        isActive: true,
      }))
  const countryNames = countries.map((c) => c.name)
  const pettyCashCategories = api
    ? apiPettyCats.map((c) => c.name)
    : storePettyCashCategories

  const toggleCurrency = (currency: Currency) => {
    setEnabledCurrencies(
      enabledCurrencies.includes(currency)
        ? (currency === 'PKR' || enabledCurrencies.length <= 1 ? enabledCurrencies : enabledCurrencies.filter((c) => c !== currency))
        : [...enabledCurrencies, currency]
    )
  }

  const openAddUniversity = () => {
    setIsEditUni(false)
    setEditUniId(null)
    setUniForm(emptyUniversity(countryNames[0] ?? 'UK'))
    setUniDialogOpen(true)
  }

  const openEditUniversity = (uni: University) => {
    setIsEditUni(true)
    setEditUniId(uni.id)
    setUniForm({
      name: uni.name,
      country: uni.country,
      defaultCommissionRate: uni.defaultCommissionRate,
      currency: uni.currency,
    })
    setUniDialogOpen(true)
  }

  const handleDeleteUniversity = async (uni: University) => {
    if (!confirm(`Remove ${uni.name} from registered universities?`)) return
    try {
      if (api) {
        await apiDeleteUniversity(uni.id)
        await loadMasters()
      } else {
        deleteUniversity(uni.id)
      }
      toast.success('University removed')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const handleSaveUniversity = async () => {
    if (!uniForm.name.trim()) {
      toast.error('University name is required')
      return
    }
    if (!uniForm.country.trim()) {
      toast.error('Select a registered country')
      return
    }
    try {
      if (api) {
        if (isEditUni && editUniId) {
          await apiUpdateUniversity(editUniId, uniForm, countries)
          toast.success('University updated')
        } else {
          await apiCreateUniversity(uniForm, countries)
          toast.success('University registered')
        }
        await loadMasters()
      } else if (isEditUni && editUniId) {
        updateUniversity(editUniId, uniForm)
        toast.success('University updated')
      } else {
        addUniversity(uniForm)
        toast.success('University registered')
      }
      setUniDialogOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    }
  }

  const openAddCountry = () => {
    setIsEditCountry(false)
    setEditCountryId(null)
    setCountryForm(emptyCountry())
    setCountryDialogOpen(true)
  }

  const openEditCountry = (c: TenantCountry) => {
    setIsEditCountry(true)
    setEditCountryId(c.id)
    setCountryForm({ name: c.name, isoCode: c.isoCode ?? '' })
    setCountryDialogOpen(true)
  }

  const handleDeleteCountry = async (c: TenantCountry) => {
    if (!confirm(`Remove country "${c.name}"?`)) return
    try {
      if (api) {
        await apiDeleteCountry(c.id)
        await loadMasters()
      }
      toast.success('Country removed')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const handleSaveCountry = async () => {
    if (!countryForm.name.trim()) {
      toast.error('Country name is required')
      return
    }
    if (!api) {
      toast.error('Countries can only be managed in API mode')
      return
    }
    try {
      const body = {
        name: countryForm.name.trim(),
        isoCode: countryForm.isoCode.trim() || null,
      }
      if (isEditCountry && editCountryId) {
        await apiUpdateCountry(editCountryId, body)
        toast.success('Country updated')
      } else {
        await apiCreateCountry(body)
        toast.success('Country registered')
      }
      await loadMasters()
      setCountryDialogOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    }
  }

  const openAddCategory = () => {
    setIsEditCat(false)
    setEditCatName(null)
    setEditCatId(null)
    setCatName('')
    setCatDialogOpen(true)
  }

  const openEditCategory = (name: string) => {
    setIsEditCat(true)
    setEditCatName(name)
    setEditCatId(apiPettyCats.find((c) => c.name === name)?.id ?? null)
    setCatName(name)
    setCatDialogOpen(true)
  }

  const handleDeleteCategory = async (name: string) => {
    if (!confirm(`Remove category "${name}"? Existing petty cash entries keep this category label.`)) return
    try {
      if (api) {
        const row = apiPettyCats.find((c) => c.name === name)
        if (!row) throw new Error('Category not found')
        await apiDeletePettyCat(row.id)
        await loadMasters()
      } else {
        deletePettyCashCategory(name)
        logAudit({ module: 'Settings', action: 'Deleted petty cash category', details: name })
      }
      toast.success('Category removed')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const handleSaveCategory = async () => {
    const name = catName.trim()
    if (!name) {
      toast.error('Category name is required')
      return
    }
    try {
      if (api) {
        if (isEditCat && editCatId) {
          await apiUpdatePettyCat(editCatId, name)
          toast.success('Category updated')
        } else {
          await apiCreatePettyCat(name)
          toast.success('Category added')
        }
        await loadMasters()
      } else if (isEditCat && editCatName) {
        const ok = updatePettyCashCategory(editCatName, name)
        if (!ok) {
          toast.error('Category already exists or name is invalid')
          return
        }
        logAudit({ module: 'Settings', action: 'Updated petty cash category', details: `${editCatName} → ${name}` })
        toast.success('Category updated')
      } else {
        const ok = addPettyCashCategory(name)
        if (!ok) {
          toast.error('Category already exists or name is invalid')
          return
        }
        logAudit({ module: 'Settings', action: 'Added petty cash category', details: name })
        toast.success('Category added')
      }
      setCatDialogOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    }
  }

  const handleSave = async () => {
    const rate = Number(whtRate)
    if (Number.isNaN(rate) || rate < 0 || rate > 100) {
      toast.error('Invalid WHT rate')
      return
    }
    const nextOrg = orgNameDraft.trim()
    try {
      if (api) {
        const s = await patchSettings({
          whtRatePercent: rate,
          enabledCurrencies,
          fiscalPeriodLockedUntil,
          orgName: nextOrg || undefined,
          invoiceAddress: brandDraft.address,
          invoicePhone: brandDraft.phone,
          invoiceEmail: brandDraft.email,
          invoiceWebsite: brandDraft.website,
          invoiceFooter: brandDraft.footer,
          invoiceDocumentTitle: brandDraft.documentTitle,
          invoiceAccentColor: brandDraft.accentColor || '#0f766e',
          invoiceEmailSubject: brandDraft.emailSubject,
          invoiceEmailBody: brandDraft.emailBody,
        })
        applyApiSettings(s)
        if (s.invoiceBranding) setBrandDraft({ ...DEFAULT_INVOICE_BRANDING, ...s.invoiceBranding })
      } else {
        setWhtRatePercent(rate)
        setOrgName(nextOrg)
        setInvoiceBranding(brandDraft)
      }
      logAudit({
        module: 'Settings',
        action: 'Updated system settings',
        details: `WHT ${rate}%; org ${nextOrg || '(empty)'}`,
      })
      toast.success('Settings saved', {
        description: `WHT ${rate}%, invoice branding updated for this organisation.`,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    }
  }

  const handleLogoUpload = async (file: File | undefined) => {
    if (!file || !api) return
    setLogoBusy(true)
    try {
      const s = await uploadInvoiceLogo(file)
      applyApiSettings(s)
      if (s.invoiceBranding) setBrandDraft({ ...DEFAULT_INVOICE_BRANDING, ...s.invoiceBranding })
      const url = await fetchInvoiceLogoObjectUrl()
      setLogoPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return url
      })
      toast.success('Invoice logo uploaded')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Logo upload failed')
    } finally {
      setLogoBusy(false)
    }
  }

  const handleLogoRemove = async () => {
    if (!api) return
    setLogoBusy(true)
    try {
      const s = await deleteInvoiceLogo()
      applyApiSettings(s)
      if (s.invoiceBranding) setBrandDraft({ ...DEFAULT_INVOICE_BRANDING, ...s.invoiceBranding })
      setLogoPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      toast.success('Invoice logo removed')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Remove failed')
    } finally {
      setLogoBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Settings"
        subtitle={
          api
            ? 'Organisation settings for this tenant only (universities, categories, tax)'
            : 'Universities, petty cash categories, tax defaults, and currencies'
        }
      >
        <Button onClick={() => void handleSave()}>Save Changes</Button>
      </PageHeader>

      <Tabs defaultValue="universities">
        <TabsList>
          <TabsTrigger value="universities" className="gap-2"><GraduationCap className="h-4 w-4" /> Registered Universities</TabsTrigger>
          <TabsTrigger value="countries" className="gap-2"><Globe2 className="h-4 w-4" /> Countries</TabsTrigger>
          <TabsTrigger value="petty-cash" className="gap-2"><Wallet className="h-4 w-4" /> Petty Cash Categories</TabsTrigger>
          <TabsTrigger value="invoice" className="gap-2"><FileImage className="h-4 w-4" /> Invoice Branding</TabsTrigger>
          <TabsTrigger value="general" className="gap-2"><Settings className="h-4 w-4" /> General Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="universities" className="mt-6 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Registered Universities</CardTitle>
                <CardDescription>Manage universities with country and default commission rates — used when creating invoices</CardDescription>
              </div>
              <Button onClick={openAddUniversity}><Plus className="mr-1 h-4 w-4" /> Register University</Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>University ID</TableHead>
                      <TableHead>University Name</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Currency</TableHead>
                      <TableHead className="text-right">Commission Rate</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mastersLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          Loading…
                        </TableCell>
                      </TableRow>
                    ) : universities.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          No universities registered yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      universities.map((uni) => (
                        <TableRow key={uni.id}>
                          <TableCell className="font-mono text-xs font-medium">{uni.universityNo || '—'}</TableCell>
                          <TableCell className="font-medium">{uni.name}</TableCell>
                          <TableCell><Badge variant="outline">{uni.country}</Badge></TableCell>
                          <TableCell>{uni.currency}</TableCell>
                          <TableCell className="text-right font-medium">{uni.defaultCommissionRate}%</TableCell>
                          <TableCell>
                            <RowActions onEdit={() => openEditUniversity(uni)} onDelete={() => void handleDeleteUniversity(uni)} />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="countries" className="mt-6 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Registered Countries</CardTitle>
                <CardDescription>
                  Destination countries for this organisation only — used when registering universities and students
                </CardDescription>
              </div>
              <Button onClick={openAddCountry} disabled={!api}>
                <Plus className="mr-1 h-4 w-4" /> Add Country
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Country</TableHead>
                      <TableHead>ISO Code</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mastersLoading ? (
                      <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                          Loading…
                        </TableCell>
                      </TableRow>
                    ) : countries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                          No countries registered yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      countries.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell className="font-mono text-xs">{c.isoCode || '—'}</TableCell>
                          <TableCell>
                            {api ? (
                              <RowActions
                                onEdit={() => openEditCountry(c)}
                                onDelete={() => void handleDeleteCountry(c)}
                              />
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="petty-cash" className="mt-6 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Petty Cash Categories</CardTitle>
                <CardDescription>Categories available when creating petty cash entries</CardDescription>
              </div>
              <Button onClick={openAddCategory}><Plus className="mr-1 h-4 w-4" /> Add Category</Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category Name</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mastersLoading ? (
                      <TableRow>
                        <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                          Loading…
                        </TableCell>
                      </TableRow>
                    ) : pettyCashCategories.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                          No categories yet. Add one to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      pettyCashCategories.map((name) => (
                        <TableRow key={name}>
                          <TableCell className="font-medium">{name}</TableCell>
                          <TableCell>
                            <RowActions onEdit={() => openEditCategory(name)} onDelete={() => void handleDeleteCategory(name)} />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoice" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Logo & letterhead</CardTitle>
              <CardDescription>
                Controls how invoices look for this organisation when previewed or emailed.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-3 sm:col-span-2">
                <Label>Invoice logo</Label>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex h-20 w-40 items-center justify-center overflow-hidden rounded border bg-muted/30">
                    {logoPreviewUrl ? (
                      <img src={logoPreviewUrl} alt="Invoice logo" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <span className="text-xs text-muted-foreground">No logo</span>
                    )}
                  </div>
                  {api ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={logoBusy}
                        onClick={() => {
                          const input = document.createElement('input')
                          input.type = 'file'
                          input.accept = 'image/png,image/jpeg,image/webp,image/gif'
                          input.onchange = () => {
                            void handleLogoUpload(input.files?.[0])
                          }
                          input.click()
                        }}
                      >
                        Upload logo
                      </Button>
                      {brandDraft.hasLogo || logoPreviewUrl ? (
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={logoBusy}
                          onClick={() => void handleLogoRemove()}
                        >
                          Remove
                        </Button>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Logo upload requires API mode.</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Document title</Label>
                <Input
                  value={brandDraft.documentTitle}
                  onChange={(e) => setBrandDraft((p) => ({ ...p, documentTitle: e.target.value }))}
                  placeholder="Commission Invoice"
                />
              </div>
              <div className="space-y-2">
                <Label>Accent colour</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    className="h-9 w-14 p-1"
                    value={brandDraft.accentColor || '#0f766e'}
                    onChange={(e) => setBrandDraft((p) => ({ ...p, accentColor: e.target.value }))}
                  />
                  <Input
                    value={brandDraft.accentColor}
                    onChange={(e) => setBrandDraft((p) => ({ ...p, accentColor: e.target.value }))}
                    placeholder="#0f766e"
                  />
                </div>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Address</Label>
                <Input
                  value={brandDraft.address}
                  onChange={(e) => setBrandDraft((p) => ({ ...p, address: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={brandDraft.phone}
                  onChange={(e) => setBrandDraft((p) => ({ ...p, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Public email</Label>
                <Input
                  type="email"
                  value={brandDraft.email}
                  onChange={(e) => setBrandDraft((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Website</Label>
                <Input
                  value={brandDraft.website}
                  onChange={(e) => setBrandDraft((p) => ({ ...p, website: e.target.value }))}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Footer note</Label>
                <Textarea
                  rows={2}
                  value={brandDraft.footer}
                  onChange={(e) => setBrandDraft((p) => ({ ...p, footer: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Email templates</CardTitle>
              <CardDescription>
                Placeholders: {'{{invoiceNo}}'}, {'{{invoiceDate}}'}, {'{{amount}}'}, {'{{orgName}}'},{' '}
                {'{{students}}'}, {'{{universities}}'}, {'{{documentTitle}}'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input
                  value={brandDraft.emailSubject}
                  onChange={(e) => setBrandDraft((p) => ({ ...p, emailSubject: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Body</Label>
                <Textarea
                  rows={8}
                  value={brandDraft.emailBody}
                  onChange={(e) => setBrandDraft((p) => ({ ...p, emailBody: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general" className="mt-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Organisation</CardTitle>
                <CardDescription>
                  Display name for this tenant — invoices and shell branding use this value
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-w-md space-y-2">
                  <Label htmlFor="org-name">Organisation name</Label>
                  <Input
                    id="org-name"
                    value={orgNameDraft}
                    onChange={(e) => setOrgNameDraft(e.target.value)}
                    placeholder="Your consultancy name"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">WHT Rate</CardTitle>
                <CardDescription>Default withholding tax on commission receivable and sub-agent payments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex max-w-xs items-end gap-3">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="wht-rate">Rate (%)</Label>
                    <Input id="wht-rate" type="number" min="0" max="100" step="0.1" value={whtRate} onChange={(e) => setWhtRate(e.target.value)} />
                  </div>
                  <p className="pb-2 text-sm text-muted-foreground">Applied at 1% per FBR rules</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Enabled Currencies</CardTitle>
                <CardDescription>PKR is always required; toggle foreign currencies for transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {ALL_CURRENCIES.map((currency) => {
                    const active = enabledCurrencies.includes(currency)
                    const locked = currency === 'PKR'
                    return (
                      <button key={currency} type="button" disabled={locked} onClick={() => toggleCurrency(currency)} className="disabled:cursor-not-allowed">
                        <Badge variant={active ? 'default' : 'outline'} className="cursor-pointer px-3 py-1">{currency}</Badge>
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Fiscal Period Lock</CardTitle>
                <CardDescription>Transactions on or before this date cannot be created or edited</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-w-xs space-y-2">
                  <Label htmlFor="fiscal-lock">Locked through</Label>
                  <Input
                    id="fiscal-lock"
                    type="date"
                    value={fiscalPeriodLockedUntil ?? ''}
                    onChange={(e) => setFiscalPeriodLockedUntil(e.target.value || null)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={uniDialogOpen} onOpenChange={setUniDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditUni ? 'Edit University' : 'Register University'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>University Name</Label>
              <Input value={uniForm.name} onChange={(e) => setUniForm({ ...uniForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Select
                value={uniForm.country || undefined}
                onValueChange={(v) => setUniForm({ ...uniForm, country: v })}
              >
                <SelectTrigger><SelectValue placeholder="Select registered country" /></SelectTrigger>
                <SelectContent>
                  {countryNames.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      Add a country under Countries tab first
                    </SelectItem>
                  ) : (
                    countryNames.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={uniForm.currency} onValueChange={(v) => setUniForm({ ...uniForm, currency: v as Currency })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ALL_CURRENCIES.filter((c) => c !== 'PKR').map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Default Commission %</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={uniForm.defaultCommissionRate}
                  onChange={(e) => setUniForm({ ...uniForm, defaultCommissionRate: Number(e.target.value) })}
                />
              </div>
            </div>
            <Button className="w-full" onClick={() => void handleSaveUniversity()}>
              {isEditUni ? 'Update' : 'Register'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditCat ? 'Edit Category' : 'Add Category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Category Name</Label>
              <Input value={catName} onChange={(e) => setCatName(e.target.value)} />
            </div>
            <Button className="w-full" onClick={() => void handleSaveCategory()}>
              {isEditCat ? 'Update' : 'Add'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={countryDialogOpen} onOpenChange={setCountryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditCountry ? 'Edit Country' : 'Add Country'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Country Name</Label>
              <Input
                value={countryForm.name}
                onChange={(e) => setCountryForm({ ...countryForm, name: e.target.value })}
                placeholder="e.g. UK"
              />
            </div>
            <div className="space-y-2">
              <Label>ISO Code (optional)</Label>
              <Input
                value={countryForm.isoCode}
                onChange={(e) => setCountryForm({ ...countryForm, isoCode: e.target.value.toUpperCase() })}
                placeholder="e.g. GB"
                maxLength={2}
              />
            </div>
            <Button className="w-full" onClick={() => void handleSaveCountry()}>
              {isEditCountry ? 'Update' : 'Add'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
