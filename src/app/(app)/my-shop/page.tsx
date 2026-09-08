"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Loader2, AlertCircle, LogIn, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ShopPublicView,
  type PublicShop,
  type PublicShopProduct,
  type PublicCategoryCount
} from "@/components/shops/shop-public-view";
import { API_BASE_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function MyShopPage() {
  const { user } = useAuth();
  const isShopOwner = user?.role === "shop_owner";

  const [shop, setShop] = useState<PublicShop | null>(null);
  const [products, setProducts] = useState<PublicShopProduct[]>([]);
  const [categories, setCategories] = useState<PublicCategoryCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchShop = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
      if (!token) {
        setIsLoggedIn(false);
        setLoading(false);
        return;
      }
      setIsLoggedIn(true);

      // Resolve which shop belongs to this owner
      const mine = await fetch(`${API_BASE_URL}/api/shops/my-shop`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const mineData = await mine.json();

      if (!mine.ok || !mineData.success) {
        setError(mineData.message || "Could not load your shop.");
        return;
      }

      // Then read the public endpoint, so this page shows exactly what
      // visitors see - active products only, public counts, nothing owner-only
      const slug = mineData.shop.slug || mineData.shop._id;
      const pub = await fetch(`${API_BASE_URL}/api/shops/${slug}`);
      const pubData = await pub.json();

      if (!pub.ok || !pubData.success) {
        setError(pubData.message || "Could not load your public shop page.");
        return;
      }

      setShop(pubData.shop);
      setProducts(pubData.products || []);
      setCategories(pubData.categoryBreakdown || []);
    } catch {
      setError("Could not reach the server. Check that the API is running on port 5000.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShop();
  }, [fetchShop]);

  // ── Logged out ──
  if (!loading && !isLoggedIn) {
    return (
      <Card className="glass mx-auto mt-10 max-w-md text-center">
        <LogIn className="mx-auto mb-3 text-brand-emerald" size={32} />
        <h2 className="font-display text-xl font-bold">Sign in to view your shop</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Your shop page is only available to shop owner accounts.
        </p>
        <Link href="/login" className="mt-5 inline-block">
          <Button>Go to Login</Button>
        </Link>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-brand-emerald" size={30} />
      </div>
    );
  }

  // ── Not a shop owner, or no shop linked ──
  if (error || !shop) {
    return (
      <Card className="glass mx-auto mt-10 max-w-lg text-center">
        <AlertCircle className="mx-auto mb-3 text-amber-500" size={32} />
        <h2 className="font-display text-xl font-bold">Shop page unavailable</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{error}</p>
        <div className="mt-5 flex justify-center gap-2">
          <Button onClick={fetchShop}>
            <RefreshCw size={15} className="mr-1.5" /> Retry
          </Button>
          {/* Shop owners are redirected away from /home, so send them to the dashboard */}
          <Link href={isShopOwner ? "/dashboard" : "/home"}>
            <Button variant="ghost">{isShopOwner ? "Back to Dashboard" : "Back to Home"}</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <PageHeader title="My Shop" />
      <ShopPublicView shop={shop} products={products} categories={categories} preview />
    </div>
  );
}
