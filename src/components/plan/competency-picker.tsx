"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Row } from "@/lib/form-logic";
import { cn } from "@/lib/utils";

type DictLevel = { n: number; label: string; desc: string; beh: string[] };
type DictEntry = {
  id: string;
  type: string;
  gth: string;
  file: string;
  table: number;
  code: string;
  name: string;
  def: string;
  levels: DictLevel[];
};

const TYPE_LABEL: Record<string, string> = {
  "Core Competency": "สมรรถนะหลัก",
  "Managerial Competency": "สมรรถนะทางการบริหาร",
  "Functional Competency": "สมรรถนะเฉพาะหน้าที่งาน",
};

const src = (c: DictEntry) => `${c.file} · ${c.code || "ตาราง " + c.table}`;

/** เลือกสมรรถนะจากพจนานุกรมของบริษัท (33 รายการ) แล้วเติมเป็นแถวในตาราง */
export function CompetencyPicker({ onAdd, disabled }: { onAdd: (row: Row) => void; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [dict, setDict] = useState<DictEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<DictEntry | null>(null);

  useEffect(() => {
    if (!open || dict) return;
    import("@/lib/data/competency-dict.json").then(
      (m) => setDict(m.default as unknown as DictEntry[]),
      () => setFailed(true),
    );
  }, [open, dict]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (dict ?? []).filter((c) => !t || c.name.toLowerCase().includes(t) || c.type.toLowerCase().includes(t));
  }, [dict, q]);

  const add = (c: DictEntry, level: number) => {
    const L = c.levels[level - 1];
    onAdd({
      name: c.name,
      type: c.type,
      definition: c.def,
      positions: "",
      level: String(level),
      indicators: L ? L.beh.map((b) => "- " + b).join("\n") : "",
      source: src(c),
    });
    setOpen(false);
    setPicked(null);
    setQ("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setPicked(null);
      }}
    >
      <DialogTrigger render={<Button type="button" variant="outline" className="h-11 md:h-8" disabled={disabled} />}>
        <BookOpen className="size-4" />
        เลือกจากพจนานุกรมสมรรถนะ
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{picked ? "เลือกระดับที่คาดหวัง" : "พจนานุกรมสมรรถนะ"}</DialogTitle>
          <DialogDescription>
            {picked ? picked.name : "เลือกสมรรถนะ ข้อความจะถูกคัดลอกมาตามพจนานุกรมของบริษัทตรงตัว"}
          </DialogDescription>
        </DialogHeader>
        {failed && <p className="text-sm text-destructive">โหลดพจนานุกรมไม่สำเร็จ ปิดแล้วลองใหม่อีกครั้ง</p>}
        {!dict && !failed && <p className="text-sm text-muted-foreground">กำลังโหลดพจนานุกรม…</p>}
        {dict && !picked && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="เช่น ผลสำเร็จ, Core"
                aria-label="ค้นหาสมรรถนะ"
                className="h-11 pl-9 md:h-9"
              />
            </div>
            {shown.length === 0 ? (
              <p className="text-sm text-muted-foreground">ไม่เจอสมรรถนะที่ค้นหา</p>
            ) : (
              <ul className="space-y-2">
                {shown.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setPicked(c)}
                      className="w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent"
                    >
                      <span className="block text-xs text-muted-foreground">
                        {TYPE_LABEL[c.type] ?? c.type}
                        {c.gth ? ` · ${c.gth}` : ""}
                      </span>
                      <span className="block font-medium">{c.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {picked && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{picked.def}</p>
            <ul className="space-y-2">
              {picked.levels.map((l) => (
                <li key={l.n}>
                  <button
                    type="button"
                    onClick={() => add(picked, l.n)}
                    className={cn("w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent")}
                  >
                    <span className="block font-medium">
                      ระดับ {l.n}: {l.label}
                    </span>
                    <span className="block text-sm text-muted-foreground">{l.desc}</span>
                  </button>
                </li>
              ))}
            </ul>
            <Button type="button" variant="ghost" className="h-11 md:h-8" onClick={() => setPicked(null)}>
              กลับไปเลือกสมรรถนะอื่น
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
