"use client";

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // resolvedTheme is undefined until the provider has read the stored preference, and the
  // placeholder below renders identically on the server and during hydration.
  if (resolvedTheme === undefined) {
    return (
      <Button
        aria-label="Toggle theme"
        className={className}
        size="icon"
        type="button"
        variant="ghost"
      >
        <MonitorIcon className="size-4" />
      </Button>
    );
  }

  return (
    <Button
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={className}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      size="icon"
      type="button"
      variant="ghost"
    >
      {isDark ? <MoonIcon className="size-4" /> : <SunIcon className="size-4" />}
    </Button>
  );
}
