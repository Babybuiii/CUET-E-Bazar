"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ShoppingBag,
  MapPin,
  Clock,
  Phone,
  Store,
  MessageCircle,
  XCircle,
  Loader2,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Truck
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { API_BASE_URL } from "@/lib/api";
import { getAuthToken, useAuth } from "@/lib/auth";

type OrderItem = {
  _id: string;
  product: {
    _id: string;
    title: string;
    price: number;
    images?: Array<{ url: string; thumbnailUrl?: string } | string>;
    category?: string;
    condition?: string;
  };
  shop?: {
    _id: string;
    shopName: string;
    slug?: string;
    location?: string;
    contactNumber?: string;
  } | null;
  seller: {
    _id: string;
    fullName: string;
    contactNumber?: string;
    email?: string;
    department?: string;
    hall?: string;
  };
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  meetupLocation: string;
  buyerNotes?: string;
  createdAt: string;
};

export default function MyOrdersPage() {
  const { isLoggedIn } = useAuth();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchOrders = async () => {
    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE_URL}/api/orders/my-orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        setOrders(data.orders);
      } else {
        setError(data.message || "Failed to load orders.");
      }
    } catch {
      setError("Failed to connect to server. Please ensure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [isLoggedIn]);

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm("Are you sure you want to cancel this order?")) return;
    const token = getAuthToken();
    try {
      setCancellingId(orderId);
      const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: "cancelled", cancelReason: "Cancelled by student buyer" })
      });
      const data = await res.json();
      if (data.success) {
        setOrders((prev) =>
          prev.map((o) => (o._id === orderId ? { ...o, status: "cancelled" } : o))
        );
      } else {
        alert(data.message || "Could not cancel order.");
      }
    } catch {
      alert("Network error while cancelling order.");
    } finally {
      setCancellingId(null);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Orders" description="Track your orders placed from campus shops." />
        <Card className="flex flex-col items-center justify-center py-20 text-center space-y-3">
          <ShoppingBag size={40} className="text-slate-400" />
          <h2 className="font-bold text-lg">Please Sign In</h2>
          <p className="text-xs text-slate-500 max-w-xs">
            Sign in to your CUET account to see your placed orders and campus deliveries.
          </p>
          <Link href="/login">
            <Button className="mt-2 bg-brand-emerald text-white hover:bg-[#0d665f] text-xs">
              Sign In
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Orders & Deliveries"
        description="Track your orders placed from campus stores. Pay cash upon handover at your room or hall gate."
      />

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <Loader2 size={36} className="animate-spin text-brand-emerald" />
          <p className="mt-3 text-sm font-medium">Loading your orders...</p>
        </div>
      ) : error ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle size={36} className="text-rose-500" />
          <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-200">{error}</p>
          <Button onClick={fetchOrders} className="mt-4 bg-brand-emerald text-white hover:bg-[#0d665f] text-xs">
            Try Again
          </Button>
        </Card>
      ) : orders.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-20 text-center space-y-3">
          <div className="rounded-full bg-slate-100 dark:bg-slate-800 p-4 text-slate-400">
            <ShoppingBag size={36} />
          </div>
          <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
            No Orders Placed Yet
          </h3>
          <p className="text-xs text-slate-500 max-w-sm">
            You haven&apos;t placed any orders yet. Check out the campus shops to order items for delivery!
          </p>
          <Link href="/shops">
            <Button className="mt-2 bg-brand-emerald text-white hover:bg-[#0d665f] text-xs font-semibold">
              Browse Campus Shops
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const p = order.product;
            const firstImg = p?.images?.[0];
            const imgUrl =
              typeof firstImg === "object"
                ? firstImg.thumbnailUrl || firstImg.url
                : typeof firstImg === "string"
                ? firstImg
                : "/ebazar.png";

            return (
              <Card
                key={order._id}
                className="overflow-hidden border border-slate-200 dark:border-slate-800 p-5 space-y-4"
              >
                {/* Header Row: Status, Date, ID */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400">
                      Order ID: <span className="font-mono text-slate-700 dark:text-slate-200">{order._id.slice(-6).toUpperCase()}</span>
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-500">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wider ${
                      order.status === "completed"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : order.status === "confirmed"
                        ? "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300"
                        : order.status === "cancelled"
                        ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                    }`}
                  >
                    {order.status === "pending" ? "Order Placed (Pending Confirmation)" : order.status}
                  </span>
                </div>

                {/* Main Content Row */}
                <div className="flex flex-col sm:flex-row gap-4 items-start justify-between">
                  <div className="flex gap-3">
                    {/* Thumbnail */}
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center">
                      {imgUrl.startsWith("data:") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imgUrl}
                          alt={p?.title || "Product"}
                          className="h-full w-full object-contain p-1"
                        />
                      ) : (
                        <Image
                          src={imgUrl}
                          alt={p?.title || "Product"}
                          fill
                          quality={85}
                          unoptimized={imgUrl.includes("cloudinary.com")}
                          className="object-contain p-1"
                        />
                      )}
                    </div>

                    {/* Details */}
                    <div>
                      {p?._id ? (
                        <Link
                          href={`/marketplace/${p._id}`}
                          className="font-bold text-base hover:text-brand-emerald text-slate-900 dark:text-white"
                        >
                          {p.title}
                        </Link>
                      ) : (
                        <span className="font-bold text-base text-slate-900 dark:text-white">
                          {p?.title || "Product"}
                        </span>
                      )}

                      {order.shop ? (
                        <p className="text-xs text-brand-emerald font-semibold flex items-center gap-1 mt-0.5">
                          <Store size={13} /> {order.shop.shopName}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-500 mt-0.5">
                          Seller: {order.seller?.fullName}
                        </p>
                      )}

                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="font-display font-extrabold text-base text-brand-emerald">
                          ৳{order.totalPrice?.toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-400">
                          (৳{order.unitPrice} × {order.quantity})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                    <Link
                      href={`/messages?sellerId=${encodeURIComponent(
                        order.seller?._id || ""
                      )}&sellerName=${encodeURIComponent(
                        order.shop?.shopName || order.seller?.fullName || "Seller"
                      )}`}
                    >
                      <Button
                        variant="ghost"
                        className="border border-slate-200 dark:border-slate-700 text-xs font-semibold py-2 h-auto flex items-center gap-1.5"
                      >
                        <MessageCircle size={14} /> Message Seller
                      </Button>
                    </Link>

                    {order.status === "pending" && (
                      <Button
                        variant="ghost"
                        onClick={() => handleCancelOrder(order._id)}
                        disabled={cancellingId === order._id}
                        className="text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 py-2 h-auto"
                      >
                        <XCircle size={14} className="mr-1" />
                        {cancellingId === order._id ? "Cancelling..." : "Cancel Order"}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Delivery Location & Notice */}
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-3 text-xs text-slate-600 dark:text-slate-300 grid gap-2 sm:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-brand-emerald shrink-0" />
                    <span>
                      Delivery Spot: <strong>{order.meetupLocation}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                    <span>
                      Payment: <strong>Cash on Delivery (Manual Handover)</strong>
                    </span>
                  </div>

                  {order.buyerNotes && (
                    <div className="sm:col-span-2 text-[11px] text-slate-500">
                      <strong>Your Notes:</strong> {order.buyerNotes}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
