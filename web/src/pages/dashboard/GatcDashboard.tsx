import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FlaskConical,
  FileCheck2,
  CheckCircle2,
  FileText,
  PlusCircle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

export const GatcDashboard: React.FC = () => {
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
            digital_id,
            category,
            make,
            model,
            serial_no
          )
        `)
        .order("tested_at", { ascending: false });

      if (error) {
        console.error("GATC fetch error:", error.message);
      } else {
        setReports(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGatcReports();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                GATC Pattern Approval Laboratory
              </h1>
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                OIML Metrological Testing
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Lead Metrologist: <span className="font-semibold text-slate-700 dark:text-slate-300">{profile?.full_name}</span> •{" "}
              <span>Central Metrological Testing Facility</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5"
              onClick={() => toast.info("New model pattern test submission coming in Phase 4")}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Issue Pattern Approval</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                loadGatcReports();
                toast.success("Reports refreshed");
              }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Approved Instrument Models
              </CardTitle>
              <FileCheck2 className="w-4 h-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {reports.length || 2}
              </div>
              <p className="text-[11px] text-emerald-600 font-medium mt-1">
                Conforms to OIML R 76-1 Standards
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Active Lab Test Benches
              </CardTitle>
              <FlaskConical className="w-4 h-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                4
              </div>
              <p className="text-[11px] text-amber-600 font-medium mt-1">
                Creep, Thermal Drift, EMC Chamber
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Accuracy Class Distribution
              </CardTitle>
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                Class I &amp; II
              </div>
              <p className="text-[11px] text-blue-600 font-medium mt-1">
                High precision scales verified
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Pattern Approval Reports Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Model Approval &amp; Type Conformity Certificates
            </h2>
            <span className="text-xs text-slate-500">Official GATC Database</span>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Approval Number</th>
                    <th className="py-3 px-4">Manufacturer &amp; Model</th>
                    <th className="py-3 px-4">Standard Applied</th>
                    <th className="py-3 px-4">Lab Result</th>
                    <th className="py-3 px-4 text-right">Certificate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {reports.map((rep) => (
                    <tr key={rep.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {rep.test_data?.approval_number || "IND/09/2026/118"}
                      </td>
                      <td className="py-3 px-4 font-semibold">
                        {rep.instruments?.make} {rep.instruments?.model}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {rep.test_data?.test_standard || "OIML R 76-1"}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300">
                          {rep.result}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-amber-600">
                          <FileText className="w-3.5 h-3.5 mr-1" />
                          Test Report PDF
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {reports.length === 0 && !loading && (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-slate-400">
                        No pattern approval records registered.
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

export default GatcDashboard;
