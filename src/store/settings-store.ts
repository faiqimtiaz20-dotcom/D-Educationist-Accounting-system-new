import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Currency } from '@/types'
import type { InvoiceBranding } from '@/lib/settings-api'

export const DEFAULT_PETTY_CASH_CATEGORIES = [
  'Stationery',
  'Refreshments',
  'Courier',
  'Printing',
  'Transport',
  'Utilities',
  'Maintenance',
  'Imprest',
]

export const DEFAULT_INVOICE_BRANDING: InvoiceBranding = {
  logoPath: null,
  hasLogo: false,
  address: '',
  phone: '',
  email: '',
  website: '',
  footer: 'Thank you for your business.',
  documentTitle: 'INVOICE',
  accentColor: '#0f766e',
  emailSubject: 'Commission Invoice {{invoiceNo}}',
  emailBody:
    'Dear Sir/Madam,\n\n' +
    'Please find commission invoice {{invoiceNo}} dated {{invoiceDate}}' +
    ' for {{students}}{{universities}}.\n\n' +
    'Total amount: {{amount}}.\n\n' +
    'Kind regards,\n{{orgName}}',
  companyLegalName: '',
  bankName: '',
  bankBranch: '',
  bankCity: '',
  accountTitle: '',
  accountNo: '',
  swiftCode: '',
  iban: '',
}

interface SettingsState {
  whtRatePercent: number
  enabledCurrencies: Currency[]
  fiscalPeriodLockedUntil: string | null
  /** Organisation display name for this tenant (API settings.org_name). */
  orgName: string
  invoiceBranding: InvoiceBranding
  pettyCashCategories: string[]
  setWhtRatePercent: (rate: number) => void
  setEnabledCurrencies: (currencies: Currency[]) => void
  setFiscalPeriodLockedUntil: (date: string | null) => void
  setOrgName: (name: string) => void
  setInvoiceBranding: (b: Partial<InvoiceBranding>) => void
  applyApiSettings: (s: {
    whtRatePercent: number
    enabledCurrencies: string[]
    fiscalPeriodLockedUntil: string | null
    orgName: string
    invoiceBranding?: InvoiceBranding
  }) => void
  addPettyCashCategory: (category: string) => boolean
  updatePettyCashCategory: (oldName: string, newName: string) => boolean
  deletePettyCashCategory: (category: string) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      whtRatePercent: 1,
      enabledCurrencies: ['PKR', 'GBP', 'USD', 'CAD', 'AUD', 'EUR'],
      fiscalPeriodLockedUntil: '2026-06-30',
      orgName: '',
      invoiceBranding: { ...DEFAULT_INVOICE_BRANDING },
      pettyCashCategories: [...DEFAULT_PETTY_CASH_CATEGORIES],
      setWhtRatePercent: (rate) => set({ whtRatePercent: rate }),
      setEnabledCurrencies: (currencies) => set({ enabledCurrencies: currencies }),
      setFiscalPeriodLockedUntil: (date) => set({ fiscalPeriodLockedUntil: date }),
      setOrgName: (name) => set({ orgName: name }),
      setInvoiceBranding: (b) =>
        set((s) => ({ invoiceBranding: { ...s.invoiceBranding, ...b } })),
      applyApiSettings: (s) =>
        set({
          whtRatePercent: s.whtRatePercent,
          enabledCurrencies: s.enabledCurrencies as Currency[],
          fiscalPeriodLockedUntil: s.fiscalPeriodLockedUntil,
          orgName: s.orgName || '',
          invoiceBranding: s.invoiceBranding
            ? { ...DEFAULT_INVOICE_BRANDING, ...s.invoiceBranding }
            : get().invoiceBranding,
        }),
      addPettyCashCategory: (category) => {
        const name = category.trim()
        if (!name) return false
        const existing = get().pettyCashCategories
        if (existing.some((c) => c.toLowerCase() === name.toLowerCase())) return false
        set({ pettyCashCategories: [...existing, name] })
        return true
      },
      updatePettyCashCategory: (oldName, newName) => {
        const name = newName.trim()
        if (!name) return false
        const existing = get().pettyCashCategories
        if (
          existing.some(
            (c) =>
              c.toLowerCase() === name.toLowerCase() &&
              c.toLowerCase() !== oldName.toLowerCase(),
          )
        ) {
          return false
        }
        set({
          pettyCashCategories: existing.map((c) => (c === oldName ? name : c)),
        })
        return true
      },
      deletePettyCashCategory: (category) =>
        set((s) => ({
          pettyCashCategories: s.pettyCashCategories.filter((c) => c !== category),
        })),
    }),
    {
      name: 'saa-settings-store',
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<SettingsState>
        return {
          ...current,
          ...p,
          invoiceBranding: {
            ...DEFAULT_INVOICE_BRANDING,
            ...(p.invoiceBranding ?? current.invoiceBranding),
          },
          pettyCashCategories:
            Array.isArray(p.pettyCashCategories) && p.pettyCashCategories.length > 0
              ? p.pettyCashCategories
              : current.pettyCashCategories,
        }
      },
    },
  ),
)

export function getWhtRate(): number {
  return useSettingsStore.getState().whtRatePercent / 100
}

export function isDateLocked(date: string): boolean {
  const lockedUntil = useSettingsStore.getState().fiscalPeriodLockedUntil
  if (!lockedUntil) return false
  return date <= lockedUntil
}
