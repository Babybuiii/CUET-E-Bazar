"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Loader2, Store, GraduationCap } from "lucide-react";
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

function UnifiedLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect");

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
        "Password reset is available once Firebase Authentication is loaded."
      );
      return;
    }

    try {
      const cleanEmail = email.trim().toLowerCase();
      await sendPasswordResetEmail(activeAuth, cleanEmail);
      setSuccess(
        `Password reset email sent to ${cleanEmail}! Please check your Inbox and Spam folders.`
      );
    } catch (err: any) {
      console.error("Password reset error:", err);
      if (err.code === "auth/user-not-found") {
        setError(`No account with email "${email.trim()}" exists in authentication records.`);
      } else if (err.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many reset requests sent. Please wait a few minutes.");
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

      // ── Optional Firebase Email Sign In ──
      if (isFirebaseConfigured && auth) {
        try {
          const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
          firebaseUid = userCredential.user.uid;
        } catch (fbErr: any) {
          if (
            fbErr.code === "auth/invalid-credential" ||
            fbErr.code === "auth/wrong-password" ||
            fbErr.code === "auth/user-not-found"
          ) {
            console.log("Firebase credentials check:", fbErr.message);
          } else {
            console.warn("Firebase sign in notice:", fbErr.message);
          }
        }
      }

      // ── Unified Authentication with Backend (Student & Shop Owner) ──
      const endpoint = firebaseUid ? `${API_BASE_URL}/api/auth/firebase-sync` : `${API_BASE_URL}/api/auth/login`;
      const body = firebaseUid
        ? { firebaseUid, email: normalizedEmail }
        : { email: normalizedEmail, password };

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

      setSuccess("Logged in successfully! Redirecting...");
      setTimeout(() => {
        if (data.user?.role === "shop_owner") {
          router.push("/shop-portal/dashboard");
        } else if (redirectTarget) {
          router.push(redirectTarget.startsWith("/") ? redirectTarget : `/${redirectTarget}`);
        } else {
          router.push("/");
        }
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
    <div className="grid items-center gap-8 lg:grid-cols-2 py-4">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <Card className="p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <Logo href="/" />
          <h1 className="mt-6 font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Sign In
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Unified login for CUET students and campus shop owners.
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
              Email Address *
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="u2204120@student.cuet.ac.bd or shop email"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-emerald dark:border-slate-700 dark:bg-slate-800 dark:text-white"
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
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-emerald dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                required
              />
            </label>

            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded" /> Remember Me
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-brand-emerald font-semibold hover:underline bg-transparent border-none p-0 cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>

            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          {/* Account Creation Options */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center space-y-2">
            <p className="text-xs text-slate-500">Don&apos;t have an account yet?</p>
            <div className="flex items-center justify-center gap-4 text-xs font-semibold">
              <Link
                href="/signup"
                className="inline-flex items-center gap-1.5 text-brand-emerald hover:underline"
              >
                <GraduationCap size={14} /> Student Sign Up
              </Link>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <Link
                href="/shop-portal/signup"
                className="inline-flex items-center gap-1.5 text-brand-emerald hover:underline"
              >
                <Store size={14} /> Register Shop
              </Link>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Right Column Context */}
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="hidden lg:block">
        <div className="rounded-3xl p-8 space-y-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div>
            <p className="font-display text-2xl font-bold text-slate-900 dark:text-white">
              Campus Trading & Free Giveaways
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Verified campus exchange for students, faculty, and authorized campus vendors.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div>
              <p className="font-semibold text-sm text-slate-900 dark:text-white">Student Peer Market</p>
              <p className="text-xs text-slate-500 mt-1">Buy and sell drawing kits, textbooks, gadgets, and cycles.</p>
            </div>
            <div>
              <p className="font-semibold text-sm text-slate-900 dark:text-white">Campus Stores</p>
              <p className="text-xs text-slate-500 mt-1">Direct online orders from registered CUET shops.</p>
            </div>
            <div>
              <p className="font-semibold text-sm text-slate-900 dark:text-white">Free Giveaways</p>
              <p className="text-xs text-slate-500 mt-1">100% free community sharing network for fellow students.</p>
            </div>
            <div>
              <p className="font-semibold text-sm text-slate-900 dark:text-white">Direct Chat & Alerts</p>
              <p className="text-xs text-slate-500 mt-1">Real-time device notifications for orders and chats.</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function UnifiedLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="animate-spin text-brand-emerald" size={32} />
        </div>
      }
    >
      <UnifiedLoginContent />
    </Suspense>
  );
}
