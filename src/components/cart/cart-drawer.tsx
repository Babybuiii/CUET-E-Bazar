"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  X,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  MapPin,
  Phone,
  FileText,
  Building2,
  CheckCircle2,
  ArrowRight,
  Loader2,
  ShieldCheck,
  LogIn
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/api";
import { getAuthToken, useAuth } from "@/lib/auth";
import {
  fetchCart,
  updateCartItemQuantity,
  removeCartItem,
  clearCart,
  CartState,
  CartItem
} from "@/lib/cart";

const CUET_HALLS = [
  "Dr. Q.K. Hall",
  "Shahid Tareq Huda Hall",
  "Shaheed Mohammad Shah Hall",
  "Zia Hall",
  "Bangabandhu Hall",
  "Pritilata Hall",
  "Sufia Kamal Hall",
  "Campus Staff Quarter",
  "CUET Central Cafeteria Area",
  "CUET Library / Academic Area",
  "Other Campus Location"
];

export function CartDrawer({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { isLoggedIn, user } = useAuth();
  const [cart, setCart] = useState<CartState>({ items: [], totalItems: 0, subtotal: 0 });
  const [loading, setLoading] = useState(false);
  const [isCheckoutView, setIsCheckoutView] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [placedOrderCount, setPlacedOrderCount] = useState(0);

  // Delivery Form fields
  const [hall, setHall] = useState(user?.hall || CUET_HALLS[0]);
  const [room, setRoom] = useState("");
  const [contactNumber, setContactNumber] = useState(user?.contactNumber || "");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");

  const refreshCart = async () => {
    setLoading(true);
    const state = await fetchCart();
    setCart(state);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      refreshCart();
      setIsCheckoutView(false);
      setOrderPlaced(false);
      setFormError("");
      if (user?.hall) setHall(user.hall);
      if (user?.contactNumber) setContactNumber(user.contactNumber);
    }
  }, [isOpen, user]);

  useEffect(() => {
    const handleCartUpdate = () => {
      refreshCart();
    };
    window.addEventListener("cart-updated", handleCartUpdate);
    return () => window.removeEventListener("cart-updated", handleCartUpdate);
  }, []);

  if (!isOpen) return null;

  const handleUpdateQty = async (itemId: string, newQty: number) => {
    await updateCartItemQuantity(itemId, newQty);
    refreshCart();
  };

  const handleRemove = async (itemId: string) => {
    await removeCartItem(itemId);
    refreshCart();
  };

  const handleProceedToCheckout = () => {
    if (!isLoggedIn) {
      setFormError("Please log in to your CUET account to place an order.");
      return;
    }
    setIsCheckoutView(true);
    setFormError("");
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!hall || !room.trim() || !contactNumber.trim()) {
      setFormError("Please provide your Hall, Room number, and Contact Phone number.");
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setFormError("Please log in to place an order.");
      return;
    }

    try {
      setSubmittingOrder(true);
      const res = await fetch(`${API_BASE_URL}/api/orders/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          hall,
          room: room.trim(),
          contactNumber: contactNumber.trim(),
          notes: notes.trim()
        })
      });

      const data = await res.json();
      if (data.success) {
        setPlacedOrderCount(data.orders?.length || cart.items.length);
        setOrderPlaced(true);
        setIsCheckoutView(false);
        await clearCart();
        refreshCart();
      } else {
        setFormError(data.message || "Failed to place order.");
      }
    } catch {
      setFormError("Network error. Please make sure the server is reachable.");
    } finally {
      setSubmittingOrder(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col">
          {/* Drawer Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="text-brand-emerald" size={20} />
              <h2 className="font-display font-bold text-lg text-slate-900 dark:text-white">
                {orderPlaced
                  ? "Order Confirmed!"
                  : isCheckoutView
                  ? "Delivery Location"
                  : `Your Cart (${cart.totalItems})`}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 transition"
              aria-label="Close cart"
            >
              <X size={20} />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-5">
            {orderPlaced ? (
              /* Success Screen */
              <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
                <div className="rounded-full bg-emerald-100 p-4 text-brand-emerald dark:bg-emerald-950/60">
                  <CheckCircle2 size={48} />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Order Successfully Placed!
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 max-w-xs">
                  {placedOrderCount} item(s) ordered. The campus shop owner has been notified with your delivery location details and will contact you for handover.
                </p>

                <div className="w-full rounded-2xl bg-amber-50 dark:bg-amber-950/40 p-4 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 text-left space-y-1.5">
                  <p className="font-bold flex items-center gap-1.5">
                    <ShieldCheck size={16} className="text-amber-600 shrink-0" />
                    Manual Cash on Delivery / Handover
                  </p>
                  <p>
                    No payment was deducted. Please pay cash or mobile banking directly to the seller when you receive your order at {hall}, Room {room}.
                  </p>
                </div>

                <div className="pt-4 w-full flex flex-col gap-2">
                  <Button
                    onClick={onClose}
                    className="w-full bg-brand-emerald text-white hover:bg-[#0d665f] py-3 font-semibold"
                  >
                    Continue Shopping
                  </Button>
                </div>
              </div>
            ) : isCheckoutView ? (
              /* Checkout / Delivery Location Form */
              <form onSubmit={handlePlaceOrder} className="space-y-4">
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3.5 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                  <div className="flex justify-between font-semibold text-slate-800 dark:text-slate-200">
                    <span>Subtotal ({cart.totalItems} items):</span>
                    <span className="text-brand-emerald font-bold">৳{cart.subtotal.toLocaleString()}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Pay upon arrival. Enter your exact CUET campus delivery location below.
                  </p>
                </div>

                {formError && (
                  <div className="rounded-xl bg-rose-50 dark:bg-rose-950/50 p-3 text-xs font-semibold text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                    {formError}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Building2 size={14} className="text-brand-emerald" />
                    CUET Hall / Campus Area *
                  </label>
                  <select
                    value={hall}
                    onChange={(e) => setHall(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-brand-emerald"
                  >
                    {CUET_HALLS.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <MapPin size={14} className="text-brand-emerald" />
                    Room / Spot Details *
                  </label>
                  <input
                    type="text"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    placeholder="e.g. Room 314, Block B or Main Gate"
                    required
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-brand-emerald"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Phone size={14} className="text-brand-emerald" />
                    Contact Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    required
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-brand-emerald"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <FileText size={14} className="text-brand-emerald" />
                    Special Instructions / Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Please deliver after 5:00 PM or call when near the hall gate."
                    rows={2}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-brand-emerald resize-none"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsCheckoutView(false)}
                    className="flex-1 border border-slate-200 dark:border-slate-700 py-3"
                  >
                    Back to Items
                  </Button>
                  <Button
                    type="submit"
                    disabled={submittingOrder}
                    className="flex-[2] bg-brand-emerald text-white hover:bg-[#0d665f] py-3 font-semibold"
                  >
                    {submittingOrder ? (
                      <>
                        <Loader2 size={16} className="animate-spin mr-2" />
                        Placing Order...
                      </>
                    ) : (
                      "Confirm Order (COD)"
                    )}
                  </Button>
                </div>
              </form>
            ) : cart.items.length === 0 ? (
              /* Empty Cart */
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 text-slate-400">
                <div className="rounded-full bg-slate-100 dark:bg-slate-800 p-4">
                  <ShoppingBag size={36} className="text-slate-400" />
                </div>
                <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">
                  Your cart is empty
                </h3>
                <p className="text-xs text-slate-500 max-w-xs">
                  Browse campus shops or products and click &ldquo;Add to Cart&rdquo; to start shopping!
                </p>
                <Link href="/shops" onClick={onClose}>
                  <Button className="mt-2 bg-brand-emerald text-white hover:bg-[#0d665f] text-xs font-semibold">
                    Explore Campus Shops
                  </Button>
                </Link>
              </div>
            ) : (
              /* Cart Items List */
              <div className="space-y-3">
                {formError && (
                  <div className="rounded-xl bg-rose-50 dark:bg-rose-950/50 p-3 text-xs font-semibold text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900 flex items-center justify-between">
                    <span>{formError}</span>
                    <Link href="/login" onClick={onClose} className="underline text-brand-emerald ml-2">
                      Log In
                    </Link>
                  </div>
                )}

                {cart.items.map((item) => {
                  const p = item.product;
                  const firstImg = p?.images?.[0];
                  const imgUrl =
                    typeof firstImg === "object"
                      ? firstImg.thumbnailUrl || firstImg.url
                      : typeof firstImg === "string"
                      ? firstImg
                      : "/ebazar.png";

                  return (
                    <div
                      key={item._id || p?._id}
                      className="flex gap-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-3"
                    >
                      {/* Thumbnail */}
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center">
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
                      <div className="flex flex-1 flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-1">
                            <Link
                              href={`/marketplace/${p?._id}`}
                              onClick={onClose}
                              className="font-semibold text-sm line-clamp-1 hover:text-brand-emerald text-slate-900 dark:text-white"
                            >
                              {p?.title}
                            </Link>
                            <button
                              onClick={() => handleRemove(item._id || "")}
                              className="text-slate-400 hover:text-rose-500 transition p-0.5"
                              title="Remove item"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>

                          {p?.shop && (
                            <p className="text-[11px] text-brand-emerald font-medium">
                              🏪 {p.shop.shopName}
                            </p>
                          )}

                          <p className="mt-1 font-bold text-sm text-slate-900 dark:text-white">
                            ৳{Number(p?.price || 0).toLocaleString()}
                          </p>
                        </div>

                        {/* Quantity controls */}
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                            <button
                              onClick={() => handleUpdateQty(item._id || "", item.quantity - 1)}
                              className="px-2 py-1 text-slate-500 hover:text-slate-800 dark:hover:text-white transition"
                              aria-label="Decrease quantity"
                            >
                              <Minus size={13} />
                            </button>
                            <span className="px-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => handleUpdateQty(item._id || "", item.quantity + 1)}
                              className="px-2 py-1 text-slate-500 hover:text-slate-800 dark:hover:text-white transition"
                              aria-label="Increase quantity"
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Drawer Footer */}
          {!orderPlaced && !isCheckoutView && cart.items.length > 0 && (
            <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">Subtotal</span>
                <span className="font-display text-2xl font-extrabold text-brand-emerald">
                  ৳{cart.subtotal.toLocaleString()}
                </span>
              </div>

              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-2.5 text-[11px] text-emerald-800 dark:text-emerald-300 border border-emerald-500/20 flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                <span>Zero online charges. Pay directly to the shop/seller on delivery.</span>
              </div>

              {isLoggedIn ? (
                <Button
                  onClick={handleProceedToCheckout}
                  className="w-full bg-brand-emerald text-white hover:bg-[#0d665f] py-3.5 font-bold shadow-sm flex items-center justify-center gap-2"
                >
                  Enter Delivery Location <ArrowRight size={16} />
                </Button>
              ) : (
                <Link href="/login" onClick={onClose} className="block">
                  <Button className="w-full bg-[#febd69] text-[#0f1111] hover:bg-[#f3a847] py-3.5 font-bold flex items-center justify-center gap-2">
                    <LogIn size={16} /> Sign In to Order
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
