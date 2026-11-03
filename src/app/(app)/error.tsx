"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-4 py-16 text-center">
      <TriangleAlert className="size-10 text-muted-foreground" />
      <div className="space-y-1">
        <h1 className="text-lg font-medium">โหลดหน้านี้ไม่สำเร็จ</h1>
        <p className="text-sm text-muted-foreground">เช็กอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง ข้อมูลที่กรอกไว้ยังอยู่ครบ</p>
      </div>
      <Button onClick={reset}>ลองใหม่</Button>
    </div>
  );
}
