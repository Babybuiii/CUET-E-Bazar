"use client";

import { API_BASE_URL } from "./api";
import { getAuthToken } from "./auth";

export type CartItem = {
  _id?: string;
  product: {
    _id: string;
    title: string;
    price: number;
    originalPrice?: number;
    discount?: number;
    images?: Array<{ url: string; thumbnailUrl?: string } | string>;
    condition?: string;
    location?: string;
    shop?: {
      _id: string;
      shopName: string;
      slug?: string;
      location?: string;
    } | null;
  };
  shop?: {
    _id: string;
    shopName: string;
    slug?: string;
    location?: string;
  } | null;
  quantity: number;
};

export type CartState = {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
};

const LOCAL_CART_KEY = "cuet_ebazar_local_cart";

function getLocalCart(): CartState {
  if (typeof window === "undefined") return { items: [], totalItems: 0, subtotal: 0 };
  try {
    const raw = localStorage.getItem(LOCAL_CART_KEY);
    if (!raw) return { items: [], totalItems: 0, subtotal: 0 };
    const items: CartItem[] = JSON.parse(raw);
    const valid = Array.isArray(items) ? items : [];
    let totalItems = 0;
    let subtotal = 0;
    valid.forEach((i) => {
      const q = Number(i.quantity) || 1;
      const p = Number(i.product?.price) || 0;
      totalItems += q;
      subtotal += p * q;
    });
    return { items: valid, totalItems, subtotal };
  } catch {
    return { items: [], totalItems: 0, subtotal: 0 };
  }
}

function saveLocalCart(items: CartItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event("cart-updated"));
  } catch {
    // Ignore error
  }
}

export async function fetchCart(): Promise<CartState> {
  const token = getAuthToken();
  if (!token) {
    return getLocalCart();
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/cart`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success && data.cart) {
      return data.cart;
    }
  } catch (err) {
    console.error("Fetch cart error:", err);
  }

  return getLocalCart();
}

export async function addToCart(product: any, quantity: number = 1): Promise<{ success: boolean; message: string }> {
  // Add to cart is restricted exclusively to campus shop products
  const isShopProduct = Boolean(product?.shop || product?.sellerType === "shop");
  if (!isShopProduct) {
    return {
      success: false,
      message: "Add to cart is only available for campus shop products. Individual seller items are arranged via direct chat."
    };
  }

  const token = getAuthToken();
  const productId = product._id || product.id;

  if (token) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/cart/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ productId, quantity })
      });
      const data = await res.json();
      if (data.success) {
        window.dispatchEvent(new Event("cart-updated"));
        return { success: true, message: data.message || "Added to cart!" };
      }
      return { success: false, message: data.message || "Failed to add to cart." };
    } catch {
      return { success: false, message: "Network error while adding to cart." };
    }
  }

  // Fallback to local cart for non-logged in users
  const current = getLocalCart();
  const existingIdx = current.items.findIndex(
    (i) => (i.product?._id || (i.product as any)?.id) === productId
  );

  if (existingIdx > -1) {
    current.items[existingIdx].quantity += quantity;
  } else {
    current.items.push({
      _id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      product: {
        _id: productId,
        title: product.title,
        price: Number(product.price) || 0,
        originalPrice: product.originalPrice,
        discount: product.discount,
        images: product.images || (product.image ? [product.image] : []),
        condition: product.condition,
        location: product.location,
        shop: product.shop
      },
      shop: product.shop,
      quantity
    });
  }

  saveLocalCart(current.items);
  return { success: true, message: `${product.title} added to cart!` };
}

export async function updateCartItemQuantity(itemId: string, quantity: number): Promise<boolean> {
  const token = getAuthToken();

  if (token && !itemId.startsWith("local_")) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/cart/item/${itemId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ quantity })
      });
      const data = await res.json();
      if (data.success) {
        window.dispatchEvent(new Event("cart-updated"));
        return true;
      }
    } catch (err) {
      console.error("Update cart error:", err);
    }
    return false;
  }

  const current = getLocalCart();
  const idx = current.items.findIndex((i) => i._id === itemId);
  if (idx > -1) {
    if (quantity <= 0) {
      current.items.splice(idx, 1);
    } else {
      current.items[idx].quantity = quantity;
    }
    saveLocalCart(current.items);
    return true;
  }
  return false;
}

export async function removeCartItem(itemId: string): Promise<boolean> {
  const token = getAuthToken();

  if (token && !itemId.startsWith("local_")) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/cart/item/${itemId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        window.dispatchEvent(new Event("cart-updated"));
        return true;
      }
    } catch (err) {
      console.error("Remove cart item error:", err);
    }
    return false;
  }

  const current = getLocalCart();
  const filtered = current.items.filter((i) => i._id !== itemId);
  saveLocalCart(filtered);
  return true;
}

export async function clearCart(): Promise<boolean> {
  const token = getAuthToken();

  if (token) {
    try {
      await fetch(`${API_BASE_URL}/api/cart/clear`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch {
      // Ignore
    }
  }

  saveLocalCart([]);
  return true;
}
