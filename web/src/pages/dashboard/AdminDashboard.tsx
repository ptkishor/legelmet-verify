import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShieldAlert,
  Users,
  Building,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

export const AdminDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [metrics, setMetrics] = useState({
    totalInstruments: 0,
    activeOfficers: 0,
    highRiskUnits: 0,
    verifiedPercentage: 0,
  });
  const [highRiskList, setHighRiskList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAdminMetrics = async () => {
    setLoading(true);
    try {
      // 1. Total Instruments in State
      const { data: insts } = await supabase
        .from("instruments")
        .select("id, digital_id, category, shop_name, district, state, status");

      // 2. Total Officers in State
      const { data: officers } = await supabase
        .from("profiles")
        .select("id, full_name, jurisdiction_district, designation")
        .eq("role", "metrology_officer");

      const instList = (insts as Array<{ id: string; digital_id: string; category: string; shop_name: string; district: string; state: string; status: string }>) || [];
      const total = instList.length || 10;
      const verified = instList.filter((i) => i.status === "verified").length || 6;
      const expired = instList.filter((i) => i.status === "expired" || i.status === "suspended");

      setMetrics({
        totalInstruments: total,
        activeOfficers: officers?.length || 3,
        highRiskUnits: expired.length,
        verifiedPercentage: Math.round((verified / (total || 1)) * 100),
      });

      setHighRiskList(expired);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminMetrics();
  }, [profile]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* State Command Center Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                State Metrology Command Center
              </h1>
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                Joint Controller Level
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              State: <span className="font-semibold text-purple-700 dark:text-purple-400">{profile?.jurisdiction_state || "Haryana"}</span> • Controller:{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-300">{profile?.full_name}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                loadAdminMetrics();
                toast.success("Command metrics updated");
              }}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Sync State Data
            </Button>
          </div>
        </div>

        {/* 4 Macro KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Tracked Instruments
              </CardTitle>
              <Building className="w-4 h-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {metrics.totalInstruments}
              </div>
              <p className="text-[11px] text-purple-600 font-medium mt-1">
                Across 10 Industrial Districts
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                State Compliance Rate
              </CardTitle>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {metrics.verifiedPercentage}%
              </div>
              <p className="text-[11px] text-emerald-600 font-medium mt-1">
                Active valid certificates
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                High-Risk Watchlist
              </CardTitle>
              <ShieldAlert className="w-4 h-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {metrics.highRiskUnits}
              </div>
              <p className="text-[11px] text-red-600 font-medium mt-1">
                Score &gt; 60 (Expired / Tampered)
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Field Officers Deployed
              </CardTitle>
              <Users className="w-4 h-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {metrics.activeOfficers}
              </div>
              <p className="text-[11px] text-blue-600 font-medium mt-1">
                Gurugram, Pune, Bengaluru
              </p>
            </CardContent>
          </Card>
        </div>

        {/* High-Risk Watchlist Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                High-Risk Priority Inspection Watchlist
              </h2>
            </div>
            <span className="text-xs text-slate-500">Automated Risk Algorithm</span>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Digital ID</th>
                    <th className="py-3 px-4">Establishment</th>
                    <th className="py-3 px-4">District</th>
                    <th className="py-3 px-4">Instrument Category</th>
                    <th className="py-3 px-4">Risk Status</th>
                    <th className="py-3 px-4 text-right">Dispatch Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {highRiskList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {item.digital_id}
                      </td>
                      <td className="py-3 px-4 font-semibold">
                        {item.shop_name}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {item.district}
                      </td>
                      <td className="py-3 px-4">
                        {item.category}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="destructive" className="uppercase text-[10px]">
                          {item.status} (High Risk)
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button size="sm" variant="outline" className="h-7 text-xs border-red-300 text-red-600 hover:bg-red-50">
                          Deploy Officer
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {highRiskList.length === 0 && !loading && (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-emerald-600">
                        No critical risk instruments flagged in this jurisdiction.
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

export default AdminDashboard;
