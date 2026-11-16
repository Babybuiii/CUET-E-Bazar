"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Heart, ShoppingBag, Loader2, ArrowRight, Trash2 } from "lucide-react";
import { ProductCard } from "@/components/marketplace/product-card";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fetchWishlistProducts, getLocalWishlistIds, saveLocalWishlistIds } from "@/lib/wishlist";

export default function WishlistPage() {
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWishlist = useCallback(async () => {
    try {
      setLoading(true);
      const items = await fetchWishlistProducts();
      setWishlistItems(items);
    } catch (err) {
      console.error("Failed to load wishlist:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWishlist();

    const handleWishlistChange = () => {
      const currentIds = getLocalWishlistIds();
      setWishlistItems((prev) =>
        prev.filter((item) => currentIds.includes(item._id || item.id))
      );
    };

    window.addEventListener("wishlist-updated", handleWishlistChange);
    return () => window.removeEventListener("wishlist-updated", handleWishlistChange);
  }, [loadWishlist]);

  const handleClearAll = () => {
    if (confirm("Are you sure you want to clear all items from your wishlist?")) {
      saveLocalWishlistIds([]);
      setWishlistItems([]);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="My Wishlist"
          description={
            loading
              ? "Loading your saved campus listings..."
              : wishlistItems.length > 0
              ? `${wishlistItems.length} product${
                  wishlistItems.length === 1 ? "" : "s"
                } saved for easy access and comparison.`
              : "Save items you are interested in by clicking the heart icon on any listing."
          }
        />

        {wishlistItems.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/marketplace">
              <Button variant="ghost" className="border border-slate-300 dark:border-slate-700 text-xs">
                Explore More Items <ArrowRight size={14} className="ml-1" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              onClick={handleClearAll}
              className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
            >
              <Trash2 size={14} className="mr-1" /> Clear All
            </Button>
          </div>
        )}
      </div>

      {/* ── Content States ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <Loader2 size={36} className="animate-spin text-brand-emerald" />
          <p className="mt-3 text-sm font-medium">Fetching your marked wishlist items...</p>
        </div>
      ) : wishlistItems.length === 0 ? (
        /* ── Empty State ── */
        <Card className="flex flex-col items-center justify-center py-20 px-4 text-center border-dashed border-2 bg-white dark:bg-slate-900 shadow-sm">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 shadow-inner">
            <Heart size={36} className="fill-rose-500/20" />
            <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-brand-emerald text-white text-[11px] font-bold">
              0
            </span>
          </div>

          <h3 className="mt-5 font-display text-2xl font-bold text-slate-900 dark:text-white">
            Your Wishlist is Empty
          </h3>
          <p className="mt-2 max-w-md text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            You haven&apos;t marked any listings yet. When browsing products, click the heart icon on any card or detail page to bookmark it here for later review or price comparison.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/marketplace">
              <Button className="border-brand-emerald bg-brand-emerald text-white hover:bg-[#0d665f] shadow-sm">
                <ShoppingBag size={16} className="mr-1.5" /> Browse Marketplace
              </Button>
            </Link>
            <Link href="/">
              <Button variant="ghost" className="border border-slate-300 dark:border-slate-700">Back to Home</Button>
            </Link>
          </div>
        </Card>
      ) : (
        /* ── Products Grid ── */
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {wishlistItems.map((product) => (
            <ProductCard
              key={product._id || product.id}
              product={product}
            />
          ))}
        </div>
      )}
    </div>
  );
}
