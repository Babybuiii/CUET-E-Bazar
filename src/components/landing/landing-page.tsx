"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Loader2, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProductCard } from "@/components/marketplace/product-card";
import { AppFooter } from "@/components/shell/app-footer";
import { API_BASE_URL } from "@/lib/api";

export function LandingPage() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/api/products?sort=newest`);
        const data = await res.json();
        if (data.success && Array.isArray(data.products)) {
          setProducts(data.products);
        }
      } catch (err) {
        console.error("Failed to load products for landing page:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/marketplace?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push("/marketplace");
    }
  };

  return (
    <div className="min-h-screen bg-[#eaeded]">
      {/* ── Permanent Sticky Header & Quick Navigation Topbar ── */}
      <div className="sticky top-0 z-40 w-full shadow-md">
        <header className="bg-[#131921] px-3 py-2 text-white sm:px-5 lg:px-8">
          <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3">
            <div className="rounded-sm px-2 py-1 hover:outline hover:outline-1 hover:outline-white/70 shrink-0">
              <Logo href="/" />
            </div>

            <form onSubmit={handleSearch} className="focus-ring flex flex-1 max-w-xl mx-auto items-center overflow-hidden rounded-md bg-white text-[#0f1111]">
              <span className="hidden bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 sm:inline">All</span>
              <input
                aria-label="Search products"
                placeholder="Search products, calculators, bicycles, books..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border-0 px-3 py-1.5 text-sm outline-none bg-transparent"
              />
              <button type="submit" className="h-full bg-[#febd69] px-3.5 py-2 text-[#0f1111] hover:bg-[#f3a847] transition active:scale-95" aria-label="Search">
                <Search size={16} />
              </button>
            </form>

            {/* Highlighted Sign in / Register buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <Link
                href="/login"
                className="focus-ring inline-flex items-center justify-center rounded-lg bg-brand-emerald hover:bg-[#0d665f] text-white font-bold px-2.5 sm:px-3.5 py-1.5 text-xs sm:text-sm transition shadow-sm active:scale-95"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="focus-ring inline-flex items-center justify-center rounded-lg bg-[#ffa41c] hover:bg-[#f39200] text-[#0f1111] font-bold px-2.5 sm:px-3.5 py-1.5 text-xs sm:text-sm transition shadow-sm active:scale-95"
              >
                Register
              </Link>
            </div>
          </div>
        </header>

        {/* ── Logged out Topbar: Only 4 options (Home, Marketplace, Giveaways, Campus Shops) ── */}
        <div className="border-b border-[#37475a] bg-[#232f3e] px-3 py-1.5 text-sm text-white sm:px-5 lg:px-8">
          <div className="mx-auto flex max-w-[1500px] items-center gap-2 sm:gap-4 overflow-x-auto whitespace-nowrap scrollbar-none py-0.5">
            <Link
              href="/"
              className="rounded-md px-3 py-1 text-xs sm:text-sm font-bold bg-brand-emerald text-white shadow-sm ring-1 ring-emerald-400/50 flex items-center gap-1 shrink-0"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-sm shrink-0 animate-pulse" />
              <span>Home</span>
            </Link>
            <Link
              href="/marketplace"
              className="rounded-md px-3 py-1 text-xs sm:text-sm font-medium text-slate-200 hover:text-white hover:bg-white/10 transition shrink-0"
            >
              Marketplace
            </Link>
            <Link
              href="/giveaways"
              className="rounded-md px-3 py-1 text-xs sm:text-sm font-medium text-slate-200 hover:text-white hover:bg-white/10 transition shrink-0"
            >
              Giveaways
            </Link>
            <Link
              href="/shops"
              className="rounded-md px-3 py-1 text-xs sm:text-sm font-medium text-slate-200 hover:text-white hover:bg-white/10 transition shrink-0"
            >
              Campus Shops
            </Link>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1500px] px-3 pb-10 pt-4 sm:px-5 lg:px-8">
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4 lg:grid-cols-[2.2fr_1fr]">
          <Card className="overflow-hidden p-0">
            <div className="bg-gradient-to-r from-[#d9f3ff] to-[#f8fbff] px-6 py-10">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Back to campus deals</p>
              <h1 className="mt-2 font-display text-4xl font-bold text-[#0f1111]">CUET E-Bazar Marketplace</h1>
              <p className="mt-3 max-w-xl text-sm text-slate-700">Buy and sell used products, discover shops, and claim giveaways in one trusted CUET-only platform.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/login"><Button>Explore Marketplace</Button></Link>
                <Link href="/signup"><Button variant="secondary">Create Account</Button></Link>
              </div>
            </div>
          </Card>
          <Card>
            <p className="text-sm font-semibold text-[#cc0c39]">Trending right now</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              <li>Student laptops below ৳40k</li>
              <li>Hostel room furniture bundles</li>
              <li>Department textbook giveaways</li>
              <li>Campus shop discount banners</li>
            </ul>
          </Card>
        </motion.section>

        <div className="mt-8 mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#0f1111]">Featured Real Listings</h2>
            <p className="text-xs text-slate-500">Live products posted by verified CUET students & campus sellers</p>
          </div>
          <Link href="/marketplace" className="text-xs font-semibold text-[#007185] hover:underline">
            View All ({products.length}) →
          </Link>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Loader2 size={32} className="animate-spin text-teal-700" />
            <p className="mt-3 text-sm font-medium">Loading real campus products...</p>
          </div>
        ) : products.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-16 text-center border-dashed border-2 bg-white">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-400">
              <ShoppingBag size={28} />
            </div>
            <h3 className="mt-4 font-display text-xl font-bold text-slate-800">No Products Listed Yet</h3>
            <p className="mt-1 max-w-md text-xs sm:text-sm text-slate-500">
              Sign up or log in to be the first to list items on CUET E-Bazar!
            </p>
            <div className="mt-4 flex gap-3">
              <Link href="/signup">
                <Button>Join & Post Listing</Button>
              </Link>
            </div>
          </Card>
        ) : (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product._id || product.id} product={product} />
            ))}
          </section>
        )}
      </main>
      <AppFooter />
    </div>
  );
}

