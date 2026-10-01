// scripts/make-logo.mjs — يشيل الخلفية البيج/التكستشر من اللوجو ويطلّع PNG شفاف
//                        وكمان بيلوّن الشعار ذهبي واضح (مش رمادي/كحلي فاتح)
// الاستخدام: node scripts/make-logo.mjs
import sharp from 'sharp';

const SRC = 'logo.jpg';
const OUT = 'public/assets/logo.png';
const LIFT = Number(process.env.LOGO_LIFT ?? 0); // تفتيح إضافي (0 = من غير تفتيح)

// ── درجات الذهبي الحقيقي ───────────────────────────────────────────
// الشعار متدرّج بين فاتح (نصوع الحرف) وغامق (بدن الحرف)، وده اللي بيدّي
// إحساس الذهب الحقيقي مش الطلاء المسطّح. الدرجتين متسحوبتين من الذهبي
// بتاع هوية الموقع نفسه (--gold في globals.css).
const GOLD = process.env.LOGO_COLOR
  ? process.env.LOGO_COLOR.split(',').map(Number)
  : [226, 183, 92]; // #e2b75c — ذهبي فاتح لامع
const GOLD_DEEP = process.env.LOGO_COLOR_DEEP
  ? process.env.LOGO_COLOR_DEEP.split(',').map(Number)
  : [166, 118, 30]; // #a6761e — ذهبي غامق (بدن الحرف)

const img = sharp(SRC).removeAlpha();
const meta = await img.metadata();
console.log('الأصل:', meta.width + 'x' + meta.height, meta.format);

const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;

// 1) الخلفية مش لون واحد — فيها تدرّج وتكستشر. فبنقيسها في شبكة نقط
//    (كل خلية 40 بكسل) ونعمل interpolation، فأي بكسل يقارن بلون الخلفية
//    المحلي بتاعه مش بلون متوسط واحد.
const CELL = 40;
const cols = Math.ceil(width / CELL) + 1;
const rows = Math.ceil(height / CELL) + 1;
const grid = Array.from({ length: rows * cols }, () => [0, 0, 0, 0]);

// كل بكسل يعطي صوته لخليته، بس البكسلات اللي لونها فاتح (خلفية مش شعار)
for (let y = 0; y < height; y++) {
  const cy = Math.min(rows - 1, Math.floor(y / CELL));
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * channels;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum < 150) continue; // ده شعار، مش خلفية
    const cx = Math.min(cols - 1, Math.floor(x / CELL));
    const cell = grid[cy * cols + cx];
    cell[0] += r; cell[1] += g; cell[2] += b; cell[3]++;
  }
}

// خلية فاضية (كله شعار) → ناخد متوسط الجيران
const cellColor = (cy, cx) => {
  const c = grid[cy * cols + cx];
  if (c[3] > 5) return [c[0] / c[3], c[1] / c[3], c[2] / c[3]];
  for (let rad = 1; rad < Math.max(rows, cols); rad++) {
    for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
      const ny = cy + dy, nx = cx + dx;
      if (ny < 0 || nx < 0 || ny >= rows || nx >= cols) continue;
      const n = grid[ny * cols + nx];
      if (n[3] > 5) return [n[0] / n[3], n[1] / n[3], n[2] / n[3]];
    }
  }
  return [234, 228, 217];
};

// بنملاحظ خلفية كل خلية في مصفوفة كاملة الأول (بدون حساب جيران وسط اللوب)
const bgGrid = [];
for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) bgGrid.push(cellColor(cy, cx));
const bgAt = (x, y) => {
  const fx = x / CELL, fy = y / CELL;
  const x0 = Math.max(0, Math.min(cols - 1, Math.floor(fx))), x1 = Math.min(cols - 1, x0 + 1);
  const y0 = Math.max(0, Math.min(rows - 1, Math.floor(fy))), y1 = Math.min(rows - 1, y0 + 1);
  const tx = fx - Math.floor(fx), ty = fy - Math.floor(fy);
  const c00 = bgGrid[y0 * cols + x0], c10 = bgGrid[y0 * cols + x1];
  const c01 = bgGrid[y1 * cols + x0], c11 = bgGrid[y1 * cols + x1];
  const mix = (a, b, t) => a + (b - a) * t;
  return [0, 1, 2].map((k) => mix(mix(c00[k], c10[k], tx), mix(c01[k], c11[k], tx), ty));
};
console.log(`شبكة الخلفية: ${cols}x${rows} خلية (كل خلية ${CELL}px)`);

// 2) كل بكسل: الشفافية = قد إيه هو بعيد عن لون الخلفية المحلي بتاعه
const NOISE = 22;  // أقل من كده = خلفية صافية
const FULL = 75;   // أكتر من كده = شعار كامل
const out = Buffer.alloc(width * height * 4);
let opaque = 0, clear = 0;
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const p = y * width + x, i = p * channels;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const [bg0, bg1, bg2] = bgAt(x, y);
    // عتبة الخلفية: الخلفية هنا فيها تكستشر فاتح، فالفرق البسيط ده هو "همس"
    // الورق مش شعار. بنشيله خالص عشان مايبقاش فيه مستطيل بيج باهت حوالين الكلام.
    const diff = Math.max(Math.abs(r - bg0), Math.abs(g - bg1), Math.abs(b - bg2));
    let a = (diff - NOISE) / (FULL - NOISE);
    a = a < 0 ? 0 : a > 1 ? 1 : a;
    a = Math.pow(a, 0.75); // شوية إحكام للحواف
    const o = p * 4;
    // اللون النقي: بنفك تركيب الشعار فوق الخلفية المحلية عشان مايبقاش هالة بيجة
    const un = (c, bgc) => (a > 0.02 ? Math.min(255, Math.max(0, (c - bgc * (1 - a)) / a)) : 0);
    // تحويل ذهبي حقيقي: الشعار في الأصل كحلي غامق، فبنستخدم "حبر" الحروف
    // (قد إيه البكسل غامق) عشان نحدد قوة الذهبي. بنظبط المنحنى (gamma) بحيث
    // حتى أفتح أجزاء الحروف الجوّانية توصل للذهبي الكامل — من غير أي خلط
    // مع الأبيض، عشان الذهبي يبقى مشبع وحقيقي ومش باهت ولا رمادي.
    //   0 = الذهبي الفاتح (نصوع الحرف) و 1 = الذهبي الغامق (بدن الحرف).
    const u0 = un(r, bg0), u1 = un(g, bg1), u2 = un(b, bg2);
    const ink = 1 - (0.299 * u0 + 0.587 * u1 + 0.114 * u2) / 255;
    const k = Math.min(1, Math.max(0, Math.pow(ink, 0.45)));
    const R = GOLD[0] + (GOLD_DEEP[0] - GOLD[0]) * k;
    const G = GOLD[1] + (GOLD_DEEP[1] - GOLD[1]) * k;
    const B = GOLD[2] + (GOLD_DEEP[2] - GOLD[2]) * k;
    out[o] = Math.round(R); out[o + 1] = Math.round(G); out[o + 2] = Math.round(B);
    out[o + 3] = Math.round(a * 255);
    if (a > 0.6) opaque++; else if (a < 0.1) clear++;
  }
}

// 3) نضيف إحكام أخير على الشفافية: أي بكسل شبه شفاف (بقايا خلفية/ظل خفيف)
//    بيكون "سمك ورق" — منخليهوش يطلع مستطيل. بنقطع السفلي ونرفع التباين.
for (let p = 0; p < width * height; p++) {
  const o = p * 4 + 3;
  let a = out[o] / 255;
  a = a < 0.35 ? 0 : (a - 0.35) / 0.65; // قص الحواف الشبه شفافة (بقايا الخلفية)
  out[o] = Math.round(Math.pow(a, 0.9) * 255);
}

// 4) نقصّ الفراغ الزيادة حوالي الشعار (trim) ونسجّل المساحة
const png = await sharp(out, { raw: { width, height, channels: 4 } })
  .trim({ threshold: 12 })
  .png({ compressionLevel: 9 })
  .toBuffer({ resolveWithObject: true });

await sharp(png.data).toFile(OUT);
console.log('النتيجة:', png.info.width + 'x' + png.info.height, '→', OUT,
  `(ذهبي #${GOLD.map((v) => v.toString(16).padStart(2, '0')).join('')} → #${GOLD_DEEP.map((v) => v.toString(16).padStart(2, '0')).join('')})`);
console.log(`نسبة الشعار ${(opaque / (width * height) * 100).toFixed(1)}% | الخلفية المزالة ${(clear / (width * height) * 100).toFixed(1)}%`);
