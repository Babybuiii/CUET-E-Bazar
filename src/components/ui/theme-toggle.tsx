"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";

export function ThemeToggle({ className, size = 18 }: { className?: string; size?: number } = {}) {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <button
      type="button"
      aria-label="Toggle dark mode"
      className={
        className ||
        "focus-ring rounded-sm border border-white/20 bg-white/10 p-2 text-white hover:bg-white/20"
      }
      onClick={toggleTheme}
    >
      {!mounted ? (
        <Moon size={size} className="opacity-0" />
      ) : theme === "light" ? (
        <Moon size={size} />
      ) : (
        <Sun size={size} />
      )}
    </button>
  );
}
