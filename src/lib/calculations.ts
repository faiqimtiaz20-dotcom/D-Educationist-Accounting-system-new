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

export function salaryTax(grossSalary: number): number {
  if (grossSalary <= 600000) return grossSalary * 0.025
  if (grossSalary <= 1200000) return grossSalary * 0.075
  return grossSalary * 0.125
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
