"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import {
  ShieldCheck,
  MapPin,
  MessageCircle,
  Heart,
  Share2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  ShoppingBag,
  Store,
  Send,
  CornerDownRight,
  User,
  Plus,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Flag
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProductPhotoZoomModal } from "@/components/marketplace/product-photo-zoom-modal";
import { ReportModal } from "@/components/shared/report-modal";
import { API_BASE_URL } from "@/lib/api";
import { getAuthToken, useAuth } from "@/lib/auth";
import { isWishlistedLocally, toggleWishlist } from "@/lib/wishlist";
import { addToCart } from "@/lib/cart";

type ProductImage = {
  url: string;
  thumbnailUrl: string;
  publicId?: string;
};

type Seller = {
  _id?: string;
  fullName: string;
  userId?: string;
  department?: string;
  hall?: string;
  rating?: number;
  reviewsCount?: number;
  isVerified?: boolean;
  contactNumber?: string;
  email?: string;
};

type ShopInfo = {
  _id: string;
  shopName: string;
  slug?: string;
  category?: string;
  location?: string;
  rating?: number;
  operatingHours?: {
    open?: string;
    close?: string;
  };
  isVerified?: boolean;
};

type Product = {
  _id: string;
  title: string;
  description?: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  category: string;
  condition: string;
  location?: string;
  status?: string;
  tags?: string[];
  isNegotiable?: boolean;
  images: ProductImage[];
  seller: Seller;
  sellerType?: "individual" | "shop" | string;
  shop?: ShopInfo | null;
  averageRating?: number;
  totalReviews?: number;
  createdAt?: string;
};

type QueryAnswer = {
  _id: string;
  answerer: {
    _id: string;
    fullName: string;
    avatarUrl?: string;
    department?: string;
    hall?: string;
    role?: string;
  };
  text: string;
  isSellerAnswer: boolean;
  createdAt: string;
};

type ProductQuery = {
  _id: string;
  asker: {
    _id: string;
    fullName: string;
    avatarUrl?: string;
    department?: string;
    hall?: string;
    role?: string;
  };
  question: string;
  answers: QueryAnswer[];
  createdAt: string;
};

/** Renders an image supporting both Cloudinary URLs and base64 data URLs */
function GalleryImage({
  src,
  alt,
  className,
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  if (src.startsWith("data:")) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={className} />;
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      priority={priority}
      quality={95}
      unoptimized={src.includes("cloudinary.com")}
      sizes="(max-width: 1024px) 100vw, 60vw"
      className={className}
    />
  );
}

export default function ProductDetailsPage() {
  const params = useParams();
  const id = params?.id as string;
  const { isLoggedIn, user } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);
  const [stageZoom, setStageZoom] = useState(1);
  const [stagePan, setStagePan] = useState({ x: 0, y: 0 });
  const [isSaved, setIsSaved] = useState(false);
  const [addedToast, setAddedToast] = useState<string | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const lastRecordedViewIdRef = useRef<string | null>(null);

  // Public Queries / Comments state
  const [queries, setQueries] = useState<ProductQuery[]>([]);
  const [loadingQueries, setLoadingQueries] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [replyOpenFor, setReplyOpenFor] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  // Track ad click / view exactly once per visit
  useEffect(() => {
    if (!id || lastRecordedViewIdRef.current === id) return;
    lastRecordedViewIdRef.current = id;

    let viewerId: string | null = null;
    if (typeof window !== "undefined") {
      try {
        viewerId = localStorage.getItem("cuet_ebazar_viewer_id");
        if (!viewerId) {
          viewerId = `cid_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
          localStorage.setItem("cuet_ebazar_viewer_id", viewerId);
        }
      } catch {
        // ignore localStorage failure
      }
    }

    const token = getAuthToken();
    fetch(`${API_BASE_URL}/api/products/${id}/view`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ viewerId })
    }).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setIsSaved(isWishlistedLocally(id));
    const handleUpdate = () => {
      setIsSaved(isWishlistedLocally(id));
    };
    window.addEventListener("wishlist-updated", handleUpdate);
    window.addEventListener("auth-changed", handleUpdate);
    return () => {
      window.removeEventListener("wishlist-updated", handleUpdate);
      window.removeEventListener("auth-changed", handleUpdate);
    };
  }, [id]);

  const handleToggleSave = async () => {
    if (!id) return;
    const newState = await toggleWishlist(id);
    setIsSaved(newState);
  };

  const fetchProduct = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/products/${id}`);
      const data = await res.json();
      if (data.success && data.product) {
        setProduct(data.product);
      } else {
        setError(data.message || "Product not found.");
      }
    } catch {
      setError("Failed to connect to the server. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchQueries = useCallback(async () => {
    if (!id) return;
    try {
      setLoadingQueries(true);
      const res = await fetch(`${API_BASE_URL}/api/queries/product/${id}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.queries)) {
        setQueries(data.queries);
      }
    } catch (err) {
      console.error("Fetch queries error:", err);
    } finally {
      setLoadingQueries(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProduct();
    fetchQueries();
  }, [fetchProduct, fetchQueries]);

  const handleAddToCart = async () => {
    if (!product) return;
    const isShopProduct = Boolean(product.shop || product.sellerType === "shop");
    if (!isShopProduct) {
      alert("Add to cart is only available for campus shop products. Individual seller items are arranged directly via chat.");
      return;
    }
    const res = await addToCart(product);
    if (res.success) {
      setAddedToast(`${product.title} added to your cart!`);
      setTimeout(() => setAddedToast(null), 3000);
    } else {
      alert(res.message);
    }
  };

  const handlePostQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;
    const token = getAuthToken();
    if (!token) {
      alert("Please log in to ask a question.");
      return;
    }

    try {
      setSubmittingQuestion(true);
      const res = await fetch(`${API_BASE_URL}/api/queries/product/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ question: newQuestion.trim() })
      });
      const data = await res.json();
      if (data.success && data.query) {
        setQueries((prev) => [data.query, ...prev]);
        setNewQuestion("");
      } else {
        alert(data.message || "Failed to post question.");
      }
    } catch {
      alert("Network error while submitting question.");
    } finally {
      setSubmittingQuestion(false);
    }
  };

  const handlePostReply = async (queryId: string) => {
    if (!replyText.trim()) return;
    const token = getAuthToken();
    if (!token) {
      alert("Please log in to reply.");
      return;
    }

    try {
      setSubmittingReply(true);
      const res = await fetch(`${API_BASE_URL}/api/queries/${queryId}/answers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ text: replyText.trim() })
      });
      const data = await res.json();
      if (data.success && data.query) {
        setQueries((prev) =>
          prev.map((q) => (q._id === queryId ? data.query : q))
        );
        setReplyText("");
        setReplyOpenFor(null);
      } else {
        alert(data.message || "Failed to post reply.");
      }
    } catch {
      alert("Network error while submitting reply.");
    } finally {
      setSubmittingReply(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <Loader2 size={36} className="animate-spin text-brand-emerald" />
        <p className="mt-3 text-sm font-medium">Loading product details...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertCircle size={40} className="text-rose-500" />
        <h2 className="mt-4 text-xl font-bold">Product Not Found</h2>
        <p className="mt-2 text-sm text-slate-500">{error || "This listing may have been removed."}</p>
        <Link href="/marketplace">
          <Button className="mt-6 bg-brand-emerald text-white hover:bg-[#0d665f]">
            Back to Marketplace
          </Button>
        </Link>
      </div>
    );
  }

  const images = product.images || [];
  const seller = product.seller || { fullName: "Unknown Seller" };
  const shop = product.shop;
  const isShopProduct = Boolean(shop || product.sellerType === "shop");

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {addedToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-[#0f172a] text-white px-4 py-3 shadow-2xl border border-emerald-500/40 text-sm animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 size={18} className="text-brand-emerald" />
          <span>{addedToast}</span>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/marketplace" className="hover:text-brand-emerald">
          Marketplace
        </Link>
        <span>/</span>
        {shop && (
          <>
            <Link href={`/shops/${shop._id}`} className="hover:text-brand-emerald font-medium text-brand-emerald">
              {shop.shopName}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-slate-700 dark:text-slate-300">{product.category}</span>
        <span>/</span>
        <span className="line-clamp-1 text-slate-900 font-medium dark:text-white">
          {product.title}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* ── Left Column: Photo Gallery & Details ── */}
        <div className="space-y-4">
          <Card className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800">
            {/* Main Stage Image */}
            <div
              className={`relative aspect-[4/3] w-full overflow-hidden bg-slate-950 flex items-center justify-center ${
                stageZoom > 1 ? "cursor-move" : "cursor-pointer"
              }`}
              onClick={(e) => {
                if (stageZoom === 1 && (e.target as HTMLElement).tagName !== "BUTTON") {
                  setIsZoomModalOpen(true);
                }
              }}
              onMouseMove={(e) => {
                if (stageZoom <= 1) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width - 0.5) * -120 * (stageZoom - 1);
                const y = ((e.clientY - rect.top) / rect.height - 0.5) * -120 * (stageZoom - 1);
                setStagePan({ x, y });
              }}
              onMouseLeave={() => {
                if (stageZoom <= 1) setStagePan({ x: 0, y: 0 });
              }}
            >
              {/* Zoom Lightbox Floating Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsZoomModalOpen(true);
                }}
                className="focus-ring absolute top-3 right-3 z-20 flex items-center gap-1.5 rounded-full bg-slate-900/90 hover:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition border border-white/20 shadow-lg hover:scale-105"
                title="Inspect Photo (Zoom Lightbox Mode)"
              >
                <ZoomIn size={14} className="text-emerald-400" />
                <span>Zoom Photo</span>
              </button>

              {/* In-Stage Zoom Toolbar */}
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-3 left-3 z-20 flex items-center gap-1 bg-slate-900/90 rounded-full px-2 py-1 border border-white/15 shadow-lg"
              >
                <button
                  type="button"
                  onClick={() => {
                    setStageZoom((z) => {
                      const nextZ = Math.max(1, Number((z - 0.5).toFixed(1)));
                      if (nextZ === 1) setStagePan({ x: 0, y: 0 });
                      return nextZ;
                    });
                  }}
                  disabled={stageZoom <= 1}
                  className="p-1 text-white hover:text-emerald-400 disabled:opacity-30 transition"
                  title="Zoom Out Stage"
                >
                  <ZoomOut size={13} />
                </button>
                <span className="text-[10px] font-mono font-bold text-white px-1 select-none">
                  {Math.round(stageZoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setStageZoom((z) => Math.min(3, Number((z + 0.5).toFixed(1))))}
                  disabled={stageZoom >= 3}
                  className="p-1 text-white hover:text-emerald-400 disabled:opacity-30 transition"
                  title="Zoom In Stage"
                >
                  <ZoomIn size={13} />
                </button>
                {stageZoom > 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setStageZoom(1);
                      setStagePan({ x: 0, y: 0 });
                    }}
                    className="text-[10px] font-semibold text-emerald-400 hover:underline px-1 border-l border-white/20 ml-0.5 pl-1.5"
                    title="Reset Stage Zoom"
                  >
                    Reset
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsZoomModalOpen(true)}
                    className="p-1 text-white hover:text-emerald-400 border-l border-white/20 ml-0.5 pl-1.5"
                    title="Open Fullscreen Lightbox"
                  >
                    <Maximize2 size={12} />
                  </button>
                )}
              </div>

              {/* Image with stage transform */}
              <div
                style={{
                  transform: `scale(${stageZoom}) translate(${stagePan.x}px, ${stagePan.y}px)`,
                  transition: stageZoom > 1 ? "none" : "transform 0.2s ease-out"
                }}
                className="h-full w-full flex items-center justify-center will-change-transform pointer-events-none"
              >
                {images.length > 0 ? (
                  <GalleryImage
                    src={images[activeImageIndex]?.url || images[0].url}
                    alt={`${product.title} - View ${activeImageIndex + 1}`}
                    priority
                    className="object-contain h-full w-full"
                  />
                ) : (
                  <div className="text-slate-500 text-sm">No images</div>
                )}
              </div>

              {/* Navigation arrows */}
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImageIndex((prev) =>
                        prev > 0 ? prev - 1 : images.length - 1
                      );
                      setStageZoom(1);
                      setStagePan({ x: 0, y: 0 });
                    }}
                    className="focus-ring absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition hover:bg-black/80 z-10"
                    aria-label="Previous image"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImageIndex((prev) =>
                        prev < images.length - 1 ? prev + 1 : 0
                      );
                      setStageZoom(1);
                      setStagePan({ x: 0, y: 0 });
                    }}
                    className="focus-ring absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition hover:bg-black/80 z-10"
                    aria-label="Next image"
                  >
                    <ChevronRight size={18} />
                  </button>
                </>
              )}

              {/* Photo index badge */}
              {images.length > 0 && (
                <div className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm z-10">
                  Photo {activeImageIndex + 1} of {images.length}
                </div>
              )}
            </div>

            {/* Thumbnail Strip */}
            {images.length > 1 && (
              <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2.5 overflow-x-auto">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setActiveImageIndex(idx);
                      setStageZoom(1);
                      setStagePan({ x: 0, y: 0 });
                    }}
                    className={`group relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                      activeImageIndex === idx
                        ? "border-brand-emerald shadow-sm"
                        : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    {img.thumbnailUrl?.startsWith("data:") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img.thumbnailUrl || img.url}
                        alt={`Thumbnail ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Image
                        src={img.thumbnailUrl || img.url}
                        alt={`Thumbnail ${idx + 1}`}
                        fill
                        quality={90}
                        unoptimized={(img.thumbnailUrl || img.url).includes("cloudinary.com")}
                        loading="lazy"
                        className="object-cover"
                      />
                    )}
                    {idx === 0 && (
                      <span className="absolute bottom-0 inset-x-0 bg-brand-emerald/90 text-[8px] font-bold text-white text-center py-0.5">
                        COVER
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </Card>

          {/* Description Card */}
          <Card className="p-6 space-y-4">
            <h2 className="font-display text-lg font-bold">About this item</h2>
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-line">
              {product.description || "No description provided."}
            </p>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <span className="text-slate-400">Condition</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {product.condition}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <span className="text-slate-400">Category</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {product.category}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <span className="text-slate-400">Pickup / Delivery Area</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {product.location || "CUET Campus"}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* ── Right Column: Pricing, Ordering Actions, Seller/Shop ── */}
        <div className="space-y-4">
          <Card className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-brand-emerald bg-brand-emerald/10 px-2.5 py-1 rounded-full">
                    {product.condition}
                  </span>
                  {product.status && product.status !== "active" && (
                    <span
                      className={`text-xs font-bold uppercase px-2.5 py-1 rounded-full ${
                        product.status === "sold"
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                      }`}
                    >
                      {product.status}
                    </span>
                  )}
                  {Number(product.discount) > 0 && (
                    <span className="text-xs font-extrabold bg-rose-600 text-white px-2.5 py-0.5 rounded-full">
                      {product.discount}% OFF
                    </span>
                  )}
                </div>

                <h1 className="mt-3 font-display text-2xl sm:text-3xl font-bold leading-tight">
                  {product.title}
                </h1>
              </div>

              <button
                onClick={handleToggleSave}
                className={`focus-ring rounded-full p-2.5 transition border ${
                  isSaved
                    ? "bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/40"
                    : "border-slate-200 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 text-slate-500"
                }`}
                title={isSaved ? "Remove from wishlist" : "Save to wishlist"}
              >
                <Heart size={18} fill={isSaved ? "currentColor" : "none"} />
              </button>
            </div>

            <div className="flex flex-wrap items-baseline gap-3 pt-2">
              <span className="font-display text-4xl font-extrabold text-brand-emerald">
                ৳{product.price.toLocaleString()}
              </span>

              {product.originalPrice && Number(product.originalPrice) > Number(product.price) && (
                <span className="text-base text-slate-400 line-through">
                  ৳{Number(product.originalPrice).toLocaleString()}
                </span>
              )}

              {product.isNegotiable && (
                <span className="text-xs text-slate-500 font-medium">
                  • Negotiable on meet
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <MapPin size={14} className="text-brand-emerald shrink-0" />
              <span>
                Campus pickup:{" "}
                <strong className="text-slate-700 dark:text-slate-200">
                  {product.location || "CUET Campus"}
                </strong>
              </span>
            </div>

            {/* Core Actions: Add to Cart (Only for Campus Shop products) & Chat */}
            <div className="space-y-2.5 pt-3">
              {isShopProduct ? (
                <Button
                  onClick={handleAddToCart}
                  className="w-full bg-[#febd69] hover:bg-[#f3a847] text-[#0f1111] py-6 text-base font-bold shadow-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
                >
                  <ShoppingBag size={18} /> Add to Cart (Cash on Delivery)
                </Button>
              ) : (
                <div className="rounded-xl border border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/30 p-3 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2.5">
                  <Store size={16} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-blue-900 dark:text-blue-200">Individual Seller Listing:</span>{" "}
                    Cart & delivery are reserved for verified Campus Shops. Please chat with the seller below to arrange a direct meetup & cash handover!
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Link
                  href={`/messages?sellerId=${encodeURIComponent(seller._id || "")}&sellerName=${encodeURIComponent(
                    shop?.shopName || seller.fullName || "Seller"
                  )}&productId=${encodeURIComponent(product._id)}&productTitle=${encodeURIComponent(
                    product.title
                  )}&productPrice=${encodeURIComponent(product.price)}&productImage=${encodeURIComponent(
                    images[0]?.thumbnailUrl || images[0]?.url || ""
                  )}`}
                  className="flex-1"
                >
                  <Button className={`w-full border-brand-emerald bg-brand-emerald text-white hover:bg-[#0d665f] ${isShopProduct ? "py-5 text-sm" : "py-6 text-base font-bold"} font-semibold shadow-sm transition-all hover:scale-[1.01]`}>
                    <MessageCircle size={18} className="mr-2" /> Chat with {shop ? "Shop Owner" : "Seller"}
                  </Button>
                </Link>

                <Button
                  variant="ghost"
                  className={`border border-slate-200 dark:border-slate-700 ${isShopProduct ? "py-5" : "py-6"} px-4 hover:bg-slate-100 dark:hover:bg-slate-800`}
                  onClick={() => {
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(window.location.href);
                      alert("Link copied to clipboard!");
                    }
                  }}
                  title="Share Listing"
                >
                  <Share2 size={16} />
                </Button>

                <Button
                  variant="ghost"
                  className={`border border-slate-200 dark:border-slate-700 ${isShopProduct ? "py-5" : "py-6"} px-4 hover:bg-red-50 text-slate-500 hover:text-red-600 dark:hover:bg-red-950/40`}
                  onClick={() => setReportModalOpen(true)}
                  title="Report Scam or Fake Ad"
                >
                  <Flag size={16} />
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-500/20 bg-emerald-50/50 p-3 text-xs text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 flex items-start gap-2">
              <ShieldCheck size={16} className="shrink-0 mt-0.5 text-emerald-600" />
              <div>
                <strong>{isShopProduct ? "Zero-Risk Room Delivery:" : "Campus Meetup Safety:"}</strong>{" "}
                {isShopProduct
                  ? "Place your order with zero online transaction. Pay cash upon delivery to your hall or room."
                  : "Inspect the item in person inside CUET campus before finalizing direct cash payment."}
              </div>
            </div>
          </Card>

          {/* Shop Card (if item belongs to a campus store) */}
          {shop && (
            <Card className="p-5 space-y-3 border-2 border-brand-emerald/30 bg-emerald-50/30 dark:bg-emerald-950/20">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand-emerald">
                  Campus Store Listing
                </span>
                <span className="rounded-full bg-brand-emerald/10 text-brand-emerald text-[11px] font-semibold px-2 py-0.5">
                  {shop.category || "Store"}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-emerald text-white font-bold text-lg shadow-sm">
                  <Store size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-base text-slate-900 dark:text-white">
                      {shop.shopName}
                    </h4>
                    {shop.isVerified && (
                      <CheckCircle2 size={15} className="text-brand-emerald" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{shop.location || "CUET Campus"}</p>
                </div>
              </div>

              <Link href={`/shops/${shop._id}`} className="block pt-1">
                <Button variant="ghost" className="w-full text-xs font-semibold border border-brand-emerald/40 text-brand-emerald hover:bg-brand-emerald hover:text-white">
                  Visit Campus Store & View All Products
                </Button>
              </Link>
            </Card>
          )}

          {/* Seller Profile Card */}
          <Card className="p-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {shop ? "Merchant Information" : "Seller Information"}
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-emerald/10 text-brand-emerald font-bold text-lg">
                {seller.fullName?.[0] || "?"}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-semibold text-base">{seller.fullName}</h4>
                  {seller.isVerified && (
                    <span title="Verified CUET Member">
                      <CheckCircle2 size={15} className="text-brand-emerald" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">{seller.department}</p>
                <p className="text-xs text-slate-500">{seller.hall}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Public Questions & Comments Section ── */}
      <Card className="p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Public Questions & Discussions</span>
            <span className="rounded-full bg-brand-emerald/10 text-brand-emerald px-2.5 py-0.5 text-xs font-bold">
              {queries.length}
            </span>
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Have a question about this product? Ask publicly below so the seller and other students can answer.
          </p>
        </div>

        {/* Question Submission Form */}
        <form onSubmit={handlePostQuestion} className="space-y-3">
          <div className="relative">
            <textarea
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder={
                isLoggedIn
                  ? "Ask about condition, warranty, battery health, or campus pickup spot..."
                  : "Please sign in to ask a question about this product."
              }
              disabled={!isLoggedIn}
              rows={3}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 p-3.5 text-sm text-slate-900 dark:text-white outline-none focus:border-brand-emerald disabled:opacity-60 resize-none shadow-sm"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {isLoggedIn ? `Posting as ${user?.fullName || "Student"}` : "Log in to join the conversation"}
            </span>

            {isLoggedIn ? (
              <Button
                type="submit"
                disabled={submittingQuestion || !newQuestion.trim()}
                className="bg-brand-emerald text-white hover:bg-[#0d665f] text-xs font-semibold px-4 py-2"
              >
                {submittingQuestion ? (
                  <>
                    <Loader2 size={14} className="animate-spin mr-1.5" /> Posting...
                  </>
                ) : (
                  <>
                    <Send size={14} className="mr-1.5" /> Post Question
                  </>
                )}
              </Button>
            ) : (
              <Link href="/login">
                <Button className="bg-brand-emerald text-white hover:bg-[#0d665f] text-xs font-semibold">
                  Sign In to Ask
                </Button>
              </Link>
            )}
          </div>
        </form>

        {/* Questions List */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-4">
          {loadingQueries ? (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <Loader2 size={20} className="animate-spin mr-2" />
              <span className="text-xs">Loading questions...</span>
            </div>
          ) : queries.length === 0 ? (
            <div className="py-8 text-center text-slate-400 space-y-1">
              <p className="text-sm font-semibold">No questions asked yet.</p>
              <p className="text-xs text-slate-500">Be the first student to ask about this item!</p>
            </div>
          ) : (
            queries.map((q) => (
              <div
                key={q._id}
                className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30 p-4 space-y-3"
              >
                {/* Asker info & question */}
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs">
                    {q.asker?.fullName?.[0] || "?"}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white">
                        {q.asker?.fullName}
                      </span>
                      {q.asker?.department && (
                        <span className="text-[11px] text-slate-400">
                          • {q.asker.department}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 ml-auto">
                        {new Date(q.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="mt-1 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                      Q: {q.question}
                    </p>
                  </div>
                </div>

                {/* Existing Answers */}
                {q.answers && q.answers.length > 0 && (
                  <div className="ml-6 sm:ml-10 space-y-2 border-l-2 border-emerald-500/30 pl-3 sm:pl-4 pt-1">
                    {q.answers.map((ans) => (
                      <div key={ans._id} className="text-xs space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {ans.answerer?.fullName}
                          </span>
                          {ans.isSellerAnswer && (
                            <span className="rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold">
                              Seller Answer
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">
                            {new Date(ans.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                          {ans.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply button / Inline form */}
                <div className="ml-6 sm:ml-10 pt-1">
                  {replyOpenFor === q._id ? (
                    <div className="space-y-2 pt-2">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write your answer or response..."
                        rows={2}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-brand-emerald resize-none"
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handlePostReply(q._id)}
                          disabled={submittingReply || !replyText.trim()}
                          className="bg-brand-emerald text-white text-xs px-3 py-1 h-auto"
                        >
                          {submittingReply ? "Posting..." : "Submit Reply"}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setReplyOpenFor(null);
                            setReplyText("");
                          }}
                          className="text-xs px-2.5 py-1 h-auto text-slate-500"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        if (!isLoggedIn) {
                          alert("Please sign in to reply to questions.");
                          return;
                        }
                        setReplyOpenFor(q._id);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-emerald hover:underline"
                    >
                      <CornerDownRight size={12} /> Reply to this question
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Isolated High-Definition Product Photo Zoom Modal */}
      <ProductPhotoZoomModal
        isOpen={isZoomModalOpen}
        onClose={() => setIsZoomModalOpen(false)}
        images={images}
        initialIndex={activeImageIndex}
        productTitle={product.title}
      />

      {/* Student Abuse & Scam Reporting Modal */}
      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        targetType="product"
        targetId={product._id}
        targetTitle={product.title}
      />
    </div>
  );
}
