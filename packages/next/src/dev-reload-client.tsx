"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function SilicaDevReload() {
  const router = useRouter();

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const source = new EventSource("/api/silica/dev-events");
    source.addEventListener("reload", () => {
      router.refresh();
    });

    return () => source.close();
  }, [router]);

  return null;
}
