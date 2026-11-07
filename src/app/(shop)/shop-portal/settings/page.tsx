"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function ShopSettingsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/shop-portal/my-shop");
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Loader2 size={28} className="animate-spin text-brand-emerald mb-2" />
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Redirecting to My Shop...
      </p>
    </div>
  );
}
