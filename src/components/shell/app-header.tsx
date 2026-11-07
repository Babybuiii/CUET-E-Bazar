"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Bell, LogOut, LogIn, Menu, MessageCircle, PlusCircle, Search, ShoppingBag, X } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { SellModal } from "@/components/marketplace/sell-modal";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { NotificationBell } from "@/components/shell/notification-bell";
import { fetchCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";

function HeaderSearchBar({ className = "" }: { className?: string }) {
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
      className={`focus-ring flex items-center overflow-hidden rounded-md bg-white text-[#0f1111] ${
        className || "flex-1 max-w-xl mx-auto"
      }`}
    >
      <span className="hidden bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 sm:inline">All</span>
      <input
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        aria-label="Search products"
        placeholder="Search products..."
        className="w-full min-w-0 border-0 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm outline-none bg-transparent"
      />
      {searchTerm && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="px-1.5 text-slate-400 hover:text-slate-600 transition shrink-0"
        >
          <X size={14} />
        </button>
      )}
      <button
        type="submit"
        className="h-full bg-[#febd69] px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[#0f1111] hover:bg-[#f3a847] transition active:scale-95 shrink-0 flex items-center justify-center"
        aria-label="Search"
      >
        <Search size={15} />
      </button>
    </form>
  );
}

function HeaderSearchFallback({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-center overflow-hidden rounded-md bg-white text-[#0f1111] ${
        className || "flex-1 max-w-xl mx-auto"
      }`}
    >
      <span className="hidden bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 sm:inline">All</span>
      <input
        aria-label="Search products"
        placeholder="Search products..."
        className="w-full min-w-0 border-0 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm outline-none bg-transparent"
        disabled
      />
      <div className="h-full bg-[#febd69] px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[#0f1111] shrink-0 flex items-center justify-center">
        <Search size={15} />
      </div>
    </div>
  );
}

type AppHeaderProps = {
  onOpenSidebar?: () => void;
  onOpenSell?: () => void;
};

export function AppHeader({ onOpenSidebar, onOpenSell }: AppHeaderProps = {}) {
  const [isSellOpen, setIsSellOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const router = useRouter();
  const { isLoggedIn, user, logout } = useAuth();
  const isShopOwner = user?.role === "shop_owner";

  useEffect(() => {
    const updateCount = async () => {
      const state = await fetchCart();
      setCartCount(state.totalItems || 0);
    };
    updateCount();

    window.addEventListener("cart-updated", updateCount);
    return () => window.removeEventListener("cart-updated", updateCount);
  }, []);

  // Listen for open-sell-modal custom event from mobile bottom navigation
  useEffect(() => {
    const handleOpenSell = () => {
      if (onOpenSell) {
        onOpenSell();
      } else {
        setIsSellOpen(true);
      }
    };
    window.addEventListener("open-sell-modal", handleOpenSell);
    return () => window.removeEventListener("open-sell-modal", handleOpenSell);
  }, [onOpenSell]);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const handleSellClick = () => {
    if (onOpenSell) {
      onOpenSell();
    } else {
      setIsSellOpen(true);
    }
  };

  return (
    <>
      <header className="bg-[#131921] px-3 py-2 text-white shadow-sm sm:px-5 lg:px-8">
        {/* ── Mobile Header Layout: ALL IN ONE SINGLE LINE (md:hidden) ── */}
        <div className="flex md:hidden items-center justify-between gap-1.5 w-full">
          {/* Left: Sidebar Menu Toggle & Logo Only */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onOpenSidebar}
              className="h-8.5 w-8.5 rounded-lg flex items-center justify-center text-white bg-white/10 hover:bg-white/20 active:scale-95 transition shrink-0"
              aria-label="Open navigation menu"
              title="Menu"
            >
              <Menu size={18} />
            </button>
            <div className="shrink-0 flex items-center">
              <Logo href={isLoggedIn ? "/home" : "/"} iconOnly />
            </div>
          </div>

          {/* Center: Searchbar taking remaining flexible space */}
          <div className="flex-1 min-w-0 mx-0.5">
            <Suspense fallback={<HeaderSearchFallback className="w-full h-8.5" />}>
              <HeaderSearchBar className="w-full h-8.5" />
            </Suspense>
          </div>

          {/* Right: Messages, Cart, Dark mode toggle - EXACT SAME SIZE (h-8.5 w-8.5) & NO Logout button (Moved to Sidebar) */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Messages button */}
            <Link
              href={isLoggedIn ? "/messages" : "/login?redirect=messages"}
              className="h-8.5 w-8.5 rounded-lg flex items-center justify-center text-white bg-white/10 hover:bg-white/20 active:scale-95 transition relative shrink-0"
              aria-label="Messages"
              title="Messages"
            >
              <MessageCircle size={17} />
            </Link>

            {/* Cart button */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="h-8.5 w-8.5 rounded-lg flex items-center justify-center text-white bg-white/10 hover:bg-white/20 active:scale-95 transition relative shrink-0"
              aria-label="Shopping Cart"
              title="Shopping Cart"
            >
              <ShoppingBag size={17} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#febd69] px-1 text-[10px] font-extrabold text-[#0f1111] shadow-sm">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Dark mode toggle */}
            <ThemeToggle
              className="h-8.5 w-8.5 rounded-lg flex items-center justify-center text-white bg-white/10 hover:bg-white/20 active:scale-95 transition shrink-0"
              size={17}
            />
          </div>
        </div>

        {/* ── Desktop Header Layout (hidden md:flex) - UNCHANGED ── */}
        <div className="hidden md:flex mx-auto max-w-[1500px] items-center justify-between gap-3">
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
            {/* Cart Icon button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="focus-ring relative inline-flex items-center gap-1 rounded-md p-1.5 hover:outline hover:outline-1 hover:outline-white/70 text-white transition"
              aria-label="Shopping Cart"
              title="Shopping Cart"
            >
              <ShoppingBag size={18} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#febd69] px-1 text-[10px] font-extrabold text-[#0f1111]">
                  {cartCount}
                </span>
              )}
            </button>

            {isLoggedIn ? (
              <>
                <button
                  onClick={handleSellClick}
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
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}

