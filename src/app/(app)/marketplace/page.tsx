"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ProductCard } from "@/components/marketplace/product-card";
import { PageHeader } from "@/components/shared/page-header";
import { SellModal } from "@/components/marketplace/sell-modal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, ShoppingBag, X } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

const CATEGORIES = [
  "All",
  "Electronics & Gadgets",
  "Books & Study Material",
  "Drawing & Lab Instruments",
  "Furniture & Dorm Essentials",
  "Bicycles & Sports",
  "Clothing & Accessories",
  "Others"
];

function MarketplaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isSellOpen, setIsSellOpen] = useState(false);

  const fetchProducts = async (category: string, search: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("sort", "newest");
      params.set("sellerType", "individual");
      if (category && category !== "All") {
        params.set("category", category);
      }
      if (search && search.trim()) {
        params.set("search", search.trim());
      }
      const res = await fetch(`${API_BASE_URL}/api/products?${params.toString()}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.products)) {
        // Strictly individual sellers: exclude campus shops and giveaways
        const individualProducts = data.products.filter((p: any) => {
          if (p.shop) return false;
          if (p.sellerType === "shop") return false;
          if (p.seller && (p.seller.role === "shop_owner" || p.seller.shop)) return false;
          if (Number(p.price) <= 0) return false;
          if (p.category && p.category.toLowerCase().includes("giveaway")) return false;
          return true;
        });
        setProducts(individualProducts);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error("Failed to load marketplace products:", err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(selectedCategory, searchQuery);
  }, [selectedCategory, searchQuery]);

  const clearSearch = () => {
    router.push("/marketplace");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          title="CUET Marketplace"
          description="Browse verified listings posted by individual student sellers across campus (excluding campus shops and free giveaways)."
        />
        <Button
          onClick={() => setIsSellOpen(true)}
          className="border-brand-emerald bg-brand-emerald text-white hover:bg-[#0d665f]"
        >
          <PlusCircle size={16} className="mr-1.5" /> Sell an Item
        </Button>
      </div>

      {/* Search Query Pill / Clear */}
      {searchQuery && (
        <div className="flex items-center justify-between rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 px-4 py-2 text-sm text-emerald-900 dark:text-emerald-200">
          <p>
            Showing results for: <span className="font-bold">&ldquo;{searchQuery}&rdquo;</span>
          </p>
          <button
            onClick={clearSearch}
            className="flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline"
          >
            <X size={14} /> Clear Search
          </button>
        </div>
      )}

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`focus-ring whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              selectedCategory === cat
                ? "bg-brand-emerald text-white shadow-sm"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 size={32} className="animate-spin text-brand-emerald" />
          <p className="mt-3 text-sm font-medium">Loading marketplace listings...</p>
        </div>
      ) : products.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-20 text-center border-dashed border-2">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-400">
            <ShoppingBag size={28} />
          </div>
          <h3 className="mt-4 font-display text-xl font-bold">
            {searchQuery
              ? `No Products Matching "${searchQuery}"`
              : `No Products in ${selectedCategory}`}
          </h3>
          <p className="mt-1 max-w-md text-xs sm:text-sm text-slate-500">
            {searchQuery
              ? "Try searching for a different keyword, checking for typos, or browse all categories."
              : "There are currently no active listings in this category. Be the first to list one!"}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {searchQuery && (
              <Button onClick={clearSearch} variant="secondary">
                Clear Search Filter
              </Button>
            )}
            <Button
              onClick={() => setIsSellOpen(true)}
              className="border-brand-emerald bg-brand-emerald text-white hover:bg-[#0d665f]"
            >
              <PlusCircle size={16} className="mr-1.5" /> Post Listing
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product._id || product.id} product={product} />
          ))}
        </div>
      )}

      <SellModal
        isOpen={isSellOpen}
        onClose={() => setIsSellOpen(false)}
        onSuccess={() => fetchProducts(selectedCategory, searchQuery)}
      />
    </div>
  );
}

export default function MarketplacePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 size={32} className="animate-spin text-brand-emerald" />
          <p className="mt-3 text-sm font-medium">Loading marketplace...</p>
        </div>
      }
    >
      <MarketplaceContent />
    </Suspense>
  );
}


