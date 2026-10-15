import { lazy } from 'react'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { GuestGuard } from '@/components/auth/GuestGuard'
import { AppShell } from '@/components/layout/AppShell'
import { RouteErrorBoundary } from '@/components/shared/RouteErrorBoundary'
import LoginPage from '@/pages/LoginPage'
import type { RouteObject } from 'react-router-dom'

const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const MasterSheetPage = lazy(() => import('@/pages/MasterSheetPage'))
const InvoicesPage = lazy(() => import('@/pages/InvoicesPage'))
const OtherInvoicesPage = lazy(() => import('@/pages/OtherInvoicesPage'))
const ReceivablesPage = lazy(() => import('@/pages/ReceivablesPage'))
const AllocationPage = lazy(() => import('@/pages/AllocationPage'))
const SubAgentsPage = lazy(() => import('@/pages/SubAgentsPage'))
const SubAgentCommissionsPage = lazy(() => import('@/pages/SubAgentCommissionsPage'))
const SubAgentPaymentsPage = lazy(() => import('@/pages/SubAgentPaymentsPage'))
const PettyCashPage = lazy(() => import('@/pages/PettyCashPage'))
const ExpensesPage = lazy(() => import('@/pages/ExpensesPage'))
const BankCashPage = lazy(() => import('@/pages/BankCashPage'))
const GeneralLedgerPage = lazy(() => import('@/pages/GeneralLedgerPage'))
const JournalEntriesPage = lazy(() => import('@/pages/JournalEntriesPage'))
const ContraEntriesPage = lazy(() => import('@/pages/ContraEntriesPage'))
const TaxCompliancePage = lazy(() => import('@/pages/TaxCompliancePage'))
const StudentLedgerPage = lazy(() => import('@/pages/StudentLedgerPage'))
const VendorLedgerPage = lazy(() => import('@/pages/VendorLedgerPage'))
const SubAgentLedgerPage = lazy(() => import('@/pages/SubAgentLedgerPage'))
const PayrollPage = lazy(() => import('@/pages/PayrollPage'))
const DocumentsPage = lazy(() => import('@/pages/DocumentsPage'))
const ApprovalsPage = lazy(() => import('@/pages/ApprovalsPage'))
const AuditTrailPage = lazy(() => import('@/pages/AuditTrailPage'))
const ReportsHubPage = lazy(() =>
  import('@/pages/ReportsHubPage').then((m) => ({ default: m.ReportsHubPage })),
)
const ReportPage = lazy(() =>
  import('@/pages/ReportPage').then((m) => ({ default: m.ReportPage })),
)
const CounsellorReportPage = lazy(() => import('@/pages/CounsellorReportPage'))
const CountryWiseReportPage = lazy(() => import('@/pages/CountryWiseReportPage'))
const UniversityWiseReportPage = lazy(() => import('@/pages/UniversityWiseReportPage'))
const UniversityWisePLReportPage = lazy(() => import('@/pages/UniversityWisePLReportPage'))
const BranchIncomeReportPage = lazy(() => import('@/pages/BranchIncomeReportPage'))
const BranchExpensesReportPage = lazy(() => import('@/pages/BranchExpensesReportPage'))
const BranchProfitReportPage = lazy(() => import('@/pages/BranchProfitReportPage'))
const BranchCashPositionReportPage = lazy(
  () => import('@/pages/BranchCashPositionReportPage'),
)
const ConsolidatedPLReportPage = lazy(() => import('@/pages/ConsolidatedPLReportPage'))
const ConsolidatedBalanceSheetReportPage = lazy(
  () => import('@/pages/ConsolidatedBalanceSheetReportPage'),
)
const ConsolidatedCashFlowReportPage = lazy(
  () => import('@/pages/ConsolidatedCashFlowReportPage'),
)
const BranchesSettingsPage = lazy(() =>
  import('@/pages/BranchesSettingsPage').then((m) => ({
    default: m.BranchesSettingsPage,
  })),
)
const UsersSettingsPage = lazy(() =>
  import('@/pages/UsersSettingsPage').then((m) => ({ default: m.UsersSettingsPage })),
)
const SystemSettingsPage = lazy(() =>
  import('@/pages/SystemSettingsPage').then((m) => ({ default: m.SystemSettingsPage })),
)
const EmailSettingsPage = lazy(() => import('@/pages/EmailSettingsPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const CrmTenantsPage = lazy(() => import('@/pages/crm/CrmTenantsPage'))
const CrmMailDeliveryPage = lazy(() => import('@/pages/crm/CrmMailDeliveryPage'))

export const routes: RouteObject[] = [
  {
    path: '/login',
    element: (
      <GuestGuard>
        <LoginPage />
      </GuestGuard>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: '/',
    element: (
      <AuthGuard>
        <AppShell />
      </AuthGuard>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'crm/tenants', element: <CrmTenantsPage /> },
      { path: 'crm/mail-delivery', element: <CrmMailDeliveryPage /> },
      { path: 'master-sheet', element: <MasterSheetPage /> },
      { path: 'invoices', element: <InvoicesPage /> },
      { path: 'other-invoices', element: <OtherInvoicesPage /> },
      { path: 'receivables', element: <ReceivablesPage /> },
      { path: 'receivables/allocation', element: <AllocationPage /> },
      { path: 'sub-agents', element: <SubAgentsPage /> },
      { path: 'sub-agents/commissions', element: <SubAgentCommissionsPage /> },
      { path: 'sub-agents/payments', element: <SubAgentPaymentsPage /> },
      { path: 'petty-cash', element: <PettyCashPage /> },
      { path: 'expenses', element: <ExpensesPage /> },
      { path: 'bank-cash', element: <BankCashPage /> },
      { path: 'general-ledger', element: <GeneralLedgerPage /> },
      { path: 'journal-entries', element: <JournalEntriesPage /> },
      { path: 'contra-entries', element: <ContraEntriesPage /> },
      { path: 'tax-compliance', element: <TaxCompliancePage /> },
      { path: 'ledgers/student', element: <StudentLedgerPage /> },
      { path: 'ledgers/vendor', element: <VendorLedgerPage /> },
      { path: 'ledgers/sub-agent', element: <SubAgentLedgerPage /> },
      { path: 'payroll', element: <PayrollPage /> },
      { path: 'documents', element: <DocumentsPage /> },
      { path: 'approvals', element: <ApprovalsPage /> },
      { path: 'audit-trail', element: <AuditTrailPage /> },
      { path: 'reports', element: <ReportsHubPage /> },
      { path: 'reports/branch-income', element: <BranchIncomeReportPage /> },
      { path: 'reports/branch-expenses', element: <BranchExpensesReportPage /> },
      { path: 'reports/branch-profit', element: <BranchProfitReportPage /> },
      { path: 'reports/branch-cash', element: <BranchCashPositionReportPage /> },
      { path: 'reports/consolidated-pl', element: <ConsolidatedPLReportPage /> },
      { path: 'reports/consolidated-bs', element: <ConsolidatedBalanceSheetReportPage /> },
      { path: 'reports/consolidated-cf', element: <ConsolidatedCashFlowReportPage /> },
      { path: 'reports/counsellor', element: <CounsellorReportPage /> },
      { path: 'reports/country-wise', element: <CountryWiseReportPage /> },
      { path: 'reports/university-wise', element: <UniversityWiseReportPage /> },
      { path: 'reports/university-wise-pl', element: <UniversityWisePLReportPage /> },
      { path: 'reports/:reportId', element: <ReportPage /> },
      { path: 'settings/branches', element: <BranchesSettingsPage /> },
      { path: 'settings/users', element: <UsersSettingsPage /> },
      { path: 'settings/system', element: <SystemSettingsPage /> },
      { path: 'settings/email', element: <EmailSettingsPage /> },
      { path: 'profile', element: <ProfilePage /> },
    ],
  },
]
