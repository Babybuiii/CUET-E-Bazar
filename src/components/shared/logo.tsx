"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

type LogoProps = {
  href?: string;
  className?: string;
  iconOnly?: boolean;
  hideTextOnMobile?: boolean;
  portalBadge?: React.ReactNode;
  subtitle?: string;
};

export function Logo({
  href,
  className = "",
  iconOnly = false,
  hideTextOnMobile = false,
  portalBadge,
  subtitle = "Student Marketplace"
}: LogoProps) {
  const { user } = useAuth();
  const targetHref = href ?? (user?.role === "shop_owner" ? "/my-shop" : "/");

  return (
    <Link href={targetHref} className={`inline-flex items-center gap-2 sm:gap-2.5 transition hover:opacity-90 shrink-0 ${className}`}>
      <div className="relative h-8 w-8 sm:h-9 sm:w-9 shrink-0 overflow-hidden rounded-lg">
        <Image
          src="/ebazar.png"
          alt="CUET E-Bazar Logo"
          fill
          sizes="(max-width: 640px) 32px, 36px"
          className="object-cover"
        />
      </div>
      {!iconOnly && (
        <div className={`min-w-0 ${hideTextOnMobile ? "hidden md:block" : ""}`}>
          <div className="flex items-center gap-1.5">
            <p className="font-display text-sm sm:text-base font-bold leading-tight tracking-tight whitespace-nowrap">
              CUET E-Bazar
            </p>
            {portalBadge}
          </div>
          {subtitle && (
            <p className="hidden sm:block text-[11px] font-medium text-slate-400 leading-tight mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>
      )}
    </Link>
  );
}
