import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth, DEMO_ACCOUNTS } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Zap,
  ArrowRight,
  Sparkles,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { getEffectiveOnlineStatus } from "@/lib/syncEngine";

export const LoginPage: React.FC = () => {
  const { signIn, loginAsDemo, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(getEffectiveOnlineStatus());

  React.useEffect(() => {
    const handleConn = () => setIsOnline(getEffectiveOnlineStatus());
    window.addEventListener("online", handleConn);
    window.addEventListener("offline", handleConn);
    window.addEventListener("legalmet-connectivity-change", handleConn);
    return () => {
      window.removeEventListener("online", handleConn);
      window.removeEventListener("offline", handleConn);
      window.removeEventListener("legalmet-connectivity-change", handleConn);
    };
  }, []);

  // Return to previous target URL if available
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/dashboard";

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter both email and password.");
      return;
    }

    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);

    if (error) {
      toast.error(`Authentication failed: ${error.message}`);
    } else {
      toast.success("Welcome back!");
      navigate(from, { replace: true });
    }
  };

  const handleDemoClick = async (demoKey: string) => {
    setSubmitting(true);
    toast.loading("Authenticating demo account...");
    const { error } = await loginAsDemo(demoKey);
    toast.dismiss();
    setSubmitting(false);

    if (error) {
      toast.error(`Demo sign in failed: ${error.message}`);
    } else {
      toast.success("Demo login successful!");
      navigate("/dashboard", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Tricolor top border accent */}
      <div className="fixed top-0 left-0 right-0 h-1.5 flex z-50">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-[#138808]" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-700/20">
            <ShieldCheck className="w-7 h-7" />
          </div>
        </Link>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          LegalMet <span className="text-emerald-600">Verify</span>
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Govt. of India • Department of Consumer Affairs • Legal Metrology Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl px-4">
        {/* Hackathon Demo Quick Switcher Box */}
        <div className="mb-6 bg-gradient-to-br from-amber-50 to-orange-50/40 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center">
                <Zap className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                SIH 2026 Jury & Demo 1-Click Login
              </h3>
            </div>
            <span className="text-[10px] font-semibold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-700">
              Instant Access
            </span>
          </div>
          {!isOnline && (
            <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
              <WifiOff className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <span className="font-bold">Offline Field Mode Active:</span> Device is currently disconnected. Click <strong>Field Officer (Gurugram)</strong> below to immediately resume your field session and access the cached IndexedDB inspection queue without internet.
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.key}
                type="button"
                onClick={() => handleDemoClick(acc.key)}
                disabled={submitting || isLoading}
                className="text-left p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-amber-800/40 hover:border-amber-400 dark:hover:border-amber-600 hover:shadow-md transition-all group relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-slate-900 dark:text-slate-100 group-hover:text-amber-600 transition-colors">
                    {acc.title}
                  </span>
                  <Sparkles className="w-3 h-3 text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {acc.subtitle}
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-mono">
                  {acc.jurisdiction}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Standard Manual Login Card */}
        <div className="bg-white dark:bg-slate-900 py-8 px-6 sm:px-8 border border-slate-200 dark:border-slate-800 shadow-md rounded-2xl">
          <div className="mb-6">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Official / Business Sign In
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter your registered credentials to access your portal.
            </p>
          </div>

          <form onSubmit={handleManualLogin} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Email Address
              </Label>
              <div className="mt-1 relative rounded-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@legalmet.gov.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Password
                </Label>
              </div>
              <div className="mt-1 relative rounded-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-10 text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting || isLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 rounded-xl text-sm transition-colors mt-2"
            >
              {submitting ? "Authenticating..." : "Sign In to Portal"}
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className="text-xs text-slate-500">
              New business owner or trader?{" "}
              <Link to="/signup" className="font-semibold text-emerald-600 hover:text-emerald-500">
                Register establishment
              </Link>
            </p>
            <div className="mt-3">
              <Link to="/verify" className="text-xs text-slate-400 hover:text-slate-600">
                Citizen? Search & verify weighing scale without login →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
