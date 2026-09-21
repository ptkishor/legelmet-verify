import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabase";
import InstrumentQRCode from "@/components/common/InstrumentQRCode";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Scale,
  ArrowLeft,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  History,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

export const InstrumentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [instrument, setInstrument] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  const loadInstrumentDetails = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("instruments")
        .select(`
          *,
          certificates (
            id,
            certificate_no,
            issued_at,
            valid_till,
            pdf_url,
            signature_hash,
            is_revoked,
            revoked_reason,
            profiles:issued_by (
              full_name,
              designation
            )
          ),
          applications (
            id,
            application_no,
            type,
            status,
            created_at,
            remarks
          ),
          inspections (
            id,
            result,
            inspected_at,
            remarks,
            profiles:officer_id (
              full_name
            )
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      setInstrument(data);
    } catch (err: any) {
      console.error(err);
      toast.error(`Error loading instrument: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInstrumentDetails();
  }, [id]);

  const handleApplyReverification = async () => {
    if (!instrument) return;
    setApplying(true);
    try {
      const { error } = await (supabase.from("applications") as any).insert({
        instrument_id: instrument.id,
        applicant_id: instrument.owner_id,
        type: "re_verification",
        status: "submitted",
        remarks: "Annual re-verification requested by trader via portal.",
      });

      if (error) throw error;
      toast.success("Re-verification application submitted successfully!");
      loadInstrumentDetails();
    } catch (err: any) {
      toast.error(`Failed to submit application: ${err.message}`);
    } finally {
      setApplying(false);
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

  if (!instrument) {
    return (
      <DashboardLayout>
        <div className="text-center py-12 space-y-4">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
          <h2 className="text-lg font-bold">Instrument Not Found</h2>
          <Button onClick={() => navigate("/business")}>Return to Dashboard</Button>
        </div>
      </DashboardLayout>
    );
  }

  const latestCert = instrument.certificates?.[0];
  const isExpired = instrument.status === "expired";
  const isValid = instrument.status === "verified";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/business")}
              className="h-8 w-8 p-0 rounded-full"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {instrument.make} {instrument.model}
                </h1>
                <Badge
                  variant="outline"
                  className={
                    isValid
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                      : isExpired
                      ? "bg-red-50 text-red-700 border-red-300"
                      : "bg-blue-50 text-blue-700 border-blue-300"
                  }
                >
                  {instrument.status}
                </Badge>
              </div>
              <p className="text-xs font-mono text-slate-500">
                Digital ID: <span className="font-bold text-slate-900 dark:text-white">{instrument.digital_id}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(isExpired || instrument.status === "pending") && (
              <Button
                size="sm"
                onClick={handleApplyReverification}
                disabled={applying}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {applying ? "Submitting..." : "Apply Re-Verification"}
              </Button>
            )}
          </div>
        </div>

        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Details & Lifecycle */}
          <div className="lg:col-span-2 space-y-6">
            {/* Technical Specifications Card */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-slate-200">
                  <Scale className="w-4 h-4 text-emerald-600" />
                  Metrological Specifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold">CATEGORY</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{instrument.category}</span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold">SERIAL NUMBER</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{instrument.serial_no}</span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold">MAX CAPACITY</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{instrument.capacity || "N/A"}</span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold">ACCURACY CLASS</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{instrument.accuracy_class || "Class III"}</span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold">MANUFACTURE YEAR</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{instrument.manufacture_year || "2024"}</span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold">JURISDICTION</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{instrument.district}, {instrument.state}</span>
                  </div>
                </div>

                {/* Establishment Location */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-xs flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{instrument.shop_name}</div>
                    <div className="text-slate-500">{instrument.address}</div>
                    {instrument.latitude && (
                      <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        GPS: {instrument.latitude}, {instrument.longitude}
                      </div>
                    )}
                  </div>
                </div>

                {/* Nameplate Photo if uploaded */}
                {instrument.nameplate_photo_url && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase mb-2">
                      Registered Nameplate Image
                    </span>
                    <img
                      src={instrument.nameplate_photo_url}
                      alt="Nameplate"
                      className="h-44 rounded-xl object-contain border border-slate-200 dark:border-slate-700 bg-slate-50"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Verification & Lifecycle History */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-slate-200">
                  <History className="w-4 h-4 text-blue-600" />
                  Verification &amp; Application History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {instrument.applications?.map((app: any) => (
                    <div
                      key={app.id}
                      className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold font-mono text-slate-900 dark:text-slate-100">
                          {app.application_no}
                        </div>
                        <div className="text-slate-500 capitalize">
                          {app.type?.replace("_", " ")} • {new Date(app.created_at).toLocaleDateString("en-IN")}
                        </div>
                      </div>
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
                    </div>
                  ))}

                  {(!instrument.applications || instrument.applications.length === 0) && (
                    <p className="text-xs text-slate-400 text-center py-4">
                      No application records on file.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Col: QR Seal & Certificate Card */}
          <div className="space-y-6">
            <InstrumentQRCode
              digitalId={instrument.digital_id}
              category={instrument.category}
              make={instrument.make}
              model={instrument.model}
              validTill={latestCert?.valid_till}
              status={instrument.status}
            />

            {/* Certificate Summary */}
            {latestCert && (
              <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Active Certificate Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Cert No:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{latestCert.certificate_no}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Issued On:</span>
                    <span>{new Date(latestCert.issued_at).toLocaleDateString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Valid Till:</span>
                    <span className={isExpired ? "text-red-600 font-bold" : "text-emerald-700 font-bold"}>
                      {new Date(latestCert.valid_till).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 break-all">
                    <span>HMAC Signature:</span>
                    <div className="text-[9px] text-slate-500 font-mono mt-0.5">{latestCert.signature_hash}</div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default InstrumentDetailPage;
