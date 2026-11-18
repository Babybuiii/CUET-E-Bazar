"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  MapPin,
  Clock,
  Shuffle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Gift,
  Info,
  MessageCircle,
  LayoutDashboard
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { claimGiveaway, initiateContact } from "@/hooks/useGiveaways";
import type { Giveaway } from "@/types/giveaway";

interface ClaimConfirmationModalProps {
  giveaway: Giveaway | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (claimedGiveaway?: Giveaway) => void;
  onMessage?: (giveaway: Giveaway) => void;
}

const backdrop = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1 }
};
const modal = {
  hidden:  { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1,    y: 0  }
};

export function ClaimConfirmationModal({
  giveaway,
  isOpen,
  onClose,
  onSuccess,
  onMessage
}: ClaimConfirmationModalProps) {
  const router = useRouter();
  const [agreed,         setAgreed]         = useState(false);
  const [loading,        setLoading]        = useState(false);
  const [openingChat,    setOpeningChat]    = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [submitted,      setSubmitted]      = useState(false);
  const [resultMsg,      setResultMsg]      = useState<string>("");
  const [claimedItem,    setClaimedItem]    = useState<Giveaway | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  async function handleSubmit() {
    if (!giveaway || !agreed) return;
    setLoading(true);
    setError(null);

    try {
      const result = await claimGiveaway(giveaway._id);
      if (!result.success) {
        setError(result.message);
      } else {
        const item = result.giveaway || {
          ...giveaway,
          status: "pending" as const,
          claimedCount: 1
        };
        setClaimedItem(item);
        setConversationId(result.conversationId || item.conversation || null);
        setResultMsg(result.message || "Claim request submitted! Status is pending until approved by the owner.");
        setSubmitted(true);
        // Immediately notify parent page so list reflects pending status
        onSuccess?.(item);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenChat() {
    const targetItem = claimedItem || giveaway;
    if (!targetItem) return;

    if (conversationId) {
      handleClose();
      router.push(`/messages?conversationId=${conversationId}`);
      return;
    }

    try {
      setOpeningChat(true);
      const res = await initiateContact(targetItem._id);
      if (res.success && res.conversationId) {
        handleClose();
        router.push(`/messages?conversationId=${res.conversationId}`);
      } else {
        setError(res.message || "Could not open chat with donor.");
      }
    } catch {
      setError("Failed to open chat. Please check your messages page.");
    } finally {
      setOpeningChat(false);
    }
  }

  function handleClose() {
    if (loading || openingChat) return;
    setAgreed(false);
    setError(null);
    setSubmitted(false);
    setResultMsg("");
    setClaimedItem(null);
    setConversationId(null);
    onClose();
  }

  if (!giveaway) return null;

  const displayImage = giveaway.images?.[0] || null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial="hidden" animate="visible" exit="hidden" variants={backdrop}
        >
          <div className="absolute inset-0 bg-black/60" onClick={handleClose} />

          <motion.div
            className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden"
            variants={modal}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <Gift size={20} className="text-[#0f766e]" />
                Confirm Your Claim
              </h2>
              <button
                onClick={handleClose}
                disabled={loading}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">

              {/* Success state */}
              {submitted ? (
                <div className="flex flex-col items-center gap-4 py-4 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-[#0f766e]">
                    <CheckCircle2 size={38} />
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Claim Request Submitted!</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Status is <span className="font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Pending Approval</span> until the giveaway owner approves your claim.
                    </p>
                  </div>

                  {/* Summary card */}
                  <div className="w-full flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left">
                    <div className="relative h-14 w-14 shrink-0 rounded-lg overflow-hidden bg-slate-200">
                      {displayImage ? (
                        <Image
                          src={displayImage}
                          alt={giveaway.title}
                          fill
                          className="object-cover"
                          unoptimized={displayImage.includes("cloudinary.com") || displayImage.startsWith("data:")}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Gift size={20} className="text-slate-400" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-semibold text-slate-900">{giveaway.title}</p>
                      <p className="text-xs text-slate-600">
                        Donated by <strong className="text-slate-800">{giveaway.donor?.fullName || "CUET Student"}</strong>
                      </p>
                      <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
                        <MapPin size={10} />
                        <span>{giveaway.location}{giveaway.pickupSpot ? ` — ${giveaway.pickupSpot}` : ""}</span>
                      </div>
                    </div>
                  </div>

                  {/* Prominent Message Donor Action */}
                  <div className="w-full space-y-2 pt-2">
                    <button
                      type="button"
                      onClick={handleOpenChat}
                      disabled={openingChat}
                      className="w-full rounded-xl bg-[#0f766e] py-3 text-sm font-bold text-white shadow-md hover:bg-[#0f766e]/90 active:scale-[0.99] transition flex items-center justify-center gap-2"
                    >
                      {openingChat ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Opening Conversation...</span>
                        </>
                      ) : (
                        <>
                          <MessageCircle size={18} />
                          <span>Message Donor</span>
                        </>
                      )}
                    </button>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          handleClose();
                          router.push("/dashboard");
                        }}
                        className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 transition flex items-center justify-center gap-1.5"
                      >
                        <LayoutDashboard size={14} />
                        <span>View in Dashboard</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleClose}
                        className="flex-1 rounded-xl bg-slate-100 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Item preview */}
                  <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <div className="relative h-16 w-16 shrink-0 rounded-lg overflow-hidden bg-slate-200">
                      {displayImage ? (
                        <Image src={displayImage} alt={giveaway.title} fill className="object-cover" unoptimized={displayImage.includes("cloudinary.com") || displayImage.startsWith("data:")} />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Gift size={24} className="text-slate-400" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-semibold text-slate-900">{giveaway.title}</p>
                      <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                        <MapPin size={11} />
                        <span>{giveaway.location}{giveaway.pickupSpot ? ` — ${giveaway.pickupSpot}` : ""}</span>
                      </div>
                      <span className="mt-1 inline-block rounded-full bg-[#0f766e] px-2 py-0.5 text-[10px] font-bold text-white">
                        100% FREE
                      </span>
                    </div>
                  </div>

                  {/* FCFS info callout */}
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3.5 space-y-2">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[#0f766e]" />
                      <p className="text-xs text-slate-700">
                        <strong>First Come, First Served:</strong> Claiming immediately reserves this item exclusively for you.
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Info size={15} className="mt-0.5 shrink-0 text-[#0f766e]" />
                      <p className="text-xs text-slate-700">
                        <strong>Direct Messaging:</strong> You will be connected directly with the donor to arrange campus collection.
                      </p>
                    </div>
                  </div>

                  {/* Agreement checkbox */}
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <div className="mt-0.5 shrink-0">
                      <input
                        type="checkbox"
                        checked={agreed}
                        onChange={e => setAgreed(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 accent-[#0f766e] cursor-pointer"
                      />
                    </div>
                    <span className="text-xs text-slate-700">
                      I confirm that I genuinely need this item and will coordinate campus pickup with the donor via direct messaging.
                    </span>
                  </label>

                  {/* Error */}
                  {error && (
                    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
                      <AlertCircle size={16} className="mt-0.5 shrink-0" />
                      {error}
                    </div>
                  )}

                  {/* Submit */}
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!agreed || loading}
                    className="w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 size={16} className="animate-spin" /> Claiming Item…
                      </span>
                    ) : (
                      "Confirm & Claim Item"
                    )}
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

