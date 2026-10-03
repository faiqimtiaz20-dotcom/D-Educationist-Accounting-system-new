import { useCallback, useEffect, useState } from 'react'
import { isApiMode } from '@/lib/api-client'
import { listBankAccounts } from '@/lib/masters-api'
import {
  listInvoices,
  listOtherInvoices,
  listReceivables,
  mapApiAllocations,
  mapApiInvoice,
  mapApiOtherInvoice,
  mapApiReceivable,
} from '@/lib/revenue-api'
import { listStudents, mapApiStudent } from '@/lib/students-api'
import { listBranches, type ApiBranch } from '@/lib/settings-api'
import { useDataStore } from '@/store/data-store'
import type { Branch } from '@/types'
import { toast } from 'sonner'

export type ApiBankRow = {
  id: string
  name: string
  bankName: string
  branchId: string
  currencyCode: string
}

function mapBranch(b: ApiBranch): Branch {
  return {
    id: b.id,
    name: b.name,
    code: b.code,
    city: b.city,
    isHeadOffice: b.isHeadOffice,
  }
}

/** Hydrate Zustand revenue entities from API when VITE_API_URL is set. */
export function useRevenueApiSync() {
  const api = isApiMode()
  const [banks, setBanks] = useState<ApiBankRow[]>([])
  const [loading, setLoading] = useState(api)

  const reload = useCallback(async () => {
    if (!api) return
    setLoading(true)
    try {
      const [inv, oth, rec, stu, bankRows, branchRows] = await Promise.all([
        listInvoices(),
        listOtherInvoices(),
        listReceivables(),
        listStudents(),
        listBankAccounts(),
        listBranches(),
      ])
      useDataStore.setState({
        invoices: inv.map(mapApiInvoice),
        otherInvoices: oth.map(mapApiOtherInvoice),
        receivables: rec.map(mapApiReceivable),
        receivableAllocations: mapApiAllocations(rec),
        students: stu.map(mapApiStudent),
        branches: branchRows.map(mapBranch),
      })
      setBanks(
        bankRows.map((b) => ({
          id: b.id,
          name: b.name,
          bankName: b.bankName,
          branchId: b.branchId,
          currencyCode: b.currencyCode,
        })),
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load revenue data')
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    void reload()
  }, [reload])

  return { api, reload, banks, loading }
}
