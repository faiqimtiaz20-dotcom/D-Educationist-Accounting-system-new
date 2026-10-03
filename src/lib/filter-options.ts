import { branches } from '@/data'
import type { Currency } from '@/types'

export const branchFilterOptions = branches.map((b) => ({ label: b.name, value: b.id }))

const currencies: Currency[] = ['PKR', 'GBP', 'USD', 'CAD', 'AUD', 'EUR']
export const currencyFilterOptions = currencies.map((c) => ({ label: c, value: c }))
