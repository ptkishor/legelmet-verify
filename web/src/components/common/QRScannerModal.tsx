import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (digitalId: string) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const parseDigitalId = (decodedText: string): string => {
    // If it's a full URL like http://localhost:5173/verify/LM-IN-HR-GGN-2026-00000001
    if (decodedText.includes("/verify/")) {
      const parts = decodedText.split("/verify/");
      return parts[1]?.trim() || decodedText;
    }
    return decodedText.trim();
  };

  const startScanner = async () => {
    setCameraError(null);
    setScanning(true);

    try {
      const html5QrCode = new Html5Qrcode("interactive-qr-reader");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" }, // Prefer rear camera on mobile
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // Success callback
          const did = parseDigitalId(decodedText);
          toast.success(`QR Code Scanned: ${did}`);
          stopScanner();
          onScanSuccess(did);
          onClose();
        },
        () => {
          // Ignore individual frame decode errors
        }
      );
    } catch (err: any) {
      console.warn("Camera start warning:", err);
      setCameraError(
        "Camera access unavailable or permission denied. Use the quick demo buttons below to simulate a physical scan."
      );
      setScanning(false);
    }
  };

  const stopScanner = () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current
        .stop()
        .then(() => scannerRef.current?.clear())
        .catch((e) => console.warn("Stop scanner error:", e));
    }
    setScanning(false);
  };

  useEffect(() => {
    if (isOpen) {
      // Delay slightly for modal DOM node to mount
      const timer = setTimeout(() => {
        startScanner();
      }, 300);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen]);

  const handleSimulateScan = (digitalId: string) => {
    stopScanner();
    toast.success(`Simulated scan: ${digitalId}`);
    onScanSuccess(digitalId);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
            <Camera className="w-5 h-5 text-emerald-600" />
            <span>Scan Legal Metrology QR Seal</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Point your mobile camera at the QR sticker on the scale body or display panel.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {/* Camera Viewfinder Box */}
          <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl overflow-hidden bg-slate-950 aspect-square flex flex-col items-center justify-center text-white">
            <div id="interactive-qr-reader" className="w-full h-full" />

            {scanning && !cameraError && (
              <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/80 text-[10px] text-white backdrop-blur-sm z-10">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                Live Camera
              </div>
            )}

            {cameraError && (
              <div className="absolute inset-0 bg-slate-900/90 p-6 flex flex-col items-center justify-center text-center space-y-3">
                <AlertCircle className="w-10 h-10 text-amber-500" />
                <p className="text-xs text-slate-300 leading-relaxed max-w-xs">
                  {cameraError}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startScanner}
                  className="text-xs bg-slate-800 text-white border-slate-700"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" /> Retry Camera
                </Button>
              </div>
            )}
          </div>

          {/* Quick Demo Simulator for Evaluation */}
          <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-600" />
                Live Demo: Test Sample QR Scans
              </span>
              <span className="text-[10px] text-amber-600 font-mono">1-Click</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              <button
                type="button"
                onClick={() => handleSimulateScan("LM-IN-HR-GGN-2026-00000001")}
                className="text-left px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-emerald-200 hover:border-emerald-400 flex items-center justify-between transition-colors"
              >
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                    Sharma Sweets (Counter Scale)
                  </span>
                  <span className="font-mono text-[10px] text-emerald-600">
                    LM-IN-HR-GGN-2026-00000001 (Valid)
                  </span>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                  PASS
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSimulateScan("LM-IN-MH-PUN-2026-00000003")}
                className="text-left px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-red-200 hover:border-red-400 flex items-center justify-between transition-colors"
              >
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                    Patil Mandi Weighbridge (Pune)
                  </span>
                  <span className="font-mono text-[10px] text-red-600">
                    LM-IN-MH-PUN-2026-00000003 (Expired)
                  </span>
                </div>
                <span className="text-[10px] font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded">
                  EXPIRED
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSimulateScan("LM-IN-MH-PUN-2026-00000005")}
                className="text-left px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-amber-200 hover:border-amber-400 flex items-center justify-between transition-colors"
              >
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                    Ganesh Auto Fuels (Pune Dispenser)
                  </span>
                  <span className="font-mono text-[10px] text-amber-600">
                    LM-IN-MH-PUN-2026-00000005 (Rejected/Seized)
                  </span>
                </div>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                  SEIZED
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Close Scanner
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRScannerModal;
