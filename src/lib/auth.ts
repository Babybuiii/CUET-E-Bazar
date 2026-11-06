"use client";

import { useState, useEffect } from "react";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("cuet_ebazar_token");
}

import { clearLocalWishlist } from "@/lib/wishlist";

export function clearAuthSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("cuet_ebazar_token");
    localStorage.removeItem("cuet_ebazar_user");
    clearLocalWishlist();
    window.dispatchEvent(new Event("auth-changed"));
  } catch {
    // Ignore if localStorage unavailable
  }
}

export function useAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const syncAuth = () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_token") : null;
      const userStr = typeof window !== "undefined" ? localStorage.getItem("cuet_ebazar_user") : null;
      setIsLoggedIn(Boolean(token));
      if (userStr) {
        try {
          setUser(JSON.parse(userStr));
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    syncAuth();

    window.addEventListener("auth-changed", syncAuth);
    window.addEventListener("storage", syncAuth);

    return () => {
      window.removeEventListener("auth-changed", syncAuth);
      window.removeEventListener("storage", syncAuth);
    };
  }, []);

  const logout = () => {
    clearAuthSession();
    setIsLoggedIn(false);
    setUser(null);
  };

  return { isLoggedIn, user, loading, logout };
}
