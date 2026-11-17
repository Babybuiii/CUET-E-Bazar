"use client";

import { useEffect } from "react";
import { ThemeProvider } from "@/components/providers/theme-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Prevent mouse wheel / trackpad scrolling from accidentally altering number inputs
    const handleWheel = () => {
      if (
        document.activeElement?.tagName === "INPUT" &&
        (document.activeElement as HTMLInputElement).type === "number"
      ) {
        (document.activeElement as HTMLInputElement).blur();
      }
    };
    window.addEventListener("wheel", handleWheel, { passive: true });
    return () => window.removeEventListener("wheel", handleWheel);
  }, []);

  return <ThemeProvider>{children}</ThemeProvider>;
}
