import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import RoleRedirect from "@/components/auth/RoleRedirect";

import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/auth/LoginPage";
import SignupPage from "@/pages/auth/SignupPage";

import OfficerDashboard from "@/pages/dashboard/OfficerDashboard";
import BusinessDashboard from "@/pages/dashboard/BusinessDashboard";
import GatcDashboardPage from "@/pages/gatc/GatcDashboardPage";
import PatternTestPage from "@/pages/gatc/PatternTestPage";
import TestReportsPage from "@/pages/gatc/TestReportsPage";

import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";
import RiskEnginePage from "@/pages/admin/RiskEnginePage";
import AuditTrailPage from "@/pages/admin/AuditTrailPage";
import OfficersPage from "@/pages/admin/OfficersPage";

import RegisterInstrumentPage from "@/pages/business/RegisterInstrumentPage";
import InstrumentDetailPage from "@/pages/business/InstrumentDetailPage";
import CertificatesPage from "@/pages/business/CertificatesPage";
import ApplicationsPage from "@/pages/business/ApplicationsPage";

import InspectionQueuePage from "@/pages/officer/InspectionQueuePage";
import InspectionFormPage from "@/pages/officer/InspectionFormPage";
import SyncHubPage from "@/pages/officer/SyncHubPage";
import ComplaintsQueuePage from "@/pages/officer/ComplaintsQueuePage";
import InstrumentRegistryPage from "@/pages/officer/InstrumentRegistryPage";

import VerifyPage from "@/pages/public/VerifyPage";
import ComplaintPage from "@/pages/public/ComplaintPage";
import NotificationsPage from "@/pages/shared/NotificationsPage";

/**
 * Root application component.
 *
 * Configured with:
 * - AuthProvider (Supabase session, profile, role state, demo login helpers)
 * - ProtectedRoute (Role-aware route security guards)
 * - RoleRedirect (/dashboard navigates to role home)
 * - Sonner toaster for notifications
 */
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/verify" element={<VerifyPage />} />
            <Route path="/verify/:digitalId" element={<VerifyPage />} />
            <Route path="/complaint" element={<ComplaintPage />} />
            <Route path="/complaint/:digitalId" element={<ComplaintPage />} />

            {/* Smart Role-Based Redirect Route */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <RoleRedirect />
                </ProtectedRoute>
              }
            />

            {/* Metrology Officer Routes */}
            <Route
              path="/officer"
              element={
                <ProtectedRoute allowedRoles={["metrology_officer", "admin"]}>
                  <OfficerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/officer/inspections"
              element={
                <ProtectedRoute allowedRoles={["metrology_officer", "admin"]}>
                  <InspectionQueuePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/officer/inspect/:applicationId"
              element={
                <ProtectedRoute allowedRoles={["metrology_officer", "admin"]}>
                  <InspectionFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/officer/sync"
              element={
                <ProtectedRoute allowedRoles={["metrology_officer", "admin"]}>
                  <SyncHubPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/officer/complaints"
              element={
                <ProtectedRoute allowedRoles={["metrology_officer", "admin"]}>
                  <ComplaintsQueuePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/officer/instruments"
              element={
                <ProtectedRoute allowedRoles={["metrology_officer", "admin"]}>
                  <InstrumentRegistryPage />
                </ProtectedRoute>
              }
            />

            {/* Business Owner / Trader Routes */}
            <Route
              path="/business"
              element={
                <ProtectedRoute allowedRoles={["business_owner", "admin"]}>
                  <BusinessDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/business/apply"
              element={
                <ProtectedRoute allowedRoles={["business_owner", "admin"]}>
                  <RegisterInstrumentPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/business/instruments/:id"
              element={
                <ProtectedRoute allowedRoles={["business_owner", "admin"]}>
                  <InstrumentDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/business/certificates"
              element={
                <ProtectedRoute allowedRoles={["business_owner", "admin"]}>
                  <CertificatesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/business/applications"
              element={
                <ProtectedRoute allowedRoles={["business_owner", "admin"]}>
                  <ApplicationsPage />
                </ProtectedRoute>
              }
            />

            {/* State Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/risk"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <RiskEnginePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/audit"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AuditTrailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/officers"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <OfficersPage />
                </ProtectedRoute>
              }
            />

            {/* GATC Lab User Routes */}
            <Route
              path="/gatc"
              element={
                <ProtectedRoute allowedRoles={["gatc_user", "admin"]}>
                  <GatcDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/gatc/test"
              element={
                <ProtectedRoute allowedRoles={["gatc_user", "admin"]}>
                  <PatternTestPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/gatc/reports"
              element={
                <ProtectedRoute allowedRoles={["gatc_user", "admin"]}>
                  <TestReportsPage />
                </ProtectedRoute>
              }
            />

            {/* Shared Authenticated Compliance Notifications */}
            <Route
              path="/notifications"
              element={
                <ProtectedRoute allowedRoles={["business_owner", "metrology_officer", "admin", "gatc_user"]}>
                  <NotificationsPage />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster position="top-right" richColors />
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
