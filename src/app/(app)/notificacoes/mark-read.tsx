"use client";

import { useEffect } from "react";
import { markAllReadAction } from "./actions";

/** Marca as notificações como lidas ao abrir a página (sem alterar dados durante a renderização). */
export function MarkAllRead({ hasUnread }: { hasUnread: boolean }) {
  useEffect(() => {
    if (hasUnread) void markAllReadAction();
  }, [hasUnread]);
  return null;
}
