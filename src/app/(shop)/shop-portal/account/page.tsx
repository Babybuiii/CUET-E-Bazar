"use client";

import { useEffect, useState } from "react";
import { User, Mail, Phone, Shield, Store, LogOut } from "lucide-react";
import { Card } from "@/components/ui/card";
import { clearAuthSession } from "@/lib/auth";
import { useRouter } from "next/navigation";

type UserData = {
  _id: string;
  fullName: string;
  email: string;
  role: string;
  contactNumber?: string;
  avatarUrl?: string;
  createdAt?: string;
};

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_user") : null;
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
  }, []);

  const handleLogout = () => {
    clearAuthSession();
    router.push("/shop-portal/login");
  };

  return (
    <div className="space-y-5 max-w-xl mx-auto">
      <div>
        <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">My Account</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Your account information.</p>
      </div>

      <Card className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-brand-emerald/10 border border-brand-emerald/20 flex items-center justify-center">
            <Store size={24} className="text-brand-emerald" />
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-white">{user?.fullName || "Shop Owner"}</p>
            <span className="text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 px-2 py-0.5 rounded-full">
              Shop Owner
            </span>
          </div>
        </div>

        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
            <Mail size={15} className="text-slate-400 shrink-0" />
            {user?.email || "—"}
          </div>
          {user?.contactNumber && (
            <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
              <Phone size={15} className="text-slate-400 shrink-0" />
              {user.contactNumber}
            </div>
          )}
          <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
            <Shield size={15} className="text-slate-400 shrink-0" />
            Role: Shop Owner
          </div>
        </div>
      </Card>

      <Card>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 transition"
        >
          <LogOut size={16} /> Sign Out of Shop Portal
        </button>
      </Card>
    </div>
  );
}

