"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle2, Clock, Loader2, MapPin, Sparkles, Store, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/shared/logo";
import { CUET_DEPARTMENTS, CUET_HALLS } from "@/data/mock";
import { API_BASE_URL } from "@/lib/api";

type RoleOption = "student" | "shop_owner";

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

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<RoleOption>("student");

  // Student specific form state
  const [studentForm, setStudentForm] = useState({
    fullName: "",
    studentId: "",
    email: "",
    department: CUET_DEPARTMENTS[0] as string,
    hall: CUET_HALLS[0] as string,
    contactNumber: "",
    password: "",
    confirmPassword: ""
  });

  // Shop Owner specific form state (based on Shop.js & User.js)
  const [shopForm, setShopForm] = useState({
    fullName: "", // Owner's name
    email: "", // Business or personal contact email
    contactNumber: "", // Phone / WhatsApp
    shopName: "", // Shop name (unique)
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

  const progress = useMemo(() => (step / 2) * 100, [step]);

  const handleStudentChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setStudentForm((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleShopChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setShopForm((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const validateStudentForm = () => {
    if (!studentForm.fullName.trim()) return "Full name is required";
    if (!/^\d{7}$/.test(studentForm.studentId.trim())) {
      return "Student ID must be exactly 7 digits (e.g. 2204120)";
    }
    if (!/^[^\s@]+@[^\s@]*cuet\.ac\.bd$/i.test(studentForm.email.trim())) {
      return "Must be a valid CUET email ending with .cuet.ac.bd";
    }
    if (!/^(\+?880|0)1[3-9]\d{8}$/.test(studentForm.contactNumber.trim())) {
      return "Please enter a valid Bangladeshi contact number (e.g. 01712345678)";
    }
    if (studentForm.password.length < 6) {
      return "Password must be at least 6 characters long";
    }
    if (studentForm.password !== studentForm.confirmPassword) {
      return "Passwords do not match";
    }
    return null;
  };

  const validateShopForm = () => {
    if (!shopForm.fullName.trim()) return "Owner full name is required";
    if (!shopForm.shopName.trim()) return "Shop / Business name is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shopForm.email.trim())) {
      return "Please enter a valid email address";
    }
    if (!/^(\+?880|0)1[3-9]\d{8}$/.test(shopForm.contactNumber.trim())) {
      return "Please enter a valid contact number (e.g. 01712345678)";
    }
    if (!shopForm.shopLocation.trim()) return "Shop campus location is required";
    if (shopForm.password.length < 6) {
      return "Password must be at least 6 characters long";
    }
    if (shopForm.password !== shopForm.confirmPassword) {
      return "Passwords do not match";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationErr = role === "student" ? validateStudentForm() : validateShopForm();
    if (validationErr) {
      setError(validationErr);
      return;
    }

    setLoading(true);

    try {
      const payload =
        role === "student"
          ? {
              role: "student",
              fullName: studentForm.fullName.trim(),
              studentId: studentForm.studentId.trim(),
              email: studentForm.email.trim().toLowerCase(),
              department: studentForm.department,
              hall: studentForm.hall,
              contactNumber: studentForm.contactNumber.trim(),
              password: studentForm.password
            }
          : {
              role: "shop_owner",
              fullName: shopForm.fullName.trim(),
              email: shopForm.email.trim().toLowerCase(),
              contactNumber: shopForm.contactNumber.trim(),
              password: shopForm.password,
              shopName: shopForm.shopName.trim(),
              shopCategory: shopForm.shopCategory,
              shopDescription: shopForm.shopDescription.trim(),
              shopLocation: shopForm.shopLocation.trim(),
              operatingHours: {
                open: shopForm.openTime,
                close: shopForm.closeTime
              }
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
      }

      setSuccessMsg(
        role === "shop_owner"
          ? "Shop Owner account and shop profile created successfully! Redirecting..."
          : "Account created successfully! Redirecting to marketplace..."
      );

      setTimeout(() => {
        router.push(role === "shop_owner" ? "/dashboard" : "/home");
      }, 1200);
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

        <h1 className="mt-5 font-display text-2xl sm:text-3xl font-bold">
          {step === 1
            ? "Create your Account"
            : role === "student"
            ? "Student Registration"
            : "Shop Owner & Store Registration"}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
          {step === 1
            ? "Choose your account type to proceed with tailored credentials."
            : role === "student"
            ? "Join as a CUET student with your academic credentials to buy, sell, and participate in giveaways."
            : "Register your campus business, establish your storefront, and manage products on CUET E-Bazar."}
        </p>

        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <motion.div className="h-full bg-brand-emerald" animate={{ width: `${progress}%` }} />
        </div>

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

        {step === 1 ? (
          <div className="mt-6 space-y-4">
            <div>
              <p className="text-sm font-semibold">Step 1: Choose account type</p>
              <p className="text-xs text-slate-500">Select whether you are registering as an individual student or an official shop.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setRole("student")}
                className={`focus-ring rounded-2xl border p-4 text-left transition ${
                  role === "student"
                    ? "border-brand-emerald bg-brand-emerald/10 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck size={18} className="text-brand-emerald" />
                    <p className="font-semibold text-sm">CUET Student</p>
                  </div>
                  {role === "student" && <Sparkles size={14} className="text-brand-emerald" />}
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Requires 7-digit Student ID & CUET academic email. Buy & sell personal items, list giveaways.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setRole("shop_owner")}
                className={`focus-ring rounded-2xl border p-4 text-left transition ${
                  role === "shop_owner"
                    ? "border-brand-emerald bg-brand-emerald/10 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Store size={18} className="text-brand-emerald" />
                    <p className="font-semibold text-sm">Campus Shop Owner</p>
                  </div>
                  {role === "shop_owner" && <Sparkles size={14} className="text-brand-emerald" />}
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Requires store details, location, category & operating hours. Manage inventory, stock, and orders.
                </p>
              </button>
            </div>

            <div className="pt-2">
              <Button onClick={() => setStep(2)} className="w-full sm:w-auto">
                Continue to Details
              </Button>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.form
              key={role}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onSubmit={handleSubmit}
              className="mt-6 grid gap-4 sm:grid-cols-2"
            >
              {/* ========================================================================= */}
              {/* STUDENT FORM FIELDS                                                      */}
              {/* ========================================================================= */}
              {role === "student" ? (
                <>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Full Name *
                      <input
                        name="fullName"
                        value={studentForm.fullName}
                        onChange={handleStudentChange}
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
                        value={studentForm.studentId}
                        onChange={handleStudentChange}
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
                        value={studentForm.email}
                        onChange={handleStudentChange}
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
                        value={studentForm.department}
                        onChange={handleStudentChange}
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
                        value={studentForm.hall}
                        onChange={handleStudentChange}
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
                        value={studentForm.contactNumber}
                        onChange={handleStudentChange}
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
                        value={studentForm.password}
                        onChange={handleStudentChange}
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
                        value={studentForm.confirmPassword}
                        onChange={handleStudentChange}
                        placeholder="••••••••"
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-brand-emerald dark:border-slate-700 dark:bg-slate-900"
                        required
                      />
                    </label>
                  </div>
                </>
              ) : (
                /* ========================================================================= */
                /* SHOP OWNER FORM FIELDS (From Shop.js & User.js)                           */
                /* ========================================================================= */
                <>
                  {/* Shop Details Header */}
                  <div className="sm:col-span-2 rounded-xl bg-slate-50 p-3 border border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 flex items-center gap-2">
                    <Store size={18} className="text-brand-emerald" />
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Campus Shop & Business Details
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Shop / Store Name *
                      <input
                        name="shopName"
                        value={shopForm.shopName}
                        onChange={handleShopChange}
                        placeholder="e.g. CUET Central Stationery & Print"
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-brand-emerald dark:border-slate-700 dark:bg-slate-900"
                        required
                      />
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Shop Category *
                      <select
                        name="shopCategory"
                        value={shopForm.shopCategory}
                        onChange={handleShopChange}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-emerald dark:border-slate-700 dark:bg-slate-900"
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
                          value={shopForm.shopLocation}
                          onChange={handleShopChange}
                          placeholder="e.g. Beside Central Cafeteria / Shahid Minar Gate"
                          className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3.5 py-2 text-sm outline-none focus:border-brand-emerald dark:border-slate-700 dark:bg-slate-900"
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
                        value={shopForm.shopDescription}
                        onChange={handleShopChange}
                        rows={2}
                        placeholder="Tell students about what your shop offers, specialty items, or photocopy/delivery service..."
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-brand-emerald dark:border-slate-700 dark:bg-slate-900"
                      />
                    </label>
                  </div>

                  {/* Operating Hours */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Opening Time (Daily)
                      <div className="relative mt-1">
                        <Clock size={16} className="absolute left-3 top-2.5 text-slate-400" />
                        <input
                          name="openTime"
                          type="time"
                          value={shopForm.openTime}
                          onChange={handleShopChange}
                          className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3.5 py-2 text-sm outline-none focus:border-brand-emerald dark:border-slate-700 dark:bg-slate-900"
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
                          value={shopForm.closeTime}
                          onChange={handleShopChange}
                          className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3.5 py-2 text-sm outline-none focus:border-brand-emerald dark:border-slate-700 dark:bg-slate-900"
                        />
                      </div>
                    </label>
                  </div>

                  {/* Owner Credentials Header */}
                  <div className="sm:col-span-2 mt-2 rounded-xl bg-slate-50 p-3 border border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 flex items-center gap-2">
                    <UserCheck size={18} className="text-brand-emerald" />
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Owner Account Credentials
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Owner Full Name *
                      <input
                        name="fullName"
                        value={shopForm.fullName}
                        onChange={handleShopChange}
                        placeholder="e.g. Md. Rafiqul Islam"
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-brand-emerald dark:border-slate-700 dark:bg-slate-900"
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
                        value={shopForm.email}
                        onChange={handleShopChange}
                        placeholder="shop@example.com"
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-brand-emerald dark:border-slate-700 dark:bg-slate-900"
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
                        value={shopForm.contactNumber}
                        onChange={handleShopChange}
                        placeholder="01812345678"
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
                        value={shopForm.password}
                        onChange={handleShopChange}
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
                        value={shopForm.confirmPassword}
                        onChange={handleShopChange}
                        placeholder="••••••••"
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-brand-emerald dark:border-slate-700 dark:bg-slate-900"
                        required
                      />
                    </label>
                  </div>
                </>
              )}

              {/* Form buttons */}
              <div className="sm:col-span-2 flex flex-col-reverse sm:flex-row gap-3 pt-3">
                <Button type="button" variant="ghost" onClick={() => setStep(1)} disabled={loading}>
                  Back
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      {role === "shop_owner" ? "Creating Shop & Account..." : "Creating Account..."}
                    </span>
                  ) : role === "shop_owner" ? (
                    "Register Campus Shop"
                  ) : (
                    "Create Student Account"
                  )}
                </Button>
              </div>
            </motion.form>
          </AnimatePresence>
        )}

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


