import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabase";
import { offlineDb } from "@/lib/offlineDb";
import {
  syncPendingInspections,
  getEffectiveOnlineStatus,
  isSimulatedOffline,
  setSimulatedOffline,
} from "@/lib/syncEngine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ClipboardCheck,
  CheckCircle2,
  ArrowLeft,
  Wifi,
  WifiOff,
  Sparkles,
  Scale,
  ShieldCheck,
  FileCheck,
  Loader2,
  Camera,
  AlertTriangle,
  Scan,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  verifySerialAuthenticity,
  SAMPLE_NAMEPLATES,
  type SerialVerificationResult,
} from "@/lib/ocrService";
import { extractNameplateData, type OCRResult } from "@/lib/ocrClient";

interface TestLoadRow {
  test_load_kg: number;
  indicated_kg: number;
  error_g: number;
  mpe_g: number;
  status: "pass" | "fail";
}

export const InspectionFormPage: React.FC = () => {
  const { applicationId } = useParams<{ applicationId: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [appData, setAppData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Connectivity
  const [isOnline, setIsOnline] = useState<boolean>(getEffectiveOnlineStatus());

  // AI Nameplate OCR & Anti-Tamper State
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [ocrImagePreview, setOcrImagePreview] = useState<string | null>(null);
  const [serialVerification, setSerialVerification] = useState<SerialVerificationResult | null>(null);

  // Checklist
  const [checklist, setChecklist] = useState({
    seal_intact: true,
    nameplate_legible: true,
    spirit_level_centered: true,
    zero_setting_ok: true,
    display_legible: true,
    no_magnetic_tamper: true,
  });

  // Metrological Readings
  const [loads, setLoads] = useState<TestLoadRow[]>([
    { test_load_kg: 5, indicated_kg: 5.0, error_g: 0, mpe_g: 2.5, status: "pass" },
    { test_load_kg: 15, indicated_kg: 15.002, error_g: 2.0, mpe_g: 5.0, status: "pass" },
    { test_load_kg: 30, indicated_kg: 30.003, error_g: 3.0, mpe_g: 7.5, status: "pass" },
  ]);

  const [eccentricityError, setEccentricityError] = useState<number>(1.5);
  const [repeatabilityError, setRepeatabilityError] = useState<number>(1.0);
  const [remarks, setRemarks] = useState<string>(
    "Conforms to OIML R 76-1 accuracy limits. Physical verification stamp affixed."
  );

  // Completed Inspection dialog / result state
  const [completedResult, setCompletedResult] = useState<{
    result: "pass" | "fail";
    client_uuid: string;
    isSynced: boolean;
  } | null>(null);

  const handleScanNameplate = async (
    file: File | Blob,
    presetKey?: keyof typeof SAMPLE_NAMEPLATES
  ) => {
    setOcrLoading(true);
    setOcrResult(null);
    setSerialVerification(null);
    toast.loading(
      presetKey ? "Loading demo preset..." : "Running Tesseract OCR on nameplate...",
      { id: "ocr-scan" }
    );
    try {
      // Show a raw preview of the uploaded file
      if (file instanceof File && !presetKey) {
        setOcrImagePreview(URL.createObjectURL(file));
      }

      const res = await extractNameplateData(file, presetKey);
      setOcrResult(res);

      // If no text was detected at all, show an amber warning (handled in JSX)
      if (!res.serial_no.value && !res.make.value && !res.model.value && !res.is_mock) {
        toast.warning("No text detected. Try retaking with better lighting.", { id: "ocr-scan" });
        return;
      }

      const expectedSerial = appData?.instruments?.serial_no;
      if (!expectedSerial) {
        toast.error("Instrument data not loaded — cannot verify serial. Reload the page.", { id: "ocr-scan" });
        return;
      }

      const verification = verifySerialAuthenticity(res.serial_no.value, expectedSerial);
      setSerialVerification(verification);

      if (verification.isMatch) {
        toast.success(`Serial match confirmed (${verification.matchPercentage}%)!`, { id: "ocr-scan" });
      } else {
        toast.error(
          `TAMPER ALERT: Serial mismatch (${res.serial_no.value || "not detected"} ≠ ${expectedSerial})!`,
          { id: "ocr-scan" }
        );
      }
    } catch (err: any) {
      toast.error(`OCR scan error: ${err.message}`, { id: "ocr-scan" });
    } finally {
      setOcrLoading(false);
    }
  };

  const handleFlagTampering = () => {
    if (!serialVerification || !ocrResult) return;
    const expectedSerial = appData?.instruments?.serial_no ?? "[unknown]";
    setChecklist({
      ...checklist,
      seal_intact: false,
      nameplate_legible: false,
      no_magnetic_tamper: false,
    });
    setRemarks(
      `CRITICAL VIOLATION: Physical on-site nameplate serial mismatch. Registered device is '${expectedSerial}', but physical scale shows '${ocrResult.serial_no.value}'. Instrument substituted or counterfeit.`
    );
    toast.warning("Tampering violation flagged in checklist and remarks.");
  };

  useEffect(() => {
    const handleConnectivity = () => setIsOnline(getEffectiveOnlineStatus());
    window.addEventListener("online", handleConnectivity);
    window.addEventListener("offline", handleConnectivity);
    window.addEventListener("legalmet-connectivity-change", handleConnectivity);
    return () => {
      window.removeEventListener("online", handleConnectivity);
      window.removeEventListener("offline", handleConnectivity);
      window.removeEventListener("legalmet-connectivity-change", handleConnectivity);
    };
  }, []);

  const loadApplication = async () => {
    if (!applicationId) return;
    setLoading(true);
    try {
      if (getEffectiveOnlineStatus()) {
        const { data, error } = await supabase
          .from("applications")
          .select(`
            id,
            application_no,
            type,
            status,
            instrument_id,
            instruments (
              id,
              digital_id,
              category,
              make,
              model,
              serial_no,
              capacity,
              accuracy_class,
              shop_name,
              address,
              district,
              state,
              latitude,
              longitude
            )
          `)
          .eq("id", applicationId)
          .single();

        if (error) throw error;
        setAppData(data);
      } else {
        // Fallback to cached applications in Dexie
        const cached = await offlineDb.cachedApplications.get(applicationId);
        if (cached) {
          setAppData({
            id: cached.id,
            application_no: cached.application_no,
            type: cached.type,
            status: cached.status,
            instrument_id: cached.instrument_id,
            instruments: {
              id: cached.instrument_id,
              digital_id: cached.digital_id,
              category: cached.category,
              make: cached.make,
              model: cached.model,
              serial_no: cached.serial_no,
              capacity: cached.capacity,
              shop_name: cached.shop_name,
              district: cached.district,
              state: cached.state,
            },
          });
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error(`Could not load application: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplication();
  }, [applicationId]);

  // Recalculate errors when indicated weight is modified
  const handleIndicatedWeightChange = (index: number, newIndicated: number) => {
    const updated = [...loads];
    const row = updated[index];
    row.indicated_kg = newIndicated;
    // Calculate error in grams
    const errGrams = parseFloat(((newIndicated - row.test_load_kg) * 1000).toFixed(2));
    row.error_g = errGrams;
    row.status = Math.abs(errGrams) <= row.mpe_g ? "pass" : "fail";
    setLoads(updated);
  };

  // Hackathon Evaluation Shortcuts
  const handleSimulatePass = () => {
    setChecklist({
      seal_intact: true,
      nameplate_legible: true,
      spirit_level_centered: true,
      zero_setting_ok: true,
      display_legible: true,
      no_magnetic_tamper: true,
    });
    setLoads([
      { test_load_kg: 5, indicated_kg: 5.0, error_g: 0.0, mpe_g: 2.5, status: "pass" },
      { test_load_kg: 15, indicated_kg: 15.001, error_g: 1.0, mpe_g: 5.0, status: "pass" },
      { test_load_kg: 30, indicated_kg: 30.002, error_g: 2.0, mpe_g: 7.5, status: "pass" },
    ]);
    setEccentricityError(1.2);
    setRepeatabilityError(0.8);
    setRemarks("Physical tests passed within permissible limits (MPE compliant). Official seal affixed.");
    toast.success("Loaded clean passing test readings.");
  };

  const handleSimulateFail = () => {
    setChecklist({
      seal_intact: false,
      nameplate_legible: true,
      spirit_level_centered: true,
      zero_setting_ok: false,
      display_legible: true,
      no_magnetic_tamper: false,
    });
    setLoads([
      { test_load_kg: 5, indicated_kg: 4.92, error_g: -80.0, mpe_g: 2.5, status: "fail" },
      { test_load_kg: 15, indicated_kg: 14.85, error_g: -150.0, mpe_g: 5.0, status: "fail" },
      { test_load_kg: 30, indicated_kg: 29.7, error_g: -300.0, mpe_g: 7.5, status: "fail" },
    ]);
    setEccentricityError(25.0);
    setRepeatabilityError(40.0);
    setRemarks("TAMPERING DETECTED: Under-delivery of 80g per 5kg. Verification rejected. Notice of Seizure issued under LM Act 2009.");
    toast.error("Loaded fraudulent / failed calibration readings.");
  };

  // Overall Pass / Fail Calculation
  const allChecklistPassed = Object.values(checklist).every(Boolean);
  const allLoadsPassed = loads.every((l) => l.status === "pass");
  const overallResult: "pass" | "fail" = allChecklistPassed && allLoadsPassed ? "pass" : "fail";

  // Submit & Save Inspection
  const handleSubmitInspection = async () => {
    if (!profile || !appData) return;
    setSubmitting(true);
    toast.loading("Recording on-site verification...", { id: "ins-toast" });

    const clientUuid = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    const offlineRecord = {
      client_uuid: clientUuid,
      application_id: appData.id,
      instrument_id: appData.instruments.id,
      officer_id: profile.id,
      checklist,
      readings: {
        loads,
        eccentricity_error_g: eccentricityError,
        repeatability_error_g: repeatabilityError,
      },
      photos: [],
      latitude: appData.instruments?.latitude || 28.4595,
      longitude: appData.instruments?.longitude || 77.0266,
      result: overallResult,
      remarks,
      inspected_at: nowIso,
      offline_created_at: nowIso,
      sync_status: "pending" as const,
      instrument_digital_id: appData.instruments?.digital_id,
      shop_name: appData.instruments?.shop_name,
      instrument_category: appData.instruments?.category,
    };

    try {
      // 1. Always save into Dexie first (Offline First Architecture)
      await offlineDb.inspections.add(offlineRecord);

      // 2. If online, trigger immediate background sync
      let synced = false;
      if (getEffectiveOnlineStatus()) {
        const syncRes = await syncPendingInspections();
        synced = syncRes.synced > 0;
      }

      setCompletedResult({
        result: overallResult,
        client_uuid: clientUuid,
        isSynced: synced,
      });

      if (synced) {
        toast.success(
          overallResult === "pass"
            ? "Inspection certified & digital certificate issued!"
            : "Inspection logged: Non-compliant scale marked rejected.",
          { id: "ins-toast" }
        );
      } else {
        toast.info("Recorded in local IndexedDB! Record will sync automatically when online.", {
          id: "ins-toast",
        });
      }
    } catch (err: any) {
      console.error(err);
      toast.error(`Error saving inspection: ${err.message}`, { id: "ins-toast" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-[400px] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      </DashboardLayout>
    );
  }

  const inst = appData?.instruments;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Header with Offline Indicator & Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/officer/inspections")}
              className="h-8 w-8 p-0 rounded-full"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Field Verification &amp; Stamping
                </h1>
                <Badge
                  variant="outline"
                  className={
                    isOnline
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                      : "bg-amber-50 text-amber-700 border-amber-300"
                  }
                >
                  {isOnline ? "Online Mode" : "Offline Mode"}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {inst?.shop_name} • Digital ID:{" "}
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {inst?.digital_id}
                </span>
              </p>
            </div>
          </div>

          {/* Simulated Offline Toggle for Demo */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 px-2">
              Demo Offline Switch:
            </span>
            <Button
              size="sm"
              variant={isSimulatedOffline() ? "destructive" : "outline"}
              className="h-7 text-xs"
              onClick={() => {
                const nextState = !isSimulatedOffline();
                setSimulatedOffline(nextState);
                setIsOnline(!nextState && navigator.onLine);
                toast.info(nextState ? "Simulating offline field mode" : "Restored online connectivity");
              }}
            >
              {isSimulatedOffline() ? <WifiOff className="w-3.5 h-3.5 mr-1" /> : <Wifi className="w-3.5 h-3.5 mr-1" />}
              <span>{isSimulatedOffline() ? "Offline" : "Online"}</span>
            </Button>
          </div>
        </div>

        {/* Demo Fast-fill Buttons */}
        <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <div className="text-xs font-bold text-amber-900 dark:text-amber-200">
                Hackathon Live Test Presets
              </div>
              <div className="text-[11px] text-slate-500">
                Instantly populate realistic OIML R-76 calibration readings:
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSimulatePass}
              className="text-xs bg-white dark:bg-slate-900 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            >
              Simulate Clean Pass (MPE OK)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSimulateFail}
              className="text-xs bg-white dark:bg-slate-900 border-red-300 text-red-700 hover:bg-red-50"
            >
              Simulate Failure (-80g Shortage)
            </Button>
          </div>
        </div>

        {/* SECTION 0: AI Nameplate Scanner & Anti-Fraud Serial Verification */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <CardHeader className="pb-3 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <Scan className="w-4 h-4 text-emerald-600" />
                Section 0: On-Site Nameplate OCR &amp; Anti-Tamper Verification
              </CardTitle>
              <Badge variant="outline" className="text-[10px] w-fit font-mono border-emerald-300 text-emerald-700 bg-emerald-50">
                AI Vision • OIML R-76
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Photograph or scan the physical metallic nameplate on-site to verify that the weighing scale has not been substituted or tampered with before affixing lead-wire seals.
            </p>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-4">
            {/* Registered Device Reference Strip */}
            <div className="p-3 bg-slate-100/70 dark:bg-slate-800/60 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs border border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-slate-500 font-medium">Registered Device: </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {appData?.instruments?.make || "Essae-Teraoka"} {appData?.instruments?.model || "DS-215"}
                </span>
                <span className="text-slate-400 mx-1.5">•</span>
                <span className="text-slate-500">Rated: </span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{appData?.instruments?.capacity || "30 kg (e = 5 g)"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Expected S/N:</span>
                {appData?.instruments?.serial_no ? (
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 font-mono font-bold rounded border border-blue-200 dark:border-blue-800">
                    {appData.instruments.serial_no}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-700 font-mono rounded border border-amber-200 italic text-[10px]">
                    loading...
                  </span>
                )}
              </div>
            </div>

              {/* ── Real Upload ───────────────────────────────────── */}
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  id="officer-nameplate-upload"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleScanNameplate(file);
                  }}
                />
                <label
                  htmlFor="officer-nameplate-upload"
                  className="cursor-pointer inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors w-full sm:w-auto"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Scan Physical Nameplate (Real Photo)</span>
                </label>
              </div>

              {/* ── Divider ───────────────────────────────────────── */}
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                Quick Demo
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              </div>

              {/* ── Jury Testing Presets ──────────────────────────── */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={ocrLoading}
                  onClick={() => {
                    const mockFile = new File(["dummy"], "preset.jpg", { type: "image/jpeg" });
                    handleScanNameplate(mockFile, "essaeClean");
                  }}
                  className="text-xs h-8 bg-white dark:bg-slate-900 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                >
                  ⚡ Authentic S/N Match
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={ocrLoading}
                  onClick={() => {
                    const mockFile = new File(["dummy"], "preset.jpg", { type: "image/jpeg" });
                    handleScanNameplate(mockFile, "swappedFraud");
                  }}
                  className="text-xs h-8 bg-white dark:bg-slate-900 border-red-200 text-red-700 hover:bg-red-50"
                >
                  ⚠️ Swapped Device (Fraud)
                </Button>
              </div>

            {ocrLoading && (
              <div className="py-6 flex flex-col items-center justify-center space-y-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                <span className="text-xs text-slate-500 font-medium">
                  Running Tesseract OCR &amp; Serial Number Matching...
                </span>
                <span className="text-[10px] text-slate-400">
                  Processing image in browser — no upload to server
                </span>
              </div>
            )}

            {/* OCR empty result — no text found */}
            {!ocrLoading && ocrResult && !ocrResult.is_mock &&
              !ocrResult.serial_no.value && !ocrResult.make.value && !ocrResult.model.value && (
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    No text detected in image
                  </div>
                  <div className="text-xs text-amber-700 dark:text-amber-400">
                    Tesseract could not extract readable text. Try: better lighting, hold steady, ensure nameplate fills the frame, or clean the plate.
                  </div>
                </div>
              </div>
            )}

            {/* OCR Result & Anti-Fraud Verification Panel */}
            {!ocrLoading && ocrResult && serialVerification && (
              <div className="space-y-3 pt-2">
                {/* Mock data disclaimer */}
                {ocrResult.is_mock && (
                  <div className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 rounded-lg text-[10px] text-amber-700 font-medium flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3" />
                    Quick Demo preset — not real OCR output
                  </div>
                )}
                {/* Visual Status Banner */}
                {serialVerification.isMatch ? (
                  <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-xl flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                        OFFICIAL IDENTITY CONFIRMED • SERIAL MATCH {serialVerification.matchPercentage}%
                      </div>
                      <div className="text-xs text-emerald-700 dark:text-emerald-400">
                        {serialVerification.explanation}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-red-900 dark:text-red-200">
                          TAMPER &amp; SUBSTITUTION FRAUD DETECTED
                        </div>
                        <div className="text-xs text-red-700 dark:text-red-400">
                          {serialVerification.explanation}
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleFlagTampering}
                      className="bg-red-600 hover:bg-red-700 text-white text-xs shrink-0 h-8"
                    >
                      Flag Tampering Violation
                    </Button>
                  </div>
                )}

                {/* Extracted Specifications Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  {(
                    [
                      { label: "Make", field: ocrResult.make, mono: false, match: false },
                      { label: "Model", field: ocrResult.model, mono: false, match: false },
                      { label: "Physical S/N", field: ocrResult.serial_no, mono: true, match: !!serialVerification.isMatch },
                      { label: "Capacity / Class", field: ocrResult.capacity, mono: false, match: false },
                    ] as Array<{ label: string; field: any; mono: boolean; match: boolean }>
                  ).map(({ label, field, mono, match }) => (
                    <div
                      key={label}
                      className={`p-2.5 rounded-lg border ${
                        field.lowConfidence
                          ? "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      <span className="text-[10px] text-slate-400 block font-medium">{label}</span>
                      <span
                        className={`font-bold block truncate ${
                          mono
                            ? match
                              ? "font-mono text-emerald-700 dark:text-emerald-400"
                              : "font-mono text-red-600 dark:text-red-400"
                            : "text-slate-800 dark:text-slate-200"
                        }`}
                      >
                        {field.value || <span className="italic text-slate-400">not detected</span>}
                      </span>
                      <span
                        className={`text-[9px] font-mono ${
                          field.lowConfidence ? "text-amber-600" : "text-emerald-600"
                        }`}
                      >
                        {Math.round(field.confidence * 100)}% conf
                        {field.lowConfidence && " ⚠ review"}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Low-confidence warning */}
                {(ocrResult.make.lowConfidence ||
                  ocrResult.model.lowConfidence ||
                  ocrResult.serial_no.lowConfidence ||
                  ocrResult.capacity.lowConfidence) && !ocrResult.is_mock && (
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    One or more fields have low OCR confidence (&lt;60%). Please verify these values against the physical nameplate before proceeding.
                  </div>
                )}

                {/* Preprocessed Image Thumbnail */}
                {ocrImagePreview && (
                  <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
                    <img
                      src={ocrImagePreview}
                      alt="Physical Nameplate"
                      className="w-16 h-12 object-cover rounded border border-slate-200 dark:border-slate-700 shrink-0"
                    />
                    <div className="space-y-0.5">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block text-xs">
                        Preprocessed (contrast enhanced)
                      </span>
                      <span className="text-[11px] text-slate-500 block">
                        Grayscale + contrast normalization applied for laser-engraved stamped text.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* SECTION A: Visual & Security Checklist */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <ClipboardCheck className="w-4 h-4 text-blue-600" />
              Section A: Visual &amp; Tamper-Evident Security Checklist
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { key: "seal_intact", label: "Lead wire verification seal intact, unbroken, and numbered" },
              { key: "nameplate_legible", label: "Nameplate clearly stamped with Model Approval Number & Class" },
              { key: "spirit_level_centered", label: "Spirit level bubble perfectly centered; leveling feet stable" },
              { key: "zero_setting_ok", label: "Zero tracking & auto-zero mechanism functional within ±0.25e" },
              { key: "display_legible", label: "Price-computing display legible without missing segment lines" },
              { key: "no_magnetic_tamper", label: "Under-pan inspection clear; no magnets or foreign tare offsets" },
            ].map((item) => {
              const isChecked = (checklist as any)[item.key];
              return (
                <label
                  key={item.key}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                    isChecked
                      ? "bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/60"
                      : "bg-red-50/40 border-red-200 dark:bg-red-950/20 dark:border-red-800/60"
                  }`}
                >
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    {item.label}
                  </span>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) =>
                      setChecklist({ ...checklist, [item.key]: e.target.checked })
                    }
                    className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                </label>
              );
            })}
          </CardContent>
        </Card>

        {/* SECTION B: Metrological Error Testing (OIML R 76-1) */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <Scale className="w-4 h-4 text-emerald-600" />
              Section B: Metrological Load Testing (Maximum Permissible Error - MPE)
            </CardTitle>
            <Badge variant="outline" className="text-[10px] font-mono">
              Class III • e = 5g
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Test Stage</th>
                    <th className="py-2.5 px-3">Standard Load (kg)</th>
                    <th className="py-2.5 px-3">Indicated Reading (kg)</th>
                    <th className="py-2.5 px-3">Error (g)</th>
                    <th className="py-2.5 px-3">Allowed MPE (g)</th>
                    <th className="py-2.5 px-3 text-right">Verdict</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {loads.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-sans font-medium text-slate-700 dark:text-slate-300">
                        {idx === 0 ? "Min Load (10%)" : idx === 1 ? "Mid Load (50%)" : "Max Load (100%)"}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                        {row.test_load_kg} kg
                      </td>
                      <td className="py-2.5 px-3">
                        <Input
                          type="number"
                          step="0.001"
                          value={row.indicated_kg}
                          onChange={(e) =>
                            handleIndicatedWeightChange(idx, parseFloat(e.target.value) || 0)
                          }
                          className="h-8 w-28 text-xs font-mono font-bold"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`font-bold ${
                            row.status === "pass" ? "text-emerald-600" : "text-red-600"
                          }`}
                        >
                          {row.error_g > 0 ? `+${row.error_g}` : row.error_g} g
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        ±{row.mpe_g} g
                      </td>
                      <td className="py-2.5 px-3 text-right font-sans">
                        <Badge
                          variant="outline"
                          className={
                            row.status === "pass"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                              : "bg-red-50 text-red-700 border-red-300"
                          }
                        >
                          {row.status.toUpperCase()}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Corner & Repeatability Test Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                <Label className="text-[11px] font-semibold">Eccentricity (Corner Test) Error</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    value={eccentricityError}
                    onChange={(e) => setEccentricityError(parseFloat(e.target.value) || 0)}
                    className="h-8 text-xs font-mono font-bold w-28"
                  />
                  <span className="text-xs text-slate-500">grams (Max allowed: 5.0 g)</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                <Label className="text-[11px] font-semibold">Repeatability Test Variance</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    value={repeatabilityError}
                    onChange={(e) => setRepeatabilityError(parseFloat(e.target.value) || 0)}
                    className="h-8 text-xs font-mono font-bold w-28"
                  />
                  <span className="text-xs text-slate-500">grams (Max allowed: 2.5 g)</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION C: Remarks & Overall Verdict */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center justify-between text-slate-800 dark:text-slate-200">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Section C: Inspector Verdict &amp; Legal Metrology Seal
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-normal text-slate-400">Calculated Result:</span>
                <Badge
                  className={
                    overallResult === "pass"
                      ? "bg-emerald-600 text-white font-bold"
                      : "bg-red-600 text-white font-bold"
                  }
                >
                  {overallResult === "pass" ? "VERIFICATION PASSED" : "REJECTED (SEIZURE)"}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs font-semibold">Official Inspection Remarks</Label>
              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full mt-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-900"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                {isOnline ? (
                  <Wifi className="w-4 h-4 text-emerald-600" />
                ) : (
                  <WifiOff className="w-4 h-4 text-amber-600" />
                )}
                <span>
                  {isOnline
                    ? "Will immediately generate digital certificate and update cloud registry."
                    : "Will store securely in IndexedDB with cryptographic client UUID."}
                </span>
              </div>

              <Button
                onClick={handleSubmitInspection}
                disabled={submitting}
                className={`font-semibold text-xs px-6 py-2.5 h-auto text-white ${
                  overallResult === "pass"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    <span>Signing Record...</span>
                  </>
                ) : (
                  <>
                    <FileCheck className="w-4 h-4 mr-1.5" />
                    <span>
                      {overallResult === "pass"
                        ? "Certify & Sign Certificate"
                        : "Issue Rejection & Notice"}
                    </span>
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Completed Modal / Result Banner */}
        {completedResult && (
          <div className="p-6 bg-white dark:bg-slate-900 border-2 border-emerald-500 rounded-2xl shadow-lg text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Verification Record Stamped
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Client UUID: <span className="font-mono font-bold">{completedResult.client_uuid}</span>
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs space-y-1 max-w-sm mx-auto font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Verdict:</span>
                <span className="font-bold text-emerald-600 uppercase">{completedResult.result}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cloud Sync:</span>
                <span className={completedResult.isSynced ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>
                  {completedResult.isSynced ? "SYNCHRONIZED (Supabase)" : "QUEUED OFFLINE (IndexedDB)"}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                onClick={() => navigate("/officer/sync")}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                Inspect Sync Hub
              </Button>
              <Button
                onClick={() => navigate("/officer/inspections")}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
              >
                Back to Inspection Queue
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default InspectionFormPage;
