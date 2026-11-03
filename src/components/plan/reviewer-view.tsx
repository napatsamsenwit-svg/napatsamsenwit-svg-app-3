"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { SectionStatus } from "@/lib/plan-status";
import { createClient } from "@/lib/supabase/client";
import { PlanEditor, type ReviewItem } from "./plan-editor";

function ReviewPanel({ planId, sectionKey, status }: { planId: string; sectionKey: string; status: SectionStatus }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (status !== "review" && status !== "approved") {
    return (
      <Card className="p-4 text-sm text-muted-foreground">
        {status === "returned" ? "ส่งกลับให้ผู้กรอกแก้ไขแล้ว รอผู้กรอกส่งตรวจใหม่" : "หัวข้อนี้ยังไม่ได้ส่งตรวจ"}
      </Card>
    );
  }

  async function decide(action: "approved" | "returned") {
    if (action === "returned" && !note.trim()) {
      setError("ใส่ความเห็นก่อนส่งกลับ เพื่อให้ผู้กรอกรู้ว่าต้องแก้อะไร");
      return;
    }
    setBusy(true);
    setError("");
    const { error: err } = await supabase.rpc("review_section", {
      p_plan_id: planId,
      p_section_key: sectionKey,
      p_action: action,
      p_note: note.trim(),
    });
    setBusy(false);
    if (err) {
      setError("บันทึกผลการตรวจไม่สำเร็จ ลองใหม่อีกครั้ง");
      return;
    }
    setNote("");
    toast.success(action === "approved" ? "อนุมัติหัวข้อนี้แล้ว" : "ส่งกลับให้แก้ไขแล้ว");
    router.refresh();
  }

  return (
    <Card className="space-y-3 p-4 print:hidden">
      <div className="space-y-1.5">
        <Label htmlFor={`note-${sectionKey}`}>
          ความเห็นของผู้ตรวจ {status === "review" ? "(จำเป็นเมื่อส่งกลับแก้)" : "(ใส่เมื่อจะส่งกลับแก้)"}
        </Label>
        <Textarea
          id={`note-${sectionKey}`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="เช่น ระบุเป้าหมายให้วัดผลเป็นตัวเลขได้"
          aria-invalid={!!error}
        />
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" className="h-11 md:h-9" disabled={busy} onClick={() => void decide("returned")}>
          <Undo2 className="size-4" />
          ส่งกลับแก้
        </Button>
        {status === "review" && (
          <Button type="button" className="h-11 md:h-9" disabled={busy} onClick={() => void decide("approved")}>
            <Check className="size-4" />
            {busy ? "กำลังบันทึก…" : "อนุมัติ"}
          </Button>
        )}
      </div>
    </Card>
  );
}

export function ReviewerView({
  planId,
  title,
  initial,
  reviews,
}: {
  planId: string;
  title: string;
  initial: Record<string, { data: unknown; status: string }>;
  reviews: Record<string, ReviewItem[]>;
}) {
  return (
    <PlanEditor
      planId={planId}
      title={title}
      mode="reviewer"
      initial={initial}
      reviews={reviews}
      reviewPanel={(key, status) => <ReviewPanel planId={planId} sectionKey={key} status={status} />}
    />
  );
}
