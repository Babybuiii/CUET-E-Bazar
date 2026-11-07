"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Store,
  Package,
  Flag,
  BarChart3,
  Bell,
  Settings,
  History,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Shield,
  ShieldAlert
} from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { clearAuthSession, useAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/api";
import { cn } from "@/lib/utils";

const MANAGEMENT_SUBMENU = [
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Sellers", href: "/admin/sellers", icon: Store },
  { name: "Products", href: "/admin/products", icon: Package },
  { name: "Reports & Moderation", href: "/admin/reports", icon: Flag },
];

export default function AdminPortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, isLoggedIn } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mgmtOpen, setMgmtOpen] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingReports, setPendingReports] = useState(0);

  // ── Auth Guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (loading) return;
    if (!isLoggedIn) {
      router.replace("/admin-portal/login");
      return;
    }
    if (user && user.role !== "admin") {
      if (user.role === "shop_owner") {
        router.replace("/shop-portal/dashboard");
      } else {
        router.replace("/home");
      }
    }
  }, [isLoggedIn, user, loading, router]);

  // Keep management open if current route is in management submenu
  useEffect(() => {
    if (MANAGEMENT_SUBMENU.some((sub) => pathname.startsWith(sub.href))) {
      setMgmtOpen(true);
    }
  }, [pathname]);

  // ── Fetch unread notifications & pending reports ──────────────────────────
  useEffect(() => {
    const fetchCounters = async () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
      if (!token) return;
      try {
        const notifRes = await fetch(`${API_BASE_URL}/api/admin/notifications`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const notifData = await notifRes.json();
        if (notifData.success) {
          setUnreadCount(notifData.unreadCount || 0);
        }

        const dashRes = await fetch(`${API_BASE_URL}/api/admin/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const dashData = await dashRes.json();
        if (dashData.success && dashData.stats) {
          setPendingReports(dashData.stats.pendingReportsCount || 0);
        }
      } catch {}
    };

    if (isLoggedIn && user?.role === "admin") {
      fetchCounters();
      const interval = setInterval(fetchCounters, 45000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn, user]);

  const handleLogout = () => {
    clearAuthSession();
    router.push("/admin-portal/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#eaeded] dark:bg-brand-charcoal flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-red-600 border-r-transparent"></div>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Authenticating administrator...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn || (user && user.role !== "admin")) {
    return null;
  }

  const isMgmtActive = MANAGEMENT_SUBMENU.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  );

  return (
    <div className="min-h-screen bg-[#eaeded] dark:bg-brand-charcoal flex">
      {/* ── Mobile Overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden backdrop-blur-xs"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Admin Sidebar ── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 w-64 flex flex-col bg-[#1e293b] text-white transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto border-r border-slate-700/50 shadow-xl",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo & Portal Badge */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-700/60 bg-[#0f172a]">
          <Logo href="/admin" />
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full border border-red-500/30">
              <Shield size={11} /> Admin
            </span>
            <button
              className="lg:hidden text-slate-400 hover:text-white p-1"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Administrator Profile Card */}
        <div className="px-4 py-3 border-b border-slate-700/60 bg-[#162032]">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-full bg-red-600/20 border border-red-500/40 flex items-center justify-center shrink-0">
              <ShieldAlert size={18} className="text-red-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.fullName || "Administrator"}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.email || "admin@cuet-ebazar.com"}</p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {/* 1. Dashboard */}
          <Link
            href="/admin"
            onClick={() => setSidebarOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 group",
              pathname === "/admin" || pathname === "/admin/dashboard"
                ? "bg-brand-emerald text-white shadow-sm font-semibold"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            )}
          >
            <LayoutDashboard size={18} className={pathname === "/admin" || pathname === "/admin/dashboard" ? "text-white" : "text-slate-400 group-hover:text-white"} />
            <span>Dashboard</span>
            {(pathname === "/admin" || pathname === "/admin/dashboard") && (
              <ChevronRight size={14} className="ml-auto text-white/70" />
            )}
          </Link>

          {/* 2. Management (Expandable/Collapsible) */}
          <div className="pt-1">
            <button
              onClick={() => setMgmtOpen(!mgmtOpen)}
              className={cn(
                "w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 group",
                isMgmtActive
                  ? "text-white font-semibold"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <div className="flex items-center gap-3">
                <Users size={18} className={isMgmtActive ? "text-brand-emerald" : "text-slate-400 group-hover:text-white"} />
                <span>Management</span>
              </div>
              <div className="flex items-center gap-1.5">
                {pendingReports > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                    {pendingReports}
                  </span>
                )}
                {mgmtOpen ? (
                  <ChevronDown size={15} className="text-slate-400" />
                ) : (
                  <ChevronRight size={15} className="text-slate-400" />
                )}
              </div>
            </button>

            {/* Management Submenu items */}
            {mgmtOpen && (
              <div className="mt-1 ml-4 pl-2 border-l border-slate-700/60 space-y-0.5">
                {MANAGEMENT_SUBMENU.map((sub) => {
                  const SubIcon = sub.icon;
                  const isSubActive = pathname === sub.href || pathname.startsWith(sub.href + "/");
                  const isReports = sub.href.includes("reports");

                  return (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150 group",
                        isSubActive
                          ? "bg-brand-emerald text-white font-semibold shadow-xs"
                          : "text-slate-400 hover:bg-slate-800 hover:text-white"
                      )}
                    >
                      <SubIcon size={15} className={isSubActive ? "text-white" : "text-slate-400 group-hover:text-white"} />
                      <span>{sub.name}</span>
                      {isReports && pendingReports > 0 && (
                        <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                          {pendingReports}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. Analytics */}
          <Link
            href="/admin/analytics"
            onClick={() => setSidebarOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 group",
              pathname === "/admin/analytics" || pathname.startsWith("/admin/analytics/")
                ? "bg-brand-emerald text-white shadow-sm font-semibold"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            )}
          >
            <BarChart3 size={18} className={pathname.startsWith("/admin/analytics") ? "text-white" : "text-slate-400 group-hover:text-white"} />
            <span>Analytics</span>
            {pathname.startsWith("/admin/analytics") && (
              <ChevronRight size={14} className="ml-auto text-white/70" />
            )}
          </Link>

          {/* 4. Notifications */}
          <Link
            href="/admin/notifications"
            onClick={() => setSidebarOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 group relative",
              pathname === "/admin/notifications" || pathname.startsWith("/admin/notifications/")
                ? "bg-brand-emerald text-white shadow-sm font-semibold"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            )}
          >
            <Bell size={18} className={pathname.startsWith("/admin/notifications") ? "text-white" : "text-slate-400 group-hover:text-white"} />
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Link>

          {/* 5. Activity Log */}
          <Link
            href="/admin/logs"
            onClick={() => setSidebarOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 group",
              pathname === "/admin/logs" || pathname.startsWith("/admin/logs/")
                ? "bg-brand-emerald text-white shadow-sm font-semibold"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            )}
          >
            <History size={18} className={pathname.startsWith("/admin/logs") ? "text-white" : "text-slate-400 group-hover:text-white"} />
            <span>Activity Log</span>
            {pathname.startsWith("/admin/logs") && (
              <ChevronRight size={14} className="ml-auto text-white/70" />
            )}
          </Link>

          {/* 6. Settings */}
          <Link
            href="/admin/settings"
            onClick={() => setSidebarOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 group",
              pathname === "/admin/settings" || pathname.startsWith("/admin/settings/")
                ? "bg-brand-emerald text-white shadow-sm font-semibold"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            )}
          >
            <Settings size={18} className={pathname.startsWith("/admin/settings") ? "text-white" : "text-slate-400 group-hover:text-white"} />
            <span>Settings</span>
            {pathname.startsWith("/admin/settings") && (
              <ChevronRight size={14} className="ml-auto text-white/70" />
            )}
          </Link>
        </nav>

        {/* Footer / Logout */}
        <div className="border-t border-slate-700/60 p-3">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all duration-150"
          >
            <LogOut size={17} />
            <span>Admin Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Main View Area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 bg-[#0f172a] text-white px-4 py-3 shadow-md lg:px-6 border-b border-slate-700/60">
          {/* Mobile menu toggle */}
          <button
            className="lg:hidden text-slate-300 hover:text-white p-1"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu size={22} />
          </button>

          {/* Breadcrumb / Section Title */}
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-xs text-slate-400 font-medium">CUET E-Bazar</span>
            <span className="hidden sm:inline text-slate-500">/</span>
            <span className="text-xs text-red-400 font-semibold bg-red-950/40 border border-red-800/40 px-2 py-0.5 rounded-md">
              Control Centre
            </span>
            <span className="text-slate-500">/</span>
            <span className="text-sm font-semibold text-white capitalize">
              {pathname === "/admin" || pathname === "/admin/dashboard"
                ? "Platform Dashboard"
                : pathname.replace("/admin/", "").replace("-", " ")}
            </span>
          </div>

          {/* Actions & Utilities */}
          <div className="flex items-center gap-2.5">
            <Link
              href="/admin/notifications"
              className="relative p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition"
              aria-label="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>

            <ThemeToggle
              className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition"
              size={18}
            />

            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-700/60 text-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-slate-300 font-medium">Active Mode</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto px-4 py-5 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

