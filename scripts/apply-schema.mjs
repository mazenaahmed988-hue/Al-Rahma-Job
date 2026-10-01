// scripts/apply-schema.mjs — يرفع schema.sql على قاعدة Supabase الحقيقية
// الاستخدام: node scripts/apply-schema.mjs
import fs from 'node:fs';
import postgres from 'postgres';

const url = process.env.SUPABASE_DB_URL
  ?? process.env.SUPABASE_DB_POOL_URL;

if (!url) {
  console.error('ناقص المتغير SUPABASE_DB_URL (سلسلة اتصال Postgres من Supabase > Project Settings > Database)');
  process.exit(1);
}

const sql = postgres(url, { ssl: 'prefer', prepare: false });
const schema = fs.readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8');

// ننفذ الملف كاملاً ككوتدى واحد (simple query protocol) عشان الـ $$ blocks تشتغل
await sql.unsafe(schema);
console.log('✅ schema.sql اترفع بنجاح');

const tables = await sql`select table_name from information_schema.tables where table_schema='public' order by 1`;
console.log('الجداول:', tables.map(t => t.table_name).join(', '));
const policies = await sql`select tablename, policyname from pg_policies where schemaname='public' order by 1,2`;
console.log('Policies:');
policies.forEach(p => console.log(`  - ${p.tablename} :: ${p.policyname}`));
const buckets = await sql`select id, public from storage.buckets`;
console.log('Buckets:', buckets.map(b => `${b.id}(${b.public ? 'public' : 'private'})`).join(', '));
await sql.end();
