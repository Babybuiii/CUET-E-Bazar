"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Clock, Loader2, MapPin, Store, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/shared/logo";
import { API_BASE_URL } from "@/lib/api";
import {
  auth,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  isFirebaseConfigured
} from "@/lib/firebase";

const SHOP_CATEGORIES = [
  "General Store & Grocery",
  "Stationery & Photocopy",
  "Electronics & Accessories",
  "Food, Snacks & Cafeteria",
  "Clothing & Tailoring",
  "Books & Academic Resources",
  "Pharmacy & Personal Care",
  "Gadget Repair & Services",
  "Others"
];

export default function ShopOwnerSignupPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    contactNumber: "",
    shopName: "",
    shopCategory: SHOP_CATEGORIES[0],
    shopDescription: "",
    shopLocation: "CUET Central Cafeteria Area",
    openTime: "09:00",
    closeTime: "21:00",
    password: "",
    confirmPassword: ""
  });

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const validate = () => {
    if (!form.fullName.trim()) return "Owner full name is required";
    if (!form.shopName.trim()) return "Shop / Business name is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return "Please enter a valid email address";
    }
    if (!/^(\+?880|0)1[3-9]\d{8}$/.test(form.contactNumber.trim())) {
      return "Please enter a valid contact number (e.g. 01712345678)";
    }
    if (!form.shopLocation.trim()) return "Shop campus location is required";
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
            throw new Error("This email is already registered. Please log in.");
          } else if (fbErr.code === "auth/weak-password") {
            throw new Error("Password is too weak. Please use at least 6 characters.");
          } else if (fbErr.code === "auth/invalid-email") {
            throw new Error("Invalid email format.");
          } else {
            console.warn("Firebase Auth registration warning:", fbErr.message);
          }
        }
      }

      const payload = {
        role: "shop_owner",
        fullName: form.fullName.trim(),
        email,
        contactNumber: form.contactNumber.trim(),
        password: form.password,
        shopName: form.shopName.trim(),
        shopCategory: form.shopCategory,
        shopDescription: form.shopDescription.trim(),
        shopLocation: form.shopLocation.trim(),
        operatingHours: {
          open: form.openTime,
          close: form.closeTime
        },
        ...(firebaseUid ? { firebaseUid } : {})
      };

      const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Registration failed.");
      }

      if (data.token) {
        localStorage.setItem("cuet_ebazar_token", data.token);
        localStorage.setItem("cuet_ebazar_user", JSON.stringify(data.user));
        window.dispatchEvent(new Event("auth-changed"));
      }

      setSuccessMsg("Shop Owner account and store created successfully! Redirecting...");

      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to register.";
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
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-100 dark:bg-amber-950/50 dark:text-amber-400 px-2.5 py-1 rounded-full">
            <Store size={13} /> Shop Owner Portal
          </span>
        </div>

        <h1 className="mt-5 font-display text-2xl sm:text-3xl font-bold">Register Your Campus Shop</h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
          Set up your storefront on CUET E-Bazar, list products, and start receiving student orders.
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
          {/* Shop Details Section */}
          <div className="sm:col-span-2 rounded-xl bg-amber-50 p-3 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/40 flex items-center gap-2">
            <Store size={18} className="text-amber-600" />
            <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
              Campus Shop & Business Details
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Shop / Store Name *
              <input
                name="shopName"
                value={form.shopName}
                onChange={handleChange}
                placeholder="e.g. CUET Central Stationery & Print"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900"
                required
              />
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Shop Category *
              <select
                name="shopCategory"
                value={form.shopCategory}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900"
                required
              >
                {SHOP_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Shop Location on Campus *
              <div className="relative mt-1">
                <MapPin size={16} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  name="shopLocation"
                  value={form.shopLocation}
                  onChange={handleChange}
                  placeholder="e.g. Beside Central Cafeteria / Shahid Minar Gate"
                  className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3.5 py-2 text-sm outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900"
                  required
                />
              </div>
            </label>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Shop Description
              <textarea
                name="shopDescription"
                value={form.shopDescription}
                onChange={handleChange}
                rows={2}
                placeholder="Tell students about what your shop offers, specialty items, or photocopy/delivery service..."
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Opening Time (Daily)
              <div className="relative mt-1">
                <Clock size={16} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  name="openTime"
                  type="time"
                  value={form.openTime}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3.5 py-2 text-sm outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900"
                />
              </div>
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Closing Time (Daily)
              <div className="relative mt-1">
                <Clock size={16} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  name="closeTime"
                  type="time"
                  value={form.closeTime}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3.5 py-2 text-sm outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900"
                />
              </div>
            </label>
          </div>

          {/* Owner Credentials Section */}
          <div className="sm:col-span-2 mt-2 rounded-xl bg-amber-50 p-3 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/40 flex items-center gap-2">
            <UserCheck size={18} className="text-amber-600" />
            <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
              Owner Account Credentials
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Owner Full Name *
              <input
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                placeholder="e.g. Md. Rafiqul Islam"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900"
                required
              />
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Business / Owner Email *
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="shop@example.com"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900"
                required
              />
            </label>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Shop Hotline / WhatsApp Number *
              <input
                name="contactNumber"
                type="tel"
                value={form.contactNumber}
                onChange={handleChange}
                placeholder="01812345678"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900"
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
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900"
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
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900"
                required
              />
            </label>
          </div>

          <div className="sm:col-span-2 pt-3">
            <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white" type="submit" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Creating Shop & Account...
                </span>
              ) : (
                "Register Campus Shop"
              )}
            </Button>
          </div>
        </motion.form>

        <p className="mt-6 text-center text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Already registered?{" "}
          <Link href="/shop-portal/login" className="font-semibold text-amber-600 hover:underline">
            Log in to your shop dashboard
          </Link>
        </p>
      </Card>
    </div>
  );
}
