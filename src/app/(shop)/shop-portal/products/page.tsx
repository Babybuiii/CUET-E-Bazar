"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Plus, Edit3, Trash2, Eye, EyeOff, Package, Search,
  Loader2, AlertCircle, CheckCircle2, X, Upload, ChevronDown, RefreshCw
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/api";

const CATEGORIES = [
  "Electronics & Gadgets", "Books & Study Material", "Drawing & Lab Instruments",
  "Furniture & Dorm Essentials", "Bicycles & Sports", "Clothing & Accessories",
  "Food & Beverages", "Stationery", "Health & Beauty", "Others"
];

type Product = {
  _id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  status: string;
  images: Array<{ url: string; thumbnailUrl: string }>;
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
  title: string; description: string; category: string;
  price: string; stock: string; status: string;
};

const EMPTY_FORM: ProductFormData = {
  title: "", description: "", category: "Others",
  price: "", stock: "0", status: "active"
};

export default function MyProductsPage() {
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
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
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
    setForm({ title: p.title, description: p.description || "", category: p.category, price: String(p.price), stock: String(p.stock), status: p.status });
    setImageFiles([]);
    setImagePreviews(p.images?.map(i => i.thumbnailUrl) || []);
    setError(null);
    setModal("edit");
  };

  const openAdd = () => {
    setSelectedProduct(null);
    setForm(EMPTY_FORM);
    setImageFiles([]);
    setImagePreviews([]);
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
    setError(null);
    const files = rawFiles.slice(0, 8);
    setImageFiles(files);
    setImagePreviews(files.map(f => URL.createObjectURL(f)));
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
    if (!isEdit && imageFiles.length === 0) {
      setError("Please select at least 1 image for the product.");
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
      Object.entries(form).forEach(([k, v]) => formData.append(k, v));
      imageFiles.forEach(f => formData.append("images", f));

      const url = isEdit
        ? `${API_BASE_URL}/api/shops/owner/products/${selectedProduct!._id}`
        : `${API_BASE_URL}/api/shops/owner/products`;
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` }, body: formData });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to save product.");

      setSuccess(isEdit ? "Product updated successfully!" : "Product added successfully!");
      setModal(null);
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

  const closeModal = () => {
    imagePreviews.forEach((src) => {
      if (src.startsWith("blob:")) URL.revokeObjectURL(src);
    });
    setImageFiles([]);
    setImagePreviews([]);
    setModal(null);
    setError(null);
  };

  const inputCls = "w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm outline-none focus:border-brand-emerald transition";
  const labelCls = "block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5";

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
                  const imgSrc = p.images?.[0]?.thumbnailUrl;
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
                          <span className="font-medium text-slate-900 dark:text-white text-xs sm:text-sm line-clamp-2 max-w-[150px]">{p.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 hidden sm:table-cell">{p.category}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white text-xs">৳{p.price}</td>
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
                          <button onClick={() => openEdit(p)} title="Edit" className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                            <Edit3 size={13} />
                          </button>
                          <button onClick={() => openStock(p)} title="Update Stock" className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                            <Package size={13} />
                          </button>
                          <button onClick={() => handleToggleStatus(p)} title={p.status === "active" ? "Hide" : "Show"} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                            {p.status === "active" ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                          <button onClick={() => openDelete(p)} title="Archive" className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition">
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
              <h3 className="font-display font-bold text-slate-900 dark:text-white">{modal === "add" ? "Add New Product" : "Edit Product"}</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              <div>
                <label className={labelCls}>Product Name *</label>
                <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputCls} placeholder="e.g. Chicken Burger" required />
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className={inputCls} placeholder="Describe your product..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Category *</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inputCls}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={inputCls}>
                    <option value="active">Active (Visible)</option>
                    <option value="sold">Hidden</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Price (৳) *</label>
                  <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} min={0} className={inputCls} placeholder="0" required />
                </div>
                <div>
                  <label className={labelCls}>Stock Quantity</label>
                  <input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} min={0} className={inputCls} placeholder="0" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Product Images</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4 text-center cursor-pointer hover:border-brand-emerald transition"
                >
                  <Upload size={20} className="mx-auto text-slate-400 mb-1" />
                  <p className="text-xs text-slate-500">Click to upload images (max 8)</p>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImagesChange} />
                </div>
                {imagePreviews.length > 0 && (
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {imagePreviews.map((src, i) => (
                      <div key={i} className="relative h-16 w-16">
                        <Image src={src} alt="" fill unoptimized className="object-cover rounded-lg" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3 px-5 pb-5">
              <Button variant="ghost" onClick={closeModal} className="flex-1">Cancel</Button>
              <Button onClick={() => handleSubmit(modal === "edit")} disabled={saving} className="flex-1 bg-brand-emerald hover:bg-[#0d665f] text-white">
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
              <input type="number" value={stockValue} onChange={e => setStockValue(e.target.value)} min={0} className={inputCls} />
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
                "{selectedProduct.title}" will be archived. Historical orders are preserved.
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

