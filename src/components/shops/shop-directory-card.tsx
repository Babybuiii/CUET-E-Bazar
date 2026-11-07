import Image from "next/image";
import { Store, Star, Users, Package, MapPin, BadgeCheck } from "lucide-react";
import { Card } from "@/components/ui/card";

export type DirectoryShop = {
  _id: string;
  shopName: string;
  slug: string;
  category: string;
  description?: string;
  logoUrl?: string;
  location?: string;
  isVerified: boolean;
  rating: number;
  totalReviews: number;
  followersCount: number;
  activeProducts: number;
};

/**
 * The shop card exactly as it renders in the Campus Shops directory.
 * Shared so the "how your shop appears" preview on My Shop cannot drift
 * from the real listing.
 */
export function ShopDirectoryCard({
  shop,
  interactive = true
}: {
  shop: DirectoryShop;
  interactive?: boolean;
}) {
  return (
    <Card className={`h-full ${interactive ? "transition hover:-translate-y-1 hover:shadow-md" : ""}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
          {shop.logoUrl ? (
            <Image
              src={shop.logoUrl}
              alt={shop.shopName}
              width={48}
              height={48}
              className="h-full w-full object-cover"
            />
          ) : (
            <Store className="text-brand-emerald" size={20} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate font-semibold">{shop.shopName}</p>
            {shop.isVerified && <BadgeCheck size={14} className="shrink-0 text-emerald-500" />}
          </div>
          <p className="mt-0.5 truncate text-xs font-medium text-brand-emerald">{shop.category}</p>
        </div>
      </div>

      {shop.description && (
        <p className="mt-2.5 line-clamp-2 text-xs text-slate-600 dark:text-slate-300">{shop.description}</p>
      )}

      {shop.location && (
        <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
          <MapPin size={11} /> {shop.location}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-3.5 gap-y-1 border-t border-slate-200 pt-2.5 text-[11px] text-slate-500 dark:border-slate-700 dark:text-slate-400">
        <span className="inline-flex items-center gap-1">
          <Package size={12} /> {shop.activeProducts} product{shop.activeProducts === 1 ? "" : "s"}
        </span>
        <span className="inline-flex items-center gap-1">
          <Star size={12} /> {shop.rating || 0} ({shop.totalReviews || 0})
        </span>
        <span className="inline-flex items-center gap-1">
          <Users size={12} /> {shop.followersCount || 0}
        </span>
      </div>
    </Card>
  );
}
