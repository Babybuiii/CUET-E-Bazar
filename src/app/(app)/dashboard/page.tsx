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
  ArrowRight,
  LogIn,
  RefreshCw,
  Heart,
  Gift,
  MapPin,
  Clock,
  User,
  Edit3,
  Trash2,
  Loader2,
  MessageSquare
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SellModal } from "@/components/marketplace/sell-modal";
import { EditProductModal } from "@/components/marketplace/edit-product-modal";
import { OfferGiveawayModal } from "@/components/giveaways/OfferGiveawayModal";
import {
  fetchMyGiveaways,
  fetchMyClaims,
  unclaimGiveaway,
  markGivenAway,
  approveClaim,
  cancelGiveaway,
  initiateContact
} from "@/hooks/useGiveaways";
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
  const [donatedGiveaways, setDonatedGiveaways] = useState<Giveaway[]>([]);
  const [giveawayTab, setGiveawayTab] = useState<"donating" | "claimed">("donating");
  const [isOfferOpen, setIsOfferOpen] = useState(false);
  const [giveawayActionId, setGiveawayActionId] = useState<string | null>(null);

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

      // Fetch giveaways (both claimed & donated) in parallel
      try {
        const [claimsData, donatedData] = await Promise.all([
          fetchMyClaims(),
          fetchMyGiveaways()
        ]);
        if (claimsData.success && Array.isArray(claimsData.giveaways)) {
          setClaimedGiveaways(claimsData.giveaways);
        }
        if (donatedData.success && Array.isArray(donatedData.giveaways)) {
          setDonatedGiveaways(donatedData.giveaways);
        }
      } catch (giveErr) {
        console.warn("Failed to load user giveaways:", giveErr);
      }

      // Fetch comprehensive seller analytics
      const res = await fetch(`${API_BASE_URL}/api/products/user/dashboard-analytics`, {
        headers: { Authorization: `Bearer ${token}` }
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
        headers: { Authorization: `Bearer ${token}` }
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
    if (!confirm(`Are you sure you want to permanently delete "${title}"?`)) return;

    const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
    if (!token) return;

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
        alert(data.message || "Failed to delete product.");
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
        fetchDashboardData();
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setStatusUpdatingId(null);
    }
  };

  // ── Giveaway actions ────────────────────────────────────────────────────────
  const handleUnclaimItem = async (giveawayId: string) => {
    try {
      setGiveawayActionId(giveawayId);
      const res = await unclaimGiveaway(giveawayId);
      if (res.success) {
        fetchDashboardData();
      } else {
        alert(res.message || "Failed to unclaim item.");
      }
    } catch {
      alert("Failed to unclaim item.");
    } finally {
      setGiveawayActionId(null);
    }
  };

  const handleApproveClaim = async (giveawayId: string) => {
    try {
      setGiveawayActionId(giveawayId);
      const res = await approveClaim(giveawayId);
      if (res.success) {
        fetchDashboardData();
      } else {
        alert(res.message || "Failed to approve claim.");
      }
    } catch {
      alert("Failed to approve claim.");
    } finally {
      setGiveawayActionId(null);
    }
  };

  const handleMarkGivenAway = async (giveawayId: string) => {
    try {
      setGiveawayActionId(giveawayId);
      const res = await markGivenAway(giveawayId);
      if (res.success) {
        fetchDashboardData();
      } else {
        alert(res.message || "Failed to mark item.");
      }
    } catch {
      alert("Failed to mark item as given away.");
    } finally {
      setGiveawayActionId(null);
    }
  };

  const handleCancelDonation = async (giveawayId: string) => {
    if (!confirm("Are you sure you want to unpublish this giveaway?")) return;
    try {
      setGiveawayActionId(giveawayId);
      const res = await cancelGiveaway(giveawayId);
      if (res.success) {
        fetchDashboardData();
      } else {
        alert(res.message || "Failed to unpublish.");
      }
    } catch {
      alert("Failed to unpublish giveaway.");
    } finally {
      setGiveawayActionId(null);
    }
  };

  const handleMessageGiveawayContact = async (giveawayId: string) => {
    try {
      setGiveawayActionId(giveawayId);
      const res = await initiateContact(giveawayId);
      if (res.success && res.conversationId) {
        router.push(`/messages?conversationId=${res.conversationId}`);
      } else {
        alert(res.message || "Failed to start conversation.");
      }
    } catch {
      alert("Failed to start conversation.");
    } finally {
      setGiveawayActionId(null);
    }
  };

  if (!loading && !isLoggedIn) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="User Dashboard"
          description="View your marketplace inventory, analytics, and giveaway activity."
        />
        <Card className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
            <LogIn size={28} />
          </div>
          <h2 className="mt-4 font-display text-xl font-bold text-slate-900 dark:text-white">Sign In Required</h2>
          <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
            Please log in with your CUET account to manage your listings, giveaways, and performance metrics.
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
          title="Dashboard"
          description={
            user?.fullName
              ? `Welcome back, ${user.fullName}. Monitor your marketplace activity and manage community giveaways.`
              : "Overview of your listings, sales, and giveaway activity."
          }
        />
        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboardData}
            className="focus-ring inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition"
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

      {/* ── Summary KPI Cards (Clean, Solid, Brand Themed - No Rainbow Colors) ── */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Card className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Listings</p>
          <p className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            {analytics.activeListings}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">Live on marketplace</p>
        </Card>

        <Card className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Items Sold</p>
          <p className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            {analytics.soldItems}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">{analytics.conversionRate}% conversion rate</p>
        </Card>

        <Card className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Revenue</p>
          <p className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            ৳{analytics.totalRevenue.toLocaleString()}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">From completed sales</p>
        </Card>

        <Card className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Listing Impressions</p>
          <p className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            {analytics.totalAdClicks}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">{analytics.totalWishlists} wishlist saves</p>
        </Card>
      </div>

      {/* ── Giveaway Management (Both Donated & Claimed Items) ── */}
      <Card className="p-4 sm:p-6 space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Giveaway Management
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage items you are giving away and track items you have claimed.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsOfferOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-emerald px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-emerald/90 transition shadow-sm"
            >
              <PlusCircle size={14} />
              <span>Offer a Giveaway</span>
            </button>
            <Link
              href="/giveaways"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-emerald hover:underline"
            >
              Public Page <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
          <button
            onClick={() => setGiveawayTab("donating")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              giveawayTab === "donating"
                ? "bg-brand-emerald text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            Items I&apos;m Donating ({donatedGiveaways.length})
          </button>
          <button
            onClick={() => setGiveawayTab("claimed")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              giveawayTab === "claimed"
                ? "bg-brand-emerald text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            Items I&apos;ve Claimed ({claimedGiveaways.length})
          </button>
        </div>

        {/* Tab 1: Items I'm Donating */}
        {giveawayTab === "donating" && (
          <div>
            {donatedGiveaways.length === 0 ? (
              <div className="py-8 text-center">
                <Gift size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-xs text-slate-500">You haven&apos;t posted any giveaways yet.</p>
                <button
                  onClick={() => setIsOfferOpen(true)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                >
                  <PlusCircle size={13} /> Offer your first giveaway
                </button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {donatedGiveaways.map((item) => {
                  const displayImg = item.images?.[0] || null;
                  const isActionLoading = giveawayActionId === item._id;

                  return (
                    <div
                      key={item._id}
                      className="flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-sm space-y-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start gap-3">
                          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            {displayImg ? (
                              <Image
                                src={displayImg}
                                alt={item.title}
                                fill
                                className="object-cover"
                                unoptimized={displayImg.includes("cloudinary.com") || displayImg.startsWith("data:")}
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-slate-400">
                                <Gift size={20} />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span
                                className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                                  item.status === "available"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                    : item.status === "pending"
                                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                    : item.status === "claimed"
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                                    : item.status === "given_away"
                                    ? "bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {item.status.replace("_", " ")}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(item.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <h4 className="mt-1 line-clamp-1 text-xs font-bold text-slate-900 dark:text-white">
                              {item.title}
                            </h4>
                            <p className="text-[10px] text-slate-400 truncate">
                              {item.category} • {item.location}
                            </p>
                          </div>
                        </div>

                        {/* Claimant Info if pending or claimed */}
                        {(item.status === "pending" || item.status === "claimed") && item.selectedUser && (
                          <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-2 text-xs">
                            <p className="text-[10px] text-slate-400">
                              {item.status === "pending" ? "Claim requested by:" : "Claimed by:"}
                            </p>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">
                              {item.selectedUser.fullName}
                              {item.selectedUser.department && (
                                <span className="text-[10px] text-slate-400 font-normal ml-1">
                                  ({item.selectedUser.department})
                                </span>
                              )}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Donor Management Actions */}
                      <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 dark:border-slate-800 pt-2.5">
                        {item.status === "pending" && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApproveClaim(item._id)}
                              disabled={isActionLoading}
                              className="rounded-lg bg-brand-emerald px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-brand-emerald/90 transition flex items-center gap-1 shadow-sm"
                            >
                              <CheckCircle2 size={12} />
                              Approve Claim
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUnclaimItem(item._id)}
                              disabled={isActionLoading}
                              className="rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            >
                              Decline
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMessageGiveawayContact(item._id)}
                              disabled={isActionLoading}
                              className="rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            >
                              Message
                            </button>
                          </>
                        )}
                        {item.status === "claimed" && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleMarkGivenAway(item._id)}
                              disabled={isActionLoading}
                              className="rounded-lg bg-brand-emerald px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-brand-emerald/90 transition"
                            >
                              Mark Given Away
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUnclaimItem(item._id)}
                              disabled={isActionLoading}
                              className="rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            >
                              Mark Unclaimed
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMessageGiveawayContact(item._id)}
                              disabled={isActionLoading}
                              className="rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            >
                              Message
                            </button>
                          </>
                        )}
                        {item.status === "available" && (
                          <button
                            type="button"
                            onClick={() => handleCancelDonation(item._id)}
                            disabled={isActionLoading}
                            className="rounded-lg border border-rose-200 dark:border-rose-900/60 px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                          >
                            Unpublish
                          </button>
                        )}
                        {item.status === "given_away" && (
                          <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400">
                            Completed & Handed Over
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Items I've Claimed */}
        {giveawayTab === "claimed" && (
          <div>
            {claimedGiveaways.length === 0 ? (
              <div className="py-8 text-center">
                <Gift size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-xs text-slate-500">You haven&apos;t claimed any giveaways yet.</p>
                <Link
                  href="/giveaways"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                >
                  Explore Giveaways
                </Link>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {claimedGiveaways.map((item) => {
                  const displayImg = item.images?.[0] || null;
                  const isActionLoading = giveawayActionId === item._id;

                  return (
                    <div
                      key={item._id}
                      className="flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-sm space-y-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start gap-3">
                          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            {displayImg ? (
                              <Image
                                src={displayImg}
                                alt={item.title}
                                fill
                                className="object-cover"
                                unoptimized={displayImg.includes("cloudinary.com") || displayImg.startsWith("data:")}
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-slate-400">
                                <Gift size={20} />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                                item.status === "pending"
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                  : item.status === "claimed"
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                                  : item.status === "given_away"
                                  ? "bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300"
                                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              }`}
                            >
                              {item.status === "pending" ? "Pending Approval" : item.status.replace("_", " ")}
                            </span>
                            <h4 className="mt-1 line-clamp-1 text-xs font-bold text-slate-900 dark:text-white">
                              {item.title}
                            </h4>
                            <p className="text-[10px] text-slate-400 truncate">
                              Donor: {item.donor?.fullName || "CUET Member"}
                            </p>
                          </div>
                        </div>

                        {/* Location Details */}
                        <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-2 text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5">
                          <p className="truncate">
                            <strong>Pickup:</strong> {item.location} {item.pickupSpot ? `(${item.pickupSpot})` : ""}
                          </p>
                        </div>
                      </div>

                      {/* Claimant Actions: Unclaim & Message */}
                      <div className="flex items-center gap-2 border-t border-slate-100 dark:border-slate-800 pt-2.5">
                        <button
                          type="button"
                          onClick={() => handleUnclaimItem(item._id)}
                          disabled={isActionLoading}
                          className="rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                        >
                          Unclaim
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMessageGiveawayContact(item._id)}
                          disabled={isActionLoading}
                          className="rounded-lg bg-brand-emerald px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-brand-emerald/90 transition"
                        >
                          Message Donor
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ── Detailed Listing Analytics Table ── */}
      <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-2">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              My Listings & Inventory
            </h2>
            <p className="text-xs text-slate-500">
              Manage your active and sold products, view analytics, and update status.
            </p>
          </div>
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
            Loading listings...
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400">
              <ShoppingBag size={28} />
            </div>
            <h3 className="mt-4 font-semibold text-slate-800 dark:text-slate-200">
              No Listings Found
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Post textbooks, drawing instruments, calculators, cycles or gadgets to sell to campus peers.
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
            {/* Mobile Card View */}
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
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm space-y-2.5"
                  >
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
                                ? "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
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

                    <div className="flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 pt-2 text-xs">
                      <div>
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          ৳{item.price.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Eye size={11} /> {item.viewsCount}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Heart size={11} /> {item.wishlistCount}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 border-t border-slate-100 dark:border-slate-800 pt-2">
                      {item.status === "active" ? (
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item._id, "sold")}
                          disabled={statusUpdatingId === item._id}
                          className="rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 py-1 text-[11px] font-semibold transition"
                        >
                          Mark Sold
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item._id, "active")}
                          disabled={statusUpdatingId === item._id}
                          className="rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 py-1 text-[11px] font-semibold transition"
                        >
                          Re-activate
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setEditingProduct(item)}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table */}
            <div className="mt-4 hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                    <th className="py-2.5 px-2 font-semibold">Product</th>
                    <th className="py-2.5 px-3 font-semibold">Price</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Views</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Saves</th>
                    <th className="py-2.5 px-3 font-semibold">Status</th>
                    <th className="py-2.5 px-2 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {products.map((item) => {
                    const firstImg = item.images?.[0];
                    const imgSrc =
                      typeof firstImg === "string"
                        ? firstImg
                        : firstImg?.thumbnailUrl || firstImg?.url || "";

                    return (
                      <tr key={item._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-3 min-w-[200px]">
                            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                              {imgSrc ? (
                                imgSrc.startsWith("data:") ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={imgSrc} alt={item.title} className="h-full w-full object-contain p-0.5" />
                                ) : (
                                  <Image src={imgSrc} alt={item.title} fill className="object-contain p-0.5" sizes="44px" />
                                )
                              ) : (
                                <ShoppingBag size={18} className="text-slate-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <Link
                                href={`/marketplace/${item._id}`}
                                className="font-semibold text-slate-900 dark:text-slate-100 hover:text-brand-emerald line-clamp-1"
                              >
                                {item.title}
                              </Link>
                              <p className="text-[11px] text-slate-400">
                                {item.category} • {item.condition}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          ৳{item.price.toLocaleString()}
                        </td>

                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {item.viewsCount}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {item.wishlistCount}
                          </span>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              item.status === "active"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : item.status === "sold"
                                ? "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>

                        <td className="py-3 px-2 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {item.status === "active" ? (
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(item._id, "sold")}
                                disabled={statusUpdatingId === item._id}
                                className="rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 px-2 py-1 text-[11px] font-semibold transition"
                              >
                                Mark Sold
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(item._id, "active")}
                                disabled={statusUpdatingId === item._id}
                                className="rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-1 text-[11px] font-semibold transition"
                              >
                                Re-activate
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setEditingProduct(item)}
                              className="rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-0.5"
                            >
                              <Edit3 size={11} /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(item._id, item.title)}
                              disabled={deletingId === item._id}
                              className="rounded-lg border border-rose-200 dark:border-rose-900/60 px-2 py-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 inline-flex items-center gap-0.5 disabled:opacity-50"
                            >
                              {deletingId === item._id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />} Delete
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

      <OfferGiveawayModal
        isOpen={isOfferOpen}
        onClose={() => setIsOfferOpen(false)}
        onSuccess={() => fetchDashboardData()}
      />
    </div>
  );
}
