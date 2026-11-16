"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
 Flag,
 AlertTriangle,
 CheckCircle2,
 Clock,
 XCircle,
 Eye,
 EyeOff,
 User,
 Store,
 Package,
 ShieldAlert,
 Search,
 Filter,
 RefreshCw,
 ExternalLink,
 ChevronRight,
 Loader2,
 X,
 AlertCircle
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/api";

type Reporter = {
 _id: string;
 fullName: string;
 email: string;
 studentId?: string;
 department?: string;
};

type ReportItem = {
 _id: string;
 reporter?: Reporter;
 targetType: "product" | "shop" | "user" | "giveaway";
 targetId: string;
 targetEntity?: any;
 reason: string;
 description: string;
 evidence?: string[];
 status: "pending" | "under_review" | "resolved" | "dismissed";
 adminNotes?: string;
 actionTaken?: string;
 resolvedBy?: { fullName?: string; email?: string };
 resolvedAt?: string;
 createdAt: string;
};

function ReportsContent() {
 const searchParams = useSearchParams();
 const initialStatus = searchParams.get("status") || "all";
 const initialId = searchParams.get("id");

 const [reports, setReports] = useState<ReportItem[]>([]);
 const [loading, setLoading] = useState(true);
 const [total, setTotal] = useState(0);
 const [page, setPage] = useState(1);
 const [totalPages, setTotalPages] = useState(1);

 // Filters
 const [status, setStatus] = useState<string>(initialStatus);
 const [targetType, setTargetType] = useState<string>("all");
 const [reason, setReason] = useState<string>("all");

 // Selected report for investigation
 const [activeReport, setActiveReport] = useState<ReportItem | null>(null);
 const [selectedAction, setSelectedAction] = useState<string>("dismiss");
 const [adminNotes, setAdminNotes] = useState<string>("");
 const [suspendDays, setSuspendDays] = useState<number>(7);
 const [actionLoading, setActionLoading] = useState<boolean>(false);
 const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

 const fetchReports = useCallback(async () => {
 setLoading(true);
 try {
 const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
 if (!token) return;

 const params = new URLSearchParams({
 page: String(page),
 limit: "15"
 });
 if (status !== "all") params.set("status", status);
 if (targetType !== "all") params.set("targetType", targetType);
 if (reason !== "all") params.set("reason", reason);

 const res = await fetch(`${API_BASE_URL}/api/admin/reports?${params.toString()}`, {
 headers: { Authorization: `Bearer ${token}` }
 });
 const data = await res.json();
 if (data.success) {
 setReports(data.reports || []);
 setTotal(data.total || 0);
 setTotalPages(data.totalPages || 1);

 // If deep linked to a specific report ID, open it
 if (initialId) {
 const matched = (data.reports || []).find((r: ReportItem) => r._id === initialId);
 if (matched) setActiveReport(matched);
 }
 }
 } catch (err) {
 console.error("Fetch reports error:", err);
 } finally {
 setLoading(false);
 }
 }, [page, status, targetType, reason, initialId]);

 useEffect(() => {
 fetchReports();
 }, [fetchReports]);

 const handleExecuteAction = async () => {
 if (!activeReport) return;
 setActionLoading(true);
 setActionMsg(null);

 const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
 try {
 const res = await fetch(`${API_BASE_URL}/api/admin/reports/${activeReport._id}/action`, {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 Authorization: `Bearer ${token}`
 },
 body: JSON.stringify({
 action: selectedAction,
 adminNotes,
 durationDays: suspendDays
 })
 });
 const data = await res.json();

 if (!res.ok || !data.success) {
 throw new Error(data.message || "Failed to execute moderation action.");
 }

 setActionMsg({ type: "success", text: data.message || "Action recorded successfully." });
 setTimeout(() => {
 setActiveReport(null);
 setAdminNotes("");
 setActionMsg(null);
 fetchReports();
 }, 1000);
 } catch (err: unknown) {
 const msg = err instanceof Error ? err.message : "Error executing action.";
 setActionMsg({ type: "error", text: msg });
 } finally {
 setActionLoading(false);
 }
 };

 return (
 <div className="space-y-6 pb-12">
 {/* ── Page Header ── */}
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
 <PageHeader
 title="Reports & Platform Moderation"
 description="Review student reports against fake listings, scams, policy violations, or harassment, and take decisive moderation actions."
 />
 <Button
 onClick={() => fetchReports()}
 disabled={loading}
 variant="outline"
 className="self-start sm:self-auto text-xs bg-white dark:bg-slate-800"
 >
 <RefreshCw size={14} className={loading ? "animate-spin mr-1.5" : "mr-1.5"} />
 Refresh
 </Button>
 </div>

 {/* ── Status Tab Selector ── */}
 <div className="flex items-center gap-2 overflow-x-auto pb-1">
 {[
 { label: "All Reports", value: "all" },
 { label: "Pending Queue", value: "pending" },
 { label: "Under Review", value: "under_review" },
 { label: "Resolved", value: "resolved" },
 { label: "Dismissed", value: "dismissed" }
 ].map((tab) => (
 <button
 key={tab.value}
 onClick={() => {
 setStatus(tab.value);
 setPage(1);
 }}
 className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
 status === tab.value
 ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm"
 : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
 }`}
 >
 {tab.label}
 </button>
 ))}
 </div>

 {/* ── Secondary Filters ── */}
 <Card className="p-4 border-slate-200/80 dark:border-slate-700/80">
 <div className="grid gap-3 sm:grid-cols-2">
 {/* Target Type Filter */}
 <div>
 <label className="block text-[11px] font-semibold text-slate-500 mb-1">Entity Type</label>
 <select
 value={targetType}
 onChange={(e) => {
 setTargetType(e.target.value);
 setPage(1);
 }}
 className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 px-3 text-xs outline-none focus:border-brand-emerald"
 >
 <option value="all">All Reported Entities</option>
 <option value="product">Products / Listings</option>
 <option value="shop">Campus Shops / Sellers</option>
 <option value="user">Student Users</option>
 <option value="giveaway">Giveaways</option>
 </select>
 </div>

 {/* Reason Category Filter */}
 <div>
 <label className="block text-[11px] font-semibold text-slate-500 mb-1">Violation Category</label>
 <select
 value={reason}
 onChange={(e) => {
 setReason(e.target.value);
 setPage(1);
 }}
 className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 px-3 text-xs outline-none focus:border-brand-emerald"
 >
 <option value="all">All Categories</option>
 <option value="scam">Scam / Financial Fraud</option>
 <option value="fake_product">Fake or Misleading Product</option>
 <option value="inappropriate_content">Inappropriate Content / Photos</option>
 <option value="harassment">Harassment / Suspicious Behaviour</option>
 <option value="spam">Spam / Duplicate Posting</option>
 <option value="other">Other Violation</option>
 </select>
 </div>
 </div>
 </Card>

 {/* ── Reports Queue Table ── */}
 <Card className="p-0 overflow-hidden border-slate-200/80 dark:border-slate-700/80">
 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs">
 <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-700">
 <tr>
 <th className="py-3 px-4">Report Details</th>
 <th className="py-3 px-4">Reporter</th>
 <th className="py-3 px-4">Target Entity</th>
 <th className="py-3 px-4">Category</th>
 <th className="py-3 px-4">Status</th>
 <th className="py-3 px-4 text-right">Action</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
 {loading ? (
 <tr>
 <td colSpan={6} className="py-12 text-center text-slate-500">
 <Loader2 className="animate-spin mx-auto text-brand-emerald mb-2" size={24} />
 Loading moderation queue...
 </td>
 </tr>
 ) : reports.length === 0 ? (
 <tr>
 <td colSpan={6} className="py-12 text-center text-slate-500">
 <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
 No reports match this filter. The queue is clean.
 </td>
 </tr>
 ) : (
 reports.map((r) => {
 return (
 <tr
 key={r._id}
 className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition duration-150"
 >
 {/* Report Details */}
 <td className="py-3 px-4">
 <div className="min-w-0 max-w-xs">
 <p className="font-semibold text-slate-900 dark:text-white truncate">
 #{r._id.slice(-6)}
 </p>
 <p className="text-[11px] text-slate-500 line-clamp-1">{r.description}</p>
 <p className="text-[10px] text-slate-400 mt-0.5">
 {new Date(r.createdAt).toLocaleDateString()} at{" "}
 {new Date(r.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
 </p>
 </div>
 </td>

 {/* Reporter */}
 <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
 <p className="font-medium text-slate-900 dark:text-white truncate">
 {r.reporter?.fullName || "Student"}
 </p>
 <p className="text-[11px] text-slate-500 truncate">
 {r.reporter?.studentId ? `ID: ${r.reporter.studentId}` : r.reporter?.email || "Student"}
 </p>
 </td>

 {/* Target Entity */}
 <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
 <div className="flex items-center gap-1.5">
 {r.targetType === "product" && <Package size={14} className="text-blue-500 shrink-0" />}
 {r.targetType === "shop" && <Store size={14} className="text-amber-500 shrink-0" />}
 {r.targetType === "user" && <User size={14} className="text-emerald-500 shrink-0" />}
 <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[130px]">
 {r.targetEntity?.title || r.targetEntity?.shopName || r.targetEntity?.fullName || r.targetType}
 </span>
 </div>
 <p className="text-[10px] text-slate-400 capitalize">Type: {r.targetType}</p>
 </td>

 {/* Category */}
 <td className="py-3 px-4">
 <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200">
 {r.reason.replace("_", " ")}
 </span>
 </td>

 {/* Status */}
 <td className="py-3 px-4">
 <span
 className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
 r.status === "pending"
 ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
 : r.status === "under_review"
 ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
 : r.status === "resolved"
 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
 : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
 }`}
 >
 {r.status === "pending" && <AlertTriangle size={11} />}
 {r.status === "under_review" && <Clock size={11} />}
 {r.status === "resolved" && <CheckCircle2 size={11} />}
 {r.status === "dismissed" && <XCircle size={11} />}
 {r.status.replace("_", " ")}
 </span>
 {r.actionTaken && (
 <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 truncate max-w-[110px]">
 Action: {r.actionTaken.replace("_", " ")}
 </p>
 )}
 </td>

 {/* Action */}
 <td className="py-3 px-4 text-right">
 <Button
 size="sm"
 onClick={() => {
 setActiveReport(r);
 setSelectedAction(r.status === "pending" ? "mark_under_review" : "dismiss");
 setAdminNotes(r.adminNotes || "");
 }}
 className="h-7 px-2.5 text-[11px] font-semibold bg-red-600 hover:bg-red-700 text-white"
 >
 Investigate
 </Button>
 </td>
 </tr>
 );
 })
 )}
 </tbody>
 </table>
 </div>

 {/* Pagination */}
 <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500">
 <span>Page {page} of {totalPages} ({total} reports)</span>
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

 {/* ── Investigation & Resolution Modal ── */}
 {activeReport && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
 <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5">
 <button
 onClick={() => {
 setActiveReport(null);
 setAdminNotes("");
 setActionMsg(null);
 }}
 className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800"
 >
 <X size={18} />
 </button>

 {/* Modal Header */}
 <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
 <div className="flex items-center gap-2">
 <span className="text-red-500 font-bold">Report #{activeReport._id.slice(-6)}</span>
 <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 capitalize">
 {activeReport.status.replace("_", " ")}
 </span>
 </div>
 <p className="text-xs text-slate-500 mt-1">
 Submitted on {new Date(activeReport.createdAt).toLocaleString()} by{" "}
 <span className="font-semibold text-slate-800 dark:text-slate-200">
 {activeReport.reporter?.fullName || "Student"}
 </span>{" "}
 ({activeReport.reporter?.studentId ? `ID: ${activeReport.reporter.studentId}` : activeReport.reporter?.email})
 </p>
 </div>

 {/* Reported Reason & Description */}
 <div className="p-3.5 rounded-xl bg-red-50/50 dark:bg-red-950/20 border border-red-200/80 dark:border-red-900/40 text-xs space-y-1.5">
 <p className="font-bold text-red-700 dark:text-red-400 uppercase text-[10px] tracking-wider">
 Report Category: {activeReport.reason.replace("_", " ")}
 </p>
 <p className="text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
 "{activeReport.description}"
 </p>
 </div>

 {/* Target Information Card */}
 <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs">
 <p className="font-bold text-slate-900 dark:text-white uppercase text-[10px] tracking-wider mb-2">
 Reported Target: {activeReport.targetType.toUpperCase()}
 </p>
 {activeReport.targetEntity ? (
 <div className="flex items-center justify-between">
 <div>
 <p className="font-semibold text-sm text-slate-900 dark:text-white">
 {activeReport.targetEntity.title || activeReport.targetEntity.shopName || activeReport.targetEntity.fullName}
 </p>
 {activeReport.targetType === "product" && (
 <p className="text-slate-500">
 ৳{activeReport.targetEntity.price?.toLocaleString()} • Status: {activeReport.targetEntity.status}
 </p>
 )}
 {activeReport.targetType === "shop" && (
 <p className="text-slate-500">Category: {activeReport.targetEntity.category}</p>
 )}
 {activeReport.targetType === "user" && (
 <p className="text-slate-500">{activeReport.targetEntity.department} • {activeReport.targetEntity.email}</p>
 )}
 </div>
 {activeReport.targetType === "product" && (
 <Link
 href={`/marketplace/${activeReport.targetId}`}
 target="_blank"
 className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-medium flex items-center gap-1 hover:bg-slate-100"
 >
 Inspect Listing <ExternalLink size={12} />
 </Link>
 )}
 {activeReport.targetType === "shop" && (
 <Link
 href={`/shops/${activeReport.targetEntity.slug || activeReport.targetId}`}
 target="_blank"
 className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-medium flex items-center gap-1 hover:bg-slate-100"
 >
 View Shop <ExternalLink size={12} />
 </Link>
 )}
 </div>
 ) : (
 <p className="text-slate-500">Entity ID: {activeReport.targetId}</p>
 )}
 </div>

 {/* Moderation Workflow & Action Selection */}
 <div className="p-4 rounded-xl border-2 border-red-500/20 bg-white dark:bg-slate-900 space-y-3">
 <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
 Moderation Action & Resolution
 </h4>

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

 <div>
 <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
 Select Action
 </label>
 <select
 value={selectedAction}
 onChange={(e) => setSelectedAction(e.target.value)}
 className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-red-500"
 >
 <option value="mark_under_review">Mark Under Review (Keep in investigation)</option>
 <option value="dismiss">Dismiss Report (No violation / false alarm)</option>
 <option value="warn_user">Warn User / Seller (Sends official warning notification)</option>
 {activeReport.targetType === "product" && (
 <>
 <option value="hide_product">Hide Product (Reversible)</option>
 <option value="remove_product">Remove Product (Prohibited / Fake)</option>
 </>
 )}
 {activeReport.targetType === "shop" && (
 <>
 <option value="suspend_shop">Suspend Shop (Temporarily lock shop)</option>
 <option value="disable_shop">Permanently Disable Shop</option>
 </>
 )}
 <option value="suspend_user">Suspend User / Seller Account</option>
 <option value="ban_user">Permanently Ban User Account</option>
 </select>
 </div>

 {/* Duration for suspensions */}
 {(selectedAction === "suspend_shop" || selectedAction === "suspend_user") && (
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
 )}

 {/* Admin Notes */}
 <div>
 <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
 Investigation Findings & Admin Notes *
 </label>
 <textarea
 rows={3}
 value={adminNotes}
 onChange={(e) => setAdminNotes(e.target.value)}
 placeholder="Record why this action was taken (visible in activity log and audit history)..."
 className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs outline-none focus:border-red-500"
 required
 />
 </div>

 <div className="flex items-center justify-end gap-2 pt-2">
 <Button
 variant="outline"
 size="sm"
 onClick={() => setActiveReport(null)}
 disabled={actionLoading}
 className="text-xs"
 >
 Close
 </Button>
 <Button
 size="sm"
 onClick={handleExecuteAction}
 disabled={actionLoading || !adminNotes.trim()}
 className="text-xs bg-red-600 hover:bg-red-700 text-white"
 >
 {actionLoading ? (
 <span className="flex items-center gap-1.5">
 <Loader2 size={13} className="animate-spin" />
 Executing...
 </span>
 ) : (
 "Apply Moderation Action"
 )}
 </Button>
 </div>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}

export default function AdminReportsPage() {
 return (
 <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading reports...</div>}>
 <ReportsContent />
 </Suspense>
 );
}
