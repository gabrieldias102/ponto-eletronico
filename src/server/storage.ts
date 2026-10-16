import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";

/**
 * Salva um arquivo público e devolve a URL.
 * Com BLOB_READ_WRITE_TOKEN usa o Vercel Blob; sem ele (desenvolvimento), grava em public/uploads.
 */
export async function uploadPublicFile(pathname: string, file: File): Promise<string> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(pathname, file, { access: "public", addRandomSuffix: true });
    return blob.url;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("BLOB_READ_WRITE_TOKEN não configurado.");
  }

  const ext = path.extname(file.name) || "";
  const name = `${pathname.replace(/[^a-z0-9/_-]/gi, "_")}-${Date.now()}${ext}`;
  const target = path.join(process.cwd(), "public", "uploads", name);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, Buffer.from(await file.arrayBuffer()));
  return `/uploads/${name}`;
}
