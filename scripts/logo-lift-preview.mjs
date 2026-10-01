// scripts/logo-lift-preview.mjs — يعمل 3 نسخ بتفتيح مختلف ويجمّعهم في صورة واحدة للمقارنة
import sharp from 'sharp';
import { execFileSync } from 'node:child_process';

const lifts = [0.30, 0.42, 0.55];
const files = [];

for (const L of lifts) {
  const out = `qa-lift-${Math.round(L * 100)}.png`;
  execFileSync(process.execPath, ['scripts/make-logo.mjs'], {
    env: { ...process.env, LOGO_LIFT: String(L) },
    stdio: 'inherit',
  });
  await sharp('public/assets/logo.png').resize({ width: 600 }).toFile(out);
  files.push({ L, out });
}

// نجمعهم فوق بعض مع خلفية نفس تدرّج الموقع الأزرق
const w = 660, h = 900;
const layers = await Promise.all(files.map(async (f, i) => ({
  input: await sharp(f.out).toBuffer(),
  top: 30 + i * 290,
  left: 20,
})));
const labels = await Promise.all(files.map(async (f, i) => {
  const svg = `<svg width="180" height="40"><text x="0" y="28" font-family="Arial" font-size="22" fill="#102d52">LIFT ${f.L}</text></svg>`;
  return { input: Buffer.from(svg), top: 250 + i * 290, left: 20 };
}));

await sharp({ create: { width: w, height: h, channels: 3, background: { r: 232, g: 242, b: 255 } } })
  .composite([...layers, ...labels])
  .png()
  .toFile('qa-lift-compare.png');

console.log('اتعمل: qa-lift-compare.png');
