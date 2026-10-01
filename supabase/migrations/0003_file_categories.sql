-- ── الترحيل 0003: مركز إدارة الملفات والأقسام (المرحلة الثالثة) ─────────
--
-- 1) جدول الأقسام الديناميكي: الأدمن يضيف الأقسام من اللوحة بدل ما تكون
--    ثابتة في الكود، وبيانات payslips.category بتاخد قيمتها منه.
create table if not exists public.payslip_categories (
  id uuid primary key default gen_random_uuid(),
  name text unique not null check (char_length(trim(name)) between 1 and 60),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- الأقسام الافتراضية اللي النظام كان شغال بيها
insert into public.payslip_categories (name, sort_order)
values ('مفردات مرتب', 1), ('حوافز', 2), ('جزاءات', 3)
on conflict (name) do nothing;

-- 2) بيانات الملف: اسم الملف الأصلي ونوعه، عشان التحميل يطلع بالاسم الصح
--    والعرض في الواجهة يبقى مفهوم.
alter table public.payslips add column if not exists file_name text;
alter table public.payslips add column if not exists mime_type text;
-- حالة الملف: available (جاهز للتحميل) أو pending (قيد التجهيز)
alter table public.payslips add column if not exists status text not null default 'pending';

-- 3) RLS: زي باقي الجداول، الوصول من لوحة الأدمن بمفتاح الخدمة فقط.
alter table public.payslip_categories enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'payslip_categories are never directly readable') then
    create policy "payslip_categories are never directly readable" on public.payslip_categories for select to anon using (false);
  end if;
end $$;

-- 4) المسار في الـ storage: payslips/{employee_id}/{year}/{month}-{timestamp}.{ext}
--   Bucket موجود بالفعل ومش عام (schema.sql الأصلي).
