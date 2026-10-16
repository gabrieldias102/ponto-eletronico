"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

/** Aviso após o cadastro (vindo do redirect da action); limpa o parâmetro da URL. */
export function CreatedToast() {
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    toast.success("Usuário cadastrado. O convite foi enviado por e-mail.");
    router.replace(pathname);
  }, [router, pathname]);
  return null;
}
