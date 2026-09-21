import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { offlineDb, type OfflineInspection } from "@/lib/offlineDb";
import {
  syncPendingInspections,
  getEffectiveOnlineStatus,
  isSimulatedOffline,
  setSimulatedOffline,
} from "@/lib/syncEngine";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Database,
  CheckCircle2,
  Clock,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";

export const SyncHubPage: React.FC = () => {
  const [inspections, setInspections] = useState<OfflineInspection[]>([]);
  const [cachedAppCount, setCachedAppCount] = useState<number>(0);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(getEffectiveOnlineStatus());

  const loadLocalData = async () => {
    try {
      const records = await offlineDb.inspections.reverse().toArray();
      setInspections(records);
      const appCount = await offlineDb.cachedApplications.count();
      setCachedAppCount(appCount);
    } catch (err) {
      console.error("Dexie fetch error:", err);
    }
  };

  useEffect(() => {
    loadLocalData();

    const handleConnectivity = () => {
      setIsOnline(getEffectiveOnlineStatus());
      loadLocalData();
    };

    window.addEventListener("online", handleConnectivity);
    window.addEventListener("offline", handleConnectivity);
    window.addEventListener("legalmet-connectivity-change", handleConnectivity);
    window.addEventListener("legalmet-sync-complete", loadLocalData);

    return () => {
      window.removeEventListener("online", handleConnectivity);
      window.removeEventListener("offline", handleConnectivity);
      window.removeEventListener("legalmet-connectivity-change", handleConnectivity);
      window.removeEventListener("legalmet-sync-complete", loadLocalData);
    };
  }, []);

  const handleManualSync = async () => {
    setSyncing(true);
    toast.loading("Initiating cloud synchronization...", { id: "sync-toast" });
    try {
      const res = await syncPendingInspections();
      if (res.success) {
        toast.success(`Successfully synced ${res.synced} inspection(s)!`, { id: "sync-toast" });
      } else {
        toast.error(`Sync error: ${res.errors.join("; ")}`, { id: "sync-toast" });
      }
      await loadLocalData();
    } catch (err: any) {
      toast.error(`Sync failed: ${err.message}`, { id: "sync-toast" });
    } finally {
      setSyncing(false);
    }
  };

  const pendingCount = inspections.filter((i) => i.sync_status === "pending").length;
  const syncedCount = inspections.filter((i) => i.sync_status === "synced").length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Offline Field Sync Hub
              </h1>
              <Badge
                variant="outline"
                className={
                  isOnline
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                    : "bg-amber-50 text-amber-700 border-amber-300"
                }
              >
                {isOnline ? "Cloud Connected" : "Local IndexedDB Active"}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Guaranteed zero data loss in low-connectivity rural mandis and industrial zones using IndexedDB idempotency.
            </p>
          </div>

          {/* Sync Trigger & Offline Mode Switch */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const nextState = !isSimulatedOffline();
                setSimulatedOffline(nextState);
                setIsOnline(!nextState && navigator.onLine);
                toast.info(nextState ? "Simulated offline mode enabled" : "Simulated offline mode disabled");
              }}
              className="text-xs"
            >
              {isSimulatedOffline() ? <WifiOff className="w-3.5 h-3.5 mr-1 text-amber-600" /> : <Wifi className="w-3.5 h-3.5 mr-1 text-emerald-600" />}
              <span>{isSimulatedOffline() ? "Disable Simulated Offline" : "Simulate Offline Mode"}</span>
            </Button>

            <Button
              size="sm"
              onClick={handleManualSync}
              disabled={syncing || !isOnline}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
              <span>Sync Cloud Now</span>
            </Button>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Pending Local Push
              </CardTitle>
              <Clock className="w-4 h-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {pendingCount}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Stored in client-side IndexedDB
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Cloud Synchronized
              </CardTitle>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {syncedCount}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Certificates and records pushed
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Cached Applications
              </CardTitle>
              <Database className="w-4 h-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {cachedAppCount}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Available for offline inspection
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Local Storage Records Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-slate-500" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Local Device Inspection Records (IndexedDB)
              </h2>
            </div>
            <span className="text-xs text-slate-500">{inspections.length} Stored Records</span>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Client UUID (Idempotency Key)</th>
                    <th className="py-3 px-4">Instrument / Shop</th>
                    <th className="py-3 px-4">Inspected At</th>
                    <th className="py-3 px-4">Verdict</th>
                    <th className="py-3 px-4">Sync Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {inspections.map((item) => (
                    <tr key={item.client_uuid} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {item.client_uuid}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {item.shop_name || "Commercial Unit"}
                        </div>
                        <div className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
                          {item.instrument_digital_id || item.instrument_id}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(item.inspected_at).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className={
                            item.result === "pass"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                              : "bg-red-50 text-red-700 border-red-300"
                          }
                        >
                          {item.result.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className={
                            item.sync_status === "synced"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300"
                              : item.sync_status === "syncing"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300"
                          }
                        >
                          {item.sync_status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {item.sync_status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleManualSync}
                            disabled={!isOnline}
                            className="h-7 text-xs border-emerald-300 text-emerald-700"
                          >
                            Push
                          </Button>
                        )}
                        {item.sync_status === "synced" && (
                          <span className="text-emerald-600 font-medium text-[11px] flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Cloud Stored</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}

                  {inspections.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400">
                        No inspection records stored on this device. Start an inspection from the queue to test offline recording.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SyncHubPage;
