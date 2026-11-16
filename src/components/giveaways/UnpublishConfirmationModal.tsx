"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  AlertTriangle,
  Loader2,
  Trash2,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cancelGiveaway } from "@/hooks/useGiveaways";
import type { Giveaway } from "@/types/giveaway";

interface UnpublishConfirmationModalProps {
  giveaway: Giveaway | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (giveawayId: string) => void;
}

const backdrop = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1 }
};

const modal = {
  hidden:  { opacity: 0, scale: 0.95, y: 16 },
  visible: { opacity: 1, scale: 1,    y: 0  }
};

export function UnpublishConfirmationModal({
  giveaway,
  isOpen,
  onClose,
  onSuccess
}: UnpublishConfirmationModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!giveaway) return null;

  async function handleConfirm() {
    if (!giveaway || loading) return;

    setLoading(true);
    setError(null);

    const result = await cancelGiveaway(giveaway._id);

    if (!result.success) {
      setError(result.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setLoading(false);
      onClose();
      onSuccess(giveaway._id);
    }, 800);
  }

  function handleClose() {
    if (loading) return;
    setError(null);
    setSuccess(false);
    onClose();
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={backdrop}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={handleClose}
          />

          {/* Modal Card */}
          <motion.div
            className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100"
            variants={modal}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="absolute top-4 right-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition disabled:opacity-50"
            >
              <X size={18} />
            </button>

            {success ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-3">
                  <CheckCircle2 size={28} />
                </div>
                <h3 className="text-base font-bold text-slate-900">Giveaway Unpublished</h3>
                <p className="mt-1 text-xs text-slate-500">The listing has been removed from the public feed.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Header Icon + Title */}
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                    <Trash2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Unpublish Giveaway</h3>
                    <p className="text-xs text-slate-500 line-clamp-1">{giveaway.title}</p>
                  </div>
                </div>

                {/* Confirmation Prompt */}
                <div className="rounded-xl bg-amber-50 border border-amber-200/80 p-3.5 text-xs text-amber-900 flex gap-2.5">
                  <AlertTriangle size={18} className="shrink-0 text-amber-600 mt-0.5" />
                  <p className="leading-relaxed font-medium">
                    Are you sure you want to unpublish this giveaway? Other students will no longer be able to claim it.
                  </p>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                    <p className="font-semibold">{error}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={loading}
                    className="rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 text-xs font-semibold transition disabled:opacity-50"
                  >
                    Keep Active
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={loading}
                    className="flex items-center justify-center gap-1.5 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white px-4 py-2 text-xs font-semibold shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Unpublishing…</span>
                      </>
                    ) : (
                      <>
                        <Trash2 size={13} />
                        <span>Yes, Unpublish</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

