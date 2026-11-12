# Anna AI: เอกสารส่งมอบให้ DevOps (ย้ายขึ้นเซิร์ฟเวอร์ตามแผนผัง)

เป้าหมาย: รันแอปบนโครงสร้างตามแผนผัง "Minimum Standard"
(Cloudflare → DMZ → Outbound zone → Inbound zone) ด้วยโดเมน .com ของบริษัท

## 1. แอปคืออะไร
- Next.js 16 (App Router), Node 22, ไม่มี custom server
- ฐานข้อมูลและล็อกอิน: Supabase (Postgres + Auth) ผ่าน `@supabase/ssr`
- AI: Gemini ผ่าน `GEMINI_API_KEY` (เรียกจากฝั่งเซิร์ฟเวอร์เท่านั้น)
- รูปแบบ session: คุกกี้เซสชันล้วน (ปิดเบราว์เซอร์แล้วต้องล็อกอินใหม่) + คุกกี้ `anna-live` เก็บเลขรุ่นจากตาราง `app_settings`

## 2. แปลงกล่องในแผนผังเป็นของจริง

| แผนผัง | ของจริง | หมายเหตุ |
|---|---|---|
| Cloudflare | Cloudflare Pro, proxy เปิด (ส้ม), WAF managed rules, rate limit ที่ `/login` | SSL mode: Full (strict) |
| Gateway + Firewall (DMZ) | Load balancer หรือ Cloudflare Tunnel + Security Group | เปิดรับเฉพาะ 443 จาก IP ของ Cloudflare |
| Identity / MFA (DMZ) | Supabase Auth (อีเมล+รหัสผ่าน) | หน้า MFA ถูกถอดออกตามคำสั่งเจ้าของระบบ ถ้าลูกค้าต้องการให้เปิด TOTP MFA ใหม่ |
| Web-site / Web-app server (Outbound) | container จาก `Dockerfile` อย่างน้อย 2 ตัว หลัง load balancer | subnet ปิด ไม่มี IP สาธารณะ |
| Database (Inbound) | Postgres: Supabase แบบ self-host หรือ Supabase Cloud region ใกล้ไทย | รับต่อจาก subnet แอปเท่านั้น |
| Log + SIEM (Inbound) | Wazuh (manager 1 เครื่อง + agent บนทุกเครื่อง) | ส่ง log ของ container, WAF, Auth เข้า |
| Antivirus (Inbound) | ClamAV (clamd) | ใช้เมื่อเปิดให้อัปโหลดไฟล์ ตอนนี้แอปยังไม่มีอัปโหลด |

กฎ firewall ระหว่างโซน (ขั้นต่ำ):
1. อินเทอร์เน็ต → Cloudflare เท่านั้น
2. Cloudflare → DMZ: 443
3. DMZ → Outbound: 3000 (แอป)
4. Outbound → Inbound: 5432 (DB) และ 1514/1515 (Wazuh)
5. นอกนั้นปิดทั้งหมด ผู้ดูแลเข้าด้วย VPN หรือ SSM ไม่เปิด SSH สาธารณะ

## 3. Build และ run
ต้องมีตัวแปรตอน build (ค่า `NEXT_PUBLIC_` ถูกฝังในไฟล์):
```
docker build -t anna-ai \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://<supabase-url> \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key> .
```
ตัวแปรตอน run (เก็บใน secret manager ห้ามใส่ใน image หรือ git):
```
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-3.6-flash
```
- พอร์ต 3000, health check: `GET /api/health` → `{"ok":true}`
- container รันด้วยผู้ใช้ไม่ใช่ root
- ไม่เคยใช้ service-role key ในแอป ใช้เฉพาะ publishable key
- ทดสอบแล้ว: `BUILD_STANDALONE=1 npm run build` แล้ว `node .next/standalone/server.js` ตอบ `/api/health` 200 และเด้ง `/` ไป `/login` (ยังไม่ได้ทดสอบ build ผ่าน Docker จริง เพราะเครื่องพัฒนาไม่มี Docker)

## 4. ฐานข้อมูล
- สคีมาทั้งหมดอยู่ใน `supabase/migrations/` เรียงตามชื่อไฟล์ รันกับ DB ใหม่ได้ตามลำดับ
- ทุกตารางเปิด Row Level Security แล้ว
- ไฟล์ `20261112010000_open_signup.sql` ยังไม่ถูกรันบน DB ปัจจุบัน (เป็นการเปิดให้สมัครด้วยอีเมลใดก็ได้) ตัดสินใจกับเจ้าของระบบก่อนรัน
- ตั้งสำรองข้อมูลรายวัน เก็บอย่างน้อย 30 วัน และซ้อมกู้คืนอย่างน้อย 1 ครั้งก่อนขายจริง
- ย้ายข้อมูลผู้ใช้: ผู้ใช้ใน `auth.users` ต้องย้ายพร้อมรหัสผ่านที่แฮชแล้ว (ใช้ `pg_dump` ของ schema `auth` และ `public`) แล้วทดสอบล็อกอินก่อนสลับโดเมน

## 5. ขั้นตอนย้าย (cutover)
1. สร้างเครือข่าย 3 โซนและกฎ firewall
2. ตั้ง DB ใหม่ รัน migrations หรือกู้จาก dump
3. build image ส่งขึ้น registry รันบนเซิร์ฟเวอร์ ทดสอบผ่านโดเมนทดสอบ เช่น `staging.<โดเมน>.com`
4. ตั้ง Wazuh agent และทดสอบแจ้งเตือน (ลองล็อกอินผิดซ้ำ ๆ ต้องเห็นใน SIEM)
5. Pentest แล้วแก้
6. ลด TTL ของ DNS เป็น 5 นาที ย้ายข้อมูลรอบสุดท้าย ชี้โดเมน .com มาที่ระบบใหม่
7. คงระบบเก่าบน Vercel ไว้ 1–2 สัปดาห์เผื่อย้อนกลับ แล้วค่อยปิด

## 6. สิ่งที่ควรทำเพิ่ม (ยังไม่ได้ทำ)
- **MFA:** ตอนนี้ไม่มี ถ้าลูกค้าองค์กรบังคับ ให้เปิด TOTP MFA ของ Supabase Auth และบังคับ `aal2` ใน RLS
- ตั้ง security headers (CSP, HSTS, X-Frame-Options) ที่ Cloudflare หรือใน `next.config.ts`
- ปิด signup สาธารณะ หรือใช้ระบบเชิญ ถ้าเป็นระบบองค์กร
- เปิด Leaked password protection ใน Supabase Auth
- ตั้ง rate limit ที่ `/login` (กันเดารหัสผ่าน) ที่ Cloudflare
- แผนกู้ระบบ (RTO/RPO) และเอกสาร PDPA
