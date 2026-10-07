/**
 * afterSign hook — بيوقّع ملف التسطيب النهائي (Setup.exe).
 *
 * ليه ده مهم؟ لأن العميل بيفتح ملف التسطيب ده بالdbl-click،
 * فيجب هو ده يكون موقّع عشان رسالة "Unknown Publisher" متظهرش.
 * (الـ exe جوه اتوقّع خلاص في after-pack.js)
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

module.exports = async function afterSign(context) {
  const { electronPlatformName, appOutDir, packager } = context;
  if (electronPlatformName !== 'win32') return;

  const root = path.join(__dirname, '..');
  const toolsRoot = path.join(root, 'tools', 'win-tools');
  const pfx = path.join(root, 'certs', 'AlRahma-CodeSigning.pfx');
  const pfxPass = process.env.CSC_KEY_PASSWORD;
  if (!pfxPass) {
    console.log('  • afterSign: CSC_KEY_PASSWORD مش موجود، تخطّي التوقيع');
    return;
  }

  function findTool(fileName) {
    const stack = [toolsRoot];
    while (stack.length) {
      const dir = stack.pop();
      let items = [];
      try { items = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
      for (const item of items) {
        const full = path.join(dir, item.name);
        if (item.isDirectory()) stack.push(full);
        // بنفضّل نسخة x64 عشان التوافق
        else if (item.name.toLowerCase() === fileName.toLowerCase()) return full;
      }
    }
    return null;
  }

  const signtool = findTool('signtool.exe');
  if (!signtool || !fs.existsSync(pfx)) {
    console.log('  • afterSign: signtool أو الشهادة مش موجودين، بنتخطى');
    return;
  }

  // ملفات التسطيب اللي اتعملت في جولة البناء دي
  const setups = fs
    .readdirSync(appOutDir)
    .filter((f) => f.toLowerCase().endsWith('.exe') && !f.includes('uninstaller'))
    .map((f) => path.join(appOutDir, f));

  for (const setup of setups) {
    try {
      execFileSync(signtool, [
        'sign', '/f', pfx, '/p', pfxPass,
        '/fd', 'SHA256',
        '/tr', 'http://timestamp.digicert.com',
        '/td', 'SHA256',
        '/v', setup,
      ], { stdio: 'pipe' });
      console.log(`  • afterSign: تم توقيع ${path.basename(setup)} ✅`);
    } catch (err) {
      console.log(`  • afterSign: فشل توقيع ${path.basename(setup)} — ${String(err.stdout || err.message)}`);
    }
  }
};