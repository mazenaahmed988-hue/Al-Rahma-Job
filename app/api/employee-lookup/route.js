import { NextResponse } from 'next/server';

const { createClient } = await import('@supabase/supabase-js');

const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * صورة الأفاتار مخزنة في bucket 'avatars' — بنجيب signed URL لوهي موجودة،
 * لأن المسار الخام مش بيشتغل من غير صلاحيات.
 */
async function signedAvatar(db, path) {
  if (!path) return null;
  // لو القيمة أصلاً رابط كامل، نسيبها زي ما هي
  if (/^https?:\/\//i.test(path)) return path;
  try {
    const { data, error } = await db.storage.from('avatars').createSignedUrl(path, 3600);
    return error ? null : (data?.signedUrl ?? null);
  } catch {
    return null;
  }
}

/**
 * بديل محلي لـ Supabase Edge Function اسمها employee-lookup.
 * بتدخّل بالرقم القومي (14 رقم) وبترجّع بيانات الموظف + ملفاته المتاحة.
 */
export async function POST(request) {
  let nationalId = '';
  try {
    const body = await request.json();
    nationalId = String(body?.nationalId ?? '').trim();
  } catch {
    return NextResponse.json({ error: 'BAD_REQUEST' }, { status: 400 });
  }

  if (!/^\d{14}$/.test(nationalId)) {
    return NextResponse.json({ error: 'INVALID_ID' }, { status: 400 });
  }

  const db = admin();

  const { data: employee, error: empError } = await db
    .from('employees')
    .select('id, full_name, job_title, national_id, avatar_url, is_active')
    .eq('national_id', nationalId)
    .maybeSingle();

  if (empError) return NextResponse.json({ error: empError.message }, { status: 500 });
  if (!employee) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  // الموظف الموقوفمش بيقدردخل
  if (employee.is_active === false) {
    return NextResponse.json({ error: 'ACCOUNT_INACTIVE' }, { status: 403 });
  }

  // بس الملفات الظاهرة للموظف + المتاحة
  const { data: payslips, error: filesError } = await db
    .from('payslips')
    .select('id, category, year, month, month_label, note, status, storage_path, file_name, mime_type')
    .eq('employee_id', employee.id)
    .eq('is_visible', true)
    .order('year', { ascending: false })
    .order('month', { ascending: false });

  if (filesError) return NextResponse.json({ error: filesError.message }, { status: 500 });

  const visible = (payslips ?? [])
    .filter((p) => p.status === 'available')
    .map((p) => ({
      ...p,
      month_label: p.month_label ?? MONTHS[(p.month ?? 1) - 1],
    }));

  return NextResponse.json({
    id: employee.id,
    full_name: employee.full_name,
    job_title: employee.job_title ?? '',
    national_id: employee.national_id,
    // صورة الأفاتار مخزنة في bucket الصور، فبتجيب signed URL بدل المسار الخام
    avatar_url: await signedAvatar(db, employee.avatar_url),
    is_active: true,
    payslips: visible,
  });
}