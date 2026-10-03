import { useCallback, useEffect, useState } from 'react'
import { isApiMode } from '@/lib/api-client'
import {
  listBankBalances,
  listBankTransactions,
  listChequesApi,
  listContraEntries,
  listExpenses,
  listPettyCash,
  mapApiBankAccount,
  mapApiBankTxn,
  mapApiCheque,
  mapApiContra,
  mapApiExpense,
  mapApiPettyCash,
} from '@/lib/cash-api'
import {
  listExpenseCategories,
  listPettyCashCategories,
  listVendors,
  type ApiCategory,
} from '@/lib/masters-api'
import { listBranches, type ApiBranch } from '@/lib/settings-api'
import { useDataStore } from '@/store/data-store'
import type { BankAccount, BankTransaction, Branch, Cheque, ContraEntry } from '@/types'
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

/** Hydrate Zustand expenses/petty cash + return bank/cheque/contra lists. */
export function useCashApiSync() {
  const api = isApiMode()
  const [loading, setLoading] = useState(api)
  const [banks, setBanks] = useState<BankAccount[]>([])
  const [transactions, setTransactions] = useState<BankTransaction[]>([])
  const [cheques, setCheques] = useState<Cheque[]>([])
  const [contra, setContra] = useState<ContraEntry[]>([])
  const [pettyCategories, setPettyCategories] = useState<ApiCategory[]>([])
  const [expenseCategories, setExpenseCategories] = useState<ApiCategory[]>([])
  const [vendors, setVendors] = useState<Array<{ id: string; vendorNo?: string; name: string }>>([])

  const reload = useCallback(async () => {
    if (!api) return
    setLoading(true)
    try {
      const [
        pc,
        ex,
        bals,
        txns,
        chqs,
        ce,
        pettyCats,
        expCats,
        vend,
        branchRows,
      ] = await Promise.all([
        listPettyCash(),
        listExpenses(),
        listBankBalances(),
        listBankTransactions(),
        listChequesApi(),
        listContraEntries(),
        listPettyCashCategories(),
        listExpenseCategories(),
        listVendors(),
        listBranches(),
      ])
      useDataStore.setState({
        pettyCash: pc.map(mapApiPettyCash),
        expenses: ex.map(mapApiExpense),
        branches: branchRows.map(mapBranch),
      })
      setBanks(bals.map(mapApiBankAccount))
      setTransactions(txns.map(mapApiBankTxn))
      setCheques(chqs.map(mapApiCheque))
      setContra(ce.map(mapApiContra))
      setPettyCategories(pettyCats.filter((c) => c.isActive))
      setExpenseCategories(expCats.filter((c) => c.isActive))
      setVendors(
        vend
          .filter((v) => v.isActive !== false)
          .map((v) => ({ id: v.id, vendorNo: v.vendorNo, name: v.name })),
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load cash data')
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    void reload()
  }, [reload])

  return {
    api,
    reload,
    loading,
    banks,
    transactions,
    cheques,
    contra,
    pettyCategories,
    expenseCategories,
    vendors,
  }
}
