// scripts/fix-db-final.mjs — إصلاح نهائي للنصوص: بحث بالرقم القومي + تحقق قراءة فعلي
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './.env.local' });

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 1) اقرأ الحالة الحالية أولًا
const before = await admin.from('employees').select('id, national_id, full_name, job_title');
console.log('BEFORE employees:', JSON.stringify(before.data, null, 1));

const empRow = before.data?.[0];
if (!empRow) { console.error('مفيش موظفين!'); process.exit(1); }
const EMP = empRow.id; // الـ ID الحقيقي من القاعدة

// 2) صلّح الموظف
const empFix = await admin.from('employees').update({
  full_name: 'أحمد محمد السيد',
  job_title: 'أخصائي موارد بشرية',
}).eq('id', EMP).select('full_name, job_title');
console.log('AFTER employee:', JSON.stringify(empFix.data, null, 1), empFix.error?.message ?? '');

// 3) اقرأ الملفات الحالية
const filesBefore = await admin.from('payslips').select('id, category, month_label, note, status');
console.log('BEFORE payslips:', JSON.stringify(filesBefore.data, null, 1));

// 4) صلّح كل ملف: الملف المتاح = مفردات مرتب/سبتمبر، والـ pending = حوافز
for (const f of filesBefore.data ?? []) {
  const patch = { month_label: 'سبتمبر' };
  if (f.status === 'available') { patch.category = 'مفردات مرتب'; patch.note = 'آخر ملف مرفوع'; }
  else { patch.category = 'حوافز'; patch.note = 'قيد التجهيز'; }
  const res = await admin.from('payslips').update(patch).eq('id', f.id).select('category, month_label, note');
  console.log(`fixed ${f.id.slice(0, 8)}:`, JSON.stringify(res.data?.[0]), res.error?.message ?? '');
}

// 5) تحقق نهائي — قراءة بعد الإصلاح
const verify = await admin.from('employees').select('full_name, job_title');
const verifyFiles = await admin.from('payslips').select('category, month_label, note, status');
console.log('VERIFY employee:', JSON.stringify(verify.data));
console.log('VERIFY payslips:', JSON.stringify(verifyFiles.data, null, 1));
