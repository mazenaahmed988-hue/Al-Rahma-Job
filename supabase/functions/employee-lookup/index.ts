import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { nationalId } = await request.json();
    if (!/^\d{14}$/.test(nationalId)) return new Response(JSON.stringify({ error: 'INVALID_ID' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    // بنبحث بالرقم القومي بس (من غير فلتر is_active) عشان نفرّق بين
    // "الرقم مش موجود" و"الحساب موقوف" وندي رسالة مختلفة في كل حالة.
    const { data: employee, error } = await db.from('employees').select('id, full_name, job_title, national_id, avatar_url, is_active, payslips(id, category, year, month, month_label, storage_path, file_name, mime_type, note, status, is_visible, created_at)').eq('national_id', nationalId).maybeSingle();
    if (error) return new Response(JSON.stringify({ error: 'LOOKUP_FAILED' }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
    if (!employee) return new Response(JSON.stringify({ error: 'NOT_FOUND' }), { status: 404, headers: { ...cors, 'Content-Type': 'application/json' } });
    // الحساب موقوف: رفض الدخول برسالة واضحة بدل ما نرجّع بيانات.
    if (!employee.is_active) return new Response(JSON.stringify({ error: 'ACCOUNT_INACTIVE' }), { status: 403, headers: { ...cors, 'Content-Type': 'application/json' } });
    const avatarPath = employee.avatar_url;
    employee.payslips = (employee.payslips || []).filter((file) => file.is_visible);
    // صورة الموظف: بنوقّع رابط مؤقت لو موجودة، عشان الـ bucket خاص
    delete employee.is_active;
    if (avatarPath) {
      const { data: signedAvatar } = await db.storage.from('avatars').createSignedUrl(avatarPath, 300);
      employee.avatar_url = signedAvatar?.signedUrl ?? null;
    } else {
      employee.avatar_url = null;
    }
    // توقيع روابط قصيرة العمر من السيرفر (الـ bucket خاص فمفيش صلاحية للمتصفح)
    for (const file of employee.payslips) {
      if (file.status === 'available' && file.storage_path) {
        const { data: signed } = await db.storage.from('payslips').createSignedUrl(file.storage_path, 300);
        if (signed?.signedUrl) file.url = signed.signedUrl;
      }
      delete file.is_visible;
    }
    return new Response(JSON.stringify(employee), { headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' } });
  } catch { return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }); }
});
