"use client";

import * as React from "react";
import { MoonIcon, SunIcon } from "lucide-react";

const STORAGE_KEY = "silica-theme";

type Theme = "light" | "dark";

function readInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  root.dataset.theme = theme;
}

export type DarkModeToggleProps = {
  className?: string;
};

export function DarkModeToggle({ className }: DarkModeToggleProps) {
  const [theme, setTheme] = React.useState<Theme>("light");
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    const initial = readInitialTheme();
    setTheme(initial);
    applyTheme(initial);
    setMounted(true);
  }, []);

  const setAndPersist = (next: Theme) => {
    setTheme(next);
    applyTheme(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  const isLight = mounted && theme === "light";
  const isDark = mounted && theme === "dark";

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className={`inline-flex items-center rounded-full border border-border bg-muted/50 p-0.5 ${className ?? ""}`}
    >
      <button
        type="button"
        role="radio"
        aria-checked={isLight}
        aria-label="Switch to light mode"
        onClick={() => setAndPersist("light")}
        className={`inline-flex size-6 items-center justify-center rounded-full transition-colors ${
          isLight
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <SunIcon className="size-3.5" aria-hidden="true" />
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={isDark}
        aria-label="Switch to dark mode"
        onClick={() => setAndPersist("dark")}
        className={`inline-flex size-6 items-center justify-center rounded-full transition-colors ${
          isDark
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <MoonIcon className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
