-- ── الترحيل 0004: صندوق رسائل الموظفين (المرحلة الرابعة) ─────────────
--
-- كل رسالة يقدر يرد عليها الأدمن، والرد بيتخزن هنا مع تاريخ الرد.
alter table public.messages add column if not exists admin_reply text;
alter table public.messages add column if not exists replied_at timestamptz;

-- Useful index: inbox بتعرض الأحدث الأول
create index if not exists messages_created_at_idx
  on public.messages (created_at desc);
