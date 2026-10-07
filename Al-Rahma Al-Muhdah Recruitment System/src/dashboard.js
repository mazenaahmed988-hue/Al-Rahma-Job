/**
 * الشاشة الرئيسية — اللوجو النابض + كروت الإحصائيات
 * ⚠️ كل نداءات الشبكة عبر window.agent (الـ main process).
 */

const $ = (id) => document.getElementById(id);

// ── نافذة ──
const maxBtn = $('btn-max');
$('btn-min').addEventListener('click', () => window.agent.minimize());
maxBtn.addEventListener('click', () => window.agent.maximize());
$('btn-close').addEventListener('click', () => window.agent.close());
const MAX_ICON = '<rect x="5" y="5" width="14" height="14" rx="2" />';
const RESTORE_ICON = '<rect x="5" y="9" width="10" height="10" rx="2" /><path d="M9 5h8a2 2 0 0 1 2 2v8" />';
function paintMaxIcon(maximized) {
  maxBtn.querySelector('svg').innerHTML = maximized ? RESTORE_ICON : MAX_ICON;
  maxBtn.title = maximized ? 'استعادة' : 'تكبير';
}
window.agent.isMaximized().then(paintMaxIcon);
window.agent.onWindowState(paintMaxIcon);

// ══════════════════════════════════════════════════════════════
//  اللوجو النابض — مؤشر الاتصال بصري بس (من غير نصوص)
// ══════════════════════════════════════════════════════════════
const heroGlow = $('hero-glow');

/** on = هالة ذهبية نابضة · off = رمادي باهت */
function setConnection(on) {
  heroGlow.classList.toggle('hero__glow--on', on);
  heroGlow.classList.toggle('hero__glow--off', !on);
}

// ══════════════════════════════════════════════════════════════
//  أنيميشن الأرقام — عدّاد تصاعدي من الصفر في خلال ثانية
// ══════════════════════════════════════════════════════════════
const COUNTER_MS = 1000;

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function animateNumber(el, target) {
  const from = Number(el.dataset.value ?? 0);
  const to = Number(target) || 0;
  el.dataset.value = String(to);

  // لو القيمة ما اتغيرتش، مش هنعمل أنيميشن تاني
  if (from === to) {
    el.textContent = String(to);
    return;
  }

  const start = performance.now();
  function step(now) {
    const t = Math.min(1, (now - start) / COUNTER_MS);
    el.textContent = String(Math.round(from + (to - from) * easeOutCubic(t)));
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

const CARD_IDS = ['card-pending', 'card-done', 'card-failed'];

function setCard(id, value) {
  animateNumber($(id), value);
}

async function renderStats() {
  const res = await window.agent.requestCounts();
  if (!res.ok) {
    CARD_IDS.forEach((id) => {
      $(id).dataset.value = '0';
      $(id).textContent = '0';
    });
    setConnection(false);
    return;
  }
  setCard('card-pending', res.pending);
  setCard('card-done', res.completed);
  setCard('card-failed', res.failed);
}

// ══════════════════════════════════════════════════════════════
//  الاتصال + تشغيل المحرك
// ══════════════════════════════════════════════════════════════
async function boot() {
  // حالة محايدة: رمادي باهت لحد ما نعرف النتيجة
  setConnection(false);

  const res = await window.agent.pingDatabase();
  if (res.ok) {
    setConnection(true);
    // تشغيل المحرك الذكي في الخلفية (من غير أي واجهة)
    await window.agent.startEngine();
  } else {
    setConnection(false);
  }

  await renderStats();
}

// ══════════════════════════════════════════════════════════════
//  أزرار التحكم
// ══════════════════════════════════════════════════════════════
$('btn-refresh').addEventListener('click', async () => {
  const box = $('btn-refresh');
  box.classList.add('ghost-btn--spin');
  await boot();
  setTimeout(() => box.classList.remove('ghost-btn--spin'), 600);
});

$('btn-logout').addEventListener('click', async () => {
  await window.agent.stopEngine();
  await window.agent.signOut();
  window.location.replace('login.html');
});

// ══════════════════════════════════════════════════════════════
//  الإقلاع
// ══════════════════════════════════════════════════════════════
(async function () {
  const session = await window.agent.checkSession();
  if (!session.ok) {
    window.location.replace('login.html');
    return;
  }
  await boot();

  // الإحصائيات تتغير فوراً مع أحداث Realtime القادمة من الـ main process.
  window.agent.onEngineRefreshStats(() => { renderStats(); });

  // شبكة أمان لو انقطع Realtime مؤقتاً.
  setInterval(renderStats, 20000);
})();