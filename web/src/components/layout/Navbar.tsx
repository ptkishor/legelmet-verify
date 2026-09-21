import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, DEMO_ACCOUNTS } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  LogOut,
  User,
  LayoutDashboard,
  Search,
  AlertTriangle,
  Zap,
  Bell,
} from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { toast } from "sonner";

export const Navbar: React.FC = () => {
  const { user, profile, role, signOut, loginAsDemo } = useAuth();
  const navigate = useNavigate();

  const handleDemoSwitch = async (key: string) => {
    toast.loading("Switching demo account...");
    const { error } = await loginAsDemo(key);
    toast.dismiss();
    if (error) {
      toast.error(`Failed to switch: ${error.message}`);
    } else {
      toast.success("Switched account successfully!");
      navigate("/dashboard");
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "LM";
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const getRoleLabel = () => {
    switch (role) {
      case "admin":
        return { label: "State Admin", color: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300" };
      case "metrology_officer":
        return { label: "Metrology Officer", color: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300" };
      case "gatc_user":
        return { label: "GATC Lab Lead", color: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300" };
      case "business_owner":
        return { label: "Business Owner", color: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300" };
      default:
        return { label: "Citizen / Guest", color: "bg-slate-100 text-slate-700 border-slate-300" };
    }
  };

  const roleInfo = getRoleLabel();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-slate-800 dark:bg-slate-950/95">
      {/* Top tricolor subtle government strip */}
      <div className="h-1 w-full flex">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-[#138808]" />
      </div>

      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-700/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">
                LegalMet <span className="text-emerald-600">Verify</span>
              </span>
              <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                SIH 2026
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 -mt-0.5 hidden sm:block">
              Dept. of Consumer Affairs • Legal Metrology Division
            </p>
          </div>
        </Link>

        {/* Center / Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
          <Link
            to="/verify"
            className="flex items-center gap-1.5 hover:text-emerald-600 transition-colors"
          >
            <Search className="w-4 h-4 text-emerald-600" />
            Verify Instrument
          </Link>
          <Link
            to="/complaint"
            className="flex items-center gap-1.5 hover:text-amber-600 transition-colors"
          >
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            File Complaint
          </Link>
        </nav>

        {/* Right Action Area */}
        <div className="flex items-center gap-3">
          {user && profile ? (
            <div className="flex items-center gap-3">
              {/* Jurisdiction chip */}
              {profile.jurisdiction_state && (
                <div className="hidden lg:flex items-center text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                  {profile.jurisdiction_district
                    ? `${profile.jurisdiction_district}, ${profile.jurisdiction_state}`
                    : profile.jurisdiction_state}
                </div>
              )}

              {/* Role badge */}
              <Badge variant="outline" className={`hidden sm:inline-flex text-xs ${roleInfo.color}`}>
                {roleInfo.label}
              </Badge>

              {/* In-App Notifications Bell */}
              <NotificationBell />

              {/* User Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                    <Avatar className="h-9 w-9 border border-slate-200 dark:border-slate-800">
                      <AvatarFallback className="bg-emerald-700 text-white font-semibold text-xs">
                        {getInitials(profile.full_name)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-2">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white leading-none">
                        {profile.full_name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {user.email}
                      </p>
                      {profile.designation && (
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                          {profile.designation}
                        </p>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={() => navigate("/dashboard")} className="cursor-pointer">
                    <LayoutDashboard className="mr-2 h-4 w-4 text-slate-500" />
                    <span>My Dashboard</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => navigate("/notifications")} className="cursor-pointer">
                    <Bell className="mr-2 h-4 w-4 text-slate-500" />
                    <span>Compliance Alerts</span>
                  </DropdownMenuItem>

                  {/* Demo Account Quick Switcher Menu */}
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Demo Quick Switcher
                  </div>
                  {DEMO_ACCOUNTS.map((acc) => (
                    <DropdownMenuItem
                      key={acc.key}
                      onClick={() => handleDemoSwitch(acc.key)}
                      className="cursor-pointer text-xs flex items-center justify-between"
                    >
                      <span className="truncate">{acc.title}</span>
                      <Zap className="h-3 w-3 text-amber-500" />
                    </DropdownMenuItem>
                  ))}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut()}
                    className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950/50"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/login")}
                className="text-slate-700 dark:text-slate-200"
              >
                <User className="w-4 h-4 mr-1.5" />
                Sign In
              </Button>
              <Button
                size="sm"
                onClick={() => navigate("/signup")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Register
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
