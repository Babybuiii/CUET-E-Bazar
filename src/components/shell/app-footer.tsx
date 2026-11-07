"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import {
  Mail,
  ChevronUp,
  Facebook,
  Instagram,
  AlertTriangle,
  X
} from "lucide-react";
import { Logo } from "@/components/shared/logo";

type ModalTopic = "about" | "terms" | "privacy" | "billing" | "candidate" | "cookie" | "copyright" | "safety" | "faq" | null;

const MODAL_CONTENT: Record<NonNullable<ModalTopic>, { title: string; subtitle: string; content: React.ReactNode }> = {
  about: {
    title: "About CUET E-Bazar",
    subtitle: "Connecting Chittagong University of Engineering & Technology students for safe, zero-commission commerce.",
    content: (
      <div className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
        <p>
          <strong>CUET E-Bazar</strong> is an exclusive campus marketplace built solely for verified students, faculty, and campus shops of CUET.
        </p>
        <p>
          Our mission is to make semester transitions effortless: juniors can affordably purchase engineering instruments, lab kits, calculators, and bicycles directly from seniors, while graduating students can declutter dorm rooms and pass down notes and books.
        </p>
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 p-3 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300">
          ✓ 100% Free to use • 0% Transaction fees • Peer-to-peer campus handovers
        </div>
      </div>
    )
  },
  terms: {
    title: "Terms & Conditions",
    subtitle: "Rules and conduct for trading on CUET campus.",
    content: (
      <div className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
        <p>
          1. <strong>Student Verification:</strong> All individual sellers must register with valid CUET student credentials.
        </p>
        <p>
          2. <strong>Transparent Listings:</strong> Disclose any defects, scratches, or wear on lab kits, calculators, or bikes honestly. Misleading listings will be removed.
        </p>
        <p>
          3. <strong>Fair Campus Pricing:</strong> Exploitative reselling of student donations or course handouts is strictly prohibited.
        </p>
        <p>
          4. <strong>Safe Handovers:</strong> Always conduct item exchange and payment in person within official campus zones.
        </p>
      </div>
    )
  },
  privacy: {
    title: "Privacy Policy",
    subtitle: "How student data and IDs are protected on CUET E-Bazar.",
    content: (
      <div className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
        <p>
          We take student data privacy seriously. Your student ID and departmental info are used strictly to verify student authenticity and prevent external scammers from entering our marketplace.
        </p>
        <p>
          Your phone number and private contact info are never publicly published unless you choose to share them in personal chat with a verified buyer.
        </p>
      </div>
    )
  },
  billing: {
    title: "Billing & Platform Policy",
    subtitle: "100% Free Campus Marketplace with 0% Commission.",
    content: (
      <div className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
        <p>
          CUET E-Bazar is a non-profit campus initiative. We charge <strong>0% commission</strong> on any item sold, bought, or donated on this platform.
        </p>
        <p>
          Payments are handled directly between the buyer and seller upon physical inspection of the item (Cash on Meetup, bKash, or Nagad). CUET E-Bazar does not hold escrow or charge listing fees for regular student ads.
        </p>
      </div>
    )
  },
  candidate: {
    title: "Candidate Privacy Policy",
    subtitle: "Guidelines for student volunteers, campus shop representatives, and moderators.",
    content: (
      <div className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
        <p>
          All personal credentials and identity information submitted by campus shop applicants and student moderator candidates are stored exclusively for verification and campus security purposes. Under no circumstances is candidate information shared, leased, or transferred to third parties.
        </p>
      </div>
    )
  },
  cookie: {
    title: "Cookie Policy",
    subtitle: "How we store login sessions and preferences.",
    content: (
      <div className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
        <p>
          We use browser local storage and essential session cookies strictly to keep you authenticated, preserve dark/light theme preferences, and save your offline wishlist items. We do not use third-party tracking or advertising cookies.
        </p>
      </div>
    )
  },
  copyright: {
    title: "Copyright Infringement Policy",
    subtitle: "Notice regarding academic materials and lecture notes.",
    content: (
      <div className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
        <p>
          Student-created summaries and donated textbooks are encouraged. However, posting copyrighted exam question papers under confidential review or commercial software crack files is prohibited and subject to immediate takedown upon faculty or administrator request.
        </p>
      </div>
    )
  },
  safety: {
    title: "Campus Safety Tips",
    subtitle: "Best practices for safe, hassle-free trades in CUET.",
    content: (
      <div className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-500/20 rounded-lg text-amber-800 dark:text-amber-300">
          <p className="font-bold flex items-center gap-1.5">
            <AlertTriangle size={15} /> Never pay in advance!
          </p>
          <p className="mt-1 text-xs">
            Never send bKash/Nagad advance payment before seeing the gadget, cycle, or calculator in person.
          </p>
        </div>
        <p className="pt-1 font-semibold text-slate-800 dark:text-slate-200">
          Recommended Meetup Locations:
        </p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li><strong>CUET Central Library:</strong> Quiet, well-lit, and secure for textbook/gadget checks.</li>
          <li><strong>TSC Cafeteria:</strong> Convenient daytime spot with ample seating for inspections.</li>
          <li><strong>Hall Gates:</strong> Easy for dorm essentials, bicycles, and heavy item handovers.</li>
          <li><strong>Academic Building corridors:</strong> Good between-class quick exchange spots.</li>
        </ul>
      </div>
    )
  },
  faq: {
    title: "Frequently Asked Questions",
    subtitle: "Common questions about buying, selling, and giving away items.",
    content: (
      <div className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
        <div>
          <p className="font-bold text-slate-900 dark:text-white">Q: Who can post ads on CUET E-Bazar?</p>
          <p className="mt-0.5 text-slate-600 dark:text-slate-300">A: Any registered CUET student or verified campus shop owner.</p>
        </div>
        <div>
          <p className="font-bold text-slate-900 dark:text-white">Q: Is it really free?</p>
          <p className="mt-0.5 text-slate-600 dark:text-slate-300">A: Yes! Listing items, browsing, and messaging buyers are 100% free with no hidden charges.</p>
        </div>
        <div>
          <p className="font-bold text-slate-900 dark:text-white">Q: How do Giveaways work?</p>
          <p className="mt-0.5 text-slate-600 dark:text-slate-300">A: Seniors or peers post books or drafters with zero price. Interested juniors can message and arrange a hall pickup.</p>
        </div>
      </div>
    )
  }
};

export function AppFooter() {
  const { user } = useAuth();
  const isShopOwner = user?.role === "shop_owner";
  const [activeTopic, setActiveTopic] = useState<ModalTopic>(null);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="mt-16 border-t border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-[#131921] dark:text-slate-300">
      {/* ── Main Footer Columns (Bikroy-style organized layout for CUET) ── */}
      <div className="mx-auto max-w-[1500px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Column 1: About Us */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              About Us
            </p>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => setActiveTopic("about")}
                  className="hover:text-brand-emerald hover:underline text-left transition"
                >
                  About CUET E-Bazar
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTopic("terms")}
                  className="hover:text-brand-emerald hover:underline text-left transition"
                >
                  Terms &amp; Conditions
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTopic("privacy")}
                  className="hover:text-brand-emerald hover:underline text-left transition"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTopic("billing")}
                  className="hover:text-brand-emerald hover:underline text-left transition"
                >
                  Billing Policy (0% Commission)
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTopic("candidate")}
                  className="hover:text-brand-emerald hover:underline text-left transition"
                >
                  Candidate Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTopic("cookie")}
                  className="hover:text-brand-emerald hover:underline text-left transition"
                >
                  Cookie Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTopic("copyright")}
                  className="hover:text-brand-emerald hover:underline text-left transition"
                >
                  Copyright Infringement Policy
                </button>
              </li>
            </ul>
          </div>

          {/* Column 2: Support */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Support
            </p>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="mailto:support@cuet-ebazar.com"
                  className="inline-flex items-center gap-1 hover:text-brand-emerald hover:underline transition"
                >
                  <Mail size={12} /> support@cuet-ebazar.com
                </a>
              </li>
              <li>
                <button
                  onClick={() => setActiveTopic("safety")}
                  className="hover:text-brand-emerald hover:underline text-left transition"
                >
                  Safety Tips
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTopic("faq")}
                  className="hover:text-brand-emerald hover:underline text-left transition"
                >
                  FAQ
                </button>
              </li>
              <li>
                <Link
                  href="/messages"
                  className="hover:text-brand-emerald hover:underline transition text-rose-600 dark:text-rose-400 font-medium"
                >
                  Report Scam or Fake Ad
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Campus Categories - student browsing only */}
          {!isShopOwner && (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Popular Categories
              </p>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link
                    href="/marketplace?category=Electronics+%26+Gadgets"
                    className="hover:text-brand-emerald hover:underline transition"
                  >
                    Electronics &amp; Gadgets
                  </Link>
                </li>
                <li>
                  <Link
                    href="/marketplace?category=Drawing+%26+Lab+Instruments"
                    className="hover:text-brand-emerald hover:underline transition"
                  >
                    Drawing &amp; Lab Kits
                  </Link>
                </li>
                <li>
                  <Link
                    href="/marketplace?search=calculator"
                    className="hover:text-brand-emerald hover:underline transition"
                  >
                    Scientific Calculators
                  </Link>
                </li>
                <li>
                  <Link
                    href="/marketplace?category=Books+%26+Study+Material"
                    className="hover:text-brand-emerald hover:underline transition"
                  >
                    Books &amp; Study Notes
                  </Link>
                </li>
                <li>
                  <Link
                    href="/marketplace?category=Bicycles+%26+Sports"
                    className="hover:text-brand-emerald hover:underline transition"
                  >
                    Campus Bicycles &amp; Sports
                  </Link>
                </li>
                <li>
                  <Link
                    href="/giveaways"
                    className="hover:text-brand-emerald hover:underline transition text-emerald-600 dark:text-emerald-400 font-semibold"
                  >
                    Free Giveaways
                  </Link>
                </li>
              </ul>
            </div>
          )}

          {/* Column 4: Community & Resources */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Campus Resources
            </p>
            <ul className="space-y-2 text-xs">
              {!isShopOwner && (
                <li>
                  <Link
                    href="/shops"
                    className="hover:text-brand-emerald hover:underline transition"
                  >
                    Campus Shops &amp; Cafes
                  </Link>
                </li>
              )}
              <li>
                <a
                  href="https://www.facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-brand-emerald hover:underline transition"
                >
                  <Facebook size={12} /> CUET E-Bazar on Facebook
                </a>
              </li>
              <li>
                <a
                  href="https://www.instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-brand-emerald hover:underline transition"
                >
                  <Instagram size={12} /> CUET on Instagram
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* ── Bottom Strip: Brand, Disclaimer, and Back to Top ── */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-100 pt-8 dark:border-slate-800 sm:flex-row text-xs">
          <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            <Logo />
            <span className="hidden sm:inline text-slate-300 dark:text-slate-700">|</span>
            <p className="text-slate-500">
              Raozan, Chattogram-4349, Bangladesh • 100% Free Peer-to-Peer Student Platform
            </p>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-slate-400 text-[11px]">
              © {new Date().getFullYear()} CUET E-Bazar. All rights reserved.
            </span>
            <button
              onClick={scrollToTop}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition"
              title="Scroll back to top"
            >
              <ChevronUp size={14} /> Top
            </button>
          </div>
        </div>
      </div>

      {/* ── Interactive Modal for Policy & Safety Details ── */}
      {activeTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setActiveTopic(null)}
              className="absolute right-4 top-4 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>

            <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white pr-6">
              {MODAL_CONTENT[activeTopic].title}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              {MODAL_CONTENT[activeTopic].subtitle}
            </p>

            <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
              {MODAL_CONTENT[activeTopic].content}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setActiveTopic(null)}
                className="rounded-lg bg-brand-emerald px-4 py-2 text-xs font-semibold text-white hover:bg-[#0d665f] transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}
