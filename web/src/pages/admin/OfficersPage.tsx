import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  Search,
  MapPin,
  Phone,
  CheckCircle2,
  RefreshCw,
  Loader2,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";

interface OfficerStats {
  id: string;
  full_name: string;
  phone: string | null;
  jurisdiction_state: string;
  jurisdiction_district: string;
  designation: string | null;
  is_active: boolean;
  assignedInspectionsCount: number;
  completedInspectionsCount: number;
  assignedComplaintsCount: number;
}

export const OfficersPage: React.FC = () => {
  const [officers, setOfficers] = useState<OfficerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadOfficers = async () => {
    setLoading(true);
    try {
      // 1. Fetch officers
      const { data: officerList, error: offErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "metrology_officer");

      if (offErr) throw offErr;

      // 2. Fetch applications assigned to officers
      const { data: apps, error: appErr } = await supabase
        .from("applications")
        .select("id, assigned_officer_id, status");

      if (appErr) throw appErr;

      // 3. Fetch complaints assigned to officers
      const { data: cmps, error: cmpErr } = await supabase
        .from("complaints")
        .select("id, assigned_officer_id, status");

      if (cmpErr) throw cmpErr;

      const appList = (apps as any[]) || [];
      const cmpList = (cmps as any[]) || [];

      const stats: OfficerStats[] = ((officerList as any[]) || []).map((off: any) => {
        const assignedApps = appList.filter(
          (a) => a.assigned_officer_id === off.id && a.status !== "approved"
        ).length;
        const completedApps = appList.filter(
          (a) => a.assigned_officer_id === off.id && a.status === "approved"
        ).length;
        const assignedCmps = cmpList.filter(
          (c) => c.assigned_officer_id === off.id
        ).length;

        return {
          id: off.id,
          full_name: off.full_name,
          phone: off.phone,
          jurisdiction_state: off.jurisdiction_state || "Haryana",
          jurisdiction_district: off.jurisdiction_district || "Gurugram",
          designation: off.designation || "Legal Metrology Officer",
          is_active: off.is_active ?? true,
          assignedInspectionsCount: assignedApps,
          completedInspectionsCount: completedApps,
          assignedComplaintsCount: assignedCmps,
        };
      });

      setOfficers(stats);
    } catch (err: any) {
      console.error(err);
      toast.error(`Failed to load officers: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOfficers();
  }, []);

  const filtered = officers.filter(
    (o) =>
      o.full_name.toLowerCase().includes(search.toLowerCase()) ||
      o.jurisdiction_district.toLowerCase().includes(search.toLowerCase()) ||
      (o.designation && o.designation.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-6 h-6 text-emerald-600" />
                State Field Officer Deployment
              </h1>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold">
                District Jurisdictions
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Active Legal Metrology Officers deployed across commercial districts, workload distribution, and grievance closure tracking.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadOfficers();
              toast.success("Officer roster refreshed");
            }}
            className="text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Refresh Directory
          </Button>
        </div>

        {/* Search Bar */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by Officer Name, District, or Designation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs sm:text-sm h-10"
            />
          </div>
        </div>

        {/* Officers Grid Cards */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            <p className="text-xs text-slate-500">Loading officer workforce roster...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            No officers found matching search query.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((officer) => (
              <Card
                key={officer.id}
                className="border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                          {officer.full_name}
                        </CardTitle>
                      </div>
                      <CardDescription className="text-xs flex items-center gap-1 text-slate-500">
                        <Briefcase className="w-3 h-3 text-slate-400" />
                        {officer.designation}
                      </CardDescription>
                    </div>

                    <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 text-[10px]">
                      {officer.jurisdiction_district}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-1">
                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{officer.jurisdiction_district}, {officer.jurisdiction_state}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-mono">{officer.phone || "+91 98112 00000"}</span>
                    </div>
                  </div>

                  {/* Workload Stats Banner */}
                  <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-semibold">Active</p>
                      <p className="text-base font-extrabold text-amber-600 mt-0.5">
                        {officer.assignedInspectionsCount}
                      </p>
                      <p className="text-[9px] text-slate-400">Pending</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-semibold">Verified</p>
                      <p className="text-base font-extrabold text-emerald-600 mt-0.5">
                        {officer.completedInspectionsCount}
                      </p>
                      <p className="text-[9px] text-slate-400">Approved</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-semibold">Grievances</p>
                      <p className="text-base font-extrabold text-indigo-600 mt-0.5">
                        {officer.assignedComplaintsCount}
                      </p>
                      <p className="text-[9px] text-slate-400">Complaints</p>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Biometric Sync Active
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toast.info(`Officer communication channel active for ${officer.full_name}`)}
                      className="text-xs h-7 px-2.5"
                    >
                      Dispatch Note
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default OfficersPage;
