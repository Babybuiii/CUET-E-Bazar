"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { motion } from "framer-motion";
import { navLinks } from "@/data/mock";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/logo";

type AppSidebarProps = {
  open: boolean;
  onToggle: () => void;
};

export function AppSidebar({ open, onToggle }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    try {
      localStorage.removeItem("cuet_ebazar_token");
      localStorage.removeItem("cuet_ebazar_user");
    } catch {
      // ignore
    }
    router.push("/login");
  };

  return (
    <>
      <button
        className="focus-ring fixed left-4 top-4 z-40 rounded-lg border border-slate-200 bg-white p-2 lg:hidden"
        aria-label="Toggle navigation"
        onClick={onToggle}
      >
        <Menu size={18} />
      </button>
      <motion.aside
        animate={{ x: open ? 0 : -280 }}
        transition={{ type: "spring", stiffness: 280, damping: 26 }}
        className="fixed inset-y-0 left-0 z-30 w-72 border-r border-slate-200 bg-white/95 p-5 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95 lg:translate-x-0"
      >
        <div className="mb-8">
          <Logo />
        </div>
        <nav className="space-y-1">
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "focus-ring flex items-center rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-brand-emerald text-white"
                  : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              )}
            >
              {item.name}
            </Link>
          ))}
        </nav>
        <button
          onClick={handleLogout}
          className="focus-ring mt-8 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer"
        >
          <LogOut size={16} /> Logout
        </button>
      </motion.aside>
    </>
  );
}

