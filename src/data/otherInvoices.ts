import type { OtherInvoice } from '@/types'

export const otherInvoices: OtherInvoice[] = [
  {
    id: 'oinv1',
    invoiceNo: 'OINV-KHI-2026-001',
    branchId: 'khi',
    invoiceDate: '2026-05-12',
    billTo: 'ABC Education Fair',
    category: 'Marketing',
    currency: 'PKR',
    status: 'Paid',
    notes: 'Booth sponsorship for May education fair',
    lines: [
      { id: 'oil1', description: 'Exhibition booth sponsorship', quantity: 1, unitPrice: 150000 },
      { id: 'oil2', description: 'Printed brochures (500 pcs)', quantity: 500, unitPrice: 45 },
    ],
  },
  {
    id: 'oinv2',
    invoiceNo: 'OINV-LHR-2026-002',
    branchId: 'lhr',
    invoiceDate: '2026-06-01',
    billTo: 'City Career Consultants',
    category: 'Services',
    currency: 'PKR',
    status: 'Sent',
    lines: [
      { id: 'oil3', description: 'Student counselling referral fee', quantity: 3, unitPrice: 25000 },
    ],
  },
  {
    id: 'oinv3',
    invoiceNo: 'OINV-ISB-2026-003',
    branchId: 'isb',
    invoiceDate: '2026-06-18',
    billTo: 'Digital Ads Co.',
    category: 'Marketing',
    currency: 'PKR',
    status: 'Draft',
    lines: [
      { id: 'oil4', description: 'Social media campaign management', quantity: 1, unitPrice: 80000 },
      { id: 'oil5', description: 'Sponsored post creatives', quantity: 10, unitPrice: 3500 },
    ],
  },
]
