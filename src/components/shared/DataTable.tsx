import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, RotateCcw, Search, SlidersHorizontal } from 'lucide-react'
import { isValidElement, useMemo, useState, type ReactNode } from 'react'

export interface Column<T> {
  key: string
  header: string
  cell: (row: T) => React.ReactNode
  className?: string
  /** Set false to disable sorting for this column (default: sortable, except "actions"). */
  sortable?: boolean
  /** Provide the raw value to sort by. Falls back to the rendered cell text when omitted. */
  sortAccessor?: (row: T) => string | number | null | undefined
}

type SortDir = 'asc' | 'desc'

function nodeToText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(nodeToText).join('')
  if (isValidElement(node)) return nodeToText((node.props as { children?: ReactNode }).children)
  return ''
}

function compareValues(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
}

export type FilterConfig<T> =
  | {
      key: string
      label: string
      type: 'select'
      options: { label: string; value: string }[]
      accessor: (row: T) => string | number | null | undefined
    }
  | {
      key: string
      label: string
      type: 'dateRange'
      accessor: (row: T) => string | null | undefined
    }
  | {
      key: string
      label: string
      type: 'numberRange'
      accessor: (row: T) => number | null | undefined
    }

type RangeValue = { from?: string; to?: string }
type FilterState = Record<string, string | RangeValue>

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  searchPlaceholder?: string
  searchFilter?: (row: T, query: string) => boolean
  pageSize?: number
  statusPills?: { label: string; count: number; value: string }[]
  activeStatus?: string
  onStatusChange?: (status: string) => void
  filters?: FilterConfig<T>[]
  /**
   * When no column sort is active, show the most recently added rows first.
   * Store arrays append new records at the end, so this reverses the incoming
   * order by default. Set false for data that is already stored newest-first
   * (e.g. audit logs).
   */
  newestFirst?: boolean
}

function isFilterActive(value: string | RangeValue | undefined): boolean {
  if (value === undefined) return false
  if (typeof value === 'string') return value !== '' && value !== 'all'
  return Boolean(value.from) || Boolean(value.to)
}

export function DataTable<T>({
  data,
  columns,
  searchPlaceholder = 'Search...',
  searchFilter,
  pageSize = 10,
  statusPills,
  activeStatus = 'all',
  onStatusChange,
  filters,
  newestFirst = true,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const [filterState, setFilterState] = useState<FilterState>({})
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const isSortable = (col: Column<T>) => col.sortable !== false && col.key !== 'actions'

  const toggleSort = (col: Column<T>) => {
    if (!isSortable(col)) return
    if (sortKey === col.key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(col.key)
      setSortDir('asc')
    }
    setPage(0)
  }

  const activeFilterCount = useMemo(
    () => (filters ?? []).filter((f) => isFilterActive(filterState[f.key])).length,
    [filters, filterState]
  )

  const filtered = useMemo(() => {
    let rows = data

    if (filters?.length) {
      rows = rows.filter((row) =>
        filters.every((filter) => {
          const value = filterState[filter.key]
          if (!isFilterActive(value)) return true

          if (filter.type === 'select') {
            return String(filter.accessor(row) ?? '') === value
          }

          const range = value as RangeValue
          if (filter.type === 'dateRange') {
            const raw = filter.accessor(row)
            if (!raw) return false
            const date = String(raw).slice(0, 10)
            if (range.from && date < range.from) return false
            if (range.to && date > range.to) return false
            return true
          }

          // numberRange
          const num = filter.accessor(row)
          if (num === null || num === undefined) return false
          if (range.from !== undefined && range.from !== '' && num < Number(range.from)) return false
          if (range.to !== undefined && range.to !== '' && num > Number(range.to)) return false
          return true
        })
      )
    }

    if (search && searchFilter) {
      rows = rows.filter((row) => searchFilter(row, search.toLowerCase()))
    }

    return rows
  }, [data, filters, filterState, search, searchFilter])

  const sorted = useMemo(() => {
    if (!sortKey) return newestFirst ? [...filtered].reverse() : filtered
    const col = columns.find((c) => c.key === sortKey)
    if (!col || !isSortable(col)) return filtered
    const getValue = (row: T): string | number => {
      const raw = col.sortAccessor ? col.sortAccessor(row) : nodeToText(col.cell(row))
      if (raw === null || raw === undefined) return ''
      return typeof raw === 'number' ? raw : String(raw)
    }
    const factor = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => factor * compareValues(getValue(a), getValue(b)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, columns, sortKey, sortDir, newestFirst])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const currentPage = Math.min(page, totalPages - 1)
  const paged = sorted.slice(currentPage * pageSize, (currentPage + 1) * pageSize)

  const setFilterValue = (key: string, value: string | RangeValue) => {
    setFilterState((prev) => ({ ...prev, [key]: value }))
    setPage(0)
  }

  const resetFilters = () => {
    setFilterState({})
    setPage(0)
  }

  return (
    <div className="space-y-4">
      {statusPills && (
        <div className="flex flex-wrap gap-2">
          {statusPills.map((pill) => (
            <Button
              key={pill.value}
              variant={activeStatus === pill.value ? 'default' : 'outline'}
              size="sm"
              className={cn('rounded-full', activeStatus === pill.value && 'bg-primary')}
              onClick={() => onStatusChange?.(pill.value)}
            >
              {pill.label} ({pill.count})
            </Button>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            className="pl-9"
          />
        </div>
        {filters?.length ? (
          <Button
            variant={showFilters ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowFilters((v) => !v)}
          >
            <SlidersHorizontal className="mr-1 h-4 w-4" /> Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 min-w-5 justify-center px-1">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        ) : null}
      </div>

      {filters?.length && showFilters ? (
        <div className="rounded-xl border bg-card p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filters.map((filter) => {
              const value = filterState[filter.key]
              if (filter.type === 'select') {
                return (
                  <div key={filter.key} className="space-y-2">
                    <Label>{filter.label}</Label>
                    <Select
                      value={(value as string) ?? 'all'}
                      onValueChange={(v) => setFilterValue(filter.key, v)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {filter.options.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )
              }

              const range = (value as RangeValue) ?? {}
              const isDate = filter.type === 'dateRange'
              return (
                <div key={filter.key} className="space-y-2">
                  <Label>{filter.label}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type={isDate ? 'date' : 'number'}
                      placeholder={isDate ? undefined : 'Min'}
                      value={range.from ?? ''}
                      onChange={(e) => setFilterValue(filter.key, { ...range, from: e.target.value })}
                    />
                    <span className="text-muted-foreground">–</span>
                    <Input
                      type={isDate ? 'date' : 'number'}
                      placeholder={isDate ? undefined : 'Max'}
                      value={range.to ?? ''}
                      onChange={(e) => setFilterValue(filter.key, { ...range, to: e.target.value })}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              disabled={activeFilterCount === 0}
              onClick={resetFilters}
            >
              <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset filters
            </Button>
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => {
                const sortable = isSortable(col)
                const active = sortKey === col.key
                return (
                  <TableHead key={col.key} className={col.className}>
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col)}
                        className={cn(
                          'inline-flex items-center gap-1 select-none hover:text-foreground',
                          active && 'text-foreground'
                        )}
                      >
                        {col.header}
                        {active ? (
                          sortDir === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No results found.
                </TableCell>
              </TableRow>
            ) : (
              paged.map((row, i) => (
                <TableRow key={i}>
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.className}>{col.cell(row)}</TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span className="text-center sm:text-left">Page {currentPage + 1} of {totalPages} ({filtered.length} records)</span>
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only sm:inline">Previous</span>
          </Button>
          <Button variant="outline" size="sm" disabled={currentPage >= totalPages - 1} onClick={() => setPage(currentPage + 1)}>
            <span className="sr-only sm:not-sr-only sm:inline">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
