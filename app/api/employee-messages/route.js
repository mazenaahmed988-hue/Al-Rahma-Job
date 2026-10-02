import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * بديل محلي لـ Supabase Edge Function اسمها employee-messages.
 * GET  → جيب رسايل الموظف (وردود الإدارة)
 * POST → الموظف يبعت رسالة جديدة
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'BAD_REQUEST' }, { status: 400 });
  }

  const nationalId = String(body?.nationalId ?? '').trim();
  if (!nationalId) return NextResponse.json({ error: 'مفيش رقم قومي' }, { status: 400 });

  const db = admin();
  const { data: employee } = await db
    .from('employees')
    .select('id')
    .eq('national_id', nationalId)
    .maybeSingle();

  if (!employee) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  // الموظف بيبعت رسالة جديدة
  if (body?.message) {
    const text = String(body.message).trim();
    if (!text) return NextResponse.json({ error: 'الرسالة فاضية' }, { status: 400 });

    const { error } = await db.from('messages').insert({
      national_id: nationalId,
      employee_id: employee.id,
      message_type: String(body.messageType ?? 'استفسار'),
      body: text,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  // جلب رسايل الموظف + ردود الإدارة
  const { data, error } = await db
    .from('messages')
    .select('id, body, message_type, admin_reply, created_at, replied_at')
    .eq('national_id', nationalId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ messages: data ?? [] });
}