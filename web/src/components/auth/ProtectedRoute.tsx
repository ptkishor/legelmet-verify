import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import type { UserRole } from "@/types/database";
import { ShieldAlert, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
  children,
}) => {
  const { user, role, isLoading, signOut } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-9 w-9 animate-spin text-emerald-600" />
          <div className="text-center">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">
              Verifying Session
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Connecting to LegalMet Secure Portal...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Not logged in -> send to login page preserving the destination
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If role is still loading or doesn't match allowedRoles
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-center">
        <div className="max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Access Restricted
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            Your account ({role.replace("_", " ")}) does not have permission to view this section.
          </p>
          <div className="flex gap-3 w-full">
            <Button
              className="flex-1"
              variant="outline"
              onClick={() => (window.location.href = "/dashboard")}
            >
              Go to My Portal
            </Button>
            <Button
              variant="ghost"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => signOut()}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
