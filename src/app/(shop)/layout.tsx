"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Store,
  Package,
  ShoppingBag,
  Bell,
  User,
  LogOut,
  Menu,
  X,
  ChevronRight
} from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { clearAuthSession, useAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/api";
import { cn } from "@/lib/utils";

const OWNER_NAV = [
  { name: "Dashboard", href: "/shop-portal/dashboard", icon: LayoutDashboard },
  { name: "My Shop", href: "/shop-portal/my-shop", icon: Store },
  { name: "My Products", href: "/shop-portal/products", icon: Package },
  { name: "Orders", href: "/shop-portal/orders", icon: ShoppingBag },
  { name: "Notifications", href: "/shop-portal/notifications", icon: Bell },
];

export default function ShopPortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, isLoggedIn } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // ── Auth Guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (loading) return;
    if (!isLoggedIn) {
      router.replace("/shop-portal/login");
      return;
    }
    if (user && user.role !== "shop_owner" && user.role !== "admin") {
      // Redirect non-owners to student portal
      router.replace("/home");
    }
  }, [isLoggedIn, user, loading, router]);

  // ── Fetch unread notification count ────────────────────────────────────────
  useEffect(() => {
    const fetchUnread = async () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/notifications`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) setUnreadCount(data.unreadCount || 0);
      } catch {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    clearAuthSession();
    router.push("/shop-portal/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#eaeded] dark:bg-brand-charcoal flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-emerald border-r-transparent"></div>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Loading shop portal...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn || (user && user.role !== "shop_owner" && user.role !== "admin")) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#eaeded] dark:bg-brand-charcoal flex">
      {/* ── Mobile Overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 w-64 flex flex-col bg-[#232f3e] text-white transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo Area */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#131921]">
          <Logo href="/shop-portal/dashboard" />
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
              Shop Portal
            </span>
            <button
              className="lg:hidden text-white/60 hover:text-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Owner Info */}
        <div className="px-4 py-3 border-b border-white/10 bg-[#1a2534]">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
              <Store size={18} className="text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.fullName || "Shop Owner"}</p>
              <p className="text-[10px] text-white/50 truncate">{user?.email || ""}</p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {OWNER_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const isBell = item.href.includes("notifications");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 group relative",
                  isActive
                    ? "bg-brand-emerald text-white shadow-sm"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon size={17} className={isActive ? "text-white" : "text-white/60 group-hover:text-white"} />
                <span>{item.name}</span>
                {isBell && unreadCount > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
                {isActive && <ChevronRight size={14} className="ml-auto text-white/70" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="border-t border-white/10 px-2 py-2 space-y-0.5">
          <Link
            href="/shop-portal/account"
            onClick={() => setSidebarOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
              pathname === "/shop-portal/account"
                ? "bg-brand-emerald text-white"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            )}
          >
            <User size={17} className="text-white/60" />
            My Account
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all duration-150"
          >
            <LogOut size={17} />
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header (mobile) */}
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-[#131921] text-white px-4 py-3 shadow-md lg:px-6">
          {/* Mobile menu toggle */}
          <button
            className="lg:hidden text-white/70 hover:text-white p-1"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={22} />
          </button>

          {/* Page breadcrumb / title on mobile */}
          <div className="flex-1 lg:flex lg:items-center lg:gap-2">
            <span className="hidden lg:inline text-xs text-white/40 font-medium">CUET E-Bazar</span>
            <span className="hidden lg:inline text-white/30">/</span>
            <span className="text-sm font-semibold text-white">
              {OWNER_NAV.find(n => pathname === n.href || pathname.startsWith(n.href + "/"))?.name || "Shop Portal"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/shop-portal/notifications"
              className="relative p-1.5 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition"
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
              className="p-1.5 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition"
              size={18}
            />
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

