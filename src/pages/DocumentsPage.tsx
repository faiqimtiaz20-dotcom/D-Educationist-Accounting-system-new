import { PageDataSkeleton } from '@/components/shared/PageDataSkeleton'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { documents as mockDocuments } from '@/data'
import { isApiMode } from '@/lib/api-client'
import { loadTokens } from '@/lib/api-client'
import {
  deleteDocument,
  documentDownloadUrl,
  listDocuments,
  mapApiDocument,
  uploadDocument,
} from '@/lib/operations-api'
import { cn } from '@/lib/utils'
import type { Document } from '@/types'
import { Download, FileText, Grid3X3, List, Search, Trash2, Upload } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

const docTypes = ['all', 'Invoice', 'Receipt', 'Bill', 'Contract', 'Agreement'] as const

const typeColors: Record<Document['type'], string> = {
  Invoice: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Receipt: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  Bill: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  Contract: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  Agreement: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
}

function DocumentCard({
  doc,
  api,
  onDelete,
}: {
  doc: Document
  api: boolean
  onDelete?: () => void
}) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <FileText className="h-8 w-8 shrink-0 text-muted-foreground" />
          <Badge className={cn('text-xs', typeColors[doc.type])}>{doc.type}</Badge>
        </div>
        <div>
          <p className="truncate text-sm font-medium" title={doc.name}>{doc.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{doc.linkedType} · {doc.linkedId}</p>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{doc.uploadDate}</span>
          <span>{doc.size}</span>
        </div>
        {api && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 flex-1"
              onClick={() => {
                const tokens = loadTokens()
                void fetch(documentDownloadUrl(doc.id), {
                  headers: tokens?.accessToken
                    ? { Authorization: `Bearer ${tokens.accessToken}` }
                    : undefined,
                })
                  .then(async (res) => {
                    if (!res.ok) throw new Error('Download failed')
                    const blob = await res.blob()
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = doc.name
                    a.click()
                    URL.revokeObjectURL(url)
                  })
                  .catch((err) =>
                    toast.error(err instanceof Error ? err.message : 'Download failed'),
                  )
              }}
            >
              <Download className="mr-1 h-3.5 w-3.5" />
              Download
            </Button>
            {onDelete && (
              <Button size="sm" variant="outline" className="h-8 text-destructive" onClick={onDelete}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DocumentRow({
  doc,
  api,
  onDelete,
}: {
  doc: Document
  api: boolean
  onDelete?: () => void
}) {
  return (
    <div className="flex items-center gap-4 rounded-lg border bg-card px-4 py-3 transition-colors hover:bg-muted/40">
      <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{doc.name}</p>
        <p className="text-xs text-muted-foreground">{doc.linkedType} · {doc.linkedId}</p>
      </div>
      <Badge className={cn('shrink-0 text-xs', typeColors[doc.type])}>{doc.type}</Badge>
      <span className="hidden shrink-0 text-sm text-muted-foreground sm:block">{doc.uploadDate}</span>
      <span className="shrink-0 text-sm text-muted-foreground">{doc.size}</span>
      {api && (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-8"
            onClick={() => {
              const tokens = loadTokens()
              void fetch(documentDownloadUrl(doc.id), {
                headers: tokens?.accessToken
                  ? { Authorization: `Bearer ${tokens.accessToken}` }
                  : undefined,
              })
                .then(async (res) => {
                  if (!res.ok) throw new Error('Download failed')
                  const blob = await res.blob()
                  const url = URL.createObjectURL(blob)
                  const a = window.document.createElement('a')
                  a.href = url
                  a.download = doc.name
                  a.click()
                  URL.revokeObjectURL(url)
                })
                .catch((err) =>
                  toast.error(err instanceof Error ? err.message : 'Download failed'),
                )
            }}
          >
            <Download className="h-4 w-4" />
          </Button>
          {onDelete && (
            <Button size="sm" variant="ghost" className="h-8 text-destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export default function DocumentsPage() {
  const api = isApiMode()
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [docs, setDocs] = useState<Document[]>(() => (isApiMode() ? [] : mockDocuments))
  const [loading, setLoading] = useState(api)
  const fileRef = useRef<HTMLInputElement>(null)

  const reload = useCallback(async () => {
    if (!api) return
    setLoading(true)
    try {
      const rows = await listDocuments()
      setDocs(rows.map(mapApiDocument))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    void reload()
  }, [reload])

  const filtered = useMemo(() => {
    return docs.filter((d) => {
      const matchesType = typeFilter === 'all' || d.type === typeFilter
      const q = search.toLowerCase()
      const matchesSearch = !q ||
        d.name.toLowerCase().includes(q) ||
        d.linkedType.toLowerCase().includes(q) ||
        d.linkedId.toLowerCase().includes(q)
      return matchesType && matchesSearch
    })
  }, [docs, typeFilter, search])

  const handleUpload = async (file: File | undefined) => {
    if (!file || !api) return
    try {
      // Demo link: attach to a synthetic uuid if no selection UI yet
      const linkedId = crypto.randomUUID()
      await uploadDocument({
        file,
        name: file.name,
        docType: 'Bill',
        linkedType: 'Manual',
        linkedId,
      })
      await reload()
      toast.success('Document uploaded (local disk storage)')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div>
      <PageHeader
        title="Documents"
        subtitle={
          api
            ? 'Local disk storage (UPLOAD_DIR)'
            : 'Invoices, receipts, bills, contracts, and agreements'
        }
      />

      {api && loading ? (
        <PageDataSkeleton metrics={0} />
      ) : (
      <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {docTypes.map((type) => (
            <Button
              key={type}
              variant={typeFilter === type ? 'default' : 'outline'}
              size="sm"
              className="rounded-full"
              onClick={() => setTypeFilter(type)}
            >
              {type === 'all' ? 'All' : type}
              {type !== 'all' && (
                <span className="ml-1 text-xs opacity-70">
                  ({docs.filter((d) => d.type === type).length})
                </span>
              )}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {api && (
            <>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={(e) => void handleUpload(e.target.files?.[0])}
              />
              <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload className="mr-1 h-4 w-4" />
                Upload
              </Button>
            </>
          )}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search documents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex rounded-md border">
            <Button
              size="icon"
              variant={view === 'grid' ? 'secondary' : 'ghost'}
              className="h-9 w-9 rounded-none rounded-l-md"
              onClick={() => setView('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant={view === 'list' ? 'secondary' : 'ghost'}
              className="h-9 w-9 rounded-none rounded-r-md"
              onClick={() => setView('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {view === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              api={api}
              onDelete={
                api
                  ? () => {
                      void deleteDocument(doc.id)
                        .then(() => reload())
                        .then(() => toast.success('Document deleted'))
                        .catch((err) =>
                          toast.error(err instanceof Error ? err.message : 'Delete failed'),
                        )
                    }
                  : undefined
              }
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((doc) => (
            <DocumentRow
              key={doc.id}
              doc={doc}
              api={api}
              onDelete={
                api
                  ? () => {
                      void deleteDocument(doc.id)
                        .then(() => reload())
                        .then(() => toast.success('Document deleted'))
                        .catch((err) =>
                          toast.error(err instanceof Error ? err.message : 'Delete failed'),
                        )
                    }
                  : undefined
              }
            />
          ))}
        </div>
      )}
      </>
      )}
    </div>
  )
}
