"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Package,
  TrendingUp,
  CheckCircle2,
  Eye,
  PlusCircle,
  ShoppingBag,
  ExternalLink,
  MessageSquare,
  Sparkles,
  ArrowRight,
  LogIn,
  RefreshCw,
  Clock
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SellModal } from "@/components/marketplace/sell-modal";

type ProductListing = {
  _id: string;
  title: string;
  price: number;
  category: string;
  condition: string;
  status: "active" | "sold" | "reserved" | "removed_by_admin";
  images: Array<{ url?: string; thumbnailUrl?: string } | string>;
  viewsCount?: number;
  createdAt: string;
};

type UserProfile = {
  _id: string;
  fullName: string;
  email: string;
  role: string;
  department?: string;
  hall?: string;
  rating?: number;
  totalProductsSold?: number;
};

export default function SellerDashboardPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [listings, setListings] = useState<ProductListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSellOpen, setIsSellOpen] = useState(false);

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

      // Fetch user's real listings
      const res = await fetch("http://localhost:5000/api/products/my-listings", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.products)) {
          setListings(data.products);
        }
      }
    } catch {
      // Backend offline or fetch error — keep empty array
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Calculate real metrics
  const totalProducts = listings.length;
  const activeProducts = listings.filter((p) => p.status === "active").length;
  const soldProducts = listings.filter((p) => p.status === "sold").length;
  const totalRevenue = listings
    .filter((p) => p.status === "sold")
    .reduce((sum, p) => sum + (Number(p.price) || 0), 0);
  const totalViews = listings.reduce((sum, p) => sum + (p.viewsCount || 0), 0);

  const recentListings = [...listings]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

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
            Please log in with your CUET account to access your personalized seller dashboard and live analytics.
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Seller Dashboard"
          description={
            user?.fullName
              ? `Welcome back, ${user.fullName}. Track your sales, listings, and campus trade activity.`
              : "Analytics, inventory, listings, and performance insights."
          }
        />
        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboardData}
            className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            title="Refresh statistics"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
          <Button
            variant="primary"
            onClick={() => setIsSellOpen(true)}
            className="text-xs"
          >
            <PlusCircle size={15} className="mr-1.5" />
            <span>New Listing</span>
          </Button>
        </div>
      </div>

      {/* Real Live Metrics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Revenue
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-white">
              ৳ {totalRevenue.toLocaleString("en-IN")}
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
            <Package size={24} />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active Listings
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-white">
              {activeProducts}
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Items Sold
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-white">
              {soldProducts}
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
            <Eye size={24} />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Listing Views
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-white">
              {totalViews}
            </p>
          </div>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Listings or Empty State */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-700/60">
            <div>
              <h2 className="font-display text-lg font-bold">Recent Listings</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Your latest items listed on CUET E-Bazar
              </p>
            </div>
            {listings.length > 0 && (
              <Link
                href="/my-listings"
                className="flex items-center gap-1 text-xs font-semibold text-brand-emerald hover:underline"
              >
                View all ({totalProducts})
                <ArrowRight size={14} />
              </Link>
            )}
          </div>

          {loading ? (
            <div className="flex py-12 items-center justify-center text-sm text-slate-500">
              <RefreshCw size={18} className="animate-spin mr-2" />
              Loading your dashboard...
            </div>
          ) : listings.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
                <ShoppingBag size={28} />
              </div>
              <h3 className="mt-3 font-semibold text-slate-800 dark:text-slate-200">
                No Listings Yet
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                You haven&apos;t listed any items for sale or trade yet. Start earning by posting your books, electronics, or dorm essentials.
              </p>
              <div className="mt-5">
                <Button variant="primary" onClick={() => setIsSellOpen(true)} className="text-xs">
                  <PlusCircle size={15} className="mr-1.5" />
                  List Your First Product
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
              {recentListings.map((item) => {
                const firstImg = item.images?.[0];
                const imgSrc = typeof firstImg === "string" ? firstImg : firstImg?.thumbnailUrl || firstImg?.url || "";

                return (
                  <div key={item._id} className="flex items-center justify-between py-3.5 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        {imgSrc ? (
                          imgSrc.startsWith("data:") ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={imgSrc} alt={item.title} className="h-full w-full object-cover" />
                          ) : (
                            <Image src={imgSrc} alt={item.title} fill className="object-cover" sizes="48px" />
                          )
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-slate-400">
                            <ShoppingBag size={18} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {item.title}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>{item.category}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock size={11} />
                            {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="font-semibold text-sm text-brand-emerald">
                          ৳ {item.price.toLocaleString("en-IN")}
                        </p>
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            item.status === "active"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : item.status === "sold"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {item.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Quick Links & Tips */}
        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="font-display font-bold text-sm uppercase tracking-wide text-slate-700 dark:text-slate-300">
              Quick Navigation
            </h3>
            <div className="mt-3 space-y-2">
              <Link
                href="/my-listings"
                className="flex items-center justify-between rounded-lg border border-slate-100 p-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-brand-emerald dark:border-slate-700/60 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <div className="flex items-center gap-2">
                  <Package size={16} />
                  <span>Manage My Listings</span>
                </div>
                <ArrowRight size={14} />
              </Link>
              <Link
                href="/messages"
                className="flex items-center justify-between rounded-lg border border-slate-100 p-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-brand-emerald dark:border-slate-700/60 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <div className="flex items-center gap-2">
                  <MessageSquare size={16} />
                  <span>Buyer Messages</span>
                </div>
                <ArrowRight size={14} />
              </Link>
              <Link
                href="/settings"
                className="flex items-center justify-between rounded-lg border border-slate-100 p-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-brand-emerald dark:border-slate-700/60 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <div className="flex items-center gap-2">
                  <Sparkles size={16} />
                  <span>Account Settings</span>
                </div>
                <ArrowRight size={14} />
              </Link>
            </div>
          </Card>

          <Card className="p-5 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border-brand-emerald/20">
            <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Sparkles size={16} className="text-brand-emerald" />
              Campus Seller Tip
            </h4>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Meeting at well-known spots like <strong>TSC Cafeteria</strong>, <strong>Shaheed Minar</strong>, or your <strong>Hall Gate</strong> ensures safe and fast product handovers between CUETians.
            </p>
          </Card>
        </div>
      </div>

      <SellModal
        isOpen={isSellOpen}
        onClose={() => setIsSellOpen(false)}
        onSuccess={() => fetchDashboardData()}
      />
    </div>
  );
}
