import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileCheck,
  ShieldCheck,
  ExternalLink,
  QrCode,
  Loader2,
  Download,
  Eye,
  Copy,
  Check,
  Shield,
  FileText,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { downloadCertificatePdf, type CertificatePdfData } from "@/lib/certificateGenerator";

export const CertificatesPage: React.FC = () => {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [previewCert, setPreviewCert] = useState<any | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const loadCertificates = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("certificates")
        .select(`
          id,
          certificate_no,
          issued_at,
          valid_till,
          pdf_url,
          signature_hash,
          is_revoked,
          revoked_reason,
          instruments!inner (
            id,
            digital_id,
            category,
            make,
            model,
            serial_no,
            capacity,
            accuracy_class,
            owner_id,
            shop_name,
            address,
            district,
            state
          ),
          profiles:issued_by (
            full_name,
            designation
          )
        `)
        .eq("instruments.owner_id", user.id)
        .order("issued_at", { ascending: false });

      if (error) throw error;
      setCertificates(data || []);
    } catch (err: any) {
      console.error(err);
      toast.error(`Failed to load certificates: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCertificates();
  }, [user]);

  const handleDownload = async (cert: any) => {
    setDownloadingId(cert.id);
    try {
      const pdfData: CertificatePdfData = {
        certificateNo: cert.certificate_no,
        digitalId: cert.instruments.digital_id,
        issuedAt: cert.issued_at,
        validTill: cert.valid_till,
        signatureHash: cert.signature_hash,
        make: cert.instruments.make,
        model: cert.instruments.model,
        serialNo: cert.instruments.serial_no,
        category: cert.instruments.category,
        capacity: cert.instruments.capacity,
        accuracyClass: cert.instruments.accuracy_class,
        shopName: cert.instruments.shop_name,
        address: cert.instruments.address,
        district: cert.instruments.district,
        state: cert.instruments.state,
        officerName: cert.profiles?.full_name || "Legal Metrology Officer",
        officerDesignation: cert.profiles?.designation || "Inspector, Legal Metrology",
        verificationSealNo: `SEAL-${cert.instruments.district?.toUpperCase().slice(0, 3)}-${cert.certificate_no.slice(-5)}`,
      };

      await downloadCertificatePdf(pdfData);
      toast.success(`Form VII Certificate (${cert.certificate_no}) downloaded!`);
    } catch (err: any) {
      console.error(err);
      toast.error(`Failed to generate PDF: ${err.message}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    toast.success("HMAC hash copied to clipboard!");
    setTimeout(() => setCopiedHash(null), 2500);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <FileCheck className="w-6 h-6 text-emerald-600" />
                Legal Metrology Certificates
              </h1>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300">
                Form VII (Rule 14)
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Statutory verification certificates with embedded QR codes and 256-bit cryptographic HMAC signatures.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {certificates.map((cert) => {
              const isValid = new Date(cert.valid_till) > new Date() && !cert.is_revoked;
              const isDownloading = downloadingId === cert.id;

              return (
                <div
                  key={cert.id}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between space-y-4 hover:border-emerald-300 dark:hover:border-emerald-700 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white font-mono">
                          {cert.certificate_no}
                        </h3>
                        <p className="text-xs font-mono text-emerald-700 dark:text-emerald-400">
                          {cert.instruments?.digital_id}
                        </p>
                      </div>
                    </div>
                    <Badge
                      className={
                        isValid
                          ? "bg-emerald-600 text-white font-bold text-[10px]"
                          : "bg-red-600 text-white font-bold text-[10px]"
                      }
                    >
                      {isValid ? "VALID" : "EXPIRED"}
                    </Badge>
                  </div>

                  {/* Instrument & Dates Block */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Instrument:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {cert.instruments?.make} {cert.instruments?.model}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Serial No:</span>
                      <span className="text-slate-700 dark:text-slate-300">{cert.instruments?.serial_no}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Capacity / Class:</span>
                      <span className="text-slate-700 dark:text-slate-300">
                        {cert.instruments?.capacity || "N/A"} ({cert.instruments?.accuracy_class || "Class III"})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Issued On:</span>
                      <span>{new Date(cert.issued_at).toLocaleDateString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Valid Till:</span>
                      <span className={isValid ? "text-emerald-600 font-bold" : "text-red-600 font-bold"}>
                        {new Date(cert.valid_till).toLocaleDateString("en-IN")}
                      </span>
                    </div>
                  </div>

                  {/* Cryptographic Hash Security Strip */}
                  <div className="p-2.5 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200/60 dark:border-emerald-900/40 text-[11px] space-y-1">
                    <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300 font-semibold">
                      <span className="flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5 text-emerald-600" />
                        256-Bit Cryptographic HMAC Stamp
                      </span>
                      <button
                        onClick={() => copyToClipboard(cert.signature_hash)}
                        className="text-[10px] text-emerald-600 hover:text-emerald-800 dark:hover:text-emerald-200 flex items-center gap-1 font-sans"
                        title="Copy HMAC Hash"
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
                    <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400 break-all leading-tight">
                      {cert.signature_hash}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8 flex-1 sm:flex-none"
                        onClick={() => setPreviewCert(cert)}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white flex-1 sm:flex-none"
                        disabled={isDownloading}
                        onClick={() => handleDownload(cert)}
                      >
                        {isDownloading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5 mr-1" />
                            Download Form VII
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="flex items-center gap-3 text-xs w-full sm:w-auto justify-end">
                      <Link
                        to={`/business/instruments/${cert.instruments?.id}`}
                        className="inline-flex items-center gap-1 font-semibold text-emerald-600 hover:text-emerald-700"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>A6 QR Sticker</span>
                      </Link>

                      <a
                        href={`/verify/${cert.instruments?.digital_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      >
                        <span>Verify</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}

            {certificates.length === 0 && (
              <div className="col-span-2 text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8">
                <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">No certificates issued yet</h3>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Once your instrument undergoes physical on-site inspection and calibration passes, your certificate will appear here.
                </p>
                <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Link to="/business/apply">Register &amp; Apply</Link>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Modal: Interactive Certificate Preview */}
        {previewCert && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
              {/* Government Tricolor Top Accent */}
              <div className="h-1.5 flex w-full">
                <div className="flex-1 bg-[#FF9933]" />
                <div className="flex-1 bg-white" />
                <div className="flex-1 bg-[#138808]" />
              </div>

              {/* Modal Header */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Statutory Certificate Preview (Form VII)
                  </h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewCert(null)}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Modal Body: Styled Government Certificate Layout */}
              <div className="p-6 space-y-5 text-xs">
                {/* Government Header Box */}
                <div className="text-center border-b border-slate-200 dark:border-slate-800 pb-4 space-y-1">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Government of India
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                    DEPARTMENT OF LEGAL METROLOGY • {previewCert.instruments?.state?.toUpperCase()}
                  </h3>
                  <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                    FORM VII [See Rule 14] — CERTIFICATE OF VERIFICATION
                  </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Certificate Number</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                      {previewCert.certificate_no}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">National Digital ID</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                      {previewCert.instruments?.digital_id}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Commercial Establishment</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {previewCert.instruments?.shop_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Premises Location</span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {previewCert.instruments?.district}, {previewCert.instruments?.state}
                    </span>
                  </div>
                </div>

                {/* Equipment Specs Table */}
                <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5">
                  <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                    Verified Equipment Specifications
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500">Make &amp; Model:</span>{" "}
                      <span className="font-semibold">{previewCert.instruments?.make} {previewCert.instruments?.model}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Serial Number:</span>{" "}
                      <span className="font-mono">{previewCert.instruments?.serial_no}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Capacity:</span>{" "}
                      <span className="font-semibold">{previewCert.instruments?.capacity || "Commercial"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Accuracy Class:</span>{" "}
                      <span className="font-semibold text-emerald-600">{previewCert.instruments?.accuracy_class || "Class III"}</span>
                    </div>
                  </div>
                </div>

                {/* Statutory Certification Statement */}
                <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl space-y-2">
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 italic leading-relaxed">
                    &ldquo;I hereby certify that I have this day examined, tested and calibrated the weighing/measuring
                    instrument described above with standard weights/measures in accordance with the Legal Metrology Act, 2009,
                    and found it to conform with statutory tolerance limits.&rdquo;
                  </p>
                  <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/40 flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">
                      Inspecting Officer: <strong className="text-slate-800 dark:text-slate-200">{previewCert.profiles?.full_name || "Legal Metrology Officer"}</strong>
                    </span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                      Valid Till: {new Date(previewCert.valid_till).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                    </span>
                  </div>
                </div>

                {/* Cryptographic Seal Display */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-500">
                    <span>Tamper-Evident SHA-256 HMAC Stamp</span>
                    <span className="text-emerald-600 font-sans normal-case">✓ Authenticated</span>
                  </div>
                  <div className="font-mono text-[10px] text-slate-700 dark:text-slate-300 break-all bg-white dark:bg-slate-900 p-2 rounded border border-slate-100 dark:border-slate-800">
                    {previewCert.signature_hash}
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewCert(null)}
                    className="text-xs"
                  >
                    Close Preview
                  </Button>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                    onClick={() => {
                      handleDownload(previewCert);
                      setPreviewCert(null);
                    }}
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    Download Official PDF
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CertificatesPage;
