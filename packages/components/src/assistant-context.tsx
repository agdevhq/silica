"use client";

import * as React from "react";

/**
 * Lightweight bridge between Silica components and an (optional) AI
 * assistant. `@silicajs/assistant` provides this context; components such
 * as the search palette consume it when present and stay unchanged when
 * the site runs without AI.
 */
export type SilicaAssistantContextValue = {
  /** Open the assistant, optionally submitting a question right away. */
  openAssistant: (query?: string) => void;
};

const SilicaAssistantContext =
  React.createContext<SilicaAssistantContextValue | null>(null);

export type SilicaAssistantProviderProps = {
  value: SilicaAssistantContextValue;
  children: React.ReactNode;
};

export function SilicaAssistantProvider({
  value,
  children,
}: SilicaAssistantProviderProps) {
  return (
    <SilicaAssistantContext.Provider value={value}>
      {children}
    </SilicaAssistantContext.Provider>
  );
}

export function useSilicaAssistant(): SilicaAssistantContextValue | null {
  return React.useContext(SilicaAssistantContext);
}
