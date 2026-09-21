import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import {
  Download,
  Printer,
  Copy,
  Check,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { PUBLIC_URL } from "@/lib/constants";

interface InstrumentQRCodeProps {
  digitalId: string;
  category?: string;
  make?: string;
  model?: string;
  validTill?: string | null;
  status?: string;
}

export const InstrumentQRCode: React.FC<InstrumentQRCodeProps> = ({
  digitalId,
  category,
  make,
  model,
  validTill,
  status: _status = "verified",
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  // The official public verification URL
  const verifyUrl = `${PUBLIC_URL}/verify/${digitalId}`;

  useEffect(() => {
    QRCode.toDataURL(verifyUrl, {
      width: 320,
      margin: 1.5,
      color: {
        dark: "#0f172a", // Slate 900
        light: "#ffffff",
      },
      errorCorrectionLevel: "H", // High redundancy for physical stickers
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("QR Generation error:", err));
  }, [verifyUrl]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(verifyUrl);
    setCopied(true);
    toast.success("Verification link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `LegalMet-QR-${digitalId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("QR Code downloaded!");
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to print certificate label.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Legal Metrology Verification Seal - ${digitalId}</title>
          <style>
            @page { size: A6 landscape; margin: 10mm; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 16px;
              background: #fff;
            }
            .sticker-card {
              border: 3px solid #047857;
              border-radius: 12px;
              padding: 16px;
              max-width: 480px;
              margin: 0 auto;
            }
            .header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 2px solid #047857;
              padding-bottom: 8px;
              margin-bottom: 12px;
            }
            .title {
              font-size: 14px;
              font-weight: 800;
              text-transform: uppercase;
              color: #047857;
            }
            .subtitle {
              font-size: 9px;
              color: #64748b;
            }
            .content {
              display: flex;
              align-items: center;
              gap: 16px;
            }
            .qr-img {
              width: 140px;
              height: 140px;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
            }
            .details {
              font-size: 11px;
              line-height: 1.5;
            }
            .did {
              font-family: monospace;
              font-size: 13px;
              font-weight: 700;
              color: #047857;
              margin-bottom: 6px;
            }
            .badge {
              display: inline-block;
              background: #ecfdf5;
              color: #047857;
              border: 1px solid #a7f3d0;
              font-size: 10px;
              font-weight: 700;
              padding: 2px 6px;
              border-radius: 4px;
              margin-top: 6px;
            }
            .footer {
              margin-top: 10px;
              font-size: 8px;
              color: #94a3b8;
              text-align: center;
              border-top: 1px dashed #cbd5e1;
              padding-top: 6px;
            }
          </style>
        </head>
        <body>
          <div class="sticker-card">
            <div class="header">
              <div>
                <div class="title">Govt. of India • Legal Metrology</div>
                <div class="subtitle">Official Verification Seal • SIH 2026</div>
              </div>
            </div>
            <div class="content">
              <img src="${qrDataUrl}" class="qr-img" />
              <div class="details">
                <div class="did">${digitalId}</div>
                <div><strong>Type:</strong> ${category || "Weighing Instrument"}</div>
                <div><strong>Make:</strong> ${make || ""} ${model || ""}</div>
                ${validTill ? `<div><strong>Valid Till:</strong> ${new Date(validTill).toLocaleDateString("en-IN")}</div>` : ""}
                <div class="badge">VERIFIED &amp; COMPLIANT</div>
              </div>
            </div>
            <div class="footer">
              Scan with any mobile device to inspect calibration history and digital certificate.
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
      {/* Badge */}
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 dark:border-emerald-800 mb-3">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>Official Tamper-Evident QR Seal</span>
      </div>

      <h3 className="font-bold text-slate-900 dark:text-white text-base">
        Physical Verification Stamp
      </h3>
      <p className="text-xs text-slate-500 max-w-xs mt-1 mb-4">
        Paste this QR sticker on the scale body or display counter for citizen inspection.
      </p>

      {/* QR Code Container */}
      <div className="p-3 bg-white rounded-2xl border-2 border-dashed border-emerald-500/40 shadow-inner mb-4 flex items-center justify-center">
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt={`QR Code for ${digitalId}`}
            className="w-48 h-48 sm:w-56 sm:h-56 object-contain rounded-lg"
          />
        ) : (
          <div className="w-48 h-48 sm:w-56 sm:h-56 bg-slate-100 animate-pulse rounded-lg flex items-center justify-center text-xs text-slate-400">
            Generating Secure QR...
          </div>
        )}
      </div>

      {/* Digital ID Display */}
      <div className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 mb-4">
        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
          Unique Digital ID
        </div>
        <div className="text-xs sm:text-sm font-mono font-bold text-emerald-800 dark:text-emerald-300 select-all">
          {digitalId}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2 w-full">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          disabled={!qrDataUrl}
          className="text-xs flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Save PNG</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handlePrint}
          disabled={!qrDataUrl}
          className="text-xs flex items-center gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print Label</span>
        </Button>
      </div>

      <div className="flex items-center justify-between w-full pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
        <button
          type="button"
          onClick={handleCopyLink}
          className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? "Copied Link" : "Copy URL"}</span>
        </button>

        <a
          href={verifyUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium"
        >
          <span>Test Scanner View</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};

export default InstrumentQRCode;
