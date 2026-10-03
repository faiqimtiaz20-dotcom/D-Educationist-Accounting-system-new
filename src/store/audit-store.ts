import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { auditLogs as initialAuditLogs } from '@/data/documents'
import type { AuditLog } from '@/types'

interface AuditState {
  logs: AuditLog[]
  append: (entry: Omit<AuditLog, 'id'>) => void
}

function nextAuditId(existing: AuditLog[]) {
  const nums = existing.map((l) => parseInt(l.id.replace(/\D/g, ''), 10)).filter((n) => !Number.isNaN(n))
  const next = nums.length ? Math.max(...nums) + 1 : 1
  return `al${next}`
}

export const useAuditStore = create<AuditState>()(
  persist(
    (set) => ({
      logs: initialAuditLogs,
      append: (entry) =>
        set((s) => ({
          logs: [{ ...entry, id: nextAuditId(s.logs) }, ...s.logs].slice(0, 500),
        })),
    }),
    { name: 'saa-audit-store' }
  )
)
