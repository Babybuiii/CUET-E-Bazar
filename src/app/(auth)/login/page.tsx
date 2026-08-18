"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/shared/logo";
import { API_BASE_URL } from "@/lib/api";

const roles = [
  { id: "student", label: "Student" },
  { id: "shop_owner", label: "Shop Owner" },
  { id: "admin", label: "Admin" }
] as const;

export default function LoginPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<string>("student");
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
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Invalid credentials.");
      }

      if (data.token) {
        localStorage.setItem("cuet_ebazar_token", data.token);
        localStorage.setItem("cuet_ebazar_user", JSON.stringify(data.user));
      }

      setSuccess("Logged in successfully! Redirecting...");
      setTimeout(() => {
        router.push("/home");
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
          <Logo href="/" />
          <h1 className="mt-6 font-display text-2xl sm:text-3xl font-bold">Welcome Back</h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            Sign in with your CUET email and credentials.
          </p>

          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {roles.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedRole(r.id)}
                className={`focus-ring rounded-lg px-2.5 py-2 text-xs font-semibold transition text-center ${
                  selectedRole === r.id
                    ? "bg-brand-emerald text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
                }`}
              >
                {r.label}
              </button>
            ))}
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

          <AnimatePresence mode="wait">
            <motion.form
              key={selectedRole}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              onSubmit={handleSubmit}
              className="mt-6 space-y-4"
            >
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                CUET Email *
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="u2204120@student.cuet.ac.bd"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-brand-emerald dark:border-slate-700 dark:bg-slate-900"
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
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-brand-emerald dark:border-slate-700 dark:bg-slate-900"
                  required
                />
              </label>

              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded" /> Remember Me
                </label>
                <Link href="#" className="text-brand-emerald font-semibold hover:underline">
                  Forgot Password?
                </Link>
              </div>

              <Button className="w-full" type="submit" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  `Login as ${roles.find((r) => r.id === selectedRole)?.label}`
                )}
              </Button>
            </motion.form>
          </AnimatePresence>

          <p className="mt-6 text-center text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            New here?{" "}
            <Link href="/signup" className="font-semibold text-brand-emerald hover:underline">
              Create an account
            </Link>
          </p>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="hidden lg:block">
        <div className="glass rounded-3xl p-8 space-y-6">
          <div>
            <p className="font-display text-2xl font-bold">Campus-safe trading starts here</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Verified exclusively for CUETians with official academic emails.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-white/80 p-4 shadow-sm dark:bg-slate-900/70">
              <p className="font-semibold text-sm">Verified Profiles</p>
              <p className="text-xs text-slate-500 mt-1">Student ID and hall verification built-in</p>
            </div>
            <div className="rounded-2xl bg-white/80 p-4 shadow-sm dark:bg-slate-900/70">
              <p className="font-semibold text-sm">Campus Shops</p>
              <p className="text-xs text-slate-500 mt-1">Shop analytics, inventory & direct orders</p>
            </div>
            <div className="rounded-2xl bg-white/80 p-4 shadow-sm dark:bg-slate-900/70">
              <p className="font-semibold text-sm">Giveaway Network</p>
              <p className="text-xs text-slate-500 mt-1">Donate books & supplies directly to peers</p>
            </div>
            <div className="rounded-2xl bg-white/80 p-4 shadow-sm dark:bg-slate-900/70">
              <p className="font-semibold text-sm">Instant Chat</p>
              <p className="text-xs text-slate-500 mt-1">Direct communication between buyers & sellers</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

