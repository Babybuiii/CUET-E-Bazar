import Image from "next/image";
import Link from "next/link";

type LogoProps = {
  href?: string;
  className?: string;
};

export function Logo({ href = "/home", className = "" }: LogoProps) {
  return (
    <Link href={href} className={`inline-flex items-center gap-2.5 transition hover:opacity-90 ${className}`}>
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg">
        <Image
          src="/ebazar.png"
          alt="CUET E-Bazar Logo"
          fill
          sizes="40px"
          className="object-cover"
        />
      </div>
      <div>
        <p className="font-display text-lg font-bold leading-tight">CUET E-Bazar</p>
        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Student Marketplace</p>
      </div>
    </Link>
  );
}
