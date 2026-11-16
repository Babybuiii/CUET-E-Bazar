"use client";

import { useState } from "react";
import { Flag, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/api";

type ReportModalProps = {
 isOpen: boolean;
 onClose: () => void;
 targetType?: "product" | "shop" | "user" | "giveaway";
 targetId?: string;
 targetTitle?: string;
};

export function ReportModal({
 isOpen,
 onClose,
 targetType = "product",
 targetId,
 targetTitle
}: ReportModalProps) {
 const [selectedTargetType, setSelectedTargetType] = useState(targetType);
 const [reason, setReason] = useState("scam");
 const [description, setDescription] = useState("");
 const [loading, setLoading] = useState(false);
 const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

 if (!isOpen) return null;

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setFeedback(null);

 const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
 if (!token) {
 setFeedback({ type: "error", text: "Please log in to submit a report." });
 return;
 }

 if (!description.trim()) {
 setFeedback({ type: "error", text: "Please describe the issue in detail." });
 return;
 }

 setLoading(true);
 try {
 const res = await fetch(`${API_BASE_URL}/api/reports`, {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 Authorization: `Bearer ${token}`
 },
 body: JSON.stringify({
 targetType: selectedTargetType,
 targetId: targetId || "6aeee8472e7d2ff70fb7cc94", // fallback if reported from footer
 reason,
 description: description.trim()
 })
 });
 const data = await res.json();

 if (!res.ok || !data.success) {
 throw new Error(data.message || "Failed to submit report.");
 }

 setFeedback({
 type: "success",
 text: "Report received. Our moderation team has been notified and will investigate."
 });
 setTimeout(() => {
 onClose();
 setFeedback(null);
 setDescription("");
 }, 1500);
 } catch (err: unknown) {
 const msg = err instanceof Error ? err.message : "Error submitting report.";
 setFeedback({ type: "error", text: msg });
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
 <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
 <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
 <div className="flex items-center gap-2">
 <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-600">
 <Flag size={16} />
 </div>
 <h3 className="text-sm font-bold text-slate-900 dark:text-white">
 Report Abuse or Scam
 </h3>
 </div>
 <button
 onClick={onClose}
 className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
 >
 <X size={16} />
 </button>
 </div>

 {targetTitle && (
 <p className="text-xs text-slate-500">
 Reporting: <span className="font-semibold text-slate-800 dark:text-slate-200">{targetTitle}</span>
 </p>
 )}

 {feedback && (
 <div
 className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
 feedback.type === "success"
 ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
 : "bg-red-50 text-red-700 border border-red-200"
 }`}
 >
 {feedback.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
 <span>{feedback.text}</span>
 </div>
 )}

 <form onSubmit={handleSubmit} className="space-y-3 text-xs">
 <div>
 <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
 Category of Violation *
 </label>
 <select
 value={reason}
 onChange={(e) => setReason(e.target.value)}
 className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs outline-none focus:border-red-500"
 >
 <option value="scam">Scam / Financial Fraud</option>
 <option value="fake_product">Fake or Misleading Product Listing</option>
 <option value="inappropriate_content">Inappropriate Content / Photos</option>
 <option value="harassment">Harassment or Suspicious Behaviour</option>
 <option value="spam">Spam / Platform Abuse</option>
 <option value="other">Other Violation</option>
 </select>
 </div>

 <div>
 <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
 Description of the Issue *
 </label>
 <textarea
 rows={4}
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 placeholder="Provide specific details about what occurred, seller info, or any evidence..."
 className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs outline-none focus:border-red-500"
 required
 />
 </div>

 <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={onClose}
 disabled={loading}
 className="text-xs"
 >
 Cancel
 </Button>
 <Button
 type="submit"
 size="sm"
 disabled={loading || !description.trim()}
 className="text-xs bg-red-600 hover:bg-red-700 text-white"
 >
 {loading ? (
 <span className="flex items-center gap-1.5">
 <Loader2 size={13} className="animate-spin" />
 Submitting...
 </span>
 ) : (
 "Submit Report to Admin"
 )}
 </Button>
 </div>
 </form>
 </div>
 </div>
 );
}

