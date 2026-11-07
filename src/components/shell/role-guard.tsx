"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { SHOP_OWNER_BLOCKED_PATHS } from "@/data/mock";
import { useAuth } from "@/lib/auth";

/**
 * Keeps shop owners out of the student-only browsing pages
 * (Home, Marketplace, Giveaways, Wishlist) and sends them to their shop.
 */
export function RoleGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  const isShopOwner = user?.role === "shop_owner";
  const isBlocked = SHOP_OWNER_BLOCKED_PATHS.includes(pathname);
  const shouldRedirect = !loading && isShopOwner && isBlocked;

  useEffect(() => {
    if (shouldRedirect) {
      router.replace("/my-shop");
    }
  }, [shouldRedirect, router]);

  // Hold the page back on a blocked path until the role is known, otherwise a
  // shop owner briefly sees the student page before the redirect lands.
  if (isBlocked && (loading || shouldRedirect)) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-brand-emerald" size={28} />
        {shouldRedirect && (
          <p className="text-sm text-slate-500 dark:text-slate-400">Taking you to your shop...</p>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
