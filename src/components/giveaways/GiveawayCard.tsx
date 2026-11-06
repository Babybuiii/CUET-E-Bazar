"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Gift,
  MapPin,
  Clock,
  User,
  Users,
  Tag,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Trash2,
  MessageSquare
} from "lucide-react";
import { Card } from "@/components/ui/card";
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

const conditionColors: Record<string, string> = {
  New:        "bg-emerald-100 text-emerald-800 border-emerald-300",
  "Like New": "bg-sky-100    text-sky-800    border-sky-300",
  Good:       "bg-amber-100  text-amber-800  border-amber-300",
  Fair:       "bg-orange-100 text-orange-800 border-orange-300"
};

// ── GiveawayCard ──────────────────────────────────────────────────────────────
interface GiveawayCardProps {
  giveaway: Giveaway;
  currentUserId?: string;
  onClaim: (giveaway: Giveaway) => void;
  onUnpublish?: (giveaway: Giveaway) => void;
  onMessage?: (giveaway: Giveaway) => void;
}

export function GiveawayCard({
  giveaway,
  currentUserId,
  onClaim,
  onUnpublish,
  onMessage
}: GiveawayCardProps) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(giveaway.deadline));

  // Live countdown
  useEffect(() => {
    const id = setInterval(() => {
      setTimeLeft(getTimeLeft(giveaway.deadline));
    }, 1000);
    return () => clearInterval(id);
  }, [giveaway.deadline]);

  const donorId = typeof giveaway.donor === "object" ? giveaway.donor?._id : giveaway.donor;
  const isOwnGiveaway = Boolean(currentUserId && donorId && String(donorId) === String(currentUserId));

  const claimantId = typeof giveaway.selectedUser === "object" ? giveaway.selectedUser?._id : giveaway.selectedUser;
  const isClaimant = Boolean(currentUserId && claimantId && String(claimantId) === String(currentUserId));

  const displayImage = giveaway.images?.[0] || null;

  // ── Status config (FCFS) ──────────────────────────────────────────────────
  const statusConfig = {
    available: {
      label:    "Available",
      dot:      "bg-emerald-500",
      canClaim: true
    },
    claimed: {
      label:    "Claimed",
      dot:      "bg-slate-400",
      canClaim: false
    },
    expired: {
      label:    "Expired",
      dot:      "bg-red-400",
      canClaim: false
    },
    cancelled: {
      label:    "Cancelled",
      dot:      "bg-rose-400",
      canClaim: false
    }
  };

  const sc = statusConfig[giveaway.status] ?? statusConfig.available;

  // ── Action button ─────────────────────────────────────────────────────────
  function ActionButton() {
    // 1. Available giveaway — not donor's: "Claim Item"
    if (giveaway.status === "available" && !isOwnGiveaway) {
      return (
        <button
          type="button"
          onClick={() => onClaim(giveaway)}
          className="w-full rounded-full bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0d665f] active:scale-95 shadow-sm"
        >
          Claim Item
        </button>
      );
    }

    // 2. Available giveaway — donor's own: "Unpublish Giveaway"
    if (giveaway.status === "available" && isOwnGiveaway) {
      return (
        <button
          type="button"
          onClick={() => onUnpublish?.(giveaway)}
          className="flex w-full items-center justify-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-600 px-4 py-2 text-sm font-semibold transition"
          title="Unpublish this giveaway"
        >
          <Trash2 size={14} />
          <span>Unpublish Giveaway</span>
        </button>
      );
    }

    // 3. Claimed giveaway — logged-in user is the claimant: "Message Donor"
    if (giveaway.status === "claimed" && isClaimant) {
      return (
        <button
          type="button"
          onClick={() => onMessage?.(giveaway)}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-[#0f766e] hover:bg-[#0d665f] active:scale-95 text-white px-4 py-2 text-sm font-semibold shadow-sm transition"
          title="Message Donor to coordinate pickup"
        >
          <MessageSquare size={15} />
          <span>Message Donor</span>
        </button>
      );
    }

    // 4. Claimed giveaway — logged-in user is the donor: "Message Claimant"
    if (giveaway.status === "claimed" && isOwnGiveaway) {
      return (
        <button
          type="button"
          onClick={() => onMessage?.(giveaway)}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-[#0f766e] hover:bg-[#0d665f] active:scale-95 text-white px-4 py-2 text-sm font-semibold shadow-sm transition"
          title="Message Claimant to coordinate pickup"
        >
          <MessageSquare size={15} />
          <span>Message Claimant</span>
        </button>
      );
    }

    // 5. Claimed giveaway — other students: "Already Claimed"
    if (giveaway.status === "claimed") {
      return (
        <div className="flex items-center justify-center gap-2 w-full rounded-full bg-slate-100 border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500">
          <CheckCircle2 size={14} /> Already Claimed
        </div>
      );
    }

    // 6. Expired
    if (giveaway.status === "expired") {
      return (
        <div className="flex items-center justify-center gap-2 w-full rounded-full bg-red-50 border border-red-200 px-4 py-2 text-sm font-semibold text-red-500">
          <AlertTriangle size={14} /> Expired
        </div>
      );
    }

    // 7. Cancelled
    if (giveaway.status === "cancelled") {
      return (
        <div className="flex items-center justify-center gap-2 w-full rounded-full bg-rose-50 border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-500">
          <XCircle size={14} /> Cancelled
        </div>
      );
    }

    return null;
  }

  return (
    <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.2 }} className="h-full">
      <Card className="group h-full flex flex-col p-0 overflow-hidden border border-slate-200 hover:shadow-md transition-shadow duration-200 bg-white">

        {/* ── Image (16:9) ───────────────────────────────────────────────── */}
        <div className="relative w-full overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100" style={{ aspectRatio: "16/9" }}>
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
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300">
              <Gift size={48} />
              <span className="mt-2 text-xs font-medium text-slate-400">No photo</span>
            </div>
          )}

          {/* FREE badge */}
          <span className="absolute top-2 left-2 rounded-full bg-[#0f766e] px-2.5 py-0.5 text-[10px] font-extrabold text-white shadow-sm">
            100% FREE
          </span>

          {/* Donor ownership badge */}
          {isOwnGiveaway && (
            <span className="absolute top-2 left-24 rounded-full bg-slate-900/75 backdrop-blur-sm px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
              Your Post
            </span>
          )}

          {/* Condition badge */}
          <span className={`absolute top-2 right-2 rounded-full border px-2 py-0.5 text-[10px] font-bold ${conditionColors[giveaway.condition] || "bg-slate-100 text-slate-700 border-slate-300"}`}>
            {giveaway.condition}
          </span>

          {/* Time left badge (bottom) */}
          <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
            <Clock size={10} /> {timeLeft}
          </span>

          {/* Status dot */}
          <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-slate-700 shadow-sm">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${sc.dot}`} />
            {sc.label}
          </span>
        </div>

        {/* ── Info ───────────────────────────────────────────────────────── */}
        <div className="flex flex-col flex-1 gap-2 p-3 sm:p-4">

          {/* Title */}
          <h3 className="line-clamp-2 text-sm font-semibold text-slate-900 leading-snug">
            {giveaway.title}
          </h3>

          {/* Description */}
          {giveaway.description && (
            <p className="line-clamp-2 text-xs text-slate-500">
              {giveaway.description}
            </p>
          )}

          {/* Category & Claimed Count */}
          <div className="flex items-center justify-between gap-1 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <Tag size={11} />
              <span>{giveaway.category}</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
              <Users size={11} className="text-slate-400" />
              <span>
                {giveaway.claimedCount && giveaway.claimedCount > 0
                  ? `${giveaway.claimedCount} claimed`
                  : "0 claimed"}
              </span>
            </div>
          </div>

          {/* Donor Profile */}
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200">
              {giveaway.donor?.avatarUrl ? (
                <Image
                  src={giveaway.donor.avatarUrl}
                  alt={giveaway.donor.fullName}
                  width={24}
                  height={24}
                  className="rounded-full object-cover"
                />
              ) : (
                <User size={12} className="text-emerald-600" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-800">{giveaway.donor?.fullName || "Anonymous"}</p>
              {giveaway.donor?.department && (
                <p className="truncate text-[10px] text-slate-400">{giveaway.donor.department}</p>
              )}
            </div>
          </div>

          {/* Location & Pickup Spot */}
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <MapPin size={11} className="shrink-0" />
            <span className="truncate">
              {giveaway.location}{giveaway.pickupSpot ? ` — ${giveaway.pickupSpot}` : ""}
            </span>
          </div>

          {/* Claimant experience badge: "You Claimed This Item" */}
          {giveaway.status === "claimed" && isClaimant && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200/80 px-2.5 py-1.5 text-xs text-emerald-800 font-semibold flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-[#0f766e] shrink-0" />
              <span>You Claimed This Item</span>
            </div>
          )}

          {/* Donor's view: "Claimed By [Student Name]" with profile data */}
          {giveaway.status === "claimed" && isOwnGiveaway && giveaway.selectedUser && (
            <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/70 p-2.5 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Claimed By</p>
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white border border-emerald-300">
                  {giveaway.selectedUser.avatarUrl ? (
                    <Image
                      src={giveaway.selectedUser.avatarUrl}
                      alt={giveaway.selectedUser.fullName}
                      width={24}
                      height={24}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <User size={12} className="text-emerald-700" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-slate-900">{giveaway.selectedUser.fullName}</p>
                  {giveaway.selectedUser.department && (
                    <p className="truncate text-[10px] text-slate-500">{giveaway.selectedUser.department}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action button pinned to bottom */}
          <div className="mt-auto pt-2">
            <ActionButton />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
