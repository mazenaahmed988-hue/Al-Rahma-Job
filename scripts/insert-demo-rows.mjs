// scripts/insert-demo-rows.mjs
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './.env.local' });

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const EMP = 'c87242d1-80af-4933-8103-d4cba8bdba90';

const rows = [
  { employee_id: EMP, category: 'مفردات مرتب', year: 2026, month: 9, month_label: 'سبتمبر', storage_path: `${EMP}/2026/9.pdf`, note: 'آخر ملف مرفوع', status: 'available', is_visible: true },
  { employee_id: EMP, category: 'حوافز', year: 2026, month: 9, month_label: 'سبتمبر', note: 'قيد التجهيز', status: 'pending', is_visible: true },
];

const ins = await admin.from('payslips').insert(rows);
if (ins.error) { console.error('insert ERR:', ins.error.message); process.exit(1); }
console.log('inserted rows:', ins.data?.length);

const all = await admin.from('payslips').select('month_label, category, year, status, storage_path');
console.log(JSON.stringify(all.data, null, 1));
