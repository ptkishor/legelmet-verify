import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FlaskConical,
  FileCheck2,
  CheckCircle2,
  FileText,
  PlusCircle,
  RefreshCw,
  XCircle,
  Thermometer,
  Zap,
  Clock,
  ArrowUpRight,
  Loader2,
  Shield,
} from "lucide-react";
import { toast } from "sonner";

export const GatcDashboardPage: React.FC = () => {
  const { profile } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGatcReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("test_reports")
        .select(`
          id,
          result,
          test_data,
          report_url,
          tested_at,
          instruments (
            id,
            digital_id,
            category,
            make,
            model,
            serial_no,
            shop_name
          )
        `)
        .order("tested_at", { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (err: any) {
      console.error(err);
      toast.error(`Failed to load GATC test reports: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGatcReports();
  }, []);

  const totalReports = reports.length;
  const approvedCount = reports.filter((r) => r.result === "approved").length;
  const rejectedCount = reports.filter((r) => r.result === "rejected").length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <FlaskConical className="w-6 h-6 text-amber-600" />
                GATC Pattern Approval Laboratory
              </h1>
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs font-semibold">
                Central Metrological Testing Facility
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Lead Metrologist: <span className="font-semibold text-slate-700 dark:text-slate-300">{profile?.full_name || "Dr. Meenakshi Sharma"}</span> •{" "}
              <span>OIML Statutory Standards Testing Division</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/gatc/test">
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white text-xs flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4" />
                <span>Conduct OIML Model Test</span>
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                loadGatcReports();
                toast.success("Lab records refreshed");
              }}
              className="text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Top Laboratory Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-medium text-slate-500">
                Pattern Evaluations
              </CardTitle>
              <FlaskConical className="w-4 h-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                {totalReports}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Laboratory model test certificates
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-medium text-slate-500">
                Approved Models
              </CardTitle>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-emerald-600">
                {approvedCount}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Conforms to OIML R 76-1 / R 117
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-medium text-slate-500">
                Rejected Prototypes
              </CardTitle>
              <XCircle className="w-4 h-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-red-600">
                {rejectedCount}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Failed environmental / drift tests
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-medium text-slate-500">
                Active Test Standards
              </CardTitle>
              <Shield className="w-4 h-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                3 Standards
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                OIML R 76, R 117, R 51
              </p>
            </CardContent>
          </Card>
        </div>

        {/* OIML Laboratory Testing Protocol Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
              <Thermometer className="w-4 h-4 text-amber-600" />
              Thermal Chamber Stability
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Models undergo a 48-hour thermal sweep from -10°C to +40°C in certified climate chambers. Maximum allowed span drift must remain within ±1 e.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-800 dark:text-indigo-300">
              <Zap className="w-4 h-4 text-indigo-600" />
              EMC & Electrical Immunity
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Instruments are subjected to 10 V/m RF field exposure (80 MHz to 2 GHz), electrostatic discharge (8 kV contact), and AC power line surges.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
              <Clock className="w-4 h-4 text-emerald-600" />
              Creep & Durability Endurance
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Full-load creep evaluation over 4 hours and 10,000 automated loading cycles to guarantee load cell resistance to mechanical fatigue.
            </p>
          </div>
        </div>

        {/* Tested Models Ledger */}
        <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-amber-600" />
                Model Pattern Approval Registry ({reports.length})
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Official model approvals issued under Legal Metrology (General) Rules 2011
              </CardDescription>
            </div>
            <Link to="/gatc/reports">
              <Button variant="ghost" size="sm" className="text-xs text-amber-700 dark:text-amber-400">
                View All Test Reports <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
                <p className="text-xs text-slate-500">Loading statutory pattern reports...</p>
              </div>
            ) : reports.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400 space-y-3">
                <p>No model pattern tests conducted yet.</p>
                <Link to="/gatc/test">
                  <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white text-xs">
                    Start New Evaluation Test
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950/60 border-y border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3">Approval Certificate No</th>
                      <th className="px-4 py-3">Make & Model</th>
                      <th className="px-4 py-3">Testing Standard</th>
                      <th className="px-4 py-3 text-center">Verdict</th>
                      <th className="px-4 py-3">Tested Date</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {reports.map((report) => {
                      const inst = report.instruments;
                      const approvalNumber =
                        report.test_data?.approval_number ||
                        `IND/09/2026/${report.id.slice(0, 4).toUpperCase()}`;

                      return (
                        <tr key={report.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/50 transition">
                          <td className="px-4 py-3.5">
                            <div className="font-mono font-bold text-slate-900 dark:text-white">
                              {approvalNumber}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              ID: {inst?.digital_id || "N/A"}
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              {inst ? `${inst.make} - ${inst.model}` : "Commercial Weighing Scale"}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {inst?.category || "Non-automatic Weighing Instrument"}
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-mono">
                              {report.test_data?.test_standard || "OIML R 76-1"}
                            </Badge>
                          </td>

                          <td className="px-4 py-3.5 text-center">
                            <Badge
                              className={`text-[10px] font-bold uppercase ${
                                report.result === "approved"
                                  ? "bg-emerald-600 text-white"
                                  : "bg-red-600 text-white"
                              }`}
                            >
                              {report.result}
                            </Badge>
                          </td>

                          <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">
                            {new Date(report.tested_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>

                          <td className="px-4 py-3.5 text-right">
                            <Link to="/gatc/reports">
                              <Button variant="outline" size="sm" className="text-xs h-7 px-2.5">
                                <FileText className="w-3 h-3 mr-1" />
                                View Report
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default GatcDashboardPage;
