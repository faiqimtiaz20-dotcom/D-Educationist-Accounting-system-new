import { isApiMode, isDemoLoginAllowed, isProductionBuild } from '@/lib/api-client'

/**
 * Mock-mode password (Zustand local demo).
 * API/seed mode uses SEED_PASSWORD from backend (default ChangeMe123!).
 * Never used in production builds.
 */
export const DEMO_PASSWORD = 'demo123'
export const API_SEED_PASSWORD = 'ChangeMe123!'

export const DEMO_ACCOUNTS = [
  { email: 'admin@saa.com', label: 'Tenant Admin', hint: 'DED accounting' },
  { email: 'crm@platform.local', label: 'CRM Admin', hint: 'Platform tenants' },
  { email: 'ahmed@saa.com', label: 'Branch Manager', hint: 'Karachi branch' },
  { email: 'sara@saa.com', label: 'Accountant', hint: 'Lahore branch' },
  { email: 'bilal@saa.com', label: 'Cashier', hint: 'Islamabad branch' },
  { email: 'fatima@saa.com', label: 'Counsellor', hint: 'Student data only' },
] as const

export function getDemoPassword() {
  if (isProductionBuild()) return ''
  return isApiMode() ? API_SEED_PASSWORD : DEMO_PASSWORD
}

/** Mock-mode only. Rejected in production and when API mode is active. */
export function verifyPassword(_email: string, password: string): boolean {
  if (isProductionBuild() || isApiMode()) return false
  if (!isDemoLoginAllowed()) return false
  return password === DEMO_PASSWORD
}
