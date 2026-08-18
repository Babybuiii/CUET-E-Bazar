"use client";

import { AppHeader } from "@/components/shell/app-header";
import Link from "next/link";
import { navLinks } from "@/data/mock";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#eaeded] dark:bg-brand-charcoal">
      <AppHeader />
      <div className="border-b border-[#37475a] bg-[#232f3e] px-4 py-2 text-sm text-white">
        <div className="mx-auto flex max-w-[1500px] items-center gap-5 overflow-x-auto whitespace-nowrap">
          {navLinks.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-sm px-2 py-1 hover:outline hover:outline-1 hover:outline-white/70">
              {item.name}
            </Link>
          ))}
        </div>
      </div>
      <main className="mx-auto max-w-[1500px] px-3 pb-10 pt-4 sm:px-5 lg:px-8">{children}</main>
    </div>
  );
}
