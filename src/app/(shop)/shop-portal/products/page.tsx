"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Plus, Edit3, Trash2, Eye, EyeOff, Package, Search,
  Loader2, AlertCircle, CheckCircle2, X, Upload, ChevronDown, RefreshCw, Star
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/api";

const CATEGORIES = [
  "Electronics & Gadgets", "Books & Study Material", "Drawing & Lab Instruments",
  "Furniture & Dorm Essentials", "Bicycles & Sports", "Clothing & Accessories",
  "Food & Beverages", "Stationery", "Health & Beauty", "Others"
];

type ProductImage = {
  url: string;
  thumbnailUrl: string;
  publicId?: string;
  isCover?: boolean;
};

type Product = {
  _id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  status: string;
  images: ProductImage[];
  qtySold: number;
  createdAt: string;
};

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
  sold: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300",
  reserved: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  removed_by_admin: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300",
};

type ProductFormData = {
  title: string;
  description: string;
  category: string;
  price: string;
  stock: string;
  status: string;
};

const EMPTY_FORM: ProductFormData = {
  title: "",
  description: "",
  category: "Others",
  price: "",
  stock: "0",
  status: "active"
};

function MyProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const editId = searchParams.get("edit");

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modal, setModal] = useState<"add" | "edit" | "stock" | "delete" | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormData>(EMPTY_FORM);
  const [stockValue, setStockValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Granular photo management state (existing saved photos + newly selected files)
  const [existingImages, setExistingImages] = useState<ProductImage[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
    if (!token) { setLoading(false); return; }
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search) params.set("search", search);
      const res = await fetch(`${API_BASE_URL}/api/shops/owner/products?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setProducts(data.products || []);
    } catch {}
    finally { setLoading(false); }
  }, [statusFilter, search]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // Open edit modal if editId in URL
  useEffect(() => {
    if (editId && products.length > 0) {
      const p = products.find(x => x._id === editId);
      if (p) openEdit(p);
    }
  }, [editId, products]);

  const openEdit = (p: Product) => {
    setSelectedProduct(p);
    setForm({
      title: p.title,
      description: p.description || "",
      category: p.category,
      price: String(p.price),
      stock: String(p.stock),
      status: p.status
    });
    const imgs = Array.isArray(p.images) ? [...p.images] : [];
    setExistingImages(imgs);
    setNewImageFiles([]);
    setNewImagePreviews([]);

    // Find designated cover index
    const initCover = imgs.findIndex((img) => img.isCover);
    setCoverIndex(initCover >= 0 ? initCover : 0);

    setError(null);
    setModal("edit");
  };

  const openAdd = () => {
    setSelectedProduct(null);
    setForm(EMPTY_FORM);
    setExistingImages([]);
    setNewImageFiles([]);
    setNewImagePreviews([]);
    setCoverIndex(0);
    setError(null);
    setModal("add");
  };

  const openStock = (p: Product) => {
    setSelectedProduct(p);
    setStockValue(String(p.stock));
    setError(null);
    setModal("stock");
  };

  const openDelete = (p: Product) => {
    setSelectedProduct(p);
    setModal("delete");
  };

  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = Array.from(e.target.files || []);
    if (rawFiles.length === 0) return;
    const invalidType = rawFiles.find(f => !f.type.startsWith("image/"));
    if (invalidType) {
      setError("Only image files (JPG, PNG, WebP) are allowed.");
      return;
    }
    const oversized = rawFiles.find(f => f.size > 10 * 1024 * 1024);
    if (oversized) {
      setError("Each image must be under 10MB.");
      return;
    }

    const currentTotal = existingImages.length + newImageFiles.length;
    const remainingSlots = 8 - currentTotal;
    if (remainingSlots <= 0) {
      setError("A product can have at most 8 photos.");
      return;
    }

    const filesToAdd = rawFiles.slice(0, remainingSlots);
    if (rawFiles.length > remainingSlots) {
      setError(`Only ${remainingSlots} photo slot${remainingSlots === 1 ? '' : 's'} remaining.`);
    } else {
      setError(null);
    }

    setNewImageFiles(prev => [...prev, ...filesToAdd]);
    const previews = filesToAdd.map(f => URL.createObjectURL(f));
    setNewImagePreviews(prev => [...prev, ...previews]);
  };

  const handleRemoveExistingPhoto = (idx: number) => {
    const totalPhotos = existingImages.length + newImageFiles.length;
    if (totalPhotos <= 1) {
      setError("A product must have at least 1 photo. Please upload a replacement before deleting this photo.");
      return;
    }
    setError(null);
    setExistingImages(prev => prev.filter((_, i) => i !== idx));

    if (coverIndex === idx) {
      setCoverIndex(0);
    } else if (coverIndex > idx) {
      setCoverIndex(prev => prev - 1);
    }
  };

  const handleRemoveNewPhoto = (idx: number) => {
    const totalPhotos = existingImages.length + newImageFiles.length;
    if (totalPhotos <= 1) {
      setError("A product must have at least 1 photo. Please upload a replacement before deleting this photo.");
      return;
    }
    setError(null);
    const globalIdx = existingImages.length + idx;
    if (newImagePreviews[idx]?.startsWith("blob:")) {
      URL.revokeObjectURL(newImagePreviews[idx]);
    }
    setNewImageFiles(prev => prev.filter((_, i) => i !== idx));
    setNewImagePreviews(prev => prev.filter((_, i) => i !== idx));

    if (coverIndex === globalIdx) {
      setCoverIndex(0);
    } else if (coverIndex > globalIdx) {
      setCoverIndex(prev => prev - 1);
    }
  };

  const closeModal = () => {
    newImagePreviews.forEach((src) => {
      if (src.startsWith("blob:")) URL.revokeObjectURL(src);
    });
    setExistingImages([]);
    setNewImageFiles([]);
    setNewImagePreviews([]);
    setCoverIndex(0);
    setModal(null);
    setError(null);
  };

  const handleSubmit = async (isEdit: boolean) => {
    if (saving) return;

    // Validation
    if (!form.title.trim()) {
      setError("Product name is required.");
      return;
    }
    if (!form.category.trim()) {
      setError("Product category is required.");
      return;
    }
    if (form.price === "" || isNaN(Number(form.price)) || Number(form.price) < 0) {
      setError("Please enter a valid price (৳ 0 or more).");
      return;
    }
    if (form.stock !== "" && (isNaN(Number(form.stock)) || Number(form.stock) < 0)) {
      setError("Stock quantity cannot be negative.");
      return;
    }

    const totalPhotos = existingImages.length + newImageFiles.length;
    if (totalPhotos < 1) {
      setError("Please upload at least 1 image for the product.");
      return;
    }
    if (totalPhotos > 8) {
      setError("A product can have at most 8 images.");
      return;
    }

    setSaving(true);
    setError(null);
    const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
    if (!token) {
      setError("You are not logged in. Please sign in again.");
      setSaving(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("title", form.title.trim());
      formData.append("description", form.description.trim());
      formData.append("category", form.category.trim());
      formData.append("price", String(form.price));
      formData.append("stock", String(form.stock || "0"));
      formData.append("status", form.status);

      if (isEdit) {
        formData.append("existingImages", JSON.stringify(existingImages));
        formData.append("coverIndex", String(coverIndex));
        newImageFiles.forEach(f => formData.append("images", f));
      } else {
        // When adding, reorder files so designated thumbnail is at index 0
        const filesToUpload = [...newImageFiles];
        if (coverIndex > 0 && coverIndex < filesToUpload.length) {
          const [coverFile] = filesToUpload.splice(coverIndex, 1);
          filesToUpload.unshift(coverFile);
        }
        formData.append("coverIndex", "0");
        filesToUpload.forEach(f => formData.append("images", f));
      }

      const url = isEdit
        ? `${API_BASE_URL}/api/shops/owner/products/${selectedProduct!._id}`
        : `${API_BASE_URL}/api/shops/owner/products`;
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` }, body: formData });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to save product.");

      setSuccess(isEdit ? "Product updated successfully!" : "Product added successfully!");
      closeModal();
      fetchProducts();
      if (editId) router.replace("/shop-portal/products");
    } catch (err: any) {
      setError(err.message || "Failed to save product.");
    } finally {
      setSaving(false);
    }
  };

  const handleStockUpdate = async () => {
    setSaving(true);
    setError(null);
    const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
    if (!token) { setSaving(false); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/api/shops/owner/products/${selectedProduct!._id}/stock`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ stock: Number(stockValue) })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to update stock.");
      setSuccess("Stock updated!");
      setModal(null);
      fetchProducts();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (p: Product) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
    if (!token) return;
    const newStatus = p.status === "active" ? "sold" : "active";
    try {
      const formData = new FormData();
      formData.append("status", newStatus);
      await fetch(`${API_BASE_URL}/api/shops/owner/products/${p._id}`, {
        method: "PATCH", headers: { Authorization: `Bearer ${token}` }, body: formData
      });
      fetchProducts();
    } catch {}
  };

  const handleDelete = async () => {
    setSaving(true);
    const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
    if (!token) { setSaving(false); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/api/shops/owner/products/${selectedProduct!._id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      setSuccess("Product archived.");
      setModal(null);
      fetchProducts();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm outline-none focus:border-brand-emerald transition";
  const labelCls = "block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5";

  // Build combined list of existing photos + new uploads
  const allPhotos = [
    ...existingImages.map((img, idx) => ({
      url: img.thumbnailUrl || img.url,
      isNew: false,
      idx,
      globalIdx: idx
    })),
    ...newImagePreviews.map((src, idx) => ({
      url: src,
      isNew: true,
      idx,
      globalIdx: existingImages.length + idx
    }))
  ];

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">My Products</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{products.length} products total</p>
        </div>
        <Button onClick={openAdd} className="flex items-center gap-2 text-sm bg-brand-emerald hover:bg-[#0d665f] text-white">
          <Plus size={15} /> Add Product
        </Button>
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 size={16} /> {success}
        </div>
      )}

      {/* Filters */}
      <Card className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-3.5 py-2.5 text-sm outline-none focus:border-brand-emerald transition"
            />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm outline-none focus:border-brand-emerald appearance-none pr-8 transition"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="sold">Hidden</option>
              <option value="removed_by_admin">Archived</option>
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          <button onClick={fetchProducts} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
            <RefreshCw size={15} />
          </button>
        </div>
      </Card>

      {/* Products Table */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-brand-emerald" />
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center">
            <Package size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-600 dark:text-slate-300 font-medium">No products found.</p>
            <p className="text-sm text-slate-400 mt-1">Add your first product to get started.</p>
            <Button onClick={openAdd} className="mt-4 bg-brand-emerald hover:bg-[#0d665f] text-white text-sm">
              <Plus size={14} className="mr-1" /> Add Product
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Category</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Price</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Sold</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {products.map((p) => {
                  const coverImg = p.images?.find((img) => img.isCover) || p.images?.[0];
                  const imgSrc = coverImg?.thumbnailUrl || coverImg?.url;
                  return (
                    <tr key={p._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {imgSrc ? (
                            <Image src={imgSrc} alt={p.title} width={40} height={40} unoptimized className="rounded-lg object-cover h-10 w-10 shrink-0" />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                              <Package size={16} className="text-slate-400" />
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-900 dark:text-white text-xs sm:text-sm line-clamp-2 max-w-[170px]">{p.title}</span>
                            <span className="text-[10px] text-slate-400">{p.images?.length || 0} photo{(p.images?.length || 0) === 1 ? "" : "s"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 hidden sm:table-cell">{p.category}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white text-xs">৳{p.price.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold ${p.stock === 0 ? "text-rose-500" : p.stock <= 5 ? "text-amber-500" : "text-slate-700 dark:text-slate-300"}`}>
                          {p.stock === 0 ? "Out" : p.stock}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 hidden md:table-cell">{p.qtySold || 0}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${STATUS_BADGE[p.status] || "bg-slate-100 text-slate-600"}`}>
                          {p.status === "removed_by_admin" ? "Archived" : p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => openEdit(p)} title="Edit" className="aspect-square h-7 w-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition p-0">
                            <Edit3 size={13} />
                          </button>
                          <button onClick={() => openStock(p)} title="Update Stock" className="aspect-square h-7 w-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition p-0">
                            <Package size={13} />
                          </button>
                          <button onClick={() => handleToggleStatus(p)} title={p.status === "active" ? "Hide" : "Show"} className="aspect-square h-7 w-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition p-0">
                            {p.status === "active" ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                          <button onClick={() => openDelete(p)} title="Archive" className="aspect-square h-7 w-7 flex items-center justify-center rounded-lg border border-rose-200 dark:border-rose-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition p-0">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Add / Edit Modal ── */}
      {(modal === "add" || modal === "edit") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-display font-bold text-slate-900 dark:text-white">
                {modal === "add" ? "Add New Product" : "Edit Product"}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
                  <AlertCircle size={14} className="shrink-0" /> {error}
                </div>
              )}

              <div>
                <label className={labelCls}>Product Name *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className={inputCls}
                  placeholder="e.g. Chicken Burger"
                  required
                />
              </div>

              <div>
                <label className={labelCls}>Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className={inputCls}
                  placeholder="Describe your product..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Category *</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className={inputCls}
                  >
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="active">Active (Visible)</option>
                    <option value="sold">Hidden</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Price (৳) *</label>
                  <input
                    type="number"
                    step="any"
                    min={0}
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    onWheel={e => e.currentTarget.blur()}
                    onKeyDown={e => {
                      if (e.key === "ArrowUp" || e.key === "ArrowDown") e.preventDefault();
                    }}
                    className={inputCls}
                    placeholder="0"
                    required
                  />
                </div>
                <div>
                  <label className={labelCls}>Stock Quantity</label>
                  <input
                    type="number"
                    min={0}
                    value={form.stock}
                    onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
                    onWheel={e => e.currentTarget.blur()}
                    onKeyDown={e => {
                      if (e.key === "ArrowUp" || e.key === "ArrowDown") e.preventDefault();
                    }}
                    className={inputCls}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* ── Granular Photo Management & Thumbnail Selector ── */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={labelCls}>
                    Product Photos & Card Thumbnail *
                  </label>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    {allPhotos.length}/8 photos ({allPhotos.length >= 1 ? "Ready" : "Min 1 photo"})
                  </span>
                </div>

                {allPhotos.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 mb-3">
                    {allPhotos.map((item) => {
                      const isCover = item.globalIdx === coverIndex;
                      return (
                        <div
                          key={item.globalIdx}
                          onClick={() => setCoverIndex(item.globalIdx)}
                          className={`group relative aspect-square overflow-hidden rounded-xl border-2 transition cursor-pointer bg-slate-50 dark:bg-slate-800 ${
                            isCover
                              ? "border-brand-emerald ring-2 ring-brand-emerald/40 shadow-sm"
                              : "border-slate-200 hover:border-brand-emerald/50 dark:border-slate-700"
                          }`}
                          title={isCover ? "Current Card Thumbnail" : "Click to select as Card Thumbnail"}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.url}
                            alt={`Photo ${item.globalIdx + 1}`}
                            className="h-full w-full object-cover select-none"
                          />

                          {/* Thumbnail Badge */}
                          {isCover ? (
                            <span className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-md bg-brand-emerald px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm pointer-events-none">
                              <Star size={10} className="fill-amber-300 text-amber-300" />
                              Thumbnail
                            </span>
                          ) : (
                            <span className="absolute bottom-1.5 left-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white pointer-events-none">
                              #{item.globalIdx + 1}
                            </span>
                          )}

                          {/* Make Thumbnail button on hover */}
                          {!isCover && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCoverIndex(item.globalIdx);
                              }}
                              className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-md bg-slate-900/80 px-1.5 py-0.5 text-[9px] font-semibold text-white opacity-0 transition group-hover:opacity-100 hover:bg-brand-emerald"
                            >
                              <Star size={9} />
                              Set Thumbnail
                            </button>
                          )}

                          {/* Delete Photo button */}
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
                            className="absolute right-1.5 top-1.5 rounded-full bg-rose-600/90 p-1 text-white opacity-0 transition group-hover:opacity-100 hover:bg-rose-700 shadow"
                            title="Delete photo"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Upload Dropzone */}
                {allPhotos.length < 8 && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-center cursor-pointer hover:border-brand-emerald transition bg-slate-50/50 dark:bg-slate-800/30"
                  >
                    <Upload size={18} className="mx-auto text-brand-emerald mb-1" />
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {allPhotos.length === 0 ? "Upload Product Photos (1 to 8 photos)" : `Add More Photos (${8 - allPhotos.length} slots left)`}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">JPG, PNG, WebP up to 10MB each</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleImagesChange}
                    />
                  </div>
                )}

                <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Star size={12} className="text-amber-500 fill-amber-500 shrink-0" />
                  <span>Click any photo or <strong>Set Thumbnail</strong> to choose which image is displayed on the product card.</span>
                </p>
              </div>
            </div>

            <div className="flex gap-3 px-5 pb-5">
              <Button variant="ghost" onClick={closeModal} className="flex-1">Cancel</Button>
              <Button
                onClick={() => handleSubmit(modal === "edit")}
                disabled={saving}
                className="flex-1 bg-brand-emerald hover:bg-[#0d665f] text-white"
              >
                {saving ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
                {modal === "add" ? "Add Product" : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Stock Update Modal ── */}
      {modal === "stock" && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Update Stock</h3>
              <button onClick={closeModal}><X size={18} className="text-slate-400" /></button>
            </div>
            <div className="p-5">
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">{selectedProduct.title}</p>
              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600 mb-3">
                  <AlertCircle size={14} /> {error}
                </div>
              )}
              <label className={labelCls}>New Stock Quantity</label>
              <input
                type="number"
                value={stockValue}
                onChange={e => setStockValue(e.target.value)}
                onWheel={e => e.currentTarget.blur()}
                onKeyDown={e => {
                  if (e.key === "ArrowUp" || e.key === "ArrowDown") e.preventDefault();
                }}
                min={0}
                className={inputCls}
              />
            </div>
            <div className="flex gap-3 px-5 pb-5">
              <Button variant="ghost" onClick={closeModal} className="flex-1">Cancel</Button>
              <Button onClick={handleStockUpdate} disabled={saving} className="flex-1 bg-brand-emerald hover:bg-[#0d665f] text-white">
                {saving ? <Loader2 size={14} className="animate-spin mr-1" /> : null} Update Stock
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {modal === "delete" && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm">
            <div className="p-6 text-center">
              <Trash2 size={36} className="mx-auto text-rose-500 mb-3" />
              <h3 className="font-bold text-slate-900 dark:text-white mb-1">Archive Product?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                &ldquo;{selectedProduct.title}&rdquo; will be archived. Historical orders are preserved.
              </p>
              <div className="flex gap-3">
                <Button variant="ghost" onClick={closeModal} className="flex-1">Cancel</Button>
                <Button onClick={handleDelete} disabled={saving} className="flex-1 bg-rose-500 hover:bg-rose-600 text-white border-rose-500">
                  {saving ? <Loader2 size={14} className="animate-spin mr-1" /> : null} Archive
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MyProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 size={32} className="animate-spin text-brand-emerald" />
          <p className="mt-3 text-sm font-medium">Loading products...</p>
        </div>
      }
    >
      <MyProductsContent />
    </Suspense>
  );
}
