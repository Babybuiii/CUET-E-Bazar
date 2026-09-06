"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

type LogoProps = {
  href?: string;
  className?: string;
};

export function Logo({ href, className = "" }: LogoProps) {
  const { isLoggedIn } = useAuth();
  const targetHref = href ?? (isLoggedIn ? "/home" : "/");

  return (
    <Link href={targetHref} className={`inline-flex items-center gap-1.5 sm:gap-2.5 transition hover:opacity-90 shrink-0 ${className}`}>
      <div className="relative h-8 w-8 sm:h-10 sm:w-10 shrink-0 overflow-hidden rounded-lg">
        <Image
          src="/ebazar.png"
          alt="CUET E-Bazar Logo"
          fill
          sizes="(max-width: 640px) 32px, 40px"
          className="object-cover"
        />
      </div>
      <div>
        <p className="font-display text-sm sm:text-lg font-bold leading-tight tracking-tight">CUET E-Bazar</p>
        <p className="hidden sm:block text-[11px] font-medium text-slate-400">Student Marketplace</p>
      </div>
    </Link>
  );
}
