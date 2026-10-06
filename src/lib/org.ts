import { branches as mockBranches } from '@/data/branches'
import { isApiMode } from '@/lib/api-client'
import { useDataStore } from '@/store/data-store'

export function getBranchName(id: string) {
  const fromStore = useDataStore.getState().branches.find((b) => b.id === id)
  if (fromStore) return fromStore.name
  if (!isApiMode()) {
    return mockBranches.find((b) => b.id === id)?.name ?? id
  }
  return id
}

export function getUserName(id: string) {
  const user = useDataStore.getState().users.find((u) => u.id === id)
  return user?.name ?? id
}
