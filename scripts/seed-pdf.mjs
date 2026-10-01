// scripts/seed-pdf.mjs — رفع PDF تجريبي على Storage + إدخال payslip + اختبار الدالة
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import dotenv from 'dotenv';
dotenv.config({ path: new URL('../.env.local', import.meta.url) });

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!SRK) { console.error('ناقص SUPABASE_SERVICE_ROLE_KEY في .env.local'); process.exit(1); }

const admin = createClient(URL_, SRK);

// 1) ملف PDF حقيقي مصغّر (one-pager)
const pdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 400 200] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 44 >> stream
BT /F1 18 Tf 60 100 Td (Alrahma Payslip OK) Tj ET
endstream endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
trailer << /Root 1 0 R >>`;

const EMP_ID = 'c87242d1-80af-4933-8103-d4cba8bdba90';
const PATH = `${EMP_ID}/2026/9.pdf`;

// 2) الرفع
const up = await admin.storage.from('payslips').upload(PATH, pdf, {
  contentType: 'application/pdf', upsert: true,
});
if (up.error) { console.error('رفع فشل:', up.error.message); process.exit(1); }
console.log('✅ PDF اترفع على:', PATH);

// 3) إدخال payslip (سبتمبر 2026 - متاح) + حافز (قيد التجهيز) عشان نجرب الحالتين
const rows = [
  { employee_id: EMP_ID, category: 'مفردات مرتب', year: 2026, month: 9, month_label: 'سبتمبر', storage_path: PATH, note: 'آخر ملف مرفوع', status: 'available', is_visible: true },
  { employee_id: EMP_ID, category: 'حوافز', year: 2026, month: 9, month_label: 'سبتمبر', note: 'قيد التجهيز', status: 'pending', is_visible: true },
];
const ins = await admin.from('payslips').upsert(rows, { onConflict: 'employee_id,year,month,category' });
// (لو مفيش unique constraint هندرج عادي)
if (ins.error) console.warn('upsert انذار:', ins.error.message);

// 4) نداء الدالة زي ما المتصفح بيعمل بالظبط (anon key)
const res = await fetch(`${URL_}/functions/v1/employee-lookup`, {
  method: 'POST',
  headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ nationalId: '29001011501234' }),
});
const data = await res.json();
console.log('الدالة:', res.status);
data.payslips?.forEach((f) => {
  console.log(`  - ${f.month_label} ${f.year} [${f.category}] ${f.status} url=${f.url ? 'SIGNED ✅' : '—'}`);
});

// 5) تحقق إن الرابط الموقّع بيترجع PDF فعلاً
const signed = data.payslips?.find((f) => f.url)?.url;
if (signed) {
  const head = await fetch(signed);
  console.log('الرابط الموقّع:', head.status, head.headers.get('content-type'));
}

// 6) تحقق الـ RLS: anon مش لازم يشوف أي حاجة مباشرة
const anon = createClient(URL_, ANON);
const probe = await anon.from('payslips').select('*');
console.log('RLS probe (لازم فاضي):', probe.error ? probe.error.message : `rows=${probe.data.length}`);
