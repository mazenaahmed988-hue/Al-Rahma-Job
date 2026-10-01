import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

// Employee messages: الموظف بيشوف رسايله هو فقط (بالرقم القومي)،
// وبيشوف رد الإدارة عليها. مفيش أي صف بيترجع لغيره.
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { nationalId } = await request.json();
    if (!/^\d{14}$/.test(nationalId ?? '')) {
      return new Response(JSON.stringify({ error: 'INVALID_ID' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: employee, error: employeeError } = await db
      .from('employees')
      .select('id, full_name, is_active')
      .eq('national_id', nationalId)
      .maybeSingle();
    if (employeeError) return new Response(JSON.stringify({ error: 'LOOKUP_FAILED' }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
    if (!employee) return new Response(JSON.stringify({ error: 'NOT_FOUND' }), { status: 404, headers: { ...cors, 'Content-Type': 'application/json' } });
    if (!employee.is_active) return new Response(JSON.stringify({ error: 'ACCOUNT_INACTIVE' }), { status: 403, headers: { ...cors, 'Content-Type': 'application/json' } });

    const { data, error } = await db
      .from('messages')
      .select('id, message_type, body, created_at, admin_reply, replied_at')
      .eq('national_id', nationalId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) return new Response(JSON.stringify({ error: 'LOOKUP_FAILED' }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });

    return new Response(JSON.stringify({ full_name: employee.full_name, messages: data ?? [] }), {
      headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
