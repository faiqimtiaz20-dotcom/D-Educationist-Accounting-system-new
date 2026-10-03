import { useCallback, useEffect, useState } from 'react'
import { isApiMode } from '@/lib/api-client'
import {
  getGlChart,
  listJournalEntries,
  mapApiCoa,
  mapApiJournal,
} from '@/lib/journals-api'
import { listGlAccounts } from '@/lib/masters-api'
import { listBranches, type ApiBranch } from '@/lib/settings-api'
import { useDataStore } from '@/store/data-store'
import type { AccountNode, Branch } from '@/types'
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

export type PostableAccount = { code: string; name: string }

/** Hydrate journals into Zustand + return GL chart / postable accounts. */
export function useAccountingApiSync() {
  const api = isApiMode()
  const [loading, setLoading] = useState(api)
  const [coa, setCoa] = useState<AccountNode[] | null>(null)
  const [postableAccounts, setPostableAccounts] = useState<PostableAccount[]>([])

  const reload = useCallback(async () => {
    if (!api) return
    setLoading(true)
    try {
      const [journals, chart, glAccounts, branchRows] = await Promise.all([
        listJournalEntries({ take: 200 }),
        getGlChart(),
        listGlAccounts(),
        listBranches(),
      ])
      useDataStore.setState({
        journalEntries: journals.map(mapApiJournal),
        branches: branchRows.map(mapBranch),
      })
      setCoa(mapApiCoa(chart))
      setPostableAccounts(
        glAccounts
          .filter((a) => a.isActive && a.isPostable)
          .map((a) => ({ code: a.code, name: a.name }))
          .sort((a, b) => a.code.localeCompare(b.code)),
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load accounting')
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    void reload()
  }, [reload])

  return { api, reload, loading, coa, postableAccounts }
}
