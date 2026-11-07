"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Package,
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Eye,
  ArrowRight,
  Store
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/api";

type ShopStats = {
  totalProducts: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalItemsSold: number;
};

type Order = {
  _id: string;
  buyer: { fullName: string; avatarUrl?: string; department?: string };
  product: { title: string; images?: Array<{ thumbnailUrl: string }> };
  quantity: number;
  totalPrice: number;
  status: string;
  createdAt: string;
};

type Product = {
  _id: string;
  title: string;
  stock: number;
  images?: Array<{ thumbnailUrl: string }>;
  status: string;
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300",
  preparing: "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300",
  ready_for_pickup: "bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
  cancelled: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300",
};

const LOW_STOCK_THRESHOLD = 5;

export default function ShopDashboardPage() {
  const [stats, setStats] = useState<ShopStats>({
    totalProducts: 0,
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalItemsSold: 0
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [shopName, setShopName] = useState("Your Shop");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
    if (!token) { setLoading(false); return; }

    try {
      const [shopRes, ordersRes, productsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/shops/owner/my-shop`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/orders/shop-orders`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/shops/owner/products`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (shopRes.ok) {
        const shopData = await shopRes.json();
        if (shopData.success) {
          setShopName(shopData.shop?.shopName || "Your Shop");
          if (shopData.stats) setStats(shopData.stats);
        }
      }

      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        if (ordersData.success && Array.isArray(ordersData.orders)) {
          setRecentOrders(ordersData.orders.slice(0, 6));
        }
      }

      if (productsRes.ok) {
        const productsData = await productsRes.json();
        if (productsData.success && Array.isArray(productsData.products)) {
          const low = productsData.products
            .filter((p: Product) => p.stock <= LOW_STOCK_THRESHOLD && p.status === "active")
            .sort((a: Product, b: Product) => a.stock - b.stock)
            .slice(0, 5);
          setLowStockProducts(low);
        }
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-BD", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  const statCards = [
    { label: "Total Orders", value: stats.totalOrders, icon: ShoppingBag, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/40" },
    { label: "Pending Orders", value: stats.pendingOrders, icon: Clock, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/40" },
    { label: "Completed Orders", value: stats.completedOrders, icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
    { label: "Total Items Sold", value: stats.totalItemsSold, icon: TrendingUp, color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-50 dark:bg-teal-950/40" },
  ];

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-200 dark:bg-slate-700 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Welcome back, <span className="text-brand-emerald">{shopName}</span>
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Here's what's happening with your shop today.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          title="Refresh"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-tight">{card.label}</p>
                  <p className={`mt-1.5 text-2xl font-bold font-display ${card.color}`}>{card.value}</p>
                </div>
                <div className={`p-2 rounded-xl ${card.bg} shrink-0`}>
                  <Icon size={18} className={card.color} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Recent Orders ── */}
        <div className="lg:col-span-2">
          <Card className="p-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <ShoppingBag size={16} className="text-brand-emerald" />
                <h2 className="font-semibold text-sm text-slate-900 dark:text-white">Recent Orders</h2>
              </div>
              <Link
                href="/shop-portal/orders"
                className="text-xs text-brand-emerald hover:underline flex items-center gap-1 font-medium"
              >
                View all <ArrowRight size={12} />
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <div className="py-12 text-center">
                <ShoppingBag size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">No orders yet.</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Orders from students will appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {recentOrders.map((order) => {
                  const imgSrc = order.product?.images?.[0]?.thumbnailUrl;
                  return (
                    <div key={order._id} className="flex items-center gap-3 px-4 sm:px-5 py-3">
                      {imgSrc ? (
                        <Image src={imgSrc} alt={order.product?.title || ""} width={40} height={40} unoptimized className="rounded-lg object-cover shrink-0 h-10 w-10" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                          <Package size={16} className="text-slate-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {order.buyer?.fullName || "Unknown"}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {order.product?.title} × {order.quantity}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white">৳{order.totalPrice}</p>
                        <span className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${STATUS_COLORS[order.status] || "bg-slate-100 text-slate-600"}`}>
                          {order.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <Link
                        href={`/shop-portal/orders?id=${order._id}`}
                        className="shrink-0 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                        title="View Order"
                      >
                        <Eye size={13} />
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* ── Low Stock Alert ── */}
        <div>
          <Card className="p-0 overflow-hidden">
            <div className="flex items-center gap-2 px-4 sm:px-5 py-3.5 border-b border-slate-100 dark:border-slate-700">
              <AlertTriangle size={16} className="text-amber-500" />
              <h2 className="font-semibold text-sm text-slate-900 dark:text-white">Low Stock Alert</h2>
            </div>

            {lowStockProducts.length === 0 ? (
              <div className="py-10 text-center">
                <CheckCircle2 size={32} className="mx-auto text-emerald-400 mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">All products well-stocked!</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {lowStockProducts.map((p) => {
                  const imgSrc = p.images?.[0]?.thumbnailUrl;
                  return (
                    <div key={p._id} className="flex items-center gap-3 px-4 sm:px-5 py-3">
                      {imgSrc ? (
                        <Image src={imgSrc} alt={p.title} width={36} height={36} unoptimized className="rounded-lg object-cover shrink-0 h-9 w-9" />
                      ) : (
                        <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                          <Package size={14} className="text-slate-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{p.title}</p>
                        <p className={`text-[11px] font-medium ${p.stock === 0 ? "text-rose-500" : "text-amber-500"}`}>
                          {p.stock === 0 ? "Out of Stock" : `Only ${p.stock} left`}
                        </p>
                      </div>
                      <Link
                        href={`/shop-portal/products?edit=${p._id}`}
                        className="shrink-0 text-[10px] font-semibold text-brand-emerald hover:underline"
                      >
                        Update
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="px-4 sm:px-5 py-3 border-t border-slate-100 dark:border-slate-700">
              <Link href="/shop-portal/products">
                <Button variant="ghost" className="w-full text-xs py-1.5">
                  Manage All Products <ArrowRight size={12} className="ml-1" />
                </Button>
              </Link>
            </div>
          </Card>

          {/* Quick Links */}
          <Card className="mt-4 p-4">
            <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <Link href="/shop-portal/products" className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 hover:text-brand-emerald dark:hover:text-brand-emerald font-medium transition">
                <Package size={14} /> Add New Product
              </Link>
              <Link href="/shop-portal/my-shop" className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 hover:text-brand-emerald dark:hover:text-brand-emerald font-medium transition">
                <Store size={14} /> Edit Shop Profile
              </Link>
              <Link href="/shop-portal/orders?status=pending" className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 hover:text-brand-emerald dark:hover:text-brand-emerald font-medium transition">
                <Clock size={14} /> View Pending Orders
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

