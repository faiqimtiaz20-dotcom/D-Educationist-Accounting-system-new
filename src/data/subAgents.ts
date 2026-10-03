import type { SubAgent } from '@/types'

export const subAgents: SubAgent[] = [
  { id: 'sa1', subAgentNo: 'SA-001', name: 'Global Edu Partners', ntn: '1234567-8', email: 'contact@globaledu.pk', contact: '+92 300 1112233', accountTitle: 'Global Edu Partners', iban: 'PK36SCBL0000001123456702', accountNo: '0123456702' },
  { id: 'sa2', subAgentNo: 'SA-002', name: 'Study Link Associates', ntn: '2345678-9', email: 'info@studylink.pk', contact: '+92 321 2223344', accountTitle: 'Study Link Associates', iban: 'PK36HABB0000002234567803', accountNo: '0234567803' },
  { id: 'sa3', subAgentNo: 'SA-003', name: 'Overseas Connect', ntn: '3456789-0', email: 'hello@overseasconnect.pk', contact: '+92 333 3334455', accountTitle: 'Overseas Connect Pvt Ltd', iban: 'PK36MEZN0000003345678904', accountNo: '0345678904' },
  { id: 'sa4', subAgentNo: 'SA-004', name: 'Future Path Consultants', ntn: '4567890-1', email: 'admin@futurepath.pk', contact: '+92 345 4445566', accountTitle: 'Future Path Consultants', iban: 'PK36UNIL0000004456789015', accountNo: '0456789015' },
  { id: 'sa5', subAgentNo: 'SA-005', name: 'EduBridge Pakistan', ntn: '5678901-2', email: 'support@edubridge.pk', contact: '+92 300 5556677', accountTitle: 'EduBridge Pakistan', iban: 'PK36SCBL0000005567890126', accountNo: '0567890126' },
  { id: 'sa6', subAgentNo: 'SA-006', name: 'Horizon Study Abroad', ntn: '6789012-3', email: 'team@horizonstudy.pk', contact: '+92 321 6667788', accountTitle: 'Horizon Study Abroad', iban: 'PK36HABB0000006678901237', accountNo: '0678901237' },
]

export const getSubAgent = (id: string) => subAgents.find((a) => a.id === id)
