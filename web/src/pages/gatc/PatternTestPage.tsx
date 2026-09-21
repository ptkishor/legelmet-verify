import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FlaskConical,
  CheckCircle2,
  XCircle,
  Thermometer,
  Zap,
  Clock,
  Sparkles,
  ArrowLeft,
  FileCheck2,
  ShieldAlert,
  Loader2,
  Sliders,
  Award,
} from "lucide-react";
import { toast } from "sonner";

interface InstrumentOption {
  id: string;
  digital_id: string;
  make: string;
  model: string;
  category: string;
  serial_no: string;
  capacity?: string;
  shop_name?: string;
  state: string;
}

export const PatternTestPage: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [instruments, setInstruments] = useState<InstrumentOption[]>([]);
  const [loadingInstruments, setLoadingInstruments] = useState(true);
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Test Standard
  const [testStandard, setTestStandard] = useState("OIML R 76-1 (Class III Weighing)");

  // Module 1: Thermal Chamber Test (-10°C to +40°C)
  const [tempNeg10Drift, setTempNeg10Drift] = useState<number>(0.2); // in 'e'
  const [temp20Drift, setTemp20Drift] = useState<number>(0.0); // reference
  const [temp40Drift, setTemp40Drift] = useState<number>(0.4); // in 'e'
  const tempMpe = 1.0; // MPE is 1.0e

  // Module 2: 4-Hour Creep & Recovery Test
  const [creep0h, setCreep0h] = useState<number>(0.0);
  const [creep1h, setCreep1h] = useState<number>(0.1);
  const [creep2h, setCreep2h] = useState<number>(0.2);
  const [creep4h, setCreep4h] = useState<number>(0.3); // in 'e'
  const [creepZeroReturn, setCreepZeroReturn] = useState<number>(0.1); // zero return error
  const creepMpe = 0.5;

  // Module 3: Electromagnetic Compatibility (EMC/ESD)
  const [emcRfImmunity, setEmcRfImmunity] = useState<boolean>(true); // 10 V/m
  const [emcEsdImmunity, setEmcEsdImmunity] = useState<boolean>(true); // 8 kV contact
  const [emcVoltageMains, setEmcVoltageMains] = useState<boolean>(true); // 230V ±15%

  // Module 4: Eccentricity / Corner Loading (1/3 Max Load)
  const [corner1Error, setCorner1Error] = useState<number>(0.2);
  const [corner2Error, setCorner2Error] = useState<number>(0.3);
  const [corner3Error, setCorner3Error] = useState<number>(0.2);
  const [corner4Error, setCorner4Error] = useState<number>(0.1);
  const cornerMpe = 1.0;

  // Module 5: Overload & Mechanical Endurance
  const [enduranceCyclesPassed, setEnduranceCyclesPassed] = useState<boolean>(true);
  const [enduranceRemarks, setEnduranceRemarks] = useState<string>(
    "No mechanical deformation observed after 10,000 load cycles."
  );

  // Overall Verdict & Pattern Approval Number
  const [approvalNumber, setApprovalNumber] = useState<string>("");
  const [evaluationRemarks, setEvaluationRemarks] = useState<string>(
    "Conforms fully to statutory model approval specifications under Legal Metrology (Approval of Models) Rules 2011."
  );

  // Success dialog state
  const [successReport, setSuccessReport] = useState<any | null>(null);

  // Load available instruments for testing
  useEffect(() => {
    const fetchInstruments = async () => {
      setLoadingInstruments(true);
      try {
        const { data, error } = await supabase
          .from("instruments")
          .select("id, digital_id, make, model, category, serial_no, capacity, shop_name, state")
          .order("created_at", { ascending: false });

        if (error) throw error;
        const instList = (data || []) as InstrumentOption[];
        setInstruments(instList);
        if (instList.length > 0) {
          setSelectedInstrumentId(instList[0].id);
        }
      } catch (err: any) {
        console.error(err);
        toast.error(`Failed to load instruments: ${err.message}`);
      } finally {
        setLoadingInstruments(false);
      }
    };

    fetchInstruments();
  }, []);

  // Generate suggested approval number when selected instrument changes
  useEffect(() => {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    setApprovalNumber(`IND/09/2026/${randomSuffix}`);
  }, [selectedInstrumentId]);

  const selectedInst = instruments.find((i) => i.id === selectedInstrumentId);

  // Evaluated statuses
  const thermalPass =
    Math.abs(tempNeg10Drift) <= tempMpe &&
    Math.abs(temp20Drift) <= tempMpe &&
    Math.abs(temp40Drift) <= tempMpe;

  const creepPass =
    Math.abs(creep4h) <= creepMpe && Math.abs(creepZeroReturn) <= 0.5;

  const emcPass = emcRfImmunity && emcEsdImmunity && emcVoltageMains;

  const eccentricityPass =
    Math.abs(corner1Error) <= cornerMpe &&
    Math.abs(corner2Error) <= cornerMpe &&
    Math.abs(corner3Error) <= cornerMpe &&
    Math.abs(corner4Error) <= cornerMpe;

  const overallPass =
    thermalPass && creepPass && emcPass && eccentricityPass && enduranceCyclesPassed;

  // Preset Handlers
  const applyCleanPassPreset = () => {
    setTempNeg10Drift(0.2);
    setTemp20Drift(0.0);
    setTemp40Drift(0.4);

    setCreep0h(0.0);
    setCreep1h(0.1);
    setCreep2h(0.2);
    setCreep4h(0.3);
    setCreepZeroReturn(0.1);

    setEmcRfImmunity(true);
    setEmcEsdImmunity(true);
    setEmcVoltageMains(true);

    setCorner1Error(0.2);
    setCorner2Error(0.3);
    setCorner3Error(0.2);
    setCorner4Error(0.1);

    setEnduranceCyclesPassed(true);
    setEnduranceRemarks("No mechanical deformation observed after 10,000 load cycles.");
    setEvaluationRemarks(
      "Conforms fully to statutory model approval specifications under Legal Metrology (Approval of Models) Rules 2011."
    );

    toast.success("Applied Preset: OIML R 76 Clean Pass (All tolerances within statutory limits)");
  };

  const applyThermalFailurePreset = () => {
    setTempNeg10Drift(0.3);
    setTemp20Drift(0.0);
    setTemp40Drift(1.8); // Fails thermal limit (1.8e > 1.0e MPE)

    setCreep0h(0.0);
    setCreep1h(0.2);
    setCreep2h(0.4);
    setCreep4h(0.7); // Fails creep (>0.5e)
    setCreepZeroReturn(0.4);

    setEmcRfImmunity(true);
    setEmcEsdImmunity(false); // ESD trigger glitch
    setEmcVoltageMains(true);

    setCorner1Error(0.3);
    setCorner2Error(0.4);
    setCorner3Error(0.3);
    setCorner4Error(0.2);

    setEnduranceCyclesPassed(false);
    setEnduranceRemarks("Excessive hysteresis detected after 6,500 continuous cycles.");
    setEvaluationRemarks(
      "NON-COMPLIANT: Severe span thermal drift (+1.8e at 40°C) and ESD susceptibility violate OIML R 76-1 tolerances. Pattern rejected."
    );

    toast.warning("Applied Preset: Thermal Drift & EMC Failure (Model Prototype Rejected)");
  };

  const handleSubmitEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedInstrumentId) {
      toast.error("Please select an instrument to evaluate.");
      return;
    }

    if (!user) {
      toast.error("Authentication session expired. Please log in.");
      return;
    }

    setSubmitting(true);

    const testData = {
      test_standard: testStandard,
      approval_number: overallPass ? approvalNumber : null,
      evaluated_by: profile?.full_name || "Dr. Meenakshi Sharma",
      testing_laboratory: "Central Metrology Testing Facility, GATC Haryana",
      tested_date: new Date().toISOString(),
      modules: {
        thermal_sweep: {
          passed: thermalPass,
          mpe_limit: `±${tempMpe}e`,
          readings: [
            { temp: "-10°C", drift: `${tempNeg10Drift}e`, status: Math.abs(tempNeg10Drift) <= tempMpe ? "PASS" : "FAIL" },
            { temp: "+20°C (Ref)", drift: `${temp20Drift}e`, status: "PASS" },
            { temp: "+40°C", drift: `${temp40Drift}e`, status: Math.abs(temp40Drift) <= tempMpe ? "PASS" : "FAIL" },
          ],
        },
        creep_recovery: {
          passed: creepPass,
          mpe_limit: `±${creepMpe}e`,
          readings: [
            { duration: "0h", drift: `${creep0h}e` },
            { duration: "1h", drift: `${creep1h}e` },
            { duration: "2h", drift: `${creep2h}e` },
            { duration: "4h", drift: `${creep4h}e` },
            { duration: "Zero Return", drift: `${creepZeroReturn}e` },
          ],
        },
        emc_immunity: {
          passed: emcPass,
          rf_10v_per_m: emcRfImmunity ? "IMMUNE" : "DISTORTED",
          esd_8kv: emcEsdImmunity ? "IMMUNE" : "RESET_TRIGGERED",
          mains_surge: emcVoltageMains ? "STABLE" : "VOLTAGE_DROP",
        },
        eccentricity: {
          passed: eccentricityPass,
          mpe_limit: `±${cornerMpe}e`,
          readings: [
            { corner: "Front-Left", error: `${corner1Error}e` },
            { corner: "Front-Right", error: `${corner2Error}e` },
            { corner: "Back-Left", error: `${corner3Error}e` },
            { corner: "Back-Right", error: `${corner4Error}e` },
          ],
        },
        endurance: {
          passed: enduranceCyclesPassed,
          cycles: 10000,
          remarks: enduranceRemarks,
        },
      },
      evaluation_remarks: evaluationRemarks,
    };

    const reportUrl = overallPass
      ? `https://legalmet.gov.in/reports/GATC-${approvalNumber.replace(/\//g, "-")}.pdf`
      : `https://legalmet.gov.in/reports/GATC-REJ-${Date.now().toString().slice(-6)}.pdf`;

    try {
      const { data, error } = await (supabase.from("test_reports") as any)
        .insert({
          instrument_id: selectedInstrumentId,
          gatc_user_id: user.id,
          test_data: testData,
          report_url: reportUrl,
          result: overallPass ? "approved" : "rejected",
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(
        overallPass
          ? `Pattern Approval Certificate ${approvalNumber} issued!`
          : "Model rejection recorded in statutory registry."
      );

      setSuccessReport({
        ...data,
        instrument: selectedInst,
      });
    } catch (err: any) {
      console.error(err);
      toast.error(`Submission failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        {/* Navigation & Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to="/gatc"
            className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Laboratory Dashboard
          </Link>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={applyCleanPassPreset}
              className="text-xs border-emerald-300 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              Simulate OIML Clean Pass
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={applyThermalFailurePreset}
              className="text-xs border-red-300 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
            >
              <ShieldAlert className="w-3.5 h-3.5 mr-1 text-red-600" />
              Simulate Thermal Failure
            </Button>
          </div>
        </div>

        {/* Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-amber-600" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              OIML Statutory Pattern Approval Evaluation
            </h1>
            <Badge
              variant="outline"
              className="bg-amber-50 text-amber-700 border-amber-200 text-xs font-semibold"
            >
              Rule 11 Compliance
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Conduct climatic chamber, electrical immunity, and creep deflection testing in accordance with
            OIML R 76-1 / R 117 standards.
          </p>
        </div>

        <form onSubmit={handleSubmitEvaluation} className="space-y-6">
          {/* Target Instrument Selector Card */}
          <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-600" />
                1. Prototype / Model Selection
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Choose the instrument prototype submitted for national pattern approval.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingInstruments ? (
                <div className="py-6 flex items-center justify-center space-y-2">
                  <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
                  <span className="text-xs text-slate-500 ml-2">Loading instrument registry...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                      Registered Prototype / Instrument
                    </Label>
                    <Select
                      value={selectedInstrumentId}
                      onValueChange={(val) => setSelectedInstrumentId(val)}
                    >
                      <SelectTrigger className="text-xs h-9">
                        <SelectValue placeholder="Select instrument..." />
                      </SelectTrigger>
                      <SelectContent>
                        {instruments.map((inst) => (
                          <SelectItem key={inst.id} value={inst.id} className="text-xs">
                            <span className="font-semibold">{inst.make} {inst.model}</span>
                            <span className="text-slate-400 ml-2 font-mono">({inst.digital_id})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                      Statutory Testing Standard
                    </Label>
                    <Select value={testStandard} onValueChange={setTestStandard}>
                      <SelectTrigger className="text-xs h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OIML R 76-1 (Class III Weighing)" className="text-xs">
                          OIML R 76-1: Non-automatic Weighing Instruments (Class III)
                        </SelectItem>
                        <SelectItem value="OIML R 117 (Dynamic Liquid Measuring)" className="text-xs">
                          OIML R 117: Dynamic Measuring Systems for Liquids (Fuel MPD)
                        </SelectItem>
                        <SelectItem value="OIML R 51 (Automatic Catchweighing)" className="text-xs">
                          OIML R 51: Automatic Catchweighing Instruments
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {selectedInst && (
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800 text-xs grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Manufacturer</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedInst.make}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Model & Serial</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedInst.model} ({selectedInst.serial_no})</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Rated Capacity</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {selectedInst.capacity || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">State of Origin</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedInst.state}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Module 1: Climatic & Thermal Sweep Test */}
          <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-amber-600" />
                  2. Climatic & Thermal Sweep Chamber Test
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  48-Hour temperature stability cycle (-10°C to +40°C). Permissible Span Drift: ±1.0e.
                </CardDescription>
              </div>
              <Badge
                className={`text-xs uppercase font-bold ${
                  thermalPass ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                }`}
              >
                {thermalPass ? "Thermal Pass" : "Thermal Fail"}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-sky-600 dark:text-sky-400">Sub-Zero Test (-10°C)</span>
                    <span className="text-slate-400 font-mono">Limit: ±1.0e</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.1"
                      value={tempNeg10Drift}
                      onChange={(e) => setTempNeg10Drift(parseFloat(e.target.value) || 0)}
                      className="text-xs h-8 font-mono"
                    />
                    <span className="text-xs font-semibold text-slate-500">e</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {Math.abs(tempNeg10Drift) <= tempMpe ? (
                      <span className="text-emerald-600 font-medium">✓ Within tolerance</span>
                    ) : (
                      <span className="text-red-600 font-medium">✗ Exceeds MPE</span>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Reference Temp (+20°C)</span>
                    <span className="text-slate-400 font-mono">Baseline: 0.0e</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.1"
                      value={temp20Drift}
                      onChange={(e) => setTemp20Drift(parseFloat(e.target.value) || 0)}
                      className="text-xs h-8 font-mono"
                    />
                    <span className="text-xs font-semibold text-slate-500">e</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    <span className="text-emerald-600 font-medium">✓ Calibrated Reference Zero</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-amber-600 dark:text-amber-400">High Thermal Test (+40°C)</span>
                    <span className="text-slate-400 font-mono">Limit: ±1.0e</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.1"
                      value={temp40Drift}
                      onChange={(e) => setTemp40Drift(parseFloat(e.target.value) || 0)}
                      className="text-xs h-8 font-mono"
                    />
                    <span className="text-xs font-semibold text-slate-500">e</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {Math.abs(temp40Drift) <= tempMpe ? (
                      <span className="text-emerald-600 font-medium">✓ Within tolerance</span>
                    ) : (
                      <span className="text-red-600 font-medium">✗ Exceeds MPE (Thermal Drift Failure)</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Module 2: 4-Hour Creep & Zero Return Test */}
          <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  3. 4-Hour Creep Deflection & Zero Return
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Full nominal load sustained for 4 hours. Maximum creep tolerance: ≤ 0.5e.
                </CardDescription>
              </div>
              <Badge
                className={`text-xs uppercase font-bold ${
                  creepPass ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                }`}
              >
                {creepPass ? "Creep Pass" : "Creep Fail"}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">0 Min (Initial)</span>
                  <div className="flex items-center gap-1 mt-1">
                    <Input
                      type="number"
                      step="0.05"
                      value={creep0h}
                      onChange={(e) => setCreep0h(parseFloat(e.target.value) || 0)}
                      className="text-xs h-7 font-mono"
                    />
                    <span className="text-[10px] text-slate-500">e</span>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">1 Hour</span>
                  <div className="flex items-center gap-1 mt-1">
                    <Input
                      type="number"
                      step="0.05"
                      value={creep1h}
                      onChange={(e) => setCreep1h(parseFloat(e.target.value) || 0)}
                      className="text-xs h-7 font-mono"
                    />
                    <span className="text-[10px] text-slate-500">e</span>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">2 Hours</span>
                  <div className="flex items-center gap-1 mt-1">
                    <Input
                      type="number"
                      step="0.05"
                      value={creep2h}
                      onChange={(e) => setCreep2h(parseFloat(e.target.value) || 0)}
                      className="text-xs h-7 font-mono"
                    />
                    <span className="text-[10px] text-slate-500">e</span>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">4 Hours (Final)</span>
                  <div className="flex items-center gap-1 mt-1">
                    <Input
                      type="number"
                      step="0.05"
                      value={creep4h}
                      onChange={(e) => setCreep4h(parseFloat(e.target.value) || 0)}
                      className="text-xs h-7 font-mono"
                    />
                    <span className="text-[10px] text-slate-500">e</span>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded border border-slate-200 dark:border-slate-800 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Zero Return</span>
                  <div className="flex items-center gap-1 mt-1">
                    <Input
                      type="number"
                      step="0.05"
                      value={creepZeroReturn}
                      onChange={(e) => setCreepZeroReturn(parseFloat(e.target.value) || 0)}
                      className="text-xs h-7 font-mono"
                    />
                    <span className="text-[10px] text-slate-500">e</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Module 3 & 4 Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Module 3: EMC / Electrical Immunity */}
            <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    4. Electromagnetic Compatibility (EMC)
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    OIML R 76-1 Annex B electrical immunity.
                  </CardDescription>
                </div>
                <Badge
                  className={`text-xs uppercase font-bold ${
                    emcPass ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                  }`}
                >
                  {emcPass ? "EMC Pass" : "EMC Fail"}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded border border-slate-200 dark:border-slate-800 text-xs">
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                      RF Field Immunity (10 V/m, 80MHz–2GHz)
                    </span>
                    <span className="text-[11px] text-slate-400">Mobile signal & radio frequency interference</span>
                  </div>
                  <Button
                    type="button"
                    variant={emcRfImmunity ? "default" : "outline"}
                    size="sm"
                    className={`h-7 text-xs ${emcRfImmunity ? "bg-emerald-600 hover:bg-emerald-700" : "text-red-600 border-red-300"}`}
                    onClick={() => setEmcRfImmunity(!emcRfImmunity)}
                  >
                    {emcRfImmunity ? "PASS" : "FAIL"}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded border border-slate-200 dark:border-slate-800 text-xs">
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                      Electrostatic Discharge (8 kV contact)
                    </span>
                    <span className="text-[11px] text-slate-400">Static electricity burst resilience</span>
                  </div>
                  <Button
                    type="button"
                    variant={emcEsdImmunity ? "default" : "outline"}
                    size="sm"
                    className={`h-7 text-xs ${emcEsdImmunity ? "bg-emerald-600 hover:bg-emerald-700" : "text-red-600 border-red-300"}`}
                    onClick={() => setEmcEsdImmunity(!emcEsdImmunity)}
                  >
                    {emcEsdImmunity ? "PASS" : "FAIL"}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded border border-slate-200 dark:border-slate-800 text-xs">
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                      Mains Voltage Fluctuation (230V ±15%)
                    </span>
                    <span className="text-[11px] text-slate-400">Grid line brownout & spike tolerance</span>
                  </div>
                  <Button
                    type="button"
                    variant={emcVoltageMains ? "default" : "outline"}
                    size="sm"
                    className={`h-7 text-xs ${emcVoltageMains ? "bg-emerald-600 hover:bg-emerald-700" : "text-red-600 border-red-300"}`}
                    onClick={() => setEmcVoltageMains(!emcVoltageMains)}
                  >
                    {emcVoltageMains ? "PASS" : "FAIL"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Module 4: Eccentricity / Corner Loading */}
            <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-600" />
                    5. Eccentricity Corner Test (1/3 Load)
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Off-center load test across 4 platform corners. MPE: ±1.0e.
                  </CardDescription>
                </div>
                <Badge
                  className={`text-xs uppercase font-bold ${
                    eccentricityPass ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                  }`}
                >
                  {eccentricityPass ? "Corner Pass" : "Corner Fail"}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Corner 1 (Front-Left)</span>
                    <div className="flex items-center gap-1 mt-1">
                      <Input
                        type="number"
                        step="0.1"
                        value={corner1Error}
                        onChange={(e) => setCorner1Error(parseFloat(e.target.value) || 0)}
                        className="text-xs h-7 font-mono"
                      />
                      <span className="text-[10px] text-slate-500">e</span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Corner 2 (Front-Right)</span>
                    <div className="flex items-center gap-1 mt-1">
                      <Input
                        type="number"
                        step="0.1"
                        value={corner2Error}
                        onChange={(e) => setCorner2Error(parseFloat(e.target.value) || 0)}
                        className="text-xs h-7 font-mono"
                      />
                      <span className="text-[10px] text-slate-500">e</span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Corner 3 (Back-Left)</span>
                    <div className="flex items-center gap-1 mt-1">
                      <Input
                        type="number"
                        step="0.1"
                        value={corner3Error}
                        onChange={(e) => setCorner3Error(parseFloat(e.target.value) || 0)}
                        className="text-xs h-7 font-mono"
                      />
                      <span className="text-[10px] text-slate-500">e</span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Corner 4 (Back-Right)</span>
                    <div className="flex items-center gap-1 mt-1">
                      <Input
                        type="number"
                        step="0.1"
                        value={corner4Error}
                        onChange={(e) => setCorner4Error(parseFloat(e.target.value) || 0)}
                        className="text-xs h-7 font-mono"
                      />
                      <span className="text-[10px] text-slate-500">e</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Verdict & Approval Submission Card */}
          <Card className={`border shadow-md transition ${overallPass ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50/20 dark:bg-emerald-950/10" : "border-red-300 dark:border-red-800 bg-red-50/20 dark:bg-red-950/10"}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    {overallPass ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <span className="text-emerald-900 dark:text-emerald-200">Statutory Model Approval Verdict: PASSED</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-red-600" />
                        <span className="text-red-900 dark:text-red-200">Statutory Model Approval Verdict: REJECTED</span>
                      </>
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {overallPass
                      ? "All 5 OIML statutory modules meet permissible tolerances. Ready to issue Indian Pattern Approval."
                      : "One or more testing modules exceed permissible tolerances. Pattern approval must be denied."}
                  </CardDescription>
                </div>

                <Badge
                  className={`text-sm px-3 py-1 font-extrabold uppercase tracking-wide ${
                    overallPass ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                  }`}
                >
                  {overallPass ? "APPROVED" : "REJECTED"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {overallPass && (
                  <div>
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                      Indian Pattern Approval Number (Statutory Format)
                    </Label>
                    <Input
                      value={approvalNumber}
                      onChange={(e) => setApprovalNumber(e.target.value)}
                      className="text-xs h-9 font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Format: IND/StateCode/Year/RegistrationNo (e.g., IND/09/2026/412)
                    </span>
                  </div>
                )}

                <div className={overallPass ? "" : "md:col-span-2"}>
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                    Lead Metrologist Technical Endorsement
                  </Label>
                  <Input
                    value={evaluationRemarks}
                    onChange={(e) => setEvaluationRemarks(e.target.value)}
                    className="text-xs h-9"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Lead Metrologist: {profile?.full_name || "Dr. Meenakshi Sharma"} (GATC Laboratory)
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                <Link to="/gatc">
                  <Button type="button" variant="outline" size="sm" className="text-xs">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={submitting}
                  size="sm"
                  className={`text-xs px-6 ${
                    overallPass
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-red-600 hover:bg-red-700 text-white"
                  }`}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      <span>Recording Evaluation...</span>
                    </>
                  ) : overallPass ? (
                    <>
                      <FileCheck2 className="w-4 h-4 mr-1.5" />
                      <span>Issue Statutory Pattern Approval Certificate</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-1.5" />
                      <span>Submit Pattern Rejection Record</span>
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>

        {/* Modal / Dialog on Success */}
        {successReport && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="max-w-md w-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
              <CardHeader className="text-center pb-2">
                <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 mb-2">
                  <Award className="w-6 h-6" />
                </div>
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                  {successReport.result === "approved"
                    ? "Pattern Approval Certificate Generated"
                    : "Rejection Record Filed"}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Government Approved Test Centre (GATC) • Legal Metrology Act 2009
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs space-y-2 border border-slate-100 dark:border-slate-800">
                  {successReport.result === "approved" && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Approval Number:</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {successReport.test_data?.approval_number}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Model:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {successReport.instrument?.make} {successReport.instrument?.model}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Verdict:</span>
                    <Badge
                      className={`text-[10px] font-bold uppercase ${
                        successReport.result === "approved" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                      }`}
                    >
                      {successReport.result}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Lead Metrologist:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {profile?.full_name || "Dr. Meenakshi Sharma"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    onClick={() => navigate("/gatc/reports")}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs"
                  >
                    View in Test Reports Ledger
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSuccessReport(null);
                      navigate("/gatc");
                    }}
                    className="w-full text-xs"
                  >
                    Return to GATC Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PatternTestPage;
