"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gift,
  Search,
  MapPin,
  Plus,
  Loader2,
  AlertCircle,
  PackageOpen,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GiveawayCard } from "@/components/giveaways/GiveawayCard";
import { OfferGiveawayModal } from "@/components/giveaways/OfferGiveawayModal";
import { ClaimConfirmationModal } from "@/components/giveaways/ClaimConfirmationModal";
import { UnpublishConfirmationModal } from "@/components/giveaways/UnpublishConfirmationModal";
import { useGiveaways } from "@/hooks/useGiveaways";
import { useAuth } from "@/lib/auth";
import {
  GIVEAWAY_CATEGORIES,
  GIVEAWAY_LOCATIONS,
  type GiveawayCategory,
  type GiveawayLocation,
  type Giveaway
} from "@/types/giveaway";

export default function GiveawaysPage() {
  const { user, isLoggedIn } = useAuth();

  // ── Filter state ──────────────────────────────────────────────────────────
  const [search,          setSearch]          = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category,        setCategory]        = useState<GiveawayCategory | "All">("All");
  const [location,        setLocation]        = useState<GiveawayLocation | "All">("All");
  const [hideClaimed,     setHideClaimed]     = useState(false);

  // Simple debounce using useRef-style timer
  const timerRef = { current: null as ReturnType<typeof setTimeout> | null };
  function handleSearchChange(value: string) {
    setSearch(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedSearch(value), 350);
  }

  // ── Data ─────────────────────────────────────────────────────────────────
  const { giveaways, loading, error, refetch, removeGiveaway } = useGiveaways({
    category:    category    === "All" ? undefined : category,
    location:    location    === "All" ? undefined : location,
    search:      debouncedSearch,
    hideClaimed
  });

  // ── Modal state ───────────────────────────────────────────────────────────
  const [offerOpen,      setOfferOpen]      = useState(false);
  const [claimItem,      setClaimItem]      = useState<Giveaway | null>(null);
  const [claimOpen,      setClaimOpen]      = useState(false);
  const [unpublishItem,  setUnpublishItem]  = useState<Giveaway | null>(null);
  const [unpublishOpen,  setUnpublishOpen]  = useState(false);
  const [toastMessage,   setToastMessage]   = useState<string | null>(null);

  function openClaimModal(giveaway: Giveaway) {
    if (!isLoggedIn) {
      alert("Please log in to claim a giveaway.");
      return;
    }
    setClaimItem(giveaway);
    setClaimOpen(true);
  }

  function openUnpublishModal(giveaway: Giveaway) {
    setUnpublishItem(giveaway);
    setUnpublishOpen(true);
  }

  function handleUnpublishSuccess(giveawayId: string) {
    removeGiveaway(giveawayId);
    refetch();
    setToastMessage("Giveaway unpublished successfully.");
    setTimeout(() => setToastMessage(null), 3500);
  }

  // ── Category chip helper ──────────────────────────────────────────────────
  function chipClass(active: boolean) {
    return `rounded-full px-3 py-1.5 text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
      active
        ? "bg-[#0f766e] text-white shadow-sm"
        : "bg-white border border-slate-200 text-slate-600 hover:border-[#0f766e] hover:text-[#0f766e]"
    }`;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                Giveaways 🎁
              </h1>
              <p className="mt-1 max-w-xl text-sm text-slate-500">
                Find something useful. Give something back. Everything is 100% free for the CUET community.
              </p>
            </div>

            {isLoggedIn && (
              <Button
                onClick={() => setOfferOpen(true)}
                className="shrink-0 flex items-center gap-2 rounded-full px-5"
              >
                <Plus size={16} />
                Offer a Giveaway
              </Button>
            )}
          </div>

          {/* ── Controls row ─────────────────────────────────────────────── */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative min-w-[200px] flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => handleSearchChange(e.target.value)}
                placeholder="Search giveaways…"
                className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm focus:border-[#0f766e] focus:outline-none focus:ring-2 focus:ring-[#0f766e]/20 transition"
              />
            </div>

            {/* Location */}
            <div className="flex items-center gap-1.5">
              <MapPin size={14} className="shrink-0 text-slate-400" />
              <select
                value={location}
                onChange={e => setLocation(e.target.value as GiveawayLocation | "All")}
                className="rounded-full border border-slate-200 bg-white px-3.5 py-2.5 text-sm focus:border-[#0f766e] focus:outline-none transition"
              >
                <option value="All">All Locations</option>
                {GIVEAWAY_LOCATIONS.map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            {/* Hide Claimed toggle */}
            <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm text-slate-600 select-none">
              <div
                role="switch"
                aria-checked={hideClaimed}
                onClick={() => setHideClaimed(p => !p)}
                className={`relative h-5 w-9 rounded-full transition-colors ${hideClaimed ? "bg-[#0f766e]" : "bg-slate-200"}`}
              >
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${hideClaimed ? "translate-x-4" : "translate-x-0.5"}`} />
              </div>
              <span className="font-medium">Hide Claimed</span>
            </label>
          </div>

          {/* ── Category chips ─────────────────────────────────────────────── */}
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => setCategory("All")} className={chipClass(category === "All")}>
              All
            </button>
            {GIVEAWAY_CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)} className={chipClass(category === c)}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* ── Loading ──────────────────────────────────────────────────────── */}
        {loading && (
          <div className="flex items-center justify-center py-24 text-slate-400">
            <Loader2 size={32} className="animate-spin" />
          </div>
        )}

        {/* ── Error ────────────────────────────────────────────────────────── */}
        {error && !loading && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <AlertCircle size={40} className="text-red-400" />
            <p className="text-sm font-medium text-slate-700">{error}</p>
            <Button variant="ghost" onClick={refetch} className="text-sm">Try Again</Button>
          </div>
        )}

        {/* ── Empty state ───────────────────────────────────────────────────── */}
        {!loading && !error && giveaways.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-24 text-center">
            <PackageOpen size={48} className="text-slate-300" />
            <p className="text-base font-semibold text-slate-700">No giveaways found</p>
            <p className="text-sm text-slate-400">
              {debouncedSearch || category !== "All" || location !== "All"
                ? "Try adjusting your filters."
                : "Be the first to offer something to your campus community!"}
            </p>
            {isLoggedIn && (
              <Button onClick={() => setOfferOpen(true)} className="mt-2 rounded-full px-6">
                <Plus size={15} className="mr-1.5" /> Offer a Giveaway
              </Button>
            )}
          </div>
        )}

        {/* ── Giveaway grid ─────────────────────────────────────────────────── */}
        {!loading && !error && giveaways.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <AnimatePresence>
              {giveaways.map((g, i) => (
                <motion.div
                  key={g._id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0  }}
                  exit={{   opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.03, duration: 0.25 }}
                >
                  <GiveawayCard
                    giveaway={g}
                    currentUserId={(user as any)?._id || (user as any)?.id}
                    onClaim={openClaimModal}
                    onUnpublish={openUnpublishModal}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      <OfferGiveawayModal
        isOpen={offerOpen}
        onClose={() => setOfferOpen(false)}
        onSuccess={refetch}
      />

      <ClaimConfirmationModal
        giveaway={claimItem}
        isOpen={claimOpen}
        onClose={() => { setClaimOpen(false); setClaimItem(null); }}
        onSuccess={refetch}
      />

      <UnpublishConfirmationModal
        giveaway={unpublishItem}
        isOpen={unpublishOpen}
        onClose={() => { setUnpublishOpen(false); setUnpublishItem(null); }}
        onSuccess={handleUnpublishSuccess}
      />

      {/* ── Feedback Toast Alert ────────────────────────────────────────────── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-3 shadow-2xl text-sm font-medium border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
