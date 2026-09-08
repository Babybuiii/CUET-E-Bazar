"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2, AlertCircle, ChevronLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ShopPublicView,
  type PublicShop,
  type PublicShopProduct,
  type PublicCategoryCount
} from "@/components/shops/shop-public-view";
import { API_BASE_URL } from "@/lib/api";

export default function ShopDetailsPage() {
  const params = useParams();
  const shopId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

  const [shop, setShop] = useState<PublicShop | null>(null);
  const [products, setProducts] = useState<PublicShopProduct[]>([]);
  const [categories, setCategories] = useState<PublicCategoryCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  const fetchShop = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/shops/${shopId}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || "Shop not found.");
        return;
      }
      setShop(data.shop);
      setProducts(data.products || []);
      setCategories(data.categoryBreakdown || []);
    } catch {
      setError("Could not reach the server. Check that the API is running on port 5000.");
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    fetchShop();
  }, [fetchShop]);

  const handleFollow = async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
    if (!token || !shop) return;

    setFollowBusy(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/shops/${shop._id}/follow`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setFollowing(data.following);
        setShop({ ...shop, followersCount: data.followersCount });
      }
    } catch {
      // Non-critical: leave the button state unchanged
    } finally {
      setFollowBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-brand-emerald" size={30} />
      </div>
    );
  }

  if (error || !shop) {
    return (
      <Card className="mx-auto mt-10 max-w-md text-center">
        <AlertCircle className="mx-auto mb-2 text-amber-500" size={30} />
        <h2 className="font-display text-lg font-bold">Shop not found</h2>
        <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">{error}</p>
        <Link href="/shops" className="mt-5 inline-block">
          <Button>Back to Campus Shops</Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Link
        href="/shops"
        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-brand-emerald dark:text-slate-400"
      >
        <ChevronLeft size={14} /> All campus shops
      </Link>

      <ShopPublicView
        shop={shop}
        products={products}
        categories={categories}
        following={following}
        followBusy={followBusy}
        onFollow={handleFollow}
      />
    </div>
  );
}
