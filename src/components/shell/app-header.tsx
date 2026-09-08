"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LogOut, MessageCircle, PlusCircle, Search, X } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { SellModal } from "@/components/marketplace/sell-modal";
import { NotificationBell } from "@/components/shell/notification-bell";
import { useAuth } from "@/lib/auth";

function HeaderSearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");

  // Sync input value if URL already has search query
  useEffect(() => {
    const q = searchParams.get("search");
    if (q) {
      setSearchTerm(q);
    } else if (q === null && typeof window !== "undefined" && window.location.pathname === "/marketplace") {
      setSearchTerm("");
    }
  }, [searchParams]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/marketplace?search=${encodeURIComponent(searchTerm.trim())}`);
    } else {
      router.push("/marketplace");
    }
  };

  const handleClear = () => {
    setSearchTerm("");
    if (searchParams.has("search")) {
      router.push("/marketplace");
    }
  };

  return (
    <form
      onSubmit={handleSearchSubmit}
      className="focus-ring flex flex-1 max-w-xl mx-auto items-center overflow-hidden rounded-md bg-white text-[#0f1111]"
    >
      <span className="hidden bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 sm:inline">All</span>
      <input
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        aria-label="Search products"
        placeholder="Search products, calculators, bicycles, books..."
        className="w-full border-0 px-3 py-1.5 text-sm outline-none bg-transparent"
      />
      {searchTerm && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="px-2 text-slate-400 hover:text-slate-600 transition"
        >
          <X size={16} />
        </button>
      )}
      <button
        type="submit"
        className="h-full bg-[#febd69] px-3.5 py-2 text-[#0f1111] hover:bg-[#f3a847] transition active:scale-95"
        aria-label="Search"
      >
        <Search size={16} />
      </button>
    </form>
  );
}

function HeaderSearchFallback() {
  return (
    <div className="flex flex-1 max-w-xl mx-auto items-center overflow-hidden rounded-md bg-white text-[#0f1111]">
      <span className="hidden bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 sm:inline">All</span>
      <input
        aria-label="Search products"
        placeholder="Search products, calculators, bicycles, books..."
        className="w-full border-0 px-3 py-1.5 text-sm outline-none bg-transparent"
        disabled
      />
      <div className="h-full bg-[#febd69] px-3.5 py-2 text-[#0f1111]">
        <Search size={16} />
      </div>
    </div>
  );
}

export function AppHeader() {
  const [isSellOpen, setIsSellOpen] = useState(false);
  const router = useRouter();
  const { isLoggedIn, user, logout } = useAuth();
  const isShopOwner = user?.role === "shop_owner";

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <>
      <header className="bg-[#131921] px-3 py-2 text-white shadow-sm sm:px-5 lg:px-8">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-sm px-2 py-1 hover:outline hover:outline-1 hover:outline-white/70 shrink-0">
              <Logo href={!isLoggedIn ? "/" : isShopOwner ? "/my-shop" : "/home"} />
            </div>
          </div>

          {isShopOwner ? (
            <div className="flex-1" />
          ) : (
            <Suspense fallback={<HeaderSearchFallback />}>
              <HeaderSearchBar />
            </Suspense>
          )}

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {isLoggedIn ? (
              <>
                <button
                  onClick={() => setIsSellOpen(true)}
                  className="focus-ring inline-flex items-center gap-1 rounded-lg bg-brand-emerald px-2 py-1.5 sm:px-3 text-xs font-bold text-white shadow-sm hover:bg-[#0d665f] transition active:scale-95"
                  aria-label="Sell Item"
                >
                  <PlusCircle size={15} />
                  <span className="hidden xs:inline sm:inline">Sell</span>
                </button>

                <NotificationBell />
                <Link href="/messages" className="focus-ring hidden md:inline-flex rounded-sm p-1.5 hover:outline hover:outline-1 hover:outline-white/70" aria-label="Messages">
                  <MessageCircle size={17} />
                </Link>
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
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="focus-ring inline-flex items-center justify-center rounded-lg bg-brand-emerald hover:bg-[#0d665f] text-white font-bold px-2.5 sm:px-3.5 py-1.5 text-xs sm:text-sm transition shadow-sm active:scale-95"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="focus-ring inline-flex items-center justify-center rounded-lg bg-[#ffa41c] hover:bg-[#f39200] text-[#0f1111] font-bold px-2.5 sm:px-3.5 py-1.5 text-xs sm:text-sm transition shadow-sm active:scale-95"
                >
                  Register
                </Link>
                <ThemeToggle />
              </>
            )}
          </div>
        </div>
      </header>
      {isLoggedIn && <SellModal isOpen={isSellOpen} onClose={() => setIsSellOpen(false)} />}
    </>
  );
}

