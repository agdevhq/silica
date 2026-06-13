"use client";

import * as React from "react";

function detectModKeyLabel(): string {
  const isApple =
    /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    navigator.platform.startsWith("Mac") ||
    navigator.platform === "iPhone";

  return isApple ? "⌘" : "Ctrl";
}

/** Platform-aware label for the primary modifier key (⌘ on Apple, Ctrl elsewhere). */
export function useModKeyLabel(): string | null {
  const [label, setLabel] = React.useState<string | null>(null);

  React.useLayoutEffect(() => {
    setLabel(detectModKeyLabel());
  }, []);

  return label;
}
