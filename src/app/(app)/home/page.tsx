"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { ProductCard } from "@/components/marketplace/product-card";
import { SellModal } from "@/components/marketplace/sell-modal";
import { Loader2, PlusCircle, ShoppingBag, Sparkles, Tag, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function HomePage() {
  const router = useRouter();
  const { isLoggedIn, loading: authLoading } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSellOpen, setIsSellOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.replace("/");
    }
  }, [authLoading, isLoggedIn, router]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/products?sort=newest`);
      const data = await res.json();
      if (data.success && Array.isArray(data.products)) {
        setProducts(data.products);
      }
    } catch (err) {
      console.error("Failed to load products:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleProductCreated = (newProduct: any) => {
    setProducts((prev) => [newProduct, ...prev]);
  };

  return (
    <div className="space-y-8">
      {/* ── Hero Banner ── */}
      <section className="grid gap-4 lg:grid-cols-[2.3fr_1fr]">
        <Card className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800">
          <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-[#131921] px-6 py-10 text-white sm:px-8">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 backdrop-blur-sm">
              <Sparkles size={13} /> CUET Verified Campus Market
            </span>
            <h1 className="mt-4 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Buy, Sell & Trade on Campus
            </h1>
            <p className="mt-2 max-w-xl text-xs sm:text-sm text-slate-300">
              Only real items listed by verified CUET students & campus stores. Explore calculators, books, laptops, cycles & more.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href="/marketplace">
                <Button className="border-brand-emerald bg-brand-emerald text-white hover:bg-[#0d665f]">
                  Browse All Items
                </Button>
              </Link>
              <Button
                onClick={() => setIsSellOpen(true)}
                variant="ghost"
                className="bg-white/10 text-white hover:bg-white/20"
              >
                <PlusCircle size={16} className="mr-1.5" /> Sell an Item
              </Button>
            </div>
          </div>
        </Card>

        <Card className="flex flex-col justify-between p-6 bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              <Tag size={15} /> Campus Exchange
            </div>
            <h2 className="mt-2 font-display text-xl font-bold text-slate-900 dark:text-white">
              Zero Commission
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Meet directly at the Library, Hall gates, or Cafeteria for fast and safe handovers.
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500">
            <span>Active Listings: <strong>{products.length}</strong></span>
            <span className="text-brand-emerald font-semibold">100% Student Verified</span>
          </div>
        </Card>
      </section>

      {/* ── Real Listed Products Section ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <PageHeader
            title="Real Listed Products"
            description="Active listings added by real CUET students and campus sellers."
          />
          <Link href="/marketplace" className="text-xs font-semibold text-brand-emerald hover:underline">
            View All ({products.length}) →
          </Link>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Loader2 size={32} className="animate-spin text-brand-emerald" />
            <p className="mt-3 text-sm font-medium">Fetching real products from database...</p>
          </div>
        ) : products.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-16 text-center border-dashed border-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-400">
              <ShoppingBag size={28} />
            </div>
            <h3 className="mt-4 font-display text-xl font-bold">No Products Listed Yet</h3>
            <p className="mt-1 max-w-md text-xs sm:text-sm text-slate-500">
              Be the first CUETian to list a gadget, textbook, drawing tool, or dorm item for sale!
            </p>
            <Button
              onClick={() => setIsSellOpen(true)}
              className="mt-5 border-brand-emerald bg-brand-emerald text-white hover:bg-[#0d665f]"
            >
              <PlusCircle size={16} className="mr-1.5" /> Post First Listing
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product._id || product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* ── Sell Modal ── */}
      <SellModal
        isOpen={isSellOpen}
        onClose={() => setIsSellOpen(false)}
        onSuccess={handleProductCreated}
      />
    </div>
  );
}

