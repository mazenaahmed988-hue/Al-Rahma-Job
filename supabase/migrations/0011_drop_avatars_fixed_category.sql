-- ══════════════════════════════════════════════════════════════
--  0011 — إلغاء صور الموظفين (Avatar) وتثبيت قسم الملفات
--  الرحمة المهداة للتوظيف
--
--  1) شيل عمود avatar_url من جدول الموظفين بالكامل.
--  2) شيل bucket الصور من الـ storage (مبقى له لزمة).
--  3) تثبيت قسم الملفات بقيمة ثابتة: 'شيت القبض'.
-- ══════════════════════════════════════════════════════════════

-- 1) إلغاء عمود صور الموظفين
alter table public.employees drop column if exists avatar_url;

-- 2) إزالة bucket الصور (لو موجود) — الصور مبقى لها أي استخدام
--    (بنمسح أي اوبجكتس متبقية الأول عشان حذف الـ bucket ميعملش خلاف)
delete from storage.objects where bucket_id = 'avatars';
delete from storage.buckets where id = 'avatars';

-- 3) الأقسام بقت ثابتة: قسم واحد اسمه 'شيت القبض'
--    (بنحافظ على الجدول عشان payslips.category يفضل مربوط بيه، بس بنخلي القيمة الوحيدة دي)
insert into public.payslip_categories (name, sort_order)
values ('شيت القبض', 1)
on conflict (name) do nothing;

-- نقل أي ملفات كانت على أقسام تانية للقسم الثابت
update public.payslips set category = 'شيت القبض' where category is distinct from 'شيت القبض';
update public.file_requests set category = 'شيت القبض' where category is distinct from 'شيت القبض';

-- حذف الأقسام القديمة التانية (اللي مبقى لها استخدام)
delete from public.payslip_categories where name <> 'شيت القبض';
