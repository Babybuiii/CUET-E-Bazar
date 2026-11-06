"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Loader2, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/shared/logo";
import { API_BASE_URL } from "@/lib/api";
import {
  auth,
  getFirebaseAuth,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  isFirebaseConfigured
} from "@/lib/firebase";

export default function ShopOwnerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError("Please enter your email above to receive a password reset link.");
      return;
    }
    setError(null);
    setSuccess(null);

    const activeAuth = auth || (typeof window !== "undefined" ? getFirebaseAuth() : null);

    if (!isFirebaseConfigured || !activeAuth) {
      setError(
        "Firebase is not loaded yet. If you recently updated .env.local, please restart your terminal with 'npm run dev' to load the keys."
      );
      return;
    }

    try {
      const cleanEmail = email.trim().toLowerCase();
      await sendPasswordResetEmail(activeAuth, cleanEmail);
      setSuccess(`Password reset email sent to ${cleanEmail}! Check your inbox.`);
    } catch (err: any) {
      console.error("Password reset error:", err);
      if (err.code === "auth/user-not-found") {
        setError(`No account with email "${email.trim()}" exists. Please register your shop first.`);
      } else if (err.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many reset requests. Please wait a few minutes.");
      } else {
        setError(err.message || "Failed to send password reset email.");
      }
    }
  };

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

      // ── Authenticate with Backend (shop_owner role enforced) ──
      const endpoint = firebaseUid ? `${API_BASE_URL}/api/auth/firebase-sync` : `${API_BASE_URL}/api/auth/login`;
      const body = firebaseUid
        ? { firebaseUid, email: normalizedEmail, role: "shop_owner" }
        : { email: normalizedEmail, password, role: "shop_owner" };

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

      setSuccess("Logged in successfully! Redirecting to your dashboard...");
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to log in.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid items-center gap-8 lg:grid-cols-2 py-4">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <Card className="glass p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <Logo href="/" />
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-100 dark:bg-amber-950/50 dark:text-amber-400 px-2.5 py-1 rounded-full">
              <Store size={13} /> Shop Owner Portal
            </span>
          </div>

          <h1 className="mt-6 font-display text-2xl sm:text-3xl font-bold">Shop Owner Login</h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            Sign in to manage your campus shop, products, and student orders.
          </p>

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
              Business / Owner Email *
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="shop@example.com"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900"
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
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900"
                required
              />
            </label>

            <div className="flex items-center justify-end text-xs">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-amber-600 font-semibold hover:underline bg-transparent border-none p-0 cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>

            <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white" type="submit" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Signing in...
                </span>
              ) : (
                "Login to Shop Dashboard"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            New campus shop?{" "}
            <Link href="/shop-portal/signup" className="font-semibold text-amber-600 hover:underline">
              Register your store
            </Link>
          </p>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="hidden lg:block">
        <div className="glass rounded-3xl p-8 space-y-6">
          <div>
            <p className="font-display text-2xl font-bold">Manage your campus business</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              List products, receive student orders, and grow your shop on CUET E-Bazar.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-white/80 p-4 shadow-sm dark:bg-slate-900/70">
              <p className="font-semibold text-sm">Product Management</p>
              <p className="text-xs text-slate-500 mt-1">List, update, and manage your inventory</p>
            </div>
            <div className="rounded-2xl bg-white/80 p-4 shadow-sm dark:bg-slate-900/70">
              <p className="font-semibold text-sm">Order Tracking</p>
              <p className="text-xs text-slate-500 mt-1">View and fulfill student orders</p>
            </div>
            <div className="rounded-2xl bg-white/80 p-4 shadow-sm dark:bg-slate-900/70">
              <p className="font-semibold text-sm">Direct Messaging</p>
              <p className="text-xs text-slate-500 mt-1">Chat with customers about orders</p>
            </div>
            <div className="rounded-2xl bg-white/80 p-4 shadow-sm dark:bg-slate-900/70">
              <p className="font-semibold text-sm">Shop Analytics</p>
              <p className="text-xs text-slate-500 mt-1">Track followers, sales, and ratings</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
