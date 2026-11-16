"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
 Store,
 Search,
 Filter,
 Eye,
 EyeOff,
 AlertTriangle,
 Clock,
 Ban,
 CheckCircle2,
 Edit2,
 RefreshCw,
 Package,
 ShoppingBag,
 ExternalLink,
 Phone,
 Mail,
 MapPin,
 Star,
 Users,
 X,
 Loader2,
 AlertCircle
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/api";

type Owner = {
 _id: string;
 fullName: string;
 email: string;
 contactNumber?: string;
 studentId?: string;
 department?: string;
 isBanned?: boolean;
 isSuspended?: boolean;
};

type ShopItem = {
 _id: string;
 shopName: string;
 slug: string;
 category: string;
 description: string;
 location: string;
 contactNumber: string;
 email: string;
 bannerUrl?: string;
 logoUrl?: string;
 operatingHours?: { open: string; close: string };
 isVerified: boolean;
 isBanned: boolean;
 isSuspended: boolean;
 suspendedUntil?: string;
 suspensionReason?: string;
 isDisabled: boolean;
 isHidden: boolean;
 isOpen: boolean;
 rating: number;
 totalSales: number;
 totalReviews: number;
 productCount?: number;
 owner?: Owner;
 createdAt: string;
};

type ShopDetail = {
 shop: ShopItem;
 products: Array<{
 _id: string;
 title: string;
 price: number;
 stock: number;
 category: string;
 status: string;
 images?: Array<{ url: string; thumbnailUrl: string }>;
 }>;
 ordersCount: number;
 reportsAgainst: Array<{
 _id: string;
 reason: string;
 description: string;
 status: string;
 createdAt: string;
 reporter?: { fullName: string; studentId?: string };
 }>;
};

const SHOP_CATEGORIES = [
 "General Store & Grocery",
 "Stationery & Photocopy",
 "Electronics & Accessories",
 "Food, Snacks & Cafeteria",
 "Clothing & Tailoring",
 "Books & Academic Resources",
 "Pharmacy & Personal Care",
 "Gadget Repair & Services",
 "Others"
];

export default function AdminSellersPage() {
 const [shops, setShops] = useState<ShopItem[]>([]);
 const [loading, setLoading] = useState(true);
 const [total, setTotal] = useState(0);
 const [page, setPage] = useState(1);
 const [totalPages, setTotalPages] = useState(1);

 // Filters
 const [search, setSearch] = useState("");
 const [category, setCategory] = useState("all");
 const [status, setStatus] = useState("all");

 // Detail Modal
 const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
 const [detailData, setDetailData] = useState<ShopDetail | null>(null);
 const [detailLoading, setDetailLoading] = useState(false);

 // Actions
 const [actionShop, setActionShop] = useState<ShopItem | null>(null);
 const [actionType, setActionType] = useState<"suspend" | "disable" | "toggle-visibility" | "restore" | "edit" | null>(null);
 const [actionReason, setActionReason] = useState("");
 const [suspendDays, setSuspendDays] = useState(7);
 const [actionLoading, setActionLoading] = useState(false);
 const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

 // Edit Form State
 const [editForm, setEditForm] = useState({
 shopName: "",
 category: "",
 description: "",
 location: "",
 contactNumber: "",
 email: "",
 isVerified: false,
 isOpen: true
 });

 const fetchSellers = useCallback(async () => {
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

 const res = await fetch(`${API_BASE_URL}/api/admin/sellers?${params.toString()}`, {
 headers: { Authorization: `Bearer ${token}` }
 });
 const data = await res.json();
 if (data.success) {
 setShops(data.shops || []);
 setTotal(data.total || 0);
 setTotalPages(data.totalPages || 1);
 }
 } catch (err) {
 console.error("Fetch sellers error:", err);
 } finally {
 setLoading(false);
 }
 }, [page, search, category, status]);

 useEffect(() => {
 fetchSellers();
 }, [fetchSellers]);

 const openShopDetails = async (shopId: string) => {
 setSelectedShopId(shopId);
 setDetailLoading(true);
 try {
 const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
 const res = await fetch(`${API_BASE_URL}/api/admin/sellers/${shopId}`, {
 headers: { Authorization: `Bearer ${token}` }
 });
 const data = await res.json();
 if (data.success) {
 setDetailData(data);
 }
 } catch (err) {
 console.error("Error fetching shop detail:", err);
 } finally {
 setDetailLoading(false);
 }
 };

 const handleActionSubmit = async () => {
 if (!actionShop || !actionType) return;
 setActionLoading(true);
 setActionMsg(null);

 const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
 let endpoint = "";
 let method = "POST";
 let body: any = {};

 if (actionType === "suspend") {
 endpoint = `${API_BASE_URL}/api/admin/sellers/${actionShop._id}/suspend`;
 body = { reason: actionReason, durationDays: suspendDays };
 } else if (actionType === "disable") {
 endpoint = `${API_BASE_URL}/api/admin/sellers/${actionShop._id}/disable`;
 body = { reason: actionReason };
 } else if (actionType === "toggle-visibility") {
 endpoint = `${API_BASE_URL}/api/admin/sellers/${actionShop._id}/toggle-visibility`;
 body = {};
 } else if (actionType === "restore") {
 endpoint = `${API_BASE_URL}/api/admin/sellers/${actionShop._id}/restore`;
 body = {};
 } else if (actionType === "edit") {
 endpoint = `${API_BASE_URL}/api/admin/sellers/${actionShop._id}/edit`;
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

 setActionMsg({ type: "success", text: resData.message || "Operation completed." });
 setTimeout(() => {
 setActionType(null);
 setActionShop(null);
 setActionReason("");
 setActionMsg(null);
 fetchSellers();
 if (selectedShopId === actionShop._id) {
 openShopDetails(actionShop._id);
 }
 }, 1000);
 } catch (err: unknown) {
 const msg = err instanceof Error ? err.message : "Action failed.";
 setActionMsg({ type: "error", text: msg });
 } finally {
 setActionLoading(false);
 }
 };

 const openEditModal = (s: ShopItem) => {
 setActionShop(s);
 setActionType("edit");
 setEditForm({
 shopName: s.shopName || "",
 category: s.category || "",
 description: s.description || "",
 location: s.location || "",
 contactNumber: s.contactNumber || "",
 email: s.email || "",
 isVerified: Boolean(s.isVerified),
 isOpen: s.isOpen !== false
 });
 };

 return (
 <div className="space-y-6 pb-12">
 {/* ── Page Header ── */}
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
 <PageHeader
 title="Campus Sellers & Shops"
 description="Oversee verified shops, track sales and inventories, manage directory visibility, and resolve business violations."
 />
 <Button
 onClick={() => fetchSellers()}
 disabled={loading}
 variant="outline"
 className="self-start sm:self-auto text-xs bg-white dark:bg-slate-800"
 >
 <RefreshCw size={14} className={loading ? "animate-spin mr-1.5" : "mr-1.5"} />
 Refresh
 </Button>
 </div>

 {/* ── Search and Filter Bar ── */}
 <Card className="p-4 border-slate-200/80 dark:border-slate-700/80 space-y-3">
 <div className="grid gap-3 sm:grid-cols-3">
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
 placeholder="Search by shop name, location, owner..."
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
 <option value="all">All Shop Categories</option>
 {SHOP_CATEGORIES.map((cat) => (
 <option key={cat} value={cat}>
 {cat}
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
 <option value="all">All Shop Statuses</option>
 <option value="active">Active & Open</option>
 <option value="suspended">Temporarily Suspended</option>
 <option value="disabled">Permanently Disabled</option>
 <option value="hidden">Hidden from Directory</option>
 </select>
 </div>
 </div>

 <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
 <span>Found {total} campus shops</span>
 {(search || category !== "all" || status !== "all") && (
 <button
 onClick={() => {
 setSearch("");
 setCategory("all");
 setStatus("all");
 setPage(1);
 }}
 className="text-brand-emerald hover:underline font-medium"
 >
 Reset Filters
 </button>
 )}
 </div>
 </Card>

 {/* ── Shops Table ── */}
 <Card className="p-0 overflow-hidden border-slate-200/80 dark:border-slate-700/80">
 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs">
 <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-700">
 <tr>
 <th className="py-3 px-4">Shop Name</th>
 <th className="py-3 px-4">Owner / Contact</th>
 <th className="py-3 px-4">Category & Location</th>
 <th className="py-3 px-4">Status & Directory</th>
 <th className="py-3 px-4">Products & Sales</th>
 <th className="py-3 px-4 text-right">Moderation Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
 {loading ? (
 <tr>
 <td colSpan={6} className="py-12 text-center text-slate-500">
 <Loader2 className="animate-spin mx-auto text-brand-emerald mb-2" size={24} />
 Loading campus shops...
 </td>
 </tr>
 ) : shops.length === 0 ? (
 <tr>
 <td colSpan={6} className="py-12 text-center text-slate-500">
 No shops match the current filter.
 </td>
 </tr>
 ) : (
 shops.map((s) => (
 <tr
 key={s._id}
 className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition duration-150"
 >
 {/* Shop Name & Logo */}
 <td className="py-3 px-4">
 <div className="flex items-center gap-2.5">
 <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
 {s.logoUrl ? (
 <img src={s.logoUrl} alt={s.shopName} className="h-full w-full object-cover" />
 ) : (
 <Store size={16} />
 )}
 </div>
 <div className="min-w-0">
 <p className="font-semibold text-slate-900 dark:text-white truncate flex items-center gap-1">
 {s.shopName}
 {s.isVerified && (
 <span title="Verified Shop">
 <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
 </span>
 )}
 </p>
 <p className="text-[11px] text-slate-500 dark:text-slate-400">/{s.slug || "shop"}</p>
 </div>
 </div>
 </td>

 {/* Owner & Contact */}
 <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
 <p className="font-medium text-slate-900 dark:text-white truncate">
 {s.owner?.fullName || "Unassigned"}
 </p>
 <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
 {s.contactNumber || s.owner?.contactNumber || s.email}
 </p>
 </td>

 {/* Category & Location */}
 <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
 <p className="font-medium text-slate-900 dark:text-white truncate max-w-[150px]">
 {s.category}
 </p>
 <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
 {s.location || "CUET Campus"}
 </p>
 </td>

 {/* Status & Directory */}
 <td className="py-3 px-4">
 <div className="flex flex-col gap-1 items-start">
 {s.isDisabled ? (
 <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200">
 <Ban size={11} /> Disabled
 </span>
 ) : s.isSuspended ? (
 <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300">
 <Clock size={11} /> Suspended
 </span>
 ) : (
 <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
 <CheckCircle2 size={11} /> Active
 </span>
 )}

 {s.isHidden && (
 <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
 <EyeOff size={10} /> Hidden from /shops
 </span>
 )}
 </div>
 </td>

 {/* Performance */}
 <td className="py-3 px-4 text-[11px] text-slate-600 dark:text-slate-400">
 <p className="font-semibold text-slate-900 dark:text-white">
 {s.productCount || 0} Products Listed
 </p>
 <p className="text-slate-500">Sales: {s.totalSales || 0} • Rating: {s.rating || "New"}</p>
 </td>

 {/* Actions */}
 <td className="py-3 px-4 text-right">
 <div className="flex items-center justify-end gap-1.5">
 <Button
 size="sm"
 variant="outline"
 onClick={() => openShopDetails(s._id)}
 className="h-7 px-2.5 text-[11px] font-medium"
 >
 Details
 </Button>

 <Button
 size="sm"
 variant="outline"
 onClick={() => openEditModal(s)}
 className="h-7 px-2 text-[11px]"
 title="Edit Shop Details"
 >
 <Edit2 size={12} />
 </Button>

 <Button
 size="sm"
 variant="outline"
 onClick={() => {
 setActionShop(s);
 setActionType("toggle-visibility");
 }}
 className={`h-7 px-2 text-[11px] ${
 s.isHidden ? "text-emerald-600" : "text-amber-600"
 }`}
 title={s.isHidden ? "Make Visible in Campus Shops" : "Hide from Campus Shops"}
 >
 {s.isHidden ? <Eye size={12} /> : <EyeOff size={12} />}
 </Button>

 {s.isSuspended || s.isDisabled ? (
 <Button
 size="sm"
 onClick={() => {
 setActionShop(s);
 setActionType("restore");
 }}
 className="h-7 px-2 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white"
 >
 Restore
 </Button>
 ) : (
 <div className="flex items-center gap-1">
 <Button
 size="sm"
 variant="outline"
 onClick={() => {
 setActionShop(s);
 setActionType("suspend");
 setActionReason("");
 }}
 className="h-7 px-2 text-[11px] text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/40"
 title="Suspend Shop"
 >
 Suspend
 </Button>
 <Button
 size="sm"
 variant="outline"
 onClick={() => {
 setActionShop(s);
 setActionType("disable");
 setActionReason("");
 }}
 className="h-7 px-2 text-[11px] text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
 title="Permanently Disable Shop"
 >
 Disable
 </Button>
 </div>
 )}
 </div>
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>

 {/* Pagination */}
 <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500">
 <span>Page {page} of {totalPages} ({total} shops)</span>
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

 {/* ── Shop Details Drawer / Modal ── */}
 {selectedShopId && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
 <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
 <button
 onClick={() => {
 setSelectedShopId(null);
 setDetailData(null);
 }}
 className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800"
 >
 <X size={18} />
 </button>

 {detailLoading || !detailData ? (
 <div className="py-16 text-center">
 <Loader2 size={32} className="animate-spin mx-auto text-brand-emerald mb-2" />
 <p className="text-xs text-slate-500">Loading shop overview and inventory...</p>
 </div>
 ) : (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
 <div className="flex items-center gap-3">
 <div className="h-14 w-14 rounded-xl bg-amber-500/10 border-2 border-amber-500/20 text-amber-600 flex items-center justify-center font-bold text-lg shrink-0 overflow-hidden">
 {detailData.shop.logoUrl ? (
 <img src={detailData.shop.logoUrl} alt={detailData.shop.shopName} className="h-full w-full object-cover" />
 ) : (
 <Store size={28} />
 )}
 </div>
 <div>
 <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
 {detailData.shop.shopName}
 {detailData.shop.isVerified && (
 <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full dark:bg-emerald-950/60 dark:text-emerald-300">
 Verified Shop
 </span>
 )}
 </h2>
 <p className="text-xs text-slate-500">Category: {detailData.shop.category}</p>
 </div>
 </div>

 <div className="flex items-center gap-2">
 <Button
 size="sm"
 variant="outline"
 onClick={() => openEditModal(detailData.shop)}
 className="text-xs"
 >
 <Edit2 size={13} className="mr-1" /> Edit Shop
 </Button>
 <Link
 href={`/shops/${detailData.shop.slug || detailData.shop._id}`}
 target="_blank"
 className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1 hover:bg-slate-50 dark:hover:bg-slate-800"
 >
 Public View <ExternalLink size={12} />
 </Link>
 </div>
 </div>

 {/* Owner Card */}
 <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
 <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Shop Owner Information</p>
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
 <div>
 <span className="text-slate-400">Name:</span>
 <p className="font-semibold text-slate-900 dark:text-white">{detailData.shop.owner?.fullName || "N/A"}</p>
 </div>
 <div>
 <span className="text-slate-400">Email:</span>
 <p className="font-semibold text-slate-900 dark:text-white truncate">{detailData.shop.owner?.email || "N/A"}</p>
 </div>
 <div>
 <span className="text-slate-400">Phone:</span>
 <p className="font-semibold text-slate-900 dark:text-white">{detailData.shop.owner?.contactNumber || detailData.shop.contactNumber || "N/A"}</p>
 </div>
 <div>
 <span className="text-slate-400">Owner Status:</span>
 <p className="font-semibold">
 {detailData.shop.owner?.isBanned ? (
 <span className="text-rose-600">Banned Account</span>
 ) : (
 <span className="text-emerald-600">Active</span>
 )}
 </p>
 </div>
 </div>
 </div>

 {/* Shop Products */}
 <div>
 <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5 flex items-center justify-between">
 <span>Products Listed ({detailData.products.length})</span>
 <span className="text-[11px] font-normal text-slate-400">{detailData.ordersCount} Total Shop Orders</span>
 </h3>

 {detailData.products.length === 0 ? (
 <p className="text-xs text-slate-500 p-4 border border-dashed rounded-xl text-center">
 No products listed in this shop yet.
 </p>
 ) : (
 <div className="max-h-60 overflow-y-auto space-y-2">
 {detailData.products.map((p) => (
 <div
 key={p._id}
 className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/30 flex items-center justify-between gap-3 text-xs"
 >
 <div className="min-w-0">
 <p className="font-semibold text-slate-900 dark:text-white truncate">{p.title}</p>
 <p className="text-[11px] text-slate-500">
 ৳{p.price.toLocaleString()} • Stock: {p.stock} • {p.category}
 </p>
 </div>
 <span
 className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
 p.status === "active"
 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
 : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
 }`}
 >
 {p.status}
 </span>
 </div>
 ))}
 </div>
 )}
 </div>

 {/* Reports Against this shop */}
 <div>
 <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
 Reports Filed Against Shop ({detailData.reportsAgainst.length})
 </h3>
 {detailData.reportsAgainst.length === 0 ? (
 <p className="text-xs text-slate-500">No reports logged against this seller or shop.</p>
 ) : (
 <div className="space-y-2">
 {detailData.reportsAgainst.map((r) => (
 <div
 key={r._id}
 className="p-3 rounded-xl border border-red-200 bg-red-50/30 dark:border-red-900/40 dark:bg-red-950/20 text-xs"
 >
 <div className="flex items-center justify-between text-[11px] font-semibold text-red-600 dark:text-red-400">
 <span>Issue: {r.reason.replace("_", " ")}</span>
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

 {/* ── Action Modals ── */}
 {actionType && actionShop && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
 <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
 <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
 <h3 className="text-sm font-bold text-slate-900 dark:text-white">
 {actionType === "suspend" && `Suspend "${actionShop.shopName}"`}
 {actionType === "disable" && `Permanently Disable "${actionShop.shopName}"`}
 {actionType === "toggle-visibility" && `Change Directory Visibility`}
 {actionType === "restore" && `Restore "${actionShop.shopName}"`}
 {actionType === "edit" && `Edit Shop Details`}
 </h3>
 <button
 onClick={() => {
 setActionType(null);
 setActionShop(null);
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

 {/* Suspend Shop */}
 {actionType === "suspend" && (
 <div className="space-y-3">
 <p className="text-xs text-slate-500">
 Suspending a shop closes it and hides its products temporarily. Note: the owner's personal account is not banned.
 </p>
 <div>
 <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
 Suspension Duration
 </label>
 <select
 value={suspendDays}
 onChange={(e) => setSuspendDays(Number(e.target.value))}
 className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-orange-500"
 >
 <option value={3}>3 Days</option>
 <option value={7}>7 Days (1 Week)</option>
 <option value={14}>14 Days (2 Weeks)</option>
 <option value={30}>30 Days (1 Month)</option>
 </select>
 </div>
 <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
 Suspension Reason *
 <textarea
 rows={3}
 value={actionReason}
 onChange={(e) => setActionReason(e.target.value)}
 placeholder="e.g. Unfulfilled customer orders, complaints regarding item quality..."
 className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs outline-none focus:border-orange-500"
 required
 />
 </label>
 </div>
 )}

 {/* Disable Shop */}
 {actionType === "disable" && (
 <div className="space-y-3">
 <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-400">
 <strong>Permanent Action:</strong> Disables this campus shop permanently. The owner will not be able to list items under this shop.
 </div>
 <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
 Disabling Reason *
 <textarea
 rows={3}
 value={actionReason}
 onChange={(e) => setActionReason(e.target.value)}
 placeholder="e.g. Business ceased operations, severe fraud violation..."
 className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs outline-none focus:border-red-500"
 required
 />
 </label>
 </div>
 )}

 {/* Toggle Visibility */}
 {actionType === "toggle-visibility" && (
 <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
 <p>
 {actionShop.isHidden
 ? `Restore "${actionShop.shopName}" to the public Campus Shops directory (/shops)?`
 : `Hide "${actionShop.shopName}" from the public Campus Shops directory (/shops)?`}
 </p>
 <p className="text-[11px] text-slate-400">
 {actionShop.isHidden
 ? "Students will once again discover this shop in directory listings."
 : "The shop and its products will remain intact in the database but won't be featured publicly."}
 </p>
 </div>
 )}

 {/* Restore Confirmation */}
 {actionType === "restore" && (
 <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
 <p>
 Restore <strong>"{actionShop.shopName}"</strong> to full active status?
 </p>
 <p className="text-[11px] text-slate-400">
 This clears suspensions, disabled flags, and visibility blocks.
 </p>
 </div>
 )}

 {/* Edit Shop Details */}
 {actionType === "edit" && (
 <div className="space-y-3 text-xs max-h-[60vh] overflow-y-auto pr-1">
 <div>
 <label className="font-semibold text-slate-700 dark:text-slate-300">Shop Name</label>
 <input
 type="text"
 value={editForm.shopName}
 onChange={(e) => setEditForm({ ...editForm, shopName: e.target.value })}
 className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-brand-emerald"
 />
 </div>
 <div>
 <label className="font-semibold text-slate-700 dark:text-slate-300">Category</label>
 <select
 value={editForm.category}
 onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
 className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-brand-emerald"
 >
 {SHOP_CATEGORIES.map((c) => (
 <option key={c} value={c}>
 {c}
 </option>
 ))}
 </select>
 </div>
 <div>
 <label className="font-semibold text-slate-700 dark:text-slate-300">Campus Location</label>
 <input
 type="text"
 value={editForm.location}
 onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
 className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-brand-emerald"
 />
 </div>
 <div className="grid grid-cols-2 gap-2">
 <div>
 <label className="font-semibold text-slate-700 dark:text-slate-300">Phone</label>
 <input
 type="text"
 value={editForm.contactNumber}
 onChange={(e) => setEditForm({ ...editForm, contactNumber: e.target.value })}
 className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-brand-emerald"
 />
 </div>
 <div>
 <label className="font-semibold text-slate-700 dark:text-slate-300">Email</label>
 <input
 type="email"
 value={editForm.email}
 onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
 className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-brand-emerald"
 />
 </div>
 </div>
 <div>
 <label className="font-semibold text-slate-700 dark:text-slate-300">Description</label>
 <textarea
 rows={2}
 value={editForm.description}
 onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
 className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-brand-emerald"
 />
 </div>
 <div className="flex items-center gap-4 pt-1">
 <label className="flex items-center gap-2 cursor-pointer">
 <input
 type="checkbox"
 checked={editForm.isVerified}
 onChange={(e) => setEditForm({ ...editForm, isVerified: e.target.checked })}
 className="rounded text-brand-emerald"
 />
 <span className="font-medium text-slate-700 dark:text-slate-300">Verified Badge</span>
 </label>
 <label className="flex items-center gap-2 cursor-pointer">
 <input
 type="checkbox"
 checked={editForm.isOpen}
 onChange={(e) => setEditForm({ ...editForm, isOpen: e.target.checked })}
 className="rounded text-brand-emerald"
 />
 <span className="font-medium text-slate-700 dark:text-slate-300">Shop Open</span>
 </label>
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
 setActionShop(null);
 }}
 disabled={actionLoading}
 className="text-xs"
 >
 Cancel
 </Button>
 <Button
 size="sm"
 onClick={handleActionSubmit}
 disabled={
 actionLoading ||
 ((actionType === "suspend" || actionType === "disable") && !actionReason.trim())
 }
 className={`text-xs text-white ${
 actionType === "disable"
 ? "bg-rose-600 hover:bg-rose-700"
 : actionType === "suspend"
 ? "bg-orange-600 hover:bg-orange-700"
 : "bg-brand-emerald hover:bg-emerald-700"
 }`}
 >
 {actionLoading ? (
 <span className="flex items-center gap-1.5">
 <Loader2 size={13} className="animate-spin" />
 Executing...
 </span>
 ) : actionType === "restore" ? (
 "Confirm Restore"
 ) : actionType === "disable" ? (
 "Confirm Disable"
 ) : actionType === "suspend" ? (
 "Confirm Suspension"
 ) : actionType === "toggle-visibility" ? (
 actionShop.isHidden ? "Make Visible" : "Hide Shop"
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
