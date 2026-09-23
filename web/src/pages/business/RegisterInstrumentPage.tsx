import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabase";
import { extractNameplateData, type OCRResult } from "@/lib/ocrClient";
import { INSTRUMENT_CATEGORIES, STATE_DISTRICTS, DISTRICT_OFFICER_IDS } from "@/lib/constants";
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
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  Upload,
  Sparkles,
  MapPin,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  FileCheck,
  Scale,
} from "lucide-react";
import { toast } from "sonner";

export const RegisterInstrumentPage: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [scanningOCR, setScanningOCR] = useState(false);

  // Photo & OCR state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);

  // Instrument specifications
  const [category, setCategory] = useState<string>("Counter Scale");
  const [make, setMake] = useState<string>("");
  const [model, setModel] = useState<string>("");
  const [serialNo, setSerialNo] = useState<string>("");
  const [capacity, setCapacity] = useState<string>("");
  const [accuracyClass, setAccuracyClass] = useState<string>("Class III");
  const [manufactureYear, setManufactureYear] = useState<number>(new Date().getFullYear());

  // Establishment & Location
  const [shopName, setShopName] = useState<string>(
    profile?.designation?.replace("Proprietor, ", "") || "Maurya Sweets & Confectionery"
  );
  const [address, setAddress] = useState<string>("Dak Bungalow Chowk, Fraser Road");
  const [state, setState] = useState<string>(profile?.jurisdiction_state || "Bihar");
  const [district, setDistrict] = useState<string>(profile?.jurisdiction_district || "Patna");
  const [latitude, setLatitude] = useState<number>(25.6093);
  const [longitude, setLongitude] = useState<number>(85.1376);
  const [locating, setLocating] = useState(false);

  // Success state
  const [createdInstrument, setCreatedInstrument] = useState<any>(null);

  // Handle Photo selection & OCR trigger
  const handlePhotoUpload = async (file: File) => {
    setPhotoFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPhotoPreview(objectUrl);

    setScanningOCR(true);
    toast.loading("Scanning nameplate with OCR AI...", { id: "ocr-toast" });
    try {
      const res = await extractNameplateData(file);
      setOcrResult(res);

      // Auto-populate fields from OCR
      if (res.make.value) setMake(res.make.value);
      if (res.model.value) setModel(res.model.value);
      if (res.serial_no.value) setSerialNo(res.serial_no.value);
      if (res.capacity.value) setCapacity(res.capacity.value);
      if (res.accuracy_class?.value) setAccuracyClass(res.accuracy_class.value);

      toast.success("Nameplate details extracted successfully!", { id: "ocr-toast" });
    } catch {
      toast.error("OCR scan could not read nameplate; enter specs manually.", { id: "ocr-toast" });
    } finally {
      setScanningOCR(false);
    }
  };

  // Demo shortcut: load sample nameplate photo
  const handleLoadSamplePhoto = (type: "essae" | "avery" | "mettler") => {
    let mockName = "sample_essae_ds215.jpg";
    let mockUrl = "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=800&q=80";

    if (type === "avery") {
      mockName = "avery_platform_scale.jpg";
      mockUrl = "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80";
      setCategory("Platform Scale");
    } else if (type === "mettler") {
      mockName = "mettler_weighbridge_truck.jpg";
      mockUrl = "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80";
      setCategory("Electronic Weighbridge");
    }

    const mockFile = new File(["dummy-content"], mockName, { type: "image/jpeg" });
    setPhotoPreview(mockUrl);
    handlePhotoUpload(mockFile);
  };

  // Geolocation trigger
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(parseFloat(pos.coords.latitude.toFixed(6)));
        setLongitude(parseFloat(pos.coords.longitude.toFixed(6)));
        setLocating(false);
        toast.success(`Tagged GPS: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
      },
      (err) => {
        console.warn("Geo error:", err.message);
        setLocating(false);
        toast.info("Using estimated district GPS coordinates.");
      },
      { timeout: 8000 }
    );
  };

  // Final Submission
  const handleSubmit = async () => {
    if (!user) {
      toast.error("Please sign in before registering instruments.");
      return;
    }

    if (!make || !model || !serialNo) {
      toast.error("Please provide Make, Model, and Serial Number.");
      return;
    }

    setSubmitting(true);
    toast.loading("Registering instrument with Legal Metrology portal...", { id: "reg-toast" });

    try {
      let photoUrl = photoPreview;

      // 1. Upload photo to Supabase Storage if file is present
      if (photoFile) {
        const fileExt = photoFile.name.split(".").pop() || "jpg";
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("nameplate-photos")
          .upload(filePath, photoFile, { upsert: true });

        if (!uploadError && uploadData) {
          const { data: publicUrlData } = supabase.storage
            .from("nameplate-photos")
            .getPublicUrl(uploadData.path);
          photoUrl = publicUrlData.publicUrl;
        }
      }

      // 2. Insert into instruments table (trigger generate_digital_id will generate digital_id)
      const { data: instData, error: instError } = await (supabase
        .from("instruments") as any)
        .insert({
          category,
          make,
          model,
          serial_no: serialNo,
          capacity,
          accuracy_class: accuracyClass,
          manufacture_year: manufactureYear,
          owner_id: user.id,
          shop_name: shopName,
          address,
          district,
          state,
          latitude,
          longitude,
          nameplate_photo_url: photoUrl,
          status: "pending",
        })
        .select()
        .single();

      if (instError) throw instError;

      // Look up officer in this district to automatically route application
      let assignedOfficerId: string | null = null;
      try {
        const { data: districtOfficer } = await (supabase.from("profiles") as any)
          .select("id")
          .eq("role", "metrology_officer")
          .eq("jurisdiction_district", district)
          .maybeSingle();

        if (districtOfficer?.id) {
          assignedOfficerId = districtOfficer.id;
        } else if (DISTRICT_OFFICER_IDS[district]) {
          // Direct canonical lookup when client RLS restricts trader read on other profiles
          assignedOfficerId = DISTRICT_OFFICER_IDS[district];
        } else {
          // Fallback: search by state
          const { data: stateOfficer } = await (supabase.from("profiles") as any)
            .select("id")
            .eq("role", "metrology_officer")
            .eq("jurisdiction_state", state)
            .limit(1)
            .maybeSingle();
          if (stateOfficer?.id) assignedOfficerId = stateOfficer.id;
        }
      } catch (findErr) {
        console.warn("Could not query district officer:", findErr);
        assignedOfficerId = DISTRICT_OFFICER_IDS[district] || null;
      }

      // 3. Automatically create initial Verification Application assigned to the district officer
      const { error: appError } = await (supabase.from("applications") as any).insert({
        instrument_id: instData.id,
        applicant_id: user.id,
        assigned_officer_id: assignedOfficerId,
        type: "new_verification",
        status: "submitted",
        remarks: "Initial digital verification request submitted via Trader Portal.",
      });

      if (appError) console.warn("Application insert warning:", appError.message);

      setCreatedInstrument(instData);
      setStep(4); // Success step
      toast.success("Instrument successfully registered!", { id: "reg-toast" });
    } catch (err: any) {
      console.error(err);
      toast.error(`Registration failed: ${err.message || err}`, { id: "reg-toast" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Progress Stepper */}
        <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Register Weighing Instrument
              </h1>
              <p className="text-xs text-slate-500">
                Official Digital Registration under Section 24 of Legal Metrology Act 2009
              </p>
            </div>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300">
              Step {step} of 4
            </Badge>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[
              "1. Nameplate & OCR",
              "2. Specifications",
              "3. Establishment",
              "4. Digital ID",
            ].map((stName, idx) => (
              <div
                key={stName}
                className={`h-1.5 rounded-full transition-all ${
                  idx + 1 <= step ? "bg-emerald-600" : "bg-slate-200 dark:bg-slate-800"
                }`}
              />
            ))}
          </div>
        </div>

        {/* STEP 1: Nameplate Photo & AI OCR */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-emerald-600" />
                <h2 className="font-bold text-base text-slate-900 dark:text-white">
                  Step 1: Capture or Upload Instrument Nameplate
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                Photograph the metallic or printed nameplate showing Make, Model, Serial Number and Maximum Capacity. Our OCR service will extract the specifications automatically.
              </p>

              {/* Upload Dropzone */}
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center hover:border-emerald-500 transition-colors bg-slate-50/50 dark:bg-slate-800/20">
                {photoPreview ? (
                  <div className="space-y-3">
                    <img
                      src={photoPreview}
                      alt="Nameplate preview"
                      className="max-h-56 mx-auto rounded-xl object-contain border border-slate-200 shadow-sm"
                    />
                    <div className="flex items-center justify-center gap-2">
                      <label htmlFor="replace-photo" className="cursor-pointer">
                        <Button variant="outline" size="sm" asChild>
                          <span>Change Photo</span>
                        </Button>
                      </label>
                      <input
                        id="replace-photo"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) handlePhotoUpload(e.target.files[0]);
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <label htmlFor="nameplate-input" className="cursor-pointer">
                        <span className="text-sm font-semibold text-emerald-600 hover:text-emerald-700">
                          Click to upload nameplate photo
                        </span>{" "}
                        <span className="text-xs text-slate-500">or drag and drop</span>
                      </label>
                      <p className="text-[11px] text-slate-400 mt-1">PNG, JPG or JPEG up to 10MB</p>
                      
                      {/* Direct Mobile / Laptop Camera Capture */}
                      <div className="mt-3 flex justify-center">
                        <label
                          htmlFor="camera-capture-input"
                          className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 dark:border-emerald-800 transition-colors shadow-sm"
                        >
                          <Camera className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Capture Photo with Camera</span>
                        </label>
                        <input
                          id="camera-capture-input"
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) handlePhotoUpload(e.target.files[0]);
                          }}
                        />
                      </div>
                    </div>
                    <input
                      id="nameplate-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) handlePhotoUpload(e.target.files[0]);
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Hackathon Demo Quick Sample Nameplates */}
              <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    Demo Evaluation: Quick Sample Photos
                  </span>
                  <span className="text-[10px] text-amber-600 font-mono">1-Click Test</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs bg-white dark:bg-slate-900 border-amber-300"
                    onClick={() => handleLoadSamplePhoto("essae")}
                  >
                    Load Essae DS-215 (Counter)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs bg-white dark:bg-slate-900 border-amber-300"
                    onClick={() => handleLoadSamplePhoto("avery")}
                  >
                    Load Avery H400 (Platform)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs bg-white dark:bg-slate-900 border-amber-300"
                    onClick={() => handleLoadSamplePhoto("mettler")}
                  >
                    Load Mettler Truck Scale
                  </Button>
                </div>
              </div>

              {/* OCR Extracted Results Preview */}
              {scanningOCR && (
                <div className="flex items-center justify-center p-6 border border-slate-200 rounded-xl gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Running OCR Neural Extractor on nameplate...
                  </span>
                </div>
              )}

              {ocrResult && !scanningOCR && (
                <div className="p-4 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      OCR Extracted Specifications (Auto-Populated)
                    </span>
                    <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 px-2 py-0.5 rounded font-mono">
                      Neural Confidence: {Math.round((ocrResult.serial_no?.confidence || 0.95) * 100)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                    <div className="bg-white/90 dark:bg-slate-900/90 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-800/80">
                      <div className="text-[10px] text-slate-400 font-sans flex items-center justify-between">
                        <span>Make</span>
                        <span className="text-emerald-600">{Math.round((ocrResult.make?.confidence || 0.95) * 100)}%</span>
                      </div>
                      <div className="font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">{make}</div>
                    </div>
                    <div className="bg-white/90 dark:bg-slate-900/90 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-800/80">
                      <div className="text-[10px] text-slate-400 font-sans flex items-center justify-between">
                        <span>Model</span>
                        <span className="text-emerald-600">{Math.round((ocrResult.model?.confidence || 0.92) * 100)}%</span>
                      </div>
                      <div className="font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">{model}</div>
                    </div>
                    <div className="bg-white/90 dark:bg-slate-900/90 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-800/80">
                      <div className="text-[10px] text-slate-400 font-sans flex items-center justify-between">
                        <span>Serial Number</span>
                        <span className="text-emerald-600">{Math.round((ocrResult.serial_no?.confidence || 0.98) * 100)}%</span>
                      </div>
                      <div className="font-bold text-emerald-700 dark:text-emerald-400 truncate mt-0.5">{serialNo}</div>
                    </div>
                    <div className="bg-white/90 dark:bg-slate-900/90 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-800/80">
                      <div className="text-[10px] text-slate-400 font-sans flex items-center justify-between">
                        <span>Capacity</span>
                        <span className="text-emerald-600">{Math.round((ocrResult.capacity?.confidence || 0.94) * 100)}%</span>
                      </div>
                      <div className="font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">{capacity}</div>
                    </div>
                  </div>

                  {/* Raw OCR Vision Tokens */}
                  {ocrResult.raw_text && ocrResult.raw_text.length > 0 && (
                    <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60 space-y-1.5">
                      <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                        Recognized OIML R-76 Stamping Tokens:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {ocrResult.raw_text.map((txt, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/80 text-slate-700 dark:text-slate-300 text-[10px] rounded font-mono shadow-2xs"
                          >
                            {txt}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => setStep(2)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
              >
                <span>Continue to Specifications</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Technical Specifications */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-emerald-600" />
                <h2 className="font-bold text-base text-slate-900 dark:text-white">
                  Step 2: Verify Instrument Specifications
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                Confirm or amend the extracted specifications before database registration.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold">Instrument Category *</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="mt-1 text-xs">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {INSTRUMENT_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold">Accuracy Class</Label>
                  <Select value={accuracyClass} onValueChange={setAccuracyClass}>
                    <SelectTrigger className="mt-1 text-xs">
                      <SelectValue placeholder="Accuracy Class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Class I">Class I (Special Accuracy / Analytical)</SelectItem>
                      <SelectItem value="Class II">Class II (High Accuracy / Laboratory)</SelectItem>
                      <SelectItem value="Class III">Class III (Medium Accuracy / Commercial Retail)</SelectItem>
                      <SelectItem value="Class IIII">Class IIII (Ordinary Accuracy)</SelectItem>
                      <SelectItem value="Class 0.5">Class 0.5 (Liquid Fuel Dispenser)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold">Manufacturer / Make *</Label>
                  <Input
                    className="mt-1 text-xs"
                    placeholder="e.g. Essae-Teraoka"
                    value={make}
                    onChange={(e) => setMake(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold">Model *</Label>
                  <Input
                    className="mt-1 text-xs"
                    placeholder="e.g. DS-215"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold">Serial Number *</Label>
                  <Input
                    className="mt-1 text-xs font-mono font-bold"
                    placeholder="e.g. ES-2026-88912"
                    value={serialNo}
                    onChange={(e) => setSerialNo(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold">Max Capacity &amp; Interval (e) *</Label>
                  <Input
                    className="mt-1 text-xs"
                    placeholder="e.g. 30 kg (e = 5 g)"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold">Manufacture Year</Label>
                  <Input
                    type="number"
                    className="mt-1 text-xs"
                    value={manufactureYear}
                    onChange={(e) => setManufactureYear(parseInt(e.target.value) || 2026)}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
              </Button>
              <Button
                onClick={() => {
                  if (!make || !model || !serialNo) {
                    toast.error("Please fill in Make, Model, and Serial Number.");
                    return;
                  }
                  setStep(3);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Establishment Location <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Establishment & Location */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                <h2 className="font-bold text-base text-slate-900 dark:text-white">
                  Step 3: Installation Site &amp; Geolocation
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                Specify the physical shop or warehouse where this instrument is permanently deployed for inspection.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold">Shop / Commercial Establishment Name *</Label>
                  <Input
                    className="mt-1 text-xs"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold">Physical Street Address *</Label>
                  <Input
                    className="mt-1 text-xs"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold">State *</Label>
                  <Select
                    value={state}
                    onValueChange={(val) => {
                      setState(val);
                      const dists = STATE_DISTRICTS[val] || [];
                      if (dists.length > 0) setDistrict(dists[0]);
                    }}
                  >
                    <SelectTrigger className="mt-1 text-xs">
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(STATE_DISTRICTS).map((st) => (
                        <SelectItem key={st} value={st}>
                          {st}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold">District (Determines ID Sequence) *</Label>
                  <Select value={district} onValueChange={setDistrict}>
                    <SelectTrigger className="mt-1 text-xs">
                      <SelectValue placeholder="District" />
                    </SelectTrigger>
                    <SelectContent>
                      {(STATE_DISTRICTS[state] || []).map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Geolocation Tagging Card */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Geotagged Coordinates
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Used by field inspectors to locate the scale on site.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGetLocation}
                    disabled={locating}
                    className="text-xs flex items-center gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  >
                    {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
                    <span>{locating ? "Acquiring GPS..." : "Tag Current GPS"}</span>
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 block">Latitude</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{latitude}</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 block">Longitude</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{longitude}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Registering...</span>
                  </>
                ) : (
                  <>
                    <FileCheck className="w-4 h-4" />
                    <span>Complete Registration</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: Success & Digital ID Generation */}
        {step === 4 && createdInstrument && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-6 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Registration Successful!
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Your instrument has been assigned an official Government Digital ID and queued for verification.
              </p>
            </div>

            {/* Digital ID Display */}
            <div className="max-w-md mx-auto p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
              <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-300 tracking-wider">
                Assigned Digital ID
              </span>
              <div className="text-lg font-mono font-bold text-emerald-900 dark:text-emerald-200 mt-1 select-all">
                {createdInstrument.digital_id}
              </div>
            </div>

            {/* Specifications Summary */}
            <div className="max-w-md mx-auto text-left text-xs space-y-1.5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Make &amp; Model:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{createdInstrument.make} {createdInstrument.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Serial No:</span>
                <span className="text-slate-800 dark:text-slate-200">{createdInstrument.serial_no}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Location:</span>
                <span className="text-slate-800 dark:text-slate-200">{createdInstrument.district}, {createdInstrument.state}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Application:</span>
                <span className="text-blue-600 font-bold">New Verification (Submitted)</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button
                onClick={() => navigate(`/business/instruments/${createdInstrument.id}`)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"
              >
                View Digital QR Seal &amp; Label
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/business")}
                className="w-full sm:w-auto"
              >
                Return to Instrument List
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default RegisterInstrumentPage;
