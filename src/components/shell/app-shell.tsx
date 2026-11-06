"use client";

import { useState, Suspense } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/shell/app-header";
import { AppFooter } from "@/components/shell/app-footer";
import { MobileBottomNav } from "@/components/shell/mobile-bottom-nav";
import { MobileNavSidebar } from "@/components/shell/mobile-nav-sidebar";
import { navLinks, PUBLIC_NAV_LINKS } from "@/data/mock";
import { useAuth } from "@/lib/auth";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isLoggedIn } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#eaeded] dark:bg-brand-charcoal flex flex-col justify-between">
      {/* ── Permanent Sticky Header & Navigation Topbar ── */}
      <div className="sticky top-0 z-40 w-full shadow-md">
        <Suspense fallback={<div className="h-14 bg-[#131921]" />}>
          <AppHeader onOpenSidebar={() => setMobileSidebarOpen(true)} />
        </Suspense>

        {/* ── Topbar: DESKTOP ONLY (hidden md:block) - Options appear as Sidebar on mobile ── */}
        <nav
          aria-label="Main sub navigation"
          className="hidden md:block border-b border-[#37475a] bg-[#232f3e] px-2 py-1 text-sm text-white sm:px-5 lg:px-8"
        >
          <div className="mx-auto flex max-w-[1500px] items-center justify-between sm:justify-start gap-1 sm:gap-2">
            {!isLoggedIn ? (
              /* ── Logged-Out Desktop Topbar ── */
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
              /* ── Logged-In Desktop Topbar (Unchanged) ── */
              <div className="flex items-center gap-1.5 lg:gap-2 overflow-x-auto whitespace-nowrap scrollbar-none py-0.5 w-full">
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
            )}
          </div>
        </nav>
      </div>

      {/* ── Main Content Area ── */}
      <main className="flex-1 mx-auto max-w-[1500px] w-full px-2.5 pb-24 md:pb-10 pt-3 sm:px-5 sm:pt-4 lg:px-8">
        {children}
      </main>

      {/* ── Footer ── */}
      <AppFooter />

      {/* ── Mobile Navigation Sidebar (Topbar options for Mobile View) ── */}
      <MobileNavSidebar
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      {/* ── Mobile Bottom Navigation Bar ── */}
      <MobileBottomNav />
    </div>
  );
}

