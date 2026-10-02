-- إضافة عمود مسار الملف المحلي لجدول الملفات
--Phase: ربط الملفات بالخادم المحلي (واجهة فقط حالياً)
-- الملف بيتسجل كنص في اللوحة، والربط الفعلي هيتعمل مع الخادم المحلي لاحقاً

alter table if exists public.payslips
  add column if not exists local_path text;

comment on column public.payslips.local_path is
  'مسار الملف على القرص المحلي مثال: K:\files\salary.pdf — للتسجيل اليدوي قبل الربط الآلي';
