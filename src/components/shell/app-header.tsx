"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, LogOut, MapPin, MessageCircle, PlusCircle, Search, ShoppingCart } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { SellModal } from "@/components/marketplace/sell-modal";

export function AppHeader() {
  const [isSellOpen, setIsSellOpen] = useState(false);
  const router = useRouter();

  const handleLogout = () => {
    try {
      localStorage.removeItem("cuet_ebazar_token");
      localStorage.removeItem("cuet_ebazar_user");
    } catch {
      // Ignore if localStorage unavailable
    }
    router.push("/");
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-[#131921] px-3 py-2 text-white shadow-sm sm:px-5 lg:px-8">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="hidden rounded-sm px-2 py-1 hover:outline hover:outline-1 hover:outline-white/70 md:block">
              <Logo href="/home" />
            </div>

            <button className="hidden items-center gap-2 rounded-sm px-2 py-1 text-left hover:outline hover:outline-1 hover:outline-white/70 lg:flex" aria-label="Delivery location">
              <MapPin size={16} />
              <span className="text-xs leading-tight text-slate-200">
                Deliver to
                <span className="block text-sm font-semibold text-white">CUET Campus</span>
              </span>
            </button>
          </div>

          <label className="focus-ring flex flex-1 max-w-xl mx-auto items-center overflow-hidden rounded-md bg-white text-[#0f1111]">
            <span className="hidden bg-slate-100 px-3 py-1.5 text-xs text-slate-700 sm:inline">All</span>
            <input
              aria-label="Search products"
              placeholder="Search CUET E-Bazar..."
              className="w-full border-0 px-3 py-1.5 text-sm outline-none"
            />
            <button className="h-full bg-[#febd69] px-3 py-2 text-[#0f1111] hover:bg-[#f3a847] transition" aria-label="Search">
              <Search size={16} />
            </button>
          </label>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setIsSellOpen(true)}
              className="focus-ring hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-brand-emerald px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-[#0d665f] transition active:scale-95"
            >
              <PlusCircle size={15} />
              <span>Sell</span>
            </button>

            <button className="focus-ring hidden md:inline-flex rounded-sm p-1.5 hover:outline hover:outline-1 hover:outline-white/70" aria-label="Notifications">
              <Bell size={17} />
            </button>
            <Link href="/messages" className="focus-ring hidden md:inline-flex rounded-sm p-1.5 hover:outline hover:outline-1 hover:outline-white/70" aria-label="Messages">
              <MessageCircle size={17} />
            </Link>
            <button className="focus-ring hidden md:inline-flex items-center gap-1 rounded-sm px-2 py-1 hover:outline hover:outline-1 hover:outline-white/70" aria-label="Cart">
              <ShoppingCart size={18} />
              <span className="text-xs font-semibold">Cart</span>
            </button>
            <ThemeToggle />

            <button
              onClick={handleLogout}
              className="focus-ring inline-flex items-center gap-1.5 rounded-md border border-rose-500/40 bg-rose-500/10 px-2.5 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-600 hover:text-white transition active:scale-95"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>
      <SellModal isOpen={isSellOpen} onClose={() => setIsSellOpen(false)} />
    </>
  );
}

