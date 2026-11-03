-- ANNA HR: โปรไฟล์/บทบาท, แผนธุรกิจ, หัวข้อของแผน, ประวัติการตรวจ, โควตา AI

create table public.profiles (
  user_id uuid primary key references auth.users on delete cascade,
  email text,
  display_name text,
  role text not null default 'member' check (role in ('member', 'reviewer')),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create or replace function public.is_reviewer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where user_id = (select auth.uid()) and role = 'reviewer'
  );
$$;
revoke execute on function public.is_reviewer() from public, anon;
grant execute on function public.is_reviewer() to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, email, display_name)
  values (new.id, new.email, split_part(new.email, '@', 1));
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- คนที่สมัครไว้ก่อนสร้างตารางนี้
insert into public.profiles (user_id, email, display_name)
select id, email, split_part(email, '@', 1) from auth.users
on conflict (user_id) do nothing;

create policy "profiles: อ่านของตัวเอง หรือผู้ตรวจอ่านได้ทุกคน"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = user_id or (select public.is_reviewer()));

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid() references auth.users on delete cascade,
  title text not null default 'แผนธุรกิจของฉัน',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.plans enable row level security;
create trigger plans_updated_at before update on public.plans
for each row execute function public.set_updated_at();

create table public.plan_sections (
  plan_id uuid not null references public.plans on delete cascade,
  section_key text not null,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  data jsonb not null default '{}'::jsonb,
  status text not null default 'empty'
    check (status in ('empty', 'filling', 'review', 'approved', 'returned')),
  submitted_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (plan_id, section_key)
);
alter table public.plan_sections enable row level security;
create index plan_sections_status_idx on public.plan_sections (status);
create index plan_sections_user_idx on public.plan_sections (user_id);
create trigger plan_sections_updated_at before update on public.plan_sections
for each row execute function public.set_updated_at();

create table public.section_reviews (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans on delete cascade,
  section_key text not null,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  action text not null check (action in ('submitted', 'withdrawn', 'approved', 'returned')),
  note text not null default '',
  created_at timestamptz not null default now()
);
alter table public.section_reviews enable row level security;
create index section_reviews_plan_idx on public.section_reviews (plan_id, section_key, created_at);
create index section_reviews_user_idx on public.section_reviews (user_id);

create table public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.ai_usage enable row level security;
create index ai_usage_user_day_idx on public.ai_usage (user_id, created_at);

-- plans
create policy "plans: เจ้าของอ่านได้"
  on public.plans for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "plans: ผู้ตรวจอ่านแผนที่มีหัวข้อส่งตรวจแล้ว"
  on public.plans for select to authenticated
  using (
    (select public.is_reviewer())
    and exists (
      select 1 from public.plan_sections s
      where s.plan_id = plans.id and s.status in ('review', 'approved', 'returned')
    )
  );
create policy "plans: เจ้าของสร้างได้"
  on public.plans for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "plans: เจ้าของแก้ได้"
  on public.plans for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- plan_sections: เจ้าของแก้ได้เฉพาะตอนยังไม่ส่งตรวจ / ถูกส่งกลับ
create policy "plan_sections: เจ้าของอ่านได้"
  on public.plan_sections for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "plan_sections: ผู้ตรวจอ่านหัวข้อที่ส่งตรวจแล้ว"
  on public.plan_sections for select to authenticated
  using ((select public.is_reviewer()) and status in ('review', 'approved', 'returned'));
create policy "plan_sections: เจ้าของเพิ่มได้"
  on public.plan_sections for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and status in ('empty', 'filling')
    and exists (select 1 from public.plans p where p.id = plan_id and p.user_id = (select auth.uid()))
  );
create policy "plan_sections: เจ้าของแก้ได้เมื่อยังไม่ส่งตรวจ"
  on public.plan_sections for update to authenticated
  using ((select auth.uid()) = user_id and status in ('empty', 'filling', 'returned'))
  with check ((select auth.uid()) = user_id and status in ('empty', 'filling', 'returned'));

-- section_reviews: อ่านอย่างเดียว เขียนผ่านฟังก์ชันเท่านั้น
create policy "section_reviews: เจ้าของแผนหรือผู้ตรวจอ่านได้"
  on public.section_reviews for select to authenticated
  using (
    (select public.is_reviewer())
    or exists (select 1 from public.plans p where p.id = plan_id and p.user_id = (select auth.uid()))
  );

-- ai_usage
create policy "ai_usage: เจ้าของอ่านได้"
  on public.ai_usage for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "ai_usage: เจ้าของเพิ่มได้"
  on public.ai_usage for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- ส่งตรวจ
create or replace function public.submit_section(p_plan_id uuid, p_section_key text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  select s.status into v_status
  from public.plan_sections s
  join public.plans p on p.id = s.plan_id
  where s.plan_id = p_plan_id and s.section_key = p_section_key and p.user_id = (select auth.uid());
  if v_status is null then
    raise exception 'ไม่พบหัวข้อนี้';
  end if;
  if v_status not in ('filling', 'returned') then
    raise exception 'ส่งตรวจไม่ได้ในสถานะนี้';
  end if;
  update public.plan_sections
    set status = 'review', submitted_at = now()
    where plan_id = p_plan_id and section_key = p_section_key;
  insert into public.section_reviews (plan_id, section_key, user_id, action)
    values (p_plan_id, p_section_key, (select auth.uid()), 'submitted');
end;
$$;
revoke execute on function public.submit_section(uuid, text) from public, anon;
grant execute on function public.submit_section(uuid, text) to authenticated;

-- ถอนกลับมาแก้ (ก่อนผู้ตรวจตัดสิน)
create or replace function public.withdraw_section(p_plan_id uuid, p_section_key text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  select s.status into v_status
  from public.plan_sections s
  join public.plans p on p.id = s.plan_id
  where s.plan_id = p_plan_id and s.section_key = p_section_key and p.user_id = (select auth.uid());
  if v_status is distinct from 'review' then
    raise exception 'ถอนกลับไม่ได้ในสถานะนี้';
  end if;
  update public.plan_sections
    set status = 'filling', submitted_at = null
    where plan_id = p_plan_id and section_key = p_section_key;
  insert into public.section_reviews (plan_id, section_key, user_id, action)
    values (p_plan_id, p_section_key, (select auth.uid()), 'withdrawn');
end;
$$;
revoke execute on function public.withdraw_section(uuid, text) from public, anon;
grant execute on function public.withdraw_section(uuid, text) to authenticated;

-- ผู้ตรวจอนุมัติ / ส่งกลับ (แก้ data ไม่ได้)
create or replace function public.review_section(
  p_plan_id uuid,
  p_section_key text,
  p_action text,
  p_note text default ''
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  if not (select public.is_reviewer()) then
    raise exception 'เฉพาะผู้ตรวจเท่านั้น';
  end if;
  if p_action not in ('approved', 'returned') then
    raise exception 'การกระทำไม่ถูกต้อง';
  end if;
  if p_action = 'returned' and btrim(coalesce(p_note, '')) = '' then
    raise exception 'ต้องใส่ความเห็นเมื่อส่งกลับ';
  end if;
  select status into v_status from public.plan_sections
    where plan_id = p_plan_id and section_key = p_section_key;
  if v_status is null or v_status not in ('review', 'approved') then
    raise exception 'หัวข้อนี้ไม่ได้อยู่ในสถานะรอตรวจ';
  end if;
  update public.plan_sections set status = p_action where plan_id = p_plan_id and section_key = p_section_key;
  insert into public.section_reviews (plan_id, section_key, user_id, action, note)
    values (p_plan_id, p_section_key, (select auth.uid()), p_action, coalesce(btrim(p_note), ''));
end;
$$;
revoke execute on function public.review_section(uuid, text, text, text) from public, anon;
grant execute on function public.review_section(uuid, text, text, text) to authenticated;
