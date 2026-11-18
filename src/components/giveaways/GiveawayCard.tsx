"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import {
  Gift,
  MapPin,
  Clock,
  User,
  Tag,
  CheckCircle2,
  XCircle,
  AlertCircle
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import type { Giveaway } from "@/types/giveaway";

// ── Helpers ───────────────────────────────────────────────────────────────────
function getTimeLeft(deadline: string): string {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h > 24) {
    const d = Math.floor(h / 24);
    return `${d}d left`;
  }
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

interface GiveawayCardProps {
  giveaway: Giveaway;
  onClaim: (giveaway: Giveaway) => void;
  onApprove?: (giveaway: Giveaway) => void;
}

export function GiveawayCard({
  giveaway,
  onClaim,
  onApprove
}: GiveawayCardProps) {
  const { user } = useAuth();
  const isDonor = Boolean(
    user && (
      (user._id && giveaway.donor?._id && String(user._id) === String(giveaway.donor._id)) ||
      (user.id && giveaway.donor?._id && String(user.id) === String(giveaway.donor._id)) ||
      (user._id && giveaway.donor && typeof giveaway.donor === "string" && String(user._id) === String(giveaway.donor)) ||
      (user.id && giveaway.donor && typeof giveaway.donor === "string" && String(user.id) === String(giveaway.donor))
    )
  );
  const displayImage = giveaway.images?.[0] || null;
  const timeLeft = getTimeLeft(giveaway.deadline);

  // Status configuration (constant for all viewers)
  const statusConfig: Record<string, { label: string; dot: string; textColor: string; bgColor: string }> = {
    available: {
      label: "Available",
      dot: "bg-emerald-500",
      textColor: "text-emerald-700 dark:text-emerald-300",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/40"
    },
    pending: {
      label: "Pending",
      dot: "bg-amber-500",
      textColor: "text-amber-700 dark:text-amber-300",
      bgColor: "bg-amber-50 dark:bg-amber-950/40"
    },
    claimed: {
      label: "Claimed",
      dot: "bg-blue-500",
      textColor: "text-blue-700 dark:text-blue-300",
      bgColor: "bg-blue-50 dark:bg-blue-950/40"
    },
    given_away: {
      label: "Given Away",
      dot: "bg-brand-emerald",
      textColor: "text-brand-emerald dark:text-teal-300",
      bgColor: "bg-teal-50 dark:bg-teal-950/40"
    },
    expired: {
      label: "Expired",
      dot: "bg-red-400",
      textColor: "text-red-700 dark:text-red-300",
      bgColor: "bg-red-50 dark:bg-red-950/40"
    },
    cancelled: {
      label: "Cancelled",
      dot: "bg-rose-400",
      textColor: "text-rose-700 dark:text-rose-300",
      bgColor: "bg-rose-50 dark:bg-rose-950/40"
    }
  };

  const sc = statusConfig[giveaway.status] ?? statusConfig.available;

  return (
    <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.2 }} className="h-full">
      <Card className="group h-full flex flex-col p-0 overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow duration-200">

        {/* ── Image ───────────────────────────────────────────────────────── */}
        <div className="relative w-full overflow-hidden bg-slate-100 dark:bg-slate-800" style={{ aspectRatio: "16/9" }}>
          {displayImage ? (
            <Image
              src={displayImage}
              alt={giveaway.title}
              fill
              unoptimized={displayImage.includes("cloudinary.com") || displayImage.startsWith("data:")}
              className="object-cover transition duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
              <Gift size={40} />
              <span className="mt-1 text-xs font-medium text-slate-400">No photo</span>
            </div>
          )}

          {/* 100% Free badge */}
          <span className="absolute top-2 left-2 rounded-full bg-brand-emerald px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm">
            Free
          </span>

          {/* Condition badge */}
          <span className="absolute top-2 right-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200 shadow-sm">
            {giveaway.condition}
          </span>

          {/* Time left badge */}
          <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-slate-900/90 px-2 py-0.5 text-[11px] font-semibold text-white">
            <Clock size={11} /> {timeLeft}
          </span>

          {/* Status badge */}
          <span className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-full bg-white/95 dark:bg-slate-900/95 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200 shadow-sm border border-slate-200 dark:border-slate-700">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${sc.dot}`} />
            {sc.label}
          </span>
        </div>

        {/* ── Info ───────────────────────────────────────────────────────── */}
        <div className="flex flex-col flex-1 gap-2 p-3 sm:p-4">

          {/* Title */}
          <h2 className="line-clamp-2 text-sm font-semibold text-slate-900 dark:text-white leading-snug">
            {giveaway.title}
          </h2>

          {/* Category & Location */}
          <div className="flex items-center justify-between gap-1 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1">
              <Tag size={12} className="text-slate-400" />
              <span>{giveaway.category}</span>
            </div>
            <div className="flex items-center gap-1 truncate">
              <MapPin size={12} className="text-slate-400 shrink-0" />
              <span className="truncate">{giveaway.location}</span>
            </div>
          </div>

          {/* Donor Profile */}
          <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              {giveaway.donor?.avatarUrl ? (
                <Image
                  src={giveaway.donor.avatarUrl}
                  alt={giveaway.donor.fullName}
                  width={20}
                  height={20}
                  className="rounded-full object-cover"
                />
              ) : (
                <User size={10} className="text-slate-500" />
              )}
            </div>
            <div className="min-w-0 flex-1 truncate">
              <span className="font-medium text-slate-800 dark:text-slate-200">{giveaway.donor?.fullName || "CUET Member"}</span>
              {giveaway.donor?.department && (
                <span className="text-[11px] text-slate-400 ml-1 truncate">({giveaway.donor.department})</span>
              )}
            </div>
          </div>

          {/* Action Button & Status */}
          <div className="mt-auto pt-3">
            {giveaway.status === "available" ? (
              isDonor ? (
                <div className="flex items-center justify-center gap-1.5 w-full rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <span>Your Listing</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onClaim(giveaway)}
                  className="w-full rounded-xl bg-brand-emerald hover:bg-brand-emerald/90 active:scale-95 px-4 py-2 text-xs font-semibold text-white transition shadow-sm"
                >
                  Claim Item
                </button>
              )
            ) : giveaway.status === "pending" ? (
              isDonor && onApprove ? (
                <button
                  type="button"
                  onClick={() => onApprove(giveaway)}
                  className="w-full rounded-xl bg-brand-emerald hover:bg-brand-emerald/90 active:scale-95 px-4 py-2 text-xs font-semibold text-white transition shadow-sm flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 size={13} />
                  <span>Approve Claim</span>
                </button>
              ) : (
                <div className="flex items-center justify-center gap-1.5 w-full rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
                  <Clock size={13} className="text-amber-500" />
                  <span>Pending Approval</span>
                </div>
              )
            ) : giveaway.status === "claimed" ? (
              <div className="flex items-center justify-center gap-1.5 w-full rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <CheckCircle2 size={13} className="text-slate-500" />
                <span>Claimed</span>
              </div>
            ) : giveaway.status === "given_away" ? (
              <div className="flex items-center justify-center gap-1.5 w-full rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 px-3 py-2 text-xs font-semibold text-brand-emerald dark:text-teal-300">
                <CheckCircle2 size={13} className="text-brand-emerald" />
                <span>Given Away</span>
              </div>
            ) : giveaway.status === "expired" ? (
              <div className="flex items-center justify-center gap-1.5 w-full rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400">
                <AlertCircle size={13} />
                <span>Expired</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-1.5 w-full rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400">
                <XCircle size={13} />
                <span>Cancelled</span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
