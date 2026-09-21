import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

/**
 * Automatically sends authenticated users to their specific dashboard based on their role:
 * - admin -> /admin
 * - metrology_officer -> /officer
 * - gatc_user -> /gatc
 * - business_owner -> /business
 */
export const RoleRedirect: React.FC = () => {
  const { user, role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  switch (role) {
    case "admin":
      return <Navigate to="/admin" replace />;
    case "metrology_officer":
      return <Navigate to="/officer" replace />;
    case "gatc_user":
      return <Navigate to="/gatc" replace />;
    case "business_owner":
      return <Navigate to="/business" replace />;
    default:
      return <Navigate to="/" replace />;
  }
};

export default RoleRedirect;
