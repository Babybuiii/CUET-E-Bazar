"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Upload,
  Gift,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Image as ImageIcon
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { createGiveaway } from "@/hooks/useGiveaways";
import {
  GIVEAWAY_CATEGORIES,
  GIVEAWAY_CONDITIONS,
  GIVEAWAY_LOCATIONS,
  GIVEAWAY_DURATIONS
} from "@/types/giveaway";

interface OfferGiveawayModalProps {
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

export function OfferGiveawayModal({ isOpen, onClose, onSuccess }: OfferGiveawayModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title:      "",
    description:"",
    category:   "Books" as typeof GIVEAWAY_CATEGORIES[number],
    condition:  "Good"  as typeof GIVEAWAY_CONDITIONS[number],
    location:   "CUET Campus" as typeof GIVEAWAY_LOCATIONS[number],
    pickupSpot: "",
    duration:   "7d"
  });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls,   setPreviewUrls]   = useState<string[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [submitted,     setSubmitted]     = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);
    const combined = [...selectedFiles, ...newFiles].slice(0, 5);
    setSelectedFiles(combined);
    const urls = combined.map(f => URL.createObjectURL(f));
    setPreviewUrls(urls);
  }

  function removeImage(index: number) {
    const updatedFiles = selectedFiles.filter((_, i) => i !== index);
    const updatedUrls  = previewUrls.filter((_,  i) => i !== index);
    setSelectedFiles(updatedFiles);
    setPreviewUrls(updatedUrls);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError("Item title is required.");
      return;
    }

    setLoading(true);
    setError(null);

    const fd = new FormData();
    fd.append("title",       formData.title.trim());
    fd.append("description", formData.description.trim());
    fd.append("category",    formData.category);
    fd.append("condition",   formData.condition);
    fd.append("location",    formData.location);
    fd.append("pickupSpot",  formData.pickupSpot.trim());
    fd.append("duration",    formData.duration);
    selectedFiles.forEach(f => fd.append("images", f));

    try {
      const result = await createGiveaway(fd);
      if (!result.success) {
        setError(result.message);
      } else {
        setSubmitted(true);
        setTimeout(() => {
          resetForm();
          onClose();
          onSuccess?.();
        }, 2000);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      title:      "",
      description:"",
      category:   "Books",
      condition:  "Good",
      location:   "CUET Campus",
      pickupSpot: "",
      duration:   "7d"
    });
    setSelectedFiles([]);
    setPreviewUrls([]);
    setError(null);
    setSubmitted(false);
  }

  function handleClose() {
    if (!loading) {
      resetForm();
      onClose();
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial="hidden" animate="visible" exit="hidden" variants={backdrop}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />

          <motion.div
            className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto"
            variants={modal}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                  <Gift size={20} className="text-[#0f766e]" />
                  Offer a Giveaway
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">Give something useful to another CUET student.</p>
              </div>
              <button
                onClick={handleClose}
                disabled={loading}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Success state */}
            {submitted ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <CheckCircle2 size={48} className="text-[#0f766e]" />
                <p className="text-lg font-semibold text-slate-800">Giveaway Published!</p>
                <p className="text-sm text-slate-500">Your item is now visible to the CUET community.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-5 space-y-4">

                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Item Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    maxLength={120}
                    placeholder="e.g. Signals & Systems textbook by Oppenheim"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-[#0f766e] focus:outline-none focus:ring-2 focus:ring-[#0f766e]/20 transition"
                  />
                  <p className="mt-1 text-right text-[10px] text-slate-400">{formData.title.length}/120</p>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Short Description <span className="text-slate-400">(optional)</span>
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    maxLength={1000}
                    rows={3}
                    placeholder="Describe the item's condition, edition, any notes…"
                    className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-[#0f766e] focus:outline-none focus:ring-2 focus:ring-[#0f766e]/20 transition"
                  />
                </div>

                {/* Category + Condition row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-[#0f766e] focus:outline-none focus:ring-2 focus:ring-[#0f766e]/20 transition bg-white"
                    >
                      {GIVEAWAY_CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Condition</label>
                    <select
                      name="condition"
                      value={formData.condition}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-[#0f766e] focus:outline-none focus:ring-2 focus:ring-[#0f766e]/20 transition bg-white"
                    >
                      {GIVEAWAY_CONDITIONS.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Pickup location */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Campus Pickup Location</label>
                  <select
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-[#0f766e] focus:outline-none focus:ring-2 focus:ring-[#0f766e]/20 transition bg-white"
                  >
                    {GIVEAWAY_LOCATIONS.map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>

                {/* Specific spot */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Specific Pickup Spot <span className="text-slate-400">(optional)</span>
                  </label>
                  <input
                    name="pickupSpot"
                    value={formData.pickupSpot}
                    onChange={handleChange}
                    maxLength={200}
                    placeholder="e.g. CSE Building 2nd floor notice board"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-[#0f766e] focus:outline-none focus:ring-2 focus:ring-[#0f766e]/20 transition"
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Giveaway Duration</label>
                  <div className="flex gap-2">
                    {GIVEAWAY_DURATIONS.map(d => (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => setFormData(p => ({ ...p, duration: d.value }))}
                        className={`flex-1 rounded-xl border py-2 text-xs font-semibold transition ${
                          formData.duration === d.value
                            ? "border-[#0f766e] bg-[#0f766e] text-white"
                            : "border-slate-200 text-slate-600 hover:border-[#0f766e] hover:text-[#0f766e]"
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Images */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Photos <span className="text-slate-400">(optional, up to 5)</span>
                  </label>

                  {previewUrls.length > 0 && (
                    <div className="mb-3 grid grid-cols-5 gap-2">
                      {previewUrls.map((url, i) => (
                        <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200">
                          <Image src={url} alt={`preview-${i}`} fill className="object-cover" />
                          <button
                            type="button"
                            onClick={() => removeImage(i)}
                            className="absolute top-0.5 right-0.5 rounded-full bg-red-500 p-0.5 text-white hover:bg-red-600"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedFiles.length < 5 && (
                    <>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileSelect}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-4 text-sm text-slate-500 hover:border-[#0f766e] hover:text-[#0f766e] transition"
                      >
                        <Upload size={16} />
                        {selectedFiles.length === 0 ? "Add Photos" : "Add More Photos"}
                      </button>
                    </>
                  )}
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    {error}
                  </div>
                )}

                {/* Info callout */}
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3.5 py-3 text-xs text-emerald-800">
                  🎁 Your item is 100% free — no price, no payment, no shipping. Campus pickup only.
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={loading || !formData.title.trim()}
                  className="w-full"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" /> Publishing…
                    </span>
                  ) : (
                    "Publish Giveaway"
                  )}
                </Button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

