import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search,
  ExternalLink,
  QrCode,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

export const InstrumentRegistryPage: React.FC = () => {
  const { profile } = useAuth();
  const [instruments, setInstruments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const loadInstruments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("instruments")
        .select(`
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
          status,
          created_at,
          certificates (
            certificate_no,
            valid_till,
            is_revoked
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInstruments(data || []);
    } catch (err: any) {
      console.error(err);
      toast.error(`Failed to load instruments: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInstruments();
  }, [profile]);

  const filtered = instruments.filter((item) => {
    const matchesSearch =
      item.digital_id?.toLowerCase().includes(search.toLowerCase()) ||
      item.shop_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.make?.toLowerCase().includes(search.toLowerCase()) ||
      item.serial_no?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Legal Metrology Instrument Registry
              </h1>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                Official Directory
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Registered weighing and measuring instruments across {profile?.jurisdiction_state || "Haryana"}.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadInstruments();
              toast.success("Registry refreshed");
            }}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
          </Button>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by Digital ID, Shop, Make, Serial..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {["all", "verified", "pending", "expired", "rejected", "suspended"].map((st) => (
              <Button
                key={st}
                variant={statusFilter === st ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(st)}
                className={`text-xs capitalize h-9 ${
                  statusFilter === st ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
                }`}
              >
                {st}
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((inst) => {
              const latestCert = inst.certificates?.[0];
              const isExpired = inst.status === "expired";
              return (
                <div
                  key={inst.id}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between space-y-3 hover:border-emerald-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        {inst.make} {inst.model}
                      </h3>
                      <p className="text-xs text-slate-500">{inst.category}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        inst.status === "verified"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                          : isExpired
                          ? "bg-red-50 text-red-700 border-red-300"
                          : "bg-blue-50 text-blue-700 border-blue-300"
                      }
                    >
                      {inst.status}
                    </Badge>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-1 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Digital ID:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{inst.digital_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Shop:</span>
                      <span className="text-slate-800 dark:text-slate-200">{inst.shop_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Serial No:</span>
                      <span>{inst.serial_no}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Location:</span>
                      <span>{inst.district}, {inst.state}</span>
                    </div>
                    {latestCert && (
                      <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-semibold pt-1 border-t border-slate-200 dark:border-slate-700">
                        <span>Cert No:</span>
                        <span>{latestCert.certificate_no}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <a
                      href={`/verify/${inst.digital_id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Inspect Digital Verification</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div className="col-span-2 text-center py-12 text-slate-400">
                No instruments matching the criteria.
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default InstrumentRegistryPage;
