import { StatusPill } from '@/components/shared/StatusPill'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, grossPKR, netPKR } from '@/lib/calculations'
import {
  getInvoiceOutstanding,
  getInvoiceReceivables,
  getInvoiceTotal,
} from '@/lib/invoice'
import { useDataStore } from '@/store/data-store'
import type { Invoice } from '@/types'
import { History } from 'lucide-react'
import { useMemo } from 'react'

interface InvoicePaymentPanelProps {
  invoice: Invoice
  studentName?: string
}

export function InvoicePaymentPanel({ invoice, studentName }: InvoicePaymentPanelProps) {
  const receivables = useDataStore((s) => s.receivables)

  const total = getInvoiceTotal(invoice)
  const outstanding = getInvoiceOutstanding(invoice, receivables)
  const history = useMemo(() => getInvoiceReceivables(receivables, invoice.id), [receivables, invoice.id])
  const paid = total - outstanding

  return (
    <div className="space-y-6">
      <Card className="bg-muted/30">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Invoice</p>
            <p className="font-semibold">{invoice.invoiceNo}</p>
            {studentName && <p className="text-sm text-muted-foreground">{studentName}</p>}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Invoice Amount</p>
            <p className="font-semibold">{formatCurrency(total, invoice.currency)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Amount Paid</p>
            <p className="font-semibold text-emerald-600">{formatCurrency(paid, invoice.currency)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Outstanding</p>
            <p className="font-semibold text-amber-600">{formatCurrency(outstanding, invoice.currency)}</p>
          </div>
        </CardContent>
      </Card>

      {outstanding <= 0 && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
          This invoice is fully paid.
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center gap-2 font-medium">
          <History className="h-4 w-4" /> Payment History ({history.length} transactions)
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt No.</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Net PKR</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.receiptNo}</TableCell>
                    <TableCell>{r.receiptDate}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(r.amountReceived, r.currency)}</TableCell>
                    <TableCell>{formatCurrency(netPKR(grossPKR(r.amountReceived, r.exchangeRate)))}</TableCell>
                    <TableCell>
                      <StatusPill status={r.isPartial ? 'Partial' : 'Fully Received'} />
                    </TableCell>
                    <TableCell><StatusPill status={r.reconciliationStatus} /></TableCell>
                    <TableCell className="text-muted-foreground text-sm">{r.notes ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
