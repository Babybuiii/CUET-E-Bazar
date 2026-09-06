"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Heart, MapPin, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { isWishlistedLocally, toggleWishlist } from "@/lib/wishlist";

type ProductImage = {
  url: string;
  thumbnailUrl: string;
  publicId?: string;
};

type Product = {
  id?: string;
  _id?: string;
  title: string;
  price: number;
  originalPrice?: number | null;
  discount?: number;
  condition: string;
  status?: string;
  rating?: number;
  averageRating?: number;
  totalReviews?: number;
  reviewsCount?: number;
  seller?: {
    _id?: string;
    fullName?: string;
    rating?: number;
    totalReviewsReceived?: number;
  };
  location?: string;
  image?: string;
  tags?: string[];
  images?: (ProductImage | string)[];
};

/** Renders an image that works for both Cloudinary URLs and base64 data URLs without cropping or overflowing */
function ProductImage({ src, alt }: { src: string; alt: string }) {
  // Next.js <Image> does NOT support data: URLs — use native <img> as fallback
  if (src.startsWith("data:")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-contain p-2 transition duration-300 group-hover:scale-105 select-none"
      />
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      quality={95}
      unoptimized={src.includes("cloudinary.com")}
      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
      loading="lazy"
      className="object-contain p-2 transition duration-300 group-hover:scale-105 select-none"
    />
  );
}

export function ProductCard({ product }: { product: Product }) {
  const productId = product._id || product.id || "";
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    if (!productId) return;
    setIsWishlisted(isWishlistedLocally(productId));

    const handleWishlistChange = () => {
      setIsWishlisted(isWishlistedLocally(productId));
    };

    window.addEventListener("wishlist-updated", handleWishlistChange);
    return () => window.removeEventListener("wishlist-updated", handleWishlistChange);
  }, [productId]);

  const handleToggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!productId) return;
    const newState = await toggleWishlist(productId);
    setIsWishlisted(newState);
  };

  // Choose optimal image URL — prioritize full high-res original URL
  const firstImage = product.images?.[0];
  let displayImage =
    typeof firstImage === "object"
      ? (firstImage.url || firstImage.thumbnailUrl)
      : typeof firstImage === "string"
      ? firstImage
      : product.image ||
        "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=1200&q=85";

  // Upgrade any legacy Cloudinary transformations to high-res (1200px, q_auto:best)
  if (displayImage.includes("res.cloudinary.com")) {
    displayImage = displayImage.replace(/c_fill,w_\d+,h_\d+,q_[^/]+,f_[^/]+/, "c_limit,w_1200,q_auto:best,f_auto");
    displayImage = displayImage.replace(/c_limit,w_\d+,h_\d+/, "c_limit,w_1200,q_auto:best,f_auto");
  }

  // Derive real rating from product or seller (null if unrated)
  const realRating =
    typeof product.averageRating === "number" && product.averageRating > 0
      ? product.averageRating
      : typeof product.rating === "number" && product.rating > 0
      ? product.rating
      : typeof product.seller?.rating === "number" && product.seller.rating > 0
      ? product.seller.rating
      : null;

  const reviewsTotal =
    product.totalReviews ||
    product.reviewsCount ||
    product.seller?.totalReviewsReceived ||
    0;

  return (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }} className="h-full">
      <Card className="group h-full flex flex-col justify-between overflow-hidden p-0 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition">
        {/* Photo Container: Clean, crisp studio background with zero artificial blur smudges */}
        <div className="relative h-40 sm:h-56 w-full shrink-0 overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100/70 dark:from-slate-900/60 dark:to-slate-900 flex items-center justify-center border-b border-slate-100 dark:border-slate-800/80">
          <Link href={`/marketplace/${productId}`} className="absolute inset-0 z-0 flex items-center justify-center">
            {/* Sharp full-picture foreground */}
            <div className="relative z-10 h-full w-full flex items-center justify-center">
              <ProductImage src={displayImage} alt={product.title} />
            </div>
          </Link>

          {/* Discount Badge */}
          {Number(product.discount) > 0 && (
            <span className="absolute top-2 left-2 sm:top-2.5 sm:left-2.5 z-20 rounded-full bg-rose-600 px-2 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-extrabold text-white shadow-sm backdrop-blur-sm pointer-events-none">
              {product.discount}% OFF
            </span>
          )}

          {/* Status Overlay if Sold / Reserved */}
          {product.status && product.status !== "active" && (
            <span
              className={`absolute bottom-2 left-2 sm:bottom-2.5 sm:left-2.5 z-20 rounded-full px-2 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-extrabold uppercase shadow-sm pointer-events-none ${
                product.status === "sold"
                  ? "bg-rose-900/90 text-white"
                  : "bg-amber-800/90 text-white"
              }`}
            >
              {product.status}
            </span>
          )}

          {/* Floating Wishlist Heart Button on top-right of image */}
          <button
            type="button"
            onClick={handleToggleWishlist}
            aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            title={isWishlisted ? "Saved in wishlist" : "Save to wishlist"}
            className={`absolute top-2 right-2 sm:top-2.5 sm:right-2.5 z-20 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full shadow-md backdrop-blur-md transition hover:scale-110 active:scale-90 ${
              isWishlisted
                ? "bg-white dark:bg-slate-900 text-rose-500 ring-2 ring-rose-500/40"
                : "bg-white/85 dark:bg-slate-900/85 text-slate-500 hover:bg-white dark:hover:bg-slate-900 hover:text-rose-500"
            }`}
          >
            <Heart
              size={14}
              className={`transition-all duration-200 sm:w-4 sm:h-4 ${
                isWishlisted ? "fill-rose-500 text-rose-500 scale-110" : ""
              }`}
            />
          </button>
        </div>

        {/* Info Container with constant height layout (p-2.5 on mobile, p-4 on desktop) */}
        <div className="flex flex-col flex-1 justify-between p-2.5 sm:p-4 space-y-1.5 sm:space-y-2">
          {/* Title Row - Constant 2-line height (h-9 on mobile, h-10 on desktop) */}
          <div className="flex items-start justify-between gap-1.5">
            <Link href={`/marketplace/${productId}`} className="flex-1 hover:underline">
              <h3 className="line-clamp-2 h-8 sm:h-10 text-xs sm:text-sm font-semibold sm:font-medium text-[#0f1111] dark:text-slate-100 leading-snug">
                {product.title}
              </h3>
            </Link>
            <button
              type="button"
              onClick={handleToggleWishlist}
              aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
              title={isWishlisted ? "Saved in wishlist" : "Save to wishlist"}
              className={`hidden sm:inline-flex focus-ring rounded-lg p-1.5 transition shrink-0 ${
                isWishlisted
                  ? "text-rose-600 bg-rose-50 dark:bg-rose-950/40"
                  : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-rose-500"
              }`}
            >
              <Heart
                size={16}
                className={`transition-all duration-200 active:scale-125 ${
                  isWishlisted ? "fill-rose-500 text-rose-500" : ""
                }`}
              />
            </button>
          </div>

          {/* Condition + Tags Row - Constant height (h-5 on mobile, h-6 on desktop) */}
          <div className="flex items-center gap-1 sm:gap-1.5 h-5 sm:h-6 overflow-hidden text-[11px] sm:text-xs">
            <span className="text-slate-500 shrink-0">{product.condition}</span>
            {Array.isArray(product.tags) && product.tags.length > 0 && (
              <>
                <span className="text-slate-300 dark:text-slate-700 text-xs shrink-0">•</span>
                <div className="flex items-center gap-1 overflow-hidden">
                  {product.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="truncate max-w-[70px] sm:max-w-[90px] rounded-md bg-emerald-50 dark:bg-emerald-950/40 px-1 sm:px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 shrink-0"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Price Row - Constant height (h-6 on mobile, h-7 on desktop) */}
          <div className="flex items-baseline gap-1.5 sm:gap-2 h-6 sm:h-7">
            <span className="font-display text-base sm:text-xl font-bold text-[#0f1111] dark:text-slate-100">
              ৳{product.price.toLocaleString()}
            </span>
            {product.originalPrice && Number(product.originalPrice) > Number(product.price) && (
              <span className="text-[10px] sm:text-xs text-slate-400 line-through">
                ৳{Number(product.originalPrice).toLocaleString()}
              </span>
            )}
          </div>

          {/* Rating & Location Row - Constant height (h-4 on mobile, h-5 on desktop) */}
          <div className="flex items-center justify-between text-[10px] sm:text-xs text-slate-500 h-4 sm:h-5">
            {realRating !== null ? (
              <span className="inline-flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                <Star size={11} className="text-amber-500 fill-amber-500 sm:w-3 sm:h-3" />
                <span>{realRating.toFixed(1)}</span>
                {reviewsTotal > 0 && (
                  <span className="text-[10px] sm:text-[11px] font-normal text-slate-400">
                    ({reviewsTotal})
                  </span>
                )}
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 sm:gap-1 text-slate-400 dark:text-slate-500 text-[10px] sm:text-[11px]">
                <Star size={11} className="text-slate-300 dark:text-slate-600 sm:w-3 sm:h-3" />
                <span>Unrated</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1 truncate max-w-[85px] sm:max-w-[120px]">
              <MapPin size={11} className="shrink-0 sm:w-3 sm:h-3" /> {product.location || "CUET Campus"}
            </span>
          </div>

          {/* Buy Button pinned to bottom */}
          <div className="pt-1 mt-auto">
            <Link
              href={`/marketplace/${productId}`}
              className="focus-ring block w-full rounded-full border border-[#0F766E] bg-[#0F766E] px-2 sm:px-3 py-1 sm:py-1.5 text-center text-xs sm:text-sm font-semibold text-white transition hover:bg-[#0d665f]"
            >
              {product.status === "sold" ? "Sold" : "Buy"}
            </Link>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
