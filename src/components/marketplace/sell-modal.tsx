"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlusCircle, X, Upload, CheckCircle2, AlertCircle, Image as ImageIcon, Loader2, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { API_BASE_URL } from "@/lib/api";

type SellModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newItem: any) => void;
};

const locations = [
  "Dr. Qudrat-E-Khuda Hall",
  "Kabi Kazi Nazrul Islam Hall",
  "Muktijoddha Hall",
  "Shaheed Abu Sayed Hall",
  "Shahid Mohammad Shah Hall",
  "Shaheed Tareq Huda Hall",
  "Sufia Kamal Hall",
  "Shamsennahar Khan Hall",
  "Tapashi Rabeya Hall",
  "Tsc Cafeteria",
  "Cuet Main gate",
  "Hotasha Chottor",
  "West Gate",
  "Academic Building 1",
  "Academic Building 2",
  "Academic Building 3",
  "Academic Building 4",
  "Academic Building 5",
  "New Library",
  "Central Mosque",
  "Cuet School"
];

const categories = [
  "Electronics & Gadgets",
  "Books & Study Material",
  "Drawing & Lab Instruments",
  "Furniture & Dorm Essentials",
  "Bicycles & Sports",
  "Clothing & Accessories",
  "Others"
];

export function SellModal({ isOpen, onClose, onSuccess }: SellModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: "",
    price: "",
    category: "Electronics & Gadgets",
    condition: "Used - Good",
    location: "Dr. Qudrat-E-Khuda Hall",
    description: "",
    isNegotiable: false
  });

  // Photo state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (!e.target.files) return;

    const newFiles = Array.from(e.target.files);
    const combinedFiles = [...selectedFiles, ...newFiles].slice(0, 8); // Max 8 photos

    if (combinedFiles.length > 8) {
      setError("You can upload a maximum of 8 photos.");
    }

    setSelectedFiles(combinedFiles);

    // Create object URLs for preview
    const newPreviews = combinedFiles.map((file) => URL.createObjectURL(file));
    setPreviewUrls(newPreviews);
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    const updatedFiles = selectedFiles.filter((_, idx) => idx !== indexToRemove);
    setSelectedFiles(updatedFiles);

    // Revoke old preview
    URL.revokeObjectURL(previewUrls[indexToRemove]);
    const updatedPreviews = previewUrls.filter((_, idx) => idx !== indexToRemove);
    setPreviewUrls(updatedPreviews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation: Title & Price
    if (!formData.title.trim() || !formData.price) {
      setError("Please provide a title and price for your listing.");
      return;
    }

    // Validation: Enforce at least 3 photos
    if (selectedFiles.length < 3) {
      setError(`Please upload at least 3 photos of the product (Currently: ${selectedFiles.length}/3).`);
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();
      data.append("title", formData.title.trim());
      data.append("price", String(formData.price));
      data.append("category", formData.category);
      data.append("condition", formData.condition);
      data.append("location", formData.location);
      data.append("description", formData.description.trim());
      data.append("isNegotiable", String(formData.isNegotiable));

      // Append all selected image files under "images"
      selectedFiles.forEach((file) => {
        data.append("images", file);
      });

      const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;

      const res = await fetch(`${API_BASE_URL}/api/products`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: data
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || "Failed to create listing. Please check required fields.");
      }

      setSubmitted(true);

      if (onSuccess && result.product) {
        onSuccess(result.product);
      }

      setTimeout(() => {
        setSubmitted(false);
        onClose();
        // Reset form
        setFormData({
          title: "",
          price: "",
          category: "Electronics & Gadgets",
          condition: "Used - Good",
          location: "Dr. Qudrat-E-Khuda Hall",
          description: "",
          isNegotiable: false
        });
        setSelectedFiles([]);
        setPreviewUrls([]);
      }, 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error connecting to listing server.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative z-10 w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-emerald/10 text-brand-emerald">
                  <PlusCircle size={20} />
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold">List Item for Sale</h2>
                  <p className="text-xs text-slate-500">Sell your unused items or gear to CUET campus community</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="focus-ring rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {submitted ? (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-12 text-center">
                <CheckCircle2 size={54} className="mx-auto text-brand-emerald" />
                <h3 className="mt-4 font-display text-2xl font-bold">Item Listed Successfully!</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Your listing is now active on the CUET E-Bazar marketplace with 3+ verified photos.
                </p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-4 space-y-4 max-h-[75vh] overflow-y-auto pr-1">
                {/* ── Photo Upload Section (Minimum 3 required) ── */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-700/70 dark:bg-slate-800/40">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                      <ImageIcon size={15} className="text-brand-emerald" />
                      Product Photos *
                      <span className="text-[11px] font-normal text-slate-500">(At least 3 photos required)</span>
                    </label>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        selectedFiles.length >= 3
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {selectedFiles.length}/8 photos {selectedFiles.length >= 3 ? "✓" : `(need ${3 - selectedFiles.length} more)`}
                    </span>
                  </div>

                  {/* Previews Grid */}
                  {previewUrls.length > 0 && (
                    <div className="mt-3 grid grid-cols-4 gap-2">
                      {previewUrls.map((url, idx) => (
                        <div key={idx} className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700">
                          <img src={url} alt={`Preview ${idx + 1}`} className="h-full w-full object-cover" />
                          <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 py-0.5 text-[9px] font-medium text-white">
                            {idx === 0 ? "Cover" : `#${idx + 1}`}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(idx)}
                            className="absolute right-1 top-1 rounded-full bg-rose-600 p-1 text-white opacity-0 transition group-hover:opacity-100 hover:bg-rose-700"
                            title="Remove photo"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload button area */}
                  {selectedFiles.length < 8 && (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white py-4 transition hover:border-brand-emerald dark:border-slate-600 dark:bg-slate-900"
                    >
                      <Upload size={22} className="text-brand-emerald" />
                      <p className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
                        Click to add photos
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Upload front, side, and detail views (JPG, PNG, WebP)
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>

                {/* ── Product Title ── */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Product Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Engineering Drawing Kit, Casio 991EX Calculator"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-brand-emerald focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:focus:border-brand-emerald"
                  />
                </div>

                {/* ── Price & Condition ── */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Price (৳) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      placeholder="e.g. 1200"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-brand-emerald focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:focus:border-brand-emerald"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Condition
                    </label>
                    <select
                      value={formData.condition}
                      onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-brand-emerald focus:bg-white dark:border-slate-700 dark:bg-slate-800"
                    >
                      <option value="New">New</option>
                      <option value="Like New">Like New</option>
                      <option value="Used - Good">Used - Good</option>
                      <option value="Used - Fair">Used - Fair</option>
                    </select>
                  </div>
                </div>

                {/* ── Category & Location ── */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-brand-emerald focus:bg-white dark:border-slate-700 dark:bg-slate-800"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Campus Pickup Location
                    </label>
                    <select
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-brand-emerald focus:bg-white dark:border-slate-700 dark:bg-slate-800"
                    >
                      {locations.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* ── Description ── */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Mention product details, usage time, condition notes, reason for selling..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-brand-emerald focus:bg-white dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>

                {/* ── Negotiable Checkbox ── */}
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={formData.isNegotiable}
                    onChange={(e) => setFormData({ ...formData, isNegotiable: e.target.checked })}
                    className="rounded border-slate-300 text-brand-emerald focus:ring-brand-emerald"
                  />
                  <span>Price is negotiable</span>
                </label>

                {/* ── Actions ── */}
                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || selectedFiles.length < 3}
                    className="border-brand-emerald bg-brand-emerald text-white hover:bg-[#0d665f] disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 size={16} className="animate-spin" /> Uploading ({selectedFiles.length} photos)...
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <PlusCircle size={16} /> List Item for Sale
                      </span>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

