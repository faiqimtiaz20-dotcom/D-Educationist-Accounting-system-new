import type { SubAgentCommission, SubAgentPayment } from '@/types'

export const subAgentCommissions: SubAgentCommission[] = [
  { id: 'sc1', commissionNo: 'COM-KHI-2026-001', subAgentId: 'sa1', studentId: 's1', invoiceId: 'inv1', branchId: 'khi', grossFee: 3000, rateGiven: 80, exchangeRate: 355, followOnBonus: 5000, currency: 'GBP', status: 'Paid' },
  { id: 'sc2', commissionNo: 'COM-KHI-2026-002', subAgentId: 'sa1', studentId: 's5', invoiceId: 'inv4', branchId: 'khi', grossFee: 2550, rateGiven: 70, exchangeRate: 358, followOnBonus: 0, currency: 'GBP', status: 'Paid' },
  { id: 'sc3', commissionNo: 'COM-KHI-2026-003', subAgentId: 'sa2', studentId: 's2', invoiceId: 'inv2', branchId: 'lhr', grossFee: 5000, rateGiven: 90, exchangeRate: 278, followOnBonus: 3000, currency: 'USD', status: 'Pending' },
  { id: 'sc4', commissionNo: 'COM-KHI-2026-004', subAgentId: 'sa3', studentId: 's3', invoiceId: 'inv3', branchId: 'isb', grossFee: 6125, rateGiven: 80, exchangeRate: 205, followOnBonus: 0, currency: 'CAD', status: 'Partial' },
  { id: 'sc5', commissionNo: 'COM-KHI-2026-005', subAgentId: 'sa3', studentId: 's11', invoiceId: 'inv7', branchId: 'khi', grossFee: 5250, rateGiven: 75, exchangeRate: 278, followOnBonus: 2000, currency: 'USD', status: 'Pending' },
  { id: 'sc6', commissionNo: 'COM-KHI-2026-006', subAgentId: 'sa4', studentId: 's14', invoiceId: 'inv8', branchId: 'lhr', grossFee: 6300, rateGiven: 100, exchangeRate: 185, followOnBonus: 0, currency: 'AUD', status: 'Paid' },
  { id: 'sc7', commissionNo: 'COM-KHI-2026-007', subAgentId: 'sa2', studentId: 's15', invoiceId: 'inv9', branchId: 'isb', grossFee: 4300, rateGiven: 85, exchangeRate: 278, followOnBonus: 0, currency: 'USD', status: 'Pending' },
  { id: 'sc8', commissionNo: 'COM-KHI-2026-008', subAgentId: 'sa5', studentId: 's17', invoiceId: 'inv10', branchId: 'mul', grossFee: 3900, rateGiven: 70, exchangeRate: 205, followOnBonus: 1500, currency: 'CAD', status: 'Paid' },
  { id: 'sc9', commissionNo: 'COM-KHI-2026-009', subAgentId: 'sa1', studentId: 's19', invoiceId: 'inv11', branchId: 'lhr', grossFee: 5250, rateGiven: 80, exchangeRate: 280, followOnBonus: 0, currency: 'USD', status: 'Paid' },
  { id: 'sc10', commissionNo: 'COM-KHI-2026-010', subAgentId: 'sa3', studentId: 's20', invoiceId: 'inv12', branchId: 'khi', grossFee: 3075, rateGiven: 90, exchangeRate: 355, followOnBonus: 0, currency: 'GBP', status: 'Pending' },
  { id: 'sc11', commissionNo: 'COM-KHI-2026-011', subAgentId: 'sa2', studentId: 's21', invoiceId: 'inv13', branchId: 'isb', grossFee: 6125, rateGiven: 75, exchangeRate: 205, followOnBonus: 4000, currency: 'CAD', status: 'Pending' },
  { id: 'sc12', commissionNo: 'COM-KHI-2026-012', subAgentId: 'sa6', studentId: 's23', invoiceId: 'inv14', branchId: 'fsd', grossFee: 4875, rateGiven: 80, exchangeRate: 279, followOnBonus: 0, currency: 'USD', status: 'Partial' },
  { id: 'sc13', commissionNo: 'COM-KHI-2026-013', subAgentId: 'sa4', studentId: 's25', invoiceId: 'inv16', branchId: 'khi', grossFee: 6400, rateGiven: 70, exchangeRate: 205, followOnBonus: 2500, currency: 'CAD', status: 'Pending' },
  { id: 'sc14', commissionNo: 'COM-KHI-2026-014', subAgentId: 'sa5', studentId: 's9', invoiceId: 'inv18', branchId: 'isb', grossFee: 7000, rateGiven: 85, exchangeRate: 186, followOnBonus: 6000, currency: 'AUD', status: 'Partial' },
  { id: 'sc15', commissionNo: 'COM-KHI-2026-015', subAgentId: 'sa4', studentId: 's8', invoiceId: 'inv6', branchId: 'khi', grossFee: 3875, rateGiven: 90, exchangeRate: 205, followOnBonus: 0, currency: 'CAD', status: 'Pending' },
]

export const subAgentPayments: SubAgentPayment[] = [
  { id: 'sp1', paymentNo: 'PV-2026-001', commissionId: 'sc1', subAgentId: 'sa1', chequeNo: 'CHQ-4521', bankAccountId: 'ba5', amountPKR: 854200, paymentDate: '2026-05-01', currency: 'PKR' },
  { id: 'sp2', paymentNo: 'PV-2026-002', commissionId: 'sc2', subAgentId: 'sa1', chequeNo: 'CHQ-4522', bankAccountId: 'ba5', amountPKR: 639030, paymentDate: '2026-05-15', currency: 'PKR' },
  { id: 'sp3', paymentNo: 'PV-2026-003', commissionId: 'sc6', subAgentId: 'sa4', chequeNo: 'CHQ-4523', bankAccountId: 'ba5', amountPKR: 1165500, paymentDate: '2026-06-10', currency: 'PKR' },
  { id: 'sp4', paymentNo: 'PV-2026-004', commissionId: 'sc8', subAgentId: 'sa5', chequeNo: 'CHQ-4524', bankAccountId: 'ba5', amountPKR: 559650, paymentDate: '2026-06-20', currency: 'PKR' },
  { id: 'sp5', paymentNo: 'PV-2026-005', commissionId: 'sc9', subAgentId: 'sa1', chequeNo: 'CHQ-4525', bankAccountId: 'ba5', amountPKR: 1176000, paymentDate: '2026-06-28', currency: 'PKR' },
]
