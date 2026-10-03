import { useCallback, useEffect, useState } from 'react'
import { isApiMode } from '@/lib/api-client'
import { listBankAccounts } from '@/lib/masters-api'
import { listSubAgents, mapApiSubAgent } from '@/lib/masters-api'
import {
  listCommissions,
  listPayments,
  mapApiCommission,
  mapApiPayment,
} from '@/lib/payables-api'
import { listInvoices, mapApiInvoice } from '@/lib/revenue-api'
import { listStudents, mapApiStudent } from '@/lib/students-api'
import { useDataStore } from '@/store/data-store'
import { toast } from 'sonner'

export type ApiBankRow = {
  id: string
  name: string
  bankName: string
  branchId: string
  currencyCode: string
}

/** Hydrate Zustand payables + related masters from API. */
export function usePayablesApiSync() {
  const api = isApiMode()
  const [banks, setBanks] = useState<ApiBankRow[]>([])
  const [loading, setLoading] = useState(api)

  const reload = useCallback(async () => {
    if (!api) return
    setLoading(true)
    try {
      const [comms, pays, agents, invs, students, bankRows] = await Promise.all([
        listCommissions(),
        listPayments(),
        listSubAgents(),
        listInvoices(),
        listStudents(),
        listBankAccounts(),
      ])
      useDataStore.setState({
        subAgentCommissions: comms.map(mapApiCommission),
        subAgentPayments: pays.map(mapApiPayment),
        subAgents: agents.map(mapApiSubAgent),
        invoices: invs.map(mapApiInvoice),
        students: students.map(mapApiStudent),
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
      toast.error(err instanceof Error ? err.message : 'Failed to load payables')
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    void reload()
  }, [reload])

  return { api, reload, banks, loading }
}
