import { AuthGuard } from '@/components/auth/AuthGuard'
import { GuestGuard } from '@/components/auth/GuestGuard'
import { AppShell } from '@/components/layout/AppShell'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import MasterSheetPage from '@/pages/MasterSheetPage'
import InvoicesPage from '@/pages/InvoicesPage'
import OtherInvoicesPage from '@/pages/OtherInvoicesPage'
import ReceivablesPage from '@/pages/ReceivablesPage'
import AllocationPage from '@/pages/AllocationPage'
import SubAgentsPage from '@/pages/SubAgentsPage'
import SubAgentCommissionsPage from '@/pages/SubAgentCommissionsPage'
import SubAgentPaymentsPage from '@/pages/SubAgentPaymentsPage'
import PettyCashPage from '@/pages/PettyCashPage'
import ExpensesPage from '@/pages/ExpensesPage'
import BankCashPage from '@/pages/BankCashPage'
import GeneralLedgerPage from '@/pages/GeneralLedgerPage'
import JournalEntriesPage from '@/pages/JournalEntriesPage'
import ContraEntriesPage from '@/pages/ContraEntriesPage'
import TaxCompliancePage from '@/pages/TaxCompliancePage'
import StudentLedgerPage from '@/pages/StudentLedgerPage'
import VendorLedgerPage from '@/pages/VendorLedgerPage'
import SubAgentLedgerPage from '@/pages/SubAgentLedgerPage'
import PayrollPage from '@/pages/PayrollPage'
import DocumentsPage from '@/pages/DocumentsPage'
import ApprovalsPage from '@/pages/ApprovalsPage'
import AuditTrailPage from '@/pages/AuditTrailPage'
import { ReportsHubPage } from '@/pages/ReportsHubPage'
import { ReportPage } from '@/pages/ReportPage'
import CounsellorReportPage from '@/pages/CounsellorReportPage'
import CountryWiseReportPage from '@/pages/CountryWiseReportPage'
import UniversityWiseReportPage from '@/pages/UniversityWiseReportPage'
import UniversityWisePLReportPage from '@/pages/UniversityWisePLReportPage'
import BranchIncomeReportPage from '@/pages/BranchIncomeReportPage'
import BranchExpensesReportPage from '@/pages/BranchExpensesReportPage'
import BranchProfitReportPage from '@/pages/BranchProfitReportPage'
import BranchCashPositionReportPage from '@/pages/BranchCashPositionReportPage'
import ConsolidatedPLReportPage from '@/pages/ConsolidatedPLReportPage'
import ConsolidatedBalanceSheetReportPage from '@/pages/ConsolidatedBalanceSheetReportPage'
import ConsolidatedCashFlowReportPage from '@/pages/ConsolidatedCashFlowReportPage'
import { BranchesSettingsPage } from '@/pages/BranchesSettingsPage'
import { UsersSettingsPage } from '@/pages/UsersSettingsPage'
import { SystemSettingsPage } from '@/pages/SystemSettingsPage'
import EmailSettingsPage from '@/pages/EmailSettingsPage'
import ProfilePage from '@/pages/ProfilePage'
import CrmTenantsPage from '@/pages/crm/CrmTenantsPage'
import type { RouteObject } from 'react-router-dom'

export const routes: RouteObject[] = [
  {
    path: '/login',
    element: (
      <GuestGuard>
        <LoginPage />
      </GuestGuard>
    ),
  },
  {
    path: '/',
    element: (
      <AuthGuard>
        <AppShell />
      </AuthGuard>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'crm/tenants', element: <CrmTenantsPage /> },
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
