import { cn } from "@/lib/utils";
import { countProgress, type SectionStatus } from "@/lib/plan-status";

/** แถบความคืบหน้า: ส่วนเขียว = อนุมัติแล้ว ส่วนเหลือง = กรอกแล้ว (ยังไม่อนุมัติ) */
export function PlanProgress({ statuses, total, onDark = false }: { statuses: SectionStatus[]; total: number; onDark?: boolean }) {
  const { approved, review, filled } = countProgress(statuses, total);
  const okPct = (approved / total) * 100;
  const fillPct = ((filled - approved) / total) * 100;

  return (
    <div className="space-y-2" role="group" aria-label="ความคืบหน้าของแผน">
      <div className={cn("flex h-2 overflow-hidden rounded-full", onDark ? "bg-[#1F3668]" : "bg-muted")}>
        <div className="bg-ok transition-[width] motion-reduce:transition-none" style={{ width: `${okPct}%` }} />
        <div className="bg-gold transition-[width] motion-reduce:transition-none" style={{ width: `${fillPct}%` }} />
      </div>
      <p className={cn("flex flex-wrap gap-x-4 gap-y-1 text-[13px] tabular-nums", onDark ? "text-[#C9CDE0]" : "text-muted-foreground")}>
        <span>
          <i className="mr-1.5 inline-block size-2 rounded-full bg-ok align-[1px]" />อนุมัติแล้ว <b className={cn("tabular-nums font-normal", onDark ? "text-white" : "text-foreground")}>{approved}</b>/{total}
        </span>
        {review > 0 && (
          <span>
            <i className="mr-1.5 inline-block size-2 rounded-full bg-white align-[1px]" />รอตรวจ <b className={cn("tabular-nums font-normal", onDark ? "text-white" : "text-foreground")}>{review}</b>
          </span>
        )}
        <span>
          <i className="mr-1.5 inline-block size-2 rounded-full bg-gold align-[1px]" />กรอกแล้ว <b className={cn("tabular-nums font-normal", onDark ? "text-white" : "text-foreground")}>{filled}</b>/{total}
        </span>
      </p>
    </div>
  );
}
