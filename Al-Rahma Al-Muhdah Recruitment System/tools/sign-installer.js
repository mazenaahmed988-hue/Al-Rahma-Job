/**
 * sign-installer.js — بيوقّع ملف التسطيب النهائي بعد ما البناء يخلص.
 *
 * ليه ده لازم؟ العميل بيفتح Setup.exe بالdbl-click، فده الملف اللي
 * لازم يكون موقّع عشان رسالة "Unknown Publisher" متظهرش.
 *
 * التشغيل:  node tools/sign-installer.js
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const toolsRoot = path.join(root, 'tools', 'win-tools');
const distDir = path.join(root, 'dist');
const pfx = path.join(root, 'certs', 'AlRahma-CodeSigning.pfx');
const PFX_PASS = process.env.CSC_KEY_PASSWORD;
if (!PFX_PASS) { console.error('❌ CSC_KEY_PASSWORD مش موجود'); process.exit(1); }

function findTool(fileName) {
  const stack = [toolsRoot];
  while (stack.length) {
    const dir = stack.pop();
    let items = [];
    try { items = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const item of items) {
      const full = path.join(dir, item.name);
      if (item.isDirectory()) stack.push(full);
      else if (item.name.toLowerCase() === fileName.toLowerCase()) return full;
    }
  }
  return null;
}

function verify(file) {
  const signtool = findTool('signtool.exe');
  try {
    const out = execFileSync(signtool, ['verify', '/pa', '/v', file], { stdio: 'pipe', encoding: 'utf8' });
    const signed = /Successfully Verified/i.test(out) || /Signed/i.test(out);
    return { ok: true, signed };
  } catch (err) {
    return { ok: false, signed: false, error: String(err.stdout || err.message).split('\n')[0] };
  }
}

const signtool = findTool('signtool.exe');
if (!signtool) { console.error('❌ signtool.exe مش موجود'); process.exit(1); }
if (!fs.existsSync(pfx)) { console.error('❌ الشهادة مش موجودة'); process.exit(1); }
if (!fs.existsSync(distDir)) { console.error('❌ مجلد dist مش موجود'); process.exit(1); }

// ملفات التسطيب + الـ exe الأساسي جوه win-unpacked
const targets = [];
for (const f of fs.readdirSync(distDir)) {
  if (!f.toLowerCase().endsWith('.exe')) continue;
  if (f.toLowerCase().includes('uninstaller')) continue;
  targets.push(path.join(distDir, f));
}
const unpacked = path.join(distDir, 'win-unpacked');
if (fs.existsSync(unpacked)) {
  for (const f of fs.readdirSync(unpacked)) {
    if (f.toLowerCase().endsWith('.exe')) targets.push(path.join(unpacked, f));
  }
}

let failed = 0;
for (const target of targets) {
  const name = path.basename(target);
  try {
    execFileSync(signtool, [
      'sign', '/f', pfx, '/p', PFX_PASS,
      '/fd', 'SHA256',
      '/tr', 'http://timestamp.digicert.com',
      '/td', 'SHA256',
      '/v', target,
    ], { stdio: 'pipe' });
    const v = verify(target);
    console.log(`✅ ${name}${v.signed ? ' — موقّع ومتحقق ✅' : ' — اتوقّع'}`);
  } catch (err) {
    failed++;
    console.log(`❌ ${name} — ${String(err.stdout || err.message).split('\n').find((l) => l.trim()) || 'فشل'}`);
  }
}

console.log(failed === 0 ? '\n🎉 كل الملفات اتوقّعت' : `\n⚠️ فشل توقيع ${failed} ملف`);
process.exit(failed === 0 ? 0 : 1);