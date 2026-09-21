import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import { supabase } from "@/lib/supabase";
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
  AlertTriangle,
  CheckCircle2,
  Phone,
  User,
  Scale,
  FileText,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

export const ComplaintPage: React.FC = () => {
  const { digitalId: paramDigitalId } = useParams<{ digitalId?: string }>();

  const [digitalId, setDigitalId] = useState<string>(paramDigitalId || "LM-IN-HR-GGN-2026-00000001");
  const [citizenName, setCitizenName] = useState("");
  const [citizenContact, setCitizenContact] = useState("");
  const [infractionType, setInfractionType] = useState("Short delivery (delivering less weight than displayed)");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Success result
  const [submittedComplaint, setSubmittedComplaint] = useState<{
    complaint_no: string;
    instrument_digital_id: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!digitalId.trim() || !citizenName.trim() || !description.trim()) {
      toast.error("Please fill in the Digital ID, your name, and description.");
      return;
    }

    setSubmitting(true);
    toast.loading("Submitting consumer grievance to Legal Metrology Department...", { id: "cmp-submit" });

    try {
      // 1. Resolve instrument ID from digital_id
      const { data: inst, error: instError } = await supabase
        .from("instruments")
        .select("id, digital_id, shop_name")
        .eq("digital_id", digitalId.trim())
        .maybeSingle();

      if (instError || !inst) {
        throw new Error(
          `Instrument with Digital ID "${digitalId}" was not found. Please verify the ID on the physical scale seal.`
        );
      }

      // 2. Insert into complaints table (trigger auto_assign_complaint will assign an officer)
      const targetInst = inst as any;
      const { data: cmpData, error: cmpError } = await (supabase
        .from("complaints") as any)
        .insert({
          instrument_id: targetInst.id,
          citizen_name: citizenName.trim(),
          citizen_contact: citizenContact.trim() || null,
          description: `[${infractionType}]: ${description.trim()}`,
          status: "open",
        })
        .select()
        .single();

      if (cmpError) throw cmpError;

      setSubmittedComplaint({
        complaint_no: cmpData.complaint_no || "CMP-2026-000088",
        instrument_digital_id: targetInst.digital_id,
      });

      toast.success("Complaint registered and assigned to district officer!", { id: "cmp-submit" });
    } catch (err: any) {
      console.error(err);
      toast.error(`Submission failed: ${err.message}`, { id: "cmp-submit" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-8">
        {!submittedComplaint ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="text-center sm:text-left pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-xs font-semibold border border-amber-200 dark:border-amber-800 mb-2">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Consumer Protection Redressal</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                File Legal Metrology Grievance
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Report short delivery, broken tamper seals, or suspected scale manipulation directly to the state enforcement cell.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-xs font-semibold">Instrument Digital ID *</Label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Scale className="h-4 w-4" />
                  </div>
                  <Input
                    placeholder="e.g. LM-IN-HR-GGN-2026-00000001"
                    value={digitalId}
                    onChange={(e) => setDigitalId(e.target.value)}
                    className="pl-9 font-mono text-xs font-bold"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Printed beneath the QR code on the physical scale or verification seal sticker.
                </p>
              </div>

              <div>
                <Label className="text-xs font-semibold">Infraction Category *</Label>
                <Select value={infractionType} onValueChange={setInfractionType}>
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Short delivery (delivering less weight than displayed)">
                      Short Delivery (Delivering less weight than displayed)
                    </SelectItem>
                    <SelectItem value="Broken or tampered lead verification seal">
                      Broken or Tampered Lead Verification Seal
                    </SelectItem>
                    <SelectItem value="Suspected magnet or foreign weight attached">
                      Suspected Magnet or Foreign Tare Weight Attached
                    </SelectItem>
                    <SelectItem value="Expired or missing verification certificate">
                      Expired or Missing Verification Certificate
                    </SelectItem>
                    <SelectItem value="Refusal to weigh goods on official counter scale">
                      Refusal to Weigh Goods on Official Counter Scale
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Your Name *</Label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User className="h-4 w-4" />
                    </div>
                    <Input
                      placeholder="e.g. Amit Verma"
                      value={citizenName}
                      onChange={(e) => setCitizenName(e.target.value)}
                      className="pl-9 text-xs"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold">Mobile Number / Email</Label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Phone className="h-4 w-4" />
                    </div>
                    <Input
                      placeholder="+91 98765 43210"
                      value={citizenContact}
                      onChange={(e) => setCitizenContact(e.target.value)}
                      className="pl-9 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Description of Infraction *</Label>
                <textarea
                  rows={4}
                  placeholder="Describe the incident (e.g. purchased 1kg sweets, weighed only 920g; shopkeeper refused verification)."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full mt-1 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-900"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-2.5 rounded-xl text-xs sm:text-sm transition-colors mt-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    <span>Transmitting Grievance...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-1.5" />
                    <span>Submit Consumer Grievance</span>
                  </>
                )}
              </Button>
            </form>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-5 shadow-sm animate-in fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Grievance Registered Successfully
              </h2>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Your complaint has been logged and automatically assigned to the Legal Metrology Field Officer for surprise inspection.
              </p>
            </div>

            <div className="max-w-sm mx-auto p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
              <span className="text-[10px] uppercase font-bold text-amber-800 dark:text-amber-300 tracking-wider">
                Official Complaint Tracking ID
              </span>
              <div className="text-xl font-mono font-bold text-amber-900 dark:text-amber-200 mt-1 select-all">
                {submittedComplaint.complaint_no}
              </div>
            </div>

            <div className="text-xs text-slate-500 font-mono">
              Linked Instrument: <strong>{submittedComplaint.instrument_digital_id}</strong>
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                <Link to={`/verify/${submittedComplaint.instrument_digital_id}`}>
                  View Instrument Details
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSubmittedComplaint(null);
                  setDescription("");
                }}
                className="text-xs"
              >
                File Another Report
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ComplaintPage;
