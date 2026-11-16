"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/shared/logo";
import { API_BASE_URL } from "@/lib/api";
import {
  auth,
  signInWithEmailAndPassword,
  isFirebaseConfigured
} from "@/lib/firebase";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      let firebaseUid: string | undefined = undefined;

      if (isFirebaseConfigured && auth) {
        try {
          const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
          firebaseUid = userCredential.user.uid;
        } catch (fbErr: any) {
          if (fbErr.code === "auth/invalid-credential" || fbErr.code === "auth/wrong-password" || fbErr.code === "auth/user-not-found") {
            console.log("Firebase credentials check:", fbErr.message);
          } else {
            console.warn("Firebase sign in notice:", fbErr.message);
          }
        }
      }

      // ── Authenticate with Backend (admin role enforced) ──
      const endpoint = firebaseUid ? `${API_BASE_URL}/api/auth/firebase-sync` : `${API_BASE_URL}/api/auth/login`;
      const body = firebaseUid
        ? { firebaseUid, email: normalizedEmail, role: "admin" }
        : { email: normalizedEmail, password, role: "admin" };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Invalid credentials.");
      }

      if (data.token) {
        localStorage.setItem("cuet_ebazar_token", data.token);
        localStorage.setItem("cuet_ebazar_user", JSON.stringify(data.user));
        window.dispatchEvent(new Event("auth-changed"));
      }

      setSuccess("Admin authenticated. Redirecting to admin panel...");
      setTimeout(() => {
        router.push("/admin");
        router.refresh();
      }, 400);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to log in.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh] py-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Card className="glass p-6 sm:p-8 border-red-500/20">
          <div className="flex items-center justify-between">
            <Logo
              href="/"
              portalBadge={
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-100 dark:bg-red-950/50 dark:text-red-400 px-2.5 py-0.5 rounded-full whitespace-nowrap shrink-0 border border-red-500/20">
                  <Shield size={11} /> Admin Portal
                </span>
              }
            />
          </div>

          <h1 className="mt-6 font-display text-2xl sm:text-3xl font-bold">Admin Login</h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            Authorized administrators only. This portal is for CUET E-Bazar system management.
          </p>

          <div className="mt-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 p-3 text-xs text-red-700 dark:text-red-400">
            <strong>Restricted Access:</strong> Admin accounts are pre-created by the system. If you need admin access, contact the development team.
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs sm:text-sm text-rose-600 dark:text-rose-400">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={18} className="shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Admin Email *
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@cuet-ebazar.com"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-red-500 dark:border-slate-700 dark:bg-slate-900"
                required
              />
            </label>

            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Password *
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-red-500 dark:border-slate-700 dark:bg-slate-900"
                required
              />
            </label>

            <Button className="w-full bg-red-600 hover:bg-red-700 text-white" type="submit" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Authenticating...
                </span>
              ) : (
                "Login to Admin Panel"
              )}
            </Button>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
