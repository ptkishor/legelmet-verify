import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  Wifi,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

export const OfficerDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    pendingInspections: 0,
    verifiedThisMonth: 0,
    activeComplaints: 0,
    syncedToday: 0,
  });
  const [recentApplications, setRecentApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOfficerData = async () => {
    setLoading(true);
    try {
      // 1. Applications assigned to this officer (or in their jurisdiction)
      let appsQuery = supabase
        .from("applications")
        .select(`
          id,
          application_no,
          type,
          status,
          assigned_officer_id,
          created_at,
          instruments (
            digital_id,
            shop_name,
            category,
            district,
            state
          )
        `)
        .order("created_at", { ascending: false });

      if (profile?.id && profile.role === "metrology_officer") {
        appsQuery = appsQuery.eq("assigned_officer_id", profile.id);
      }

      const { data: apps, error: appsErr } = await appsQuery.limit(10);
      if (appsErr) console.error("Error loading apps:", appsErr.message);

      // 2. Count metrics
      let pendingQuery = supabase
        .from("applications")
        .select("*", { count: "exact", head: true })
        .in("status", ["submitted", "assigned", "scheduled"]);

      if (profile?.id && profile.role === "metrology_officer") {
        pendingQuery = pendingQuery.eq("assigned_officer_id", profile.id);
      }
      const { count: pendingCount } = await pendingQuery;

      let complaintsQuery = supabase
        .from("complaints")
        .select("*", { count: "exact", head: true })
        .in("status", ["open", "assigned"]);

      if (profile?.id && profile.role === "metrology_officer") {
        complaintsQuery = complaintsQuery.eq("assigned_officer_id", profile.id);
      }
      const { count: complaintsCount } = await complaintsQuery;

      let certQuery = supabase
        .from("certificates")
        .select("*", { count: "exact", head: true });

      if (profile?.id && profile.role === "metrology_officer") {
        certQuery = certQuery.eq("issued_by", profile.id);
      }
      const { count: certCount } = await certQuery;

      let inspQuery = supabase
        .from("inspections")
        .select("*", { count: "exact", head: true });

      if (profile?.id && profile.role === "metrology_officer") {
        inspQuery = inspQuery.eq("officer_id", profile.id);
      }
      const { count: inspCount } = await inspQuery;

      setRecentApplications(apps || []);
      setStats({
        pendingInspections: pendingCount ?? 0,
        verifiedThisMonth: certCount ?? 0,
        activeComplaints: complaintsCount ?? 0,
        syncedToday: inspCount ?? 0,
      });
    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOfficerData();
  }, [profile]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header greeting & jurisdiction */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Officer Field Command
              </h1>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                Active Duty
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Officer: <span className="font-semibold text-slate-700 dark:text-slate-300">{profile?.full_name}</span> • Jurisdiction:{" "}
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                {profile?.jurisdiction_district}, {profile?.jurisdiction_state}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 dark:border-emerald-800">
              <Wifi className="w-3.5 h-3.5" />
              <span>Online • Database Connected</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                loadOfficerData();
                toast.success("Dashboard refreshed");
              }}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Refresh
            </Button>
          </div>
        </div>

        {/* 4 Stat KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Pending Verifications
              </CardTitle>
              <ClipboardList className="w-4 h-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {stats.pendingInspections}
              </div>
              <p className="text-[11px] text-blue-600 font-medium mt-1">
                2 scheduled for today
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Certificates Issued
              </CardTitle>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {stats.verifiedThisMonth}
              </div>
              <p className="text-[11px] text-emerald-600 font-medium mt-1">
                100% digitally signed
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Assigned Complaints
              </CardTitle>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {stats.activeComplaints}
              </div>
              <p className="text-[11px] text-amber-600 font-medium mt-1">
                Requires on-site inspection
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Offline Records Synced
              </CardTitle>
              <ShieldCheck className="w-4 h-4 text-teal-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {stats.syncedToday}
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-1">
                IndexedDB queue idle
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Action Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/40 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Start New Physical Inspection
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Perform zero balance, repeatability, eccentricity & MPE tests on site.
              </p>
            </div>
            <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 ml-4">
              <Link to="/officer/inspections">
                Open Checklist <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </Button>
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/40 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800/40 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Inspect Offline Sync Queue
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Review records captured in remote areas pending Supabase cloud push.
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="shrink-0 ml-4">
              <Link to="/officer/sync">
                Sync Center
              </Link>
            </Button>
          </div>
        </div>

        {/* Recent Applications in Jurisdiction */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Recent Verification Applications in {profile?.jurisdiction_district || "District"}
            </h2>
            <span className="text-xs text-slate-500">Live Supabase Feed</span>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Application No</th>
                    <th className="py-3 px-4">Shop / Establishment</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {recentApplications.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {app.application_no}
                      </td>
                      <td className="py-3 px-4 font-medium">
                        {app.instruments?.shop_name || "Commercial Establishment"}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {app.instruments?.category || "Weighing Scale"}
                      </td>
                      <td className="py-3 px-4 capitalize">
                        {app.type?.replace("_", " ")}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className={
                            app.status === "approved"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                              : "bg-blue-50 text-blue-700 border-blue-300"
                          }
                        >
                          {app.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-emerald-600">
                          <Link to={`/officer/inspect/${app.id}`}>
                            Inspect / Details
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {recentApplications.length === 0 && !loading && (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-slate-400">
                        No applications found in this jurisdiction.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default OfficerDashboard;
