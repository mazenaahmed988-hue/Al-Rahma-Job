create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  created_at timestamptz not null default now()
);

-- employees must reference departments, so create employees AFTER departments
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  department_id uuid references public.departments(id) on delete set null,
  national_id text unique not null check (national_id ~ '^[0-9]{14}$'),
  full_name text not null,
  job_title text,
  phone text,
  address text,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
-- أعمدة بيانات التواصل (المرحلة الثانية: إدارة الموظفين)
alter table public.employees add column if not exists phone text;
alter table public.employees add column if not exists address text;

create table if not exists public.payslips (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  title text,
  category text not null default 'مفردات مرتب',
  year integer not null default extract(year from now()),
  month integer not null default 1 check (month between 1 and 12),
  month_label text not null default 'يناير',
  storage_path text,
  file_name text,
  mime_type text,
  local_path text,
  note text,
  status text not null default 'pending' check (status in ('available', 'pending')),
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  is_new boolean not null default true
);

alter table public.payslips add column if not exists category text not null default 'مفردات مرتب';
alter table public.payslips add column if not exists year integer not null default extract(year from now());
alter table public.payslips add column if not exists month integer not null default 1;
alter table public.payslips add column if not exists month_label text not null default 'يناير';
alter table public.payslips add column if not exists note text;
alter table public.payslips add column if not exists status text not null default 'pending';
alter table public.payslips add column if not exists is_visible boolean not null default true;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references public.employees(id) on delete set null,
  national_id text not null,
  message_type text not null default 'استفسار',
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.employees enable row level security;
alter table public.departments enable row level security;
alter table public.payslips enable row level security;
alter table public.messages enable row level security;

-- The public portal uses an Edge Function to resolve the national ID server-side.
-- No employee rows are exposed directly to the anonymous browser client.
-- Policies are created idempotently so the file can be re-run safely.
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'employees are never directly readable') then
    create policy "employees are never directly readable" on public.employees for select to anon using (false);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'departments are never directly readable') then
    create policy "departments are never directly readable" on public.departments for select to anon using (false);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'payslips are never directly readable') then
    create policy "payslips are never directly readable" on public.payslips for select to anon using (false);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'employees can send messages') then
    create policy "employees can send messages" on public.messages for insert to anon with check (char_length(body) between 1 and 2000);
  end if;
end $$;

-- The private bucket stores original PDFs. The employee-lookup Edge Function
-- returns only visible files belonging to the requested employee. The browser
-- then uses the returned storage_path to request a short-lived direct URL.
-- Upload convention: payslips/{employee_id}/{year}/{month}.pdf
insert into storage.buckets (id, name, public)
values ('payslips', 'payslips', false)
on conflict (id) do nothing;

create index if not exists payslips_employee_year_category_idx
  on public.payslips (employee_id, year, category, month);

-- Storage access is done through signed URLs generated server-side (Edge
-- Function / service role), so no storage policies for anon are required.
-- Admins upload PDFs with the service key into the path layout above.
