import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCurrentUser, useEffectiveBranchId } from '@/hooks/useAuth'
import { canViewAllBranches } from '@/lib/permissions'
import { useAppStore } from '@/store/app-store'
import { useDataStore } from '@/store/data-store'
import { RotateCcw } from 'lucide-react'
import { useState } from 'react'

interface FilterPanelProps {
  showCountry?: boolean
  showIntake?: boolean
  showUser?: boolean
  /** Controlled date range — when set, filters use store-driven report state. */
  dateFrom?: string
  dateTo?: string
  onDateFromChange?: (value: string) => void
  onDateToChange?: (value: string) => void
  onReset?: () => void
}

export function FilterPanel({
  showCountry = true,
  showIntake = true,
  showUser = true,
  dateFrom: controlledFrom,
  dateTo: controlledTo,
  onDateFromChange,
  onDateToChange,
  onReset,
}: FilterPanelProps) {
  const user = useCurrentUser()
  const branches = useDataStore((s) => s.branches)
  const users = useDataStore((s) => s.users)
  const effectiveBranchId = useEffectiveBranchId()
  const { setSelectedBranchId } = useAppStore()
  const [localFrom, setLocalFrom] = useState('2026-01-01')
  const [localTo, setLocalTo] = useState('2026-12-31')

  const isControlled = controlledFrom !== undefined || controlledTo !== undefined
  const dateFrom = isControlled ? (controlledFrom ?? '') : localFrom
  const dateTo = isControlled ? (controlledTo ?? '') : localTo

  const setDateFrom = (value: string) => {
    if (onDateFromChange) onDateFromChange(value)
    else setLocalFrom(value)
  }
  const setDateTo = (value: string) => {
    if (onDateToChange) onDateToChange(value)
    else setLocalTo(value)
  }

  const handleReset = () => {
    if (onReset) {
      onReset()
      return
    }
    setLocalFrom('2026-01-01')
    setLocalTo('2026-12-31')
    if (user && canViewAllBranches(user.role)) setSelectedBranchId('all')
  }

  const isSuperAdmin = user ? canViewAllBranches(user.role) : false
  const branchUsers = isSuperAdmin
    ? users
    : users.filter((u) => u.branchId === user?.branchId)

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base font-semibold">Filters</CardTitle>
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={handleReset}>
          <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="space-y-2">
            <Label>Branch</Label>
            {isSuperAdmin ? (
              <Select value={effectiveBranchId} onValueChange={setSelectedBranchId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={branches.find((b) => b.id === user?.branchId)?.name ?? ''}
                readOnly
                className="bg-muted/50"
              />
            )}
          </div>
          {showUser && (
            <div className="space-y-2">
              <Label>User / Staff</Label>
              <Select defaultValue="all">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {branchUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {showCountry && (
            <div className="space-y-2">
              <Label>Country</Label>
              <Select defaultValue="all">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="UK">UK</SelectItem>
                  <SelectItem value="USA">USA</SelectItem>
                  <SelectItem value="Canada">Canada</SelectItem>
                  <SelectItem value="Australia">Australia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {showIntake && (
            <div className="space-y-2">
              <Label>Intake</Label>
              <Select defaultValue="all">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="sep-2026">Sep-2026</SelectItem>
                  <SelectItem value="jan-2027">Jan-2027</SelectItem>
                  <SelectItem value="feb-2027">Feb-2027</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Date From</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Date To</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
