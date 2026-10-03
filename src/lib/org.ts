import { useDataStore } from '@/store/data-store'

export function getBranchName(id: string) {
  const branch = useDataStore.getState().branches.find((b) => b.id === id)
  return branch?.name ?? id
}

export function getUserName(id: string) {
  const user = useDataStore.getState().users.find((u) => u.id === id)
  return user?.name ?? id
}
