"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  ShieldCheck,
  Key,
  Bell,
  Camera,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  Home,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  BadgeCheck,
  Check,
  AlertTriangle
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/api";

const DEFAULT_DEPARTMENTS = [
  "Civil Engineering",
  "Water Resources Engineering",
  "Mechanical Engineering",
  "Petroleum and Mining Engineering",
  "Mechatronics & Industrial Engineering",
  "Materials and Metallurgical Engineering",
  "Electrical and Electronic Engineering",
  "Computer Science & Engineering",
  "Electronics & Telecommunication Engineering",
  "Biomedical Engineering",
  "Architecture",
  "Urban and Regional Planning"
];

const DEFAULT_HALLS = [
  "Dr. Qudrat-E-Khuda Hall",
  "Kabi Kazi Nazrul Islam Hall",
  "Muktijoddha Hall",
  "Shaheed Abu Sayed Hall",
  "Shahid Mohammad Shah Hall",
  "Shaheed Tareq Huda Hall",
  "Sufia Kamal Hall",
  "Shamsennahar Khan Hall",
  "Tapashi Rabeya Hall"
];

type UserProfile = {
  _id: string;
  userId?: string;
  fullName: string;
  email: string;
  contactNumber: string;
  studentId?: string;
  department?: string;
  hall?: string;
  role: string;
  bio?: string;
  avatarUrl?: string;
  isVerified?: boolean;
  rating?: number;
  totalProductsSold?: number;
  totalProductsBought?: number;
  totalGiveaways?: number;
  createdAt?: string;
};

type TabType = "profile" | "security" | "notifications";

export default function SettingsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<TabType>("profile");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Profile Form State
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [department, setDepartment] = useState("");
  const [hall, setHall] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [departmentsList, setDepartmentsList] = useState<string[]>(DEFAULT_DEPARTMENTS);
  const [hallsList, setHallsList] = useState<string[]>(DEFAULT_HALLS);

  // Security Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Notification Preferences State
  const [notifPreferences, setNotifPreferences] = useState({
    chatAlerts: true,
    salesUpdates: true,
    departmentDeals: true,
    giveawayAlerts: true,
    emailDigests: false
  });

  // Status & Feedback States
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profileStatus, setProfileStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [passwordStatus, setPasswordStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [prefStatus, setPrefStatus] = useState<string | null>(null);

  // Fetch initial profile and constants
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        const storedToken = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
        setToken(storedToken);

        // Load cached notification preferences
        if (typeof window !== "undefined") {
          const cachedNotifs = localStorage.getItem("cuet_ebazar_notif_prefs");
          if (cachedNotifs) {
            try {
              setNotifPreferences(JSON.parse(cachedNotifs));
            } catch {
              // ignore JSON error
            }
          }
        }

        // Fetch dynamic constants (departments, halls)
        try {
          const constRes = await fetch(`${API_BASE_URL}/api/auth/constants`);
          if (constRes.ok) {
            const constData = await constRes.json();
            if (constData.departments && Array.isArray(constData.departments)) {
              setDepartmentsList(constData.departments);
            }
            if (constData.halls && Array.isArray(constData.halls)) {
              setHallsList(constData.halls);
            }
          }
        } catch {
          // Fallback to local constants
        }

        if (!storedToken) {
          setIsLoggedIn(false);
          setLoading(false);
          return;
        }

        setIsLoggedIn(true);

        // Fetch current user details from /api/auth/me
        const meRes = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${storedToken}`
          }
        });

        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.success && meData.user) {
            const u: UserProfile = meData.user;
            setUser(u);
            setFullName(u.fullName || "");
            setBio(u.bio || "");
            setContactNumber(u.contactNumber || "");
            setDepartment(u.department || "");
            setHall(u.hall || "");
            setAvatarUrl(u.avatarUrl || "");
            localStorage.setItem("cuet_ebazar_user", JSON.stringify(u));
          }
        } else {
          // Token expired or invalid
          const storedUser = localStorage.getItem("cuet_ebazar_user");
          if (storedUser) {
            try {
              const parsed = JSON.parse(storedUser);
              setUser(parsed);
              setFullName(parsed.fullName || "");
              setBio(parsed.bio || "");
              setContactNumber(parsed.contactNumber || "");
              setDepartment(parsed.department || "");
              setHall(parsed.hall || "");
              setAvatarUrl(parsed.avatarUrl || "");
            } catch {
              // ignore
            }
          }
        }
      } catch (err) {
        console.error("Settings initialization error:", err);
      } finally {
        setLoading(false);
      }
    };

    initData();

    const handleAuthChange = () => {
      const cached = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_user") : null;
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setUser((prev) => (prev ? { ...prev, ...parsed } : parsed));
        } catch {}
      }
    };

    window.addEventListener("auth-changed", handleAuthChange);
    return () => window.removeEventListener("auth-changed", handleAuthChange);
  }, []);

  // Handle Profile Update
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileStatus(null);

    if (!token) {
      setProfileStatus({ type: "error", message: "You must be logged in to update your profile." });
      return;
    }

    if (!fullName.trim() || fullName.trim().length < 2) {
      setProfileStatus({ type: "error", message: "Full Name must be at least 2 characters." });
      return;
    }

    if (!/^(\+?880|0)1[3-9]\d{8}$/.test(contactNumber.trim())) {
      setProfileStatus({ type: "error", message: "Please enter a valid Bangladeshi mobile number." });
      return;
    }

    try {
      setSavingProfile(true);
      const res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          bio: bio.trim(),
          contactNumber: contactNumber.trim(),
          department,
          hall,
          avatarUrl
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setUser(data.user);
        localStorage.setItem("cuet_ebazar_user", JSON.stringify(data.user));
        setProfileStatus({ type: "success", message: "Profile updated successfully!" });
      } else {
        setProfileStatus({ type: "error", message: data.message || "Failed to update profile." });
      }
    } catch {
      setProfileStatus({ type: "error", message: "Network error. Please make sure the server is running." });
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Avatar Image Upload
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    if (!file.type.startsWith("image/")) {
      setProfileStatus({ type: "error", message: "Please choose a valid image file (JPG, PNG, WebP)." });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setProfileStatus({ type: "error", message: "Profile picture size should not exceed 5MB." });
      return;
    }

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      setUploadingAvatar(true);
      setProfileStatus(null);

      const res = await fetch(`${API_BASE_URL}/api/auth/avatar`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAvatarUrl(data.avatarUrl);
        if (user) {
          const updated = { ...user, avatarUrl: data.avatarUrl };
          setUser(updated);
          localStorage.setItem("cuet_ebazar_user", JSON.stringify(updated));
        }
        setProfileStatus({ type: "success", message: "Profile photo updated successfully!" });
      } else {
        setProfileStatus({ type: "error", message: data.message || "Failed to upload avatar." });
      }
    } catch {
      setProfileStatus({ type: "error", message: "Failed to upload photo. Please check your connection." });
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Handle Password Change
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);

    if (!token) {
      setPasswordStatus({ type: "error", message: "You must be logged in to update your password." });
      return;
    }

    if (!currentPassword) {
      setPasswordStatus({ type: "error", message: "Please enter your current password." });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordStatus({ type: "error", message: "New password must be at least 6 characters long." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: "error", message: "New password and confirmation do not match." });
      return;
    }

    try {
      setSavingPassword(true);
      const res = await fetch(`${API_BASE_URL}/api/auth/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPasswordStatus({ type: "success", message: "Password updated successfully!" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordStatus({ type: "error", message: data.message || "Failed to change password." });
      }
    } catch {
      setPasswordStatus({ type: "error", message: "Network error while changing password." });
    } finally {
      setSavingPassword(false);
    }
  };

  // Handle Notification Preferences Save
  const handleSaveNotifPreferences = () => {
    try {
      localStorage.setItem("cuet_ebazar_notif_prefs", JSON.stringify(notifPreferences));
      setPrefStatus("Notification preferences saved successfully!");
      setTimeout(() => setPrefStatus(null), 3000);
    } catch {
      // ignore
    }
  };

  // Handle Logout
  const handleLogout = () => {
    try {
      localStorage.removeItem("cuet_ebazar_token");
      localStorage.removeItem("cuet_ebazar_user");
    } catch {
      // ignore
    }
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <Loader2 size={36} className="animate-spin text-brand-emerald" />
        <p className="mt-4 text-sm font-medium">Loading account settings...</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Account Settings"
          description="Manage your profile, security credentials, and notification alerts."
        />
        <Card className="flex flex-col items-center justify-center py-16 text-center border-dashed border-2 bg-white dark:bg-slate-900">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-400">
            <Lock size={28} />
          </div>
          <h2 className="mt-4 font-display text-xl font-bold text-slate-800 dark:text-slate-100">
            Authentication Required
          </h2>
          <p className="mt-1.5 max-w-md text-xs sm:text-sm text-slate-500">
            Please log in with your CUET student or shop owner account to customize your profile, security, and notification settings.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/login">
              <Button className="border-brand-emerald bg-brand-emerald text-white hover:bg-[#0d665f]">
                Log In to Account
              </Button>
            </Link>
            <Link href="/signup">
              <Button variant="secondary">Create New Account</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          title="Account Settings"
          description="Manage your CUET verified profile, credentials, security, and alerts."
        />
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
            <BadgeCheck size={14} /> {user?.role === "shop_owner" ? "Campus Shop Owner" : "CUET Verified Student"}
          </span>
          <Button
            onClick={handleLogout}
            variant="secondary"
            className="text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900"
          >
            <LogOut size={14} className="mr-1.5" /> Sign Out
          </Button>
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            activeTab === "profile"
              ? "bg-brand-emerald text-white shadow-sm"
              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700"
          }`}
        >
          <User size={16} /> Profile Information
        </button>

        <button
          onClick={() => setActiveTab("security")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            activeTab === "security"
              ? "bg-brand-emerald text-white shadow-sm"
              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700"
          }`}
        >
          <Key size={16} /> Security & Password
        </button>

        <button
          onClick={() => setActiveTab("notifications")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            activeTab === "notifications"
              ? "bg-brand-emerald text-white shadow-sm"
              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700"
          }`}
        >
          <Bell size={16} /> Notification Alerts
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB 1: PROFILE INFORMATION
         ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "profile" && (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_2fr]">
          {/* Left Column: Avatar & Summary Card */}
          <div className="space-y-6">
            <Card className="flex flex-col items-center p-6 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="relative group">
                <div className="relative h-28 w-28 overflow-hidden rounded-full border-4 border-emerald-500/20 bg-slate-100 dark:bg-slate-800 shadow-md">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl}
                      alt={fullName || "Profile"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-3xl font-extrabold text-brand-emerald">
                      {fullName ? fullName.charAt(0).toUpperCase() : "U"}
                    </div>
                  )}
                  {uploadingAvatar && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white">
                      <Loader2 size={24} className="animate-spin" />
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute bottom-0 right-0 rounded-full bg-brand-emerald p-2 text-white shadow-lg hover:bg-[#0d665f] transition active:scale-95"
                  title="Upload profile photo"
                >
                  <Camera size={16} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileChange}
                  className="hidden"
                />
              </div>

              <h2 className="mt-4 font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                {user?.fullName}
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{user?.userId || "CUET-USR"}</p>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
                <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                  {user?.department || "CUET Student"}
                </span>
                <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                  {user?.hall || "Campus Resident"}
                </span>
              </div>

              {user?.bio && (
                <p className="mt-4 text-xs text-slate-600 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg w-full text-center">
                  &ldquo;{user.bio}&rdquo;
                </p>
              )}

              <div className="mt-6 w-full pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-white">{user?.totalProductsSold || 0}</p>
                  <p className="text-slate-500 text-[10px] uppercase">Sold</p>
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-white">
                    {user?.rating && Number(user.rating) > 0 ? `${Number(user.rating).toFixed(1)} ★` : "N/A"}
                  </p>
                  <p className="text-slate-500 text-[10px] uppercase">Rating</p>
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-white">{user?.totalGiveaways || 0}</p>
                  <p className="text-slate-500 text-[10px] uppercase">Donated</p>
                </div>
              </div>
            </Card>

            <Card className="p-5 bg-gradient-to-br from-emerald-500/5 to-transparent border-emerald-500/20">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                <ShieldCheck size={16} /> CUET Security Protocol
              </div>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Your Student ID and university institutional email are permanently locked to preserve marketplace authenticity and trust.
              </p>
            </Card>
          </div>

          {/* Right Column: Editable Profile Form */}
          <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <User size={20} className="text-brand-emerald" /> Edit Personal Information
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Update how other CUETians see your contact and academic profile across the platform.
            </p>

            {profileStatus && (
              <div
                className={`mt-4 flex items-center gap-2.5 rounded-lg p-3 text-xs font-medium ${
                  profileStatus.type === "success"
                    ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-500/20"
                    : "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-500/20"
                }`}
              >
                {profileStatus.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{profileStatus.message}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="mt-6 space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Sadman Sakib"
                  required
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald"
                />
              </div>

              {/* Bio / About */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Bio / About You (Max 300 characters)
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 300))}
                  placeholder="e.g. 4th year CSE student. Selling textbooks, electronics, and drafting equipment."
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald"
                />
                <p className="text-right text-[11px] text-slate-400 mt-1">{bio.length}/300 chars</p>
              </div>

              {/* Contact Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Phone size={14} className="text-slate-400" /> WhatsApp / Phone Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="017XXXXXXXX or +88017XXXXXXXX"
                  required
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">Used by prospective buyers to reach you directly.</p>
              </div>

              {/* Academic Grid: Department & Hall */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Building2 size={14} className="text-slate-400" /> CUET Department
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald"
                  >
                    <option value="">Select Department</option>
                    {departmentsList.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Home size={14} className="text-slate-400" /> Hall of Residence
                  </label>
                  <select
                    value={hall}
                    onChange={(e) => setHall(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald"
                  >
                    <option value="">Select Hall</option>
                    {hallsList.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Locked Fields: Student ID & University Email */}
              <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
                    <Lock size={12} /> Student ID (Locked)
                  </label>
                  <input
                    type="text"
                    value={user?.studentId || "N/A"}
                    disabled
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/50 px-3.5 py-2 text-sm text-slate-500 font-mono cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
                    <Mail size={12} /> Institutional Email (Locked)
                  </label>
                  <input
                    type="text"
                    value={user?.email || ""}
                    disabled
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/50 px-3.5 py-2 text-sm text-slate-500 font-mono cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4 flex justify-end">
                <Button
                  type="submit"
                  disabled={savingProfile}
                  className="border-brand-emerald bg-brand-emerald text-white hover:bg-[#0d665f] px-6"
                >
                  {savingProfile ? (
                    <>
                      <Loader2 size={16} className="animate-spin mr-2" /> Saving Changes...
                    </>
                  ) : (
                    <>
                      <Save size={16} className="mr-2" /> Save Profile Details
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB 2: SECURITY & PASSWORD
         ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "security" && (
        <div className="grid gap-6 lg:grid-cols-[2fr_1.2fr]">
          <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Key size={20} className="text-brand-emerald" /> Change Account Password
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Ensure your account is protected with a strong, secure passphrase.
            </p>

            {passwordStatus && (
              <div
                className={`mt-4 flex items-center gap-2.5 rounded-lg p-3 text-xs font-medium ${
                  passwordStatus.type === "success"
                    ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-500/20"
                    : "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-500/20"
                }`}
              >
                {passwordStatus.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{passwordStatus.message}</span>
              </div>
            )}

            <form onSubmit={handleSavePassword} className="mt-6 space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Current Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                    required
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 pr-10 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    required
                    minLength={6}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 pr-10 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Confirm New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password"
                    required
                    minLength={6}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 pr-10 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-3 flex justify-end">
                <Button
                  type="submit"
                  disabled={savingPassword}
                  className="border-brand-emerald bg-brand-emerald text-white hover:bg-[#0d665f] px-6"
                >
                  {savingPassword ? (
                    <>
                      <Loader2 size={16} className="animate-spin mr-2" /> Updating Password...
                    </>
                  ) : (
                    <>
                      <Lock size={16} className="mr-2" /> Update Password
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>

          {/* Security Recommendations Card */}
          <div className="space-y-4">
            <Card className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <h4 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-500" /> Password Guidelines
              </h4>
              <ul className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-brand-emerald mt-0.5 shrink-0" />
                  <span>Use at least 6 characters with mixed letters & numbers</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-brand-emerald mt-0.5 shrink-0" />
                  <span>Never share your password or OTP with anyone on campus</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-brand-emerald mt-0.5 shrink-0" />
                  <span>Do not use your common CUET portal or hall WiFi password</span>
                </li>
              </ul>
            </Card>

            <Card className="p-5 bg-rose-500/5 border border-rose-500/20">
              <h4 className="font-semibold text-sm text-rose-700 dark:text-rose-400 flex items-center gap-2">
                <AlertTriangle size={16} /> Active Session Control
              </h4>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                If you suspect unauthorized access or used a shared lab computer at CUET, log out from all devices.
              </p>
              <Button
                onClick={handleLogout}
                variant="secondary"
                className="mt-4 w-full text-xs font-semibold text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/60"
              >
                <LogOut size={14} className="mr-1.5" /> Sign Out of This Session
              </Button>
            </Card>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB 3: NOTIFICATION PREFERENCES
         ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "notifications" && (
        <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Bell size={20} className="text-brand-emerald" /> Notification Alerts & Delivery
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Customize which events trigger notifications and alerts in your dashboard.
              </p>
            </div>
            {prefStatus && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-500/20">
                <CheckCircle2 size={14} /> {prefStatus}
              </span>
            )}
          </div>

          <div className="mt-6 divide-y divide-slate-100 dark:divide-slate-800 space-y-4">
            {/* Chat & Messages */}
            <div className="pt-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Buyer & Seller Chat Alerts
                </p>
                <p className="text-xs text-slate-500">
                  Receive instant notifications when students message you regarding your listed items.
                </p>
              </div>
              <input
                type="checkbox"
                checked={notifPreferences.chatAlerts}
                onChange={(e) =>
                  setNotifPreferences({ ...notifPreferences, chatAlerts: e.target.checked })
                }
                className="h-5 w-5 rounded border-slate-300 text-brand-emerald focus:ring-brand-emerald cursor-pointer"
              />
            </div>

            {/* Sales & Orders */}
            <div className="pt-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Listing Status & Offers
                </p>
                <p className="text-xs text-slate-500">
                  Get notified when an item is marked as reserved, sold, or reviewed.
                </p>
              </div>
              <input
                type="checkbox"
                checked={notifPreferences.salesUpdates}
                onChange={(e) =>
                  setNotifPreferences({ ...notifPreferences, salesUpdates: e.target.checked })
                }
                className="h-5 w-5 rounded border-slate-300 text-brand-emerald focus:ring-brand-emerald cursor-pointer"
              />
            </div>

            {/* Department Deals */}
            <div className="pt-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Department & Campus Deals
                </p>
                <p className="text-xs text-slate-500">
                  Alerts about newly listed textbooks, calculators, and instruments in your department.
                </p>
              </div>
              <input
                type="checkbox"
                checked={notifPreferences.departmentDeals}
                onChange={(e) =>
                  setNotifPreferences({ ...notifPreferences, departmentDeals: e.target.checked })
                }
                className="h-5 w-5 rounded border-slate-300 text-brand-emerald focus:ring-brand-emerald cursor-pointer"
              />
            </div>

            {/* Giveaway Alerts */}
            <div className="pt-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Free Giveaways & Book Donations
                </p>
                <p className="text-xs text-slate-500">
                  Notifications when seniors or peers post 100% free giveaway items on campus.
                </p>
              </div>
              <input
                type="checkbox"
                checked={notifPreferences.giveawayAlerts}
                onChange={(e) =>
                  setNotifPreferences({ ...notifPreferences, giveawayAlerts: e.target.checked })
                }
                className="h-5 w-5 rounded border-slate-300 text-brand-emerald focus:ring-brand-emerald cursor-pointer"
              />
            </div>

            {/* Email Summaries */}
            <div className="pt-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  CUET Email Weekly Digest
                </p>
                <p className="text-xs text-slate-500">
                  Send a weekly recap of trending campus deals to your institutional email.
                </p>
              </div>
              <input
                type="checkbox"
                checked={notifPreferences.emailDigests}
                onChange={(e) =>
                  setNotifPreferences({ ...notifPreferences, emailDigests: e.target.checked })
                }
                className="h-5 w-5 rounded border-slate-300 text-brand-emerald focus:ring-brand-emerald cursor-pointer"
              />
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <Button
              onClick={handleSaveNotifPreferences}
              className="border-brand-emerald bg-brand-emerald text-white hover:bg-[#0d665f] px-6"
            >
              <Save size={16} className="mr-2" /> Save Notification Preferences
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
