"use client";

import { useState } from "react";
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
  Info
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { claimGiveaway } from "@/hooks/useGiveaways";
import type { Giveaway } from "@/types/giveaway";

interface ClaimConfirmationModalProps {
  giveaway: Giveaway | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
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
  onSuccess
}: ClaimConfirmationModalProps) {
  const [agreed,     setAgreed]     = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [submitted,  setSubmitted]  = useState(false);
  const [resultMsg,  setResultMsg]  = useState<string>("");

  async function handleSubmit() {
    if (!giveaway || !agreed) return;
    setLoading(true);
    setError(null);

    try {
      const result = await claimGiveaway(giveaway._id);
      if (!result.success) {
        setError(result.message);
      } else {
        setResultMsg(result.message || "Claim submitted!");
        setSubmitted(true);
        setTimeout(() => {
          handleClose();
          onSuccess?.();
        }, 2500);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    if (loading) return;
    setAgreed(false);
    setError(null);
    setSubmitted(false);
    setResultMsg("");
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
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />

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
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <CheckCircle2 size={48} className="text-[#0f766e]" />
                  <p className="text-base font-semibold text-slate-800">{resultMsg}</p>
                  <p className="text-sm text-slate-500">
                    Watch the status badge on the card to see the draw result.
                  </p>
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

                  {/* How the draw works */}
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-3.5 space-y-2">
                    <div className="flex items-start gap-2">
                      <Shuffle size={15} className="mt-0.5 shrink-0 text-blue-600" />
                      <p className="text-xs text-blue-800">
                        <strong>30-second claim window:</strong> When you submit a claim, a 30-second window opens. If multiple students claim during this window, the system randomly selects one winner. Other applicants join an ordered waitlist.
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Clock size={15} className="mt-0.5 shrink-0 text-blue-600" />
                      <p className="text-xs text-blue-800">
                        <strong>6-hour contact window:</strong> If selected, you must contact the donor within 6 hours. Otherwise, the item passes to the next student in the waitlist.
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Info size={15} className="mt-0.5 shrink-0 text-blue-600" />
                      <p className="text-xs text-blue-800">
                        Submitting a claim <strong>does not guarantee</strong> you will receive the item.
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
                      I agree to the giveaway rules and confirm that I can collect the item from the specified campus location. I understand that claiming does not guarantee I will receive this item.
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
                        <Loader2 size={16} className="animate-spin" /> Submitting…
                      </span>
                    ) : (
                      "Confirm & Submit Claim"
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

