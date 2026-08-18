"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Heart, MapPin, Star } from "lucide-react";
import { Card } from "@/components/ui/card";

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
  location?: string;
  image?: string;
  tags?: string[];
  images?: (ProductImage | string)[];
};

/** Renders an image that works for both Cloudinary URLs and base64 data URLs */
function ProductImage({ src, alt }: { src: string; alt: string }) {
  // Next.js <Image> does NOT support data: URLs — use native <img> as fallback
  if (src.startsWith("data:")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover transition duration-300 hover:scale-105"
      />
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      loading="lazy"
      className="object-cover transition duration-300 hover:scale-105"
    />
  );
}

export function ProductCard({ product }: { product: Product }) {
  const productId = product._id || product.id || "";

  // Choose optimal thumbnail URL
  const firstImage = product.images?.[0];
  const displayImage =
    typeof firstImage === "object" && firstImage?.thumbnailUrl
      ? firstImage.thumbnailUrl
      : typeof firstImage === "string"
      ? firstImage
      : product.image ||
        "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=900&q=80";

  return (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
      <Card className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition">
        <Link href={`/marketplace/${productId}`}>
          <div className="relative h-52 w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
            <ProductImage src={displayImage} alt={product.title} />

            {/* Discount Badge */}
            {Number(product.discount) > 0 && (
              <span className="absolute top-2.5 left-2.5 rounded-full bg-rose-600 px-2.5 py-0.5 text-[10px] font-extrabold text-white shadow-sm backdrop-blur-sm">
                {product.discount}% OFF
              </span>
            )}

            {/* Status Overlay if Sold / Reserved */}
            {product.status && product.status !== "active" && (
              <span
                className={`absolute top-2.5 right-2.5 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase shadow-sm ${
                  product.status === "sold"
                    ? "bg-rose-900/90 text-white"
                    : "bg-amber-800/90 text-white"
                }`}
              >
                {product.status}
              </span>
            )}
          </div>
        </Link>
        <div className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/marketplace/${productId}`} className="flex-1 hover:underline">
              <h3 className="line-clamp-2 text-sm font-medium text-[#0f1111] dark:text-slate-100">
                {product.title}
              </h3>
            </Link>
            <button
              aria-label="Add to wishlist"
              className="focus-ring rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500 transition"
            >
              <Heart size={16} />
            </button>
          </div>

          {/* Tags list */}
          {Array.isArray(product.tags) && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {product.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <p className="text-xs text-slate-500">{product.condition}</p>

          {/* Price with strikethrough original price if discounted */}
          <div className="flex items-baseline gap-2">
            <span className="font-display text-xl font-bold text-[#0f1111] dark:text-slate-100">
              ৳{product.price.toLocaleString()}
            </span>
            {product.originalPrice && Number(product.originalPrice) > Number(product.price) && (
              <span className="text-xs text-slate-400 line-through">
                ৳{Number(product.originalPrice).toLocaleString()}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <span className="inline-flex items-center gap-1 text-[#007185]">
              <Star size={13} className="text-amber-500" />{" "}
              {product.rating || (product as any).averageRating || 5.0}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin size={13} /> {product.location || "CUET Campus"}
            </span>
          </div>

          <Link
            href={`/marketplace/${productId}`}
            className="focus-ring mt-2 block w-full rounded-full border border-[#0F766E] bg-[#0F766E] px-3 py-1.5 text-center text-sm font-semibold text-white transition hover:bg-[#0d665f]"
          >
            {product.status === "sold" ? "View Details (Sold)" : "Buy"}
          </Link>
        </div>
      </Card>
    </motion.div>
  );
}
