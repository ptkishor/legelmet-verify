import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import {
  fetchUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type NotificationItem,
} from "@/lib/notificationService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Bell,
  AlertTriangle,
  Clock,
  Info,
  Check,
  CheckCheck,
  ExternalLink,
  Search,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

export const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [readFilter, setReadFilter] = useState<string>("ALL");

  const loadData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await fetchUserNotifications(user.id);
      setNotifications(data);
    } catch (err: any) {
      toast.error(`Error loading notifications: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const handleMarkAsRead = async (id: string) => {
    await markNotificationAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    toast.success("Notification marked as read");
  };

  const handleMarkAllRead = async () => {
    if (!user?.id) return;
    await markAllNotificationsAsRead(user.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    toast.success("All notifications marked as read");
  };

  const filtered = notifications.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.message.toLowerCase().includes(search.toLowerCase());

    const matchesType =
      typeFilter === "ALL" || item.type === typeFilter.toLowerCase();

    const matchesRead =
      readFilter === "ALL"
        ? true
        : readFilter === "UNREAD"
        ? !item.is_read
        : item.is_read;

    return matchesSearch && matchesType && matchesRead;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const getTypeIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "alert":
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case "warning":
        return <Clock className="w-5 h-5 text-amber-600" />;
      case "info":
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getTypeBadge = (type: NotificationItem["type"]) => {
    switch (type) {
      case "alert":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Critical Alert
          </Badge>
        );
      case "warning":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            Warning
          </Badge>
        );
      case "info":
      default:
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Notice
          </Badge>
        );
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                <Bell className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Compliance &amp; Expiry Notifications
              </h1>
              {unreadCount > 0 && (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                  {unreadCount} unread
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Official regulatory notifications, verification expiry countdowns, and automated compliance digests.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="text-xs flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </Button>
            {unreadCount > 0 && (
              <Button
                size="sm"
                onClick={handleMarkAllRead}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs flex items-center gap-1.5"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark All as Read</span>
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search notifications by title, digital ID, or keyword..."
              className="pl-9 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs shrink-0">
            {["ALL", "ALERT", "WARNING", "INFO"].map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  typeFilter === type
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {type === "ALL" ? "All Types" : type.charAt(0) + type.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Read/Unread Filter */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs shrink-0">
            {[
              { key: "ALL", label: "All Status" },
              { key: "UNREAD", label: "Unread" },
              { key: "READ", label: "Read" },
            ].map((r) => (
              <button
                key={r.key}
                onClick={() => setReadFilter(r.key)}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  readFilter === r.key
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8">
            <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
              No notifications found
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              You are completely up to date. Expiry notices and automated compliance digests will appear here when dispatched.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((item) => (
              <div
                key={item.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  !item.is_read
                    ? "bg-blue-50/30 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900 shadow-sm"
                    : "bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800"
                }`}
              >
                <div className="flex items-start gap-3.5 flex-1">
                  <div
                    className={`p-2 rounded-xl shrink-0 ${
                      item.type === "alert"
                        ? "bg-red-50 dark:bg-red-950/50"
                        : item.type === "warning"
                        ? "bg-amber-50 dark:bg-amber-950/50"
                        : "bg-blue-50 dark:bg-blue-950/50"
                    }`}
                  >
                    {getTypeIcon(item.type)}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3
                        className={`text-sm font-bold ${
                          !item.is_read
                            ? "text-slate-900 dark:text-white"
                            : "text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {item.title}
                      </h3>
                      {getTypeBadge(item.type)}
                      {!item.is_read && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                      )}
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {item.message}
                    </p>

                    <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400 font-mono">
                      <span>
                        {new Date(item.created_at).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {item.link && (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="text-xs flex items-center gap-1.5"
                    >
                      <Link to={item.link}>
                        <span>Action</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </Button>
                  )}

                  {!item.is_read ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMarkAsRead(item.id)}
                      className="text-xs text-slate-500 hover:text-emerald-600 flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Mark Read</span>
                    </Button>
                  ) : (
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 px-2">
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Read</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default NotificationsPage;
