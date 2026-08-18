"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  PlusCircle,
  Tag,
  Percent,
  CheckCircle2,
  Trash2,
  Edit3,
  ExternalLink,
  ShoppingBag,
  Loader2,
  AlertCircle,
  Clock,
  MapPin,
  Sparkles,
  LogIn,
  RefreshCw,
  Archive
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SellModal } from "@/components/marketplace/sell-modal";
import { EditProductModal } from "@/components/marketplace/edit-product-modal";
import { API_BASE_URL } from "@/lib/api";

type ProductImage = {
  url: string;
  thumbnailUrl: string;
  publicId?: string;
};

type ProductListing = {
  _id: string;
  id?: string;
  title: string;
  description?: string;
  price: number;
  originalPrice?: number | null;
  discount?: number;
  category: string;
  condition: string;
  location: string;
  status: "active" | "sold" | "reserved" | "removed_by_admin";
  tags: string[];
  images: (ProductImage | string)[];
  viewsCount?: number;
  isNegotiable?: boolean;
  createdAt: string;
};

function ListingThumbnail({ src, alt }: { src: string; alt: string }) {
  if (!src) {
    return (
      <div className="h-20 w-20 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
        <ShoppingBag size={24} />
      </div>
    );
  }

  if (src.startsWith("data:")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className="h-20 w-20 rounded-xl object-cover border border-slate-200 dark:border-slate-800 shrink-0"
      />
    );
  }

  return (
    <div className="relative h-20 w-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shrink-0 bg-slate-100 dark:bg-slate-900">
      <Image src={src} alt={alt} fill sizes="80px" className="object-cover" />
    </div>
  );
}

export default function MyListingsPage() {
  const [listings, setListings] = useState<ProductListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  // Modals state
  const [isSellOpen, setIsSellOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductListing | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Fetch user's real listings from MongoDB ──
  const fetchMyListings = useCallback(async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
    if (!token) {
      setIsLoggedIn(false);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/products/user/my-listings`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();

      if (data.success && Array.isArray(data.products)) {
        setListings(data.products);
      }
    } catch (err) {
      console.error("Failed to load user listings:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyListings();
  }, [fetchMyListings]);

  // ── Feature 1: Remove / Delete a listing ──
  const handleDeleteListing = async (productId: string) => {
    if (!window.confirm("Are you sure you want to delete this listing? This action cannot be undone.")) {
      return;
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
    if (!token) return;

    try {
      setDeletingId(productId);
      const res = await fetch(`${API_BASE_URL}/api/products/${productId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();

      if (data.success) {
        setListings((prev) => prev.filter((item) => (item._id || item.id) !== productId));
      } else {
        alert(data.message || "Failed to delete listing.");
      }
    } catch (err) {
      alert("Error connecting to server to delete product.");
    } finally {
      setDeletingId(null);
    }
  };

  // ── Feature 2: Toggle Status (Mark as Sold / Active / Reserved) ──
  const handleToggleStatus = async (productId: string, newStatus: "active" | "sold" | "reserved") => {
    const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
    if (!token) return;

    try {
      setActionLoadingId(productId);
      const res = await fetch(`${API_BASE_URL}/api/products/${productId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();

      if (data.success) {
        setListings((prev) =>
          prev.map((item) =>
            (item._id || item.id) === productId ? { ...item, status: newStatus } : item
          )
        );
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // ── Feature 3, 4, 5: Update Listing (From Edit Modal) ──
  const handleProductUpdated = (updated: ProductListing) => {
    setListings((prev) =>
      prev.map((item) => ((item._id || item.id) === (updated._id || updated.id) ? updated : item))
    );
  };

  const handleProductCreated = (newItem: ProductListing) => {
    setListings((prev) => [newItem, ...prev]);
  };

  // Stats calculation
  const totalCount = listings.length;
  const activeCount = listings.filter((l) => l.status === "active").length;
  const soldCount = listings.filter((l) => l.status === "sold").length;
  const totalValue = listings
    .filter((l) => l.status === "active")
    .reduce((sum, item) => sum + (Number(item.price) || 0), 0);

  // Filter listings
  const filteredListings = listings.filter((item) => {
    if (selectedFilter === "active") return item.status === "active";
    if (selectedFilter === "sold") return item.status === "sold";
    if (selectedFilter === "reserved") return item.status === "reserved";
    return true;
  });

  // Unauthenticated screen
  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="h-16 w-16 rounded-3xl bg-brand-emerald/10 text-brand-emerald flex items-center justify-center mb-4">
          <ShoppingBag size={32} />
        </div>
        <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          Please Log In to Manage Your Listings
        </h2>
        <p className="mt-2 text-sm text-slate-500 max-w-md">
          Sign in to view your listed products, edit prices, apply discounts, add tags, and mark items as sold.
        </p>
        <Link href="/login" className="mt-6">
          <Button className="border-brand-emerald bg-brand-emerald text-white hover:bg-[#0d665f] px-6 py-2.5">
            <LogIn size={16} className="mr-2" /> Log In to Continue
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          title="My Listings"
          description="Manage your campus marketplace items, apply discounts, add highlight tags, and track sales."
        />
        <div className="flex items-center gap-2">
          <Button
            onClick={() => fetchMyListings()}
            variant="ghost"
            className="border border-slate-200 dark:border-slate-800 text-xs px-3"
            title="Refresh listings"
          >
            <RefreshCw size={14} className="mr-1.5" /> Refresh
          </Button>
          <Button
            onClick={() => setIsSellOpen(true)}
            className="border-brand-emerald bg-brand-emerald text-white hover:bg-[#0d665f] text-xs px-4"
          >
            <PlusCircle size={16} className="mr-1.5" /> Sell New Item
          </Button>
        </div>
      </div>

      {/* ── Summary Stats Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card className="p-4 bg-slate-50/70 dark:bg-slate-900/50">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Listed</span>
          <p className="font-display text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{totalCount}</p>
        </Card>

        <Card className="p-4 bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-500/20">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Active for Sale</span>
          <p className="font-display text-2xl font-extrabold text-brand-emerald mt-1">{activeCount}</p>
        </Card>

        <Card className="p-4 bg-rose-50/50 dark:bg-rose-950/30 border-rose-500/20">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-300">Sold Items</span>
          <p className="font-display text-2xl font-extrabold text-rose-600 mt-1">{soldCount}</p>
        </Card>

        <Card className="p-4 bg-amber-50/50 dark:bg-amber-950/30 border-amber-500/20">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">Active Inventory Value</span>
          <p className="font-display text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
            ৳{totalValue.toLocaleString()}
          </p>
        </Card>
      </div>

      {/* ── Filter Tabs ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        {[
          { id: "all", label: `All (${totalCount})` },
          { id: "active", label: `Active (${activeCount})` },
          { id: "sold", label: `Sold (${soldCount})` },
          { id: "reserved", label: `Reserved (${listings.filter((l) => l.status === "reserved").length})` }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedFilter(tab.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
              selectedFilter === tab.id
                ? "bg-brand-emerald text-white shadow-sm"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Real Listings List ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-sm">
          <Loader2 size={32} className="animate-spin text-brand-emerald mb-3" />
          <span>Loading your real listings from database...</span>
        </div>
      ) : filteredListings.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center border-dashed border-2">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-400">
            <ShoppingBag size={28} />
          </div>
          <h3 className="mt-4 font-display text-xl font-bold">
            {selectedFilter === "all" ? "No Listings Found" : `No ${selectedFilter} listings`}
          </h3>
          <p className="mt-1 max-w-md text-xs sm:text-sm text-slate-500">
            {selectedFilter === "all"
              ? "You have not listed any items yet. Put up textbooks, drawing kits, cycles, or gadgets for sale!"
              : `You currently do not have any items marked as ${selectedFilter}.`}
          </p>
          {selectedFilter === "all" && (
            <Button
              onClick={() => setIsSellOpen(true)}
              className="mt-5 border-brand-emerald bg-brand-emerald text-white hover:bg-[#0d665f]"
            >
              <PlusCircle size={16} className="mr-1.5" /> Post First Listing
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-3.5">
          {filteredListings.map((item) => {
            const productId = item._id || item.id || "";
            const firstImg = item.images?.[0];
            const displayImg =
              typeof firstImg === "object" ? firstImg?.thumbnailUrl || firstImg?.url : firstImg || "";

            return (
              <Card
                key={productId}
                className="p-4 sm:p-5 transition hover:shadow-md border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Product Info & Thumbnail */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <ListingThumbnail src={displayImg} alt={item.title} />

                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/marketplace/${productId}`}
                        className="font-display font-bold text-base text-slate-900 dark:text-slate-100 hover:text-brand-emerald hover:underline line-clamp-1"
                      >
                        {item.title}
                      </Link>

                      {/* Status Badge */}
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                          item.status === "sold"
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                            : item.status === "reserved"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                            : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    {/* Price & Discount Info (Feature 5) */}
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="font-display text-lg font-bold text-brand-emerald">
                        ৳{Number(item.price).toLocaleString()}
                      </span>

                      {item.originalPrice && Number(item.originalPrice) > Number(item.price) && (
                        <span className="text-xs text-slate-400 line-through">
                          ৳{Number(item.originalPrice).toLocaleString()}
                        </span>
                      )}

                      {Number(item.discount) > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[11px] font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300 px-2 py-0.5 rounded-md border border-rose-200/50">
                          <Percent size={11} /> {item.discount}% OFF
                        </span>
                      )}

                      {item.isNegotiable && (
                        <span className="text-[11px] text-slate-500 font-medium">
                          • Negotiable
                        </span>
                      )}
                    </div>

                    {/* Metadata & Tags (Feature 4) */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span>{item.category}</span>
                      <span>•</span>
                      <span>{item.condition}</span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={12} /> {item.location}
                      </span>
                    </div>

                    {/* Tags List */}
                    {Array.isArray(item.tags) && item.tags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {item.tags.map((t) => (
                          <span
                            key={t}
                            className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                          >
                            <Tag size={10} className="text-brand-emerald" /> {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Actions Toolbar ── */}
                <div className="flex flex-wrap items-center gap-2 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800 shrink-0">
                  {/* Feature 2: Mark as Sold / Active toggle */}
                  {item.status === "active" ? (
                    <Button
                      onClick={() => handleToggleStatus(productId, "sold")}
                      disabled={actionLoadingId === productId}
                      variant="ghost"
                      className="text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950/70 border border-rose-200 dark:border-rose-900 px-3 py-1.5 h-auto"
                    >
                      <CheckCircle2 size={13} className="mr-1.5" /> Mark Sold
                    </Button>
                  ) : item.status === "sold" ? (
                    <Button
                      onClick={() => handleToggleStatus(productId, "active")}
                      disabled={actionLoadingId === productId}
                      variant="ghost"
                      className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-900 px-3 py-1.5 h-auto"
                    >
                      <RefreshCw size={13} className="mr-1.5" /> Relist (Active)
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleToggleStatus(productId, "active")}
                      disabled={actionLoadingId === productId}
                      variant="ghost"
                      className="text-xs bg-slate-100 text-slate-700 dark:bg-slate-800 px-3 py-1.5 h-auto"
                    >
                      Set Active
                    </Button>
                  )}

                  {/* Feature 3: Edit Listing */}
                  <Button
                    onClick={() => setEditingProduct(item)}
                    variant="ghost"
                    className="text-xs border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-1.5 h-auto"
                  >
                    <Edit3 size={13} className="mr-1.5" /> Edit
                  </Button>

                  {/* View Public Listing */}
                  <Link href={`/marketplace/${productId}`}>
                    <Button
                      variant="ghost"
                      className="text-xs border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 px-2.5 py-1.5 h-auto"
                      title="View public listing"
                    >
                      <ExternalLink size={14} />
                    </Button>
                  </Link>

                  {/* Feature 1: Delete Listing */}
                  <Button
                    onClick={() => handleDeleteListing(productId)}
                    disabled={deletingId === productId}
                    variant="ghost"
                    className="text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2.5 py-1.5 h-auto"
                    title="Delete listing"
                  >
                    {deletingId === productId ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Edit Product Modal (Features 3, 4, 5) ── */}
      <EditProductModal
        isOpen={!!editingProduct}
        onClose={() => setEditingProduct(null)}
        product={editingProduct}
        onUpdated={handleProductUpdated}
      />

      {/* ── Sell New Product Modal ── */}
      <SellModal
        isOpen={isSellOpen}
        onClose={() => setIsSellOpen(false)}
        onSuccess={handleProductCreated}
      />
    </div>
  );
}
