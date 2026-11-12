-- รีเซ็ตเว็บ: ผู้ตรวจกดปุ่มเดียว ทุกคนต้องล็อกอินใหม่ แม้เปิดเว็บใหม่ (เปลี่ยนรหัสรุ่นเซสชันทั้งระบบ)
create table if not exists public.app_settings (
  key text primary key,
  value text not null
);
alter table public.app_settings enable row level security;
insert into public.app_settings (key, value)
values ('session_epoch', gen_random_uuid()::text)
on conflict (key) do nothing;

create or replace function public.get_session_epoch()
returns text
language sql
stable
security definer
set search_path = ''
as $$ select value from public.app_settings where key = 'session_epoch' $$;
revoke execute on function public.get_session_epoch() from public, anon;
grant execute on function public.get_session_epoch() to authenticated;

create or replace function public.reset_all_sessions()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare v text := gen_random_uuid()::text;
begin
  if not public.is_reviewer() then
    raise exception 'เฉพาะผู้ตรวจเท่านั้นที่รีเซ็ตเว็บได้';
  end if;
  update public.app_settings set value = v where key = 'session_epoch';
  return v;
end;
$$;
revoke execute on function public.reset_all_sessions() from public, anon;
grant execute on function public.reset_all_sessions() to authenticated;
