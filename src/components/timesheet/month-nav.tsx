import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { formatMonth, monthKey, parseMonthKey, shiftMonth } from "@/lib/time";

/** Navegação entre meses via ?mes=YYYY-MM. Não avança além do mês atual. */
export function MonthNav({ month, basePath }: { month: string; basePath: string }) {
  const current = monthKey(new Date());
  const range = parseMonthKey(month)!;
  const next = shiftMonth(month, 1);

  return (
    <div className="mb-4 flex items-center gap-2">
      <Link
        href={`${basePath}?mes=${shiftMonth(month, -1)}`}
        className={buttonVariants({ variant: "outline", size: "icon" })}
        aria-label="Mês anterior"
      >
        <ChevronLeftIcon />
      </Link>
      <span className="min-w-36 text-center text-sm font-medium">{formatMonth(range.start)}</span>
      {next <= current ? (
        <Link
          href={`${basePath}?mes=${next}`}
          className={buttonVariants({ variant: "outline", size: "icon" })}
          aria-label="Próximo mês"
        >
          <ChevronRightIcon />
        </Link>
      ) : (
        <span className={buttonVariants({ variant: "outline", size: "icon", className: "pointer-events-none opacity-40" })}>
          <ChevronRightIcon />
        </span>
      )}
    </div>
  );
}
