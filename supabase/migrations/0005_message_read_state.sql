-- ── الترحيل 0005: حالة القراءة في صندوق الوارد ────────────────────────
--
-- فلتر "مقروء / لم يتم الرد" في شاشة صندوق الوارد محتاج علَم على الرسالة.
alter table public.messages add column if not exists is_read boolean not null default false;
