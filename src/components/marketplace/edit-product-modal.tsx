"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Tag,
  Percent,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Image as ImageIcon,
  Upload,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { API_BASE_URL } from "@/lib/api";

export const PRODUCT_CATEGORIES = [
  "Electronics & Gadgets",
  "Books & Study Material",
  "Drawing & Lab Instruments",
  "Furniture & Dorm Essentials",
  "Bicycles & Sports",
  "Clothing & Accessories",
  "Others"
];

export const CUET_LOCATIONS = [
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

export const PRODUCT_CONDITIONS = [
  "New",
  "Like New",
  "Used - Good",
  "Used - Fair"
];

export const PRESET_TAGS = [
  "Discount",
  "Best Value",
  "Price Reduced",
  "Urgent Sale",
  "Flash Deal",
  "Negotiable",
  "Top Rated",
  "Limited Stock"
];

type EditProductModalProps = {
  isOpen: boolean;
  onClose: () => void;
  product: any | null;
  onUpdated: (updatedProduct: any) => void;
};

export function EditProductModal({ isOpen, onClose, product, onUpdated }: EditProductModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: "",
    price: 0,
    originalPrice: "" as string | number,
    discount: 0,
    category: PRODUCT_CATEGORIES[0],
    condition: PRODUCT_CONDITIONS[2],
    location: CUET_LOCATIONS[0],
    status: "active",
    description: "",
    isNegotiable: false,
    tags: [] as string[]
  });

  // Photos state
  const [existingImages, setExistingImages] = useState<any[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);

  const [customTag, setCustomTag] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        title: product.title || "",
        price: product.price || 0,
        originalPrice: product.originalPrice || "",
        discount: product.discount || 0,
        category: product.category || PRODUCT_CATEGORIES[0],
        condition: product.condition || PRODUCT_CONDITIONS[2],
        location: product.location || CUET_LOCATIONS[0],
        status: product.status || "active",
        description: product.description || "",
        isNegotiable: !!product.isNegotiable,
        tags: Array.isArray(product.tags) ? product.tags : []
      });

      const initialImgs = Array.isArray(product.images) ? [...product.images] : [];
      setExistingImages(initialImgs);
      setNewFiles([]);
      setNewPreviews([]);

      // Find cover index if marked
      const initCover = initialImgs.findIndex(
        (img: any) => img && (img.isCover || (typeof img === "object" && img.isCover))
      );
      setCoverIndex(initCover >= 0 ? initCover : 0);

      setError(null);
      setSuccess(false);
    }
  }, [product]);

  if (!isOpen || !product) return null;

  const totalPhotosCount = existingImages.length + newFiles.length;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (!e.target.files) return;

    const files = Array.from(e.target.files);
    if (existingImages.length + newFiles.length + files.length > 8) {
      setError("A product listing can have at most 8 photos.");
      return;
    }

    const combined = [...newFiles, ...files];
    setNewFiles(combined);

    const previews = files.map((f) => URL.createObjectURL(f));
    setNewPreviews((prev) => [...prev, ...previews]);
  };

  const handleRemoveExistingPhoto = (idx: number) => {
    if (totalPhotosCount <= 3) {
      setError("A listing must have at least 3 photos. Add a new photo before removing this one.");
      return;
    }
    setError(null);
    setExistingImages((prev) => prev.filter((_, i) => i !== idx));

    if (coverIndex === idx) {
      setCoverIndex(0);
    } else if (coverIndex > idx) {
      setCoverIndex((prev) => prev - 1);
    }
  };

  const handleRemoveNewPhoto = (idx: number) => {
    if (totalPhotosCount <= 3) {
      setError("A listing must have at least 3 photos. Add a new photo before removing this one.");
      return;
    }
    setError(null);
    const globalIdx = existingImages.length + idx;
    URL.revokeObjectURL(newPreviews[idx]);
    setNewFiles((prev) => prev.filter((_, i) => i !== idx));
    setNewPreviews((prev) => prev.filter((_, i) => i !== idx));

    if (coverIndex === globalIdx) {
      setCoverIndex(0);
    } else if (coverIndex > globalIdx) {
      setCoverIndex((prev) => prev - 1);
    }
  };

  // Tag helper
  const handleToggleTag = (tag: string) => {
    setFormData((prev) => {
      const exists = prev.tags.includes(tag);
      return {
        ...prev,
        tags: exists ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag]
      };
    });
  };

  const handleAddCustomTag = (e: React.FormEvent) => {
    e.preventDefault();
    const tag = customTag.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
      setCustomTag("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag)
    }));
  };

  // Discount calculation helper
  const handleDiscountChange = (discountPercent: number) => {
    const validDiscount = Math.min(99, Math.max(0, discountPercent));
    setFormData((prev) => {
      const orig = Number(prev.originalPrice) || prev.price;
      const newPrice = orig > 0 && validDiscount > 0 ? Math.round(orig * (1 - validDiscount / 100)) : orig;
      return {
        ...prev,
        discount: validDiscount,
        originalPrice: orig,
        price: newPrice
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (totalPhotosCount < 3) {
      setError("A listing must have at least 3 photos. Please add more photos.");
      return;
    }

    setLoading(true);

    const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
    if (!token) {
      setError("You must be logged in to edit this listing.");
      setLoading(false);
      return;
    }

    try {
      const data = new FormData();
      data.append("title", formData.title.trim());
      data.append("description", formData.description.trim());
      data.append("price", String(formData.price));
      data.append("originalPrice", formData.originalPrice ? String(formData.originalPrice) : "");
      data.append("discount", String(formData.discount));
      data.append("category", formData.category);
      data.append("condition", formData.condition);
      data.append("location", formData.location);
      data.append("status", formData.status);
      data.append("isNegotiable", String(formData.isNegotiable));
      data.append("tags", JSON.stringify(formData.tags));
      data.append("coverIndex", String(coverIndex));
      data.append("existingImages", JSON.stringify(existingImages));

      newFiles.forEach((f) => {
        data.append("newImages", f);
      });

      const res = await fetch(`${API_BASE_URL}/api/products/${product._id || product.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: data
      });

      const result = await res.json();
      if (result.success && result.product) {
        setSuccess(true);
        onUpdated(result.product);
        setTimeout(() => {
          onClose();
        }, 800);
      } else {
        setError(result.message || "Failed to update listing.");
      }
    } catch (err) {
      setError("Server error while updating. Please make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  // Unified list of all photos (existing + newly chosen)
  const allPhotos = [
    ...existingImages.map((img, idx) => ({
      isNew: false,
      idx,
      globalIdx: idx,
      url: typeof img === "object" ? img.thumbnailUrl || img.url : img
    })),
    ...newPreviews.map((url, idx) => ({
      isNew: true,
      idx,
      globalIdx: existingImages.length + idx,
      url
    }))
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <Card className="w-full max-w-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-emerald/10 text-brand-emerald">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Edit Product Listing
              </h2>
              <p className="text-xs text-slate-500">Update photos, cover image, price, tags, and availability.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300">
              <CheckCircle2 size={15} className="shrink-0" />
              <span>Listing updated successfully!</span>
            </div>
          )}

          {/* ── Photos & Cover Photo Selection (Feature 1 & 2) ── */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700/70 dark:bg-slate-800/40 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <ImageIcon size={15} className="text-brand-emerald" />
                Product Photos & Cover Photo
                <span className="text-[11px] font-normal text-slate-500">(Min 3, Max 8)</span>
              </label>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  totalPhotosCount >= 3
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                }`}
              >
                {totalPhotosCount}/8 photos {totalPhotosCount >= 3 ? "✓" : `(need ${3 - totalPhotosCount} more)`}
              </span>
            </div>

            {/* Photos Grid with Cover Selection */}
            {allPhotos.length > 0 && (
              <div className="grid grid-cols-4 gap-2.5">
                {allPhotos.map((item) => {
                  const isCover = item.globalIdx === coverIndex;
                  return (
                    <div
                      key={item.globalIdx}
                      onClick={() => setCoverIndex(item.globalIdx)}
                      className={`group relative aspect-square overflow-hidden rounded-xl border-2 transition cursor-pointer bg-white dark:bg-slate-900 ${
                        isCover
                          ? "border-brand-emerald ring-2 ring-brand-emerald/40 shadow-sm"
                          : "border-slate-200 hover:border-brand-emerald/50 dark:border-slate-700"
                      }`}
                      title={isCover ? "Current Cover Photo" : "Click to select as Cover Photo"}
                    >
                      <img
                        src={item.url}
                        alt={`Photo ${item.globalIdx + 1}`}
                        className="h-full w-full object-cover"
                      />

                      {/* Cover Badge */}
                      {isCover ? (
                        <span className="absolute top-1 left-1 flex items-center gap-1 rounded bg-brand-emerald px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm">
                          <Star size={10} className="fill-amber-300 text-amber-300" />
                          Cover
                        </span>
                      ) : (
                        <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 py-0.5 text-[9px] font-medium text-white">
                          #{item.globalIdx + 1}
                        </span>
                      )}

                      {/* Set as Cover button on hover */}
                      {!isCover && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCoverIndex(item.globalIdx);
                          }}
                          className="absolute bottom-1 right-1 flex items-center gap-0.5 rounded bg-slate-900/80 px-1.5 py-0.5 text-[9px] font-semibold text-white opacity-0 transition group-hover:opacity-100 hover:bg-brand-emerald"
                        >
                          <Star size={9} />
                          Set Cover
                        </button>
                      )}

                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.isNew) {
                            handleRemoveNewPhoto(item.idx);
                          } else {
                            handleRemoveExistingPhoto(item.idx);
                          }
                        }}
                        className="absolute right-1 top-1 rounded-full bg-rose-600/90 p-1 text-white opacity-0 transition group-hover:opacity-100 hover:bg-rose-700"
                        title="Remove photo"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Instruction Tip */}
            <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Star size={12} className="text-amber-500 shrink-0 fill-amber-500" />
              <span>
                <strong>Cover Photo:</strong> Click any photo above to set it as the primary cover photo for your ad.
              </span>
            </p>

            {/* Upload New Photos Button */}
            {totalPhotosCount < 8 && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white dark:bg-slate-900 dark:border-slate-700 py-3 text-xs font-semibold text-brand-emerald hover:border-brand-emerald transition"
              >
                <Upload size={16} />
                <span>Add More Photos ({8 - totalPhotosCount} slots left)</span>
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

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Product Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-brand-emerald/40 focus:outline-none"
            />
          </div>

          {/* Price & Original Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Selling Price (৳) *
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-brand-emerald focus:ring-2 focus:ring-brand-emerald/40 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Original Price (৳) (Optional)
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 1500"
                value={formData.originalPrice}
                onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-brand-emerald/40 focus:outline-none"
              />
            </div>
          </div>

          {/* Quick Discount Presets */}
          <div>
            <label className="flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              <Percent size={13} className="text-rose-500" /> Apply Quick Discount Badge
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[0, 10, 15, 20, 25, 30, 40, 50].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handleDiscountChange(pct)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition ${
                    formData.discount === pct
                      ? "bg-rose-500 text-white border-rose-500 shadow-sm"
                      : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                  }`}
                >
                  {pct === 0 ? "No Discount" : `${pct}% OFF`}
                </button>
              ))}
            </div>
          </div>

          {/* Category & Condition */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-brand-emerald/40 focus:outline-none"
              >
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Condition
              </label>
              <select
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-brand-emerald/40 focus:outline-none"
              >
                {PRODUCT_CONDITIONS.map((cond) => (
                  <option key={cond} value={cond}>
                    {cond}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Location & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Campus Location
              </label>
              <select
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-brand-emerald/40 focus:outline-none"
              >
                {CUET_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Availability Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-brand-emerald/40 focus:outline-none"
              >
                <option value="active">Active (Available)</option>
                <option value="reserved">Reserved (Buyer Waiting)</option>
                <option value="sold">Sold (Out of Stock)</option>
              </select>
            </div>
          </div>

          {/* Negotiable toggle */}
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={formData.isNegotiable}
              onChange={(e) => setFormData({ ...formData, isNegotiable: e.target.checked })}
              className="rounded text-brand-emerald focus:ring-brand-emerald"
            />
            <span>Price is slightly negotiable on meet</span>
          </label>

          {/* Promotional Tags */}
          <div className="space-y-2">
            <label className="flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Tag size={13} className="text-brand-emerald" /> Promotional Tags & Badges
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_TAGS.map((tag) => {
                const active = formData.tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleToggleTag(tag)}
                    className={`px-2.5 py-1 text-xs rounded-full border transition font-medium ${
                      active
                        ? "bg-brand-emerald text-white border-brand-emerald shadow-sm"
                        : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {active ? `✓ ${tag}` : `+ ${tag}`}
                  </button>
                );
              })}
            </div>

            {/* Custom Tag Input */}
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                placeholder="Add custom tag (e.g. 1st Year Book)..."
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCustomTag(e);
                  }
                }}
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 text-xs focus:ring-2 focus:ring-brand-emerald/40 focus:outline-none"
              />
              <Button
                type="button"
                onClick={handleAddCustomTag}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-800 dark:text-slate-200 text-xs py-1 px-3"
              >
                Add Tag
              </Button>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Provide condition details, usage duration, pickup points..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-3 text-xs sm:text-sm focus:ring-2 focus:ring-brand-emerald/40 focus:outline-none"
            />
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-xs"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="border-brand-emerald bg-brand-emerald text-white hover:bg-[#0d665f] text-xs px-5 py-2 font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="mr-1.5 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
