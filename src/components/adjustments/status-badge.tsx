import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, type AdjustmentStatus } from "@/lib/adjustments";
import { cn } from "@/lib/utils";

const STYLES: Record<AdjustmentStatus, string> = {
  PENDING_MANAGER: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  PENDING_HR: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  APPROVED: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  REJECTED: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
  CANCELLED: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: AdjustmentStatus }) {
  return <Badge className={cn("border-transparent", STYLES[status])}>{STATUS_LABELS[status]}</Badge>;
}
