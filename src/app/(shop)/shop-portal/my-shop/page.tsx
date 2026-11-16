"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import {
  Store, MapPin, Phone, Mail, Clock, Edit3, Save, X, Upload,
  CheckCircle2, AlertCircle, Loader2, ToggleLeft, ToggleRight
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/api";

type Shop = {
  _id: string;
  shopName: string;
  description: string;
  location: string;
  contactNumber: string;
  email: string;
  category: string;
  logoUrl: string;
  bannerUrl: string;
  operatingHours: { open: string; close: string };
  isOpen: boolean;
  isVerified: boolean;
  totalProducts: number;
  followersCount: number;
};

const SHOP_CATEGORIES = [
  "Food & Beverages", "Stationery & Books", "Electronics", "Clothing & Fashion",
  "Health & Beauty", "Sports & Fitness", "General Store", "Other"
];

export default function MyShopPage() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    shopName: "", description: "", location: "", contactNumber: "",
    email: "", category: "", openHour: "09:00", closeHour: "21:00", isOpen: true
  });

  const fetchShop = useCallback(async () => {
    setLoading(true);
    const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
    if (!token) { setLoading(false); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/api/shops/owner/my-shop`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.shop) {
        setShop(data.shop);
        setForm({
          shopName: data.shop.shopName || "",
          description: data.shop.description || "",
          location: data.shop.location || "",
          contactNumber: data.shop.contactNumber || "",
          email: data.shop.email || "",
          category: data.shop.category || "General Store",
          openHour: data.shop.operatingHours?.open || "09:00",
          closeHour: data.shop.operatingHours?.close || "21:00",
          isOpen: data.shop.isOpen !== false
        });
      }
    } catch (err) {
      setError("Failed to load shop information.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchShop(); }, [fetchShop]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
    if (!token) { setSaving(false); return; }

    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => formData.append(k, String(v)));
      if (logoFile) {
        formData.append("logo", logoFile);
      } else if (logoRef.current?.files?.[0]) {
        formData.append("logo", logoRef.current.files[0]);
      }

      if (bannerFile) {
        formData.append("banner", bannerFile);
      } else if (bannerRef.current?.files?.[0]) {
        formData.append("banner", bannerRef.current.files[0]);
      }

      const res = await fetch(`${API_BASE_URL}/api/shops/owner/my-shop`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to update shop.");
      setSuccess("Shop profile updated successfully!");
      setShop(data.shop);
      setEditing(false);
      if (logoPreview) URL.revokeObjectURL(logoPreview);
      if (bannerPreview) URL.revokeObjectURL(bannerPreview);
      setLogoPreview(null);
      setBannerPreview(null);
      setLogoFile(null);
      setBannerFile(null);
    } catch (err: any) {
      setError(err.message || "Failed to update shop.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setError(null);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    setLogoPreview(null);
    setBannerPreview(null);
    setLogoFile(null);
    setBannerFile(null);
    if (shop) {
      setForm({
        shopName: shop.shopName || "",
        description: shop.description || "",
        location: shop.location || "",
        contactNumber: shop.contactNumber || "",
        email: shop.email || "",
        category: shop.category || "General Store",
        openHour: shop.operatingHours?.open || "09:00",
        closeHour: shop.operatingHours?.close || "21:00",
        isOpen: shop.isOpen !== false
      });
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (JPG, PNG, WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Logo image size must be under 5MB.");
      return;
    }
    setError(null);
    setLogoFile(file);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (JPG, PNG, WebP).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Banner image size must be under 10MB.");
      return;
    }
    setError(null);
    setBannerFile(file);
    if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    setBannerPreview(URL.createObjectURL(file));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-brand-emerald" />
      </div>
    );
  }

  if (!shop) {
    return (
      <Card className="py-16 text-center">
        <Store size={48} className="mx-auto text-slate-300 mb-3" />
        <p className="text-slate-600 dark:text-slate-300 font-medium">No shop found for your account.</p>
        <p className="text-sm text-slate-400 mt-1">Please contact admin to set up your shop.</p>
      </Card>
    );
  }

  const inputCls = "w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm outline-none focus:border-brand-emerald transition disabled:opacity-60";
  const labelCls = "block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5";

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">My Shop</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage your shop profile and information.</p>
        </div>
        {!editing ? (
          <Button onClick={() => setEditing(true)} className="flex items-center gap-2 text-sm bg-brand-emerald hover:bg-[#0d665f] text-white">
            <Edit3 size={14} /> Edit Shop
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleCancel} className="flex items-center gap-2 text-sm">
              <X size={14} /> Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2 text-sm bg-brand-emerald hover:bg-[#0d665f] text-white">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-600 dark:text-rose-400">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 size={16} className="shrink-0" /> {success}
        </div>
      )}

      {/* ── Banner & Logo ── */}
      <Card className="p-0 overflow-hidden">
        {/* Banner */}
        <div className="relative h-32 sm:h-44 bg-gradient-to-r from-[#131921] to-[#232f3e] overflow-hidden">
          {(bannerPreview || shop.bannerUrl) && (
            <Image
              src={bannerPreview || shop.bannerUrl}
              alt="Shop Banner"
              fill
              unoptimized
              className="object-cover opacity-80"
            />
          )}
          {editing && (
            <button
              type="button"
              onClick={() => bannerRef.current?.click()}
              className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-sm font-medium gap-2 hover:bg-black/50 transition cursor-pointer"
            >
              <Upload size={18} /> Change Banner
            </button>
          )}
          <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
        </div>

        {/* Logo & Basic Info */}
        <div className="px-5 pb-5 pt-3 flex flex-col sm:flex-row items-start sm:items-end gap-4">
          <div className="relative -mt-10 sm:-mt-14">
            <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl border-4 border-white dark:border-slate-800 bg-slate-100 dark:bg-slate-700 overflow-hidden shadow-md">
              {(logoPreview || shop.logoUrl) ? (
                <Image src={logoPreview || shop.logoUrl} alt="Shop Logo" fill unoptimized className="object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <Store size={32} className="text-slate-400" />
                </div>
              )}
            </div>
            {editing && (
              <button
                type="button"
                onClick={() => logoRef.current?.click()}
                className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-brand-emerald text-white flex items-center justify-center shadow hover:bg-[#0d665f] transition cursor-pointer"
                title="Change logo"
              >
                <Edit3 size={12} />
              </button>
            )}
            <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
          </div>

          <div className="flex-1 min-w-0">
            {editing ? (
              <input
                type="text"
                value={form.shopName}
                onChange={e => setForm(f => ({ ...f, shopName: e.target.value }))}
                className={`${inputCls} text-lg font-bold`}
                placeholder="Shop Name"
              />
            ) : (
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">{shop.shopName}</h2>
                  {shop.isVerified && (
                    <span className="text-[10px] font-bold bg-emerald-50 text-brand-emerald dark:bg-emerald-950/50 dark:text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                      <CheckCircle2 size={11} /> Verified
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{shop.category}</p>
                <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <span>{shop.totalProducts} Products</span>
                  <span>{shop.followersCount} Followers</span>
                </div>
              </div>
            )}
          </div>

          {/* Open/Closed Toggle */}
          <div className="sm:ml-auto">
            {editing ? (
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, isOpen: !f.isOpen }))}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-semibold text-sm transition ${
                  form.isOpen
                    ? "border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "border-rose-500/40 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                }`}
              >
                {form.isOpen ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                {form.isOpen ? "Open" : "Closed"}
              </button>
            ) : (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${
                shop.isOpen !== false
                  ? "border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "border-rose-500/40 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
              }`}>
                <span className={`h-2 w-2 rounded-full ${shop.isOpen !== false ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                {shop.isOpen !== false ? "Open" : "Closed"}
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* ── Shop Details Form ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Description */}
        <Card className="md:col-span-2">
          <label className={labelCls}>Shop Description</label>
          {editing ? (
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              maxLength={1000}
              className={inputCls}
              placeholder="Describe your shop..."
            />
          ) : (
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {shop.description || <span className="italic text-slate-400">No description provided.</span>}
            </p>
          )}
        </Card>

        {/* Category */}
        <Card>
          <label className={labelCls}>Category</label>
          {editing ? (
            <select
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className={inputCls}
            >
              {SHOP_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          ) : (
            <p className="text-sm text-slate-700 dark:text-slate-300">{shop.category || "General Store"}</p>
          )}
        </Card>

        {/* Location */}
        <Card>
          <label className={labelCls}><MapPin size={12} className="inline mr-1" />Location</label>
          {editing ? (
            <input type="text" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className={inputCls} placeholder="e.g. TSC Cafeteria, CUET" />
          ) : (
            <p className="text-sm text-slate-700 dark:text-slate-300">{shop.location || "—"}</p>
          )}
        </Card>

        {/* Contact */}
        <Card>
          <label className={labelCls}><Phone size={12} className="inline mr-1" />Contact Number</label>
          {editing ? (
            <input type="text" value={form.contactNumber} onChange={e => setForm(f => ({ ...f, contactNumber: e.target.value }))} className={inputCls} placeholder="01XXXXXXXXX" />
          ) : (
            <p className="text-sm text-slate-700 dark:text-slate-300">{shop.contactNumber || "—"}</p>
          )}
        </Card>

        {/* Email */}
        <Card>
          <label className={labelCls}><Mail size={12} className="inline mr-1" />Business Email</label>
          {editing ? (
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputCls} placeholder="shop@example.com" />
          ) : (
            <p className="text-sm text-slate-700 dark:text-slate-300">{shop.email || "—"}</p>
          )}
        </Card>

        {/* Operating Hours */}
        <Card className="md:col-span-2">
          <label className={labelCls}><Clock size={12} className="inline mr-1" />Operating Hours</label>
          {editing ? (
            <div className="flex items-center gap-3">
              <input type="time" value={form.openHour} onChange={e => setForm(f => ({ ...f, openHour: e.target.value }))} className={`${inputCls} w-auto`} />
              <span className="text-sm text-slate-500">to</span>
              <input type="time" value={form.closeHour} onChange={e => setForm(f => ({ ...f, closeHour: e.target.value }))} className={`${inputCls} w-auto`} />
            </div>
          ) : (
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {shop.operatingHours?.open || "09:00"} — {shop.operatingHours?.close || "21:00"}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}

