import { getCurrentUser } from "@/server/auth/session";
import { getAdjustmentFor } from "@/server/adjustments";
import { db } from "@/server/db";
import { readPrivateFile } from "@/server/storage";

/** Comprovante de uma solicitação. Visível para o solicitante, o gestor do setor, o RH e o Admin. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getCurrentUser();
  if (!viewer) return new Response("Não autenticado", { status: 401 });

  const { id } = await params;
  if (!(await getAdjustmentFor(viewer, id))) return new Response("Não encontrado", { status: 404 });
  const request = await db.adjustmentRequest.findUnique({
    where: { id },
    select: { attachmentKey: true, attachmentName: true, attachmentType: true },
  });
  if (!request?.attachmentKey) return new Response("Não encontrado", { status: 404 });

  const file = await readPrivateFile(request.attachmentKey);
  if (!file) return new Response("Não encontrado", { status: 404 });

  const name = (request.attachmentName ?? "comprovante").replace(/[^\w.\- ]/g, "_");
  return new Response(file.body, {
    headers: {
      "Content-Type": request.attachmentType ?? file.contentType,
      "Content-Disposition": `inline; filename="${name}"`,
      // Dado pessoal (LGPD): sem cache, nem no navegador.
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
