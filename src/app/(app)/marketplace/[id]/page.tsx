"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
  averageRating?: number;
  totalReviews?: number;
  createdAt?: string;
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
      sizes="(max-width: 1024px) 100vw, 60vw"
      className={className}
    />
  );
}

export default function ProductDetailsPage() {
  const params = useParams();
  const id = params?.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const res = await fetch(`http://localhost:5000/api/products/${id}`);
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
    };
    fetchProduct();
  }, [id]);

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

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/marketplace" className="hover:text-brand-emerald">
          Marketplace
        </Link>
        <span>/</span>
        <span className="text-slate-700 dark:text-slate-300">{product.category}</span>
        <span>/</span>
        <span className="line-clamp-1 text-slate-900 font-medium dark:text-white">
          {product.title}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* ── Photo Gallery Section ── */}
        <div className="space-y-3">
          <Card className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800">
            {/* Main Stage Image */}
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-950 flex items-center justify-center">
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

              {/* Navigation arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setActiveImageIndex((prev) =>
                        prev > 0 ? prev - 1 : images.length - 1
                      )
                    }
                    className="focus-ring absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition hover:bg-black/80"
                    aria-label="Previous image"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={() =>
                      setActiveImageIndex((prev) =>
                        prev < images.length - 1 ? prev + 1 : 0
                      )
                    }
                    className="focus-ring absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition hover:bg-black/80"
                    aria-label="Next image"
                  >
                    <ChevronRight size={18} />
                  </button>
                </>
              )}

              {/* Photo index badge */}
              {images.length > 0 && (
                <div className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
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
                    onClick={() => setActiveImageIndex(idx)}
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
                <span className="text-slate-400">Pickup Area</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {product.location || "CUET Campus"}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* ── Pricing, Actions & Seller Card ── */}
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

                {/* Tags List */}
                {Array.isArray((product as any).tags) && (product as any).tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(product as any).tags.map((tag: string) => (
                      <span
                        key={tag}
                        className="rounded-md bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => setIsSaved(!isSaved)}
                className={`focus-ring rounded-full p-2.5 transition border ${
                  isSaved
                    ? "bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/40"
                    : "border-slate-200 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 text-slate-500"
                }`}
                title="Save to wishlist"
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

            <div className="flex flex-col sm:flex-row gap-3 pt-3">
              <Link
                href={`/messages?sellerId=${encodeURIComponent(seller._id || "")}&sellerName=${encodeURIComponent(
                  seller.fullName || "Seller"
                )}&productId=${encodeURIComponent(product._id)}&productTitle=${encodeURIComponent(
                  product.title
                )}&productPrice=${encodeURIComponent(product.price)}&productImage=${encodeURIComponent(
                  images[0]?.thumbnailUrl || images[0]?.url || ""
                )}`}
                className="flex-1"
              >
                <Button className="w-full border-brand-emerald bg-brand-emerald text-white hover:bg-[#0d665f] py-6 text-base font-semibold shadow-sm">
                  <MessageCircle size={18} className="mr-2" /> Chat with Seller
                </Button>
              </Link>
              <Button
                variant="ghost"
                className="border border-slate-200 dark:border-slate-700 py-6"
              >
                <Share2 size={18} className="mr-1.5" /> Share
              </Button>
            </div>

            <div className="rounded-xl border border-emerald-500/20 bg-emerald-50/50 p-3 text-xs text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 flex items-start gap-2">
              <ShieldCheck size={16} className="shrink-0 mt-0.5 text-emerald-600" />
              <div>
                <strong>Safe Campus Handover:</strong> Always inspect the item in
                person at a public campus spot (e.g. Library, Hall gate, Cafeteria)
                before paying.
              </div>
            </div>
          </Card>

          {/* Seller Profile Card */}
          <Card className="p-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Seller Information
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-emerald/10 text-brand-emerald font-bold text-lg">
                {seller.fullName?.[0] || "?"}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-semibold text-base">{seller.fullName}</h4>
                  {seller.isVerified && (
                    <span title="Verified CUET Student">
                      <CheckCircle2 size={15} className="text-brand-emerald" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">{seller.department}</p>
                <p className="text-xs text-slate-500">{seller.hall}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-center text-xs">
              <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800/50">
                <span className="text-slate-400">Rating</span>
                <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                  ★ {seller.rating || "N/A"}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800/50">
                <span className="text-slate-400">Reviews</span>
                <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                  {product.totalReviews || 0} reviews
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
