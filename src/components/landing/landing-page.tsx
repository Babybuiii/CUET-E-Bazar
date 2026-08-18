"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin, Menu, Search, ShoppingCart, Loader2, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProductCard } from "@/components/marketplace/product-card";
import { API_BASE_URL } from "@/lib/api";

const quickMenu = ["All", "Today Deals", "Marketplace", "Giveaways", "Campus Shops", "Customer Service"];

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
      <header className="sticky top-0 z-30 bg-[#131921] px-3 py-2 text-white sm:px-5 lg:px-8">
        <div className="mx-auto flex max-w-[1500px] items-center gap-3">
          <div className="rounded-sm px-2 py-1 hover:outline hover:outline-1 hover:outline-white/70">
            <Logo href="/home" />
          </div>
          <button className="hidden items-center gap-2 rounded-sm px-2 py-1 text-left hover:outline hover:outline-1 hover:outline-white/70 md:flex" aria-label="Delivery location">
            <MapPin size={16} />
            <span className="text-xs leading-tight text-slate-200">
              Deliver to
              <span className="block text-sm font-semibold text-white">CUET Campus</span>
            </span>
          </button>
          <form onSubmit={handleSearch} className="focus-ring flex flex-1 items-center overflow-hidden rounded-md bg-white text-[#0f1111]">
            <span className="hidden bg-slate-100 px-3 py-2 text-xs text-slate-700 sm:inline">All</span>
            <input
              aria-label="Search products"
              placeholder="Search CUET E-Bazar"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border-0 px-3 py-2 text-sm outline-none"
            />
            <button type="submit" className="h-full bg-[#febd69] px-3 py-2 text-[#0f1111] hover:bg-[#f3a847]" aria-label="Search">
              <Search size={18} />
            </button>
          </form>
          <Link href="/login" className="hidden rounded-sm px-2 py-1 text-xs hover:outline hover:outline-1 hover:outline-white/70 md:block">
            Hello, sign in
            <span className="block text-sm font-semibold">Account</span>
          </Link>
          <Link href="/signup" className="hidden rounded-sm px-2 py-1 text-xs hover:outline hover:outline-1 hover:outline-white/70 md:block">
            New to CUET?
            <span className="block text-sm font-semibold">Join now</span>
          </Link>
          <Link href="/login" className="inline-flex items-center gap-1 rounded-sm px-2 py-1 hover:outline hover:outline-1 hover:outline-white/70" aria-label="Cart">
            <ShoppingCart size={20} />
            <span className="text-sm font-semibold">Cart</span>
          </Link>
        </div>
      </header>

      <div className="border-b border-[#37475a] bg-[#232f3e] px-3 py-2 text-sm text-white sm:px-5 lg:px-8">
        <div className="mx-auto flex max-w-[1500px] items-center gap-5 overflow-x-auto whitespace-nowrap">
          <Link href="/marketplace" className="inline-flex items-center gap-2 rounded-sm px-2 py-1 hover:outline hover:outline-1 hover:outline-white/70" aria-label="Open menu">
            <Menu size={16} /> All
          </Link>
          {quickMenu.map((item) => (
            <Link
              key={item}
              href={item === "Customer Service" ? "/login" : "/marketplace"}
              className="cursor-pointer rounded-sm px-2 py-1 hover:outline hover:outline-1 hover:outline-white/70"
            >
              {item}
            </Link>
          ))}
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
    </div>
  );
}

