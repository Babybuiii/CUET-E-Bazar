"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  Gift,
  ShoppingBag,
  MessageSquare,
  Package,
  AlertCircle,
  ShieldAlert,
  HelpCircle,
  ExternalLink,
  Laptop
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface NotificationItem {
  _id: string;
  type: string;
  title: string;
  message: string;
  linkType?: string | null;
  linkId?: string | null;
  isRead: boolean;
  createdAt: string;
  claimant?: {
    _id: string;
    fullName: string;
    avatarUrl?: string;
    department?: string;
    userId?: string;
  } | null;
  metadata?: {
    giveawayId?: string;
    giveawayTitle?: string;
    giveawayImage?: string | null;
    claimantName?: string;
    claimantAvatar?: string | null;
    claimantDepartment?: string | null;
    claimantUserId?: string | null;
    conversationId?: string | null;
    location?: string;
    pickupSpot?: string;
  };
}

export function NotificationDropdown({ buttonClassName }: { buttonClassName?: string } = {}) {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [devicePermission, setDevicePermission] = useState<NotificationPermission>("default");

  // Track seen IDs to only trigger device notification on genuinely new incoming items
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initialFetchDone = useRef(false);

  const getAuthToken = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("cuet_ebazar_token");
  };

  const getUserRole = () => {
    if (typeof window === "undefined") return null;
    try {
      const u = localStorage.getItem("cuet_ebazar_user");
      return u ? JSON.parse(u)?.role : null;
    } catch {
      return null;
    }
  };

  // Check browser notification support
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setDevicePermission(window.Notification.permission);
    }
  }, []);

  const requestDeviceNotifications = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    try {
      const perm = await window.Notification.requestPermission();
      setDevicePermission(perm);
      if (perm === "granted") {
        new window.Notification("Device Notifications Enabled", {
          body: "You will now receive accurate alerts for orders, messages, and giveaways directly on this device.",
          icon: "/ebazar.png"
        });
      }
    } catch (err) {
      console.warn("Notification permission request error:", err);
    }
  };

  const getTargetRouteAndLabel = useCallback((notif: NotificationItem) => {
    const role = getUserRole();

    // 1. Giveaways
    if (notif.type.startsWith("giveaway") || notif.linkType === "giveaway") {
      return {
        href: "/giveaways",
        label: "View Giveaway",
        Icon: Gift
      };
    }

    // 2. Messages / Chat
    if (notif.type === "new_message" || notif.linkType === "conversation") {
      const convId = notif.linkId || notif.metadata?.conversationId;
      return {
        href: convId ? `/messages?conversationId=${convId}` : "/messages",
        label: "Open Chat",
        Icon: MessageSquare
      };
    }

    // 3. Orders
    if (notif.type.startsWith("order") || notif.linkType === "order") {
      const target = role === "shop_owner"
        ? "/shop-portal/orders"
        : role === "admin"
          ? "/admin/orders"
          : "/my-orders";
      return {
        href: target,
        label: "View Order",
        Icon: ShoppingBag
      };
    }

    // 4. Products / Q&A
    if (notif.type.startsWith("new_query") || notif.type.startsWith("new_answer") || notif.linkType === "product") {
      return {
        href: notif.linkId ? `/marketplace/${notif.linkId}` : "/marketplace",
        label: "View Product",
        Icon: Package
      };
    }

    // 5. Reports & Moderation
    if (notif.type.startsWith("report") || notif.linkType === "report") {
      return {
        href: "/admin/reports",
        label: "View Report",
        Icon: ShieldAlert
      };
    }

    // 6. Admin warnings / System alerts
    if (notif.type.includes("warning") || notif.type.includes("alert")) {
      return {
        href: "/dashboard",
        label: "View Details",
        Icon: AlertCircle
      };
    }

    // Fallback
    return {
      href: "/dashboard",
      label: "View",
      Icon: Bell
    };
  }, []);

  const triggerDeviceNotification = useCallback((notif: NotificationItem) => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (window.Notification.permission !== "granted") return;

    try {
      const deviceNotif = new window.Notification(notif.title, {
        body: notif.message,
        icon: "/ebazar.png",
        tag: notif._id
      });

      deviceNotif.onclick = () => {
        window.focus();
        const { href } = getTargetRouteAndLabel(notif);
        router.push(href);
      };
    } catch (e) {
      console.warn("Failed to trigger device notification:", e);
    }
  }, [getTargetRouteAndLabel, router]);

  const fetchNotifications = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const list: NotificationItem[] = data.notifications || [];
          setNotifications(list);
          setUnreadCount(data.unreadCount || 0);

          // Device notification dispatch
          if (initialFetchDone.current) {
            list.forEach(n => {
              if (!n.isRead && !seenIdsRef.current.has(n._id)) {
                triggerDeviceNotification(n);
              }
            });
          }

          // Update seen tracker
          list.forEach(n => seenIdsRef.current.add(n._id));
          initialFetchDone.current = true;
        }
      }
    } catch {
      // Silently ignore background polling errors
    }
  }, [triggerDeviceNotification]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const markAsRead = async (id: string) => {
    const token = getAuthToken();
    if (!token) return;

    try {
      await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev =>
        prev.map(n => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const markAllAsRead = async () => {
    const token = getAuthToken();
    if (!token) return;

    try {
      setLoading(true);
      await fetch(`${API_BASE_URL}/api/notifications/mark-all-read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleActionClick = (notif: NotificationItem) => {
    markAsRead(notif._id);
    setIsOpen(false);
    const { href } = getTargetRouteAndLabel(notif);
    router.push(href);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className={buttonClassName || "focus-ring relative rounded-lg p-2 text-slate-200 hover:bg-white/10 hover:text-white transition"}
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-orange px-1 text-[10px] font-bold text-white shadow-sm ring-1 ring-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl dark:border-slate-800 dark:bg-slate-900 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4 py-3 bg-slate-50 dark:bg-slate-800/80">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Notifications</h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-emerald-100 text-brand-emerald dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                disabled={loading}
                className="text-xs text-brand-emerald hover:underline font-semibold flex items-center gap-1"
              >
                <CheckCheck size={13} />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Device Notification Prompt Banner */}
          {devicePermission === "default" && (
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-4 py-2 text-xs">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Laptop size={14} className="text-brand-emerald shrink-0" />
                <span>Receive device notifications</span>
              </div>
              <button
                onClick={requestDeviceNotifications}
                className="font-semibold text-brand-emerald hover:underline text-[11px] shrink-0"
              >
                Enable
              </button>
            </div>
          )}

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">
                <Bell size={24} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                No notifications yet.
              </div>
            ) : (
              notifications.map((notif) => {
                const { label, Icon } = getTargetRouteAndLabel(notif);
                const isGiveaway = notif.type.startsWith("giveaway");

                return (
                  <div
                    key={notif._id}
                    className={`p-3.5 transition ${
                      notif.isRead
                        ? "bg-white dark:bg-slate-900 opacity-80"
                        : "bg-emerald-50/30 dark:bg-emerald-950/20"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-emerald/10 text-brand-emerald">
                        <Icon size={16} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            {notif.title}
                          </p>
                          <span className="text-[10px] text-slate-400">
                            {new Date(notif.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric"
                            })}
                          </span>
                        </div>

                        <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300 leading-snug">
                          {notif.message}
                        </p>

                        {/* Giveaway Thumbnail & Title (if giveaway claimed with image) */}
                        {isGiveaway && notif.metadata?.giveawayTitle && (
                          <div className="mt-2 flex items-center gap-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 p-2 border border-slate-100 dark:border-slate-700">
                            {notif.metadata?.giveawayImage ? (
                              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-200 border border-slate-200 dark:border-slate-700">
                                <Image
                                  src={notif.metadata.giveawayImage}
                                  alt={notif.metadata.giveawayTitle || "Giveaway"}
                                  fill
                                  className="object-cover"
                                  unoptimized={notif.metadata.giveawayImage.includes("cloudinary.com") || notif.metadata.giveawayImage.startsWith("data:")}
                                />
                              </div>
                            ) : (
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-brand-emerald">
                                <Gift size={18} />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                                {notif.metadata.giveawayTitle}
                              </p>
                              {notif.metadata.claimantName && (
                                <p className="text-[10px] text-slate-500">
                                  Claimed by <strong className="text-slate-700 dark:text-slate-300">{notif.metadata.claimantName}</strong>
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Accurate Action Button */}
                        <div className="mt-2.5 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleActionClick(notif)}
                            className="rounded-lg bg-brand-emerald hover:bg-brand-emerald/90 text-white px-3 py-1.5 text-[11px] font-semibold transition flex items-center gap-1.5 shadow-sm"
                          >
                            <Icon size={12} />
                            <span>{label}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
