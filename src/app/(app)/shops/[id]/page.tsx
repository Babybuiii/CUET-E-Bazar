"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Store,
  MapPin,
  Clock,
  Phone,
  Mail,
  MessageCircle,
  ShoppingBag,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  AlertCircle,
  Heart,
  Plus,
  Package,
  ClipboardList,
  Check,
  XCircle,
  Truck
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/api";
import { getAuthToken, useAuth } from "@/lib/auth";
import { addToCart } from "@/lib/cart";

type ShopOwner = {
  _id: string;
  fullName: string;
  email?: string;
  contactNumber?: string;
  avatarUrl?: string;
  department?: string;
  hall?: string;
  isVerified?: boolean;
};

type CampusShop = {
  _id: string;
  shopName: string;
  slug?: string;
  category: string;
  description?: string;
  bannerUrl?: string;
  logoUrl?: string;
  contactNumber?: string;
  email?: string;
  location: string;
  operatingHours?: {
    open?: string;
    close?: string;
  };
  isVerified?: boolean;
  rating?: number;
  totalReviews?: number;
  totalProducts?: number;
  followersCount?: number;
  followers?: string[];
  owner?: ShopOwner;
};

type ShopProduct = {
  _id: string;
  title: string;
  description?: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  category: string;
  condition: string;
  location?: string;
  status: string;
  images: Array<{ url: string; thumbnailUrl?: string } | string>;
  stock?: number;
};

type IncomingOrder = {
  _id: string;
  buyer: {
    _id: string;
    fullName: string;
    contactNumber?: string;
    email?: string;
    department?: string;
    hall?: string;
  };
  product: {
    _id: string;
    title: string;
    price: number;
  };
  quantity: number;
  totalPrice: number;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  meetupLocation: string;
  buyerNotes?: string;
  createdAt: string;
};

export default function ShopDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const shopId = params?.id as string;
  const { isLoggedIn, user } = useAuth();

  const [shop, setShop] = useState<CampusShop | null>(null);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [addedToast, setAddedToast] = useState<string | null>(null);

  // Shop Owner Orders management state
  const [isOwner, setIsOwner] = useState(false);
  const [orders, setOrders] = useState<IncomingOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [activeTab, setActiveTab] = useState<"products" | "orders">("products");

  const fetchShopData = useCallback(async () => {
    if (!shopId) return;
    try {
      setLoading(true);
      setError(null);

      const [shopRes, productsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/shops/${shopId}`),
        fetch(`${API_BASE_URL}/api/shops/${shopId}/products`)
      ]);

      const shopData = await shopRes.json();
      const productsData = await productsRes.json();

      if (shopData.success && shopData.shop) {
        setShop(shopData.shop);
        setFollowerCount(shopData.shop.followersCount || 0);

        if (user && shopData.shop.followers) {
          const userFollows = shopData.shop.followers.some(
            (f: any) => (typeof f === "string" ? f : f._id) === user._id
          );
          setIsFollowing(userFollows);
        }
      } else {
        setError(shopData.message || "Shop not found.");
      }

      if (productsData.success && Array.isArray(productsData.products)) {
        setProducts(productsData.products);
      }
    } catch {
      setError("Failed to connect to server. Please check backend connection.");
    } finally {
      setLoading(false);
    }
  }, [shopId, user]);

  useEffect(() => {
    fetchShopData();
  }, [fetchShopData]);

  // Check if current logged-in user is the owner of this shop
  useEffect(() => {
    if (user && shop && shop.owner) {
      const ownerId = typeof shop.owner === "string" ? shop.owner : shop.owner._id;
      const owns = ownerId === user._id || user.shop === shop._id;
      setIsOwner(Boolean(owns));
    } else {
      setIsOwner(false);
    }
  }, [user, shop]);

  // Load incoming orders if user is shop owner
  useEffect(() => {
    if (isOwner) {
      const fetchOrders = async () => {
        const token = getAuthToken();
        if (!token) return;
        try {
          setLoadingOrders(true);
          const res = await fetch(`${API_BASE_URL}/api/orders/shop-orders`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          if (data.success && Array.isArray(data.orders)) {
            setOrders(data.orders);
          }
        } catch (e) {
          console.error("Fetch shop orders error:", e);
        } finally {
          setLoadingOrders(false);
        }
      };
      fetchOrders();
    }
  }, [isOwner]);

  const handleToggleFollow = async () => {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    const token = getAuthToken();
    try {
      const res = await fetch(`${API_BASE_URL}/api/shops/${shopId}/follow`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setIsFollowing(data.isFollowing);
        setFollowerCount(data.followersCount);
      }
    } catch (err) {
      console.error("Follow toggle error:", err);
    }
  };

  const handleAddToCart = async (product: ShopProduct) => {
    const res = await addToCart({
      ...product,
      sellerType: "shop",
      shop: shop ? { _id: shop._id, shopName: shop.shopName, location: shop.location } : null
    });
    if (res.success) {
      setAddedToast(`${product.title} added to cart!`);
      setTimeout(() => setAddedToast(null), 3000);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    const token = getAuthToken();
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        setOrders((prev) =>
          prev.map((o) => (o._id === orderId ? { ...o, status: newStatus as any } : o))
        );
      }
    } catch (err) {
      console.error("Update status error:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <Loader2 size={36} className="animate-spin text-brand-emerald" />
        <p className="mt-3 text-sm font-medium">Loading store details & products...</p>
      </div>
    );
  }

  if (error || !shop) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertCircle size={40} className="text-rose-500" />
        <h2 className="mt-4 text-xl font-bold">Store Not Found</h2>
        <p className="mt-2 text-sm text-slate-500">{error || "This store does not exist."}</p>
        <Link href="/shops">
          <Button className="mt-6 bg-brand-emerald text-white hover:bg-[#0d665f]">
            Back to Campus Stores
          </Button>
        </Link>
      </div>
    );
  }

  const owner = shop.owner || { fullName: "Shop Owner", _id: "" };
  const hasBanner = Boolean(shop.bannerUrl && shop.bannerUrl.trim());
  const hasLogo = Boolean(shop.logoUrl && shop.logoUrl.trim());

  return (
    <div className="space-y-6">
      {/* Toast alert */}
      {addedToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-[#0f172a] text-white px-4 py-3 shadow-2xl border border-emerald-500/40 text-sm animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 size={18} className="text-brand-emerald" />
          <span>{addedToast}</span>
        </div>
      )}

      {/* Back button */}
      <div>
        <Link
          href="/shops"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-emerald transition"
        >
          <ChevronLeft size={16} /> All Campus Stores
        </Link>
      </div>

      {/* Hero Banner & Store Header Card */}
      <Card className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Cover Photo */}
        <div className="relative h-44 sm:h-56 w-full bg-gradient-to-r from-teal-900 to-slate-900 overflow-hidden">
          {hasBanner ? (
            <Image
              src={shop.bannerUrl!}
              alt={`${shop.shopName} Banner`}
              fill
              unoptimized={shop.bannerUrl!.includes("cloudinary.com") || shop.bannerUrl!.startsWith("data:")}
              priority
              className="object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-teal-800 to-slate-900 text-white/20">
              <Store size={64} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        </div>

        {/* Profile Info Row */}
        <div className="relative px-5 sm:px-8 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 sm:-mt-14 mb-4">
            {/* Logo and Main Details */}
            <div className="flex items-end gap-4">
              <div className="relative h-24 w-24 sm:h-28 sm:w-28 shrink-0 overflow-hidden rounded-2xl border-4 border-white dark:border-slate-900 bg-white dark:bg-slate-800 shadow-xl flex items-center justify-center">
                {hasLogo ? (
                  <Image
                    src={shop.logoUrl!}
                    alt={shop.shopName}
                    fill
                    unoptimized={shop.logoUrl!.includes("cloudinary.com") || shop.logoUrl!.startsWith("data:")}
                    className="object-cover"
                  />
                ) : (
                  <span className="text-3xl font-extrabold text-brand-emerald">
                    {shop.shopName[0]?.toUpperCase() || "S"}
                  </span>
                )}
              </div>

              <div className="pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                    {shop.shopName}
                  </h1>
                  {shop.isVerified && (
                    <span title="Verified Campus Shop">
                      <CheckCircle2 size={20} className="text-brand-emerald" />
                    </span>
                  )}
                  <span className="rounded-full bg-brand-emerald/10 text-brand-emerald dark:bg-brand-emerald/20 px-2.5 py-0.5 text-xs font-semibold">
                    {shop.category}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Managed by <strong className="text-slate-700 dark:text-slate-300">{owner.fullName}</strong>
                  {owner.department ? ` • ${owner.department}` : ""}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleToggleFollow}
                className={`focus-ring inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold transition border ${
                  isFollowing
                    ? "bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/40"
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50"
                }`}
              >
                <Heart size={15} fill={isFollowing ? "currentColor" : "none"} />
                {isFollowing ? "Following" : "Follow Shop"} ({followerCount})
              </button>

              {/* Direct Message with Shop Owner */}
              <Link
                href={`/messages?sellerId=${encodeURIComponent(owner._id || "")}&sellerName=${encodeURIComponent(
                  shop.shopName || owner.fullName
                )}`}
              >
                <Button className="bg-brand-emerald text-white hover:bg-[#0d665f] py-2.5 px-4 font-semibold text-xs shadow-sm flex items-center gap-1.5">
                  <MessageCircle size={15} /> Chat with Shop Owner
                </Button>
              </Link>
            </div>
          </div>

          {/* Description & Contact Bar */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid gap-3 sm:grid-cols-3 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-brand-emerald shrink-0" />
              <span>Campus Spot: <strong>{shop.location || "CUET Campus"}</strong></span>
            </div>

            {shop.operatingHours && (
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-brand-emerald shrink-0" />
                <span>Operating Hours: <strong>{shop.operatingHours.open || "09:00"} - {shop.operatingHours.close || "21:00"}</strong></span>
              </div>
            )}

            {(shop.contactNumber || owner.contactNumber) && (
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-brand-emerald shrink-0" />
                <span>Contact: <strong>{shop.contactNumber || owner.contactNumber}</strong></span>
              </div>
            )}
          </div>

          {shop.description && (
            <p className="mt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {shop.description}
            </p>
          )}
        </div>
      </Card>

      {/* Tabs if Current User is Owner */}
      {isOwner && (
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab("products")}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === "products"
                ? "bg-brand-emerald text-white"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Package size={15} /> Store Products ({products.length})
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === "orders"
                ? "bg-brand-emerald text-white"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <ClipboardList size={15} /> Incoming Orders ({orders.length})
          </button>
        </div>
      )}

      {/* Tab: Store Products */}
      {activeTab === "products" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Available Products</span>
              <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs text-slate-600 dark:text-slate-300">
                {products.length}
              </span>
            </h2>
          </div>

          {products.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <div className="rounded-full bg-slate-100 dark:bg-slate-800 p-4 text-slate-400">
                <Package size={36} />
              </div>
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
                No Products Listed Yet
              </h3>
              <p className="text-xs text-slate-500 max-w-sm">
                This store has not listed any items yet. You can chat directly with the shop owner to inquire about available items!
              </p>
              <Link
                href={`/messages?sellerId=${encodeURIComponent(owner._id || "")}&sellerName=${encodeURIComponent(
                  shop.shopName || owner.fullName
                )}`}
              >
                <Button className="mt-2 bg-brand-emerald text-white hover:bg-[#0d665f] text-xs">
                  <MessageCircle size={14} className="mr-1.5" /> Message Owner
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => {
                const firstImg = product.images?.[0];
                const imgUrl =
                  typeof firstImg === "object"
                    ? firstImg.thumbnailUrl || firstImg.url
                    : typeof firstImg === "string"
                    ? firstImg
                    : "/ebazar.png";

                return (
                  <Card
                    key={product._id}
                    className="group flex flex-col justify-between overflow-hidden p-0 border border-slate-200 dark:border-slate-800 transition duration-200 hover:-translate-y-1 hover:shadow-md"
                  >
                    <div>
                      {/* Product Thumbnail */}
                      <Link href={`/marketplace/${product._id}`} className="block relative aspect-square w-full bg-slate-900 overflow-hidden">
                        {imgUrl.startsWith("data:") ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={imgUrl}
                            alt={product.title}
                            className="h-full w-full object-contain p-3 transition duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <Image
                            src={imgUrl}
                            alt={product.title}
                            fill
                            quality={90}
                            unoptimized={imgUrl.includes("cloudinary.com") || imgUrl.startsWith("data:")}
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                            className="object-contain p-3 transition duration-300 group-hover:scale-105"
                          />
                        )}

                        {/* Condition Badge */}
                        <span className="absolute top-2.5 left-2.5 rounded-md bg-black/60 backdrop-blur-sm px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                          {product.condition}
                        </span>

                        {Number(product.discount) > 0 && (
                          <span className="absolute top-2.5 right-2.5 rounded-md bg-rose-600 px-2 py-0.5 text-[10px] font-extrabold text-white">
                            {product.discount}% OFF
                          </span>
                        )}
                      </Link>

                      {/* Product Content */}
                      <div className="p-4 space-y-2">
                        <Link href={`/marketplace/${product._id}`} className="block">
                          <h3 className="font-semibold text-sm line-clamp-2 text-slate-900 dark:text-white group-hover:text-brand-emerald transition">
                            {product.title}
                          </h3>
                        </Link>

                        <div className="flex items-baseline gap-2">
                          <span className="font-display text-lg font-bold text-brand-emerald">
                            ৳{Number(product.price).toLocaleString()}
                          </span>
                          {product.originalPrice && Number(product.originalPrice) > Number(product.price) && (
                            <span className="text-xs text-slate-400 line-through">
                              ৳{Number(product.originalPrice).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Action: Add to Cart only */}
                    <div className="p-4 pt-0">
                      <Button
                        onClick={() => handleAddToCart(product)}
                        className="w-full bg-brand-emerald text-white hover:bg-[#0d665f] text-xs py-2.5 h-auto font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all hover:scale-[1.01]"
                      >
                        <Plus size={15} /> Add to Cart
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Store Owner Incoming Orders Management */}
      {isOwner && activeTab === "orders" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Student Orders Received
            </h2>
            <span className="text-xs text-slate-500">
              Fulfill orders manually on campus and collect cash upon handover.
            </span>
          </div>

          {loadingOrders ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 size={24} className="animate-spin text-brand-emerald mr-2" />
              <span className="text-xs">Loading incoming orders...</span>
            </div>
          ) : orders.length === 0 ? (
            <Card className="py-12 text-center text-slate-400 space-y-2">
              <ClipboardList size={32} className="mx-auto text-slate-400" />
              <p className="text-sm font-semibold">No orders placed yet.</p>
              <p className="text-xs text-slate-500">When students order items from your store, they will appear here with delivery details.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <Card key={order._id} className="p-4 space-y-3 border border-slate-200 dark:border-slate-800">
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {order.product?.title}
                        </span>
                        <span className="text-xs text-slate-500">
                          (Qty: {order.quantity})
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                            order.status === "completed"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : order.status === "confirmed"
                              ? "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300"
                              : order.status === "cancelled"
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <p className="font-display text-sm font-bold text-brand-emerald mt-0.5">
                        Amount to collect: ৳{order.totalPrice?.toLocaleString()} (Cash on Delivery)
                      </p>
                    </div>

                    {/* Status Actions */}
                    <div className="flex items-center gap-1.5">
                      {order.status === "pending" && (
                        <Button
                          onClick={() => handleUpdateOrderStatus(order._id, "confirmed")}
                          className="bg-sky-600 hover:bg-sky-700 text-white text-xs py-1.5 px-3 h-auto"
                        >
                          <Check size={13} className="mr-1" /> Confirm Order
                        </Button>
                      )}
                      {(order.status === "pending" || order.status === "confirmed") && (
                        <Button
                          onClick={() => handleUpdateOrderStatus(order._id, "completed")}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-1.5 px-3 h-auto"
                        >
                          <Truck size={13} className="mr-1" /> Mark Delivered
                        </Button>
                      )}
                      {order.status === "pending" && (
                        <Button
                          variant="ghost"
                          onClick={() => handleUpdateOrderStatus(order._id, "cancelled")}
                          className="text-rose-600 hover:bg-rose-50 text-xs py-1.5 px-2.5 h-auto"
                        >
                          <XCircle size={13} className="mr-1" /> Cancel
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Buyer & Delivery Info */}
                  <div className="grid gap-2 sm:grid-cols-2 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-brand-emerald shrink-0" />
                      <span>Delivery: <strong>{order.meetupLocation}</strong></span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-brand-emerald shrink-0" />
                      <span>Buyer: <strong>{order.buyer?.fullName}</strong> ({order.buyer?.contactNumber || "No phone"})</span>
                    </div>

                    {order.buyerNotes && (
                      <div className="sm:col-span-2 text-slate-500 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                        <strong>Student Note:</strong> {order.buyerNotes}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
