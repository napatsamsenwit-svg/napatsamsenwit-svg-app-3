"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Field } from "@/lib/form-schema";
import type { Row } from "@/lib/form-logic";
import { ListField } from "./fields";

const causesOf = (r: Row) => (r.causes ? r.causes.split("\n") : []);

/** หมวดของสาเหตุในก้างปลา: AI คิดหมวดให้เอง ผู้ใช้เพิ่ม ลบ และแก้ชื่อหมวดได้ */
export function FishboneCats({ id, value, onChange }: { id: string; value: Row[]; onChange: (v: Row[]) => void }) {
  const set = (i: number, patch: Row) => onChange(value.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <div className="space-y-3">
      {value.length === 0 && (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          ยังไม่มีหมวด กด &quot;ให้ AI ช่วยร่าง&quot; ให้ AI คิดหมวดให้ หรือกด &quot;เพิ่มหมวด&quot; เพื่อตั้งเอง
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {value.map((r, i) => {
          const field = { k: `${id}-${i}`, label: "สาเหตุ", type: "list" } as Field;
          return (
            <div key={i} className="space-y-3 rounded-xl border bg-card p-3">
              <div className="flex items-center gap-2">
                <Input
                  value={r.name ?? ""}
                  placeholder="ชื่อหมวด เช่น คน, ระบบ, ลูกค้า"
                  aria-label={`ชื่อหมวดที่ ${i + 1}`}
                  onChange={(e) => set(i, { name: e.target.value })}
                  className="h-11 font-medium md:h-9"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-11 shrink-0 md:size-9"
                  aria-label={`ลบหมวดที่ ${i + 1}`}
                  onClick={() => onChange(value.filter((_, j) => j !== i))}
                >
                  <X className="size-4" />
                </Button>
              </div>
              <ListField
                field={field}
                idPrefix={`${id}-${i}`}
                value={causesOf(r)}
                onChange={(v) => set(i, { causes: v.join("\n") })}
              />
            </div>
          );
        })}
      </div>
      <Button type="button" variant="outline" className="h-11 md:h-9" onClick={() => onChange([...value, { name: "", causes: "" }])}>
        <Plus className="size-4" />
        เพิ่มหมวด
      </Button>
    </div>
  );
}
