"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/shared/logo";
import { CUET_DEPARTMENTS, CUET_HALLS } from "@/data/mock";
import { API_BASE_URL } from "@/lib/api";
import {
  auth,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  isFirebaseConfigured
} from "@/lib/firebase";

export default function SignupPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    fullName: "",
    studentId: "",
    email: "",
    department: CUET_DEPARTMENTS[0] as string,
    hall: CUET_HALLS[0] as string,
    contactNumber: "",
    password: "",
    confirmPassword: ""
  });

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const validate = () => {
    if (!form.fullName.trim()) return "Full name is required";
    if (!/^\d{7}$/.test(form.studentId.trim())) {
      return "Student ID must be exactly 7 digits (e.g. 2204120)";
    }
    if (!/^[^\s@]+@[^\s@]*cuet\.ac\.bd$/i.test(form.email.trim())) {
      return "Must be a valid CUET email ending with .cuet.ac.bd";
    }
    if (!/^(\+?880|0)1[3-9]\d{8}$/.test(form.contactNumber.trim())) {
      return "Please enter a valid Bangladeshi contact number (e.g. 01712345678)";
    }
    if (form.password.length < 6) {
      return "Password must be at least 6 characters long";
    }
    if (form.password !== form.confirmPassword) {
      return "Passwords do not match";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationErr = validate();
    if (validationErr) {
      setError(validationErr);
      return;
    }

    setLoading(true);

    try {
      const email = form.email.trim().toLowerCase();
      let firebaseUid: string | undefined = undefined;

      // ── Optional Firebase Email Auth step if configured ──
      if (isFirebaseConfigured && auth) {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, form.password);
          firebaseUid = userCredential.user.uid;
          try {
            await sendEmailVerification(userCredential.user);
          } catch (vErr) {
            console.warn("Could not send Firebase verification email:", vErr);
          }
        } catch (fbErr: any) {
          if (fbErr.code === "auth/email-already-in-use") {
            throw new Error("This email is already registered in Firebase. Please log in.");
          } else if (fbErr.code === "auth/weak-password") {
            throw new Error("Password is too weak. Please use at least 6 characters.");
          } else if (fbErr.code === "auth/invalid-email") {
            throw new Error("Invalid email format for Firebase authentication.");
          } else {
            console.warn("Firebase Auth registration warning:", fbErr.message);
          }
        }
      }

      const payload = {
        role: "student",
        fullName: form.fullName.trim(),
        studentId: form.studentId.trim(),
        email,
        department: form.department,
        hall: form.hall,
        contactNumber: form.contactNumber.trim(),
        password: form.password,
        ...(firebaseUid ? { firebaseUid } : {})
      };

      const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Registration failed. Please check your details.");
      }

      if (data.token) {
        localStorage.setItem("cuet_ebazar_token", data.token);
        localStorage.setItem("cuet_ebazar_user", JSON.stringify(data.user));
        window.dispatchEvent(new Event("auth-changed"));
      }

      setSuccessMsg(
        isFirebaseConfigured
          ? "Account created & Firebase verification email sent! Check your inbox."
          : "Account created successfully! Redirecting to marketplace..."
      );

      setTimeout(() => {
        router.push("/home");
      }, 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to connect to registration server.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl py-4">
      <Card className="p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <Logo href="/" />
          <span className="text-xs font-semibold text-brand-emerald bg-brand-emerald/10 px-2.5 py-1 rounded-full">
            CUET Official E-Bazar
          </span>
        </div>

        <h1 className="mt-5 font-display text-2xl sm:text-3xl font-bold">Student Registration</h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
          Join as a CUET student with your academic credentials to buy, sell, and participate in giveaways.
        </p>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs sm:text-sm text-rose-600 dark:text-rose-400">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={18} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="mt-6 grid gap-4 sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Full Name *
              <input
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                placeholder="e.g. Sadman Sakib"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-brand-emerald dark:border-slate-700 dark:bg-slate-900"
                required
              />
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Student ID * <span className="text-slate-400 font-normal">(7 digits, e.g. 2204120)</span>
              <input
                name="studentId"
                value={form.studentId}
                onChange={handleChange}
                placeholder="2204120"
                maxLength={7}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-brand-emerald dark:border-slate-700 dark:bg-slate-900"
                required
              />
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              CUET Email * <span className="text-slate-400 font-normal">(*.cuet.ac.bd)</span>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="u2204120@student.cuet.ac.bd"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-brand-emerald dark:border-slate-700 dark:bg-slate-900"
                required
              />
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Department *
              <select
                name="department"
                value={form.department}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-emerald dark:border-slate-700 dark:bg-slate-900"
                required
              >
                {CUET_DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Hall of Residence *
              <select
                name="hall"
                value={form.hall}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-emerald dark:border-slate-700 dark:bg-slate-900"
                required
              >
                {CUET_HALLS.map((hall) => (
                  <option key={hall} value={hall}>
                    {hall}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Contact / WhatsApp Number *
              <input
                name="contactNumber"
                type="tel"
                value={form.contactNumber}
                onChange={handleChange}
                placeholder="01712345678"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-brand-emerald dark:border-slate-700 dark:bg-slate-900"
                required
              />
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Password *
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-brand-emerald dark:border-slate-700 dark:bg-slate-900"
                required
              />
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Confirm Password *
              <input
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-brand-emerald dark:border-slate-700 dark:bg-slate-900"
                required
              />
            </label>
          </div>

          <div className="sm:col-span-2 pt-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Creating Account...
                </span>
              ) : (
                "Create Student Account"
              )}
            </Button>
          </div>
        </motion.form>

        <p className="mt-6 text-center text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-brand-emerald hover:underline">
            Log in here
          </Link>
        </p>
      </Card>
    </div>
  );
}
