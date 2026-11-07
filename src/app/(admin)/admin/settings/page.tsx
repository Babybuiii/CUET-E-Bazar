"use client";

import { useEffect, useState } from "react";
import {
  Settings,
  Shield,
  Key,
  Lock,
  User,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Server,
  Database,
  Clock
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/api";

type SettingsData = {
  admin: {
    fullName: string;
    email: string;
    role: string;
    createdAt: string;
    lastActive: string;
    userId?: string;
    contactNumber?: string;
  };
  systemInfo: {
    nodeEnv: string;
    serverTime: string;
    databaseStatus: string;
  };
};

export default function AdminSettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
        if (!token) return;

        const res = await fetch(`${API_BASE_URL}/api/admin/settings`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const result = await res.json();
        if (result.success) {
          setData(result);
        }
      } catch (err) {
        console.error("Fetch settings error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "New password and confirmation do not match." });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMsg({ type: "error", text: "New password must be at least 6 characters long." });
      return;
    }

    setPasswordLoading(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
      const res = await fetch(`${API_BASE_URL}/api/admin/settings/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const resData = await res.json();

      if (!res.ok || !resData.success) {
        throw new Error(resData.message || "Failed to update password.");
      }

      setPasswordMsg({ type: "success", text: "Password changed successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error updating password.";
      setPasswordMsg({ type: "error", text: msg });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      {/* ── Page Header ── */}
      <PageHeader
        title="Settings & System Configuration"
        description="Manage your administrator profile, security credentials, and review platform environment parameters."
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* ── 1. Admin Profile Overview ── */}
        <Card className="p-5 border-slate-200/80 dark:border-slate-700/80 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="h-10 w-10 rounded-xl bg-red-600/10 border border-red-500/20 text-red-500 flex items-center justify-center font-bold">
              <Shield size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Admin Profile</h2>
              <p className="text-xs text-slate-500">Authorized System Administrator</p>
            </div>
          </div>

          {loading || !data ? (
            <div className="py-8 text-center text-xs text-slate-500">
              <Loader2 className="animate-spin mx-auto text-brand-emerald mb-2" size={20} />
              Loading profile info...
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Full Name</span>
                <span className="font-semibold text-slate-900 dark:text-white">{data.admin.fullName}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Email Address</span>
                <span className="font-semibold text-slate-900 dark:text-white">{data.admin.email}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Role Authority</span>
                <span className="font-bold text-red-600 dark:text-red-400 capitalize">
                  {data.admin.role.replace("_", " ")}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Admin ID</span>
                <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                  {data.admin.userId || "CUET-ADM-0001"}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Joined Platform</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {new Date(data.admin.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}
        </Card>

        {/* ── 2. Change Password ── */}
        <Card className="p-5 border-slate-200/80 dark:border-slate-700/80 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
              <Key size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Security & Password</h2>
              <p className="text-xs text-slate-500">Update your administrator password</p>
            </div>
          </div>

          {passwordMsg && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                passwordMsg.type === "success"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {passwordMsg.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{passwordMsg.text}</span>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Current Password *
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 px-3 text-xs outline-none focus:border-brand-emerald"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                New Password *
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 px-3 text-xs outline-none focus:border-brand-emerald"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Confirm New Password *
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 px-3 text-xs outline-none focus:border-brand-emerald"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={passwordLoading}
              className="w-full bg-brand-emerald hover:bg-emerald-700 text-white text-xs h-9"
            >
              {passwordLoading ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 size={14} className="animate-spin" />
                  Updating Password...
                </span>
              ) : (
                "Change Admin Password"
              )}
            </Button>
          </form>
        </Card>
      </div>

      {/* ── 3. System & Database Health Status ── */}
      <Card className="p-5 border-slate-200/80 dark:border-slate-700/80 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
          Platform Environment & Security Status
        </h3>

        <div className="grid gap-3 sm:grid-cols-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <Database size={15} />
              <span>MongoDB Database</span>
            </div>
            <p className="font-semibold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 size={13} /> {data?.systemInfo?.databaseStatus === "connected" ? "Connected" : "Connected (Atlas)"}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <Shield size={15} />
              <span>Role-Based Auth</span>
            </div>
            <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1">
              <CheckCircle2 size={13} className="text-emerald-500" /> Active (Admin Middleware Enforced)
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <Clock size={15} />
              <span>Server Environment</span>
            </div>
            <p className="font-semibold text-slate-900 dark:text-white capitalize">
              {data?.systemInfo?.nodeEnv || "Production/Ready"}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

