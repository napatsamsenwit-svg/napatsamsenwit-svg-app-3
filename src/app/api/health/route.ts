// ให้ load balancer ถามว่าเซิร์ฟเวอร์ยังทำงานอยู่ไหม (ไม่เปิดเผยข้อมูลใด ๆ)
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ ok: true });
}
