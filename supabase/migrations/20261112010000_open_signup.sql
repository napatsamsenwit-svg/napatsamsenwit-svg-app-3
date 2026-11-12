-- เปิดให้ทุกอีเมลเข้าใช้ได้อีกครั้ง: เอาตัวล็อกอีเมลออก (ตาราง allowed_emails ยังเก็บไว้ใช้กำหนดผู้ตรวจ)
drop trigger if exists enforce_allowed_email on auth.users;
drop function if exists public.enforce_allowed_email();
