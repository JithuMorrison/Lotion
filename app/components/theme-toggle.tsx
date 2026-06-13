"use client";

import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "@/lib/stores";

// Simple light/dark toggle. Clicking sets an explicit preference (light or
// dark), overriding "system". Lives in the sidebar footer.
export function ThemeToggle() {
  const resolved = useThemeStore((s) => s.resolved);
  const setTheme = useThemeStore((s) => s.setTheme);
  const isDark = resolved === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
