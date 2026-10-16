"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

/** Aviso após enviar a solicitação (vindo do redirect); limpa o parâmetro da URL. */
export function SentToast() {
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    toast.success("Solicitação enviada.");
    router.replace(pathname);
  }, [router, pathname]);
  return null;
}
