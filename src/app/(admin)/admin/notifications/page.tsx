"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Bell,
  Flag,
  ShieldAlert,
  Info,
  CheckCircle2,
  Clock,
  Check,
  RefreshCw,
  ExternalLink,
  Loader2,
  AlertCircle
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/api";

type NotificationItem = {
  _id: string;
  type: string;
  title: string;
  message: string;
  linkType?: string;
  linkId?: string;
  isRead: boolean;
  createdAt: string;
};

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchNotifications = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/api/admin/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error("Fetch notifications error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
      const res = await fetch(`${API_BASE_URL}/api/admin/notifications/${id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Mark read error:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
      const res = await fetch(`${API_BASE_URL}/api/admin/notifications/mark-all-read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("Mark all read error:", err);
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case "new_report":
        return <Flag size={18} className="text-red-500" />;
      case "admin_warning":
        return <ShieldAlert size={18} className="text-amber-500" />;
      case "system_alert":
        return <AlertCircle size={18} className="text-blue-500" />;
      default:
        return <Bell size={18} className="text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <PageHeader
          title="System & Moderation Notifications"
          description="Real-time alerts for incoming scam reports, seller registrations, and platform events."
        />
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              onClick={markAllAsRead}
              variant="outline"
              size="sm"
              className="text-xs bg-white dark:bg-slate-800"
            >
              <Check size={14} className="mr-1 text-emerald-600" />
              Mark all as read
            </Button>
          )}
          <Button
            onClick={() => fetchNotifications(true)}
            disabled={refreshing}
            variant="outline"
            size="sm"
            className="text-xs bg-white dark:bg-slate-800"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>

      {/* ── Notifications List ── */}
      <Card className="p-0 overflow-hidden border-slate-200/80 dark:border-slate-700/80">
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-500">
              <Loader2 className="animate-spin mx-auto text-brand-emerald mb-2" size={24} />
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500">
              <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
              No notifications. All systems operational.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n._id}
                className={`p-4 flex items-start justify-between gap-3 transition ${
                  n.isRead ? "bg-white dark:bg-slate-900" : "bg-red-50/30 dark:bg-red-950/20"
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0 mt-0.5">
                    {getNotifIcon(n.type)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-xs ${n.isRead ? "font-medium text-slate-800 dark:text-slate-200" : "font-bold text-slate-900 dark:text-white"}`}>
                        {n.title}
                      </p>
                      {!n.isRead && (
                        <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" title="Unread" />
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      {n.message}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                      <span>{new Date(n.createdAt).toLocaleDateString()} at {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      {n.linkType === "report" && n.linkId && (
                        <Link
                          href={`/admin/reports?id=${n.linkId}`}
                          className="text-brand-emerald hover:underline font-semibold flex items-center gap-0.5"
                        >
                          View Report <ExternalLink size={10} />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                {!n.isRead && (
                  <button
                    onClick={() => markAsRead(n._id)}
                    className="shrink-0 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-[11px] font-medium"
                    title="Mark as read"
                  >
                    Mark read
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

