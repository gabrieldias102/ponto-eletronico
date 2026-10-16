import { cn } from "@/lib/utils";

/** Marca fixa do aplicativo. Não muda com a identidade visual da organização. */
export function PontualMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={cn("size-8 shrink-0", className)}>
      <rect width="64" height="64" rx="14" fill="#0d9488" />
      <circle cx="32" cy="32" r="19" fill="none" stroke="#fff" strokeWidth="5" />
      <path
        d="M24 33 l6 6 l11 -13"
        fill="none"
        stroke="#fff"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PontualLogo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <PontualMark />
      <span className="text-lg font-semibold tracking-tight">Pontual</span>
    </span>
  );
}
