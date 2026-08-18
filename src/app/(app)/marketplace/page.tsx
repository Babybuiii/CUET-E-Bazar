"use client";

import { useEffect, useState } from "react";
import { ProductCard } from "@/components/marketplace/product-card";
import { PageHeader } from "@/components/shared/page-header";
import { SellModal } from "@/components/marketplace/sell-modal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, ShoppingBag } from "lucide-react";

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

export default function MarketplacePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isSellOpen, setIsSellOpen] = useState(false);

  const fetchProducts = async (category: string) => {
    try {
      setLoading(true);
      const url =
        category === "All"
          ? "http://localhost:5000/api/products?sort=newest"
          : `http://localhost:5000/api/products?category=${encodeURIComponent(category)}&sort=newest`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.products)) {
        setProducts(data.products);
      }
    } catch (err) {
      console.error("Failed to load marketplace products:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(selectedCategory);
  }, [selectedCategory]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          title="CUET Marketplace"
          description="Browse verified listings posted by students and campus sellers."
        />
        <Button
          onClick={() => setIsSellOpen(true)}
          className="border-brand-emerald bg-brand-emerald text-white hover:bg-[#0d665f]"
        >
          <PlusCircle size={16} className="mr-1.5" /> Sell an Item
        </Button>
      </div>

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
          <h3 className="mt-4 font-display text-xl font-bold">No Products in {selectedCategory}</h3>
          <p className="mt-1 max-w-md text-xs sm:text-sm text-slate-500">
            There are currently no active listings in this category. Be the first to list one!
          </p>
          <Button
            onClick={() => setIsSellOpen(true)}
            className="mt-5 border-brand-emerald bg-brand-emerald text-white hover:bg-[#0d665f]"
          >
            <PlusCircle size={16} className="mr-1.5" /> Post Listing
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product._id || product.id} product={product} />
          ))}
        </div>
      )}

      <SellModal
        isOpen={isSellOpen}
        onClose={() => setIsSellOpen(false)}
        onSuccess={() => fetchProducts(selectedCategory)}
      />
    </div>
  );
}

