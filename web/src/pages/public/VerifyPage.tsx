import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import QRScannerModal from "@/components/common/QRScannerModal";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  Camera,
  Scale,
  History,
  FileCheck,
  FileWarning,
  Loader2,
  Download,
  Copy,
  Check,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { downloadCertificatePdf } from "@/lib/certificateGenerator";

export const VerifyPage: React.FC = () => {
  const { digitalId: paramDigitalId } = useParams<{ digitalId?: string }>();
  const navigate = useNavigate();

  const [searchInput, setSearchInput] = useState<string>(paramDigitalId || "");
  const [currentId, setCurrentId] = useState<string | null>(paramDigitalId || null);
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<any>(null);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [downloadingCert, setDownloadingCert] = useState<boolean>(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const fetchVerification = async (did: string) => {
    setLoading(true);
    setData(null);

    try {
      // 1. First attempt: call the RPC function get_instrument_verification
      const { data: rpcData, error: rpcErr } = await (supabase.rpc as any)(
        "get_instrument_verification",
        { p_digital_id: did.trim() }
      );

      if (!rpcErr && rpcData && rpcData.found && rpcData.certificate && rpcData.certificate.signature_hash) {
        setData(rpcData);
        setLoading(false);
        return;
      }

      // 2. Direct fallback query across instruments, certificates, inspections
      const { data: inst, error: instErr } = await supabase
        .from("instruments")
        .select(`
          *,
          certificates (
            certificate_no,
            issued_at,
            valid_till,
            pdf_url,
            signature_hash,
            is_revoked,
            profiles:issued_by (
              full_name,
              designation
            )
          ),
          inspections (
            id,
            result,
            remarks,
            inspected_at,
            profiles:officer_id (
              full_name
            )
          )
        `)
        .eq("digital_id", did.trim())
        .maybeSingle();

      if (instErr) throw instErr;

      if (inst) {
        const targetInst = inst as any;
        const latestCert = targetInst.certificates?.[0] || null;
        const inspectionsList = (targetInst.inspections || []).map((ins: any) => ({
          inspected_at: ins.inspected_at,
          result: ins.result,
          officer_name: ins.profiles?.full_name || "Legal Metrology Officer",
          remarks: ins.remarks,
        }));

        setData({
          found: true,
          instrument: inst,
          certificate: latestCert
            ? {
                certificate_no: latestCert.certificate_no,
                issued_at: latestCert.issued_at,
                valid_till: latestCert.valid_till,
                signature_hash: latestCert.signature_hash,
                officer_name: latestCert.profiles?.full_name || "Legal Metrology Officer",
                officer_designation: latestCert.profiles?.designation || "Inspector, Legal Metrology",
                is_valid: new Date(latestCert.valid_till) > new Date() && !latestCert.is_revoked,
              }
            : null,
          inspections: inspectionsList,
        });
      } else {
        setData({ found: false });
      }
    } catch (err: any) {
      console.error(err);
      toast.error(`Verification error: ${err.message}`);
      setData({ found: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (paramDigitalId) {
      setSearchInput(paramDigitalId);
      setCurrentId(paramDigitalId);
      fetchVerification(paramDigitalId);
    }
  }, [paramDigitalId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) {
      toast.error("Please enter a Digital ID");
      return;
    }
    navigate(`/verify/${searchInput.trim()}`);
  };

  const handleScanSuccess = (scannedId: string) => {
    setSearchInput(scannedId);
    navigate(`/verify/${scannedId}`);
  };

  const inst = data?.instrument;
  const cert = data?.certificate;
  const isValid = cert?.is_valid && inst?.status === "verified";
  const isExpired = inst?.status === "expired" || (cert && !cert.is_valid);
  const isRejected = inst?.status === "rejected" || inst?.status === "suspended";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Search / Scan Bar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 text-center sm:text-left">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Public Instrument Verification Portal
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Verify accuracy compliance, calibration dates, and tamper seals of commercial weighing instruments.
            </p>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Enter Digital ID (e.g. LM-IN-HR-GGN-2026-00000001)"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 font-mono text-xs sm:text-sm h-11"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsScannerOpen(true)}
              className="h-11 text-xs sm:text-sm flex items-center gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            >
              <Camera className="w-4 h-4" />
              <span>Scan QR Sticker</span>
            </Button>
            <Button type="submit" className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm">
              Verify Now
            </Button>
          </form>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="py-16 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-9 h-9 animate-spin text-emerald-600" />
            <p className="text-xs text-slate-500 font-medium">
              Querying National Legal Metrology Registry...
            </p>
          </div>
        )}

        {/* Verification Result Display */}
        {!loading && data && data.found && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* HERO TRUST BANNER */}
            <div
              className={`p-6 rounded-2xl border flex flex-col sm:flex-row items-center gap-5 shadow-sm text-center sm:text-left ${
                isValid
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200"
                  : isExpired
                  ? "bg-red-500/10 border-red-500/30 text-red-950 dark:text-red-200"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-200"
              }`}
            >
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                  isValid
                    ? "bg-emerald-600 text-white"
                    : isExpired
                    ? "bg-red-600 text-white"
                    : "bg-amber-600 text-white"
                }`}
              >
                {isValid ? (
                  <ShieldCheck className="w-10 h-10" />
                ) : (
                  <ShieldAlert className="w-10 h-10" />
                )}
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-xl font-bold tracking-tight">
                    {isValid
                      ? "OFFICIALLY VERIFIED & COMPLIANT"
                      : isExpired
                      ? "VERIFICATION EXPIRED • NON-COMPLIANT"
                      : isRejected
                      ? "VERIFICATION REJECTED OR SUSPENDED"
                      : "PENDING VERIFICATION"}
                  </h2>
                  <Badge
                    className={
                      isValid
                        ? "bg-emerald-600 text-white"
                        : isExpired
                        ? "bg-red-600 text-white"
                        : "bg-amber-600 text-white"
                    }
                  >
                    {inst?.status?.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-xs opacity-90 leading-relaxed max-w-xl">
                  {isValid && cert
                    ? `This weighing instrument was physically verified by the Legal Metrology Department and is legally stamped until ${new Date(
                        cert.valid_till
                      ).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}.`
                    : isExpired
                    ? "WARNING: The verification certificate for this instrument has expired. Commercial use of an unverified instrument is an offence under Section 24 of the Legal Metrology Act 2009."
                    : "CAUTION: This scale failed accuracy inspection or has been reported for suspected tampering. Please report non-compliant transactions."}
                </p>
              </div>

              {/* Action: Report Infraction */}
              <Button asChild variant="outline" size="sm" className="shrink-0 text-xs border-current">
                <Link to={`/complaint/${inst?.digital_id}`}>
                  File Consumer Grievance
                </Link>
              </Button>
            </div>

            {/* 2-Column Detail Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Instrument & Shop Metadata */}
              <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <Scale className="w-4 h-4 text-emerald-600" />
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Commercial Establishment &amp; Scale
                    </h3>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Shop / Business</span>
                      <span className="font-bold text-slate-900 dark:text-white text-sm">{inst?.shop_name}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Address</span>
                      <span className="text-slate-700 dark:text-slate-300">
                        {inst?.address ? `${inst.address}, ` : ""}{inst?.district}, {inst?.state}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 font-mono">
                      <div>
                        <span className="text-slate-400 block text-[10px]">DIGITAL ID</span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">{inst?.digital_id}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">SERIAL NO</span>
                        <span className="text-slate-700 dark:text-slate-300">{inst?.serial_no}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">MAKE &amp; MODEL</span>
                        <span className="text-slate-700 dark:text-slate-300">{inst?.make} {inst?.model}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">MAX CAPACITY</span>
                        <span className="text-slate-700 dark:text-slate-300">{inst?.capacity || "30 kg"}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Certificate & Cryptographic Integrity */}
              <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <FileCheck className="w-4 h-4 text-emerald-600" />
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Official Certificate &amp; Signature
                    </h3>
                  </div>

                  {cert ? (
                    <div className="space-y-2 text-xs font-mono">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">Certificate Number</span>
                        <span className="font-bold text-slate-900 dark:text-white text-sm">{cert.certificate_no}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <span className="text-slate-400 block text-[10px]">ISSUED ON</span>
                          <span>{new Date(cert.issued_at).toLocaleDateString("en-IN")}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">VALID UNTIL</span>
                          <span className={isValid ? "text-emerald-700 font-bold" : "text-red-600 font-bold"}>
                            {new Date(cert.valid_till).toLocaleDateString("en-IN")}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-sans font-bold flex items-center gap-1">
                            <Shield className="w-3.5 h-3.5 text-emerald-600" />
                            256-Bit SHA-256 HMAC Stamp
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(cert.signature_hash);
                              setCopiedHash(cert.signature_hash);
                              toast.success("HMAC signature copied to clipboard!");
                              setTimeout(() => setCopiedHash(null), 2500);
                            }}
                            className="text-[10px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 font-sans"
                          >
                            {copiedHash === cert.signature_hash ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" /> Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" /> Copy Hash
                              </>
                            )}
                          </button>
                        </div>
                        <div className="p-2 bg-slate-50 dark:bg-slate-800/80 rounded-lg text-[9px] text-slate-600 dark:text-slate-400 break-all select-all border border-slate-200 dark:border-slate-700">
                          {cert.signature_hash}
                        </div>
                      </div>

                      {/* Download Official Form VII PDF */}
                      <Button
                        size="sm"
                        disabled={downloadingCert}
                        onClick={async () => {
                          setDownloadingCert(true);
                          try {
                            await downloadCertificatePdf({
                              certificateNo: cert.certificate_no,
                              digitalId: inst.digital_id,
                              issuedAt: cert.issued_at,
                              validTill: cert.valid_till,
                              signatureHash: cert.signature_hash,
                              make: inst.make,
                              model: inst.model,
                              serialNo: inst.serial_no,
                              category: inst.category,
                              capacity: inst.capacity,
                              accuracyClass: inst.accuracy_class,
                              shopName: inst.shop_name,
                              address: inst.address,
                              district: inst.district,
                              state: inst.state,
                              officerName: cert.officer_name || "Legal Metrology Officer",
                              officerDesignation: cert.officer_designation || "Inspector, Legal Metrology",
                              verificationSealNo: `SEAL-${inst.district?.toUpperCase().slice(0, 3)}-${cert.certificate_no.slice(-5)}`,
                            });
                            toast.success(`Form VII Certificate (${cert.certificate_no}) downloaded!`);
                          } catch (err: any) {
                            console.error(err);
                            toast.error(`Failed to generate PDF: ${err.message}`);
                          } finally {
                            setDownloadingCert(false);
                          }
                        }}
                        className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 flex items-center justify-center gap-1.5 font-sans"
                      >
                        {downloadingCert ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                            <span>Generating Form VII PDF...</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5 mr-1" />
                            <span>Download Official Certificate (Form VII)</span>
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      No official certificate record issued yet.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Inspection History Timeline */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <History className="w-4 h-4 text-blue-600" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Official Inspection &amp; Calibration History
                  </h3>
                </div>

                <div className="space-y-3">
                  {data.inspections?.map((ins: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {new Date(ins.inspected_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                          <Badge
                            variant="outline"
                            className={
                              ins.result === "pass"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                : "bg-red-50 text-red-700 border-red-300"
                            }
                          >
                            {ins.result?.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-slate-500 mt-0.5">
                          Inspector: <strong>{ins.officer_name}</strong>
                          {ins.remarks && ` • "${ins.remarks}"`}
                        </p>
                      </div>
                    </div>
                  ))}

                  {(!data.inspections || data.inspections.length === 0) && (
                    <p className="text-xs text-slate-400 text-center py-4">
                      No previous inspection logs recorded.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Not Found Screen */}
        {!loading && data && !data.found && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-4 shadow-sm">
            <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <FileWarning className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                No Official Record Found
              </h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                The identifier <span className="font-mono font-bold text-slate-800 dark:text-slate-200">&ldquo;{currentId}&rdquo;</span> is not registered in the Government Legal Metrology registry.
              </p>
            </div>
            <div className="pt-2">
              <Button asChild size="sm" variant="outline" className="text-xs border-amber-300 text-amber-700">
                <Link to={`/complaint/${currentId}`}>
                  Report Suspected Unregistered Scale
                </Link>
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* QR Camera Scanner Modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />
    </div>
  );
};

export default VerifyPage;
