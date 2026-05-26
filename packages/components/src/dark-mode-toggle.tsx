"use client";

import * as React from "react";
import { MoonIcon, SunIcon } from "lucide-react";

const STORAGE_KEY = "silica-theme";
const SYSTEM_THEME_QUERY = "(prefers-color-scheme: dark)";

type Theme = "light" | "dark";

function readStoredTheme(): Theme | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "dark" || stored === "light" ? stored : null;
  } catch {
    return null;
  }
}

function readSystemTheme(): Theme {
  if (!window.matchMedia) return "light";
  return window.matchMedia(SYSTEM_THEME_QUERY).matches ? "dark" : "light";
}

function resolveTheme(): Theme {
  return readStoredTheme() ?? readSystemTheme();
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("dark", "light");
  root.classList.add(theme);
}

function watchThemeChanges(onThemeChange: (theme: Theme) => void) {
  const media = window.matchMedia(SYSTEM_THEME_QUERY);
  const syncTheme = () => {
    const next = resolveTheme();
    applyTheme(next);
    onThemeChange(next);
  };

  const handleSystemThemeChange = () => {
    if (!readStoredTheme()) syncTheme();
  };

  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) syncTheme();
  };

  media.addEventListener("change", handleSystemThemeChange);
  window.addEventListener("storage", handleStorageChange);

  syncTheme();

  return () => {
    media.removeEventListener("change", handleSystemThemeChange);
    window.removeEventListener("storage", handleStorageChange);
  };
}

function persistTheme(theme: Theme) {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored !== theme) {
      window.localStorage.setItem(STORAGE_KEY, theme);
    }
  } catch {
    // The visual theme can still update when storage is unavailable.
  }
  applyTheme(theme);
}

export type DarkModeToggleProps = {
  className?: string;
};

export function DarkModeToggle({ className }: DarkModeToggleProps) {
  const [theme, setTheme] = React.useState<Theme>("light");
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    const unwatchThemeChanges = watchThemeChanges(setTheme);
    setMounted(true);
    return unwatchThemeChanges;
  }, []);

  const setAndPersist = (next: Theme) => {
    setTheme(next);
    persistTheme(next);
  };

  const isLight = mounted && theme === "light";
  const isDark = mounted && theme === "dark";
  const nextTheme: Theme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={`Switch to ${nextTheme} mode`}
      onClick={() => setAndPersist(nextTheme)}
      className={`inline-flex items-center rounded-full border border-border bg-muted/50 p-0.5 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className ?? ""}`}
    >
      <span
        aria-hidden="true"
        className={`inline-flex size-6 items-center justify-center rounded-full transition-colors ${
          isLight
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground"
        }`}
      >
        <SunIcon className="size-3.5" aria-hidden="true" />
      </span>
      <span
        aria-hidden="true"
        className={`inline-flex size-6 items-center justify-center rounded-full transition-colors ${
          isDark
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground"
        }`}
      >
        <MoonIcon className="size-3.5" aria-hidden="true" />
      </span>
    </button>
  );
}
