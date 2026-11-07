"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Package,
  TrendingUp,
  CheckCircle2,
  Eye,
  PlusCircle,
  ShoppingBag,
  ExternalLink,
  Sparkles,
  ArrowRight,
  LogIn,
  RefreshCw,
  Heart,
  Users,
  Gift,
  MapPin,
  Clock,
  User,
  Edit3,
  Trash2,
  Loader2
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SellModal } from "@/components/marketplace/sell-modal";
import { EditProductModal } from "@/components/marketplace/edit-product-modal";
import { API_BASE_URL } from "@/lib/api";
import type { Giveaway } from "@/types/giveaway";

type ProductAnalytics = {
  _id: string;
  id?: string;
  title: string;
  price: number;
  originalPrice?: number | null;
  discount?: number;
  category: string;
  condition: string;
  status: "active" | "sold" | "reserved" | "removed_by_admin";
  images: Array<{ url?: string; thumbnailUrl?: string } | string>;
  viewsCount: number;
  uniqueViewsCount?: number;
  wishlistCount: number;
  createdAt: string;
};

type DashboardAnalytics = {
  totalListings: number;
  activeListings: number;
  soldItems: number;
  reservedItems: number;
  totalRevenue: number;
  potentialRevenue: number;
  totalAdClicks: number;
  totalUniqueVisitors?: number;
  totalWishlists: number;
  conversionRate: number;
  clickToSaveRate: string;
};

type UserProfile = {
  _id: string;
  fullName: string;
  email: string;
  role: string;
  department?: string;
  hall?: string;
  rating?: number;
};

export default function SellerDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [analytics, setAnalytics] = useState<DashboardAnalytics>({
    totalListings: 0,
    activeListings: 0,
    soldItems: 0,
    reservedItems: 0,
    totalRevenue: 0,
    potentialRevenue: 0,
    totalAdClicks: 0,
    totalUniqueVisitors: 0,
    totalWishlists: 0,
    conversionRate: 0,
    clickToSaveRate: "0.0"
  });
  const [products, setProducts] = useState<ProductAnalytics[]>([]);
  const [claimedGiveaways, setClaimedGiveaways] = useState<Giveaway[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSellOpen, setIsSellOpen] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductAnalytics | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
      const storedUser = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_user") : null;

      if (!token) {
        setIsLoggedIn(false);
        setLoading(false);
        return;
      }

      setIsLoggedIn(true);
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          // ignore parsing error
        }
      }

      // Fetch claimed giveaways in parallel
      try {
        const claimsRes = await fetch(`${API_BASE_URL}/api/giveaways/my-claims`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (claimsRes.ok) {
          const claimsData = await claimsRes.json();
          if (claimsData.success && Array.isArray(claimsData.giveaways)) {
            setClaimedGiveaways(claimsData.giveaways);
          }
        }
      } catch (claimErr) {
        console.warn("Failed to load user's claimed giveaways:", claimErr);
      }

      // Fetch comprehensive seller analytics
      const res = await fetch(`${API_BASE_URL}/api/products/user/dashboard-analytics`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (data.analytics) setAnalytics(data.analytics);
          if (Array.isArray(data.products)) setProducts(data.products);
          return;
        }
      }

      // Fallback: fetch listings and compute basic metrics
      const fallbackRes = await fetch(`${API_BASE_URL}/api/products/user/my-listings`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        if (fallbackData.success && Array.isArray(fallbackData.products)) {
          const list = fallbackData.products;
          const sold = list.filter((p: any) => p.status === "sold").length;
          const active = list.filter((p: any) => p.status === "active").length;
          const revenue = list
            .filter((p: any) => p.status === "sold")
            .reduce((s: number, p: any) => s + (Number(p.price) || 0), 0);
          const potential = list
            .filter((p: any) => p.status === "active")
            .reduce((s: number, p: any) => s + (Number(p.price) || 0), 0);
          const clicks = list.reduce((s: number, p: any) => s + (p.viewsCount || p.views || 0), 0);

          setAnalytics({
            totalListings: list.length,
            activeListings: active,
            soldItems: sold,
            reservedItems: list.filter((p: any) => p.status === "reserved").length,
            totalRevenue: revenue,
            potentialRevenue: potential,
            totalAdClicks: clicks,
            totalWishlists: 0,
            conversionRate: list.length > 0 ? Math.round((sold / list.length) * 100) : 0,
            clickToSaveRate: "0.0"
          });
          setProducts(list);
        }
      }
    } catch (err) {
      console.error("Failed to load seller dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleDeleteProduct = async (productId: string, title: string) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
    if (!token) return;
    if (!window.confirm(`Delete "${title}"? This removes the listing and its photos permanently.`)) {
      return;
    }

    try {
      setDeletingId(productId);
      const res = await fetch(`${API_BASE_URL}/api/products/${productId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        fetchDashboardData();
      } else {
        console.error("Delete failed:", data.message);
      }
    } catch (err) {
      console.error("Failed to delete product:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleStatus = async (productId: string, newStatus: "active" | "sold" | "reserved") => {
    const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
    if (!token) return;

    try {
      setStatusUpdatingId(productId);
      const res = await fetch(`${API_BASE_URL}/api/products/${productId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        if (typeof data.totalProductsSold === "number") {
          const cached = localStorage.getItem("cuet_ebazar_user");
          if (cached) {
            try {
              const u = JSON.parse(cached);
              u.totalProductsSold = data.totalProductsSold;
              localStorage.setItem("cuet_ebazar_user", JSON.stringify(u));
              window.dispatchEvent(new Event("auth-changed"));
            } catch {}
          }
        }
        // Refresh to recalculate accurate revenue and metrics
        fetchDashboardData();
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setStatusUpdatingId(null);
    }
  };

  if (!loading && !isLoggedIn) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Seller Dashboard"
          description="Analytics, inventory, listings, and performance insights."
        />
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <LogIn size={32} />
          </div>
          <h2 className="mt-4 font-display text-xl font-bold">Sign In Required</h2>
          <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-300">
            Please log in with your CUET account to access your personalized seller analytics, wishlists count, and ad performance.
          </p>
          <div className="mt-6 flex gap-3">
            <Link href="/login">
              <Button variant="primary">Log In</Button>
            </Link>
            <Link href="/signup">
              <Button variant="ghost">Create Account</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Top Header & Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Seller Analytics Dashboard"
          description={
            user?.fullName
              ? `Welcome back, ${user.fullName}. Live buyer traffic, wishlist demand, and sales intelligence.`
              : "Live analytics on ad clicks, wishlist counts, active inventory, and sales."
          }
        />
        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboardData}
            className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition"
            title="Refresh statistics"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
          <Button
            variant="primary"
            onClick={() => setIsSellOpen(true)}
            className="text-xs shadow-sm"
          >
            <PlusCircle size={15} className="mr-1.5" />
            <span>Post New Listing</span>
          </Button>
        </div>
      </div>

      {/* ── Core KPI Analytics Grid (6 Cards, 2 side-by-side on mobile) ── */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* 1. Wishlisted By */}
        <Card className="p-2.5 sm:p-4 flex flex-col justify-between border-rose-200/60 dark:border-rose-900/40 bg-gradient-to-br from-rose-50/50 to-transparent dark:from-rose-950/20">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 truncate">
              Wishlist Saves
            </span>
            <div className="flex h-6 w-6 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
              <Heart size={14} className="fill-rose-500" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <p className="font-display text-lg sm:text-2xl font-black text-slate-900 dark:text-white">
              {analytics.totalWishlists}
            </p>
            <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {analytics.clickToSaveRate}% save rate
            </p>
          </div>
        </Card>

        {/* 2. Ad Clicks / Views */}
        <Card className="p-2.5 sm:p-4 flex flex-col justify-between border-blue-200/60 dark:border-blue-900/40 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-950/20">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 truncate">
              Ad Clicks & Visitors
            </span>
            <div className="flex h-6 w-6 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
              <Eye size={14} />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="flex items-baseline gap-1.5">
              <p className="font-display text-lg sm:text-2xl font-black text-slate-900 dark:text-white">
                {analytics.totalAdClicks}
              </p>
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                clicks
              </span>
            </div>
            <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1">
              <Users size={11} className="text-blue-500" />
              <span>
                <strong>{analytics.totalUniqueVisitors ?? (analytics.totalAdClicks > 0 ? 1 : 0)}</strong> unique {analytics.totalUniqueVisitors === 1 ? "user" : "users"}
              </span>
            </p>
          </div>
        </Card>

        {/* 3. Currently Active */}
        <Card className="p-2.5 sm:p-4 flex flex-col justify-between border-emerald-200/60 dark:border-emerald-900/40 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-950/20">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 truncate">
              Active Listings
            </span>
            <div className="flex h-6 w-6 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <Package size={14} />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <p className="font-display text-lg sm:text-2xl font-black text-slate-900 dark:text-white">
              {analytics.activeListings}
            </p>
            <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Live on market
            </p>
          </div>
        </Card>

        {/* 4. Total Revenue */}
        <Card className="p-2.5 sm:p-4 flex flex-col justify-between border-teal-200/60 dark:border-teal-900/40 bg-gradient-to-br from-teal-50/50 to-transparent dark:from-teal-950/20">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300 truncate">
              Total Revenue
            </span>
            <div className="flex h-6 w-6 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-teal-500/10 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300">
              <TrendingUp size={14} />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <p className="font-display text-lg sm:text-2xl font-black text-slate-900 dark:text-white">
              ৳{analytics.totalRevenue.toLocaleString()}
            </p>
            <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
              From {analytics.soldItems} sales
            </p>
          </div>
        </Card>

        {/* 5. Items Sold */}
        <Card className="p-2.5 sm:p-4 flex flex-col justify-between border-purple-200/60 dark:border-purple-900/40 bg-gradient-to-br from-purple-50/50 to-transparent dark:from-purple-950/20">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 truncate">
              Items Sold
            </span>
            <div className="flex h-6 w-6 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
              <CheckCircle2 size={14} />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <p className="font-display text-lg sm:text-2xl font-black text-slate-900 dark:text-white">
              {analytics.soldItems}
            </p>
            <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {analytics.conversionRate}% conversion
            </p>
          </div>
        </Card>

        {/* 6. Potential Revenue */}
        <Card className="p-2.5 sm:p-4 flex flex-col justify-between border-amber-200/60 dark:border-amber-900/40 bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-950/20">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 truncate">
              Active Value
            </span>
            <div className="flex h-6 w-6 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
              <Sparkles size={14} />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <p className="font-display text-lg sm:text-2xl font-black text-slate-900 dark:text-white">
              ৳{analytics.potentialRevenue.toLocaleString()}
            </p>
            <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Pending inventory
            </p>
          </div>
        </Card>
      </div>

      {/* ── My Claimed Items (Giveaways) ── */}
      <Card className="p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0f766e]/10 text-[#0f766e]">
              <Gift size={20} />
            </div>
            <div>
              <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                My Claimed Items
                <span className="rounded-full bg-[#0f766e]/10 text-[#0f766e] px-2.5 py-0.5 text-xs font-semibold">
                  {claimedGiveaways.length} {claimedGiveaways.length === 1 ? "item" : "items"}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                100% free giveaway items you have claimed. Coordinate campus pickup with donors.
              </p>
            </div>
          </div>
          <Link
            href="/giveaways"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0f766e] hover:underline"
          >
            Browse Giveaways <ArrowRight size={13} />
          </Link>
        </div>

        {claimedGiveaways.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
              <Gift size={22} />
            </div>
            <h3 className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-200">No Claimed Items Yet</h3>
            <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
              When you claim free textbooks, tools, or notes from peers, they will appear here.
            </p>
            <Link href="/giveaways" className="mt-3">
              <Button variant="secondary" className="text-xs py-1.5 px-3">
                Explore Available Giveaways
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {claimedGiveaways.map((giveaway) => {
              const displayImg = giveaway.images?.[0] || null;
              const claimDate = giveaway.claimedAt || giveaway.updatedAt;
              const formattedDate = claimDate
                ? new Date(claimDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric"
                  })
                : "Recently";

              return (
                <div
                  key={giveaway._id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-3.5 shadow-sm hover:border-[#0f766e]/40 transition space-y-3"
                >
                  <div className="space-y-2.5">
                    {/* Image & Status Row */}
                    <div className="flex items-start gap-3">
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        {displayImg ? (
                          <Image
                            src={displayImg}
                            alt={giveaway.title}
                            fill
                            className="object-cover"
                            unoptimized={displayImg.includes("cloudinary.com") || displayImg.startsWith("data:")}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-slate-300">
                            <Gift size={22} />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="inline-block rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                            Claimed
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {formattedDate}
                          </span>
                        </div>
                        <h4 className="mt-1 line-clamp-1 text-sm font-bold text-slate-900 dark:text-white" title={giveaway.title}>
                          {giveaway.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {giveaway.category} • {giveaway.condition}
                        </p>
                      </div>
                    </div>

                    {/* Donor Details */}
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-2.5 space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                          {giveaway.donor?.avatarUrl ? (
                            <Image
                              src={giveaway.donor.avatarUrl}
                              alt={giveaway.donor.fullName}
                              width={20}
                              height={20}
                              className="rounded-full object-cover"
                            />
                          ) : (
                            <User size={10} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                            Donor: {giveaway.donor?.fullName || "CUET Member"}
                          </p>
                          {giveaway.donor?.department && (
                            <p className="truncate text-[10px] text-slate-400">
                              {giveaway.donor.department}{giveaway.donor.hall ? ` • ${giveaway.donor.hall}` : ""}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                        <MapPin size={11} className="shrink-0 text-slate-400" />
                        <span className="truncate">
                          {giveaway.location}{giveaway.pickupSpot ? ` — ${giveaway.pickupSpot}` : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ── Detailed Listing Analytics Table ── */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-2">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Listing Performance & Demand Analytics
            </h2>
            <p className="text-xs text-slate-500">
              Breakdown of ad clicks, student wishlist saves, and active inventory status
            </p>
          </div>
          {/* Shop owners have no Listings page - they manage products here */}
          {user?.role !== "shop_owner" && (
            <Link
              href="/my-listings"
              className="text-xs font-semibold text-brand-emerald hover:underline inline-flex items-center gap-1 shrink-0"
            >
              Manage All Listings ({products.length}) <ArrowRight size={13} />
            </Link>
          )}
        </div>

        {loading ? (
          <div className="flex py-16 items-center justify-center text-sm text-slate-500">
            <RefreshCw size={20} className="animate-spin mr-2 text-brand-emerald" />
            Analyzing your products...
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-400">
              <ShoppingBag size={30} />
            </div>
            <h3 className="mt-4 font-semibold text-slate-800 dark:text-slate-200">
              No Listings Found
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Start posting your gadgets, textbooks, drawing tools, or cycles to track live buyer demand and ad clicks here.
            </p>
            <div className="mt-5">
              <Button variant="primary" onClick={() => setIsSellOpen(true)} className="text-xs">
                <PlusCircle size={15} className="mr-1.5" />
                List Your First Item
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Mobile Card View: All options visible at once, no horizontal scrolling needed */}
            <div className="mt-3 space-y-2.5 md:hidden">
              {products.map((item) => {
                const firstImg = item.images?.[0];
                const imgSrc =
                  typeof firstImg === "string"
                    ? firstImg
                    : firstImg?.thumbnailUrl || firstImg?.url || "";

                return (
                  <div
                    key={item._id}
                    className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-3 shadow-sm space-y-2.5"
                  >
                    {/* Top Row: Thumbnail + Title + Status */}
                    <div className="flex items-start gap-2.5">
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                        {imgSrc ? (
                          imgSrc.startsWith("data:") ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={imgSrc} alt={item.title} className="h-full w-full object-contain p-0.5" />
                          ) : (
                            <Image src={imgSrc} alt={item.title} fill className="object-contain p-0.5" sizes="56px" />
                          )
                        ) : (
                          <ShoppingBag size={20} className="text-slate-400" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-1">
                          <Link
                            href={`/marketplace/${item._id}`}
                            className="font-semibold text-xs text-slate-900 dark:text-slate-100 hover:text-brand-emerald line-clamp-2"
                          >
                            {item.title}
                          </Link>
                          <span
                            className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                              item.status === "active"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : item.status === "sold"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {item.category} • {item.condition}
                        </p>
                      </div>
                    </div>

                    {/* Middle Row: Price & Metrics (Ad Clicks & Saves) */}
                    <div className="flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-2 text-xs">
                      <div>
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                          ৳{item.price.toLocaleString()}
                        </span>
                        {item.originalPrice && Number(item.originalPrice) > Number(item.price) && (
                          <span className="ml-1.5 text-[10px] text-slate-400 line-through">
                            ৳{Number(item.originalPrice).toLocaleString()}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className="inline-flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full text-[10px]"
                          title={`${item.viewsCount} total clicks by ${item.uniqueViewsCount ?? (item.viewsCount > 0 ? 1 : 0)} unique users`}
                        >
                          <Eye size={11} />
                          {item.viewsCount}
                          <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400 border-l border-blue-200 dark:border-blue-800 pl-1 ml-0.5">
                            {item.uniqueViewsCount ?? (item.viewsCount > 0 ? 1 : 0)}u
                          </span>
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[10px] ${
                            item.wishlistCount > 0
                              ? "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300"
                              : "bg-slate-100 text-slate-400 dark:bg-slate-800"
                          }`}
                        >
                          <Heart
                            size={11}
                            className={item.wishlistCount > 0 ? "fill-rose-500 text-rose-500" : ""}
                          />
                          {item.wishlistCount}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Row: Actions (No sideways scroll, full visibility) */}
                    <div className="grid grid-cols-2 gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-2">
                      {item.status === "active" ? (
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item._id, "sold")}
                          disabled={statusUpdatingId === item._id}
                          className="w-full rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 py-1.5 text-xs font-semibold transition text-center"
                        >
                          Mark Sold
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item._id, "active")}
                          disabled={statusUpdatingId === item._id}
                          className="w-full rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 py-1.5 text-xs font-semibold transition text-center"
                        >
                          Re-activate
                        </button>
                      )}
                      <Link
                        href={`/marketplace/${item._id}`}
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center justify-center gap-1 text-center"
                      >
                        <ExternalLink size={12} /> View Ad
                      </Link>
                      <button
                        type="button"
                        onClick={() => setEditingProduct(item)}
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center justify-center gap-1"
                      >
                        <Edit3 size={12} /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(item._id, item.title)}
                        disabled={deletingId === item._id}
                        className="w-full rounded-lg border border-rose-200 dark:border-rose-900/60 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 inline-flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        {deletingId === item._id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (Retained for md and larger screens) */}
            <div className="mt-4 hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-2 font-bold">Product</th>
                    <th className="py-3 px-3 font-bold">Price</th>
                    <th className="py-3 px-3 font-bold text-center">Ad Clicks & Visitors</th>
                    <th className="py-3 px-3 font-bold text-center">Wishlists</th>
                    <th className="py-3 px-3 font-bold">Status</th>
                    <th className="py-3 px-2 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {products.map((item) => {
                    const firstImg = item.images?.[0];
                    const imgSrc =
                      typeof firstImg === "string"
                        ? firstImg
                        : firstImg?.thumbnailUrl || firstImg?.url || "";

                    return (
                      <tr key={item._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                        {/* Product Column */}
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-3 min-w-[220px]">
                            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                              {imgSrc ? (
                                imgSrc.startsWith("data:") ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={imgSrc} alt={item.title} className="h-full w-full object-contain p-0.5" />
                                ) : (
                                  <Image src={imgSrc} alt={item.title} fill className="object-contain p-0.5" sizes="48px" />
                                )
                              ) : (
                                <ShoppingBag size={18} className="text-slate-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <Link
                                href={`/marketplace/${item._id}`}
                                className="font-semibold text-slate-900 dark:text-slate-100 hover:text-brand-emerald hover:underline line-clamp-1"
                              >
                                {item.title}
                              </Link>
                              <p className="text-[11px] text-slate-400">
                                {item.category} • {item.condition}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Price Column */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="font-bold text-slate-900 dark:text-white">
                            ৳{item.price.toLocaleString()}
                          </span>
                          {item.originalPrice && Number(item.originalPrice) > Number(item.price) && (
                            <span className="block text-[10px] text-slate-400 line-through">
                              ৳{Number(item.originalPrice).toLocaleString()}
                            </span>
                          )}
                        </td>

                        {/* Ad Clicks & Visitors Column */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <div className="inline-flex flex-col items-center gap-0.5">
                            <span className="inline-flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full text-xs" title="Total clicks">
                              <Eye size={12} />
                              {item.viewsCount} {item.viewsCount === 1 ? "click" : "clicks"}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400" title="Unique users">
                              <Users size={11} className="text-blue-400" />
                              {item.uniqueViewsCount ?? (item.viewsCount > 0 ? 1 : 0)} unique
                            </span>
                          </div>
                        </td>

                        {/* Wishlist Column */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-xs ${
                              item.wishlistCount > 0
                                ? "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300 ring-1 ring-rose-500/20"
                                : "bg-slate-100 text-slate-400 dark:bg-slate-800"
                            }`}
                          >
                            <Heart
                              size={12}
                              className={item.wishlistCount > 0 ? "fill-rose-500 text-rose-500" : ""}
                            />
                            {item.wishlistCount} {item.wishlistCount === 1 ? "save" : "saves"}
                          </span>
                        </td>

                        {/* Status Column */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                              item.status === "active"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : item.status === "sold"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>

                        {/* Actions Column */}
                        <td className="py-3 px-2 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {item.status === "active" ? (
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(item._id, "sold")}
                                disabled={statusUpdatingId === item._id}
                                className="rounded bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 px-2 py-1 text-[10px] font-semibold transition"
                              >
                                Mark Sold
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(item._id, "active")}
                                disabled={statusUpdatingId === item._id}
                                className="rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-1 text-[10px] font-semibold transition"
                              >
                                Re-activate
                              </button>
                            )}
                            <Link
                              href={`/marketplace/${item._id}`}
                              className="rounded border border-slate-200 dark:border-slate-700 px-2 py-1 text-[10px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-0.5"
                            >
                              <ExternalLink size={10} /> View
                            </Link>
                            <button
                              type="button"
                              onClick={() => setEditingProduct(item)}
                              className="rounded border border-slate-200 dark:border-slate-700 px-2 py-1 text-[10px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-0.5"
                            >
                              <Edit3 size={10} /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(item._id, item.title)}
                              disabled={deletingId === item._id}
                              className="rounded border border-rose-200 dark:border-rose-900/60 px-2 py-1 text-[10px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 inline-flex items-center gap-0.5 disabled:opacity-50"
                            >
                              {deletingId === item._id ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />} Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      <SellModal
        isOpen={isSellOpen}
        onClose={() => setIsSellOpen(false)}
        onSuccess={() => fetchDashboardData()}
      />

      <EditProductModal
        isOpen={Boolean(editingProduct)}
        product={editingProduct}
        onClose={() => setEditingProduct(null)}
        onUpdated={() => {
          setEditingProduct(null);
          fetchDashboardData();
        }}
      />
    </div>
  );
}
