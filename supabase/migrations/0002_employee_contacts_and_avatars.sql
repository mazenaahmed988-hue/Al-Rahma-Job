-- ── الترحيل: بيانات التواصل وصور الموظفين (المرحلة الثانية) ────────────
-- الأعمدة دي مستخدمة فعلاً في لوحة الإدارة. شغّل الملف ده مرة واحدة
-- إما من SQL Editor في Supabase Dashboard، أو بأمر:
--   $env:SUPABASE_ACCESS_TOKEN='sbp_...'; node scripts/push-schema.mjs

-- 1) أعمدة التليفون والعنوان
alter table public.employees add column if not exists phone text;
alter table public.employees add column if not exists address text;

-- 2) بucket خاص لصور الموظفين (غير عام، عشان مفيش رابط مباشر)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false)
on conflict (id) do nothing;

-- 3) صور الموظفين تُقرأ وتُكتب من الخادم بمفتاح الخدمة فقط،
--    فمفيش سياسات عامة على الـ storage.
--    المسار المتفق عليه: avatars/{employee_id}/{timestamp}.{ext}
