import { useCallback, useEffect, useState } from 'react'
import { isApiMode } from '@/lib/api-client'
import {
  listEmployees,
  listPayrollRuns,
  listReimbursements,
  mapApiEmployee,
  mapApiLine,
  mapApiReimbursement,
  mapApiRun,
} from '@/lib/payroll-api'
import { listBranches, type ApiBranch } from '@/lib/settings-api'
import { useDataStore } from '@/store/data-store'
import type { Branch } from '@/types'
import { toast } from 'sonner'

function mapBranch(b: ApiBranch): Branch {
  return {
    id: b.id,
    name: b.name,
    code: b.code,
    city: b.city,
    isHeadOffice: b.isHeadOffice,
  }
}

export function usePayrollApiSync() {
  const api = isApiMode()
  const [loading, setLoading] = useState(api)

  const reload = useCallback(async () => {
    if (!api) return
    setLoading(true)
    try {
      const [emps, runs, reimbs, branchRows] = await Promise.all([
        listEmployees(true),
        listPayrollRuns(),
        listReimbursements(),
        listBranches(),
      ])
      const lines = runs.flatMap((r) => r.lines.map(mapApiLine))
      useDataStore.setState({
        payrollEmployees: emps.map(mapApiEmployee),
        payrollRuns: runs.map(mapApiRun),
        payrollLines: lines,
        reimbursements: reimbs.map(mapApiReimbursement),
        branches: branchRows.map(mapBranch),
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load payroll')
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    void reload()
  }, [reload])

  return { api, reload, loading }
}
