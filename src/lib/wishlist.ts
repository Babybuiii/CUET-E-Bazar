"use client";

import { API_BASE_URL } from "@/lib/api";

const STORAGE_KEY = "cuet_ebazar_wishlist_ids";

export function getLocalWishlistIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalWishlistIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    window.dispatchEvent(new CustomEvent("wishlist-updated", { detail: { ids } }));
  } catch (err) {
    console.error("Failed to write wishlist to localStorage:", err);
  }
}

export function isWishlistedLocally(productId: string): boolean {
  if (!productId) return false;
  const ids = getLocalWishlistIds();
  return ids.includes(productId);
}

/**
 * Toggles a product in the user's wishlist.
 * Instant local update + event broadcast + background server sync.
 */
export async function toggleWishlist(productId: string): Promise<boolean> {
  if (!productId) return false;

  const currentIds = getLocalWishlistIds();
  const exists = currentIds.includes(productId);
  const updatedIds = exists
    ? currentIds.filter((id) => id !== productId)
    : [productId, ...currentIds];

  // 1. Immediate optimistic update
  saveLocalWishlistIds(updatedIds);

  // 2. Server sync if authenticated
  const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
  if (token) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/products/${productId}/wishlist`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success && typeof data.isWishlisted === "boolean") {
        const latestIds = getLocalWishlistIds();
        const finalIds = data.isWishlisted
          ? Array.from(new Set([productId, ...latestIds]))
          : latestIds.filter((id) => id !== productId);
        saveLocalWishlistIds(finalIds);
        return data.isWishlisted;
      }
    } catch (err) {
      console.warn("Server wishlist sync warning:", err);
    }
  }

  return !exists;
}

/**
 * Fetches wishlisted products, combining backend data with local storage fallbacks.
 */
export async function fetchWishlistProducts(): Promise<any[]> {
  const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;

  // If logged in, fetch from backend
  if (token) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/products/user/wishlist`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.products)) {
        // Sync local IDs with backend products
        const backendIds = data.products.map((p: any) => p._id || p.id).filter(Boolean);
        saveLocalWishlistIds(backendIds);
        return data.products;
      }
    } catch (err) {
      console.warn("Failed to fetch backend wishlist, falling back to local IDs:", err);
    }
  }

  // Fallback / guest mode: fetch all products and filter by local IDs
  const localIds = getLocalWishlistIds();
  if (localIds.length === 0) return [];

  try {
    const res = await fetch(`${API_BASE_URL}/api/products?limit=100`);
    const data = await res.json();
    if (data.success && Array.isArray(data.products)) {
      return data.products.filter((p: any) => localIds.includes(p._id || p.id));
    }
  } catch (err) {
    console.error("Failed to load products for local wishlist fallback:", err);
  }

  return [];
}
