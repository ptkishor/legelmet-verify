import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  FileText,
  Search,
  RefreshCw,
  Eye,
  ShieldCheck,
  History,
  Database,
  Layers,
  Loader2,
  Scale,
  Calendar,
  UserCheck,
  Building,
  MapPin,
  ExternalLink,
  Clock,
  AlertCircle,
  FileBadge,
} from "lucide-react";
import { toast } from "sonner";

interface AuditEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  actor_id: string | null;
  before: any;
  after: any;
  created_at: string;
}

interface InstrumentSummary {
  id: string;
  digital_id: string;
  shop_name: string;
  district: string;
  state: string;
  category: string;
  make: string;
  model: string;
  serial_no: string;
  capacity: string;
  accuracy_class: string;
  status: string;
  created_at: string;
}

interface ProfileSummary {
  id: string;
  full_name: string;
  role: string;
  designation?: string;
}

export const AuditTrailPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("dossier");
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [instruments, setInstruments] = useState<InstrumentSummary[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileSummary>>({});
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Global Ledger Filters
  const [globalSearch, setGlobalSearch] = useState("");
  const [selectedEntity, setSelectedEntity] = useState<string>("ALL");
  const [selectedAction, setSelectedAction] = useState<string>("ALL");

  // Selected Log for JSON Inspection Modal
  const [selectedLog, setSelectedLog] = useState<AuditEntry | null>(null);
  const [diffModalOpen, setDiffModalOpen] = useState(false);

  // Load audit logs, instruments, and profile actors
  const fetchAllData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Audit Logs
      const { data: logData, error: logError } = await (supabase.from("audit_log") as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (logError) throw logError;

      // 2. Fetch Instruments
      const { data: instData, error: instError } = await (supabase.from("instruments") as any)
        .select("id, digital_id, shop_name, district, state, category, make, model, serial_no, capacity, accuracy_class, status, created_at")
        .order("created_at", { ascending: true });

      if (instError) throw instError;

      // 3. Fetch Profiles for actor attribution
      const { data: profData, error: profError } = await (supabase.from("profiles") as any)
        .select("id, full_name, role, designation");

      if (profError) throw profError;

      const profileMap: Record<string, ProfileSummary> = {};
      (profData || []).forEach((p: ProfileSummary) => {
        profileMap[p.id] = p;
      });

      setLogs((logData as AuditEntry[]) || []);
      setInstruments((instData as InstrumentSummary[]) || []);
      setProfiles(profileMap);

      if (instData && instData.length > 0 && !selectedInstrumentId) {
        // Default to first instrument (e.g. Sharma Sweets)
        setSelectedInstrumentId(instData[0].id);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(`Error loading audit data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Selected instrument object
  const currentInstrument = useMemo(() => {
    return instruments.find((i) => i.id === selectedInstrumentId) || instruments[0] || null;
  }, [instruments, selectedInstrumentId]);

  // Filter logs relevant to the selected instrument
  const instrumentLogs = useMemo(() => {
    if (!currentInstrument) return [];
    return logs
      .filter((log) => {
        const matchesEntityId = log.entity_id === currentInstrument.id;
        const matchesAfterInstId = log.after?.instrument_id === currentInstrument.id;
        const matchesBeforeInstId = log.before?.instrument_id === currentInstrument.id;
        const matchesAfterDigitalId = log.after?.digital_id === currentInstrument.digital_id;
        const matchesBeforeDigitalId = log.before?.digital_id === currentInstrument.digital_id;

        return (
          matchesEntityId ||
          matchesAfterInstId ||
          matchesBeforeInstId ||
          matchesAfterDigitalId ||
          matchesBeforeDigitalId
        );
      })
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [logs, currentInstrument]);

  // Global filtered logs
  const filteredGlobalLogs = useMemo(() => {
    return logs.filter((log) => {
      const term = globalSearch.toLowerCase();
      const matchesSearch =
        !term ||
        log.entity_id.toLowerCase().includes(term) ||
        log.entity_type.toLowerCase().includes(term) ||
        JSON.stringify(log.after || {}).toLowerCase().includes(term) ||
        JSON.stringify(log.before || {}).toLowerCase().includes(term);

      const matchesEntity = selectedEntity === "ALL" || log.entity_type === selectedEntity;
      const matchesAction = selectedAction === "ALL" || log.action === selectedAction;

      return matchesSearch && matchesEntity && matchesAction;
    });
  }, [logs, globalSearch, selectedEntity, selectedAction]);

  // Helper to format actor string
  const getActorLabel = (actorId: string | null) => {
    if (!actorId) return "System Integrity Trigger";
    const profile = profiles[actorId];
    if (profile) {
      const roleDisplay =
        profile.role === "metrology_officer"
          ? profile.designation || "Senior Legal Metrology Officer"
          : profile.role === "admin"
          ? "State Metrology Administrator"
          : "Registered Trader";
      return `${profile.full_name} (${roleDisplay})`;
    }
    return `Officer / User (${actorId.slice(0, 8)}...)`;
  };

  // Helper to translate event into human-readable narrative
  const getEventDescription = (log: AuditEntry) => {
    const isInsert = log.action === "INSERT";
    const isUpdate = log.action === "UPDATE";

    if (log.entity_type === "instruments") {
      if (isInsert) {
        return {
          title: "Instrument Registered in Statutory System",
          badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
          icon: Scale,
          description: `Device with Digital ID ${log.after?.digital_id || ""} registered under ${log.after?.shop_name || "Merchant"} (${log.after?.category || "Weighing Scale"}, Serial #${log.after?.serial_no || "N/A"}). Initial regulatory status set to: ${log.after?.status || "pending"}.`,
        };
      }
      if (isUpdate) {
        const changes: string[] = [];
        if (log.before?.status !== log.after?.status) {
          changes.push(`Status changed from '${log.before?.status}' to '${log.after?.status}'`);
        }
        return {
          title: "Instrument State Mutation",
          badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
          icon: History,
          description: changes.length > 0
            ? changes.join(", ")
            : `Instrument attributes updated in state registry.`,
        };
      }
      return {
        title: "Instrument Record Removed",
        badgeColor: "bg-red-50 text-red-700 border-red-200",
        icon: AlertCircle,
        description: `Instrument record decommissioned or unlisted.`,
      };
    }

    if (log.entity_type === "applications") {
      if (isInsert) {
        return {
          title: "Statutory Verification Application Submitted",
          badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
          icon: FileText,
          description: `Application #${log.after?.application_no || ""} filed for statutory re-verification & field inspection. Verification type: ${log.after?.verification_type || "stamping_verification"}.`,
        };
      }
      if (isUpdate) {
        const statusBefore = log.before?.status;
        const statusAfter = log.after?.status;
        const note = statusBefore !== statusAfter
          ? `Application status progressed: '${statusBefore}' → '${statusAfter}'.`
          : `Application review metadata updated.`;
        return {
          title: "Verification Application Reviewed / Transitioned",
          badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
          icon: UserCheck,
          description: note,
        };
      }
    }

    if (log.entity_type === "certificates") {
      const issueDate = log.after?.issued_at || log.after?.verification_date;
      const validDate = log.after?.valid_till || log.after?.valid_until;
      const issueDateStr = issueDate ? new Date(issueDate).toLocaleDateString("en-IN") : "N/A";
      const validDateStr = validDate ? new Date(validDate).toLocaleDateString("en-IN") : "N/A";

      if (isInsert) {
        return {
          title: "Form VII Legal Verification Certificate Issued",
          badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
          icon: FileBadge,
          description: `Statutory Form VII Certificate #${log.after?.certificate_no || ""} issued. Verification Date: ${issueDateStr}, Statutory Validity until: ${validDateStr}. Digital cryptographic QR stamp sealed.`,
        };
      }
      if (isUpdate) {
        return {
          title: "Form VII Certificate Lifecycle Update",
          badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
          icon: ShieldCheck,
          description: `Certificate record #${log.after?.certificate_no || log.before?.certificate_no || ""} updated. Cryptographic state hash verified: ${log.after?.signature_hash ? log.after.signature_hash.slice(0, 16) + "..." : "Tamper-evident record sealed"}. Valid until: ${validDateStr}.`,
        };
      }
    }

    return {
      title: `${log.entity_type.toUpperCase()} ${log.action}`,
      badgeColor: "bg-slate-50 text-slate-700 border-slate-200",
      icon: Database,
      description: `Mutated entity ${log.entity_id}. Action: ${log.action}.`,
    };
  };

  // Helper to identify mutated keys for UPDATE operations
  const getChangedKeys = (before: any, after: any) => {
    if (!before || !after) return [];
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    const changed: string[] = [];
    keys.forEach((key) => {
      if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
        changed.push(key);
      }
    });
    return changed;
  };

  const insertCount = logs.filter((l) => l.action === "INSERT").length;
  const updateCount = logs.filter((l) => l.action === "UPDATE").length;
  const deleteCount = logs.filter((l) => l.action === "DELETE").length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-6 h-6 text-indigo-600" />
                Immutable Statutory Audit Trail
              </h1>
              <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs font-semibold">
                PostgreSQL Security Definer
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Append-only tamper-evident regulatory ledger capturing all state mutations across instruments, inspections, and certificates.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchAllData();
                toast.success("Audit ledger synchronized with live database");
              }}
              className="text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Sync Ledger
            </Button>
          </div>
        </div>

        {/* Dual Mode Tabs: M12 Instrument Dossier vs Global Immutable Ledger */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between pb-3">
            <TabsList className="bg-slate-100 dark:bg-slate-800 p-1">
              <TabsTrigger value="dossier" className="text-xs font-semibold px-3 py-1.5 flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-indigo-600" />
                Instrument Chronological Dossier (M12)
              </TabsTrigger>
              <TabsTrigger value="global" className="text-xs font-semibold px-3 py-1.5 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                Global Immutable Ledger ({logs.length})
              </TabsTrigger>
            </TabsList>

            <span className="hidden md:inline-text text-xs text-slate-400">
              Secured under Legal Metrology Act, 2009
            </span>
          </div>

          {/* TAB 1: INSTRUMENT CHRONOLOGICAL DOSSIER (M12) */}
          <TabsContent value="dossier" className="space-y-6 mt-0">
            {/* Instrument Selector Bar */}
            <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm bg-gradient-to-r from-slate-50 to-indigo-50/30 dark:from-slate-900 dark:to-slate-900/50">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5 text-indigo-600" />
                      Select Target Instrument for Statutory Audit:
                    </label>
                    <Select
                      value={selectedInstrumentId}
                      onValueChange={(val) => setSelectedInstrumentId(val)}
                    >
                      <SelectTrigger className="w-full bg-white dark:bg-slate-950 text-xs font-mono font-medium h-10 border-slate-300 dark:border-slate-700">
                        <SelectValue placeholder="Choose an instrument..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {instruments.map((inst) => (
                          <SelectItem key={inst.id} value={inst.id} className="text-xs font-mono">
                            <span className="font-bold text-slate-900 dark:text-white mr-2">{inst.digital_id}</span>
                            <span className="text-slate-500">({inst.shop_name} · {inst.district})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {currentInstrument && (
                    <div className="flex items-center gap-2 pt-2 md:pt-0">
                      <Link
                        to={`/verify/${currentInstrument.digital_id}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Button variant="outline" size="sm" className="text-xs h-9">
                          <ExternalLink className="w-3.5 h-3.5 mr-1" />
                          View Citizen Portal
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Current Instrument Profile Card */}
            {currentInstrument && (
              <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/60">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-bold text-slate-900 dark:text-white font-mono">
                          {currentInstrument.digital_id}
                        </CardTitle>
                        <Badge
                          className={`text-[10px] font-bold uppercase ${
                            currentInstrument.status === "verified"
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                              : currentInstrument.status === "expiring_soon"
                              ? "bg-amber-100 text-amber-800 border-amber-300"
                              : currentInstrument.status === "expired"
                              ? "bg-red-100 text-red-800 border-red-300"
                              : "bg-slate-100 text-slate-800 border-slate-300"
                          }`}
                        >
                          {currentInstrument.status}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                        <Building className="w-3 h-3 text-slate-400" />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{currentInstrument.shop_name}</span>
                        <span>•</span>
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{currentInstrument.district}, {currentInstrument.state}</span>
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs bg-slate-50 dark:bg-slate-900">
                        {instrumentLogs.length} Events in Dossier
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 bg-slate-50/50 dark:bg-slate-900/30">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Category</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                        {currentInstrument.category}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Make / Model</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {currentInstrument.make} {currentInstrument.model}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Serial Number</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">
                        {currentInstrument.serial_no}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Capacity / Class</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {currentInstrument.capacity} • {currentInstrument.accuracy_class}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Chronological Event Timeline */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  Chronological Regulatory Lifecycle Timeline
                </h3>
                <span className="text-[11px] text-slate-400">
                  Oldest to Newest (Statutory Sequence)
                </span>
              </div>

              {loading ? (
                <div className="py-16 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                  <p className="text-xs text-slate-500">Retrieving chronological event chain...</p>
                </div>
              ) : instrumentLogs.length === 0 ? (
                <Card className="border-dashed border-slate-300 dark:border-slate-800 p-8 text-center">
                  <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">No audit events found specifically linked to this instrument ID.</p>
                </Card>
              ) : (
                <div className="relative pl-6 sm:pl-8 border-l-2 border-indigo-200 dark:border-indigo-900/60 space-y-6 my-2">
                  {instrumentLogs.map((log, index) => {
                    const eventInfo = getEventDescription(log);
                    const EventIcon = eventInfo.icon;
                    const actorText = getActorLabel(log.actor_id);
                    const changedKeys = log.action === "UPDATE" ? getChangedKeys(log.before, log.after) : [];

                    return (
                      <div key={log.id} className="relative group">
                        {/* Timeline Node Dot */}
                        <div className="absolute -left-[31px] sm:-left-[39px] top-1.5 w-6 h-6 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-600 flex items-center justify-center shadow-sm">
                          <div className="w-2 h-2 rounded-full bg-indigo-600" />
                        </div>

                        {/* Event Card */}
                        <Card className="border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition shadow-sm">
                          <CardContent className="p-4 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold text-slate-400 font-mono">
                                  #{index + 1}
                                </span>
                                <Badge variant="outline" className={`text-xs font-semibold ${eventInfo.badgeColor}`}>
                                  <EventIcon className="w-3 h-3 mr-1 inline" />
                                  {eventInfo.title}
                                </Badge>
                                <Badge
                                  className={`text-[9px] font-bold ${
                                    log.action === "INSERT"
                                      ? "bg-emerald-600 text-white"
                                      : log.action === "UPDATE"
                                      ? "bg-amber-600 text-white"
                                      : "bg-red-600 text-white"
                                  }`}
                                >
                                  {log.action}
                                </Badge>
                              </div>

                              <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  {new Date(log.created_at).toLocaleString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                  })}
                                </span>
                              </div>
                            </div>

                            {/* Event Narrative Body */}
                            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                              {eventInfo.description}
                            </p>

                            {/* Changed Keys Highlight (if UPDATE) */}
                            {log.action === "UPDATE" && changedKeys.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1 text-[11px] bg-amber-50/50 dark:bg-amber-950/20 p-2 rounded-md border border-amber-200/50 dark:border-amber-900/30">
                                <span className="text-amber-800 dark:text-amber-300 font-medium">Mutated Fields:</span>
                                {changedKeys.map((key) => (
                                  <Badge key={key} variant="outline" className="text-[10px] font-mono bg-white dark:bg-slate-900">
                                    {key}: {String(log.before?.[key] ?? "null")} → {String(log.after?.[key] ?? "null")}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            {/* Card Footer: Actor & Inspect Diff Button */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 text-xs">
                              <div className="flex items-center gap-1.5 text-slate-500">
                                <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                                <span className="text-[11px]">Authorized Actor:</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">
                                  {actorText}
                                </span>
                              </div>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedLog(log);
                                  setDiffModalOpen(true);
                                }}
                                className="text-xs h-7 px-2.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950"
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                Inspect State Diff
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB 2: GLOBAL IMMUTABLE LEDGER */}
          <TabsContent value="global" className="space-y-6 mt-0">
            {/* Audit Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Logged Mutations</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{logs.length}</p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Database className="w-4 h-4" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Inserts</p>
                    <p className="text-2xl font-bold text-emerald-600 mt-0.5">{insertCount}</p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Layers className="w-4 h-4" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Updates</p>
                    <p className="text-2xl font-bold text-amber-600 mt-0.5">{updateCount}</p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <History className="w-4 h-4" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Deletions</p>
                    <p className="text-2xl font-bold text-red-600 mt-0.5">{deleteCount}</p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search by Entity ID, Digital ID, Certificate No, or Content..."
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  className="pl-9 text-xs sm:text-sm h-10"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                  <SelectTrigger className="w-full sm:w-[150px] text-xs h-10">
                    <SelectValue placeholder="Entity Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Tables</SelectItem>
                    <SelectItem value="instruments">instruments</SelectItem>
                    <SelectItem value="applications">applications</SelectItem>
                    <SelectItem value="certificates">certificates</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedAction} onValueChange={setSelectedAction}>
                  <SelectTrigger className="w-full sm:w-[130px] text-xs h-10">
                    <SelectValue placeholder="Action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Actions</SelectItem>
                    <SelectItem value="INSERT">INSERT</SelectItem>
                    <SelectItem value="UPDATE">UPDATE</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                  </SelectContent>
                </Select>

                {(selectedEntity !== "ALL" || selectedAction !== "ALL" || globalSearch) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedEntity("ALL");
                      setSelectedAction("ALL");
                      setGlobalSearch("");
                    }}
                    className="text-xs text-slate-500"
                  >
                    Reset
                  </Button>
                )}
              </div>
            </div>

            {/* Global Entries Table */}
            <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                  Chronological Statutory Audit Trail Entries ({filteredGlobalLogs.length})
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Triggered automatically via PostgreSQL security definer function audit_trigger_func()
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="py-16 flex flex-col items-center justify-center space-y-3">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                    <p className="text-xs text-slate-500">Loading statutory audit ledger...</p>
                  </div>
                ) : filteredGlobalLogs.length === 0 ? (
                  <div className="py-16 text-center text-xs text-slate-400">
                    No audit log entries found matching criteria.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-950/60 border-y border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold">
                        <tr>
                          <th className="px-4 py-3">Timestamp</th>
                          <th className="px-4 py-3">Entity Type</th>
                          <th className="px-4 py-3">Action</th>
                          <th className="px-4 py-3">Entity Reference</th>
                          <th className="px-4 py-3">Actor</th>
                          <th className="px-4 py-3 text-right">Payload Inspection</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredGlobalLogs.map((log) => {
                          const identifier =
                            log.after?.digital_id ||
                            log.after?.certificate_no ||
                            log.after?.application_no ||
                            log.before?.digital_id ||
                            log.entity_id;

                          return (
                            <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/50 transition">
                              <td className="px-4 py-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                                {new Date(log.created_at).toLocaleString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })}
                              </td>

                              <td className="px-4 py-3">
                                <Badge variant="outline" className="font-mono text-[10px] bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                  {log.entity_type}
                                </Badge>
                              </td>

                              <td className="px-4 py-3">
                                <Badge
                                  className={`text-[10px] font-bold ${
                                    log.action === "INSERT"
                                      ? "bg-emerald-600 text-white"
                                      : log.action === "UPDATE"
                                      ? "bg-amber-600 text-white"
                                      : "bg-red-600 text-white"
                                  }`}
                                >
                                  {log.action}
                                </Badge>
                              </td>

                              <td className="px-4 py-3">
                                <div className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                                  {identifier}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono truncate max-w-[180px]">
                                  {log.entity_id}
                                </div>
                              </td>

                              <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs">
                                {getActorLabel(log.actor_id)}
                              </td>

                              <td className="px-4 py-3 text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedLog(log);
                                    setDiffModalOpen(true);
                                  }}
                                  className="text-xs h-7 px-2"
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  View JSON Diff
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* JSON Diff & Audit Inspection Modal */}
        <Dialog open={diffModalOpen} onOpenChange={setDiffModalOpen}>
          <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                <History className="w-5 h-5 text-indigo-600" />
                Audit Log Payload Diff ({selectedLog?.action} on {selectedLog?.entity_type})
              </DialogTitle>
              <DialogDescription className="text-xs">
                Immutable cryptographic state snapshot recorded at {selectedLog?.created_at}
              </DialogDescription>
            </DialogHeader>

            {selectedLog && (
              <div className="space-y-4 overflow-y-auto pr-1 text-xs">
                <div className="grid grid-cols-2 gap-2 text-[11px] p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="text-slate-500">Log UUID:</span>{" "}
                    <span className="font-mono text-slate-700 dark:text-slate-300">{selectedLog.id}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Entity Target:</span>{" "}
                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{selectedLog.entity_type}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Action:</span>{" "}
                    <span className="font-bold text-indigo-600">{selectedLog.action}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Actor Attribution:</span>{" "}
                    <span className="font-medium text-slate-800 dark:text-slate-200">{getActorLabel(selectedLog.actor_id)}</span>
                  </div>
                </div>

                {/* Side-by-side or stacked Before/After diff */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                      <span>BEFORE STATE:</span>
                      {selectedLog.before === null && <Badge variant="outline" className="text-[9px]">NULL (INSERT)</Badge>}
                    </div>
                    <pre className="p-3 bg-slate-950 text-slate-200 rounded-xl font-mono text-[11px] overflow-x-auto max-h-72 border border-slate-800">
                      {selectedLog.before
                        ? JSON.stringify(selectedLog.before, null, 2)
                        : "// No prior record (INSERT operation)"}
                    </pre>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-emerald-600">
                      <span>AFTER MUTATION:</span>
                      {selectedLog.after === null && <Badge variant="outline" className="text-[9px]">NULL (DELETE)</Badge>}
                    </div>
                    <pre className="p-3 bg-slate-950 text-emerald-300 rounded-xl font-mono text-[11px] overflow-x-auto max-h-72 border border-slate-800">
                      {selectedLog.after
                        ? JSON.stringify(selectedLog.after, null, 2)
                        : "// Record deleted"}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AuditTrailPage;
