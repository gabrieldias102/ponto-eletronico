"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Recarrega os dados do servidor após `afterMs` (e a cada minuto, se algo atrasar). */
export function AutoRefresh({ afterMs }: { afterMs: number }) {
  const router = useRouter();
  useEffect(() => {
    const first = setTimeout(() => router.refresh(), afterMs);
    const fallback = setInterval(() => router.refresh(), 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(fallback);
    };
  }, [afterMs, router]);
  return null;
}
