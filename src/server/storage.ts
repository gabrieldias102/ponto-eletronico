import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { get, put } from "@vercel/blob";

/**
 * Salva um arquivo público e devolve a URL.
 * Com BLOB_READ_WRITE_TOKEN usa o Vercel Blob; sem ele (desenvolvimento), grava em public/uploads.
 */
export async function uploadPublicFile(pathname: string, file: File): Promise<string> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(pathname, file, { access: "public", addRandomSuffix: true });
    return blob.url;
  }
  assertDevelopment();

  const ext = path.extname(file.name) || "";
  const name = `${pathname.replace(/[^a-z0-9/_-]/gi, "_")}-${Date.now()}${ext}`;
  const target = path.join(process.cwd(), "public", "uploads", name);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, Buffer.from(await file.arrayBuffer()));
  return `/uploads/${name}`;
}

/**
 * Salva um arquivo privado (ex.: selfies) e devolve a chave para leitura posterior.
 * Nunca é servido diretamente: passe por uma rota que verifica a permissão.
 * Sem token do Blob (desenvolvimento), grava em storage/private, fora de public/.
 */
export async function uploadPrivateFile(pathname: string, file: Blob): Promise<string> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(pathname, file, { access: "private", addRandomSuffix: true });
    return blob.pathname;
  }
  assertDevelopment();

  const key = pathname.replace(/[^a-z0-9/_.-]/gi, "_");
  const target = privatePath(key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, Buffer.from(await file.arrayBuffer()));
  return key;
}

export async function readPrivateFile(key: string): Promise<{ body: BodyInit; contentType: string } | null> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const result = await get(key, { access: "private" });
    if (!result?.stream) return null;
    return { body: result.stream, contentType: result.blob.contentType ?? "application/octet-stream" };
  }
  try {
    const data = await readFile(privatePath(key));
    return { body: new Uint8Array(data), contentType: key.endsWith(".jpg") ? "image/jpeg" : "application/octet-stream" };
  } catch {
    return null;
  }
}

function privatePath(key: string) {
  const root = path.join(process.cwd(), "storage", "private");
  const target = path.resolve(root, key);
  // Impede ../ na chave.
  if (!target.startsWith(root + path.sep)) throw new Error("Chave de arquivo inválida.");
  return target;
}

function assertDevelopment() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("BLOB_READ_WRITE_TOKEN não configurado.");
  }
}
