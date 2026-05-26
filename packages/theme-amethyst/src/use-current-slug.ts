"use client";

import { usePathname } from "next/navigation";

export function useCurrentSlug(): string {
  const pathname = usePathname();
  if (!pathname || pathname === "/") return "index";
  return pathname.replace(/^\/+/, "");
}
