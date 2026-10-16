import { getCurrentUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { readPrivateFile } from "@/server/storage";
import { canViewTimesheetOf } from "@/server/team";

/** Selfie de uma marcação. Visível para o próprio funcionário, o gestor do setor e o RH. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getCurrentUser();
  if (!viewer) return new Response("Não autenticado", { status: 401 });

  const { id } = await params;
  const entry = await db.timeEntry.findUnique({ where: { id }, select: { userId: true, selfieKey: true } });
  if (!entry?.selfieKey || !(await canViewTimesheetOf(viewer, entry.userId))) {
    return new Response("Não encontrado", { status: 404 });
  }

  const file = await readPrivateFile(entry.selfieKey);
  if (!file) return new Response("Não encontrado", { status: 404 });

  return new Response(file.body, {
    headers: {
      "Content-Type": file.contentType,
      // Dado pessoal (LGPD): não guardar em cache, nem no navegador (aparelhos compartilhados).
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
