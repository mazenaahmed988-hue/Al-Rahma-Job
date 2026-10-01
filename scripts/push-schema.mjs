// scripts/push-schema.mjs — يرفع supabase/schema.sql على مشروع Supabase عبر Management API
// الاستخدام: $env:SUPABASE_ACCESS_TOKEN='sbp_...'; node scripts/push-schema.mjs
import fs from 'node:fs';

const REF = 'qcqpvdaovnhhxerxwxsj';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!TOKEN) { console.error('ناقص SUPABASE_ACCESS_TOKEN'); process.exit(1); }

const raw = fs.readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8');

// تقسيم الذكي: بيفصل عند ';' بس بره بلوكات $$ ... $$
const statements = [];
let buf = '', inDollar = false;
for (const line of raw.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (trimmed.startsWith('--') && !buf.trim()) continue; // تعليقات مستقلة
  buf += line + '\n';
  if (trimmed.includes('$$')) inDollar = !inDollar;
  if (!inDollar && trimmed.endsWith(';')) { statements.push(buf.trim()); buf = ''; }
}
if (buf.trim()) statements.push(buf.trim());

console.log(`عدد الاستعلامات: ${statements.length}`);
let done = 0;
for (const stmt of statements) {
  const head = stmt.replace(/\s+/g, ' ').slice(0, 60);
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: stmt }),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error(`❌ فشل (${res.status}): ${head}...\n${errText}`);
    process.exit(1);
  }
  done++;
  console.log(`✅ ${done}/${statements.length} :: ${head}`);
}
console.log('🎉 الـ schema اترفع بالكامل');
