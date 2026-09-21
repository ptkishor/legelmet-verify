import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabase";
import { computeInstrumentRisk } from "@/lib/riskService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Scale,
  ShieldCheck,
  ShieldAlert,
  Users,
  AlertCircle,
  RefreshCw,
  ArrowUpRight,
  Loader2,
  Calendar,
  CheckCircle2,
  Clock,
  Send,
  Building,
  PieChart as PieIcon,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";

interface MetricState {
  totalInstruments: number;
  verifiedCount: number;
  expiredCount: number;
  rejectedCount: number;
  suspendedCount: number;
  pendingCount: number;
  complianceRate: number;
  activeOfficers: number;
  openComplaints: number;
  resolvedComplaints: number;
  complaintResolutionRate: number;
  pendingApplications: number;
  completedApplications: number;
}

interface StatusChartItem {
  name: string;
  value: number;
  color: string;
}

interface MonthlyTrendItem {
  month: string;
  verifications: number;
  inspections: number;
}

interface DistrictStatItem {
  district: string;
  compliant: number;
  nonCompliant: number;
}

interface CategoryStatItem {
  name: string;
  value: number;
}

interface TopRiskItem {
  id: string;
  digital_id: string;
  shop_name: string;
  district: string;
  state: string;
  score: number;
  risk_band: "LOW" | "MEDIUM" | "HIGH";
  factors: Array<{ factor: string; points: number }>;
}

const STATUS_COLORS: Record<string, string> = {
  Verified: "#059669",
  "Expiring Soon": "#d97706",
  Expired: "#dc2626",
  Rejected: "#e11d48",
  "Pending Review": "#2563eb",
  Suspended: "#7c3aed",
};

export const AdminDashboardPage: React.FC = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);

  const [metrics, setMetrics] = useState<MetricState>({
    totalInstruments: 0,
    verifiedCount: 0,
    expiredCount: 0,
    rejectedCount: 0,
    suspendedCount: 0,
    pendingCount: 0,
    complianceRate: 0,
    activeOfficers: 0,
    openComplaints: 0,
    resolvedComplaints: 0,
    complaintResolutionRate: 0,
    pendingApplications: 0,
    completedApplications: 0,
  });

  const [statusData, setStatusData] = useState<StatusChartItem[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrendItem[]>([]);
  const [districtData, setDistrictData] = useState<DistrictStatItem[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryStatItem[]>([]);
  const [topRiskList, setTopRiskList] = useState<TopRiskItem[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Instruments
      const { data: insts, error: instErr } = await (supabase.from("instruments") as any)
        .select("id, digital_id, category, shop_name, district, state, status, created_at");
      if (instErr) throw instErr;
      const allInst = (insts as any[]) || [];

      // 2. Fetch Certificates
      const { data: certs } = await (supabase.from("certificates") as any)
        .select("id, certificate_no, issued_at, valid_till, is_revoked, instrument_id");
      const allCerts = (certs as any[]) || [];

      // 3. Fetch Applications
      const { data: apps } = await (supabase.from("applications") as any)
        .select("id, application_no, status, created_at");
      const allApps = (apps as any[]) || [];

      // 4. Fetch Officers
      const { data: officers } = await (supabase.from("profiles") as any)
        .select("id, full_name, role, jurisdiction_district")
        .eq("role", "metrology_officer");
      const allOfficers = (officers as any[]) || [];

      // 5. Fetch Complaints
      const { data: complaints } = await (supabase.from("complaints") as any)
        .select("id, status, created_at");
      const allCmps = (complaints as any[]) || [];

      // Status breakdown
      const verified = allInst.filter((i) => i.status === "verified");
      const expired = allInst.filter((i) => i.status === "expired");
      const rejected = allInst.filter((i) => i.status === "rejected");
      const suspended = allInst.filter((i) => i.status === "suspended");
      const pending = allInst.filter((i) => i.status === "pending");

      const total = allInst.length;
      const compliance = total > 0 ? Math.round((verified.length / total) * 100) : 0;

      const openCmps = allCmps.filter((c) => c.status === "open" || c.status === "assigned").length;
      const resolvedCmps = allCmps.filter((c) => c.status === "resolved").length;
      const cmpRate = allCmps.length > 0 ? Math.round((resolvedCmps / allCmps.length) * 100) : 100;

      const pendingApps = allApps.filter((a) =>
        ["submitted", "assigned", "scheduled", "inspected"].includes(a.status)
      ).length;
      const completedApps = allApps.filter((a) =>
        ["approved", "rejected"].includes(a.status)
      ).length;

      setMetrics({
        totalInstruments: total,
        verifiedCount: verified.length,
        expiredCount: expired.length,
        rejectedCount: rejected.length,
        suspendedCount: suspended.length,
        pendingCount: pending.length,
        complianceRate: compliance,
        activeOfficers: allOfficers.length,
        openComplaints: openCmps,
        resolvedComplaints: resolvedCmps,
        complaintResolutionRate: cmpRate,
        pendingApplications: pendingApps,
        completedApplications: completedApps,
      });

      // Chart 1: Status Donut Chart
      const statusChart: StatusChartItem[] = [
        { name: "Verified", value: verified.length, color: STATUS_COLORS.Verified },
        { name: "Expired", value: expired.length, color: STATUS_COLORS.Expired },
        { name: "Rejected", value: rejected.length, color: STATUS_COLORS.Rejected },
        { name: "Pending Review", value: pending.length, color: STATUS_COLORS["Pending Review"] },
        { name: "Suspended", value: suspended.length, color: STATUS_COLORS.Suspended },
      ].filter((s) => s.value > 0);
      setStatusData(statusChart);

      // Chart 2: Monthly Stamping Trends (Area Chart)
      // Group certificates and inspections by month
      const monthsMap: Record<string, { verifications: number; inspections: number }> = {};

      // Populate from live certificates
      allCerts.forEach((c) => {
        if (c.issued_at) {
          const d = new Date(c.issued_at);
          const key = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
          if (!monthsMap[key]) {
            monthsMap[key] = { verifications: 0, inspections: 0 };
          }
          monthsMap[key].verifications += 1;
        }
      });

      const trendData: MonthlyTrendItem[] = Object.entries(monthsMap).map(([month, val]) => ({
        month,
        verifications: val.verifications,
        inspections: val.inspections,
      }));
      setMonthlyTrends(trendData);

      // Chart 3: District-Wise Verification Bar Chart
      const distMap: Record<string, { compliant: number; nonCompliant: number }> = {};
      allInst.forEach((i) => {
        const d = i.district || "Patna";
        if (!distMap[d]) {
          distMap[d] = { compliant: 0, nonCompliant: 0 };
        }
        if (i.status === "verified") {
          distMap[d].compliant += 1;
        } else {
          distMap[d].nonCompliant += 1;
        }
      });

      const distList: DistrictStatItem[] = Object.entries(distMap).map(([district, val]) => ({
        district,
        compliant: val.compliant,
        nonCompliant: val.nonCompliant,
      }));
      setDistrictData(distList);

      // Chart 4: Equipment Category Distribution
      const catMap: Record<string, number> = {};
      allInst.forEach((i) => {
        const c = i.category || "General";
        catMap[c] = (catMap[c] || 0) + 1;
      });
      const catList: CategoryStatItem[] = Object.entries(catMap).map(([name, value]) => ({
        name,
        value,
      }));
      setCategoryData(catList);

      // 5. Top Risk Instruments
      const scored: TopRiskItem[] = [];
      for (const inst of allInst.slice(0, 11)) {
        const r = await computeInstrumentRisk(inst.id);
        scored.push({
          id: inst.id,
          digital_id: inst.digital_id,
          shop_name: inst.shop_name,
          district: inst.district,
          state: inst.state,
          score: r.score,
          risk_band: r.risk_band,
          factors: r.factors,
        });
      }
      scored.sort((a, b) => b.score - a.score);
      setTopRiskList(scored.slice(0, 5));
    } catch (err: any) {
      console.error(err);
      toast.error(`Error loading state analytics: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [profile]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                State Legal Metrology Command Center
              </h1>
              <Badge className="bg-purple-600 text-white hover:bg-purple-700">
                Executive Apex
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              Jurisdiction: <span className="font-semibold text-purple-700 dark:text-purple-400">{profile?.jurisdiction_state || "Haryana"}</span> • Controller in Charge:{" "}
              <span className="font-semibold text-slate-800 dark:text-slate-200">{profile?.full_name || "State Controller"}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                loadData();
                toast.success("Command metrics re-synchronized with live database");
              }}
              className="text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Sync State Data
            </Button>
            <Link to="/admin/risk">
              <Button size="sm" className="text-xs bg-purple-600 hover:bg-purple-700 text-white">
                <ShieldAlert className="w-3.5 h-3.5 mr-1" />
                Risk Watchlist
              </Button>
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            <p className="text-xs text-slate-500">Compiling executive analytics from district registries...</p>
          </div>
        ) : (
          <>
            {/* Top KPI Metrics Cards (6-Pack) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
              <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0 p-4">
                  <CardTitle className="text-xs font-medium text-slate-500">
                    Registered Units
                  </CardTitle>
                  <Scale className="w-4 h-4 text-slate-400" />
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {metrics.totalInstruments}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    <span className="text-emerald-600 font-semibold">100%</span> digitized
                  </p>
                </CardContent>
              </Card>

              <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0 p-4">
                  <CardTitle className="text-xs font-medium text-slate-500">
                    Compliance Rate
                  </CardTitle>
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="text-2xl font-bold text-emerald-600">
                    {metrics.complianceRate}%
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {metrics.verifiedCount} of {metrics.totalInstruments} valid
                  </p>
                </CardContent>
              </Card>

              <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0 p-4">
                  <CardTitle className="text-xs font-medium text-slate-500">
                    Non-Compliant
                  </CardTitle>
                  <ShieldAlert className="w-4 h-4 text-red-600" />
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="text-2xl font-bold text-red-600">
                    {metrics.expiredCount + metrics.rejectedCount + metrics.suspendedCount}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {metrics.expiredCount} exp • {metrics.rejectedCount} rej
                  </p>
                </CardContent>
              </Card>

              <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0 p-4">
                  <CardTitle className="text-xs font-medium text-slate-500">
                    Officers
                  </CardTitle>
                  <Users className="w-4 h-4 text-purple-600" />
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {metrics.activeOfficers}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Active jurisdictions</p>
                </CardContent>
              </Card>

              <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0 p-4">
                  <CardTitle className="text-xs font-medium text-slate-500">
                    Applications
                  </CardTitle>
                  <Clock className="w-4 h-4 text-blue-600" />
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="text-2xl font-bold text-blue-600">
                    {metrics.pendingApplications}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {metrics.completedApplications} completed
                  </p>
                </CardContent>
              </Card>

              <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0 p-4">
                  <CardTitle className="text-xs font-medium text-slate-500">
                    Grievance Rate
                  </CardTitle>
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="text-2xl font-bold text-amber-600">
                    {metrics.complaintResolutionRate}%
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {metrics.openComplaints} open grievances
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recharts Analytics Grid (M11 Specification) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart 1: Instruments by Status (Donut Chart) */}
              <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <PieIcon className="w-4 h-4 text-emerald-600" />
                        Instruments by Regulatory Status
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500">
                        Statutory distribution across verified, expired, and non-compliant tiers
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-64 w-full flex items-center justify-center pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={85}
                          paddingAngle={3}
                          label={({ name, percent }: any) =>
                            `${name} (${((percent || 0) * 100).toFixed(0)}%)`
                          }
                          labelLine={false}
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                        <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Chart 2: Monthly Verification Trends (Area Chart) */}
              <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        Monthly Verification &amp; Stamping Trends
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500">
                        Historical volume of Form VII verification certificates issued
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-64 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorVerif" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <RechartsTooltip />
                        <Area
                          type="monotone"
                          dataKey="verifications"
                          name="Certificates Issued"
                          stroke="#2563eb"
                          fillOpacity={1}
                          fill="url(#colorVerif)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* District Comparison & Equipment Category Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Chart 3: District-Wise Verification Count (Bar Chart - 2 cols) */}
              <Card className="lg:col-span-2 border-slate-200/80 dark:border-slate-800 shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-purple-600" />
                        District-Wise Verification &amp; Compliance Audit
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500">
                        Comparison of compliant units vs non-compliant / expired units by district
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-64 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={districtData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="district" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <RechartsTooltip />
                        <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                        <Bar dataKey="compliant" name="Compliant (Verified)" fill="#059669" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="nonCompliant" name="Non-Compliant / Expired" fill="#dc2626" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Chart 4: Category Distribution (1 col) */}
              <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Scale className="w-4 h-4 text-emerald-600" />
                    Category Breakdown
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Distribution by instrument family
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 pt-2">
                    {categoryData.map((cat, idx) => {
                      const pct = Math.round((cat.value / (metrics.totalInstruments || 1)) * 100);
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
                              {cat.name}
                            </span>
                            <span className="font-mono text-slate-500">
                              {cat.value} ({pct}%)
                            </span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-600 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Regulatory Risk Instruments Table (M11 Specification) */}
            <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-600" />
                    Top Priority Regulatory Risk Roster (M9/M11)
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Instruments dynamically ranked by 6-factor non-compliance score
                  </CardDescription>
                </div>
                <Button asChild variant="outline" size="sm" className="text-xs self-start sm:self-auto">
                  <Link to="/admin/risk">
                    <span>Full Risk Watchlist</span>
                    <ArrowUpRight className="w-3 h-3 ml-1" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950/60 border-y border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold">
                      <tr>
                        <th className="px-4 py-3">Digital ID &amp; Establishment</th>
                        <th className="px-4 py-3">District</th>
                        <th className="px-4 py-3 text-center">Score</th>
                        <th className="px-4 py-3">Primary Risk Factor</th>
                        <th className="px-4 py-3 text-right">Enforcement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {topRiskList.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/50 transition">
                          <td className="px-4 py-3">
                            <div className="font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span className="text-slate-400 font-normal">#{idx + 1}</span>
                              <span>{item.digital_id}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                              <Building className="w-3 h-3 text-slate-400" />
                              <span>{item.shop_name}</span>
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-800 dark:text-slate-200">
                              {item.district}
                            </div>
                            <div className="text-[10px] text-slate-400">{item.state}</div>
                          </td>

                          <td className="px-4 py-3 text-center">
                            <span
                              className={`font-mono font-extrabold text-sm ${
                                item.risk_band === "HIGH"
                                  ? "text-red-600"
                                  : item.risk_band === "MEDIUM"
                                  ? "text-amber-600"
                                  : "text-emerald-600"
                              }`}
                            >
                              {item.score}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">/100</span>
                          </td>

                          <td className="px-4 py-3 max-w-xs">
                            {item.factors.length > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200/60">
                                {item.factors[0].factor} (+{item.factors[0].points})
                              </span>
                            ) : (
                              <span className="text-[11px] text-emerald-600 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Compliant
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-right">
                            <Button asChild size="sm" variant="outline" className="text-xs h-7 px-2">
                              <Link to="/admin/risk">
                                <Send className="w-3 h-3 mr-1" />
                                <span>Inspect</span>
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboardPage;
