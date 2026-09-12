"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Store, Plus, Gift, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/lib/auth";

type MobileBottomNavProps = {
  onOpenSell?: () => void;
};

export function MobileBottomNav({ onOpenSell }: MobileBottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoggedIn } = useAuth();

  const handleSellClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      router.push("/login?redirect=sell");
      return;
    }
    if (onOpenSell) {
      onOpenSell();
    } else {
      window.dispatchEvent(new Event("open-sell-modal"));
    }
  };

  const isHomeActive = pathname === "/home" || pathname === "/";
  const isShopsActive = pathname === "/shops" || pathname.startsWith("/shops/");
  const isGiveawaysActive = pathname === "/giveaways" || pathname.startsWith("/giveaways/");
  const isDashboardActive =
    pathname === "/dashboard" ||
    pathname === "/my-dashboard" ||
    pathname === "/my-listings" ||
    pathname === "/my-orders";

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 block md:hidden bg-[#131921] dark:bg-slate-950 border-t border-slate-700/70 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.3)] pb-[max(env(safe-area-inset-bottom),0.35rem)] pt-1"
    >
      <div className="grid grid-cols-5 items-center h-14 max-w-lg mx-auto px-1">
        {/* 1. Home */}
        <Link
          href={isLoggedIn ? "/home" : "/"}
          className={`flex flex-col items-center justify-center py-1 transition-colors ${
            isHomeActive
              ? "text-brand-emerald font-bold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Home size={20} className={isHomeActive ? "stroke-[2.5]" : "stroke-[1.8]"} />
          <span className="text-[10px] mt-0.5 tracking-tight">Home</span>
        </Link>

        {/* 2. Shops */}
        <Link
          href="/shops"
          className={`flex flex-col items-center justify-center py-1 transition-colors ${
            isShopsActive
              ? "text-brand-emerald font-bold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Store size={20} className={isShopsActive ? "stroke-[2.5]" : "stroke-[1.8]"} />
          <span className="text-[10px] mt-0.5 tracking-tight">Shops</span>
        </Link>

        {/* 3. Center Circular + Sell Button */}
        <div className="flex flex-col items-center justify-center -translate-y-3">
          <button
            type="button"
            onClick={handleSellClick}
            aria-label="Sell an item"
            className="group flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-brand-emerald via-emerald-500 to-teal-400 text-white shadow-lg shadow-emerald-500/40 ring-4 ring-[#131921] dark:ring-slate-950 transition-all duration-200 active:scale-95 hover:scale-105"
          >
            <Plus size={26} className="stroke-[2.8] transition-transform duration-200 group-hover:rotate-90" />
          </button>
          <span className="text-[10px] font-bold text-emerald-400 mt-0.5 tracking-tight">
            Sell
          </span>
        </div>

        {/* 4. Giveaways */}
        <Link
          href="/giveaways"
          className={`flex flex-col items-center justify-center py-1 transition-colors ${
            isGiveawaysActive
              ? "text-brand-emerald font-bold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Gift size={20} className={isGiveawaysActive ? "stroke-[2.5]" : "stroke-[1.8]"} />
          <span className="text-[10px] mt-0.5 tracking-tight">Giveaways</span>
        </Link>

        {/* 5. Dashboard */}
        <Link
          href={isLoggedIn ? "/dashboard" : "/login"}
          className={`flex flex-col items-center justify-center py-1 transition-colors ${
            isDashboardActive
              ? "text-brand-emerald font-bold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <LayoutDashboard
            size={20}
            className={isDashboardActive ? "stroke-[2.5]" : "stroke-[1.8]"}
          />
          <span className="text-[10px] mt-0.5 tracking-tight">Dashboard</span>
        </Link>
      </div>
    </nav>
  );
}
