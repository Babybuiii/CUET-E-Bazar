"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  CheckCheck,
  Gift,
  ExternalLink,
  User,
  X
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

export function NotificationDropdown() {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const getAuthToken = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("cuet_ebazar_token");
  };

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
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      }
    } catch {
      // Silently ignore background polling errors
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20_000);
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

  const handleViewGiveaway = (notif: NotificationItem) => {
    markAsRead(notif._id);
    setIsOpen(false);
    router.push("/giveaways");
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="focus-ring relative rounded-lg p-2 text-slate-200 hover:bg-white/10 hover:text-white transition"
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-sm ring-1 ring-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl dark:border-slate-800 dark:bg-slate-900 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4 py-3 bg-slate-50/50 dark:bg-slate-800/40">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Notifications</h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 px-2 py-0.5 text-[10px] font-bold">
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

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">
                <Bell size={24} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                No notifications yet.
              </div>
            ) : (
              notifications.map((notif) => {
                const isGiveawayClaim = notif.type === "giveaway_claimed";
                const claimant = notif.claimant || {
                  fullName: notif.metadata?.claimantName || "A student",
                  avatarUrl: notif.metadata?.claimantAvatar,
                  department: notif.metadata?.claimantDepartment
                };

                return (
                  <div
                    key={notif._id}
                    className={`p-3.5 transition ${
                      notif.isRead
                        ? "bg-white dark:bg-slate-900/60 opacity-80"
                        : "bg-emerald-50/40 dark:bg-emerald-950/20"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#0f766e]/10 text-[#0f766e]">
                        {isGiveawayClaim ? <Gift size={16} /> : <Bell size={16} />}
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

                        {/* Giveaway Thumbnail & Title (for giveaway claims) */}
                        {isGiveawayClaim && (
                          <div className="mt-2 flex items-center gap-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 p-2 border border-slate-100 dark:border-slate-700/60">
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
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[#0f766e]">
                                <Gift size={18} />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                                {notif.metadata?.giveawayTitle || "Free Giveaway Item"}
                              </p>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                <span>Claimed by <strong className="text-slate-700 dark:text-slate-300">{claimant.fullName}</strong></span>
                                {claimant.department && <span>• {claimant.department}</span>}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Action: View Giveaway (messaging kept exclusively in Giveaways section) */}
                        <div className="mt-2.5 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleViewGiveaway(notif)}
                            className="rounded-lg bg-[#0f766e] hover:bg-[#0f766e]/90 text-white px-3 py-1.5 text-[11px] font-semibold transition flex items-center gap-1.5 shadow-sm"
                          >
                            <Gift size={12} />
                            <span>View Giveaway</span>
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

