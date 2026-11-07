"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Store,
  MapPin,
  Clock,
  Package,
  Search,
  CheckCircle2,
  ArrowRight,
  Loader2,
  AlertCircle,
  Filter
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { API_BASE_URL } from "@/lib/api";

type ShopOwner = {
  _id: string;
  fullName: string;
  email?: string;
  contactNumber?: string;
  avatarUrl?: string;
  department?: string;
  hall?: string;
  isVerified?: boolean;
};

type CampusShop = {
  _id: string;
  shopName: string;
  slug?: string;
  category: string;
  description?: string;
  bannerUrl?: string;
  logoUrl?: string;
  contactNumber?: string;
  email?: string;
  location: string;
  operatingHours?: {
    open?: string;
    close?: string;
  };
  isVerified?: boolean;
  rating?: number;
  totalReviews?: number;
  totalProducts?: number;
  followersCount?: number;
  owner?: ShopOwner;
};

const CATEGORIES = [
  "All Stores",
  "Food, Snacks & Cafeteria",
  "General Store & Grocery",
  "Books & Study Material",
  "Electronics & Gadgets",
  "Others"
];

export default function ShopsPage() {
  const [shops, setShops] = useState<CampusShop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Stores");

  const fetchShops = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE_URL}/api/shops`);
      const data = await res.json();
      if (data.success && Array.isArray(data.shops)) {
        setShops(data.shops);
      } else {
        setError(data.message || "Failed to load campus stores.");
      }
    } catch {
      setError("Unable to connect to server. Please ensure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShops();
  }, []);

  // Client-side instant filtering
  const filteredShops = shops.filter((shop) => {
    const matchesSearch =
      !searchQuery.trim() ||
      shop.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (shop.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (shop.location || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (shop.category || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === "All Stores" ||
      shop.category.toLowerCase().includes(selectedCategory.toLowerCase());

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campus Stores & Canteens"
        description="Browse registered CUET shops, canteens, stationery and student-run enterprises. Order directly for campus room delivery or quick pickup."
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stores by name, location, cafeteria..."
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-white outline-none focus:border-brand-emerald shadow-sm"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  isSelected
                    ? "bg-brand-emerald text-white shadow-sm"
                    : "border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-brand-emerald/40"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stores Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 size={36} className="animate-spin text-brand-emerald" />
          <p className="mt-3 text-sm font-medium">Loading campus stores...</p>
        </div>
      ) : error ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle size={36} className="text-rose-500" />
          <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-200">{error}</p>
          <Button onClick={fetchShops} className="mt-4 bg-brand-emerald text-white hover:bg-[#0d665f] text-xs">
            Try Again
          </Button>
        </Card>
      ) : filteredShops.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <div className="rounded-full bg-slate-100 dark:bg-slate-800 p-4 text-slate-400">
            <Store size={36} />
          </div>
          <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
            No Campus Stores Found
          </h3>
          <p className="text-xs text-slate-500 max-w-sm">
            {searchQuery || selectedCategory !== "All Stores"
              ? "No stores matched your current search or category filter. Try clearing your filters."
              : "No campus stores have registered yet."}
          </p>
          {(searchQuery || selectedCategory !== "All Stores") && (
            <Button
              variant="ghost"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("All Stores");
              }}
              className="border border-slate-200 dark:border-slate-700 text-xs"
            >
              Reset Filters
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredShops.map((shop) => {
            const hasBanner = Boolean(shop.bannerUrl && shop.bannerUrl.trim());
            const hasLogo = Boolean(shop.logoUrl && shop.logoUrl.trim());

            return (
              <Link key={shop._id} href={`/shops/${shop._id}`} className="group block">
                <Card className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800 transition duration-200 hover:-translate-y-1 hover:shadow-lg">
                  {/* Shop Banner */}
                  <div className="relative h-36 w-full overflow-hidden bg-gradient-to-r from-teal-900 to-slate-900">
                    {hasBanner ? (
                      <Image
                        src={shop.bannerUrl!}
                        alt={`${shop.shopName} banner`}
                        fill
                        unoptimized={shop.bannerUrl!.includes("cloudinary.com") || shop.bannerUrl!.startsWith("data:")}
                        className="object-cover transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-teal-800/80 to-slate-900">
                        <Store className="text-white/20" size={48} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                    {/* Category pill */}
                    <span className="absolute top-3 right-3 rounded-full bg-black/60 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-md border border-white/10">
                      {shop.category}
                    </span>
                  </div>

                  {/* Shop Profile & Meta */}
                  <div className="relative px-5 pt-3 pb-5">
                    {/* Floating Logo */}
                    <div className="absolute -top-9 left-5 h-16 w-16 overflow-hidden rounded-2xl border-2 border-white dark:border-slate-900 bg-white dark:bg-slate-800 shadow-md flex items-center justify-center">
                      {hasLogo ? (
                        <Image
                          src={shop.logoUrl!}
                          alt={shop.shopName}
                          fill
                          unoptimized={shop.logoUrl!.includes("cloudinary.com") || shop.logoUrl!.startsWith("data:")}
                          className="object-cover"
                        />
                      ) : (
                        <span className="text-xl font-extrabold text-brand-emerald">
                          {shop.shopName[0]?.toUpperCase() || "S"}
                        </span>
                      )}
                    </div>

                    <div className="pt-8">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white group-hover:text-brand-emerald transition">
                          {shop.shopName}
                        </h3>
                        {shop.isVerified && (
                          <span title="Verified Campus Shop">
                            <CheckCircle2 size={16} className="text-brand-emerald" />
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[32px]">
                        {shop.description || "Campus merchant serving CUET students and faculty with on-campus delivery and pickup."}
                      </p>

                      <div className="mt-4 space-y-1.5 text-xs text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800/80 pt-3">
                        <div className="flex items-center gap-2">
                          <MapPin size={13} className="text-brand-emerald shrink-0" />
                          <span className="truncate">{shop.location || "CUET Campus"}</span>
                        </div>

                        {shop.operatingHours && (
                          <div className="flex items-center gap-2 text-slate-500">
                            <Clock size={13} className="shrink-0" />
                            <span>
                              Open: {shop.operatingHours.open || "09:00"} - {shop.operatingHours.close || "21:00"}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Footer: Live Products count and Action */}
                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-emerald bg-brand-emerald/10 dark:bg-brand-emerald/20 px-2.5 py-1 rounded-lg">
                          <Package size={13} />
                          <span>{shop.totalProducts || 0} Products</span>
                        </div>

                        <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-emerald group-hover:translate-x-0.5 transition">
                          Visit Store <ArrowRight size={14} />
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
