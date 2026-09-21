import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  Phone,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

export const ComplaintsQueuePage: React.FC = () => {
  const { profile } = useAuth();

  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionRemarks, setResolutionRemarks] = useState("");

  const loadComplaints = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("complaints")
        .select(`
          id,
          complaint_no,
          citizen_name,
          citizen_contact,
          description,
          photo_url,
          status,
          resolution_remarks,
          created_at,
          instruments (
            id,
            digital_id,
            category,
            make,
            model,
            shop_name,
            address,
            district,
            state
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setComplaints(data || []);
    } catch (err: any) {
      console.error(err);
      toast.error(`Error loading complaints: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaints();
  }, [profile]);

  const handleResolveComplaint = async (complaintId: string) => {
    if (!resolutionRemarks.trim()) {
      toast.error("Please enter resolution remarks / action taken.");
      return;
    }

    toast.loading("Resolving complaint...", { id: "cmp-toast" });
    try {
      const { error } = await (supabase.from("complaints") as any)
        .update({
          status: "resolved",
          resolution_remarks: resolutionRemarks.trim(),
        })
        .eq("id", complaintId);

      if (error) throw error;

      toast.success("Complaint marked resolved with official remarks.", { id: "cmp-toast" });
      setResolvingId(null);
      setResolutionRemarks("");
      loadComplaints();
    } catch (err: any) {
      toast.error(`Failed to resolve complaint: ${err.message}`, { id: "cmp-toast" });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Citizen Grievances &amp; Complaints
              </h1>
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                Action Queue
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Public consumer complaints filed under Legal Metrology Act 2009 for short delivery, tampering, or missing verification seals.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : (
          <div className="space-y-4">
            {complaints.map((cmp: any) => {
              const isResolved = cmp.status === "resolved";
              const inst = cmp.instruments;
              return (
                <div
                  key={cmp.id}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                        {cmp.complaint_no}
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          isResolved
                            ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                            : "bg-amber-50 text-amber-700 border-amber-300"
                        }
                      >
                        {cmp.status.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-slate-400">
                        • {new Date(cmp.created_at).toLocaleDateString("en-IN")}
                      </span>
                    </div>

                    {!isResolved && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setResolvingId(resolvingId === cmp.id ? null : cmp.id);
                            setResolutionRemarks("");
                          }}
                          className="text-xs"
                        >
                          Resolve Grievance
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Complaint Description */}
                  <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 rounded-xl space-y-1">
                    <div className="text-[11px] font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                      Reported Infraction:
                    </div>
                    <p className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                      &ldquo;{cmp.description}&rdquo;
                    </p>
                    <div className="text-[11px] text-slate-500 pt-1 flex items-center gap-2">
                      <span>Complainant: <strong>{cmp.citizen_name}</strong></span>
                      {cmp.citizen_contact && (
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3" />
                          {cmp.citizen_contact}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Linked Instrument Meta */}
                  {inst && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
                      <div>
                        <span className="text-slate-400 block text-[10px]">DIGITAL ID</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{inst.digital_id}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">SHOP / LOCATION</span>
                        <span className="text-slate-800 dark:text-slate-200">{inst.shop_name}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">INSTRUMENT</span>
                        <span className="text-slate-800 dark:text-slate-200">
                          {inst.make} {inst.model}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Resolution Input Box if active */}
                  {resolvingId === cmp.id && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                      <Label className="text-xs font-semibold">Official Resolution / Action Taken Remarks</Label>
                      <Input
                        placeholder="e.g. Surprise inspection conducted. Machine recalibrated and re-stamped."
                        value={resolutionRemarks}
                        onChange={(e) => setResolutionRemarks(e.target.value)}
                        className="text-xs"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setResolvingId(null)}
                          className="text-xs"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleResolveComplaint(cmp.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                        >
                          Save Official Resolution
                        </Button>
                      </div>
                    </div>
                  )}

                  {cmp.resolution_remarks && (
                    <div className="text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-bold">Official Resolution:</span> {cmp.resolution_remarks}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {complaints.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8">
                <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  Zero active complaints
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  All consumer grievances in this jurisdiction have been resolved.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ComplaintsQueuePage;
