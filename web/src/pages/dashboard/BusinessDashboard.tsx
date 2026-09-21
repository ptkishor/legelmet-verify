import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Scale,
  PlusCircle,
  FileCheck,
  Clock,
  AlertCircle,
  QrCode,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

export const BusinessDashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const [instruments, setInstruments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTraderData = async () => {
    if (!user) return;
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
          status,
          created_at,
          certificates (
            certificate_no,
            valid_till,
            is_revoked
          )
        `)
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching trader instruments:", error.message);
      } else {
        setInstruments(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTraderData();
  }, [user]);

  const verifiedCount = instruments.filter((i) => i.status === "verified").length;
  const pendingCount = instruments.filter((i) => i.status === "pending").length;
  const alertCount = instruments.filter((i) => i.status === "expired" || i.status === "suspended").length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Trader Instrument Portal
              </h1>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                Registered Business
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Establishment: <span className="font-semibold text-slate-700 dark:text-slate-300">{profile?.designation || profile?.full_name}</span> •{" "}
              <span>{profile?.jurisdiction_district}, {profile?.jurisdiction_state}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              asChild
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
            >
              <Link to="/business/apply">
                <PlusCircle className="w-4 h-4" />
                <span>Register New Scale</span>
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                loadTraderData();
                toast.success("Instruments refreshed");
              }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* 3 Overview Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Verified Instruments
              </CardTitle>
              <FileCheck className="w-4 h-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {verifiedCount}
              </div>
              <p className="text-[11px] text-emerald-600 font-medium mt-1">
                Compliant with Legal Metrology Act 2009
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Applications in Progress
              </CardTitle>
              <Clock className="w-4 h-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {pendingCount}
              </div>
              <p className="text-[11px] text-blue-600 font-medium mt-1">
                Awaiting officer inspection
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Action Required / Alerts
              </CardTitle>
              <AlertCircle className="w-4 h-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {alertCount}
              </div>
              <p className="text-[11px] text-amber-600 font-medium mt-1">
                Expired or re-verification due
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Instruments List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              My Registered Weighing & Measuring Instruments
            </h2>
            <span className="text-xs text-slate-500">{instruments.length} Total Units</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {instruments.map((inst) => {
              const latestCert = inst.certificates?.[0];
              const isExpired = inst.status === "expired";
              return (
                <div
                  key={inst.id}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-emerald-300 dark:hover:border-emerald-700 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
                        <Scale className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                          {inst.make} {inst.model}
                        </h3>
                        <p className="text-xs text-slate-500">{inst.category}</p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        inst.status === "verified"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                          : isExpired
                          ? "bg-red-50 text-red-700 border-red-300"
                          : "bg-amber-50 text-amber-700 border-amber-300"
                      }
                    >
                      {inst.status}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 font-mono bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Digital ID:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{inst.digital_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Serial No:</span>
                      <span>{inst.serial_no}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Capacity:</span>
                      <span>{inst.capacity || "N/A"}</span>
                    </div>
                    {latestCert && (
                      <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-semibold pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                        <span>Cert No:</span>
                        <span>{latestCert.certificate_no}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <Link
                      to={`/business/instruments/${inst.id}`}
                      className="inline-flex items-center gap-1 font-semibold text-emerald-600 hover:text-emerald-700"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Seal &amp; Details</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>

                    <a
                      href={`/verify/${inst.digital_id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-400 hover:text-slate-600"
                    >
                      Public Verify →
                    </a>
                  </div>
                </div>
              );
            })}

            {instruments.length === 0 && !loading && (
              <div className="col-span-2 text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8">
                <Scale className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">No instruments registered yet</h3>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Register your weighing instruments to receive official verification and digital QR stamping.
                </p>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Register First Instrument
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default BusinessDashboard;
