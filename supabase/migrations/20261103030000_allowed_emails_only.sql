-- จำกัดผู้ใช้เหลือ 2 อีเมล (ฉบับเดียวกับที่ apply ผ่าน MCP ชื่อ allowed_emails_only)
create table public.allowed_emails (
  email text primary key check (email = lower(email)),
  role text not null default 'member' check (role in ('member', 'reviewer'))
);
alter table public.allowed_emails enable row level security;

insert into public.allowed_emails (email, role) values
  ('kon42449@gmail.com', 'member'),
  ('napatsamsenwit@gmail.com', 'reviewer');

create or replace function public.enforce_allowed_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.allowed_emails where email = lower(new.email)) then
    raise exception 'อีเมลนี้ไม่ได้รับอนุญาตให้ใช้งานระบบ';
  end if;
  return new;
end;
$$;
revoke execute on function public.enforce_allowed_email() from public, anon, authenticated;

create trigger enforce_allowed_email
before insert on auth.users
for each row execute function public.enforce_allowed_email();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, email, display_name, role)
  values (
    new.id,
    new.email,
    split_part(new.email, '@', 1),
    coalesce((select role from public.allowed_emails where email = lower(new.email)), 'member')
  );
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

update public.profiles p set role = a.role from public.allowed_emails a where lower(p.email) = a.email;
