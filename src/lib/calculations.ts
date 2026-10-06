export function netFee(tuition: number, scholarship: number): number {
  return tuition - scholarship
}

export function netCommission(tuition: number, scholarship: number, rate: number): number {
  return netFee(tuition, scholarship) * (rate / 100)
}

export function grossPKR(amount: number, exchangeRate: number): number {
  return amount * exchangeRate
}

import { getWhtRate } from '@/store/settings-store'

export function calcWHT(grossAmountPKR: number, rate?: number): number {
  const whtRate = rate ?? getWhtRate()
  return grossAmountPKR * whtRate
}

export function netPKR(grossAmountPKR: number, whtRate?: number): number {
  return grossAmountPKR - calcWHT(grossAmountPKR, whtRate)
}

export function pettyCashTotal(
  principal: number,
  salesTax: number,
  srbSst: number,
  gst: number,
  incomeTax = 0
): number {
  return principal + salesTax + srbSst + gst + incomeTax
}

export function subAgentPayable(
  commissionAmount: number,
  rateGiven: number,
  exchangeRate: number,
  bonus = 0
): number {
  const gross = commissionAmount * (rateGiven / 100) * exchangeRate + bonus
  return netPKR(gross)
}

/**
 * Annual salary income tax — FBR salaried slabs TY 2026-27 (Finance Act 2026).
 * `annualTaxable` is annual taxable salary in PKR (no further exemption applied here).
 */
export function salaryTax(annualTaxable: number): number {
  const income = Math.max(0, annualTaxable)
  if (income <= 600_000) return 0
  if (income <= 1_200_000) return Math.round((income - 600_000) * 0.01)
  if (income <= 2_200_000) return Math.round(6_000 + (income - 1_200_000) * 0.11)
  if (income <= 3_200_000) return Math.round(116_000 + (income - 2_200_000) * 0.2)
  if (income <= 4_100_000) return Math.round(316_000 + (income - 3_200_000) * 0.25)
  if (income <= 5_600_000) return Math.round(541_000 + (income - 4_100_000) * 0.29)
  if (income <= 7_000_000) return Math.round(976_000 + (income - 5_600_000) * 0.32)
  return Math.round(1_424_000 + (income - 7_000_000) * 0.35)
}

export function formatCurrency(amount: number, currency = 'PKR'): string {
  const symbols: Record<string, string> = {
    PKR: 'PKR ',
    GBP: '£',
    USD: '$',
    CAD: 'C$',
    AUD: 'A$',
    EUR: '€',
  }
  const formatted = new Intl.NumberFormat('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
  return `${symbols[currency] ?? currency + ' '}${formatted}`
}
