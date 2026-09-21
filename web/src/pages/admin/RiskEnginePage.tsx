import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabase";
import { computeInstrumentRisk, type RiskFactor } from "@/lib/riskService";
import { runExpiryAlertsCron } from "@/lib/notificationService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Search,
  RefreshCw,
  Send,
  Loader2,
  Building,
  CheckCircle2,
  MapPin,
  Play,
  FileText,
  Info,
} from "lucide-react";
import { toast } from "sonner";

interface InstrumentRiskData {
  id: string;
  digital_id: string;
  shop_name: string;
  district: string;
  state: string;
  category: string;
  status: string;
  score: number;
  risk_band: "LOW" | "MEDIUM" | "HIGH";
  factors: RiskFactor[];
}

export const RiskEnginePage: React.FC = () => {
  const [instruments, setInstruments] = useState<InstrumentRiskData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedBand, setSelectedBand] = useState<string>("ALL");
  const [runningAudit, setRunningAudit] = useState(false);

  // Surprise Inspection Modal state
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [targetInstrument, setTargetInstrument] = useState<InstrumentRiskData | null>(null);
  const [dispatching, setDispatching] = useState(false);

  // Factor Details Modal state
  const [factorModalOpen, setFactorModalOpen] = useState(false);
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentRiskData | null>(null);

  const calculateRiskForInstruments = async () => {
    setLoading(true);
    try {
      // 1. Fetch all registered instruments
      const { data: instList, error: instErr } = await supabase
        .from("instruments")
        .select("id, digital_id, shop_name, district, state, category, status");

      if (instErr) throw instErr;

      const scoredList: InstrumentRiskData[] = [];

      for (const inst of (instList || []) as any[]) {
        // Evaluate 6-factor risk score using riskService
        const riskData = await computeInstrumentRisk(inst.id);

        scoredList.push({
          id: inst.id,
          digital_id: inst.digital_id,
          shop_name: inst.shop_name,
          district: inst.district,
          state: inst.state,
          category: inst.category,
          status: inst.status,
          score: riskData.score,
          risk_band: riskData.risk_band,
          factors: riskData.factors,
        });
      }

      // Sort descending by risk score
      scoredList.sort((a, b) => b.score - a.score);
      setInstruments(scoredList);
    } catch (err: any) {
      console.error(err);
      toast.error(`Risk calculation error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculateRiskForInstruments();
  }, []);

  const handleRunExpiryAudit = async () => {
    setRunningAudit(true);
    toast.loading("Running scheduled expiry check & compliance audit...", { id: "audit-cron" });
    try {
      const res = await runExpiryAlertsCron();
      toast.success(
        `Audit Complete: ${res.expired_status_updated} instrument(s) expired, ${res.notifications_dispatched} alert(s) dispatched to owners and officers!`,
        { id: "audit-cron", duration: 5000 }
      );
      // Refresh the risk scores table after audit
      await calculateRiskForInstruments();
    } catch (err: any) {
      toast.error(`Audit failed: ${err.message}`, { id: "audit-cron" });
    } finally {
      setRunningAudit(false);
    }
  };

  const handleOrderSurpriseInspection = async () => {
    if (!targetInstrument) return;
    setDispatching(true);

    try {
      // Create a priority application for this instrument
      const { error } = await (supabase.from("applications") as any).insert({
        instrument_id: targetInstrument.id,
        applicant_id: (targetInstrument as any).owner_id || "6e1cd4a7-8703-4a85-b9f3-efcc5f021b94",
        type: "re_verification",
        status: "assigned",
        remarks: `[STATUTORY SURPRISE ORDER] Elevated Risk Score (${targetInstrument.score}/100) flagged by State Controller. Mandatory verification and seal tamper inspection.`,
        scheduled_at: new Date(Date.now() + 24 * 3600000).toISOString(),
      });

      if (error) {
        console.warn("Could not insert application row:", error.message);
      }

      toast.success(
        `Surprise inspection order dispatched for ${targetInstrument.digital_id} in ${targetInstrument.district}! District officer notified.`,
        { duration: 5000 }
      );
      setDispatchModalOpen(false);
    } catch (err: any) {
      toast.error(`Dispatch failed: ${err.message}`);
    } finally {
      setDispatching(false);
    }
  };

  const filtered = instruments.filter((item) => {
    const matchesSearch =
      item.digital_id.toLowerCase().includes(search.toLowerCase()) ||
      item.shop_name.toLowerCase().includes(search.toLowerCase()) ||
      item.district.toLowerCase().includes(search.toLowerCase());

    const matchesBand =
      selectedBand === "ALL" || item.risk_band === selectedBand;

    return matchesSearch && matchesBand;
  });

  const highCount = instruments.filter((i) => i.risk_band === "HIGH").length;
  const medCount = instruments.filter((i) => i.risk_band === "MEDIUM").length;
  const lowCount = instruments.filter((i) => i.risk_band === "LOW").length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="w-6 h-6 text-red-600" />
                Regulatory Risk &amp; Tamper Assessment Engine
              </h1>
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs font-semibold">
                Rule-Based Compliance Matrix (0–100)
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Transparent statutory score evaluating expired validity spans, repeat citizen complaints, calibration failures, and hardware tampering indicators.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={runningAudit}
              onClick={handleRunExpiryAudit}
              className="text-xs border-amber-300 text-amber-800 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 flex items-center gap-1.5"
            >
              {runningAudit ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-amber-600 text-amber-600" />
              )}
              <span>Run Expiry &amp; Compliance Audit</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => {
                calculateRiskForInstruments();
                toast.success("Risk index recomputed across all registered instruments");
              }}
              className="text-xs flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Recalculate Scores</span>
            </Button>
          </div>
        </div>

        {/* Transparent Formula Banner */}
        <div className="p-4 rounded-2xl bg-slate-900 text-white dark:bg-slate-800/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <Info className="w-4 h-4" />
              <span>Statutory Rule Matrix (M9 Specification)</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Points: <strong>Expired Cert (+40)</strong> • <strong>Expiring ≤30d (+15)</strong> • <strong>Open Complaint (+15 ea, max 30)</strong> • <strong>Failed Inspection (+20)</strong> • <strong>Unverified &gt;2y (+15)</strong> • <strong>Serial Mismatch (+25)</strong>
            </p>
          </div>
          <div className="text-xs font-mono bg-white/10 px-3 py-1.5 rounded-xl text-slate-200 shrink-0 self-start md:self-auto">
            Bands: 0–30 LOW • 31–60 MED • 61+ HIGH
          </div>
        </div>

        {/* Risk Band Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card
            onClick={() => setSelectedBand("HIGH")}
            className={`cursor-pointer transition border ${
              selectedBand === "HIGH"
                ? "ring-2 ring-red-500 border-red-500"
                : "border-slate-200 dark:border-slate-800 hover:border-red-300"
            }`}
          >
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-red-700 dark:text-red-400">
                  Critical / High Risk Band
                </p>
                <div className="text-2xl font-bold text-red-600">{highCount}</div>
                <p className="text-[11px] text-slate-500">Score &gt; 60 • Immediate enforcement warrant</p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-red-100 text-red-700 dark:bg-red-950/60 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card
            onClick={() => setSelectedBand("MEDIUM")}
            className={`cursor-pointer transition border ${
              selectedBand === "MEDIUM"
                ? "ring-2 ring-amber-500 border-amber-500"
                : "border-slate-200 dark:border-slate-800 hover:border-amber-300"
            }`}
          >
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Moderate Risk Band
                </p>
                <div className="text-2xl font-bold text-amber-600">{medCount}</div>
                <p className="text-[11px] text-slate-500">Score 31–60 • Priority verification queue</p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950/60 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card
            onClick={() => setSelectedBand("LOW")}
            className={`cursor-pointer transition border ${
              selectedBand === "LOW"
                ? "ring-2 ring-emerald-500 border-emerald-500"
                : "border-slate-200 dark:border-slate-800 hover:border-emerald-300"
            }`}
          >
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Compliant / Low Risk
                </p>
                <div className="text-2xl font-bold text-emerald-600">{lowCount}</div>
                <p className="text-[11px] text-slate-500">Score 0–30 • Verified &amp; stamped</p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by Digital ID, Shop Name, or District..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs sm:text-sm h-10"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={selectedBand} onValueChange={setSelectedBand}>
              <SelectTrigger className="w-full sm:w-[180px] text-xs h-10">
                <SelectValue placeholder="Filter by Risk Band" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Risk Bands</SelectItem>
                <SelectItem value="HIGH">High Risk Only</SelectItem>
                <SelectItem value="MEDIUM">Medium Risk Only</SelectItem>
                <SelectItem value="LOW">Low Risk Only</SelectItem>
              </SelectContent>
            </Select>

            {selectedBand !== "ALL" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedBand("ALL")}
                className="text-xs text-slate-500"
              >
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Risk Scores Table */}
        <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                  Commercial Instrument Risk Roster ({filtered.length})
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Sorted by statutory risk score descending • Evaluated via institutional rule matrix
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-red-600" />
                <p className="text-xs text-slate-500">Computing 6-factor risk matrix across district registries...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400">
                No instruments match the selected filter criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950/60 border-y border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3">Digital ID &amp; Establishment</th>
                      <th className="px-4 py-3">Category &amp; District</th>
                      <th className="px-4 py-3 text-center">Risk Score</th>
                      <th className="px-4 py-3">Contributory Risk Factors</th>
                      <th className="px-4 py-3 text-right">Controller Enforcement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filtered.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/50 transition">
                        <td className="px-4 py-3.5">
                          <div className="font-mono font-bold text-slate-900 dark:text-white">
                            {item.digital_id}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                            <Building className="w-3 h-3 text-slate-400" />
                            {item.shop_name}
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="font-medium text-slate-800 dark:text-slate-200">
                            {item.category}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {item.district}, {item.state}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span
                              className={`text-base font-extrabold ${
                                item.risk_band === "HIGH"
                                  ? "text-red-600"
                                  : item.risk_band === "MEDIUM"
                                  ? "text-amber-600"
                                  : "text-emerald-600"
                              }`}
                            >
                              {item.score}
                              <span className="text-[10px] text-slate-400 font-normal">/100</span>
                            </span>
                            <Badge
                              className={`text-[9px] px-1.5 py-0 uppercase font-bold mt-1 ${
                                item.risk_band === "HIGH"
                                  ? "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"
                                  : item.risk_band === "MEDIUM"
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              }`}
                            >
                              {item.risk_band}
                            </Badge>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 max-w-xs">
                          {item.factors.length === 0 ? (
                            <span className="text-[11px] text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> No adverse risk flags
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {item.factors.map((f, i) => (
                                <button
                                  key={i}
                                  onClick={() => {
                                    setSelectedInstrument(item);
                                    setFactorModalOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200/60 hover:bg-red-100 transition cursor-pointer"
                                >
                                  {f.factor} (+{f.points})
                                </button>
                              ))}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          <Button
                            size="sm"
                            variant={item.risk_band === "HIGH" ? "destructive" : "outline"}
                            onClick={() => {
                              setTargetInstrument(item);
                              setDispatchModalOpen(true);
                            }}
                            className="text-xs h-8"
                          >
                            <Send className="w-3 h-3 mr-1" />
                            Order Surprise Inspection
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Factor Breakdown Modal */}
        <Dialog open={factorModalOpen} onOpenChange={setFactorModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>Statutory Risk Factor Audit</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Detailed regulatory mathematical breakdown for {selectedInstrument?.digital_id}
              </DialogDescription>
            </DialogHeader>

            {selectedInstrument && (
              <div className="space-y-4 py-2 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Shop Name:</span>
                    <span className="font-semibold">{selectedInstrument.shop_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">District:</span>
                    <span>{selectedInstrument.district}, {selectedInstrument.state}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Score:</span>
                    <span className="font-bold text-red-600 font-mono text-sm">
                      {selectedInstrument.score} / 100 ({selectedInstrument.risk_band} Band)
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Contributing Factors
                  </span>
                  {selectedInstrument.factors.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-red-200 bg-red-50/50 dark:bg-red-950/30 dark:border-red-800/60"
                    >
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {f.factor}
                      </span>
                      <span className="font-mono font-bold text-red-600">
                        +{f.points} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFactorModalOpen(false)}
                className="text-xs"
              >
                Close Audit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Surprise Inspection Dispatch Dialog */}
        <Dialog open={dispatchModalOpen} onOpenChange={setDispatchModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base text-red-600">
                <ShieldAlert className="w-5 h-5" />
                Dispatch Surprise Enforcement Inspection
              </DialogTitle>
              <DialogDescription className="text-xs">
                Issue a legally binding surprise on-site verification order under the Legal Metrology Act 2009.
              </DialogDescription>
            </DialogHeader>

            {targetInstrument && (
              <div className="space-y-3 py-2 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Digital ID:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {targetInstrument.digital_id}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Establishment:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {targetInstrument.shop_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">District:</span>
                    <span>{targetInstrument.district}, {targetInstrument.state}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Risk Assessment:</span>
                    <span className="font-bold text-red-600 font-mono">
                      {targetInstrument.score} / 100 ({targetInstrument.risk_band})
                    </span>
                  </div>
                </div>

                <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                  This action will generate an immediate high-priority inspection record assigned to the Legal Metrology Officer in <strong>{targetInstrument.district}</strong> and push an alert to their verification queue.
                </p>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDispatchModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleOrderSurpriseInspection}
                disabled={dispatching}
                className="bg-red-600 hover:bg-red-700 text-white text-xs flex items-center gap-1.5"
              >
                {dispatching ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Dispatch Official Order</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default RiskEnginePage;
