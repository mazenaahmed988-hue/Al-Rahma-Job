-- ── الترحيل: صلاحيات الأدمن (المصادق عليه) على جداول الإدارة ──────────
-- المشكلة: كل الجداول عندها RLS مُفعّل، والسياسات الحالية بتخص الـ anon بس.
-- أي مستخدم مصادق عليه (الأدمن) ما كانش عنده أي سياسة، فبيتقاله "غير مصرح"
-- حتى لو كان دوره admin.
--
-- الحل: نضيف دالة is_admin() تتحقق من app_metadata.role (وده حقل ما يقدرش
-- المستخدم يعدّله بنفسه، لازم مفتاح الخدمة)، وبعدين نبني عليها السياسات.

-- 1) دالة التحقق من الأدمن
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

-- 2) سياسات كاملة للأدمن على employees (قراءة/إضافة/تعديل/حذف)
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'employees' and policyname = 'admins manage employees') then
    create policy "admins manage employees" on public.employees
      for all to authenticated using (public.is_admin()) with check (public.is_admin());
  end if;
end $$;

-- 3) الأقسام: الأدمن يديرها كاملة
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'payslip_categories' and policyname = 'admins manage categories') then
    create policy "admins manage categories" on public.payslip_categories
      for all to authenticated using (public.is_admin()) with check (public.is_admin());
  end if;
end $$;

-- 4) الملفات: الأدمن يديرها (إضافة/تعديل/حذف) عشان يقدر يحدّث حالة الملفات
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'payslips' and policyname = 'admins manage payslips') then
    create policy "admins manage payslips" on public.payslips
      for all to authenticated using (public.is_admin()) with check (public.is_admin());
  end if;
end $$;

-- 5) الرسائل: الأدمن يقراها ويعلّم عليها مقروءة ويرد
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'messages' and policyname = 'admins manage messages') then
    create policy "admins manage messages" on public.messages
      for all to authenticated using (public.is_admin()) with check (public.is_admin());
  end if;
end $$;

-- 6) الأقسام (departments) للقراءة لو احتاجها الأدمن
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'departments' and policyname = 'admins manage departments') then
    create policy "admins manage departments" on public.departments
      for all to authenticated using (public.is_admin()) with check (public.is_admin());
  end if;
end $$;

-- 7) صلاحيات الجداول للدور authenticated (RLS لوحده مش كفاية)
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.employees to authenticated;
grant select, insert, update, delete on public.payslip_categories to authenticated;
grant select, insert, update, delete on public.payslips to authenticated;
grant select, insert, update, delete on public.messages to authenticated;
grant select, insert, update, delete on public.departments to authenticated;