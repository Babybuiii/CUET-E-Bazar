"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { AppHeader } from "@/components/shell/app-header";
import { AppFooter } from "@/components/shell/app-footer";
import { navLinks, PUBLIC_NAV_LINKS } from "@/data/mock";
import { useAuth } from "@/lib/auth";

// Primary links shown directly on mobile for logged-in users
const PRIMARY_MOBILE_COUNT = 4;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isLoggedIn } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on route change or clicking outside
  useEffect(() => {
    setDropdownOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const primaryMobileLinks = navLinks.slice(0, PRIMARY_MOBILE_COUNT);
  const overflowMobileLinks = navLinks.slice(PRIMARY_MOBILE_COUNT);

  const isOverflowActive = overflowMobileLinks.some((item) =>
    item.href === "/home"
      ? pathname === "/home" || pathname === "/"
      : pathname === item.href || pathname.startsWith(`${item.href}/`)
  );

  return (
    <div className="min-h-screen bg-[#eaeded] dark:bg-brand-charcoal">
      {/* ── Permanent Sticky Header & Navigation Topbar ── */}
      <div className="sticky top-0 z-40 w-full shadow-md">
        <AppHeader />
        <nav
          aria-label="Main sub navigation"
          className="border-b border-[#37475a] bg-[#232f3e] px-2 py-1 text-sm text-white sm:px-5 lg:px-8"
        >
          <div className="mx-auto flex max-w-[1500px] items-center justify-between sm:justify-start gap-1 sm:gap-2">
            {!isLoggedIn ? (
              /* ── Logged-Out Topbar: EXACTLY 4 options (Home, Marketplace, Giveaways, Campus Shops), nothing else ── */
              <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto whitespace-nowrap scrollbar-none py-0.5 w-full">
                {PUBLIC_NAV_LINKS.map((item) => {
                  const isActive =
                    item.href === "/"
                      ? pathname === "/"
                      : item.href === "/home"
                      ? pathname === "/home" || pathname === "/"
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`rounded-md px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm transition-all duration-150 flex items-center gap-1 sm:gap-1.5 shrink-0 ${
                        isActive
                          ? "bg-brand-emerald text-white font-bold shadow-sm ring-1 ring-emerald-400/50"
                          : "text-slate-200 hover:text-white hover:bg-white/10 font-medium"
                      }`}
                    >
                      {isActive && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-sm shrink-0 animate-pulse" />
                      )}
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              /* ── Logged-In Topbar: Full options with mobile 'More' dropdown ── */
              <>
                {/* Mobile Layout (md:hidden): Primary links + 'More' dropdown at the end */}
                <div className="flex md:hidden items-center justify-between w-full gap-1">
                  <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
                    {primaryMobileLinks.map((item) => {
                      const isActive =
                        item.href === "/home"
                          ? pathname === "/home" || pathname === "/"
                          : pathname === item.href || pathname.startsWith(`${item.href}/`);

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`rounded-md px-2.5 py-1 text-xs transition-all duration-150 flex items-center gap-1 shrink-0 ${
                            isActive
                              ? "bg-brand-emerald text-white font-bold shadow-sm ring-1 ring-emerald-400/50"
                              : "text-slate-200 hover:text-white hover:bg-white/10 font-medium"
                          }`}
                        >
                          {isActive && (
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-sm shrink-0 animate-pulse" />
                          )}
                          <span>{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>

                  {/* Mobile 'More' Dropdown Button */}
                  <div className="relative shrink-0" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => setDropdownOpen((prev) => !prev)}
                      className={`rounded-md px-2.5 py-1 text-xs transition-all duration-150 flex items-center gap-1 shrink-0 ${
                        isOverflowActive || dropdownOpen
                          ? "bg-brand-emerald text-white font-bold shadow-sm ring-1 ring-emerald-400/50"
                          : "text-slate-200 hover:text-white hover:bg-white/10 font-medium"
                      }`}
                      aria-label="More navigation pages"
                      aria-expanded={dropdownOpen}
                    >
                      <span>More</span>
                      <ChevronDown
                        size={13}
                        className={`transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    {/* Dropdown Menu */}
                    {dropdownOpen && (
                      <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl bg-[#232f3e] border border-slate-700 shadow-xl py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                        {overflowMobileLinks.map((item) => {
                          const isActive =
                            item.href === "/home"
                              ? pathname === "/home" || pathname === "/"
                              : pathname === item.href || pathname.startsWith(`${item.href}/`);

                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              className={`flex items-center justify-between px-3.5 py-2 text-xs transition ${
                                isActive
                                  ? "bg-brand-emerald text-white font-bold"
                                  : "text-slate-200 hover:bg-white/10 hover:text-white"
                              }`}
                            >
                              <span>{item.name}</span>
                              {isActive && (
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-sm shrink-0" />
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Desktop Layout (hidden md:flex): All links visible in a single clean row */}
                <div className="hidden md:flex items-center gap-1.5 lg:gap-2 overflow-x-auto whitespace-nowrap scrollbar-none py-0.5 w-full">
                  {navLinks.map((item) => {
                    const isActive =
                      item.href === "/home"
                        ? pathname === "/home" || pathname === "/"
                        : pathname === item.href || pathname.startsWith(`${item.href}/`);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`rounded-md px-3 py-1.5 text-xs sm:text-sm transition-all duration-150 flex items-center gap-1.5 shrink-0 ${
                          isActive
                            ? "bg-brand-emerald text-white font-bold shadow-sm ring-1 ring-emerald-400/50"
                            : "text-slate-200 hover:text-white hover:bg-white/10 font-medium"
                        }`}
                      >
                        {isActive && (
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-sm shrink-0 animate-pulse" />
                        )}
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </nav>
      </div>

      <main className="mx-auto max-w-[1500px] px-2.5 pb-10 pt-3 sm:px-5 sm:pt-4 lg:px-8">{children}</main>
      <AppFooter />
    </div>
  );
}

