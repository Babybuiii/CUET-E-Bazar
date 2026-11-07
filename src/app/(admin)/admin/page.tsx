"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Users,
  Store,
  Package,
  ShoppingBag,
  UserPlus,
  PackagePlus,
  AlertTriangle,
  Ban,
  ArrowRight,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  ExternalLink
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/api";

type DashboardData = {
  stats: {
    totalStudents: number;
    totalSellers: number;
    totalProducts: number;
    totalOrders: number;
    newUsersThisWeek: number;
    newProductsThisWeek: number;
    pendingReportsCount: number;
    bannedOrSuspendedUsers: number;
  };
  recentActivity: {
    users: Array<{
      _id: string;
      fullName: string;
      email: string;
      studentId?: string;
      department?: string;
      createdAt: string;
      avatarUrl?: string;
      isBanned?: boolean;
      isSuspended?: boolean;
    }>;
    products: Array<{
      _id: string;
      title: string;
      price: number;
      category: string;
      status: string;
      createdAt: string;
      seller?: { fullName: string; email: string };
      shop?: { shopName: string };
      images?: Array<{ url: string; thumbnailUrl: string }>;
    }>;
    reports: Array<{
      _id: string;
      targetType: string;
      targetName?: string;
      reason: string;
      status: string;
      createdAt: string;
      reporter?: { fullName: string; email: string; studentId?: string };
    }>;
    orders: Array<{
      _id: string;
      totalPrice: number;
      status: string;
      createdAt: string;
      buyer?: { fullName: string; email: string };
      seller?: { fullName: string; email: string };
      product?: { title: string; price: number };
    }>;
  };
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
      if (!token) throw new Error("No admin session found.");

      const res = await fetch(`${API_BASE_URL}/api/admin/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || "Failed to load dashboard data.");
      }

      setData(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error loading dashboard.";
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Admin Control Centre"
          description="Live platform metrics, moderation status, and real-time activity for CUET E-Bazar."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Admin Control Centre" description="Live platform metrics and moderation status." />
        <Card className="p-8 text-center border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20">
          <AlertCircle className="mx-auto text-red-500" size={36} />
          <h3 className="mt-3 text-base font-bold text-slate-800 dark:text-slate-100">Unable to load dashboard</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{error || "Something went wrong."}</p>
          <Button
            onClick={() => fetchDashboard(true)}
            className="mt-4 bg-brand-emerald text-white hover:bg-emerald-700"
          >
            <RefreshCw size={15} className="mr-1.5" /> Retry
          </Button>
        </Card>
      </div>
    );
  }

  const { stats, recentActivity } = data;

  return (
    <div className="space-y-6 pb-12">
      {/* ── Top Header with Refresh ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <PageHeader
          title="Admin Control Centre"
          description="Live platform metrics, moderation status, and real-time activity for CUET E-Bazar."
        />
        <Button
          onClick={() => fetchDashboard(true)}
          disabled={refreshing}
          variant="outline"
          className="self-start sm:self-auto text-xs bg-white dark:bg-slate-800"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin mr-1.5" : "mr-1.5"} />
          {refreshing ? "Syncing..." : "Sync Live Data"}
        </Button>
      </div>

      {/* ── 1. Overview Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Students */}
        <Card className="p-5 flex items-center justify-between border-slate-200/80 dark:border-slate-700/80 hover:shadow-md transition">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Students
            </p>
            <p className="mt-1.5 font-display text-3xl font-extrabold text-slate-900 dark:text-white">
              {stats.totalStudents.toLocaleString()}
            </p>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Registered campus buyers & sellers</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Users className="text-brand-emerald" size={24} />
          </div>
        </Card>

        {/* Total Sellers */}
        <Card className="p-5 flex items-center justify-between border-slate-200/80 dark:border-slate-700/80 hover:shadow-md transition">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Sellers
            </p>
            <p className="mt-1.5 font-display text-3xl font-extrabold text-slate-900 dark:text-white">
              {stats.totalSellers.toLocaleString()}
            </p>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Verified campus shops & businesses</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Store className="text-amber-500" size={24} />
          </div>
        </Card>

        {/* Total Products */}
        <Card className="p-5 flex items-center justify-between border-slate-200/80 dark:border-slate-700/80 hover:shadow-md transition">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Products
            </p>
            <p className="mt-1.5 font-display text-3xl font-extrabold text-slate-900 dark:text-white">
              {stats.totalProducts.toLocaleString()}
            </p>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Marketplace listings across campus</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
            <Package className="text-blue-500" size={24} />
          </div>
        </Card>

        {/* Total Orders */}
        <Card className="p-5 flex items-center justify-between border-slate-200/80 dark:border-slate-700/80 hover:shadow-md transition">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Orders
            </p>
            <p className="mt-1.5 font-display text-3xl font-extrabold text-slate-900 dark:text-white">
              {stats.totalOrders.toLocaleString()}
            </p>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Transactions processed on platform</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
            <ShoppingBag className="text-purple-500" size={24} />
          </div>
        </Card>
      </div>

      {/* ── 2. Platform Activity Metrics ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/90 p-4 flex items-center gap-3 shadow-xs">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-brand-emerald">
            <UserPlus size={18} />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">New Users This Week</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">+{stats.newUsersThisWeek}</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/90 p-4 flex items-center gap-3 shadow-xs">
          <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-500">
            <PackagePlus size={18} />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">New Listings This Week</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">+{stats.newProductsThisWeek}</p>
          </div>
        </div>

        <Link
          href="/admin/reports"
          className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/60 dark:bg-red-950/20 p-4 flex items-center justify-between gap-3 shadow-xs hover:border-red-400 transition"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-red-500/15 text-red-500">
              <AlertTriangle size={18} />
            </div>
            <div>
              <p className="text-[11px] text-red-700 dark:text-red-300 font-medium">Pending Reports</p>
              <p className="text-lg font-bold text-red-600 dark:text-red-400">{stats.pendingReportsCount}</p>
            </div>
          </div>
          <ArrowRight size={15} className="text-red-500" />
        </Link>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/90 p-4 flex items-center gap-3 shadow-xs">
          <div className="p-2.5 rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-400">
            <Ban size={18} />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Banned / Suspended</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{stats.bannedOrSuspendedUsers}</p>
          </div>
        </div>
      </div>

      {/* ── 3. Quick Actions ── */}
      <Card className="p-5 border-slate-200/80 dark:border-slate-700/80">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          Quick Administrative Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            href="/admin/reports"
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-red-200 bg-red-50/40 hover:bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400 hover:scale-[1.01] transition"
          >
            <AlertTriangle size={20} className="mb-1.5" />
            <span className="text-xs font-semibold text-center">Review Pending Reports</span>
            <span className="text-[10px] text-red-600/70 dark:text-red-400/70 mt-0.5">
              {stats.pendingReportsCount} awaiting review
            </span>
          </Link>

          <Link
            href="/admin/users"
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:scale-[1.01] transition"
          >
            <Users size={20} className="mb-1.5 text-brand-emerald" />
            <span className="text-xs font-semibold text-center">Manage Users</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Search, warn & ban</span>
          </Link>

          <Link
            href="/admin/products"
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:scale-[1.01] transition"
          >
            <Package size={20} className="mb-1.5 text-blue-500" />
            <span className="text-xs font-semibold text-center">Moderate Products</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Hide or remove ads</span>
          </Link>

          <Link
            href="/admin/sellers"
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:scale-[1.01] transition"
          >
            <Store size={20} className="mb-1.5 text-amber-500" />
            <span className="text-xs font-semibold text-center">Manage Sellers</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Campus shops oversight</span>
          </Link>
        </div>
      </Card>

      {/* ── 4. Recent Activity Grid ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Latest Reports */}
        <Card className="p-5 border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-red-500" />
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Latest Scam & Abuse Reports</h3>
              </div>
              <Link href="/admin/reports" className="text-xs text-brand-emerald hover:underline font-medium">
                View All
              </Link>
            </div>

            <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {recentActivity.reports.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                  <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-1.5" />
                  No reports currently open. Community is clean.
                </div>
              ) : (
                recentActivity.reports.map((r) => (
                  <div key={r._id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                          {r.targetType}: {r.targetName || "Target"}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.status === "pending"
                              ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"
                              : r.status === "under_review"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                          }`}
                        >
                          {r.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        Reason: {r.reason.replace("_", " ")} • Reported by {r.reporter?.fullName || "Student"}
                      </p>
                    </div>
                    <Link
                      href={`/admin/reports?id=${r._id}`}
                      className="shrink-0 p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300"
                    >
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
          <Link
            href="/admin/reports"
            className="mt-4 block text-center py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Open Moderation Queue →
          </Link>
        </Card>

        {/* Recently Registered Users */}
        <Card className="p-5 border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-brand-emerald" />
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Recently Registered Students</h3>
              </div>
              <Link href="/admin/users" className="text-xs text-brand-emerald hover:underline font-medium">
                View All
              </Link>
            </div>

            <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {recentActivity.users.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">No student users found.</div>
              ) : (
                recentActivity.users.map((u) => (
                  <div key={u._id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0 font-bold text-slate-700 dark:text-slate-300 text-xs">
                        {u.fullName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{u.fullName}</p>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px] truncate">
                          {u.studentId ? `ID: ${u.studentId}` : u.email} • {u.department || "CUET"}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      {u.isBanned && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300">
                          Banned
                        </span>
                      )}
                      <Link
                        href={`/admin/users?search=${encodeURIComponent(u.email)}`}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300"
                      >
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <Link
            href="/admin/users"
            className="mt-4 block text-center py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Manage All Users →
          </Link>
        </Card>

        {/* Recently Added Products */}
        <Card className="p-5 border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Package size={18} className="text-blue-500" />
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Recently Listed Products</h3>
              </div>
              <Link href="/admin/products" className="text-xs text-brand-emerald hover:underline font-medium">
                View All
              </Link>
            </div>

            <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {recentActivity.products.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">No products listed recently.</div>
              ) : (
                recentActivity.products.map((p) => {
                  const cover = p.images?.[0]?.thumbnailUrl || p.images?.[0]?.url || "/placeholder.png";
                  return (
                    <div key={p._id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-700 overflow-hidden relative shrink-0">
                          {p.images && p.images.length > 0 ? (
                            <img src={cover} alt={p.title} className="h-full w-full object-cover" />
                          ) : (
                            <Package size={16} className="m-auto text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{p.title}</p>
                          <p className="text-slate-500 dark:text-slate-400 text-[11px] truncate">
                            ৳{p.price.toLocaleString()} • {p.category} • by {p.shop?.shopName || p.seller?.fullName || "Seller"}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === "active"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : p.status === "removed_by_admin"
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {p.status}
                        </span>
                        <Link
                          href={`/admin/products?search=${encodeURIComponent(p.title)}`}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300"
                        >
                          <ArrowRight size={14} />
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <Link
            href="/admin/products"
            className="mt-4 block text-center py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Moderate All Products →
          </Link>
        </Card>

        {/* Recent Orders & Seller Activity */}
        <Card className="p-5 border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShoppingBag size={18} className="text-purple-500" />
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Recent Transactions</h3>
              </div>
              <Link href="/admin/analytics" className="text-xs text-brand-emerald hover:underline font-medium">
                View Trends
              </Link>
            </div>

            <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {recentActivity.orders.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">No orders recorded yet.</div>
              ) : (
                recentActivity.orders.map((o) => (
                  <div key={o._id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {o.product?.title || "Product"}
                      </p>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] truncate">
                        ৳{o.totalPrice.toLocaleString()} • Buyer: {o.buyer?.fullName || "Student"}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        o.status === "completed"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : o.status === "cancelled"
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                      }`}
                    >
                      {o.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
          <Link
            href="/admin/analytics"
            className="mt-4 block text-center py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Review Platform Analytics →
          </Link>
        </Card>
      </div>
    </div>
  );
}

