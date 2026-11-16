"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart3,
  Users,
  Package,
  ShoppingBag,
  Store,
  Calendar,
  TrendingUp,
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  Star,
  Loader2,
  AlertCircle
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/api";

type AnalyticsData = {
  period: string;
  userAnalytics: {
    totalStudents: number;
    activeStudents: number;
    usersOverTime: Array<{ _id: string; count: number }>;
    departmentDistribution: Array<{ _id: string; count: number }>;
  };
  marketplaceAnalytics: {
    totalProducts: number;
    activeProducts: number;
    soldProducts: number;
    productsOverTime: Array<{ _id: string; count: number }>;
    categoryDistribution: Array<{ _id: string; count: number }>;
  };
  orderAnalytics: {
    totalOrders: number;
    completedOrders: number;
    pendingOrders: number;
    cancelledOrders: number;
    ordersOverTime: Array<{ _id: string; count: number }>;
  };
  sellerAnalytics: {
    totalSellers: number;
    activeShops: number;
    topPerformingShops: Array<{
      _id: string;
      shopName: string;
      category: string;
      totalSales: number;
      rating: number;
      totalProducts: number;
    }>;
    totalShopProducts: number;
  };
};

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [period, setPeriod] = useState<string>("30d");
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/api/admin/analytics?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || "Failed to load analytics.");
      }

      setData(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error loading analytics.";
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Simple clean SVG trend chart renderer
  const renderTrendChart = (items: Array<{ _id: string; count: number }>, color: string) => {
    if (!items || items.length === 0) {
      return (
        <div className="h-32 flex items-center justify-center text-xs text-slate-400">
          No records in this timeframe.
        </div>
      );
    }

    const max = Math.max(...items.map((i) => i.count), 1);

    return (
      <div className="space-y-2">
        <div className="h-32 flex items-end gap-1.5 pt-4">
          {items.map((item, idx) => {
            const heightPercent = Math.max(8, (item.count / max) * 100);
            return (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center group relative h-full justify-end"
              >
                <div
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full rounded-t-sm transition-all duration-200 group-hover:brightness-110 ${color}`}
                />
                {/* Tooltip */}
                <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition pointer-events-none z-10 bg-slate-900 text-white text-[10px] px-1.5 py-0.5 rounded shadow whitespace-nowrap">
                  {item._id}: {item.count}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-[10px] text-slate-400">
          <span>{items[0]?._id}</span>
          <span>{items[items.length - 1]?._id}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <PageHeader
          title="Platform Performance & Analytics"
          description="Real-time statistical breakdowns of student registrations, marketplace listings, campus shop orders, and vendor performance."
        />
        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex items-center bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-0.5 text-xs">
            {[
              { label: "7 Days", val: "7d" },
              { label: "30 Days", val: "30d" },
              { label: "90 Days", val: "90d" },
              { label: "All Time", val: "all" }
            ].map((p) => (
              <button
                key={p.val}
                onClick={() => setPeriod(p.val)}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  period === p.val
                    ? "bg-brand-emerald text-white shadow-xs font-semibold"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <Button
            onClick={() => fetchAnalytics(true)}
            disabled={refreshing}
            variant="outline"
            size="sm"
            className="text-xs bg-white dark:bg-slate-800"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <Loader2 size={36} className="animate-spin mx-auto text-brand-emerald mb-3" />
          <p className="text-xs text-slate-500">Calculating real-time database analytics...</p>
        </div>
      ) : error || !data ? (
        <Card className="p-8 text-center border-red-200 bg-red-50/40">
          <AlertCircle size={32} className="mx-auto text-red-500 mb-2" />
          <p className="text-sm font-bold text-slate-800">{error || "Failed to load metrics."}</p>
          <Button
            size="sm"
            onClick={() => fetchAnalytics(true)}
            className="mt-3 bg-brand-emerald text-white"
          >
            Retry
          </Button>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* ═════════════════════════════════════════════════════════════════════ */}
          {/* 1. USER ANALYTICS */}
          {/* ═════════════════════════════════════════════════════════════════════ */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
              <Users className="text-brand-emerald" size={20} />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">A. User Analytics</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="p-4 border-slate-200/80 dark:border-slate-700/80">
                <p className="text-xs text-slate-500 font-semibold uppercase">Total Registered Students</p>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {data.userAnalytics.totalStudents.toLocaleString()}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">CUET campus verified accounts</p>
              </Card>

              <Card className="p-4 border-slate-200/80 dark:border-slate-700/80">
                <p className="text-xs text-slate-500 font-semibold uppercase">Active In Period</p>
                <p className="text-2xl font-extrabold text-brand-emerald mt-1">
                  {data.userAnalytics.activeStudents.toLocaleString()}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Logged in or traded within {period}</p>
              </Card>

              <Card className="p-4 border-slate-200/80 dark:border-slate-700/80">
                <p className="text-xs text-slate-500 font-semibold uppercase">New Signups ({period})</p>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {data.userAnalytics.usersOverTime.reduce((sum, u) => sum + u.count, 0)}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Growth in current period</p>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {/* User Registrations Trend */}
              <Card className="p-4 border-slate-200/80 dark:border-slate-700/80">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  New Registrations Timeline
                </h3>
                {renderTrendChart(data.userAnalytics.usersOverTime, "bg-brand-emerald")}
              </Card>

              {/* Department Distribution */}
              <Card className="p-4 border-slate-200/80 dark:border-slate-700/80">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Department Distribution
                </h3>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {data.userAnalytics.departmentDistribution.length === 0 ? (
                    <p className="text-xs text-slate-400">No department data recorded.</p>
                  ) : (
                    data.userAnalytics.departmentDistribution.map((d) => {
                      const totalStudents = data.userAnalytics.totalStudents || 1;
                      const percent = Math.round((d.count / totalStudents) * 100);
                      return (
                        <div key={d._id} className="text-xs">
                          <div className="flex justify-between font-medium text-slate-700 dark:text-slate-300 mb-1">
                            <span className="truncate max-w-[200px]">{d._id}</span>
                            <span>{d.count} ({percent}%)</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${percent}%` }}
                              className="h-full bg-brand-emerald rounded-full"
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════════════════ */}
          {/* 2. MARKETPLACE ANALYTICS */}
          {/* ═════════════════════════════════════════════════════════════════════ */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
              <Package className="text-brand-emerald" size={20} />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">B. Marketplace Analytics</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="p-4 border-slate-200/80 dark:border-slate-700/80">
                <p className="text-xs text-slate-500 font-semibold uppercase">Total Products Listed</p>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {data.marketplaceAnalytics.totalProducts.toLocaleString()}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Across all categories</p>
              </Card>

              <Card className="p-4 border-slate-200/80 dark:border-slate-700/80">
                <p className="text-xs text-slate-500 font-semibold uppercase">Currently Active Listings</p>
                <p className="text-2xl font-extrabold text-brand-emerald mt-1">
                  {data.marketplaceAnalytics.activeProducts.toLocaleString()}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Live on campus marketplace</p>
              </Card>

              <Card className="p-4 border-slate-200/80 dark:border-slate-700/80">
                <p className="text-xs text-slate-500 font-semibold uppercase">Products Sold</p>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {data.marketplaceAnalytics.soldProducts.toLocaleString()}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Successfully traded</p>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {/* Product Listings Timeline */}
              <Card className="p-4 border-slate-200/80 dark:border-slate-700/80">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Listings Created Timeline
                </h3>
                {renderTrendChart(data.marketplaceAnalytics.productsOverTime, "bg-brand-emerald")}
              </Card>

              {/* Category Distribution */}
              <Card className="p-4 border-slate-200/80 dark:border-slate-700/80">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Category Distribution
                </h3>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {data.marketplaceAnalytics.categoryDistribution.map((cat) => {
                    const totalP = data.marketplaceAnalytics.totalProducts || 1;
                    const percent = Math.round((cat.count / totalP) * 100);
                    return (
                      <div key={cat._id} className="text-xs">
                        <div className="flex justify-between font-medium text-slate-700 dark:text-slate-300 mb-1">
                          <span className="truncate max-w-[200px]">{cat._id}</span>
                          <span>{cat.count} ({percent}%)</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div style={{ width: `${percent}%` }} className="h-full bg-brand-emerald rounded-full" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════════════════ */}
          {/* 3. ORDER ANALYTICS */}
          {/* ═════════════════════════════════════════════════════════════════════ */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
              <ShoppingBag className="text-brand-emerald" size={20} />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">C. Order Analytics</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <Card className="p-4 border-slate-200/80 dark:border-slate-700/80">
                <p className="text-xs text-slate-500 font-semibold uppercase">Total Orders</p>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {data.orderAnalytics.totalOrders.toLocaleString()}
                </p>
              </Card>

              <Card className="p-4 border-slate-200/80 dark:border-slate-700/80">
                <p className="text-xs text-slate-500 font-semibold uppercase">Completed Orders</p>
                <p className="text-2xl font-extrabold text-brand-emerald mt-1">
                  {data.orderAnalytics.completedOrders.toLocaleString()}
                </p>
              </Card>

              <Card className="p-4 border-slate-200/80 dark:border-slate-700/80">
                <p className="text-xs text-slate-500 font-semibold uppercase">Pending Orders</p>
                <p className="text-2xl font-extrabold text-brand-orange mt-1">
                  {data.orderAnalytics.pendingOrders.toLocaleString()}
                </p>
              </Card>

              <Card className="p-4 border-slate-200/80 dark:border-slate-700/80">
                <p className="text-xs text-slate-500 font-semibold uppercase">Cancelled Orders</p>
                <p className="text-2xl font-extrabold text-slate-500 mt-1">
                  {data.orderAnalytics.cancelledOrders.toLocaleString()}
                </p>
              </Card>
            </div>

            {/* Orders Timeline */}
            <Card className="p-4 border-slate-200/80 dark:border-slate-700/80">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Order Activity Timeline
              </h3>
              {renderTrendChart(data.orderAnalytics.ordersOverTime, "bg-brand-emerald")}
            </Card>
          </div>

          {/* ═════════════════════════════════════════════════════════════════════ */}
          {/* 4. SELLER ANALYTICS */}
          {/* ═════════════════════════════════════════════════════════════════════ */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
              <Store className="text-brand-emerald" size={20} />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">D. Seller Analytics</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="p-4 border-slate-200/80 dark:border-slate-700/80">
                <p className="text-xs text-slate-500 font-semibold uppercase">Total Campus Sellers</p>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {data.sellerAnalytics.totalSellers.toLocaleString()}
                </p>
              </Card>

              <Card className="p-4 border-slate-200/80 dark:border-slate-700/80">
                <p className="text-xs text-slate-500 font-semibold uppercase">Active Directory Shops</p>
                <p className="text-2xl font-extrabold text-brand-emerald mt-1">
                  {data.sellerAnalytics.activeShops.toLocaleString()}
                </p>
              </Card>

              <Card className="p-4 border-slate-200/80 dark:border-slate-700/80">
                <p className="text-xs text-slate-500 font-semibold uppercase">Total Shop Products</p>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {data.sellerAnalytics.totalShopProducts.toLocaleString()}
                </p>
              </Card>
            </div>

            {/* Top Performing Shops */}
            <Card className="p-4 border-slate-200/80 dark:border-slate-700/80">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Top Performing Campus Shops
              </h3>
              {data.sellerAnalytics.topPerformingShops.length === 0 ? (
                <p className="text-xs text-slate-400">No shop activity recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-semibold border-b">
                      <tr>
                        <th className="py-2 px-3">Shop</th>
                        <th className="py-2 px-3">Category</th>
                        <th className="py-2 px-3">Total Sales</th>
                        <th className="py-2 px-3">Rating</th>
                        <th className="py-2 px-3">Catalog Size</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {data.sellerAnalytics.topPerformingShops.map((s, idx) => (
                        <tr key={s._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="text-[11px] text-slate-400 font-bold">#{idx + 1}</span>
                            <span>{s.shopName}</span>
                          </td>
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{s.category}</td>
                          <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">{s.totalSales || 0}</td>
                          <td className="py-2 px-3">
                            <span className="flex items-center gap-1 font-semibold text-amber-500">
                              <Star size={12} fill="currentColor" /> {s.rating || "New"}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{s.totalProducts || 0} items</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

