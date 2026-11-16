"use client";

import { useState } from "react";
import {
 AlertTriangle,
 ShieldCheck,
 ShieldAlert,
 Loader2,
 X,
 Flag,
 CheckCircle2
} from "lucide-react";
import { ScamDetectionResult } from "@/lib/scam-guardian";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/api";

type ScamGuardianBannerProps = {
 detection: ScamDetectionResult;
 onDismiss: () => void;
 onInsertSafeReply?: (replyText: string) => void;
 targetUser?: {
 _id: string;
 fullName: string;
 department?: string;
 hall?: string;
 };
};

/**
 * Simple, clean, non-intrusive warning banner.
 * One-sentence, instant to read, no clutter or nested boxes.
 */
export function ScamGuardianBanner({
 detection,
 onDismiss,
 targetUser
}: ScamGuardianBannerProps) {
 const [isReportModalOpen, setIsReportModalOpen] = useState(false);

 if (!detection.hasRisk) return null;

 const isCritical = detection.level === "critical";

 // Pick one concise, direct warning sentence
 const simpleMessage =
 detection.category === "credential_theft"
 ? "Never share passwords, PINs, or OTP codes in chat."
 : detection.category === "phishing_link"
 ? "Be cautious of external links. Keep trades inside CUET E-Bazar."
 : "Never send money or booking fees in advance via bKash/Nagad. Always meet on campus (e.g. TSC Cafeteria) for Cash-on-Delivery.";

 return (
 <>
 <div
 className={`border-b border-l-4 px-3 sm:px-4 py-2.5 flex items-center justify-between gap-3 text-xs shrink-0 ${
 isCritical
 ? "bg-rose-50 dark:bg-rose-950/40 border-l-rose-600 border-b-rose-200 dark:border-b-rose-900/40 text-rose-900 dark:text-rose-200"
 : "bg-amber-50 dark:bg-amber-950/40 border-l-amber-500 border-b-amber-200 dark:border-b-amber-900/40 text-amber-900 dark:text-amber-200"
 }`}
 >
 <div className="flex items-center gap-2 min-w-0">
 <AlertTriangle
 size={16}
 className={`shrink-0 ${isCritical ? "text-rose-600" : "text-amber-600"}`}
 />
 <p className="leading-snug">
 <strong className="font-semibold">Safety Notice: </strong>
 <span>{simpleMessage}</span>
 </p>
 </div>

 <div className="flex items-center gap-2.5 shrink-0">
 {targetUser && (
 <button
 type="button"
 onClick={() => setIsReportModalOpen(true)}
 className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 hover:underline"
 >
 Report
 </button>
 )}
 <button
 type="button"
 onClick={onDismiss}
 className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded transition"
 aria-label="Dismiss warning"
 >
 <X size={14} />
 </button>
 </div>
 </div>

 {isReportModalOpen && targetUser && (
 <ScamGuardianReportModal
 targetUser={targetUser}
 flaggedReason="scam"
 defaultDescription="Suspicious advance payment or fraud request in chat."
 onClose={() => setIsReportModalOpen(false)}
 />
 )}
 </>
 );
}

/**
 * Minimalist header status pill
 */
export function ScamGuardianStatusBadge({
 detection,
 onClick,
 isAnalyzing = false
}: {
 detection: ScamDetectionResult;
 onClick: () => void;
 isAnalyzing?: boolean;
}) {
 const hasRisk = detection.hasRisk;

 return (
 <button
 type="button"
 onClick={onClick}
 className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border transition shrink-0 ${
 hasRisk
 ? "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-300 dark:border-rose-800"
 : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
 }`}
 title="CUET Safe Trading Guidelines"
 >
 {isAnalyzing ? (
 <>
 <Loader2 size={11} className="animate-spin text-brand-emerald" />
 <span>Checking...</span>
 </>
 ) : hasRisk ? (
 <>
 <ShieldAlert size={12} className="text-rose-600" />
 <span>Warning</span>
 </>
 ) : (
 <>
 <ShieldCheck size={12} className="text-brand-emerald" />
 <span>Protected</span>
 </>
 )}
 </button>
 );
}

/**
 * Clean single-line typing warning shown right above the input box
 */
export function ScamGuardianTypingAlert({ warningText }: { warningText: string }) {
 return (
 <div className="px-3 sm:px-4 py-1.5 bg-amber-50 dark:bg-amber-950/40 border-t border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 flex items-center gap-1.5 text-xs">
 <AlertTriangle size={13} className="text-amber-600 shrink-0" />
 <span className="truncate">{warningText}</span>
 </div>
 );
}

/**
 * Report Modal
 */
export function ScamGuardianReportModal({
 targetUser,
 flaggedReason,
 defaultDescription,
 onClose
}: {
 targetUser: {
 _id: string;
 fullName: string;
 department?: string;
 hall?: string;
 };
 flaggedReason: string;
 defaultDescription: string;
 onClose: () => void;
}) {
 const [reason, setReason] = useState(flaggedReason || "scam");
 const [description, setDescription] = useState(defaultDescription || "");
 const [loading, setLoading] = useState(false);
 const [submitted, setSubmitted] = useState(false);
 const [errorMsg, setErrorMsg] = useState<string | null>(null);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setLoading(true);
 setErrorMsg(null);

 const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
 if (!token) {
 setErrorMsg("Please log in to submit a report.");
 setLoading(false);
 return;
 }

 try {
 const res = await fetch(`${API_BASE_URL}/api/reports`, {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 Authorization: `Bearer ${token}`
 },
 body: JSON.stringify({
 targetType: "user",
 targetId: targetUser._id,
 reason,
 description
 })
 });

 const data = await res.json();
 if (res.ok && data.success) {
 setSubmitted(true);
 setTimeout(() => {
 onClose();
 }, 1500);
 } else {
 setErrorMsg(data.message || "Failed to submit report.");
 }
 } catch (err: any) {
 setErrorMsg(err.message || "An unexpected error occurred.");
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4">
 <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
 <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
 <div className="flex items-center gap-2">
 <div className="h-8 w-8 rounded-xl bg-rose-100 dark:bg-rose-950 flex items-center justify-center text-rose-600">
 <Flag size={16} />
 </div>
 <div>
 <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
 Report {targetUser.fullName}
 </h3>
 <p className="text-[11px] text-slate-500">
 {targetUser.department || "CUET"} • {targetUser.hall || "Campus"}
 </p>
 </div>
 </div>
 <button
 onClick={onClose}
 className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
 >
 <X size={18} />
 </button>
 </div>

 {submitted ? (
 <div className="py-8 text-center space-y-2">
 <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-brand-emerald flex items-center justify-center mx-auto">
 <CheckCircle2 size={24} />
 </div>
 <h4 className="font-bold text-slate-900 dark:text-white text-sm">
 Report Submitted to Admin
 </h4>
 <p className="text-xs text-slate-500 max-w-xs mx-auto">
 Our campus moderators will review the chat logs.
 </p>
 </div>
 ) : (
 <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
 {errorMsg && (
 <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
 <AlertTriangle size={14} className="shrink-0" />
 <span>{errorMsg}</span>
 </div>
 )}

 <div>
 <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
 Reason for Report
 </label>
 <select
 value={reason}
 onChange={(e) => setReason(e.target.value)}
 className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
 >
 <option value="scam">Advance Payment Scam / Fraud</option>
 <option value="fake_product">Fake / Misrepresented Product</option>
 <option value="harassment">Harassment / Inappropriate Conduct</option>
 <option value="spam">Spam / Deceptive Messages</option>
 <option value="other">Other Campus Violation</option>
 </select>
 </div>

 <div>
 <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
 Details
 </label>
 <textarea
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 rows={3}
 required
 className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
 placeholder="Explain what happened..."
 />
 </div>

 <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
 <Button
 type="button"
 variant="ghost"
 onClick={onClose}
 className="text-xs"
 >
 Cancel
 </Button>
 <Button
 type="submit"
 disabled={loading}
 className="border-rose-600 bg-rose-600 text-white hover:bg-rose-700 text-xs px-4"
 >
 {loading ? <Loader2 size={14} className="animate-spin" /> : "Submit Report"}
 </Button>
 </div>
 </form>
 )}
 </div>
 </div>
 );
}
