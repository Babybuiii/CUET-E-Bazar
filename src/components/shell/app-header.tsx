"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Bell, LogOut, LogIn, Menu, MessageCircle, PlusCircle, Search, ShoppingBag, X } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { SellModal } from "@/components/marketplace/sell-modal";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { fetchCart } from "@/lib/cart";
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

type AppHeaderProps = {
  onOpenSidebar?: () => void;
  onOpenSell?: () => void;
};

export function AppHeader({ onOpenSidebar, onOpenSell }: AppHeaderProps = {}) {
  const [isSellOpen, setIsSellOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const router = useRouter();
  const { isLoggedIn, logout } = useAuth();

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
        {/* ── Mobile Header Layout (md:hidden) ── */}
        <div className="flex flex-col gap-2 md:hidden">
          {/* Top Row: Logo & Action Buttons (All exactly same h-9 w-9 size) */}
          <div className="flex items-center justify-between gap-1.5">
            {/* Left: Sidebar Menu Toggle & Logo Only */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenSidebar}
                className="h-9 w-9 rounded-lg flex items-center justify-center text-white bg-white/10 hover:bg-white/20 active:scale-95 transition shrink-0"
                aria-label="Open navigation menu"
                title="Menu"
              >
                <Menu size={19} />
              </button>
              <div className="shrink-0 flex items-center">
                <Logo href={isLoggedIn ? "/home" : "/"} iconOnly />
              </div>
            </div>

            {/* Right: Messages, Cart, Dark mode toggle, Logout - ALL SAME SIZE */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Messages button */}
              <Link
                href={isLoggedIn ? "/messages" : "/login?redirect=messages"}
                className="h-9 w-9 rounded-lg flex items-center justify-center text-white bg-white/10 hover:bg-white/20 active:scale-95 transition relative shrink-0"
                aria-label="Messages"
                title="Messages"
              >
                <MessageCircle size={18} />
              </Link>

              {/* Cart button */}
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="h-9 w-9 rounded-lg flex items-center justify-center text-white bg-white/10 hover:bg-white/20 active:scale-95 transition relative shrink-0"
                aria-label="Shopping Cart"
                title="Shopping Cart"
              >
                <ShoppingBag size={18} />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#febd69] px-1 text-[10px] font-extrabold text-[#0f1111] shadow-sm">
                    {cartCount}
                  </span>
                )}
              </button>

              {/* Dark mode toggle */}
              <ThemeToggle
                className="h-9 w-9 rounded-lg flex items-center justify-center text-white bg-white/10 hover:bg-white/20 active:scale-95 transition shrink-0"
                size={18}
              />

              {/* Logout / Login button */}
              {isLoggedIn ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="h-9 w-9 rounded-lg flex items-center justify-center text-rose-300 bg-rose-500/15 border border-rose-500/30 hover:bg-rose-600 hover:text-white active:scale-95 transition shrink-0"
                  title="Logout"
                  aria-label="Logout"
                >
                  <LogOut size={16} />
                </button>
              ) : (
                <Link
                  href="/login"
                  className="h-9 w-9 rounded-lg flex items-center justify-center text-white bg-brand-emerald hover:bg-[#0d665f] active:scale-95 transition shrink-0 shadow-sm"
                  title="Sign In"
                  aria-label="Sign In"
                >
                  <LogIn size={16} />
                </Link>
              )}
            </div>
          </div>

          {/* Bottom Row: Searchbar spanning full width on Mobile */}
          <Suspense fallback={<HeaderSearchFallback />}>
            <HeaderSearchBar />
          </Suspense>
        </div>

        {/* ── Desktop Header Layout (hidden md:flex) - UNCHANGED ── */}
        <div className="hidden md:flex mx-auto max-w-[1500px] items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-sm px-2 py-1 hover:outline hover:outline-1 hover:outline-white/70 shrink-0">
              <Logo href={isLoggedIn ? "/home" : "/"} />
            </div>
          </div>

          <Suspense fallback={<HeaderSearchFallback />}>
            <HeaderSearchBar />
          </Suspense>

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

                <button className="focus-ring hidden md:inline-flex rounded-sm p-1.5 hover:outline hover:outline-1 hover:outline-white/70" aria-label="Notifications">
                  <Bell size={17} />
                </button>
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

