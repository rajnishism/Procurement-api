import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginTransitionOverlay from './components/LoginTransitionOverlay';
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
import Notifications from './pages/Notifications';
import UserManagement from './pages/UserManagement';
import POGenerator from './pages/POGenerator';
import PoApprovalAction from './pages/PoApprovalAction';
import ActivityDashboard from './pages/ActivityDashboard';
import PrDetailPage from './pages/PrDetailPage';
import PoDetailPage from './pages/PoDetailPage';
import NfaGenerator from './pages/NfaGenerator';
import NfaTracking from './pages/NfaTracking';
import NfaDetailPage from './pages/NfaDetailPage';
import MyApprovals from './pages/MyApprovals';
import ApprovalDetailPage from './pages/ApprovalDetailPage';
// Remove AnalyticsDashboard
import ExcelUI from 'handsontable';



import { GlobalErrorProvider, useGlobalError } from './context/GlobalErrorContext';
import { setupErrorInterceptor } from './api/axios';

const ErrorInitializer = ({ children }) => {
  const { reportError } = useGlobalError();

  React.useEffect(() => {
    setupErrorInterceptor(reportError);
  }, [reportError]);

  return children;
};

/**
 * Guard for public-only pages (e.g. /login).
 * If the user is already authenticated, redirect them to the dashboard.
 * While auth state is being resolved, render nothing to avoid a flash.
 */
const PublicOnlyRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null; // wait for auth check — avoids flash of login page
  if (user) return <Navigate to="/" replace />;
  return children;
};


function App() {
  return (
    <GlobalErrorProvider>
      <ErrorInitializer>
        <AuthProvider>
          <Router>
            <Routes>
              {/* Public routes — no auth required */}
              <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
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
                      <Route path="/notifications" element={<Notifications />} />

                      {/* PR Team routes */}
                      <Route path="/upload-pr" element={
                        <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'OFFICER']} allowedTeams={['PR_TEAM']}>
                          <AiQuotationParser />
                        </ProtectedRoute>
                      } />
                      <Route path="/prs" element={
                        <ProtectedRoute allowedTeams={['PR_TEAM']}>
                          <PrTracking />
                        </ProtectedRoute>
                      } />
                      <Route path="/prs/:id" element={
                        <ProtectedRoute allowedTeams={['PR_TEAM']}>
                          <PrDetailPage />
                        </ProtectedRoute>
                      } />
                      <Route path="/pos/:id" element={
                        <ProtectedRoute allowedTeams={['PR_TEAM']}>
                          <PoDetailPage />
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

                      {/* NFA routes (PO Team) */}
                      <Route path="/nfas" element={
                        <ProtectedRoute allowedTeams={['PO_TEAM']}>
                          <NfaGenerator />
                        </ProtectedRoute>
                      } />
                      <Route path="/nfahistory" element={
                        <ProtectedRoute allowedTeams={['PO_TEAM']}>
                          <NfaTracking />
                        </ProtectedRoute>
                      } />
                      <Route path="/nfa/:id" element={
                        <ProtectedRoute allowedTeams={['PO_TEAM']}>
                          <NfaDetailPage />
                        </ProtectedRoute>
                      } />



                      {/* In-App Approval routes */}
                      <Route path="/approvals" element={<MyApprovals />} />
                      <Route path="/approvals/:id" element={<ApprovalDetailPage />} />

                      {/* GRN Team routes */}
                      <Route path="/grns" element={
                        <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'OFFICER']} allowedTeams={['GRN_TEAM']}>
                          <ComingSoon title="GRN Management" />
                        </ProtectedRoute>
                      } />

                      {/* Invoice Team routes */}
                      <Route path="/invoices" element={
                        <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']} allowedTeams={['INVOICE_TEAM']}>
                          <ComingSoon title="Invoice Management" />
                        </ProtectedRoute>
                      } />
                      <Route path="/payments" element={
                        <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']} allowedTeams={['INVOICE_TEAM']}>
                          <ComingSoon title="Payment Tracking" />
                        </ProtectedRoute>
                      } />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              } />
            </Routes>
          </Router>
          {/* Global post-login transition overlay — persists above routes */}
          <LoginTransitionOverlay />
        </AuthProvider>
      </ErrorInitializer>
    </GlobalErrorProvider>
  );
}

export default App;
