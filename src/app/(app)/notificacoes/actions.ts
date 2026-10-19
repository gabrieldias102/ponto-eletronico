"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/session";
import { markAllRead } from "@/server/notifications";

export async function markAllReadAction() {
  const user = await requireUser();
  await markAllRead(user.id);
  // Atualiza o contador do sino em todas as telas.
  revalidatePath("/", "layout");
}
