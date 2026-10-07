/**
 * فحص شامل لـ Migration 0009 — بيتأكد إن سايكل محرك المعالجة شغالة 100%.
 * التشغيل: node tools/verify-engine-schema.mjs
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

const ENV = readFileSync(path.join(here, '..', '.env.local'), 'utf8');
const env = Object.fromEntries(
  ENV.split(/\r?\n/)
    .filter((l) => l && !l.trim().startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    }),
);

const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
  // بدون الـ header ده، الـ POST بيرجع 201 بس فاضي — ومن غير الـ id مقدرش نكمّل الاختبار
  Prefer: 'return=representation',
};

const results = [];
function check(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function rest(pathname, options = {}) {
  const res = await fetch(`${URL_BASE}/rest/v1/${pathname}`, { headers, ...options });
  const text = await res.text();
  let body = null;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
}

// ══════════════════════════════════════════════════════════════
console.log('\n── 1) الأعمدة الجديدة ──');
const COLS = ['id', 'employee_id', 'local_path', 'status', 'payslip_id', 'year', 'month',
  'category', 'file_name', 'device_id', 'claimed_at', 'completed_at', 'storage_path', 'mime_type'];

for (const col of COLS) {
  const r = await rest(`file_requests?select=${col}&limit=1`);
  check(`عمود ${col}`, r.status === 200, r.status === 200 ? '' : `HTTP ${r.status}`);
}

// ══════════════════════════════════════════════════════════════
console.log('\n── 2) قيد الحالة يسمح بـ processing ──');
// بنجيب موظف حقيقي عشان نعمل طلب فعلي بحالات مختلفة
const emp = await rest('employees?select=id,full_name&limit=1');
const employeeId = emp.body?.[0]?.id;
check('في موظف في الجدول', Boolean(employeeId), emp.body?.[0]?.full_name ?? 'مفيش');

// ══════════════════════════════════════════════════════════════
console.log('\n── 3) دورة حياة الطلب كاملة ──');
let reqId = null;

if (employeeId) {
  // 3a) إدراج بحالة pending
  const ins = await rest('file_requests', {
    method: 'POST',
    body: JSON.stringify({
      employee_id: employeeId,
      local_path: 'K:\\HR\\Schema-Test.pdf',
      year: 2026,
      month: 1,
      category: 'مفردات مرتب',
      status: 'pending',
    }),
  });
  reqId = ins.body?.id ?? ins.body?.[0]?.id;
  check('إدراج طلب pending', ins.status === 201 && Boolean(reqId), `id=${reqId ?? 'n/a'} ${ins.status !== 201 ? JSON.stringify(ins.body) : ''}`);

  if (reqId) {
    // 3b) الحجز الذرّي: pending -> processing (المحرك بيعمل ده)
    const claim = await rest(`file_requests?id=eq.${reqId}&status=eq.pending`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'processing', claimed_at: new Date().toISOString(), device_id: 'SCHEMA-TEST' }),
    });
    check('الحجز: pending → processing', claim.status === 200, `HTTP ${claim.status}`);

    // 3c) التأكد إن الحالة بقت processing فعلاً
    const afterClaim = await rest(`file_requests?id=eq.${reqId}&select=status,device_id`);
    check('الحالة بقت processing', afterClaim.body?.[0]?.status === 'processing', afterClaim.body?.[0]?.status ?? '');
    check('اسم الجهاز اتسجل', afterClaim.body?.[0]?.device_id === 'SCHEMA-TEST', String(afterClaim.body?.[0]?.device_id));

    // 3d) الإكمال: completed
    const done = await rest(`file_requests?id=eq.${reqId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'completed',
        file_name: 'Schema-Test.pdf',
        file_size: 1234,
        mime_type: 'application/pdf',
        storage_path: `${employeeId}/2026/01-Schema-Test.pdf`,
        completed_at: new Date().toISOString(),
      }),
    });
    const afterDone = await rest(`file_requests?id=eq.${reqId}&select=status,storage_path`);
    check('الإكمال: completed', afterDone.body?.[0]?.status === 'completed', afterDone.body?.[0]?.status ?? `HTTP ${done.status}`);
    check('مسار التخزين اتسجل', Boolean(afterDone.body?.[0]?.storage_path), String(afterDone.body?.[0]?.storage_path));
  }
}

// ══════════════════════════════════════════════════════════════
console.log('\n── 4) رفض الحالة غير المسموحة ──');
if (employeeId) {
  const bad = await rest('file_requests', {
    method: 'POST',
    body: JSON.stringify({
      employee_id: employeeId,
      local_path: 'K:\\HR\\Bad.pdf',
      status: 'حالة-مش-موجودة',
    }),
  });
  check('يرفض حالة غير معروفة', bad.status >= 400, `HTTP ${bad.status} (متوقع رفض)`);
}

// ══════════════════════════════════════════════════════════════
console.log('\n── 5) relational: payslip_id مربوط فعلاً ──');
if (employeeId) {
  const ps = await rest('payslips?select=id,employee_id&employee_id=eq.' + employeeId + '&limit=1');
  const payslipId = ps.body?.[0]?.id;
  if (payslipId) {
    const link = await rest('file_requests', {
      method: 'POST',
      body: JSON.stringify({ employee_id: employeeId, local_path: 'K:\\HR\\Link.pdf', payslip_id: payslipId }),
    });
    const got = await rest(`file_requests?id=eq.${link.body?.id ?? link.body?.[0]?.id}&select=payslip_id`);
    check('ربط payslip_id شغال', got.body?.[0]?.payslip_id === payslipId, String(got.body?.[0]?.payslip_id));

    // FK rejection: لو حد حل id مش موجود
    const badFk = await rest('file_requests', {
      method: 'POST',
      body: JSON.stringify({ employee_id: employeeId, local_path: 'K:\\HR\\BadFk.pdf', payslip_id: '00000000-0000-0000-0000-000000000000' }),
    });
    check('يرفض payslip_id وهمي (FK)', badFk.status >= 400, `HTTP ${badFk.status}`);
    await rest(`file_requests?id=eq.${badFk.body?.id ?? badFk.body?.[0]?.id}`, { method: 'DELETE' });
  } else {
    console.log('ℹ️  مفيش payslips لهذا الموظف — تخطّي فحص الربط');
  }
}

// ══════════════════════════════════════════════════════════════
console.log('\n── 6) تنظيف بيانات الاختبار ──');
if (reqId) {
  const del = await rest(`file_requests?id=eq.${reqId}`, { method: 'DELETE' });
  check('حذف طلب الاختبار', del.status === 200 || del.status === 204, `HTTP ${del.status}`);
}

// ══════════════════════════════════════════════════════════════
console.log('\n── 7) عدّادات لوحة التحكم ──');
const counts = await rest('file_requests?select=status');
const rows = counts.body ?? [];
check('الاستعلام بالجدول شغال', Array.isArray(rows), `${rows.length} صف`);

// ══════════════════════════════════════════════════════════════
const failed = results.filter((r) => !r.pass);
console.log('\n' + '═'.repeat(58));
console.log(failed.length === 0
  ? `🎉 نجحت كل الاختبارات (${results.length}/${results.length}) — سايكل المحرك جاهزة 100%`
  : `⚠️  فشل ${failed.length} من ${results.length}: ${failed.map((f) => f.name).join(', ')}`);
console.log('═'.repeat(58));
process.exit(failed.length === 0 ? 0 : 1);