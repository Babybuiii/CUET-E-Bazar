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
  updateGiveawayLocally: (giveaway: Giveaway) => void;
}

export function useGiveaways(filters: GiveawayFilters = {}): UseGiveawaysReturn {
  const [giveaways, setGiveaways] = useState<Giveaway[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const removeGiveaway = useCallback((id: string) => {
    setGiveaways(prev => prev.filter(g => g._id !== id));
  }, []);

  const updateGiveawayLocally = useCallback((updated: Giveaway) => {
    setGiveaways(prev => prev.map(g => (g._id === updated._id ? { ...g, ...updated } : g)));
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

  return { giveaways, loading, error, refetch: fetchGiveaways, removeGiveaway, updateGiveawayLocally };
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

// ── Claim a giveaway (FCFS) ──────────────────────────────────────────────────
export async function claimGiveaway(id: string): Promise<{ success: boolean; message: string; giveaway?: Giveaway; conversationId?: string }> {
  try {
    const token = getAuthToken();
    if (!token) return { success: false, message: "You must be logged in to claim a giveaway." };

    const res = await fetch(`${API_BASE_URL}/api/giveaways/${id}/claim`, {
      method:  "POST",
      headers: {
        Authorization:  `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      if (res.status === 401) return { success: false, message: "Session expired. Please log in again." };
      return { success: false, message: data?.message || "Failed to claim giveaway." };
    }

    return {
      success:        true,
      message:        data?.message || "Item claimed successfully!",
      giveaway:       data?.giveaway,
      conversationId: data?.conversationId
    };
  } catch (err: any) {
    return { success: false, message: err?.message || "Network error. Please try again." };
  }
}

// ── Fetch claimed giveaways for logged-in user ──────────────────────────────
export async function fetchMyClaims(): Promise<{ success: boolean; giveaways: Giveaway[]; message?: string }> {
  try {
    const token = getAuthToken();
    if (!token) return { success: false, giveaways: [], message: "Authentication required." };

    const res = await fetch(`${API_BASE_URL}/api/giveaways/my-claims`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      return { success: false, giveaways: [], message: data?.message || "Failed to load claimed items." };
    }

    return {
      success:   true,
      giveaways: data.giveaways || data.claims || []
    };
  } catch (err: any) {
    return { success: false, giveaways: [], message: err?.message || "Network error." };
  }
}

// ── Open or initiate conversation between donor & claimant ───────────────────
export async function initiateContact(id: string): Promise<{ success: boolean; message: string; conversationId?: string }> {
  try {
    const token = getAuthToken();
    if (!token) return { success: false, message: "You must be logged in to send messages." };

    const res = await fetch(`${API_BASE_URL}/api/giveaways/${id}/contact`, {
      method:  "POST",
      headers: {
        Authorization:  `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      if (res.status === 401) return { success: false, message: "Session expired. Please log in again." };
      return { success: false, message: data?.message || "Failed to open conversation." };
    }

    return {
      success:        true,
      message:        data?.message || "Conversation opened.",
      conversationId: data?.conversationId
    };
  } catch (err: any) {
    return { success: false, message: err?.message || "Network error. Please try again." };
  }
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

// ── Unclaim a giveaway (claimant releases claim, or donor/admin returns to available) ──
export async function unclaimGiveaway(id: string): Promise<{ success: boolean; message: string; giveaway?: Giveaway }> {
  try {
    const token = getAuthToken();
    if (!token) return { success: false, message: "Authentication required." };

    const res = await fetch(`${API_BASE_URL}/api/giveaways/${id}/unclaim`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { success: false, message: data?.message || "Failed to unclaim giveaway." };
    }

    return {
      success: true,
      message: data?.message || "Unclaimed successfully.",
      giveaway: data?.giveaway
    };
  } catch (err: any) {
    return { success: false, message: err?.message || "Network error. Please try again." };
  }
}

// ── Donor marks giveaway as given away ──
export async function markGivenAway(id: string): Promise<{ success: boolean; message: string; giveaway?: Giveaway }> {
  try {
    const token = getAuthToken();
    if (!token) return { success: false, message: "Authentication required." };

    const res = await fetch(`${API_BASE_URL}/api/giveaways/${id}/mark-given-away`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { success: false, message: data?.message || "Failed to update giveaway status." };
    }

    return {
      success: true,
      message: data?.message || "Marked as given away successfully.",
      giveaway: data?.giveaway
    };
  } catch (err: any) {
    return { success: false, message: err?.message || "Network error. Please try again." };
  }
}

// ── Fetch giveaways posted by current user (donor) ──
export async function fetchMyGiveaways(): Promise<{ success: boolean; giveaways: Giveaway[]; message?: string }> {
  try {
    const token = getAuthToken();
    if (!token) return { success: false, giveaways: [], message: "Authentication required." };

    const res = await fetch(`${API_BASE_URL}/api/giveaways/my-giveaways`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      return { success: false, giveaways: [], message: data?.message || "Failed to load your giveaways." };
    }

    return {
      success: true,
      giveaways: data.giveaways || []
    };
  } catch (err: any) {
    return { success: false, giveaways: [], message: err?.message || "Network error." };
  }
}

