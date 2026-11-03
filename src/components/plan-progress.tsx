import { countProgress, type SectionStatus } from "@/lib/plan-status";

/** แถบความคืบหน้า: ส่วนเขียว = อนุมัติแล้ว ส่วนเหลือง = กรอกแล้ว (ยังไม่อนุมัติ) */
export function PlanProgress({ statuses, total }: { statuses: SectionStatus[]; total: number }) {
  const { approved, review, filled } = countProgress(statuses, total);
  const okPct = (approved / total) * 100;
  const fillPct = ((filled - approved) / total) * 100;

  return (
    <div className="space-y-2" role="group" aria-label="ความคืบหน้าของแผน">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
        <div className="bg-ok transition-[width] motion-reduce:transition-none" style={{ width: `${okPct}%` }} />
        <div className="bg-gold transition-[width] motion-reduce:transition-none" style={{ width: `${fillPct}%` }} />
      </div>
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span>
          อนุมัติแล้ว <b className="tabular-nums text-foreground">{approved}</b>/{total}
        </span>
        {review > 0 && (
          <span>
            รอตรวจ <b className="tabular-nums text-foreground">{review}</b>
          </span>
        )}
        <span>
          กรอกแล้ว <b className="tabular-nums text-foreground">{filled}</b>/{total}
        </span>
      </p>
    </div>
  );
}
