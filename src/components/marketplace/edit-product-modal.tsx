"use client";

import { useState, useEffect } from "react";
import { X, Tag, Percent, DollarSign, Sparkles, Loader2, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
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
      setError(null);
      setSuccess(false);
    }
  }, [product]);

  if (!isOpen || !product) return null;

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
      // If there's an original price, recompute price
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
    setLoading(true);

    const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
    if (!token) {
      setError("You must be logged in to edit this listing.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/products/${product._id || product.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          price: Number(formData.price),
          originalPrice: formData.originalPrice ? Number(formData.originalPrice) : null,
          discount: Number(formData.discount),
          category: formData.category,
          condition: formData.condition,
          location: formData.location,
          status: formData.status,
          tags: formData.tags,
          isNegotiable: formData.isNegotiable
        })
      });

      const data = await res.json();
      if (data.success && data.product) {
        setSuccess(true);
        onUpdated(data.product);
        setTimeout(() => {
          onClose();
        }, 600);
      } else {
        setError(data.message || "Failed to update listing.");
      }
    } catch (err) {
      setError("Server error while updating. Please make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

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
              <p className="text-xs text-slate-500">Update price, tags, discounts, and availability.</p>
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

          {/* Pricing & Discounts (Feature 5) */}
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
              <Percent size={15} /> Pricing & Discount Deals
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Selling Price */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Selling Price (৳) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs sm:text-sm font-bold text-brand-emerald focus:ring-2 focus:ring-brand-emerald/40 focus:outline-none"
                />
              </div>

              {/* Original Price */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Original Price (৳) (Optional)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 45000"
                  value={formData.originalPrice}
                  onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-brand-emerald/40 focus:outline-none"
                />
              </div>

              {/* Discount Percentage */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Discount (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="99"
                  value={formData.discount}
                  onChange={(e) => handleDiscountChange(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs sm:text-sm font-semibold text-rose-500 focus:ring-2 focus:ring-brand-emerald/40 focus:outline-none"
                />
              </div>
            </div>

            {Number(formData.discount) > 0 && (
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                🏷️ Active deal: <strong className="font-bold">{formData.discount}% OFF</strong> badge will appear on your listing!
              </p>
            )}
          </div>

          {/* Product Badges / Tags (Feature 4) */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Tag size={15} className="text-brand-emerald" /> Product Tags & Highlights
              </label>
              <span className="text-[10px] text-slate-400">Click to add/remove</span>
            </div>

            {/* Preset Tag Chips */}
            <div className="flex flex-wrap gap-1.5">
              {PRESET_TAGS.map((tag) => {
                const isSelected = formData.tags.includes(tag);
                return (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => handleToggleTag(tag)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                      isSelected
                        ? "bg-brand-emerald text-white shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {isSelected ? `✓ ${tag}` : `+ ${tag}`}
                  </button>
                );
              })}
            </div>

            {/* Custom Tag Input */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="Add custom tag (e.g. Price Reduced)..."
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 text-xs focus:ring-2 focus:ring-brand-emerald/40 focus:outline-none"
              />
              <Button
                type="button"
                onClick={handleAddCustomTag}
                disabled={!customTag.trim()}
                variant="ghost"
                className="text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 px-3 py-1.5 h-auto"
              >
                Add Tag
              </Button>
            </div>

            {/* Selected Tags list */}
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-slate-400 font-medium">Selected:</span>
                {formData.tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-emerald/10 text-brand-emerald text-xs font-bold"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="hover:text-rose-500 ml-0.5"
                      title="Remove tag"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Category, Condition, Status (Feature 2) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-brand-emerald/40 focus:outline-none"
              >
                {PRODUCT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Condition */}
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

            {/* Status (Active / Sold / Reserved) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Listing Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className={`w-full rounded-xl border font-bold px-3 py-2 text-xs sm:text-sm focus:ring-2 focus:outline-none ${
                  formData.status === "sold"
                    ? "bg-rose-50 border-rose-300 text-rose-600 dark:bg-rose-950/40"
                    : formData.status === "reserved"
                    ? "bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950/40"
                    : "bg-emerald-50 border-emerald-300 text-brand-emerald dark:bg-emerald-950/40"
                }`}
              >
                <option value="active">🟢 Active (Available for sale)</option>
                <option value="sold">🔴 Sold (Deal completed)</option>
                <option value="reserved">🟡 Reserved (Handover pending)</option>
              </select>
            </div>
          </div>

          {/* Pickup Location & Negotiable */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Campus Pickup Location
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

            <div className="flex items-center gap-3 pt-6">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={formData.isNegotiable}
                  onChange={(e) => setFormData({ ...formData, isNegotiable: e.target.checked })}
                  className="rounded border-slate-300 text-brand-emerald focus:ring-brand-emerald h-4 w-4"
                />
                <span>Price is Negotiable</span>
              </label>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description & Specifications
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-3 text-xs sm:text-sm focus:ring-2 focus:ring-brand-emerald/40 focus:outline-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-xs px-4"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="border-brand-emerald bg-brand-emerald text-white hover:bg-[#0d665f] text-xs px-5 font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin mr-1.5" /> Saving...
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
