import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth, DEMO_ACCOUNTS } from "@/context/AuthContext";
import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  ClipboardCheck,
  WifiOff,
  AlertCircle,
  FileCheck,
  PlusCircle,
  BarChart3,
  Users,
  ShieldAlert,
  FileText,
  FlaskConical,
  LogOut,
  ChevronRight,
  Menu,
  X,
  Zap,
  Bell,
} from "lucide-react";
import { toast } from "sonner";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { profile, role, signOut, loginAsDemo } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Role-specific sidebar navigation items
  const getNavItems = (): NavItem[] => {
    switch (role) {
      case "metrology_officer":
        return [
          { title: "Field Dashboard", href: "/officer", icon: LayoutDashboard },
          { title: "Inspection Queue", href: "/officer/inspections", icon: ClipboardCheck },
          { title: "Offline Sync Hub", href: "/officer/sync", icon: WifiOff },
          { title: "Assigned Complaints", href: "/officer/complaints", icon: AlertCircle },
          { title: "Instrument Registry", href: "/officer/instruments", icon: FileCheck },
          { title: "Compliance Alerts", href: "/notifications", icon: Bell },
        ];
      case "business_owner":
        return [
          { title: "My Instruments", href: "/business", icon: LayoutDashboard },
          { title: "Apply for Verification", href: "/business/apply", icon: PlusCircle },
          { title: "Certificates & QR", href: "/business/certificates", icon: FileCheck },
          { title: "Track Complaints", href: "/business/complaints", icon: AlertCircle },
          { title: "Compliance Alerts", href: "/notifications", icon: Bell },
        ];
      case "admin":
        return [
          { title: "State Command Center", href: "/admin", icon: BarChart3 },
          { title: "Officer Deployment", href: "/admin/officers", icon: Users },
          { title: "High-Risk Watchlist", href: "/admin/risk", icon: ShieldAlert, badge: "Alert" },
          { title: "Immutable Audit Log", href: "/admin/audit", icon: FileText },
          { title: "Compliance Alerts", href: "/notifications", icon: Bell },
        ];
      case "gatc_user":
        return [
          { title: "Pattern Approvals", href: "/gatc", icon: FlaskConical },
          { title: "Model Test Reports", href: "/gatc/reports", icon: FileText },
          { title: "Compliance Alerts", href: "/notifications", icon: Bell },
        ];
      default:
        return [{ title: "Dashboard", href: "/dashboard", icon: LayoutDashboard }];
    }
  };

  const navItems = getNavItems();

  const handleDemoSwitch = async (key: string) => {
    toast.loading("Switching demo account...");
    const { error } = await loginAsDemo(key);
    toast.dismiss();
    if (error) {
      toast.error(`Switch failed: ${error.message}`);
    } else {
      toast.success("Switched demo account!");
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <Navbar />

      <div className="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-6">
        {/* Mobile menu trigger */}
        <div className="md:hidden mb-4 flex items-center justify-between w-full">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex items-center gap-2"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            <span>Portal Navigation</span>
          </Button>
          <span className="text-xs font-semibold text-slate-500 capitalize">
            {role?.replace("_", " ")}
          </span>
        </div>

        {/* Sidebar */}
        <aside
          className={`
            fixed md:static inset-y-0 left-0 z-30 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-sm transition-transform duration-200 ease-in-out
            ${mobileMenuOpen ? "translate-x-0 top-16" : "-translate-x-full md:translate-x-0"}
          `}
        >
          <div className="space-y-6">
            {/* User Info Card */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Active Session
              </div>
              <p className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                {profile?.full_name || "LegalMet User"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {profile?.designation || profile?.role?.replace("_", " ")}
              </p>
              {profile?.jurisdiction_district && (
                <div className="mt-2 inline-flex items-center text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/60">
                  📍 {profile.jurisdiction_district}, {profile.jurisdiction_state}
                </div>
              )}
            </div>

            {/* Navigation links */}
            <nav className="space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
                Navigation
              </div>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`
                      flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                      ${
                        isActive
                          ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20"
                          : "text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                      <span>{item.title}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Hackathon Demo Quick Switcher */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1 text-[11px] font-bold text-amber-600 uppercase tracking-wider px-3 mb-2">
                <Zap className="w-3 h-3" />
                <span>Demo Role Switcher</span>
              </div>
              <div className="space-y-1 px-1">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.key}
                    onClick={() => handleDemoSwitch(acc.key)}
                    className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors flex items-center justify-between group"
                  >
                    <span className="truncate">{acc.title}</span>
                    <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-amber-500 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Sign Out */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut()}
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
