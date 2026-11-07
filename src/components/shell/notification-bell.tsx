"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Bell,
  ShoppingBag,
  MessageCircle,
  HelpCircle,
  CheckCheck,
  Loader2,
  BellOff
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

type Notification = {
  _id: string;
  type: string;
  title: string;
  message: string;
  linkType: string | null;
  linkId: string | null;
  isRead: boolean;
  createdAt: string;
};

const POLL_MS = 30000;

const iconFor = (type: string) => {
  if (type === "new_order" || type === "order_update") return ShoppingBag;
  if (type === "new_message") return MessageCircle;
  if (type === "new_query" || type === "new_answer") return HelpCircle;
  return Bell;
};

const toneFor = (type: string) => {
  if (type === "new_order" || type === "order_update") return "text-emerald-500";
  if (type === "new_message") return "text-sky-500";
  if (type === "new_query" || type === "new_answer") return "text-amber-500";
  return "text-slate-400";
};

// Deep link for a notification, where a matching page exists
const hrefFor = (n: Notification) => {
  if (n.linkType === "conversation") return "/messages";
  if (n.linkType === "product" && n.linkId) return `/marketplace/${n.linkId}`;
  return null;
};

const timeAgo = (iso: string) => {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const authHeader = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
    return token ? { Authorization: `Bearer ${token}` } : null;
  };

  const fetchCount = useCallback(async () => {
    const headers = authHeader();
    if (!headers) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/notifications/unread-count`, { headers });
      const data = await res.json();
      if (data.success) setUnread(data.total || 0);
    } catch {
      // Badge is best-effort; keep the last known count
    }
  }, []);

  const fetchList = useCallback(async () => {
    const headers = authHeader();
    if (!headers) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/notifications?limit=15`, { headers });
      const data = await res.json();
      if (data.success) {
        setItems(data.notifications || []);
        setUnread(data.unreadCount || 0);
      }
    } catch {
      // Leave whatever is already on screen
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll the badge so new orders/messages/queries show up without a refresh
  useEffect(() => {
    fetchCount();
    const id = setInterval(fetchCount, POLL_MS);
    return () => clearInterval(id);
  }, [fetchCount]);

  useEffect(() => {
    if (open) fetchList();
  }, [open, fetchList]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const markAllRead = async () => {
    const headers = authHeader();
    if (!headers) return;
    try {
      await fetch(`${API_BASE_URL}/api/notifications/read-all`, { method: "PATCH", headers });
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnread(0);
    } catch {
      // Ignore - the next poll will resync
    }
  };

  const markOneRead = async (id: string) => {
    const headers = authHeader();
    if (!headers) return;
    setItems((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
    setUnread((u) => Math.max(0, u - 1));
    try {
      await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, { method: "PATCH", headers });
    } catch {
      // Optimistic update stands; the next poll corrects it
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="focus-ring relative rounded-sm p-1.5 hover:outline hover:outline-1 hover:outline-white/70"
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
        aria-expanded={open}
      >
        <Bell size={17} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ffa41c] px-1 text-[10px] font-bold text-[#0f1111]">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-xl dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
          <div className="flex items-center justify-between border-b border-slate-200 px-3.5 py-2.5 dark:border-slate-700">
            <p className="text-sm font-bold">Notifications</p>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="focus-ring inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-semibold text-brand-emerald hover:underline"
              >
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[24rem] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-brand-emerald" size={20} />
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <BellOff className="mx-auto mb-2 text-slate-300 dark:text-slate-600" size={26} />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No notifications yet. New orders, messages and questions will appear here.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                {items.map((n) => {
                  const Icon = iconFor(n.type);
                  const href = hrefFor(n);
                  const body = (
                    <div
                      className={`flex gap-2.5 px-3.5 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-700/50 ${
                        n.isRead ? "" : "bg-brand-emerald/5"
                      }`}
                    >
                      <Icon size={16} className={`mt-0.5 shrink-0 ${toneFor(n.type)}`} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold">{n.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500 dark:text-slate-400">
                          {n.message}
                        </p>
                        <p className="mt-1 text-[10px] text-slate-400">{timeAgo(n.createdAt)}</p>
                      </div>
                      {!n.isRead && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-emerald" />
                      )}
                    </div>
                  );

                  return (
                    <li key={n._id}>
                      {href ? (
                        <Link href={href} onClick={() => { markOneRead(n._id); setOpen(false); }}>
                          {body}
                        </Link>
                      ) : (
                        <button onClick={() => markOneRead(n._id)} className="w-full text-left">
                          {body}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
