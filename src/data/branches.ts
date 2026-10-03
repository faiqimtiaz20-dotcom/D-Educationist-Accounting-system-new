import type { Branch } from '@/types'

export const branches: Branch[] = [
  { id: 'ho', name: 'Head Office', code: 'HO', city: 'Karachi', isHeadOffice: true },
  { id: 'khi', name: 'Karachi Branch', code: 'KHI', city: 'Karachi' },
  { id: 'lhr', name: 'Lahore Branch', code: 'LHR', city: 'Lahore' },
  { id: 'isb', name: 'Islamabad Branch', code: 'ISB', city: 'Islamabad' },
  { id: 'mul', name: 'Multan Branch', code: 'MUL', city: 'Multan' },
  { id: 'fsd', name: 'Faisalabad Branch', code: 'FSD', city: 'Faisalabad' },
]

export const getBranchName = (id: string) =>
  branches.find((b) => b.id === id)?.name ?? id
