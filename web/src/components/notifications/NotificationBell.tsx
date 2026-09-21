import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  fetchUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type NotificationItem,
} from "@/lib/notificationService";
import { Button } from "@/components/ui/button";
import {
  Bell,
  AlertTriangle,
  Clock,
  Info,
  Check,
  CheckCheck,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

export const NotificationBell: React.FC<{ className?: string }> = ({ className = "" }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const popoverRef = useRef<HTMLDivElement>(null);

  const loadNotifications = async () => {
    if (!user?.id) return;
    try {
      const list = await fetchUserNotifications(user.id);
      setNotifications(list);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  };

  useEffect(() => {
    loadNotifications();
    // Refresh periodically every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAsRead = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await markNotificationAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const handleMarkAllRead = async () => {
    if (!user?.id) return;
    setLoading(true);
    await markAllNotificationsAsRead(user.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setLoading(false);
    toast.success("All notifications marked as read");
  };

  const handleNotificationClick = async (item: NotificationItem) => {
    if (!item.is_read) {
      await markNotificationAsRead(item.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
      );
    }
    setOpen(false);
    if (item.link) {
      navigate(item.link);
    }
  };

  const displayedList = notifications.filter((n) =>
    activeTab === "unread" ? !n.is_read : true
  );

  const formatRelativeTime = (iso: string) => {
    const diffMs = Date.now() - new Date(iso).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getTypeIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "alert":
        return <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />;
      case "warning":
        return <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />;
      case "info":
      default:
        return <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />;
    }
  };

  return (
    <div className={`relative ${className}`} ref={popoverRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => {
          setOpen(!open);
          if (!open) loadNotifications();
        }}
        className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-900 animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl z-50 overflow-hidden flex flex-col max-h-[520px]">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={loading}
                className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 font-medium flex items-center gap-1 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <CheckCheck className="w-3.5 h-3.5" />
                )}
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100 dark:border-slate-800/60 text-xs">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                activeTab === "all"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setActiveTab("unread")}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                activeTab === "unread"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* List Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {displayedList.length === 0 ? (
              <div className="py-12 text-center px-4">
                <Check className="w-8 h-8 text-emerald-500 mx-auto mb-2 bg-emerald-50 dark:bg-emerald-950/50 p-1.5 rounded-full" />
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {activeTab === "unread" ? "No unread notifications" : "No notifications yet"}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Regulatory warnings and expiry digests will appear here.
                </p>
              </div>
            ) : (
              displayedList.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-3.5 flex gap-3 text-left transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                    !item.is_read ? "bg-blue-50/40 dark:bg-blue-950/20" : ""
                  }`}
                >
                  {getTypeIcon(item.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <h4
                        className={`text-xs font-semibold truncate ${
                          !item.is_read
                            ? "text-slate-900 dark:text-white"
                            : "text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {item.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                        {formatRelativeTime(item.created_at)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>

                    {item.link && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                        <span>Take Action</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>

                  {!item.is_read && (
                    <button
                      onClick={(e) => handleMarkAsRead(e, item.id)}
                      title="Mark as read"
                      className="self-center p-1 rounded-full text-slate-400 hover:text-emerald-600 hover:bg-slate-200/50 dark:hover:bg-slate-700"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-slate-100 dark:border-slate-800 text-center bg-slate-50/50 dark:bg-slate-900">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="w-full text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white h-7"
              onClick={() => setOpen(false)}
            >
              <Link to="/notifications">View All Notifications</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
