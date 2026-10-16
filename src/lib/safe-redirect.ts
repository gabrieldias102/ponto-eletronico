/** Só aceita caminhos internos, para o ?next não virar redirecionamento para outro site. */
export function safeNext(next: string | undefined | null, fallback = "/inicio"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
