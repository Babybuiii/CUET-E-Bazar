import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  asChild?: boolean;
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  const base =
    "focus-ring inline-flex items-center justify-center rounded-md px-5 py-2.5 text-sm font-semibold transition duration-150 active:scale-[0.99]";

  const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
    primary:
      "border border-[#0F766E] bg-[#0F766E] text-white hover:bg-[#0d665f]",
    secondary: "border border-[#f3a847] bg-[#ffa41c] text-[#0f1111] hover:bg-[#f39200]",
    ghost: "bg-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
  };

  return <button className={cn(base, variants[variant], className)} {...props} />;
}
