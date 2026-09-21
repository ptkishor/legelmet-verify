import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabase";
import { offlineDb } from "@/lib/offlineDb";
import { getEffectiveOnlineStatus } from "@/lib/syncEngine";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ClipboardCheck,
  Search,
  MapPin,
  Scale,
  ArrowRight,
  WifiOff,
  Wifi,
  Loader2,
  RefreshCw,
  CheckCircle2,
  FileText,
  Clock,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

type TabType = "active" | "completed" | "all";

export const InspectionQueuePage: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("active");
  const [isOnline, setIsOnline] = useState<boolean>(getEffectiveOnlineStatus());

  const loadQueue = async () => {
    setLoading(true);
    try {
      if (getEffectiveOnlineStatus()) {
        // Fetch assigned applications in officer's jurisdiction
        let query = supabase
          .from("applications")
          .select(`
            id,
            application_no,
            type,
            status,
            assigned_officer_id,
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
              capacity,
              shop_name,
              address,
              district,
              state,
              latitude,
              longitude
            )
          `)
          .order("created_at", { ascending: false });

        if (profile?.id && profile.role === "metrology_officer") {
          query = query.eq("assigned_officer_id", profile.id);
        }

        const { data, error } = await query;
        if (error) throw error;

        setApplications(data || []);

        // Sync Dexie cache for offline use
        await offlineDb.cachedApplications.clear();
        if (data && data.length > 0) {
          const cached = data.map((item: any) => ({
            id: item.id,
            application_no: item.application_no,
            instrument_id: item.instruments?.id,
            applicant_id: "",
            type: item.type,
            status: item.status,
            scheduled_at: item.scheduled_at,
            remarks: item.remarks,
            created_at: item.created_at,
            digital_id: item.instruments?.digital_id || "",
            shop_name: item.instruments?.shop_name || "",
            category: item.instruments?.category || "",
            make: item.instruments?.make || "",
            model: item.instruments?.model || "",
            serial_no: item.instruments?.serial_no || "",
            capacity: item.instruments?.capacity || "",
            district: item.instruments?.district || "",
            state: item.instruments?.state || "",
          }));
          await offlineDb.cachedApplications.bulkPut(cached);
        }
      } else {
        // Device is offline -> load cached applications from Dexie
        const cached = await offlineDb.cachedApplications.toArray();
        const formatted = cached.map((c) => ({
          id: c.id,
          application_no: c.application_no,
          type: c.type,
          status: c.status,
          scheduled_at: c.scheduled_at,
          remarks: c.remarks,
          created_at: c.created_at,
          instruments: {
            id: c.instrument_id,
            digital_id: c.digital_id,
            category: c.category,
            make: c.make,
            model: c.model,
            serial_no: c.serial_no,
            capacity: c.capacity,
            shop_name: c.shop_name,
            district: c.district,
            state: c.state,
          },
        }));
        setApplications(formatted);
      }
    } catch (err: any) {
      console.error("Queue load error:", err);
      toast.error(`Error loading queue: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();

    const handleConnectivity = () => {
      setIsOnline(getEffectiveOnlineStatus());
      loadQueue();
    };

    window.addEventListener("online", handleConnectivity);
    window.addEventListener("offline", handleConnectivity);
    window.addEventListener("legalmet-connectivity-change", handleConnectivity);
    window.addEventListener("legalmet-sync-complete", handleConnectivity);

    return () => {
      window.removeEventListener("online", handleConnectivity);
      window.removeEventListener("offline", handleConnectivity);
      window.removeEventListener("legalmet-connectivity-change", handleConnectivity);
      window.removeEventListener("legalmet-sync-complete", handleConnectivity);
    };
  }, [profile]);

  // Counts for each tab
  const activeCount = applications.filter((a) =>
    ["submitted", "assigned", "scheduled", "inspected"].includes(a.status)
  ).length;

  const completedCount = applications.filter((a) =>
    ["approved", "rejected"].includes(a.status)
  ).length;

  const allCount = applications.length;

  // Filter by tab
  const tabFiltered = applications.filter((app) => {
    if (activeTab === "active") {
      return ["submitted", "assigned", "scheduled", "inspected"].includes(app.status);
    }
    if (activeTab === "completed") {
      return ["approved", "rejected"].includes(app.status);
    }
    return true;
  });

  // Filter by search query
  const filtered = tabFiltered.filter((app) => {
    const q = searchQuery.toLowerCase();
    return (
      app.application_no?.toLowerCase().includes(q) ||
      app.instruments?.digital_id?.toLowerCase().includes(q) ||
      app.instruments?.shop_name?.toLowerCase().includes(q) ||
      app.instruments?.category?.toLowerCase().includes(q) ||
      app.status?.toLowerCase().includes(q)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 gap-1 font-semibold">
            <CheckCircle2 className="w-3 h-3" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300 gap-1 font-semibold">
            Rejected
          </Badge>
        );
      case "scheduled":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 gap-1 font-semibold">
            <Clock className="w-3 h-3" />
            Scheduled
          </Badge>
        );
      case "inspected":
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 gap-1 font-semibold">
            Inspected
          </Badge>
        );
      case "assigned":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 gap-1 font-semibold">
            Assigned
          </Badge>
        );
      case "submitted":
      default:
        return (
          <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300 gap-1 font-semibold">
            {status}
          </Badge>
        );
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
                Physical Verification Queue
              </h1>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                Jurisdiction: {profile?.jurisdiction_district || "Gurugram"}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Field inspection queue of weighing and measuring instruments awaiting calibration and stamping.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                isOnline
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span>{isOnline ? "Online (Cloud Sync Active)" : "Offline Mode (IndexedDB Active)"}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                loadQueue();
                toast.success("Queue refreshed");
              }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl w-fit border border-slate-200 dark:border-slate-700/60">
            <button
              onClick={() => setActiveTab("active")}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                activeTab === "active"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>Active Queue</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === "active"
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                {activeCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("completed")}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                activeTab === "completed"
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Completed History</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === "completed"
                    ? "bg-white/20 dark:bg-slate-900/20 text-white dark:text-slate-900"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                {completedCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("all")}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                activeTab === "all"
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>All Applications</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === "all"
                    ? "bg-white/20 dark:bg-slate-900/20 text-white dark:text-slate-900"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                {allCount}
              </span>
            </button>
          </div>

          <Button asChild variant="outline" size="sm" className="text-xs self-start sm:self-auto">
            <Link to="/officer/sync">Sync Hub</Link>
          </Button>
        </div>

        {/* Search filter */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by Application No, Digital ID, Shop Name, Status..."
            className="pl-9 text-xs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Queue Items List */}
        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((app) => {
              const inst = app.instruments;
              const isActive = ["submitted", "assigned", "scheduled", "inspected"].includes(app.status);

              return (
                <div
                  key={app.id}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-emerald-300 transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                        {app.application_no}
                      </span>
                      {getStatusBadge(app.status)}
                      <span className="text-xs text-slate-400 capitalize">
                        • {app.type?.replace("_", " ")}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {inst?.shop_name || "Commercial Establishment"}
                      </span>
                      <span className="flex items-center gap-1 text-slate-500">
                        <Scale className="w-3.5 h-3.5" />
                        {inst?.make} {inst?.model} ({inst?.category})
                      </span>
                      <span className="flex items-center gap-1 text-slate-500">
                        <MapPin className="w-3.5 h-3.5" />
                        {inst?.address ? `${inst.address}, ` : ""}{inst?.district}, {inst?.state}
                      </span>
                    </div>

                    <div className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-medium">
                      Digital ID: {inst?.digital_id || "Generating..."} • Capacity: {inst?.capacity || "30 kg"}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {isActive ? (
                      <Button
                        onClick={() => navigate(`/officer/inspect/${app.id}`)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs flex items-center gap-1.5"
                      >
                        <ClipboardCheck className="w-4 h-4" />
                        <span>Start On-Site Inspection</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2">
                        {inst?.digital_id && (
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="text-xs flex items-center gap-1.5 border-slate-200"
                          >
                            <Link to={`/verify/${inst.digital_id}`} target="_blank">
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Public Record</span>
                            </Link>
                          </Button>
                        )}
                        <Button
                          onClick={() => navigate(`/officer/inspect/${app.id}`)}
                          variant="secondary"
                          size="sm"
                          className="text-xs flex items-center gap-1.5"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Inspection Details</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8">
                <ClipboardCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  {activeTab === "active"
                    ? "No pending inspections in active queue"
                    : activeTab === "completed"
                    ? "No completed inspections found"
                    : "No applications found"}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {activeTab === "active"
                    ? "All verification applications in this jurisdiction have been cleared."
                    : activeTab === "completed"
                    ? "Inspections will appear here once approved or rejected."
                    : "Try adjusting your search criteria."}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default InspectionQueuePage;
