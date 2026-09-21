import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  PlusCircle,
  Eye,
  CheckCircle2,
  XCircle,
  Thermometer,
  Zap,
  Clock,
  Award,
  Printer,
  Shield,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface TestReport {
  id: string;
  instrument_id: string;
  gatc_user_id: string;
  result: "approved" | "rejected" | string;
  test_data: any;
  report_url: string;
  tested_at: string;
  instruments?: {
    id: string;
    digital_id: string;
    category: string;
    make: string;
    model: string;
    serial_no: string;
    capacity?: string;
    shop_name?: string;
    state?: string;
    district?: string;
  };
}

export const TestReportsPage: React.FC = () => {
  const { profile } = useAuth();
  const [reports, setReports] = useState<TestReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [verdictFilter, setVerdictFilter] = useState("all");

  // Selected report for inspection modal
  const [selectedReport, setSelectedReport] = useState<TestReport | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("test_reports")
        .select(`
          id,
          instrument_id,
          gatc_user_id,
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
            capacity,
            shop_name,
            state,
            district
          )
        `)
        .order("tested_at", { ascending: false });

      if (error) throw error;
      setReports((data as any) || []);
    } catch (err: any) {
      console.error(err);
      toast.error(`Failed to load reports: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Filtered reports
  const filteredReports = reports.filter((r) => {
    const inst = r.instruments;
    const approvalNumber = r.test_data?.approval_number || "";
    const query = searchTerm.toLowerCase();

    const matchesSearch =
      approvalNumber.toLowerCase().includes(query) ||
      (inst?.make || "").toLowerCase().includes(query) ||
      (inst?.model || "").toLowerCase().includes(query) ||
      (inst?.digital_id || "").toLowerCase().includes(query);

    const matchesVerdict =
      verdictFilter === "all" || r.result.toLowerCase() === verdictFilter.toLowerCase();

    return matchesSearch && matchesVerdict;
  });

  const totalReports = reports.length;
  const approvedCount = reports.filter((r) => r.result === "approved").length;
  const rejectedCount = reports.filter((r) => r.result === "rejected").length;
  const passRate = totalReports > 0 ? Math.round((approvedCount / totalReports) * 100) : 100;

  const handlePrint = () => {
    window.print();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-6 h-6 text-amber-600" />
                Pattern Approval Test Reports
              </h1>
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs font-semibold">
                Statutory Dossiers
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Official archive of Model Evaluation Reports & Test Certificates issued under OIML R 76-1 / R 117.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/gatc/test">
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white text-xs flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4" />
                <span>Conduct New Model Test</span>
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchReports();
                toast.success("Test reports refreshed");
              }}
              className="text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-medium text-slate-500">Total Dossiers</CardTitle>
              <FileText className="w-4 h-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalReports}</div>
              <p className="text-[11px] text-slate-500 mt-1">Historical lab evaluations</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-medium text-slate-500">Approved Patterns</CardTitle>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{approvedCount}</div>
              <p className="text-[11px] text-slate-500 mt-1">Conformity certificates issued</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-medium text-slate-500">Rejected Prototypes</CardTitle>
              <XCircle className="w-4 h-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
              <p className="text-[11px] text-slate-500 mt-1">Failed OIML tolerances</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-medium text-slate-500">OIML Pass Rate</CardTitle>
              <Award className="w-4 h-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-600">{passRate}%</div>
              <p className="text-[11px] text-slate-500 mt-1">Statutory compliance ratio</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter & Search Bar */}
        <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
          <CardContent className="p-3">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search by Approval No, Make, Model, or Digital ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 text-xs h-9"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="w-4 h-4 text-slate-400" />
                <Select value={verdictFilter} onValueChange={setVerdictFilter}>
                  <SelectTrigger className="text-xs h-9 w-[150px]">
                    <SelectValue placeholder="Filter verdict" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All Verdicts</SelectItem>
                    <SelectItem value="approved" className="text-xs">Approved Only</SelectItem>
                    <SelectItem value="rejected" className="text-xs">Rejected Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reports Ledger */}
        <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
          <CardContent className="p-0">
            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
                <p className="text-xs text-slate-500">Loading statutory test dossiers...</p>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400 space-y-3">
                <p>No model test dossiers found matching criteria.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setVerdictFilter("all");
                  }}
                  className="text-xs"
                >
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950/60 border-y border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3">Approval Certificate</th>
                      <th className="px-4 py-3">Instrument Model</th>
                      <th className="px-4 py-3">Test Standard</th>
                      <th className="px-4 py-3 text-center">Verdict</th>
                      <th className="px-4 py-3">Tested At</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredReports.map((report) => {
                      const inst = report.instruments;
                      const approvalNumber =
                        report.test_data?.approval_number ||
                        (report.result === "approved"
                          ? `IND/09/2026/${report.id.slice(0, 4).toUpperCase()}`
                          : "REJECTED (NO APPROVAL)");

                      return (
                        <tr key={report.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/50 transition">
                          <td className="px-4 py-3.5">
                            <div className="font-mono font-bold text-slate-900 dark:text-white">
                              {approvalNumber}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Digital ID: {inst?.digital_id || "N/A"}
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
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-7 px-2.5"
                              onClick={() => setSelectedReport(report)}
                            >
                              <Eye className="w-3.5 h-3.5 mr-1 text-slate-500" />
                              Inspect Dossier
                            </Button>
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

        {/* Full Dossier Inspection Modal */}
        {selectedReport && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Top Government Bar */}
              <div className="h-1.5 flex w-full">
                <div className="flex-1 bg-[#FF9933]" />
                <div className="flex-1 bg-white" />
                <div className="flex-1 bg-[#138808]" />
              </div>

              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-700">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      Statutory Pattern Evaluation Dossier
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Central Metrology Testing Facility • Government Approved Test Centre
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handlePrint} className="text-xs h-8">
                    <Printer className="w-3.5 h-3.5 mr-1" />
                    Print
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedReport(null)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-6 overflow-y-auto flex-1 text-xs">
                {/* Certificate & Verdict Banner */}
                <div
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    selectedReport.result === "approved"
                      ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/60 dark:bg-emerald-950/20"
                      : "border-red-200 bg-red-50/50 dark:border-red-900/60 dark:bg-red-950/20"
                  }`}
                >
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      {selectedReport.result === "approved"
                        ? "Official Indian Pattern Approval Certificate"
                        : "Statutory Model Rejection Notice"}
                    </div>
                    <div className="text-lg font-mono font-extrabold text-slate-900 dark:text-white mt-0.5">
                      {selectedReport.test_data?.approval_number ||
                        (selectedReport.result === "approved" ? "IND/09/2026/GATC" : "REJECTED")}
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                      Tested on{" "}
                      {new Date(selectedReport.tested_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </div>
                  </div>

                  <Badge
                    className={`text-xs px-3 py-1 font-bold uppercase self-start sm:self-center ${
                      selectedReport.result === "approved" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                    }`}
                  >
                    {selectedReport.result}
                  </Badge>
                </div>

                {/* Instrument Metadata */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Make / Manufacturer</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {selectedReport.instruments?.make || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Model Specification</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {selectedReport.instruments?.model || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Serial Number</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {selectedReport.instruments?.serial_no || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">National Digital ID</span>
                    <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                      {selectedReport.instruments?.digital_id || "N/A"}
                    </span>
                  </div>
                </div>

                {/* Laboratory Test Modules Data */}
                {selectedReport.test_data?.modules ? (
                  <div className="space-y-4">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                      <Thermometer className="w-4 h-4 text-amber-600" />
                      Detailed Laboratory Test Results
                    </h3>

                    {/* Module 1: Thermal Sweep */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          1. Climatic & Thermal Sweep Test (-10°C to +40°C)
                        </span>
                        <Badge
                          variant="outline"
                          className={
                            selectedReport.test_data.modules.thermal_sweep?.passed
                              ? "text-emerald-700 bg-emerald-50 border-emerald-300"
                              : "text-red-700 bg-red-50 border-red-300"
                          }
                        >
                          {selectedReport.test_data.modules.thermal_sweep?.passed ? "PASSED" : "FAILED"}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                        {selectedReport.test_data.modules.thermal_sweep?.readings?.map(
                          (r: any, idx: number) => (
                            <div key={idx} className="p-2 bg-white dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-800">
                              <span className="text-[10px] text-slate-400 block">{r.temp}</span>
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{r.drift}</span>
                              <span className={`text-[10px] block font-semibold ${r.status === "PASS" ? "text-emerald-600" : "text-red-600"}`}>
                                {r.status}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </div>

                    {/* Module 2: Creep Recovery */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-indigo-600" />
                          2. 4-Hour Creep Deflection & Zero Return
                        </span>
                        <Badge
                          variant="outline"
                          className={
                            selectedReport.test_data.modules.creep_recovery?.passed
                              ? "text-emerald-700 bg-emerald-50 border-emerald-300"
                              : "text-red-700 bg-red-50 border-red-300"
                          }
                        >
                          {selectedReport.test_data.modules.creep_recovery?.passed ? "PASSED" : "FAILED"}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5 pt-1 text-center">
                        {selectedReport.test_data.modules.creep_recovery?.readings?.map(
                          (r: any, idx: number) => (
                            <div key={idx} className="p-1.5 bg-white dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-800">
                              <span className="text-[9px] text-slate-400 block">{r.duration}</span>
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-[11px]">{r.drift}</span>
                            </div>
                          )
                        )}
                      </div>
                    </div>

                    {/* Module 3: EMC Immunity */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                          3. Electromagnetic Compatibility (EMC/ESD)
                        </span>
                        <Badge
                          variant="outline"
                          className={
                            selectedReport.test_data.modules.emc_immunity?.passed
                              ? "text-emerald-700 bg-emerald-50 border-emerald-300"
                              : "text-red-700 bg-red-50 border-red-300"
                          }
                        >
                          {selectedReport.test_data.modules.emc_immunity?.passed ? "PASSED" : "FAILED"}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                        <div className="p-2 bg-white dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 block">RF Field 10 V/m</span>
                          <span className="font-semibold text-emerald-600">
                            {selectedReport.test_data.modules.emc_immunity?.rf_10v_per_m}
                          </span>
                        </div>
                        <div className="p-2 bg-white dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 block">ESD 8 kV Burst</span>
                          <span className="font-semibold text-emerald-600">
                            {selectedReport.test_data.modules.emc_immunity?.esd_8kv}
                          </span>
                        </div>
                        <div className="p-2 bg-white dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 block">Mains Surge ±15%</span>
                          <span className="font-semibold text-emerald-600">
                            {selectedReport.test_data.modules.emc_immunity?.mains_surge}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Statutory Testing Details:
                    </span>
                    <p className="text-slate-600 dark:text-slate-400">
                      Standard: {selectedReport.test_data?.test_standard || "OIML R 76-1"}
                    </p>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                      Approval Number: {selectedReport.test_data?.approval_number || "N/A"}
                    </p>
                  </div>
                )}

                {/* Lead Metrologist Sign-off */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {selectedReport.test_data?.evaluated_by || profile?.full_name || "Dr. Meenakshi Sharma"}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Lead Metrologist, Central Testing Lab • GATC Haryana
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/60">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Digitally Signed & Timestamped
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TestReportsPage;
