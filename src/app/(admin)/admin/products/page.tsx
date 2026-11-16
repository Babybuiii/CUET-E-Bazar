"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
 Package,
 Search,
 Filter,
 Eye,
 EyeOff,
 AlertTriangle,
 Trash2,
 CheckCircle2,
 Edit2,
 RefreshCw,
 ExternalLink,
 Store,
 User,
 Tag,
 DollarSign,
 X,
 Loader2,
 AlertCircle,
 ShieldAlert
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/api";

type ProductImage = {
 url: string;
 thumbnailUrl: string;
 publicId?: string;
 isCover?: boolean;
};

type ProductItem = {
 _id: string;
 title: string;
 description: string;
 price: number;
 originalPrice?: number;
 category: string;
 condition: string;
 stock: number;
 status: "active" | "sold" | "reserved" | "removed_by_admin" | "hidden";
 adminNotes?: string;
 viewsCount?: number;
 images: ProductImage[];
 seller?: {
 _id: string;
 fullName: string;
 email: string;
 studentId?: string;
 department?: string;
 isBanned?: boolean;
 };
 shop?: {
 _id: string;
 shopName: string;
 slug?: string;
 };
 sellerType: "individual" | "shop";
 createdAt: string;
};

type ProductDetail = {
 product: ProductItem;
 reports: Array<{
 _id: string;
 reason: string;
 description: string;
 status: string;
 createdAt: string;
 reporter?: { fullName: string; studentId?: string };
 }>;
};

const CATEGORIES = [
 "Electronics & Gadgets",
 "Books & Study Material",
 "Drawing & Lab Instruments",
 "Furniture & Dorm Essentials",
 "Bicycles & Sports",
 "Clothing & Accessories",
 "Food & Beverages",
 "Stationery",
 "Health & Beauty",
 "Others"
];

export default function AdminProductsPage() {
 const [products, setProducts] = useState<ProductItem[]>([]);
 const [loading, setLoading] = useState(true);
 const [total, setTotal] = useState(0);
 const [page, setPage] = useState(1);
 const [totalPages, setTotalPages] = useState(1);

 // Filters
 const [search, setSearch] = useState("");
 const [category, setCategory] = useState("all");
 const [status, setStatus] = useState("all");
 const [sellerType, setSellerType] = useState("all");

 // Detail Modal
 const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
 const [detailData, setDetailData] = useState<ProductDetail | null>(null);
 const [detailLoading, setDetailLoading] = useState(false);
 const [activeImageIndex, setActiveImageIndex] = useState(0);

 // Actions
 const [actionProduct, setActionProduct] = useState<ProductItem | null>(null);
 const [actionType, setActionType] = useState<"hide" | "remove" | "restore" | "edit" | null>(null);
 const [actionReason, setActionReason] = useState("");
 const [actionLoading, setActionLoading] = useState(false);
 const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

 // Edit Form
 const [editForm, setEditForm] = useState({
 title: "",
 category: "",
 price: 0,
 condition: "",
 stock: 1,
 description: ""
 });

 const fetchProducts = useCallback(async () => {
 setLoading(true);
 try {
 const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
 if (!token) return;

 const params = new URLSearchParams({
 page: String(page),
 limit: "15"
 });
 if (search.trim()) params.set("search", search.trim());
 if (category !== "all") params.set("category", category);
 if (status !== "all") params.set("status", status);
 if (sellerType !== "all") params.set("sellerType", sellerType);

 const res = await fetch(`${API_BASE_URL}/api/admin/products?${params.toString()}`, {
 headers: { Authorization: `Bearer ${token}` }
 });
 const data = await res.json();
 if (data.success) {
 setProducts(data.products || []);
 setTotal(data.total || 0);
 setTotalPages(data.totalPages || 1);
 }
 } catch (err) {
 console.error("Fetch products error:", err);
 } finally {
 setLoading(false);
 }
 }, [page, search, category, status, sellerType]);

 useEffect(() => {
 fetchProducts();
 }, [fetchProducts]);

 const openProductDetails = async (productId: string) => {
 setSelectedProductId(productId);
 setDetailLoading(true);
 setActiveImageIndex(0);
 try {
 const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
 const res = await fetch(`${API_BASE_URL}/api/admin/products/${productId}`, {
 headers: { Authorization: `Bearer ${token}` }
 });
 const data = await res.json();
 if (data.success) {
 setDetailData(data);
 }
 } catch (err) {
 console.error("Fetch product detail error:", err);
 } finally {
 setDetailLoading(false);
 }
 };

 const handleActionSubmit = async () => {
 if (!actionProduct || !actionType) return;
 setActionLoading(true);
 setActionMsg(null);

 const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
 let endpoint = "";
 let method = "POST";
 let body: any = {};

 if (actionType === "hide") {
 endpoint = `${API_BASE_URL}/api/admin/products/${actionProduct._id}/hide`;
 body = { reason: actionReason };
 } else if (actionType === "remove") {
 endpoint = `${API_BASE_URL}/api/admin/products/${actionProduct._id}/remove`;
 body = { reason: actionReason };
 } else if (actionType === "restore") {
 endpoint = `${API_BASE_URL}/api/admin/products/${actionProduct._id}/restore`;
 body = {};
 } else if (actionType === "edit") {
 endpoint = `${API_BASE_URL}/api/admin/products/${actionProduct._id}/edit`;
 method = "PATCH";
 body = editForm;
 }

 try {
 const res = await fetch(endpoint, {
 method,
 headers: {
 "Content-Type": "application/json",
 Authorization: `Bearer ${token}`
 },
 body: JSON.stringify(body)
 });
 const resData = await res.json();

 if (!res.ok || !resData.success) {
 throw new Error(resData.message || "Action failed.");
 }

 setActionMsg({ type: "success", text: resData.message || "Success." });
 setTimeout(() => {
 setActionType(null);
 setActionProduct(null);
 setActionReason("");
 setActionMsg(null);
 fetchProducts();
 if (selectedProductId === actionProduct._id) {
 openProductDetails(actionProduct._id);
 }
 }, 1000);
 } catch (err: unknown) {
 const msg = err instanceof Error ? err.message : "Action failed.";
 setActionMsg({ type: "error", text: msg });
 } finally {
 setActionLoading(false);
 }
 };

 const openEditModal = (p: ProductItem) => {
 setActionProduct(p);
 setActionType("edit");
 setEditForm({
 title: p.title || "",
 category: p.category || "",
 price: p.price || 0,
 condition: p.condition || "Used - Good",
 stock: p.stock || 1,
 description: p.description || ""
 });
 };

 return (
 <div className="space-y-6 pb-12">
 {/* ── Page Header ── */}
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
 <PageHeader
 title="Product Listings Moderation"
 description="Monitor student and campus shop items, inspect photos, take down fraudulent listings, and restore mistakenly hidden items."
 />
 <Button
 onClick={() => fetchProducts()}
 disabled={loading}
 variant="outline"
 className="self-start sm:self-auto text-xs bg-white dark:bg-slate-800"
 >
 <RefreshCw size={14} className={loading ? "animate-spin mr-1.5" : "mr-1.5"} />
 Refresh
 </Button>
 </div>

 {/* ── Search & Filters ── */}
 <Card className="p-4 border-slate-200/80 dark:border-slate-700/80 space-y-3">
 <div className="grid gap-3 sm:grid-cols-4">
 {/* Search */}
 <div className="relative">
 <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
 <input
 type="text"
 value={search}
 onChange={(e) => {
 setSearch(e.target.value);
 setPage(1);
 }}
 placeholder="Search product title, tags..."
 className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 pl-9 pr-3 text-xs outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald"
 />
 </div>

 {/* Category */}
 <div>
 <select
 value={category}
 onChange={(e) => {
 setCategory(e.target.value);
 setPage(1);
 }}
 className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 px-3 text-xs outline-none focus:border-brand-emerald"
 >
 <option value="all">All Categories</option>
 {CATEGORIES.map((c) => (
 <option key={c} value={c}>
 {c}
 </option>
 ))}
 </select>
 </div>

 {/* Status */}
 <div>
 <select
 value={status}
 onChange={(e) => {
 setStatus(e.target.value);
 setPage(1);
 }}
 className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 px-3 text-xs outline-none focus:border-brand-emerald"
 >
 <option value="all">All Statuses</option>
 <option value="active">Active (Visible)</option>
 <option value="hidden">Hidden by Admin</option>
 <option value="removed_by_admin">Removed by Admin</option>
 <option value="sold">Sold Out</option>
 <option value="reserved">Reserved</option>
 </select>
 </div>

 {/* Seller Type */}
 <div>
 <select
 value={sellerType}
 onChange={(e) => {
 setSellerType(e.target.value);
 setPage(1);
 }}
 className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 px-3 text-xs outline-none focus:border-brand-emerald"
 >
 <option value="all">All Seller Types</option>
 <option value="individual">Student Sellers Only</option>
 <option value="shop">Campus Shops Only</option>
 </select>
 </div>
 </div>

 <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
 <span>Found {total} product listings</span>
 {(search || category !== "all" || status !== "all" || sellerType !== "all") && (
 <button
 onClick={() => {
 setSearch("");
 setCategory("all");
 setStatus("all");
 setSellerType("all");
 setPage(1);
 }}
 className="text-brand-emerald hover:underline font-medium"
 >
 Reset Filters
 </button>
 )}
 </div>
 </Card>

 {/* ── Products Table ── */}
 <Card className="p-0 overflow-hidden border-slate-200/80 dark:border-slate-700/80">
 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs">
 <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-700">
 <tr>
 <th className="py-3 px-4">Product</th>
 <th className="py-3 px-4">Price & Stock</th>
 <th className="py-3 px-4">Category & Condition</th>
 <th className="py-3 px-4">Seller</th>
 <th className="py-3 px-4">Status</th>
 <th className="py-3 px-4 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
 {loading ? (
 <tr>
 <td colSpan={6} className="py-12 text-center text-slate-500">
 <Loader2 className="animate-spin mx-auto text-brand-emerald mb-2" size={24} />
 Loading products...
 </td>
 </tr>
 ) : products.length === 0 ? (
 <tr>
 <td colSpan={6} className="py-12 text-center text-slate-500">
 No products matched your criteria.
 </td>
 </tr>
 ) : (
 products.map((p) => {
 const cover = p.images?.[0]?.thumbnailUrl || p.images?.[0]?.url || "/placeholder.png";
 return (
 <tr
 key={p._id}
 className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition duration-150"
 >
 {/* Product Name & Photo */}
 <td className="py-3 px-4">
 <div className="flex items-center gap-2.5">
 <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-700 overflow-hidden relative shrink-0 border border-slate-200 dark:border-slate-700">
 {p.images && p.images.length > 0 ? (
 <img src={cover} alt={p.title} className="h-full w-full object-cover" />
 ) : (
 <Package size={20} className="m-auto text-slate-400 mt-2.5" />
 )}
 </div>
 <div className="min-w-0 max-w-xs">
 <p className="font-semibold text-slate-900 dark:text-white truncate">{p.title}</p>
 <p className="text-[11px] text-slate-500 dark:text-slate-400">
 {p.images?.length || 0} photos • {p.viewsCount || 0} views
 </p>
 </div>
 </div>
 </td>

 {/* Price & Stock */}
 <td className="py-3 px-4">
 <p className="font-bold text-slate-900 dark:text-white">৳{p.price.toLocaleString()}</p>
 <p className="text-[11px] text-slate-500">Stock: {p.stock}</p>
 </td>

 {/* Category & Condition */}
 <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
 <p className="font-medium truncate max-w-[140px]">{p.category}</p>
 <p className="text-[11px] text-slate-500">{p.condition}</p>
 </td>

 {/* Seller */}
 <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
 {p.shop ? (
 <div className="flex items-center gap-1">
 <Store size={13} className="text-amber-500 shrink-0" />
 <span className="font-medium truncate max-w-[120px]">{p.shop.shopName}</span>
 </div>
 ) : (
 <div className="flex items-center gap-1">
 <User size={13} className="text-brand-emerald shrink-0" />
 <span className="font-medium truncate max-w-[120px]">
 {p.seller?.fullName || "Student"}
 </span>
 </div>
 )}
 <p className="text-[10px] text-slate-400">
 {p.shop ? "Campus Shop" : p.seller?.department || "CUET"}
 </p>
 </td>

 {/* Status */}
 <td className="py-3 px-4">
 <span
 className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
 p.status === "active"
 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
 : p.status === "hidden"
 ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
 : p.status === "removed_by_admin"
 ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
 : p.status === "sold"
 ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
 : "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
 }`}
 >
 {p.status === "active" && <CheckCircle2 size={11} />}
 {p.status === "hidden" && <EyeOff size={11} />}
 {p.status === "removed_by_admin" && <Trash2 size={11} />}
 {p.status.replace("_", " ")}
 </span>
 {p.adminNotes && (
 <p className="text-[10px] text-rose-500 dark:text-rose-400 truncate max-w-[120px] mt-0.5">
 {p.adminNotes}
 </p>
 )}
 </td>

 {/* Actions */}
 <td className="py-3 px-4 text-right">
 <div className="flex items-center justify-end gap-1.5">
 <Button
 size="sm"
 variant="outline"
 onClick={() => openProductDetails(p._id)}
 className="h-7 px-2.5 text-[11px] font-medium"
 >
 Inspect
 </Button>

 <Button
 size="sm"
 variant="outline"
 onClick={() => openEditModal(p)}
 className="h-7 px-2 text-[11px]"
 title="Edit Product Info"
 >
 <Edit2 size={12} />
 </Button>

 {p.status === "hidden" || p.status === "removed_by_admin" ? (
 <Button
 size="sm"
 onClick={() => {
 setActionProduct(p);
 setActionType("restore");
 }}
 className="h-7 px-2 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white"
 title="Restore to Active Marketplace"
 >
 Restore
 </Button>
 ) : (
 <div className="flex items-center gap-1">
 <Button
 size="sm"
 variant="outline"
 onClick={() => {
 setActionProduct(p);
 setActionType("hide");
 setActionReason("");
 }}
 className="h-7 px-2 text-[11px] text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"
 title="Hide from Marketplace"
 >
 Hide
 </Button>

 <Button
 size="sm"
 variant="outline"
 onClick={() => {
 setActionProduct(p);
 setActionType("remove");
 setActionReason("");
 }}
 className="h-7 px-2 text-[11px] text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
 title="Remove as Prohibited/Fake"
 >
 Remove
 </Button>
 </div>
 )}
 </div>
 </td>
 </tr>
 );
 })
 )}
 </tbody>
 </table>
 </div>

 {/* Pagination Footer */}
 <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500">
 <span>Page {page} of {totalPages} ({total} products)</span>
 <div className="flex items-center gap-1.5">
 <Button
 size="sm"
 variant="outline"
 disabled={page <= 1}
 onClick={() => setPage((p) => Math.max(1, p - 1))}
 className="h-7 px-2.5 text-xs"
 >
 Previous
 </Button>
 <Button
 size="sm"
 variant="outline"
 disabled={page >= totalPages}
 onClick={() => setPage((p) => p + 1)}
 className="h-7 px-2.5 text-xs"
 >
 Next
 </Button>
 </div>
 </div>
 </Card>

 {/* ── Product Detail Modal ── */}
 {selectedProductId && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
 <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
 <button
 onClick={() => {
 setSelectedProductId(null);
 setDetailData(null);
 }}
 className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800"
 >
 <X size={18} />
 </button>

 {detailLoading || !detailData ? (
 <div className="py-16 text-center">
 <Loader2 size={32} className="animate-spin mx-auto text-brand-emerald mb-2" />
 <p className="text-xs text-slate-500">Loading full product details...</p>
 </div>
 ) : (
 <div className="space-y-6">
 {/* Product Title & Link */}
 <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
 <div>
 <h2 className="text-lg font-bold text-slate-900 dark:text-white">
 {detailData.product.title}
 </h2>
 <p className="text-xs text-slate-500 mt-0.5">
 Listed on {new Date(detailData.product.createdAt).toLocaleDateString()} • Status:{" "}
 <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
 {detailData.product.status.replace("_", " ")}
 </span>
 </p>
 </div>

 <div className="flex items-center gap-2">
 <Button
 size="sm"
 variant="outline"
 onClick={() => openEditModal(detailData.product)}
 className="text-xs"
 >
 <Edit2 size={13} className="mr-1" /> Edit Product
 </Button>
 <Link
 href={`/marketplace/${detailData.product._id}`}
 target="_blank"
 className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1 hover:bg-slate-50 dark:hover:bg-slate-800"
 >
 Public View <ExternalLink size={12} />
 </Link>
 </div>
 </div>

 {/* Photo Gallery Carousel */}
 {detailData.product.images && detailData.product.images.length > 0 && (
 <div className="space-y-2">
 <div className="h-64 sm:h-80 w-full rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden relative border border-slate-200 dark:border-slate-700 flex items-center justify-center">
 <img
 src={detailData.product.images[activeImageIndex]?.url || detailData.product.images[activeImageIndex]?.thumbnailUrl}
 alt="Product visual"
 className="h-full w-full object-contain"
 />
 </div>
 {detailData.product.images.length > 1 && (
 <div className="flex items-center gap-2 overflow-x-auto pb-1">
 {detailData.product.images.map((img, i) => (
 <button
 key={i}
 onClick={() => setActiveImageIndex(i)}
 className={`h-14 w-14 rounded-lg overflow-hidden shrink-0 border-2 transition ${
 activeImageIndex === i ? "border-brand-emerald ring-2 ring-emerald-400/30" : "border-transparent opacity-60 hover:opacity-100"
 }`}
 >
 <img src={img.thumbnailUrl || img.url} alt="thumbnail" className="h-full w-full object-cover" />
 </button>
 ))}
 </div>
 )}
 </div>
 )}

 {/* Specs Grid */}
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
 <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
 <p className="text-[11px] text-slate-500">Price</p>
 <p className="text-base font-bold text-slate-900 dark:text-white">
 ৳{detailData.product.price.toLocaleString()}
 </p>
 </div>
 <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
 <p className="text-[11px] text-slate-500">Stock Available</p>
 <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
 {detailData.product.stock} units
 </p>
 </div>
 <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
 <p className="text-[11px] text-slate-500">Category</p>
 <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
 {detailData.product.category}
 </p>
 </div>
 <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
 <p className="text-[11px] text-slate-500">Condition</p>
 <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
 {detailData.product.condition}
 </p>
 </div>
 </div>

 {/* Description */}
 <div>
 <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Description</h4>
 <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line p-3 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
 {detailData.product.description || "No description provided."}
 </p>
 </div>

 {/* Seller Info */}
 <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs">
 <p className="font-bold text-slate-900 dark:text-white mb-2">Seller Overview</p>
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
 <div>
 <span className="text-slate-400">Seller:</span>
 <p className="font-semibold">{detailData.product.seller?.fullName || "Student"}</p>
 </div>
 <div>
 <span className="text-slate-400">Email:</span>
 <p className="font-semibold truncate">{detailData.product.seller?.email || "N/A"}</p>
 </div>
 <div>
 <span className="text-slate-400">Department:</span>
 <p className="font-semibold">{detailData.product.seller?.department || "CUET"}</p>
 </div>
 </div>
 </div>

 {/* Reports on this product */}
 <div>
 <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
 Scam & Fake Listing Reports ({detailData.reports.length})
 </h4>
 {detailData.reports.length === 0 ? (
 <p className="text-xs text-slate-500">No reports filed against this listing.</p>
 ) : (
 <div className="space-y-2">
 {detailData.reports.map((r) => (
 <div
 key={r._id}
 className="p-3 rounded-xl border border-red-200 bg-red-50/30 dark:border-red-900/40 dark:bg-red-950/20 text-xs"
 >
 <div className="flex items-center justify-between font-semibold text-red-600 dark:text-red-400 text-[11px]">
 <span>Category: {r.reason.replace("_", " ")}</span>
 <span className="capitalize">{r.status}</span>
 </div>
 <p className="mt-1 text-slate-700 dark:text-slate-300">{r.description}</p>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 )}
 </div>
 </div>
 )}

 {/* ── Action Modals (Hide, Remove, Restore, Edit) ── */}
 {actionType && actionProduct && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
 <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
 <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
 <h3 className="text-sm font-bold text-slate-900 dark:text-white">
 {actionType === "hide" && `Hide Listing: "${actionProduct.title}"`}
 {actionType === "remove" && `Remove Prohibited Listing`}
 {actionType === "restore" && `Restore Listing to Marketplace`}
 {actionType === "edit" && `Edit Product Information`}
 </h3>
 <button
 onClick={() => {
 setActionType(null);
 setActionProduct(null);
 }}
 className="text-slate-400 hover:text-slate-600"
 >
 <X size={16} />
 </button>
 </div>

 {actionMsg && (
 <div
 className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
 actionMsg.type === "success"
 ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
 : "bg-red-50 text-red-700 border border-red-200"
 }`}
 >
 {actionMsg.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
 <span>{actionMsg.text}</span>
 </div>
 )}

 {/* Hide Form */}
 {actionType === "hide" && (
 <div className="space-y-3">
 <p className="text-xs text-slate-500">
 Hiding removes the product from search and marketplace browse views, but retains its database record safely.
 </p>
 <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
 Moderator Reason / Note
 <textarea
 rows={3}
 value={actionReason}
 onChange={(e) => setActionReason(e.target.value)}
 placeholder="e.g. Under quality review or price verification..."
 className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs outline-none focus:border-amber-500"
 />
 </label>
 </div>
 )}

 {/* Remove Form */}
 {actionType === "remove" && (
 <div className="space-y-3">
 <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-400">
 <strong>Action Notice:</strong> Marks product as removed by moderator. The seller will be notified of this takedown with the reason below.
 </div>
 <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
 Takedown Reason *
 <textarea
 rows={3}
 value={actionReason}
 onChange={(e) => setActionReason(e.target.value)}
 placeholder="e.g. Prohibited item, copyright violation, or fake product..."
 className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs outline-none focus:border-red-500"
 required
 />
 </label>
 </div>
 )}

 {/* Restore Confirmation */}
 {actionType === "restore" && (
 <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
 <p>
 Restore <strong>"{actionProduct.title}"</strong> back to active marketplace status?
 </p>
 <p className="text-[11px] text-slate-400">
 Students will once again be able to view, wishlist, and purchase this product.
 </p>
 </div>
 )}

 {/* Edit Form */}
 {actionType === "edit" && (
 <div className="space-y-3 text-xs max-h-[60vh] overflow-y-auto pr-1">
 <div>
 <label className="font-semibold text-slate-700 dark:text-slate-300">Title</label>
 <input
 type="text"
 value={editForm.title}
 onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
 className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-brand-emerald"
 />
 </div>
 <div className="grid grid-cols-2 gap-2">
 <div>
 <label className="font-semibold text-slate-700 dark:text-slate-300">Price (৳)</label>
 <input
 type="number"
 value={editForm.price}
 onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })}
 className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-brand-emerald"
 />
 </div>
 <div>
 <label className="font-semibold text-slate-700 dark:text-slate-300">Stock</label>
 <input
 type="number"
 value={editForm.stock}
 onChange={(e) => setEditForm({ ...editForm, stock: Number(e.target.value) })}
 className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-brand-emerald"
 />
 </div>
 </div>
 <div className="grid grid-cols-2 gap-2">
 <div>
 <label className="font-semibold text-slate-700 dark:text-slate-300">Category</label>
 <select
 value={editForm.category}
 onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
 className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-brand-emerald"
 >
 {CATEGORIES.map((c) => (
 <option key={c} value={c}>
 {c}
 </option>
 ))}
 </select>
 </div>
 <div>
 <label className="font-semibold text-slate-700 dark:text-slate-300">Condition</label>
 <select
 value={editForm.condition}
 onChange={(e) => setEditForm({ ...editForm, condition: e.target.value })}
 className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-brand-emerald"
 >
 <option value="New">New</option>
 <option value="Like New">Like New</option>
 <option value="Used - Good">Used - Good</option>
 <option value="Used - Fair">Used - Fair</option>
 </select>
 </div>
 </div>
 <div>
 <label className="font-semibold text-slate-700 dark:text-slate-300">Description</label>
 <textarea
 rows={3}
 value={editForm.description}
 onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
 className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-brand-emerald"
 />
 </div>
 </div>
 )}

 {/* Buttons */}
 <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
 <Button
 variant="outline"
 size="sm"
 onClick={() => {
 setActionType(null);
 setActionProduct(null);
 }}
 disabled={actionLoading}
 className="text-xs"
 >
 Cancel
 </Button>
 <Button
 size="sm"
 onClick={handleActionSubmit}
 disabled={actionLoading || (actionType === "remove" && !actionReason.trim())}
 className={`text-xs text-white ${
 actionType === "remove"
 ? "bg-rose-600 hover:bg-rose-700"
 : actionType === "hide"
 ? "bg-amber-600 hover:bg-amber-700"
 : "bg-brand-emerald hover:bg-emerald-700"
 }`}
 >
 {actionLoading ? (
 <span className="flex items-center gap-1.5">
 <Loader2 size={13} className="animate-spin" />
 Processing...
 </span>
 ) : actionType === "restore" ? (
 "Confirm Restore"
 ) : actionType === "remove" ? (
 "Confirm Removal"
 ) : actionType === "hide" ? (
 "Hide Product"
 ) : (
 "Save Changes"
 )}
 </Button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
