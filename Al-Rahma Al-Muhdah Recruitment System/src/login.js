/**
 * شاشة الدخول — التحقق عبر Supabase Auth + حفظ الجلسة
 * ⚠️ كل نداءات الشبكة بتتحصل في الـ main process (عبر window.agent)
 *    عشان المفتاح السري مايفيشش في الواجهة خالص.
 */

const $ = (id) => document.getElementById(id);
const form = $('login-form');
const emailInput = $('email');
const passInput = $('password');
const submitBtn = $('submit-btn');
const btnLabel = $('btn-label');
const alertSlot = $('alert-slot');

// ── نافذة ──
const maxBtn = $('btn-max');
$('btn-min').addEventListener('click', () => window.agent.minimize());
maxBtn.addEventListener('click', () => window.agent.maximize());
$('btn-close').addEventListener('click', () => window.agent.close());
// أيقونة الزرار بتتبدّل حسب حالة النافذة (مكبّرة / عادية)
const MAX_ICON = '<rect x="5" y="5" width="14" height="14" rx="2" />';
const RESTORE_ICON = '<rect x="5" y="9" width="10" height="10" rx="2" /><path d="M9 5h8a2 2 0 0 1 2 2v8" />';
function paintMaxIcon(maximized) {
  maxBtn.querySelector('svg').innerHTML = maximized ? RESTORE_ICON : MAX_ICON;
  maxBtn.title = maximized ? 'استعادة' : 'تكبير';
}
window.agent.isMaximized().then(paintMaxIcon);
window.agent.onWindowState(paintMaxIcon);

// ── إظهار/إخفاء كلمة المرور ──
const EYE_OPEN = '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />';
const EYE_SHUT = '<path d="M9.9 5.2A9.7 9.7 0 0 1 12 5c6.4 0 10 7 10 7a17.7 17.7 0 0 1-3.2 4.2M6.6 6.6A17.6 17.6 0 0 0 2 12s3.6 7 10 7a9.8 9.8 0 0 0 4.1-.9" /><path d="m3 3 18 18" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />';

$('toggle-pass').addEventListener('click', () => {
  const showing = passInput.type === 'text';
  passInput.type = showing ? 'password' : 'text';
  $('eye-icon').innerHTML = showing ? EYE_OPEN : EYE_SHUT;
  passInput.focus();
});

// ── رسائل التنبيه ──
const ICONS = {
  error: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/>',
  ok: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.01"/>',
};

function alert(kind, text) {
  alertSlot.innerHTML =
    `<div class="alert alert--${kind}" role="alert">
       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICONS[kind]}</svg>
       <span>${text}</span>
     </div>`;
}

function clearAlert() { alertSlot.innerHTML = ''; }

function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  btnLabel.textContent = isLoading ? 'جارٍ التحقق...' : 'دخول';
  emailInput.disabled = isLoading;
  passInput.disabled = isLoading;
}

// ══════════════════════════════════════════════════════════════
//  تسجيل الدخول
// ══════════════════════════════════════════════════════════════
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearAlert();

  const email = emailInput.value.trim();
  const password = passInput.value;

  if (!email || !password) {
    alert('error', 'اكتب البريد الإلكتروني وكلمة المرور.');
    return;
  }

  setLoading(true);
  const res = await window.agent.signIn(email, password);

  if (!res.ok) {
    if (res.error === 'NOT_ADMIN') {
      alert('error', res.message);
    } else if (/invalid/i.test(res.error ?? '')) {
      alert('error', 'البريد الإلكتروني أو كلمة المرور غير صحيحة.');
    } else {
      alert('error', 'تعذّر تسجيل الدخول: ' + (res.error ?? 'خطأ غير معروف'));
    }
    setLoading(false);
    return;
  }

  alert('ok', 'تم الدخول بنجاح. جاري فتح لوحة التحكم...');
  setTimeout(() => window.location.replace('dashboard.html'), 450);
});

// ══════════════════════════════════════════════════════════════
//  الإقلاع — لو فيه جلسة صالحة، ندخل على طول
// ══════════════════════════════════════════════════════════════
(async function boot() {
  const env = await window.agent.getPublicEnv();
  if (!env.url || !env.anonKey) {
    alert('error', 'إعدادات Supabase ناقصة. اتأكد إن ملف .env.local موجود وفيه القيم المطلوبة.');
    setLoading(true);
    return;
  }

  const res = await window.agent.checkSession();
  if (res.ok) {
    window.location.replace('dashboard.html');
    return;
  }

  emailInput.focus();
})();