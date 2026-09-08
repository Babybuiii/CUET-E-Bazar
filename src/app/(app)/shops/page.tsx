"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Store, Search, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ShopDirectoryCard, type DirectoryShop } from "@/components/shops/shop-directory-card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { API_BASE_URL } from "@/lib/api";

type Shop = DirectoryShop;

export default function ShopsPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchShops = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (category !== "All") params.set("category", category);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`${API_BASE_URL}/api/shops?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || "Could not load campus shops.");
        return;
      }
      setShops(data.shops || []);
    } catch {
      setError("Could not reach the server. Check that the API is running on port 5000.");
    } finally {
      setLoading(false);
    }
  }, [category, search]);

  useEffect(() => {
    fetchShops();
  }, [fetchShops]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/shops/categories`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setCategories(d.categories || []);
      })
      .catch(() => {
        // Filter list is optional; the directory still works without it
      });
  }, []);

  return (
    <div>
      <PageHeader
        title="Campus Shops"
        description="Browse student-owned businesses on campus, filter by category, and explore what each shop sells."
      />

      {/* ── Filters ── */}
      <Card className="mb-4">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search shops by name or category..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-emerald dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Filter by shop category"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-emerald dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="All">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {loading ? (
        <div className="flex min-h-[35vh] items-center justify-center">
          <Loader2 className="animate-spin text-brand-emerald" size={28} />
        </div>
      ) : error ? (
        <Card className="mx-auto max-w-md text-center">
          <AlertCircle className="mx-auto mb-2 text-amber-500" size={28} />
          <p className="text-sm font-semibold">{error}</p>
          <Button className="mt-4" onClick={fetchShops}>
            <RefreshCw size={15} className="mr-1.5" /> Retry
          </Button>
        </Card>
      ) : shops.length === 0 ? (
        <Card className="mx-auto max-w-md text-center">
          <Store className="mx-auto mb-2 text-slate-400" size={28} />
          <p className="text-sm font-semibold">No shops found</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {search || category !== "All"
              ? "Try a different search or category filter."
              : "No campus shops have registered yet."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {shops.map((shop) => (
            <Link key={shop._id} href={`/shops/${shop.slug || shop._id}`}>
              <ShopDirectoryCard shop={shop} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
