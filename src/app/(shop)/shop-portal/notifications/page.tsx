"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Bell, BellOff, Check, CheckCheck, ShoppingBag, Package,
  Loader2, RefreshCw, ExternalLink, User
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/api";

type Notification = {
  _id: string;
  type: string;
  title: string;
  message: string;
  linkType?: string;
  linkId?: string;
  isRead: boolean;
  createdAt: string;
  metadata?: {
    buyerName?: string;
    buyerAvatar?: string;
    items?: Array<{ title: string; qty: number }>;
    totalAmount?: number;
  };
  claimant?: {
    fullName: string;
    avatarUrl?: string;
  };
};

const TYPE_ICONS: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  new_order: { icon: ShoppingBag, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/40" },
  order_update: { icon: ShoppingBag, color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-50 dark:bg-teal-950/40" },
  new_message: { icon: Bell, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/40" },
  default: { icon: Bell, color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-800" },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
    if (!token) { setLoading(false); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const markRead = async (id: string) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
    if (!token) return;
    try {
      await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
    if (!token) { setMarkingAll(false); return; }
    try {
      await fetch(`${API_BASE_URL}/api/notifications/mark-all-read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
    finally { setMarkingAll(false); }
  };

  const getOrderLink = (n: Notification) => {
    if (n.linkType === "order" && n.linkId) return `/shop-portal/orders?id=${n.linkId}`;
    return null;
  };

  const formatDate = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(d).toLocaleDateString("en-BD", { day: "numeric", month: "short" });
  };

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Notifications
            {unreadCount > 0 && (
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-2 text-xs font-bold text-white">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{notifications.length} total notifications</p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              onClick={markAllRead}
              disabled={markingAll}
              className="flex items-center gap-1.5 text-xs"
            >
              {markingAll ? <Loader2 size={13} className="animate-spin" /> : <CheckCheck size={13} />}
              Mark all read
            </Button>
          )}
          <button onClick={fetchNotifications} className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-brand-emerald" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center">
            <BellOff size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-600 dark:text-slate-300 font-medium">No notifications yet.</p>
            <p className="text-xs text-slate-400 mt-1">You'll be notified when students place orders.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {notifications.map(notif => {
              const typeConfig = TYPE_ICONS[notif.type] || TYPE_ICONS.default;
              const Icon = typeConfig.icon;
              const orderLink = getOrderLink(notif);
              const avatarUrl = notif.metadata?.buyerAvatar || notif.claimant?.avatarUrl;

              return (
                <div
                  key={notif._id}
                  className={`flex items-start gap-3 sm:gap-4 px-4 sm:px-5 py-4 transition ${!notif.isRead ? "bg-blue-50/50 dark:bg-blue-950/10" : "hover:bg-slate-50/50 dark:hover:bg-slate-800/20"}`}
                >
                  {/* Avatar / Icon */}
                  <div className="shrink-0 mt-0.5">
                    {avatarUrl ? (
                      <Image src={avatarUrl} alt="" width={36} height={36} className="rounded-full h-9 w-9 object-cover" />
                    ) : (
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center ${typeConfig.bg}`}>
                        <Icon size={17} className={typeConfig.color} />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-semibold ${!notif.isRead ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-300"}`}>
                        {notif.title}
                      </p>
                      <span className="text-[10px] text-slate-400 shrink-0 mt-0.5">{formatDate(notif.createdAt)}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{notif.message}</p>

                    {/* Actions */}
                    <div className="flex items-center gap-3 mt-2">
                      {orderLink && (
                        <Link
                          href={orderLink}
                          onClick={() => !notif.isRead && markRead(notif._id)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-emerald hover:underline"
                        >
                          <ExternalLink size={11} /> View Order
                        </Link>
                      )}
                      {!notif.isRead && (
                        <button
                          onClick={() => markRead(notif._id)}
                          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-brand-emerald transition"
                        >
                          <Check size={11} /> Mark read
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Unread dot */}
                  {!notif.isRead && (
                    <div className="shrink-0 mt-2">
                      <div className="h-2 w-2 rounded-full bg-blue-500" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

