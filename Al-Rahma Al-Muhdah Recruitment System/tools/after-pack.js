/**
 * afterPack hook — بيتنفّذ بعد ما electron-builder يجهّز مجلد التطبيق
 * وقبل ما يعمل installer الـ NSIS.
 *
 * الشغل اللي بيعمله:
 *   1) يحفر أيقونة اللوجو الرسمية في الـ exe (rcedit)
 *   2) يوقّع الـ exe بالشهادة ذاتية التوقيع (signtool)
 *
 * عملنا ده كـ hook عشان electron-builder في بيئتنا بيقف على
 * إنشاء الـ symlinks (Developer Mode مقفول وما فيش صلاحيات Admin)،
 * فبنعمل الخطوتين يدوي بدون ما نوقف عنDelivery.
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

module.exports = async function afterPack(context) {
  const { electronPlatformName, appOutDir, packager } = context;
  if (electronPlatformName !== 'win32') return;

  const root = path.join(__dirname, '..');
  const toolsRoot = path.join(root, 'tools', 'win-tools');
  const certsRoot = path.join(root, 'certs');
  const ico = path.join(root, 'build', 'icon.ico');
  const pfx = path.join(certsRoot, 'AlRahma-CodeSigning.pfx');
  const pfxPass = process.env.CSC_KEY_PASSWORD;
  if (!pfxPass) {
    console.log('  • afterPack: CSC_KEY_PASSWORD مش موجود، تخطّي التوقيع');
    return;
  }

  /** بيدوّر على الأداة في كل المسارات المحتملة (البنية بتختلف بين الإصدارات) */
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

  const rcedit = findTool('rcedit-x64.exe');
  const signtool = findTool('signtool.exe');
  if (rcedit) console.log(`  • afterPack: rcedit = ${rcedit}`);
  if (signtool) console.log(`  • afterPack: signtool = ${signtool}`);

  const exeName = `${packager.appInfo.productFilename}.exe`;
  const exe = path.join(appOutDir, exeName);

  if (!fs.existsSync(exe)) {
    console.log('  • afterPack: مفيش exe عالاسم المتوقع، بنتخطى');
    return;
  }

  // ── 1) حفر الأيقونة + بيانات الملف ──
  if (fs.existsSync(rcedit) && fs.existsSync(ico)) {
    try {
      execFileSync(rcedit, [
        exe,
        '--set-icon', ico,
        '--set-version-string', 'CompanyName', 'Al-Rahma Al-Muhdah',
        '--set-version-string', 'ProductName', 'منظومة الرحمة المهداة للتوظيف',
        '--set-version-string', 'FileDescription', 'منظومة الرحمة المهداة للتوظيف',
        '--set-version-string', 'InternalName', exeName,
        '--set-version-string', 'LegalCopyright', '(c) 2026 Al-Rahma Al-Muhdah',
        '--set-file-version', '1.0.0.0',
        '--set-product-version', '1.0.0.0',
      ], { stdio: 'pipe' });
      console.log('  • afterPack: الأيقونة اتحفرت في الـ exe ✅');
    } catch (err) {
      console.log(`  • afterPack: فشل حفر الأيقونة — ${err.message}`);
    }
  } else {
    console.log('  • afterPack: rcedit أو الأيقونة مش موجودين، بنتخطى');
  }

  // ── 2) توقيع الـ exe ──
  if (fs.existsSync(signtool) && fs.existsSync(pfx)) {
    try {
      execFileSync(signtool, [
        'sign', '/f', pfx, '/p', pfxPass,
        '/fd', 'SHA256',
        '/tr', 'http://timestamp.digicert.com',
        '/td', 'SHA256',
        '/v', exe,
      ], { stdio: 'pipe' });
      console.log('  • afterPack: الـ exe اتوقّع ✅');
    } catch (err) {
      console.log(`  • afterPack: فشل التوقيع — ${String(err.stdout || err.message)}`);
    }
  } else {
    console.log('  • afterPack: signtool أو الشهادة مش موجودين، بنتخطى');
  }
};