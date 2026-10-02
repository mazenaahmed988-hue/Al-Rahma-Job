import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Signed URL لملف الموظف — الرابط بيتعمل على السيرفر بمفتاح الخدمة
 * عشان مش بنديش صلاحيات storage للمستخدم.
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'BAD_REQUEST' }, { status: 400 });
  }

  const fileId = String(body?.fileId ?? '').trim();
  const nationalId = String(body?.nationalId ?? '').trim();

  if (!fileId || !nationalId) return NextResponse.json({ error: 'BAD_REQUEST' }, { status: 400 });

  const db = admin();

  // نتأكد إن الملف ده مربوط فعلاً بالموظف اللي بيطلبه
  const { data: employee } = await db.from('employees').select('id').eq('national_id', nationalId).maybeSingle();
  if (!employee) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  const { data: file } = await db
    .from('payslips')
    .select('id, storage_path, status, is_visible')
    .eq('id', fileId)
    .eq('employee_id', employee.id)
    .eq('is_visible', true)
    .maybeSingle();

  if (!file) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  if (file.status !== 'available') return NextResponse.json({ error: 'NOT_AVAILABLE' }, { status: 403 });
  if (!file.storage_path) return NextResponse.json({ error: 'NO_FILE' }, { status: 404 });

  const { data: signed, error } = await db.storage.from('payslips').createSignedUrl(file.storage_path, 120);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ url: signed.signedUrl });
}