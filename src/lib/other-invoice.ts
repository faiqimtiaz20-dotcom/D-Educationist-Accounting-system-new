import type { OtherInvoice, OtherInvoiceLine } from '@/types'

export function getOtherInvoiceLineTotal(line: OtherInvoiceLine): number {
  return (line.quantity || 0) * (line.unitPrice || 0)
}

export function getOtherInvoiceTotal(invoice: Pick<OtherInvoice, 'lines'>): number {
  return invoice.lines.reduce((sum, line) => sum + getOtherInvoiceLineTotal(line), 0)
}
