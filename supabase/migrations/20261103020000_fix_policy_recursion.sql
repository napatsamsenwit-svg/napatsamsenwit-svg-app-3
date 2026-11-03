-- แก้ policy ที่อ้างตารางข้ามกันจนวนซ้ำ: ย้ายการเช็กไปไว้ในฟังก์ชัน security definer

create or replace function public.owns_plan(p_plan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.plans where id = p_plan_id and user_id = (select auth.uid())
  );
$$;
revoke execute on function public.owns_plan(uuid) from public, anon;
grant execute on function public.owns_plan(uuid) to authenticated;

create or replace function public.plan_has_submitted(p_plan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.plan_sections
    where plan_id = p_plan_id and status in ('review', 'approved', 'returned')
  );
$$;
revoke execute on function public.plan_has_submitted(uuid) from public, anon;
grant execute on function public.plan_has_submitted(uuid) to authenticated;

drop policy "plans: ผู้ตรวจอ่านแผนที่มีหัวข้อส่งตรวจแล้ว" on public.plans;
create policy "plans: ผู้ตรวจอ่านแผนที่มีหัวข้อส่งตรวจแล้ว"
  on public.plans for select to authenticated
  using ((select public.is_reviewer()) and (select public.plan_has_submitted(id)));

drop policy "plan_sections: เจ้าของเพิ่มได้" on public.plan_sections;
create policy "plan_sections: เจ้าของเพิ่มได้"
  on public.plan_sections for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and status in ('empty', 'filling')
    and (select public.owns_plan(plan_id))
  );

drop policy "section_reviews: เจ้าของแผนหรือผู้ตรวจอ่านได้" on public.section_reviews;
create policy "section_reviews: เจ้าของแผนหรือผู้ตรวจอ่านได้"
  on public.section_reviews for select to authenticated
  using ((select public.is_reviewer()) or (select public.owns_plan(plan_id)));
