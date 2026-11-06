"use client";

import { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import type { Giveaway, GiveawayCategory, GiveawayLocation } from "@/types/giveaway";

interface GiveawayFilters {
  category?: GiveawayCategory | "All";
  location?: GiveawayLocation | "All";
  search?: string;
  hideClaimed?: boolean;
}

interface UseGiveawaysReturn {
  giveaways: Giveaway[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  removeGiveaway: (id: string) => void;
}

export function useGiveaways(filters: GiveawayFilters = {}): UseGiveawaysReturn {
  const [giveaways, setGiveaways] = useState<Giveaway[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const removeGiveaway = useCallback((id: string) => {
    setGiveaways(prev => prev.filter(g => g._id !== id));
  }, []);

  const fetchGiveaways = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.category && filters.category !== "All") params.set("category", filters.category);
      if (filters.location && filters.location !== "All") params.set("location", filters.location);
      if (filters.search?.trim()) params.set("search", filters.search.trim());
      if (filters.hideClaimed) params.set("hideClaimed", "true");

      const res  = await fetch(`${API_BASE_URL}/api/giveaways?${params.toString()}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to load giveaways.");
      setGiveaways(data.giveaways || []);
    } catch (err: any) {
      setError(err.message || "Network error.");
    } finally {
      setLoading(false);
    }
  }, [filters.category, filters.location, filters.search, filters.hideClaimed]);

  useEffect(() => {
    fetchGiveaways();
    // Poll every 15 seconds so status updates are reflected without full reload
    const intervalId = setInterval(fetchGiveaways, 15_000);
    return () => clearInterval(intervalId);
  }, [fetchGiveaways]);

  return { giveaways, loading, error, refetch: fetchGiveaways, removeGiveaway };
}

// ── Single giveaway fetcher ───────────────────────────────────────────────────
export async function fetchGiveawayById(id: string): Promise<Giveaway | null> {
  try {
    const token = getAuthToken();
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
    const res  = await fetch(`${API_BASE_URL}/api/giveaways/${id}`, { headers });
    const data = await res.json();
    return data.success ? data.giveaway : null;
  } catch {
    return null;
  }
}

// ── Create a giveaway ─────────────────────────────────────────────────────────
export async function createGiveaway(formData: FormData): Promise<{ success: boolean; message: string; giveaway?: Giveaway }> {
  const token = getAuthToken();
  if (!token) return { success: false, message: "You must be logged in." };

  try {
    const res = await fetch(`${API_BASE_URL}/api/giveaways`, {
      method:  "POST",
      headers: { Authorization: `Bearer ${token}` },
      body:    formData
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, message: err?.message || "Failed to communicate with server." };
  }
}

// ── Claim a giveaway ──────────────────────────────────────────────────────────
export async function claimGiveaway(id: string): Promise<{ success: boolean; message: string; claimBufferEndsAt?: string; status?: string }> {
  const token = getAuthToken();
  if (!token) return { success: false, message: "You must be logged in." };

  const res  = await fetch(`${API_BASE_URL}/api/giveaways/${id}/claim`, {
    method:  "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
  });
  return res.json();
}

// ── Initiate contact with donor ───────────────────────────────────────────────
export async function initiateContact(id: string): Promise<{ success: boolean; message: string; conversationId?: string }> {
  const token = getAuthToken();
  if (!token) return { success: false, message: "You must be logged in." };

  const res  = await fetch(`${API_BASE_URL}/api/giveaways/${id}/contact`, {
    method:  "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
  });
  return res.json();
}

// ── Cancel / Unpublish a giveaway ───────────────────────────────────────────
export async function cancelGiveaway(id: string): Promise<{ success: boolean; message: string }> {
  try {
    const token = getAuthToken();
    if (!token) return { success: false, message: "Authentication required. Please log in again." };

    const res = await fetch(`${API_BASE_URL}/api/giveaways/${id}`, {
      method:  "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      if (res.status === 401) {
        return { success: false, message: "Session expired. Please log in again." };
      }
      if (res.status === 403) {
        return { success: false, message: data?.message || "Only the original donor can unpublish this giveaway." };
      }
      return { success: false, message: data?.message || "Failed to unpublish giveaway." };
    }

    return { success: true, message: data?.message || "Giveaway unpublished successfully." };
  } catch (err: any) {
    return { success: false, message: err?.message || "Network error. Please try again." };
  }
}

