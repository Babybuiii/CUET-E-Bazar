import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  asChild?: boolean;
};

export function Button({ className, variant = "primary", size = "md", ...props }: ButtonProps) {
  const sizeClasses =
    size === "sm"
      ? "px-2.5 py-1 text-xs"
      : size === "lg"
      ? "px-6 py-3 text-base"
      : "px-3.5 py-2 text-xs sm:px-5 sm:py-2.5 sm:text-sm";

  const base =
    `focus-ring inline-flex items-center justify-center rounded-md ${sizeClasses} font-semibold transition duration-150 active:scale-[0.99]`;

  const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
    primary:
      "border border-[#0F766E] bg-[#0F766E] text-white hover:bg-[#0d665f]",
    secondary: "border border-[#f3a847] bg-[#ffa41c] text-[#0f1111] hover:bg-[#f39200]",
    ghost: "bg-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
    outline: "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
  };

  return <button className={cn(base, variants[variant], className)} {...props} />;
}
