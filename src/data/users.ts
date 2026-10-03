import type { User } from '@/types'

export const users: User[] = [
  { id: 'u1', name: 'Admin User', email: 'admin@saa.com', role: 'Super Admin', branchId: 'ho' },
  { id: 'u2', name: 'Ahmed Khan', email: 'ahmed@saa.com', role: 'Branch Manager', branchId: 'khi' },
  { id: 'u3', name: 'Sara Malik', email: 'sara@saa.com', role: 'Accountant', branchId: 'lhr' },
  { id: 'u4', name: 'Bilal Hassan', email: 'bilal@saa.com', role: 'Cashier', branchId: 'isb' },
  { id: 'u5', name: 'Fatima Noor', email: 'fatima@saa.com', role: 'Counsellor', branchId: 'khi' },
  { id: 'u6', name: 'Usman Ali', email: 'usman@saa.com', role: 'Accountant', branchId: 'mul' },
  { id: 'u7', name: 'Hina Shah', email: 'hina@saa.com', role: 'Read Only', branchId: 'fsd' },
  { id: 'u8', name: 'Zain Tariq', email: 'zain@saa.com', role: 'Branch Manager', branchId: 'lhr' },
]

export const getUserName = (id: string) => users.find((u) => u.id === id)?.name ?? id
