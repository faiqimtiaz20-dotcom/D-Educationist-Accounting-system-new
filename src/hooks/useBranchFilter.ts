import { useEffectiveBranchId } from '@/hooks/useAuth'

export function useBranchFilter<T extends { branchId: string }>(items: T[]): T[] {
  const effectiveBranchId = useEffectiveBranchId()
  if (effectiveBranchId === 'all') return items
  return items.filter((item) => item.branchId === effectiveBranchId)
}
