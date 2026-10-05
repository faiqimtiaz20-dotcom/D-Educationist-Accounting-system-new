import { useDataStore } from '@/store/data-store'
import { branches as mockBranches } from '@/data/branches'
import { isApiMode } from '@/lib/api-client'
import type { Currency } from '@/types'

function liveBranches() {
  const fromStore = useDataStore.getState().branches
  if (fromStore.length > 0) return fromStore
  return isApiMode() ? [] : mockBranches
}

export function getBranchFilterOptions() {
  return liveBranches().map((b) => ({ label: b.name, value: b.id }))
}

/**
 * Always reads current store branches (API-hydrated).
 * Proxy so existing `branchFilterOptions.map(...)` callers stay correct.
 */
export const branchFilterOptions = new Proxy([] as Array<{ label: string; value: string }>, {
  get(_target, prop, _receiver) {
    const live = getBranchFilterOptions()
    const value = Reflect.get(live, prop, live)
    return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(live) : value
  },
  ownKeys() {
    return Reflect.ownKeys(getBranchFilterOptions())
  },
  getOwnPropertyDescriptor(_target, prop) {
    return Object.getOwnPropertyDescriptor(getBranchFilterOptions(), prop)
  },
  has(_target, prop) {
    return prop in getBranchFilterOptions()
  },
  getPrototypeOf() {
    return Array.prototype
  },
})

const currencies: Currency[] = ['PKR', 'GBP', 'USD', 'CAD', 'AUD', 'EUR']
export const currencyFilterOptions = currencies.map((c) => ({ label: c, value: c }))
