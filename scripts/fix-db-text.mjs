// scripts/fix-db-text.mjs — إصلاح النصوص العربية المخزنة (كانت اتكتبت mojibake من PowerShell)
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './.env.local' });

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const EMP = 'c87242d1-80af-4933-8103-d4cba8bdba90';

// 1) إصلاح بيانات الموظف
const emp = await admin.from('employees').update({
  full_name: 'أحمد محمد السيد',
  job_title: 'أخصائي موارد بشرية',
}).eq('id', EMP).select('full_name, job_title');
console.log('employee:', JSON.stringify(emp.data), emp.error?.message ?? '');

// 2) إصلاح نصوص الملفات
const fix = { month_label: 'سبتمبر', category: 'مفردات مرتب', note: 'آخر ملف مرفوع' };
const p1 = await admin.from('payslips').update(fix).eq('employee_id', EMP).eq('category', 'مفردات مرتب').select('month_label, category, note');
console.log('payslips(salary):', JSON.stringify(p1.data), p1.error?.message ?? '');

const p2 = await admin.from('payslips').update({ note: 'قيد التجهيز' }).eq('employee_id', EMP).eq('status', 'pending').select('note');
console.log('payslips(pending):', JSON.stringify(p2.data), p2.error?.message ?? '');

// 3) تحقق نهائي — نقرأ ونطبع
const check = await admin.from('employees').select('full_name, job_title').eq('id', EMP);
const files = await admin.from('payslips').select('month_label, category, note, status');
console.log('VERIFY:', JSON.stringify(check.data), JSON.stringify(files.data));
