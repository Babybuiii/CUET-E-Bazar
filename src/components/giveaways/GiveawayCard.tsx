"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Gift,
  MapPin,
  Clock,
  User,
  BookOpen,
  Tag,
  CheckCircle2,
  Loader2,
  XCircle,
  TimerReset,
  AlertTriangle
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

function getBufferSecondsLeft(claimBufferEndsAt: string): number {
  return Math.max(0, Math.ceil((new Date(claimBufferEndsAt).getTime() - Date.now()) / 1000));
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
}

export function GiveawayCard({ giveaway, currentUserId, onClaim }: GiveawayCardProps) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(giveaway.deadline));
  const [bufferLeft, setBufferLeft] = useState<number | null>(
    giveaway.claimBufferEndsAt ? getBufferSecondsLeft(giveaway.claimBufferEndsAt) : null
  );

  // Live countdown
  useEffect(() => {
    const id = setInterval(() => {
      setTimeLeft(getTimeLeft(giveaway.deadline));
      if (giveaway.claimBufferEndsAt) {
        setBufferLeft(getBufferSecondsLeft(giveaway.claimBufferEndsAt));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [giveaway.deadline, giveaway.claimBufferEndsAt]);

  const isOwnGiveaway = currentUserId && giveaway.donor?._id === currentUserId;
  const displayImage  = giveaway.images?.[0] || null;

  // ── Status config ─────────────────────────────────────────────────────────
  const statusConfig = {
    available: {
      label:    "Available",
      dot:      "bg-emerald-500",
      canClaim: true
    },
    pending_draw: {
      label:    "Draw in Progress",
      dot:      "bg-amber-500",
      canClaim: false
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
    if (giveaway.status === "available" && !isOwnGiveaway) {
      return (
        <button
          onClick={() => onClaim(giveaway)}
          className="w-full rounded-full bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0d665f] active:scale-95"
        >
          Claim Item
        </button>
      );
    }
    if (giveaway.status === "available" && isOwnGiveaway) {
      return (
        <div className="w-full rounded-full border border-slate-200 px-4 py-2 text-center text-sm font-medium text-slate-500">
          Your Giveaway
        </div>
      );
    }
    if (giveaway.status === "pending_draw") {
      return (
        <div className="flex items-center justify-center gap-2 w-full rounded-full bg-amber-50 border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-700">
          <TimerReset size={14} className="animate-spin-slow" />
          <span>
            Draw in Progress{bufferLeft !== null && bufferLeft > 0 ? ` (${bufferLeft}s)` : "…"}
          </span>
        </div>
      );
    }
    if (giveaway.status === "claimed") {
      return (
        <div className="flex items-center justify-center gap-2 w-full rounded-full bg-slate-100 border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500">
          <CheckCircle2 size={14} /> Item Claimed
        </div>
      );
    }
    if (giveaway.status === "expired") {
      return (
        <div className="flex items-center justify-center gap-2 w-full rounded-full bg-red-50 border border-red-200 px-4 py-2 text-sm font-semibold text-red-500">
          <AlertTriangle size={14} /> Expired
        </div>
      );
    }
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
      <Card className="group h-full flex flex-col p-0 overflow-hidden border border-slate-200 hover:shadow-md transition-shadow duration-200">

        {/* ── Image (16:9) ───────────────────────────────────────────────── */}
        <div className="relative w-full overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100" style={{ aspectRatio: "16/9" }}>
          {displayImage ? (
            <Image
              src={displayImage}
              alt={giveaway.title}
              fill
              unoptimized={displayImage.includes("cloudinary.com")}
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

          {/* Category */}
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Tag size={11} />
            <span>{giveaway.category}</span>
          </div>

          {/* Donor */}
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

          {/* Location */}
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <MapPin size={11} className="shrink-0" />
            <span className="truncate">
              {giveaway.location}{giveaway.pickupSpot ? ` — ${giveaway.pickupSpot}` : ""}
            </span>
          </div>

          {/* Action button pinned to bottom */}
          <div className="mt-auto pt-2">
            <ActionButton />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

