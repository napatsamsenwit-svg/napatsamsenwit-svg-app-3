/**
 * อีเมลที่ได้รับอนุญาตให้ใช้ระบบ (มีเพียง 2 อีเมล)
 * ต้องตรงกับตาราง public.allowed_emails ในฐานข้อมูล ซึ่งเป็นด่านแรกที่กันการสมัครด้วยอีเมลอื่น
 * ส่วนไฟล์นี้เป็นด่านที่สองในแอป (ข้อความแจ้งผู้ใช้ และกันบัญชีเก่าที่ไม่อยู่ในรายชื่อ)
 */
export const ALLOWED_EMAILS = ["kon42449@gmail.com", "napatsamsenwit@gmail.com"] as const;

export const isAllowedEmail = (email: unknown): boolean =>
  typeof email === "string" && (ALLOWED_EMAILS as readonly string[]).includes(email.trim().toLowerCase());

export const NOT_ALLOWED_MESSAGE = "อีเมลนี้ยังไม่ได้รับอนุญาตให้ใช้งานระบบ ติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์";
