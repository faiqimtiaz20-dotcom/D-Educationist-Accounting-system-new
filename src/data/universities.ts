import type { University } from '@/types'

export const universities: University[] = [
  { id: 'uni1', universityNo: 'UNI-001', name: 'University of Manchester', country: 'UK', defaultCommissionRate: 15, currency: 'GBP' },
  { id: 'uni2', universityNo: 'UNI-002', name: 'Arizona State University', country: 'USA', defaultCommissionRate: 12.5, currency: 'USD' },
  { id: 'uni3', universityNo: 'UNI-003', name: 'University of Toronto', country: 'Canada', defaultCommissionRate: 17.5, currency: 'CAD' },
  { id: 'uni4', universityNo: 'UNI-004', name: 'Monash University', country: 'Australia', defaultCommissionRate: 17.5, currency: 'AUD' },
  { id: 'uni5', universityNo: 'UNI-005', name: 'Coventry University', country: 'UK', defaultCommissionRate: 15, currency: 'GBP' },
  { id: 'uni6', universityNo: 'UNI-006', name: 'Northeastern University', country: 'USA', defaultCommissionRate: 10, currency: 'USD' },
  { id: 'uni7', universityNo: 'UNI-007', name: 'University of Birmingham', country: 'UK', defaultCommissionRate: 15, currency: 'GBP' },
  { id: 'uni8', universityNo: 'UNI-008', name: 'McGill University', country: 'Canada', defaultCommissionRate: 12.5, currency: 'CAD' },
  { id: 'uni9', universityNo: 'UNI-009', name: 'University of Melbourne', country: 'Australia', defaultCommissionRate: 17.5, currency: 'AUD' },
  { id: 'uni10', universityNo: 'UNI-010', name: 'University of Leeds', country: 'UK', defaultCommissionRate: 15, currency: 'GBP' },
]

export const getUniversity = (id: string) => universities.find((u) => u.id === id)
