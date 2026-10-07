-- ══════════════════════════════════════════════════════════════
-- Local Agent — تفاصيل طلب الملف (Phase 3)
--  الهدف: البرنامج يحدّد صف الملف في جدول payslips ويخزّنه بنفس اصطلاح المسارات
--  Convention: payslips/{employee_id}/{year}/{month}.pdf
-- ══════════════════════════════════════════════════════════════

alter table public.file_requests
  add column if not exists payslip_id uuid references public.payslips (id) on delete cascade,
  add column if not exists year integer,
  add column if not exists month integer,
  add column if not exists category text,
  add column if not exists file_name text,
  -- الطلب اللي بيتعالج بيبدأ بحالة processing عشان جهازين ميعالجوش نفس الطلب
  add column if not exists device_id text;

-- السماح بالحالة الجديدة
alter table public.file_requests drop constraint if exists file_requests_status_check;
alter table public.file_requests
  add constraint file_requests_status_check
  check (status in ('pending', 'processing', 'completed', 'failed'));

create index if not exists file_requests_pending_idx
  on public.file_requests (status, created_at)
  where status in ('pending', 'processing');

comment on column public.file_requests.payslip_id is
  'صف الملف في payslips اللي الطلب ده بيوصلّله';
comment on column public.file_requests.device_id is
  'اسم الجهاز اللي آخذ الطلب، عشان نعرف مين هو اللي رفع الملف';