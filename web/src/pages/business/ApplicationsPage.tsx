import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList,
  PlusCircle,
  Calendar,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

export const ApplicationsPage: React.FC = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadApplications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("applications")
        .select(`
          id,
          application_no,
          type,
          status,
          scheduled_at,
          remarks,
          created_at,
          instruments (
            id,
            digital_id,
            category,
            make,
            model,
            serial_no,
            shop_name
          ),
          profiles:assigned_officer_id (
            full_name,
            phone,
            designation
          )
        `)
        .eq("applicant_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (err: any) {
      console.error(err);
      toast.error(`Failed to load applications: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, [user]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-emerald-500 text-white">Approved &amp; Certified</Badge>;
      case "scheduled":
        return <Badge className="bg-amber-500 text-white">Inspection Scheduled</Badge>;
      case "assigned":
        return <Badge className="bg-blue-500 text-white">Officer Assigned</Badge>;
      case "inspected":
        return <Badge className="bg-purple-500 text-white">Testing Completed</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline" className="bg-slate-100 text-slate-700">Submitted</Badge>;
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
                Verification Applications
              </h1>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                Tracking Queue
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Live status tracking of mandatory Legal Metrology verification and re-verification requests.
            </p>
          </div>

          <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Link to="/business/apply" className="flex items-center gap-1.5">
              <PlusCircle className="w-4 h-4" />
              <span>Apply for Verification</span>
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => {
              return (
                <div
                  key={app.id}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                          {app.application_no}
                        </span>
                        {getStatusBadge(app.status)}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Applied on {new Date(app.created_at).toLocaleDateString("en-IN")} • Type:{" "}
                        <span className="font-semibold capitalize text-slate-700 dark:text-slate-300">
                          {app.type?.replace("_", " ")}
                        </span>
                      </p>
                    </div>

                    <Button asChild variant="outline" size="sm" className="text-xs">
                      <Link to={`/business/instruments/${app.instruments?.id}`}>
                        View Instrument QR
                      </Link>
                    </Button>
                  </div>

                  {/* Instrument Mini Card */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
                    <div>
                      <span className="text-slate-400 block text-[10px]">DIGITAL ID</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{app.instruments?.digital_id}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">INSTRUMENT</span>
                      <span className="text-slate-800 dark:text-slate-200">
                        {app.instruments?.make} {app.instruments?.model}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">ESTABLISHMENT</span>
                      <span className="text-slate-800 dark:text-slate-200">{app.instruments?.shop_name}</span>
                    </div>
                  </div>

                  {/* Officer Assignment Info */}
                  {app.profiles && (
                    <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 p-2.5 rounded-lg border border-blue-200 dark:border-blue-900/40">
                      <Calendar className="w-4 h-4 shrink-0" />
                      <span>
                        Assigned Inspector: <strong>{app.profiles.full_name}</strong> ({app.profiles.designation || "Officer"})
                        {app.scheduled_at && ` • Scheduled Inspection: ${new Date(app.scheduled_at).toLocaleDateString("en-IN")}`}
                      </span>
                    </div>
                  )}

                  {app.remarks && (
                    <p className="text-xs text-slate-500 italic bg-slate-50/50 p-2 rounded">
                      &ldquo;{app.remarks}&rdquo;
                    </p>
                  )}
                </div>
              );
            })}

            {applications.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8">
                <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">No applications filed yet</h3>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Apply for new scale verification or scheduled re-verification to receive inspector visits.
                </p>
                <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Link to="/business/apply">Submit New Application</Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ApplicationsPage;
