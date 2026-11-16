"use client";

import { useEffect, useState, useCallback } from "react";
import {
 Users,
 Search,
 Filter,
 ShieldAlert,
 AlertTriangle,
 Ban,
 CheckCircle2,
 Clock,
 ExternalLink,
 Edit2,
 MoreVertical,
 X,
 RefreshCw,
 Phone,
 Mail,
 GraduationCap,
 Building,
 Calendar,
 Package,
 ShoppingBag,
 Gift,
 FileText,
 AlertCircle,
 Loader2
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CUET_DEPARTMENTS, CUET_HALLS } from "@/data/mock";
import { API_BASE_URL } from "@/lib/api";

type Warning = {
 reason: string;
 issuedBy?: { fullName?: string; email?: string };
 date: string;
};

type UserItem = {
 _id: string;
 userId?: string;
 fullName: string;
 email: string;
 studentId?: string;
 department?: string;
 hall?: string;
 contactNumber: string;
 role: string;
 isVerified: boolean;
 isBanned: boolean;
 banReason?: string;
 isSuspended?: boolean;
 suspendedUntil?: string;
 suspensionReason?: string;
 warnings?: Warning[];
 rating?: number;
 totalProductsSold?: number;
 totalProductsBought?: number;
 totalGiveaways?: number;
 lastActive?: string;
 createdAt: string;
 avatarUrl?: string;
};

type UserDetail = {
 user: UserItem;
 activity: {
 listingsCount: number;
 ordersCount: number;
 giveawaysCount: number;
 recentListings: Array<{
 _id: string;
 title: string;
 price: number;
 category: string;
 status: string;
 }>;
 reportsAgainst: Array<{
 _id: string;
 reason: string;
 description: string;
 status: string;
 createdAt: string;
 reporter?: { fullName: string; studentId?: string };
 }>;
 };
};

export default function AdminUsersPage() {
 const [users, setUsers] = useState<UserItem[]>([]);
 const [loading, setLoading] = useState(true);
 const [total, setTotal] = useState(0);
 const [page, setPage] = useState(1);
 const [totalPages, setTotalPages] = useState(1);

 // Filters
 const [search, setSearch] = useState("");
 const [department, setDepartment] = useState("all");
 const [status, setStatus] = useState("all");

 // Selected User for Details
 const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
 const [detailData, setDetailData] = useState<UserDetail | null>(null);
 const [detailLoading, setDetailLoading] = useState(false);

 // Modals for Actions
 const [actionUser, setActionUser] = useState<UserItem | null>(null);
 const [actionType, setActionType] = useState<"warn" | "suspend" | "ban" | "restore" | "edit" | null>(null);
 const [actionReason, setActionReason] = useState("");
 const [suspendDays, setSuspendDays] = useState(7);
 const [actionLoading, setActionLoading] = useState(false);
 const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

 // Edit fields
 const [editForm, setEditForm] = useState({
 fullName: "",
 department: "",
 hall: "",
 studentId: "",
 contactNumber: "",
 isVerified: true
 });

 const fetchUsers = useCallback(async () => {
 setLoading(true);
 try {
 const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
 if (!token) return;

 const params = new URLSearchParams({
 page: String(page),
 limit: "15",
 role: "student"
 });
 if (search.trim()) params.set("search", search.trim());
 if (department !== "all") params.set("department", department);
 if (status !== "all") params.set("status", status);

 const res = await fetch(`${API_BASE_URL}/api/admin/users?${params.toString()}`, {
 headers: { Authorization: `Bearer ${token}` }
 });
 const data = await res.json();
 if (data.success) {
 setUsers(data.users || []);
 setTotal(data.total || 0);
 setTotalPages(data.totalPages || 1);
 }
 } catch (err) {
 console.error("Fetch users error:", err);
 } finally {
 setLoading(false);
 }
 }, [page, search, department, status]);

 useEffect(() => {
 fetchUsers();
 }, [fetchUsers]);

 const openUserDetails = async (userId: string) => {
 setSelectedUserId(userId);
 setDetailLoading(true);
 try {
 const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
 const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
 headers: { Authorization: `Bearer ${token}` }
 });
 const data = await res.json();
 if (data.success) {
 setDetailData(data);
 }
 } catch (err) {
 console.error("Error fetching user detail:", err);
 } finally {
 setDetailLoading(false);
 }
 };

 const handleActionSubmit = async () => {
 if (!actionUser || !actionType) return;
 setActionLoading(true);
 setActionMsg(null);

 const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
 let endpoint = "";
 let body: any = {};

 if (actionType === "warn") {
 endpoint = `${API_BASE_URL}/api/admin/users/${actionUser._id}/warn`;
 body = { reason: actionReason };
 } else if (actionType === "suspend") {
 endpoint = `${API_BASE_URL}/api/admin/users/${actionUser._id}/suspend`;
 body = { reason: actionReason, durationDays: suspendDays };
 } else if (actionType === "ban") {
 endpoint = `${API_BASE_URL}/api/admin/users/${actionUser._id}/ban`;
 body = { reason: actionReason };
 } else if (actionType === "restore") {
 endpoint = `${API_BASE_URL}/api/admin/users/${actionUser._id}/restore`;
 body = {};
 } else if (actionType === "edit") {
 endpoint = `${API_BASE_URL}/api/admin/users/${actionUser._id}/edit`;
 body = editForm;
 }

 try {
 const res = await fetch(endpoint, {
 method: actionType === "edit" ? "PATCH" : "POST",
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

 setActionMsg({ type: "success", text: resData.message || "Action completed successfully." });
 setTimeout(() => {
 setActionType(null);
 setActionUser(null);
 setActionReason("");
 setActionMsg(null);
 fetchUsers();
 if (selectedUserId === actionUser._id) {
 openUserDetails(actionUser._id);
 }
 }, 1000);
 } catch (err: unknown) {
 const msg = err instanceof Error ? err.message : "Action failed.";
 setActionMsg({ type: "error", text: msg });
 } finally {
 setActionLoading(false);
 }
 };

 const openEditModal = (u: UserItem) => {
 setActionUser(u);
 setActionType("edit");
 setEditForm({
 fullName: u.fullName || "",
 department: u.department || "",
 hall: u.hall || "",
 studentId: u.studentId || "",
 contactNumber: u.contactNumber || "",
 isVerified: Boolean(u.isVerified)
 });
 };

 return (
 <div className="space-y-6 pb-12">
 {/* ── Page Header ── */}
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
 <PageHeader
 title="Student Accounts Management"
 description="View student profiles, review moderation histories, issue official warnings, and manage suspensions or bans."
 />
 <Button
 onClick={() => fetchUsers()}
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
 {/* Search Box */}
 <div className="relative">
 <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
 <input
 type="text"
 value={search}
 onChange={(e) => {
 setSearch(e.target.value);
 setPage(1);
 }}
 placeholder="Search by name, email, student ID..."
 className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 pl-9 pr-3 text-xs outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald"
 />
 </div>

 {/* Department Filter */}
 <div>
 <select
 value={department}
 onChange={(e) => {
 setDepartment(e.target.value);
 setPage(1);
 }}
 className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 px-3 text-xs outline-none focus:border-brand-emerald"
 >
 <option value="all">All Departments</option>
 {CUET_DEPARTMENTS.map((dept) => (
 <option key={dept} value={dept}>
 {dept}
 </option>
 ))}
 </select>
 </div>

 {/* Status Filter */}
 <div>
 <select
 value={status}
 onChange={(e) => {
 setStatus(e.target.value);
 setPage(1);
 }}
 className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 px-3 text-xs outline-none focus:border-brand-emerald"
 >
 <option value="all">All Account Statuses</option>
 <option value="active">Active & Clean</option>
 <option value="warned">Has Warnings</option>
 <option value="suspended">Temporarily Suspended</option>
 <option value="banned">Permanently Banned</option>
 <option value="unverified">Unverified</option>
 </select>
 </div>
 </div>

 <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
 <span>Found {total} student accounts</span>
 {(search || department !== "all" || status !== "all") && (
 <button
 onClick={() => {
 setSearch("");
 setDepartment("all");
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

 {/* ── Users Table ── */}
 <Card className="p-0 overflow-hidden border-slate-200/80 dark:border-slate-700/80">
 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs">
 <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-700">
 <tr>
 <th className="py-3 px-4">Student</th>
 <th className="py-3 px-4">ID & Dept</th>
 <th className="py-3 px-4">Status</th>
 <th className="py-3 px-4">Moderation History</th>
 <th className="py-3 px-4">Activity</th>
 <th className="py-3 px-4 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
 {loading ? (
 <tr>
 <td colSpan={6} className="py-12 text-center text-slate-500">
 <Loader2 className="animate-spin mx-auto text-brand-emerald mb-2" size={24} />
 Loading student accounts...
 </td>
 </tr>
 ) : users.length === 0 ? (
 <tr>
 <td colSpan={6} className="py-12 text-center text-slate-500">
 No student accounts matched your query.
 </td>
 </tr>
 ) : (
 users.map((u) => {
 const warningsCount = u.warnings?.length || 0;
 return (
 <tr
 key={u._id}
 className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition duration-150"
 >
 {/* Name & Email */}
 <td className="py-3 px-4">
 <div className="flex items-center gap-2.5">
 <div className="h-8 w-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-brand-emerald flex items-center justify-center font-bold text-xs shrink-0">
 {u.fullName.charAt(0)}
 </div>
 <div className="min-w-0">
 <p className="font-semibold text-slate-900 dark:text-white truncate flex items-center gap-1">
 {u.fullName}
 {u.isVerified && (
 <span title="Verified">
 <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
 </span>
 )}
 </p>
 <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{u.email}</p>
 </div>
 </div>
 </td>

 {/* ID & Dept */}
 <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
 <p className="font-medium text-slate-900 dark:text-white">
 {u.studentId ? `ID: ${u.studentId}` : "No ID"}
 </p>
 <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
 {u.department || "CUET"}
 </p>
 </td>

 {/* Status */}
 <td className="py-3 px-4">
 {u.isBanned ? (
 <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
 <Ban size={11} /> Banned
 </span>
 ) : u.isSuspended ? (
 <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
 <Clock size={11} /> Suspended
 </span>
 ) : warningsCount > 0 ? (
 <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-300">
 <AlertTriangle size={11} /> {warningsCount} Warning{warningsCount > 1 ? "s" : ""}
 </span>
 ) : (
 <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
 <CheckCircle2 size={11} /> Active
 </span>
 )}
 </td>

 {/* Moderation History */}
 <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
 {warningsCount === 0 && !u.isBanned && !u.isSuspended ? (
 <span className="text-[11px] text-slate-400">Clean record</span>
 ) : (
 <div className="text-[11px] space-y-0.5">
 {warningsCount > 0 && <p className="text-amber-600 dark:text-amber-400">{warningsCount} warnings issued</p>}
 {u.isSuspended && (
 <p className="text-orange-600 dark:text-orange-400">
 Until: {u.suspendedUntil ? new Date(u.suspendedUntil).toLocaleDateString() : "Indefinite"}
 </p>
 )}
 {u.isBanned && <p className="text-rose-600 dark:text-rose-400 truncate max-w-[140px]">Reason: {u.banReason || "Rule violation"}</p>}
 </div>
 )}
 </td>

 {/* Activity */}
 <td className="py-3 px-4 text-slate-600 dark:text-slate-400 text-[11px]">
 <p>Sold: {u.totalProductsSold || 0} • Bought: {u.totalProductsBought || 0}</p>
 <p className="text-slate-400">Giveaways: {u.totalGiveaways || 0}</p>
 </td>

 {/* Actions */}
 <td className="py-3 px-4 text-right">
 <div className="flex items-center justify-end gap-1.5">
 <Button
 size="sm"
 variant="outline"
 onClick={() => openUserDetails(u._id)}
 className="h-7 px-2.5 text-[11px] font-medium"
 >
 Profile
 </Button>

 <Button
 size="sm"
 variant="outline"
 onClick={() => openEditModal(u)}
 className="h-7 px-2 text-[11px]"
 title="Edit User Info"
 >
 <Edit2 size={12} />
 </Button>

 {/* Quick Moderation Actions */}
 {u.isBanned || u.isSuspended ? (
 <Button
 size="sm"
 onClick={() => {
 setActionUser(u);
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
 setActionUser(u);
 setActionType("warn");
 setActionReason("");
 }}
 className="h-7 px-2 text-[11px] text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"
 title="Issue Official Warning"
 >
 Warn
 </Button>
 <Button
 size="sm"
 variant="outline"
 onClick={() => {
 setActionUser(u);
 setActionType("suspend");
 setActionReason("");
 }}
 className="h-7 px-2 text-[11px] text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/40"
 title="Temporarily Suspend"
 >
 Suspend
 </Button>
 <Button
 size="sm"
 variant="outline"
 onClick={() => {
 setActionUser(u);
 setActionType("ban");
 setActionReason("");
 }}
 className="h-7 px-2 text-[11px] text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
 title="Permanently Ban"
 >
 Ban
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
 <span>Page {page} of {totalPages} ({total} users)</span>
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

 {/* ── User Detail Side Drawer / Modal ── */}
 {selectedUserId && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
 <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
 <button
 onClick={() => {
 setSelectedUserId(null);
 setDetailData(null);
 }}
 className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800"
 >
 <X size={18} />
 </button>

 {detailLoading || !detailData ? (
 <div className="py-16 text-center">
 <Loader2 size={32} className="animate-spin mx-auto text-brand-emerald mb-2" />
 <p className="text-xs text-slate-500">Loading student profile & moderation data...</p>
 </div>
 ) : (
 <div className="space-y-6">
 {/* Profile Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
 <div className="flex items-center gap-3">
 <div className="h-14 w-14 rounded-full bg-emerald-500/10 border-2 border-emerald-500/20 text-brand-emerald flex items-center justify-center font-bold text-lg shrink-0">
 {detailData.user.fullName.charAt(0)}
 </div>
 <div>
 <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
 {detailData.user.fullName}
 {detailData.user.isVerified && (
 <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full dark:bg-emerald-950/60 dark:text-emerald-300">
 Verified
 </span>
 )}
 </h2>
 <p className="text-xs text-slate-500">{detailData.user.userId || "CUET Student"}</p>
 </div>
 </div>

 <div className="flex items-center gap-2">
 <Button
 size="sm"
 variant="outline"
 onClick={() => openEditModal(detailData.user)}
 className="text-xs"
 >
 <Edit2 size={13} className="mr-1" /> Edit Profile
 </Button>
 {detailData.user.isBanned || detailData.user.isSuspended ? (
 <Button
 size="sm"
 onClick={() => {
 setActionUser(detailData.user);
 setActionType("restore");
 }}
 className="text-xs bg-emerald-600 text-white hover:bg-emerald-700"
 >
 Restore Account
 </Button>
 ) : (
 <Button
 size="sm"
 onClick={() => {
 setActionUser(detailData.user);
 setActionType("warn");
 setActionReason("");
 }}
 className="text-xs bg-amber-600 text-white hover:bg-amber-700"
 >
 Issue Warning
 </Button>
 )}
 </div>
 </div>

 {/* Info Grid */}
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
 <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
 <p className="text-[11px] text-slate-500">Student ID</p>
 <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
 {detailData.user.studentId || "Not Provided"}
 </p>
 </div>
 <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
 <p className="text-[11px] text-slate-500">Department</p>
 <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
 {detailData.user.department || "CUET"}
 </p>
 </div>
 <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
 <p className="text-[11px] text-slate-500">Hall of Residence</p>
 <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
 {detailData.user.hall || "Non-resident"}
 </p>
 </div>
 <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
 <p className="text-[11px] text-slate-500">Contact Number</p>
 <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
 {detailData.user.contactNumber}
 </p>
 </div>
 </div>

 {/* Moderation Warnings History */}
 <div>
 <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5 flex items-center gap-1.5">
 <ShieldAlert size={14} className="text-amber-500" />
 Official Moderation Warnings ({detailData.user.warnings?.length || 0})
 </h3>
 {(!detailData.user.warnings || detailData.user.warnings.length === 0) ? (
 <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs text-slate-500 text-center">
 No warnings have been issued to this student.
 </div>
 ) : (
 <div className="space-y-2">
 {detailData.user.warnings.map((w, idx) => (
 <div
 key={idx}
 className="p-3 rounded-xl border border-amber-200 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/20 text-xs"
 >
 <div className="flex items-center justify-between text-[11px] text-amber-700 dark:text-amber-300 font-semibold mb-1">
 <span>Warning #{idx + 1}</span>
 <span>{new Date(w.date).toLocaleDateString()}</span>
 </div>
 <p className="text-slate-800 dark:text-slate-200">{w.reason}</p>
 {w.issuedBy?.fullName && (
 <p className="text-[10px] text-slate-500 mt-1">Issued by admin: {w.issuedBy.fullName}</p>
 )}
 </div>
 ))}
 </div>
 )}
 </div>

 {/* Activity Breakdown */}
 <div className="grid sm:grid-cols-3 gap-3">
 <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 flex items-center gap-3">
 <Package size={20} className="text-blue-500" />
 <div>
 <p className="text-[11px] text-slate-500">Listings Created</p>
 <p className="text-sm font-bold text-slate-900 dark:text-white">
 {detailData.activity.listingsCount}
 </p>
 </div>
 </div>
 <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 flex items-center gap-3">
 <ShoppingBag size={20} className="text-purple-500" />
 <div>
 <p className="text-[11px] text-slate-500">Orders Involved</p>
 <p className="text-sm font-bold text-slate-900 dark:text-white">
 {detailData.activity.ordersCount}
 </p>
 </div>
 </div>
 <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 flex items-center gap-3">
 <Gift size={20} className="text-emerald-500" />
 <div>
 <p className="text-[11px] text-slate-500">Giveaways Hosted</p>
 <p className="text-sm font-bold text-slate-900 dark:text-white">
 {detailData.activity.giveawaysCount}
 </p>
 </div>
 </div>
 </div>

 {/* Reports Against this user */}
 <div>
 <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5 flex items-center gap-1.5">
 <AlertTriangle size={14} className="text-rose-500" />
 Reports Filed Against User ({detailData.activity.reportsAgainst.length})
 </h3>
 {detailData.activity.reportsAgainst.length === 0 ? (
 <p className="text-xs text-slate-500">No scam or harassment reports against this student.</p>
 ) : (
 <div className="space-y-2">
 {detailData.activity.reportsAgainst.map((r) => (
 <div
 key={r._id}
 className="p-3 rounded-xl border border-red-200 bg-red-50/30 dark:border-red-900/40 dark:bg-red-950/20 text-xs"
 >
 <div className="flex items-center justify-between text-[11px] font-semibold text-red-600 dark:text-red-400">
 <span>Category: {r.reason.replace("_", " ")}</span>
 <span className="capitalize">{r.status}</span>
 </div>
 <p className="mt-1 text-slate-700 dark:text-slate-300">{r.description}</p>
 <p className="text-[10px] text-slate-500 mt-1">
 Reported by: {r.reporter?.fullName || "Student"} on {new Date(r.createdAt).toLocaleDateString()}
 </p>
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

 {/* ── Action Modals (Warn, Suspend, Ban, Restore, Edit) ── */}
 {actionType && actionUser && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
 <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
 <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
 <h3 className="text-sm font-bold text-slate-900 dark:text-white capitalize">
 {actionType === "warn" && `Issue Warning to ${actionUser.fullName}`}
 {actionType === "suspend" && `Suspend ${actionUser.fullName}`}
 {actionType === "ban" && `Permanently Ban ${actionUser.fullName}`}
 {actionType === "restore" && `Restore ${actionUser.fullName}'s Account`}
 {actionType === "edit" && `Edit Student Profile`}
 </h3>
 <button
 onClick={() => {
 setActionType(null);
 setActionUser(null);
 }}
 className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
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

 {/* Warn Form */}
 {actionType === "warn" && (
 <div className="space-y-3">
 <p className="text-xs text-slate-500">
 This warning will be recorded in the student's database profile and delivered to their in-app notification inbox.
 </p>
 <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
 Warning Reason *
 <textarea
 rows={3}
 value={actionReason}
 onChange={(e) => setActionReason(e.target.value)}
 placeholder="e.g. Inappropriate item description, failure to deliver sold item..."
 className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs outline-none focus:border-amber-500"
 required
 />
 </label>
 </div>
 )}

 {/* Suspend Form */}
 {actionType === "suspend" && (
 <div className="space-y-3">
 <p className="text-xs text-slate-500">
 Temporarily lock the account. The student cannot log in or trade until the suspension expires.
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
 placeholder="e.g. Multiple scam reports pending investigation..."
 className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs outline-none focus:border-orange-500"
 required
 />
 </label>
 </div>
 )}

 {/* Ban Form */}
 {actionType === "ban" && (
 <div className="space-y-3">
 <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-400">
 <strong>Warning:</strong> This permanently revokes login access for this account across the entire CUET E-Bazar platform.
 </div>
 <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
 Permanent Ban Reason *
 <textarea
 rows={3}
 value={actionReason}
 onChange={(e) => setActionReason(e.target.value)}
 placeholder="e.g. Confirmed fraudulent transactions or scam activity..."
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
 Are you sure you want to lift all bans and temporary suspensions on <strong>{actionUser.fullName}</strong>?
 </p>
 <p className="text-[11px] text-slate-400">
 The user will regain immediate access to browse, trade, and message on CUET E-Bazar.
 </p>
 </div>
 )}

 {/* Edit Profile Form */}
 {actionType === "edit" && (
 <div className="space-y-3 text-xs">
 <div>
 <label className="font-semibold text-slate-700 dark:text-slate-300">Full Name</label>
 <input
 type="text"
 value={editForm.fullName}
 onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
 className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-brand-emerald"
 />
 </div>
 <div className="grid grid-cols-2 gap-2">
 <div>
 <label className="font-semibold text-slate-700 dark:text-slate-300">Student ID</label>
 <input
 type="text"
 value={editForm.studentId}
 onChange={(e) => setEditForm({ ...editForm, studentId: e.target.value })}
 className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-brand-emerald"
 />
 </div>
 <div>
 <label className="font-semibold text-slate-700 dark:text-slate-300">Phone</label>
 <input
 type="text"
 value={editForm.contactNumber}
 onChange={(e) => setEditForm({ ...editForm, contactNumber: e.target.value })}
 className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-brand-emerald"
 />
 </div>
 </div>
 <div>
 <label className="font-semibold text-slate-700 dark:text-slate-300">Department</label>
 <select
 value={editForm.department}
 onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
 className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-brand-emerald"
 >
 <option value="">Select Department</option>
 {CUET_DEPARTMENTS.map((d) => (
 <option key={d} value={d}>
 {d}
 </option>
 ))}
 </select>
 </div>
 <div>
 <label className="font-semibold text-slate-700 dark:text-slate-300">Hall of Residence</label>
 <select
 value={editForm.hall}
 onChange={(e) => setEditForm({ ...editForm, hall: e.target.value })}
 className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-brand-emerald"
 >
 <option value="">Select Hall</option>
 {CUET_HALLS.map((h) => (
 <option key={h} value={h}>
 {h}
 </option>
 ))}
 </select>
 </div>
 <div className="flex items-center gap-2 pt-1">
 <input
 type="checkbox"
 id="isVerifiedCheckbox"
 checked={editForm.isVerified}
 onChange={(e) => setEditForm({ ...editForm, isVerified: e.target.checked })}
 className="rounded text-brand-emerald"
 />
 <label htmlFor="isVerifiedCheckbox" className="font-medium text-slate-700 dark:text-slate-300">
 Verified Student Account
 </label>
 </div>
 </div>
 )}

 {/* Submit / Cancel Buttons */}
 <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
 <Button
 variant="outline"
 size="sm"
 onClick={() => {
 setActionType(null);
 setActionUser(null);
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
 ((actionType === "warn" || actionType === "suspend" || actionType === "ban") && !actionReason.trim())
 }
 className={`text-xs text-white ${
 actionType === "ban"
 ? "bg-rose-600 hover:bg-rose-700"
 : actionType === "suspend"
 ? "bg-orange-600 hover:bg-orange-700"
 : actionType === "warn"
 ? "bg-amber-600 hover:bg-amber-700"
 : "bg-brand-emerald hover:bg-emerald-700"
 }`}
 >
 {actionLoading ? (
 <span className="flex items-center gap-1.5">
 <Loader2 size={13} className="animate-spin" />
 Executing...
 </span>
 ) : actionType === "restore" ? (
 "Confirm Account Restore"
 ) : actionType === "ban" ? (
 "Confirm Permanent Ban"
 ) : actionType === "suspend" ? (
 "Confirm Suspension"
 ) : actionType === "edit" ? (
 "Save Changes"
 ) : (
 "Issue Warning"
 )}
 </Button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
