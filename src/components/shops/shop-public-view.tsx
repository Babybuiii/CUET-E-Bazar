"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Store,
  Star,
  Users,
  Package,
  MapPin,
  Clock,
  Phone,
  BadgeCheck,
  Loader2,
  Heart,
  Eye
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ProductImage = { url?: string; thumbnailUrl?: string };

export type PublicShopProduct = {
  _id: string;
  title: string;
  price: number;
  originalPrice?: number | null;
  category: string;
  condition: string;
  images: Array<ProductImage | string>;
  viewsCount: number;
  wishlistCount: number;
};

export type PublicShop = {
  _id: string;
  shopName: string;
  slug: string;
  category: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  contactNumber?: string;
  email?: string;
  location?: string;
  operatingHours?: { open: string; close: string };
  isVerified: boolean;
  rating: number;
  totalReviews: number;
  followersCount: number;
  activeProducts: number;
};

export type PublicCategoryCount = { category: string; count: number };

const imageOf = (images: Array<ProductImage | string> = []) => {
  if (!Array.isArray(images) || images.length === 0) return "";
  const cover = images.find(img => typeof img === "object" && (img as any)?.isCover) || images[0];
  return typeof cover === "string" ? cover : cover.thumbnailUrl || cover.url || "";
};

const taka = (n: number) => `৳${(n || 0).toLocaleString()}`;

/**
 * The shop exactly as visitors see it. Shared by the public shop page and the
 * owner's My Shop preview so the two cannot drift apart.
 *
 * `preview` renders the owner's own view: the Follow button is inert, since
 * following your own shop is meaningless.
 */
export function ShopPublicView({
  shop,
  products,
  categories,
  preview = false,
  following = false,
  followBusy = false,
  onFollow
}: {
  shop: PublicShop;
  products: PublicShopProduct[];
  categories: PublicCategoryCount[];
  preview?: boolean;
  following?: boolean;
  followBusy?: boolean;
  onFollow?: () => void;
}) {
  const [activeCategory, setActiveCategory] = useState("All");

  const visibleProducts =
    activeCategory === "All" ? products : products.filter((p) => p.category === activeCategory);

  return (
    <div className="space-y-5">
      {/* ── Shop header ── */}
      <Card className="glass overflow-hidden p-0">
        <div className="h-24 w-full bg-gradient-to-r from-emerald-900 via-teal-900 to-[#131921] sm:h-32">
          {shop.bannerUrl && (
            <Image
              src={shop.bannerUrl}
              alt={`${shop.shopName} banner`}
              width={1200}
              height={200}
              className="h-full w-full object-cover"
            />
          )}
        </div>

        <div className="p-3.5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="-mt-10 flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-slate-100 dark:border-slate-800 dark:bg-slate-700">
                {shop.logoUrl ? (
                  <Image
                    src={shop.logoUrl}
                    alt={shop.shopName}
                    width={64}
                    height={64}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Store className="text-brand-emerald" size={26} />
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-xl font-bold sm:text-3xl">{shop.shopName}</h1>
                  {shop.isVerified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
                      <BadgeCheck size={13} /> Verified
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs font-semibold text-brand-emerald sm:text-sm">{shop.category}</p>
                {shop.description && (
                  <p className="mt-2 max-w-2xl text-xs text-slate-600 dark:text-slate-300 sm:text-sm">
                    {shop.description}
                  </p>
                )}
              </div>
            </div>

            <Button onClick={onFollow} disabled={preview || followBusy}>
              {followBusy ? (
                <Loader2 size={15} className="mr-1.5 animate-spin" />
              ) : (
                <Heart size={15} className={`mr-1.5 ${following ? "fill-current" : ""}`} />
              )}
              {following ? "Following" : "Follow Shop"}
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-200 pt-3.5 text-[11px] text-slate-500 dark:border-slate-700 dark:text-slate-400 sm:text-xs">
            <span className="inline-flex items-center gap-1">
              <Package size={13} /> {shop.activeProducts} product{shop.activeProducts === 1 ? "" : "s"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Star size={13} /> {shop.rating || 0} ({shop.totalReviews || 0} reviews)
            </span>
            <span className="inline-flex items-center gap-1">
              <Users size={13} /> {shop.followersCount || 0} followers
            </span>
            {shop.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={13} /> {shop.location}
              </span>
            )}
            {shop.operatingHours && (
              <span className="inline-flex items-center gap-1">
                <Clock size={13} /> {shop.operatingHours.open} – {shop.operatingHours.close}
              </span>
            )}
            {shop.contactNumber && (
              <span className="inline-flex items-center gap-1">
                <Phone size={13} /> {shop.contactNumber}
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* ── Category filter ── */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory("All")}
            className={`focus-ring rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeCategory === "All"
                ? "bg-brand-emerald text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
            }`}
          >
            All ({products.length})
          </button>
          {categories.map((c) => (
            <button
              key={c.category}
              onClick={() => setActiveCategory(c.category)}
              className={`focus-ring rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeCategory === c.category
                  ? "bg-brand-emerald text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
              }`}
            >
              {c.category} ({c.count})
            </button>
          ))}
        </div>
      )}

      {/* ── Products ── */}
      {visibleProducts.length === 0 ? (
        <Card className="text-center">
          <Store className="mx-auto mb-2 text-slate-400" size={28} />
          <p className="text-sm font-semibold">No products listed yet</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {preview
              ? "Add a product and it will show up here for visitors."
              : "This shop has not added any products in this category."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleProducts.map((p) => {
            const img = imageOf(p.images);
            return (
              <Link key={p._id} href={`/marketplace/${p._id}`}>
                <Card className="h-full overflow-hidden p-0 transition hover:-translate-y-1 hover:shadow-md">
                  <div className="relative aspect-square w-full bg-slate-100 dark:bg-slate-800">
                    {img ? (
                      <Image
                        src={img}
                        alt={p.title}
                        fill
                        sizes="(max-width: 640px) 100vw, 25vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package size={26} className="text-slate-400" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="truncate text-sm font-semibold">{p.title}</p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">{p.category}</p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="font-display text-base font-bold text-brand-emerald">{taka(p.price)}</span>
                      <span className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-0.5">
                          <Eye size={11} /> {p.viewsCount || 0}
                        </span>
                        <span className="inline-flex items-center gap-0.5">
                          <Heart size={11} /> {p.wishlistCount || 0}
                        </span>
                      </span>
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
