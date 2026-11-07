"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  ShoppingBag, Search, ChevronDown, RefreshCw, Eye, User,
  Package, Loader2, X, AlertCircle, CheckCircle2, Clock,
  MapPin, Phone, Mail, Calendar
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/api";

type Buyer = {
  fullName: string;
  email?: string;
  contactNumber?: string;
  department?: string;
  hall?: string;
  avatarUrl?: string;
  studentId?: string;
};

type Product = {
  _id: string;
  title: string;
  price: number;
  images?: Array<{ thumbnailUrl: string }>;
  category: string;
};

type Order = {
  _id: string;
  buyer: Buyer;
  product: Product;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: string;
  buyerNotes?: string;
  meetupLocation?: string;
  cancelReason?: string;
  createdAt: string;
  completedAt?: string;
};

const STATUS_FILTERS = [
  { value: "all", label: "All Orders" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "preparing", label: "Preparing" },
  { value: "ready_for_pickup", label: "Ready for Pickup" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300",
  preparing: "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300",
  ready_for_pickup: "bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
  cancelled: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300",
};

// What status transitions are allowed from each state
const NEXT_STATUS: Record<string, { status: string; label: string; color: string }[]> = {
  pending: [
    { status: "confirmed", label: "Accept Order", color: "bg-blue-600 hover:bg-blue-700 text-white border-blue-600" },
    { status: "cancelled", label: "Reject Order", color: "bg-rose-600 hover:bg-rose-700 text-white border-rose-600" },
  ],
  confirmed: [
    { status: "preparing", label: "Start Preparing", color: "bg-purple-600 hover:bg-purple-700 text-white border-purple-600" },
    { status: "cancelled", label: "Cancel", color: "bg-rose-600 hover:bg-rose-700 text-white border-rose-600" },
  ],
  preparing: [
    { status: "ready_for_pickup", label: "Mark Ready for Pickup", color: "bg-teal-600 hover:bg-teal-700 text-white border-teal-600" },
  ],
  ready_for_pickup: [
    { status: "completed", label: "Mark Completed", color: "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600" },
  ],
  completed: [],
  cancelled: [],
};

export default function OrdersPage() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") || "all";
  const initialId = searchParams.get("id") || null;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelInput, setShowCancelInput] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
    if (!token) { setLoading(false); return; }
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`${API_BASE_URL}/api/orders/shop-orders?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setOrders(data.orders || []);
    } catch {}
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Open order from URL param
  useEffect(() => {
    if (initialId && orders.length > 0) {
      const o = orders.find(x => x._id === initialId);
      if (o) setSelectedOrder(o);
    }
  }, [initialId, orders]);

  const handleStatusUpdate = async (order: Order, newStatus: string) => {
    if (newStatus === "cancelled" && showCancelInput && !cancelReason.trim()) {
      setUpdateError("Please provide a cancellation reason.");
      return;
    }
    if (newStatus === "cancelled" && !showCancelInput) {
      setShowCancelInput(true);
      return;
    }

    setUpdating(true);
    setUpdateError(null);
    setUpdateSuccess(null);
    const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
    if (!token) { setUpdating(false); return; }

    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/${order._id}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, cancelReason: cancelReason.trim() || undefined })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to update order.");
      setUpdateSuccess(`Order marked as ${newStatus.replace(/_/g, " ")}.`);
      setCancelReason("");
      setShowCancelInput(false);
      // Update local order
      setOrders(prev => prev.map(o => o._id === order._id ? { ...o, status: newStatus } : o));
      setSelectedOrder(prev => prev?._id === order._id ? { ...prev, status: newStatus } : prev);
    } catch (err: any) {
      setUpdateError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const filteredOrders = orders.filter(o => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.buyer?.fullName?.toLowerCase().includes(q) ||
      o.product?.title?.toLowerCase().includes(q) ||
      o._id.toLowerCase().includes(q)
    );
  });

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Orders</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{filteredOrders.length} orders</p>
        </div>
        <button onClick={fetchOrders} className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Filters */}
      <Card className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by customer or product..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-3.5 py-2.5 text-sm outline-none focus:border-brand-emerald transition"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {STATUS_FILTERS.map(sf => (
              <button
                key={sf.value}
                onClick={() => setStatusFilter(sf.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                  statusFilter === sf.value
                    ? "bg-brand-emerald text-white border-brand-emerald"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-brand-emerald hover:text-brand-emerald"
                }`}
              >
                {sf.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Orders List */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-brand-emerald" /></div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-16 text-center">
            <ShoppingBag size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-600 dark:text-slate-300 font-medium">No orders found.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {filteredOrders.map(order => {
              const imgSrc = order.product?.images?.[0]?.thumbnailUrl;
              return (
                <div key={order._id} className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition cursor-pointer" onClick={() => { setSelectedOrder(order); setUpdateError(null); setUpdateSuccess(null); setShowCancelInput(false); setCancelReason(""); }}>
                  {imgSrc ? (
                    <Image src={imgSrc} alt="" width={44} height={44} className="rounded-xl object-cover h-11 w-11 shrink-0" />
                  ) : (
                    <div className="h-11 w-11 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                      <Package size={18} className="text-slate-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{order.buyer?.fullName || "Unknown"}</p>
                      <span className="hidden sm:inline text-[10px] text-slate-400">#{order._id.slice(-6)}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {order.product?.title} × {order.quantity}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">৳{order.totalPrice}</p>
                    <span className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${STATUS_COLORS[order.status] || ""}`}>
                      {order.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <Eye size={15} className="text-slate-400 shrink-0 hidden sm:block" />
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ── Order Detail Modal ── */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <div>
                <h3 className="font-display font-bold text-slate-900 dark:text-white">Order Details</h3>
                <p className="text-xs text-slate-400 mt-0.5">#{selectedOrder._id.slice(-10)}</p>
              </div>
              <button onClick={() => { setSelectedOrder(null); setUpdateError(null); setUpdateSuccess(null); setShowCancelInput(false); }} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition p-1">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {updateError && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
                  <AlertCircle size={14} /> {updateError}
                </div>
              )}
              {updateSuccess && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={14} /> {updateSuccess}
                </div>
              )}

              {/* Customer Info */}
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Customer</h4>
                <div className="flex items-start gap-3">
                  {selectedOrder.buyer?.avatarUrl ? (
                    <Image src={selectedOrder.buyer.avatarUrl} alt="" width={40} height={40} className="rounded-full h-10 w-10 object-cover shrink-0" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-brand-emerald/20 flex items-center justify-center shrink-0">
                      <User size={18} className="text-brand-emerald" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-slate-900 dark:text-white">{selectedOrder.buyer?.fullName}</p>
                    {selectedOrder.buyer?.department && <p className="text-xs text-slate-500 dark:text-slate-400">{selectedOrder.buyer.department}</p>}
                    {selectedOrder.buyer?.hall && <p className="text-xs text-slate-400">{selectedOrder.buyer.hall}</p>}
                    {selectedOrder.buyer?.contactNumber && (
                      <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                        <Phone size={11} /> {selectedOrder.buyer.contactNumber}
                      </div>
                    )}
                    {selectedOrder.buyer?.email && (
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Mail size={11} /> {selectedOrder.buyer.email}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Product Info */}
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Order Items</h4>
                <div className="flex items-center gap-3">
                  {selectedOrder.product?.images?.[0]?.thumbnailUrl ? (
                    <Image src={selectedOrder.product.images[0].thumbnailUrl} alt="" width={48} height={48} className="rounded-xl object-cover h-12 w-12 shrink-0" />
                  ) : (
                    <div className="h-12 w-12 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                      <Package size={20} className="text-slate-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-900 dark:text-white">{selectedOrder.product?.title}</p>
                    <p className="text-xs text-slate-500">৳{selectedOrder.unitPrice} × {selectedOrder.quantity} = <strong className="text-slate-900 dark:text-white">৳{selectedOrder.totalPrice}</strong></p>
                  </div>
                </div>
              </div>

              {/* Delivery / Notes */}
              {(selectedOrder.meetupLocation || selectedOrder.buyerNotes) && (
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Delivery Info</h4>
                  {selectedOrder.meetupLocation && (
                    <div className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                      <MapPin size={12} className="mt-0.5 shrink-0 text-brand-emerald" />
                      {selectedOrder.meetupLocation}
                    </div>
                  )}
                  {selectedOrder.buyerNotes && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 italic">"{selectedOrder.buyerNotes}"</div>
                  )}
                </div>
              )}

              {/* Status + Date */}
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Calendar size={12} />
                  {formatDate(selectedOrder.createdAt)}
                </div>
                <span className={`rounded px-2 py-1 font-bold uppercase text-[10px] ${STATUS_COLORS[selectedOrder.status] || ""}`}>
                  {selectedOrder.status.replace(/_/g, " ")}
                </span>
              </div>

              {/* Cancellation Reason */}
              {selectedOrder.cancelReason && (
                <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-700 dark:text-rose-300">
                  <strong>Cancellation Reason:</strong> {selectedOrder.cancelReason}
                </div>
              )}

              {/* Cancel Reason Input */}
              {showCancelInput && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Cancellation Reason (optional)</label>
                  <textarea
                    value={cancelReason}
                    onChange={e => setCancelReason(e.target.value)}
                    rows={2}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm outline-none focus:border-brand-emerald transition"
                    placeholder="e.g. Item out of stock..."
                  />
                </div>
              )}

              {/* Action Buttons */}
              {NEXT_STATUS[selectedOrder.status]?.length > 0 && (
                <div className="flex flex-col gap-2">
                  {NEXT_STATUS[selectedOrder.status].map(action => (
                    <button
                      key={action.status}
                      onClick={() => handleStatusUpdate(selectedOrder, action.status)}
                      disabled={updating}
                      className={`w-full flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${action.color} disabled:opacity-60`}
                    >
                      {updating ? <Loader2 size={14} className="animate-spin" /> : null}
                      {action.label}
                    </button>
                  ))}
                  {showCancelInput && (
                    <button onClick={() => { setShowCancelInput(false); setCancelReason(""); }} className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                      Cancel this action
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

