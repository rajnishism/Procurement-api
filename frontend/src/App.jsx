import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import PrUpload from './pages/PrUpload';
import PrTracking from './pages/PrTracking';
import BudgetOverview from './pages/BudgetOverview';
import MasterData from './pages/MasterData';
import DataMigration from './pages/DataMigration';
import ApprovalAction from './pages/ApprovalAction';
import VendorPortal from './pages/VendorPortal';
import RFQManagement from './pages/RFQManagement';
import POManagement from './pages/POManagement';
import GRNManagement from './pages/GRNManagement';
import InvoiceManagement from './pages/InvoiceManagement';
import PaymentManagement from './pages/PaymentManagement';
import AiQuotationParser from './pages/AiQuotationParser';
import ProfileSettings from './pages/ProfileSettings';
import ComingSoon from './pages/ComingSoon';
import UserManagement from './pages/UserManagement';
import POGenerator from './pages/POGenerator';
import PoApprovalAction from './pages/PoApprovalAction';
import ActivityDashboard from './pages/ActivityDashboard';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes — no auth required */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/pr/action" element={<ApprovalAction />} />
          <Route path="/po/action" element={<PoApprovalAction />} />
          <Route path="/rfq/respond" element={<VendorPortal />} />

          {/* Protected routes — require login */}
          <Route path="/*" element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/profile" element={<ProfileSettings />} />

                  {/* PR Team routes */}
                  <Route path="/upload-pr" element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'OFFICER']} allowedTeams={['PR_TEAM']}>
                      <PrUpload />
                    </ProtectedRoute>
                  } />
                  <Route path="/prs" element={
                    <ProtectedRoute allowedTeams={['PR_TEAM']}>
                      <PrTracking />
                    </ProtectedRoute>
                  } />
                  <Route path="/pr-tracker" element={
                    <ProtectedRoute allowedTeams={['PR_TEAM']}>
                      <PrTracking filterStatus="APPROVED" />
                    </ProtectedRoute>
                  } />

                  {/* Budget Team routes */}
                  <Route path="/budget" element={
                    <ProtectedRoute allowedTeams={['BUDGET_TEAM', 'PR_TEAM']}>
                      <BudgetOverview />
                    </ProtectedRoute>
                  } />
                  <Route path="/expenses" element={
                    <ProtectedRoute allowedTeams={['BUDGET_TEAM']}>
                      <ComingSoon title="Expense Audit" />
                    </ProtectedRoute>
                  } />

                  {/* Admin-only routes */}
                  <Route path="/master-data" element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                      <MasterData />
                    </ProtectedRoute>
                  } />
                  <Route path="/migration" element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <DataMigration />
                    </ProtectedRoute>
                  } />
                  <Route path="/users" element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <UserManagement />
                    </ProtectedRoute>
                  } />
                  <Route path="/audit-logs" element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                      <ActivityDashboard />
                    </ProtectedRoute>
                  } />

                  {/* Vendor Team routes */}
                  <Route path="/rfqs" element={
                    <ProtectedRoute allowedTeams={['VENDOR_TEAM']}>
                      <RFQManagement />
                    </ProtectedRoute>
                  } />
                  <Route path="/ai-parser" element={
                    <ProtectedRoute allowedTeams={['VENDOR_TEAM']}>
                      <AiQuotationParser />
                    </ProtectedRoute>
                  } />

                  {/* PO Team routes */}
                  <Route path="/po-generator" element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']} allowedTeams={['PO_TEAM']}>
                      <POGenerator />
                    </ProtectedRoute>
                  } />
                  <Route path="/pos" element={
                    <ProtectedRoute allowedTeams={['PO_TEAM']}>
                      <POManagement />
                    </ProtectedRoute>
                  } />
                  <Route path="/po-tracker" element={
                    <ProtectedRoute allowedTeams={['PO_TEAM']}>
                      <POManagement filterStatus="ISSUED" />
                    </ProtectedRoute>
                  } />

                  {/* NFA routes (PO Team) */}
                  <Route path="/nfas" element={
                    <ProtectedRoute allowedTeams={['PO_TEAM']}>
                      <ComingSoon title="NFA Generator" />
                    </ProtectedRoute>
                  } />
                  <Route path="/nfahistory" element={
                    <ProtectedRoute allowedTeams={['PO_TEAM']}>
                      <ComingSoon title="NFA History" />
                    </ProtectedRoute>
                  } />
                  <Route path="/nfatracker" element={
                    <ProtectedRoute allowedTeams={['PO_TEAM']}>
                      <ComingSoon title="NFA Tracker" />
                    </ProtectedRoute>
                  } />

                  {/* GRN Team routes */}
                  <Route path="/grns" element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'OFFICER']} allowedTeams={['GRN_TEAM']}>
                      <GRNManagement />
                    </ProtectedRoute>
                  } />

                  {/* Invoice Team routes */}
                  <Route path="/invoices" element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']} allowedTeams={['INVOICE_TEAM']}>
                      <InvoiceManagement />
                    </ProtectedRoute>
                  } />
                  <Route path="/payments" element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']} allowedTeams={['INVOICE_TEAM']}>
                      <PaymentManagement />
                    </ProtectedRoute>
                  } />
                </Routes>
              </Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
