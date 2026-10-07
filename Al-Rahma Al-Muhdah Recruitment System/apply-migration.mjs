/**
 * يطبّق migration الـ Queue على Supabase عبر Management API.
 * الاستخدام: node apply-migration.mjs [رقم-الملف]
 * مثال:  node apply-migration.mjs 0009_file_request_details
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
// ملفات الـ SQL في supabase/migrations على مستوى المشروع، فوق مجلد البرنامج
const MIGRATIONS_DIR = existsSync(path.join(here, 'migrations'))
  ? path.join(here, 'migrations')
  : path.join(here, '..', 'supabase', 'migrations');

const ENV = readFileSync(new URL('./.env.local', import.meta.url), 'utf8');
const env = Object.fromEntries(
  ENV.split(/\r?\n/)
    .filter((l) => l && !l.trim().startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    }),
);

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF || env.SUPABASE_PROJECT_REF;

if (!TOKEN || !REF) {
  console.error('❌ محتاج SUPABASE_ACCESS_TOKEN و SUPABASE_PROJECT_REF');
  process.exit(1);
}

// ملف الـ migration: إما بالاسم الكامل، أو آخر ملف .sql موجود في المجلد
const arg = process.argv[2];
let sqlFile;
if (arg) {
  sqlFile = arg.endsWith('.sql') ? arg : `${arg}.sql`;
} else {
  const { readdirSync } = await import('node:fs');
  const all = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
  if (!all.length) {
    console.error(`❌ مفيش أي ملف .sql في ${MIGRATIONS_DIR}`);
    process.exit(1);
  }
  sqlFile = all[all.length - 1];
}

console.log(`📄 تطبيق: ${sqlFile}`);
const sql = readFileSync(path.join(MIGRATIONS_DIR, sqlFile), 'utf8');

const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: sql }),
});

const text = await res.text();
console.log(res.ok ? '✅ Migration اتطبق بنجاح' : `❌ فشل: ${res.status}\n${text}`);
process.exit(res.ok ? 0 : 1);