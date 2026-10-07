-- ══════════════════════════════════════════════════════════════
--  Local Agent — جدول طلبات الملفات (Phase 1)
--  منظومة الرحمة المهداة للتوظيف
--
--  الفكرة: موقع الموظف بيعمل Insert بطلب pending + local_path،
--  والبرنامج المحلي (Electron) بيقرأ الملف من جهاز العميل،
--  يرفعه على Supabase Storage، ويحدّث الطلب لـ completed + file_url.
-- ══════════════════════════════════════════════════════════════

create table if not exists public.file_requests (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  local_path  text not null,
  status      text not null default 'pending'
                check (status in ('pending', 'completed', 'failed')),
  file_url    text,
  file_name   text,
  file_size   bigint,
  mime_type   text,
  storage_path text,
  error       text,
  claimed_at  timestamptz,
  completed_at timestamptz,
  created_at  timestamptz not null default now()
);

comment on table public.file_requests is
  'طابور طلبات الملفات — الموقع بينشئ الطلب، والبرنامج المحلي هو اللي بيتولى رفعه';
comment on column public.file_requests.local_path is
  'مسار الملف على جهاز العميل مثال: K:\HR\Ahmed.pdf';
comment on column public.file_requests.status is
  'pending = في الانتظار · completed = الملف اترفع · failed = فيه خطأ';

-- فهرس للاستعلامات السريعة (البرنامج بيستعلم بالترتيب + الحالة)
create index if not exists file_requests_created_at_idx
  on public.file_requests (created_at desc);

create index if not exists file_requests_status_idx
  on public.file_requests (status);

create index if not exists file_requests_employee_idx
  on public.file_requests (employee_id);

-- ══════════════════════════════════════════════════════════════
--  RLS: الموقع العام (anon) ينشئ طلبات ويقرأ طلبات موظفه بس،
--  والبرنامج المحلي (service_role) يتعامل بحرية.
-- ══════════════════════════════════════════════════════════════

alter table public.file_requests enable row level security;

drop policy if exists "anon can insert own request" on public.file_requests;
create policy "anon can insert own request"
  on public.file_requests for insert
  to anon, authenticated
  with check (true);

drop policy if exists "anon can read own requests" on public.file_requests;
create policy "anon can read own requests"
  on public.file_requests for select
  to anon, authenticated
  using (true);

-- ══════════════════════════════════════════════════════════════
--  Realtime — ضروري عشان البرنامج المحلي يستقبل الطلبات لحظياً
-- ══════════════════════════════════════════════════════════════

alter table public.file_requests replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'file_requests'
  ) then
    alter publication supabase_realtime add table public.file_requests;
    raise notice '✅ file_requests اتضافت لـ Realtime';
  else
    raise notice 'ℹ️  file_requests موجودة في Realtime بالفعل';
  end if;
end
$$;