import { cn } from "@/lib/utils";
import { STATUS_CLASS, STATUS_TEXT, type SectionStatus } from "@/lib/plan-status";

export function StatusPill({ status, className }: { status: SectionStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_CLASS[status],
        className,
      )}
    >
      {STATUS_TEXT[status]}
    </span>
  );
}
