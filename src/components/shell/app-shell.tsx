"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/shell/app-header";
import { AppFooter } from "@/components/shell/app-footer";
import { getNavLinks, PUBLIC_NAV_LINKS } from "@/data/mock";
import { useAuth } from "@/lib/auth";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isLoggedIn, user } = useAuth();

  const navLinks = getNavLinks(user?.role);
  const links = isLoggedIn ? navLinks : PUBLIC_NAV_LINKS;

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/home") return pathname === "/home" || pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div className="min-h-screen bg-[#eaeded] dark:bg-brand-charcoal">
      {/* ── Permanent Sticky Header & Navigation Topbar ── */}
      <div className="sticky top-0 z-40 w-full shadow-md">
        <Suspense fallback={<div className="h-14 bg-[#131921]" />}>
          <AppHeader />
        </Suspense>
        <nav
          aria-label="Main sub navigation"
          className="border-b border-[#37475a] bg-[#232f3e] px-2 py-1 text-sm text-white sm:px-5 lg:px-8"
        >
          {/* One row at every size - it scrolls horizontally when it overflows */}
          <div className="mx-auto flex max-w-[1500px] items-center gap-1.5 overflow-x-auto whitespace-nowrap py-0.5 scrollbar-none sm:gap-2">
            {links.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1 text-xs transition-all duration-150 sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-sm ${
                    active
                      ? "bg-brand-emerald font-bold text-white shadow-sm ring-1 ring-emerald-400/50"
                      : "font-medium text-slate-200 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {active && (
                    <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-emerald-300 shadow-sm" />
                  )}
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      <main className="mx-auto max-w-[1500px] px-2.5 pb-10 pt-3 sm:px-5 sm:pt-4 lg:px-8">{children}</main>
      <AppFooter />
    </div>
  );
}
