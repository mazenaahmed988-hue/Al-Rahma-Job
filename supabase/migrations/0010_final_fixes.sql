-- الإصلاحات النهائية: أعمدة الموظف الاختيارية وربط إتمام الرفع بظهور الملف
alter table public.employees
  alter column job_title drop not null,
  alter column phone drop not null,
  alter column address drop not null;

-- يضمن إن أي ملف اكتمل رفعه يفضل ظاهرًا للموظف
update public.payslips p
set is_visible = true
where p.status = 'available' and p.storage_path is not null;

-- تنظيف طابور الاختبارات القديم (الطلبات المكتملة/الفاشلة/المعلقة القديمة)
truncate table public.file_requests restart identity;

-- تفعيل بث التغييرات اللحظي للوحة الإدارة والـ Local Agent (بشكل idempotent)
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'file_requests'
  ) then
    alter publication supabase_realtime add table public.file_requests;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'payslips'
  ) then
    alter publication supabase_realtime add table public.payslips;
  end if;
end $$;
