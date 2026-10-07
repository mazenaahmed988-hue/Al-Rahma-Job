const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// ── تحميل متغيرات البيئة من .env.local (بدون الحاجة لأي حزم خارجية) ──
function loadEnv() {
  const envPath = path.join(__dirname, '.env.local');
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#') || !line.includes('=')) continue;
    const i = line.indexOf('=');
    const key = line.slice(0, i).trim();
    let value = line.slice(i + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnv();

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 650,
    minWidth: 820,
    minHeight: 580,
    // مرونة كاملة: المستخدم يصغّر/يكبّر براحته، والحدود الدنيا تحمي التصميم
    resizable: true,
    maximizable: true,
    fullscreenable: true,
    show: false,
    frame: false,
    transparent: false,
    backgroundColor: '#FBF8F1',
    title: 'منظومة الرحمة المهداة للتوظيف',
    icon: fs.existsSync(path.join(__dirname, 'build', 'icon.ico'))
      ? path.join(__dirname, 'build', 'icon.ico')
      : path.join(__dirname, 'logo.jpg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // ── الصلاحيات ──
      // البرنامج مصمّم إنه يوصل لأي مسار على أي درايف (C, D, K, …) من غير تقييد،
      // ودي هما الإعدادات اللي بتسمح بده:
      //   · sandbox: false              → الـ preload يقدر يستخدم Node
      //   · contextIsolation: true      → الواجهة لسه معزولة وما تقدرش تعمل حاجة من نفسها
      //   · webSecurity: true (الافتراضي) → ومنع الوصول للملفات خارج البروتوكول من الواجهة
      // القيود الحقيقية على المسار بتفرضها دالة resolveLocalPath (تأكد إن الملف موجود فعلاً).
      sandbox: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  // بنظهر النافذة بعد ما الـ DOM يجهّز عشان متلومش أبداً
  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.loadFile(path.join(__dirname, 'src', 'login.html'));

  // روابط خارجية (واتساب مثلاً) تفتح في المتصفح مش جوه الـ shell
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('maximize', () => mainWindow.webContents.send('window:state', true));
  mainWindow.on('unmaximize', () => mainWindow.webContents.send('window:state', false));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── IPC: التحكم في النافذة ──
ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:close', () => mainWindow?.close());
ipcMain.on('window:maximize', () => {
  if (!mainWindow) return;
  mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
});
ipcMain.on('window:toggle-fullscreen', () => {
  if (!mainWindow) return;
  mainWindow.isFullScreen() ? mainWindow.setFullScreen(false) : mainWindow.setFullScreen(true);
});

// الواجهة محتاجة تعرف هل النافذة مكبّرة عشان تغيّر أيقونة الزرار
ipcMain.handle('window:is-maximized', () => Boolean(mainWindow?.isMaximized()));

// ── IPC: إعدادات Supabase للرندر (ما بنبعتش المفتاح السري للواجهة) ──
ipcMain.handle('env:get-public', () => ({
  url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  hasServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
}));// ══════════════════════════════════════════════════════════════
//  Supabase في الـ main process
//  كل نداءات الشبكة بتحصل هنا، والواجهة بتستقبل النتيجة بس.
//  ده بيخلي المفتاح السري مايفيشش في الواجهة خالص، وبيشيل
//  مشكلة تحميل مكتبة المتصفح من file:// بالكامل.
// ══════════════════════════════════════════════════════════════
const { createClient } = require('@supabase/supabase-js');

function anonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase URL / anon key غير موجود في .env.local');
  return createClient(url, key, { auth: { persistSession: false } });
}

/** بنحفظ الجلسة في الذاكرة (main process) عشان ما نعملش login مرتين */
let memorySession = null;

// ── تسجيل الدخول ──
ipcMain.handle('auth:sign-in', async (_event, { email, password }) => {
  try {
    const { data, error } = await anonClient().auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };
    if (data.user?.app_metadata?.role !== 'admin') {
      return { ok: false, error: 'NOT_ADMIN', message: 'الحساب ده مش مصرح له. لازم يكون حساب Admin.' };
    }
    memorySession = data.session;
    return { ok: true, user: { email: data.user.email, role: data.user.app_metadata.role } };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ── فحص الجلسة المحفوظة ──
ipcMain.handle('auth:check', async () => {
  if (!memorySession) return { ok: false, reason: 'NO_SESSION' };
  try {
    const { data, error } = await anonClient().auth.getUser(memorySession.access_token);
    if (error || !data?.user) {
      memorySession = null;
      return { ok: false, reason: 'EXPIRED' };
    }
    if (data.user.app_metadata?.role !== 'admin') {
      memorySession = null;
      return { ok: false, reason: 'NOT_ADMIN' };
    }
    return { ok: true, user: { email: data.user.email, role: 'admin' } };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
});

// ── تسجيل الخروج ──
ipcMain.handle('auth:sign-out', async () => {
  memorySession = null;
  stopEngine('LOGGED_OUT');
  return { ok: true };
});

// ── فحص الاتصال بقاعدة البيانات ──
ipcMain.handle('db:ping', async () => {
  try {
    const { error } = await anonClient().from('file_requests').select('id, local_path, status').limit(1);
    if (error) return { ok: false, error: error.message, code: error.code ?? null };
    const { error: colError } = await anonClient().from('file_requests').select('payslip_id, year, month, category').limit(1);
    if (colError) {
      return {
        ok: false,
        error: colError.message,
        code: colError.code ?? null,
        missingColumns: true,
      };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});// ── اسم الجهاز (لعرضه في كارت "اسم الجهاز") ──
ipcMain.handle('app:hostname', () => require('os').hostname());

// ── عدّاد الطلبات لكل حالة (لملء الكروت والإحصائيات) ──
ipcMain.handle('db:request-counts', async () => {
  try {
    const db = anonClient();
    const [total, pending, processing, completed, failed] = await Promise.all([
      db.from('file_requests').select('*', { count: 'exact', head: true }),
      db.from('file_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      db.from('file_requests').select('*', { count: 'exact', head: true }).eq('status', 'processing'),
      db.from('file_requests').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      db.from('file_requests').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
    ]);

    // لو الجدول لسه مش موجود بنرجّع رسالة واضحة بدل أرقام غلط
    if (total.error) return { ok: false, error: total.error.message };

    return {
      ok: true,
      total: total.count ?? 0,
      pending: pending.count ?? 0,
      processing: processing.count ?? 0,
      completed: completed.count ?? 0,
      failed: failed.count ?? 0,
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ══════════════════════════════════════════════════════════════
//  المحرك الذكي — Phase 3
//  الموقع بيرمي الطلب في file_requests، والبرنامج ده بيصطاده
//  لحظياً (Realtime)، بيقرأ الملف من جهاز العميل، بيرفعه على
//  Supabase Storage، وبيحدّث الطلب + صف الملف في payslips.
//  كل ده بـ service_role عشان يتعامل مع الجداول بحرية.
// ══════════════════════════════════════════════════════════════
const os = require('os');
const STORAGE_BUCKET = 'payslips';
const ALLOWED_EXT = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.webp']);
const MAX_BYTES = 25 * 1024 * 1024; // 25 ميجا سقف معقول

let serviceClient = null;
let engineStarted = false;
let engineStatus = { running: false, reason: 'IDLE' };
/** الطلبات اللي بنعالجها دلوقتي — عشان ما يتكررش نفس الطلب مرتين */
const inFlight = new Set();

function deviceName() {
  return os.hostname();
}

/** عميل service_role — أو fallback على anon لو المفتاح السري مش موجود */
function adminClient() {
  if (serviceClient) return serviceClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('مفيش إعدادات Supabase في .env.local');
  serviceClient = createClient(url, key, { auth: { persistSession: false } });
  return serviceClient;
}

function emit(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, payload);
}

/** رسالة واحدة لكل اللوحة */
function engineLog(kind, text) {
  emit('engine:log', { kind, text, at: new Date().toISOString() });
}

function setEngineStatus(next) {
  engineStatus = { ...engineStatus, ...next };
  emit('engine:status', engineStatus);
}

/** بنتحقق إن المسار محلي مطلق، موجود فعلاً، ومن نوع مسموح */
function resolveLocalPath(raw) {
  const input = String(raw ?? '').replace(/["']/g, '').trim();
  if (!input) throw new Error('المسار فاضي');
  if (!path.isAbsolute(input)) throw new Error('المسار لازم يكون كامل، مثل: K:\\HR\\Ahmed.pdf');
  const resolved = path.resolve(input);
  const ext = path.extname(resolved).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    throw new Error(`نوع الملف مش مدعوم (${ext || 'بدون امتداد'}). المسموح: PDF أو صور.`);
  }
  let stat;
  try {
    stat = fs.statSync(resolved);
  } catch {
    throw new Error('الملف مش موجود على الجهاز — اتأكد إن المسار صحيح');
  }
  if (!stat.isFile()) throw new Error('المسار ده مش ملف');
  if (stat.size === 0) throw new Error('الملف فاضي (0 بايت)');
  if (stat.size > MAX_BYTES) throw new Error('حجم الملف أكبر من 25 ميجا');
  return { resolved, size: stat.size, ext, name: path.basename(resolved) };
}

/** اصطلاح المسار في الـ storage: {employee_id}/{year}/{month}-{name} */
function storagePathFor(request, fileName) {
  const year = request.year ?? 'unknown';
  const month = String(request.month ?? 0).padStart(2, '0');
  const safeName = String(fileName).replace(/[^\w.\-؀-ۿ ]+/g, '_');
  return `${request.employee_id}/${year}/${month}-${safeName}`;
}

/**
 * طلب الحجز (claim): بنحدّث الحالة لـ processing بس لو كانت لسه pending،
 * فلو جهاز تاني آخدها قبلكم نفس اللحظة، مش هيقدر ياخدها مرتين.
 */
async function claimRequest(request) {
  const db = adminClient();
  const { data, error } = await db
    .from('file_requests')
    .update({ status: 'processing', claimed_at: new Date().toISOString(), device_id: deviceName() })
    .eq('id', request.id)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();
  if (error || !data) return false;
  return true;
}

async function failRequest(request, message) {
  try {
    await adminClient()
      .from('file_requests')
      .update({ status: 'failed', error: message, device_id: deviceName() })
      .eq('id', request.id);
  } catch { /* لو فشل التحديث نفسه مش هنوقّف البرنامج */ }
}

/** المعالجة الكاملة لطلب واحد */
async function processRequest(request) {
  const label = `${request.category ?? 'ملف'} ${request.month ?? '؟'} / ${request.year ?? '؟'}`;
  engineLog('info', `استلمنا طلب جديد: ${label}`);

  if (!(await claimRequest(request))) return; // جهاز تاني آخذه قبلنا

  try {
    const file = resolveLocalPath(request.local_path);
    engineLog('info', `قراءة الملف: ${file.name} (${Math.round(file.size / 1024)} كيلوبايت)`);

    const buffer = fs.readFileSync(file.resolved);
    const storagePath = storagePathFor(request, file.name);

    const { error: upErr } = await adminClient()
      .storage.from(STORAGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.ext === '.pdf' ? 'application/pdf' : `image/${file.ext.slice(1)}`,
        upsert: true,
      });
    if (upErr) throw new Error(`فشل الرفع: ${upErr.message}`);

    engineLog('ok', `اترفع على السحابة: ${storagePath}`);

    const { error: upErr2 } = await adminClient()
      .from('file_requests')
      .update({
        status: 'completed',
        file_name: file.name,
        file_size: file.size,
        mime_type: file.ext === '.pdf' ? 'application/pdf' : `image/${file.ext.slice(1)}`,
        storage_path: storagePath,
        file_url: storagePath,
        completed_at: new Date().toISOString(),
        error: null,
        device_id: deviceName(),
      })
      .eq('id', request.id);
    if (upErr2) throw new Error(`فشل تحديث الطلب: ${upErr2.message}`);

    // لو الطلب مربوط بصف ملف، نحدّثه كمان عشان تظهر للموظف على الموقع فوراً
    if (request.payslip_id) {
      const { error: payslipError } = await adminClient()
        .from('payslips')
        .update({ storage_path: storagePath, status: 'available', is_visible: true, local_path: file.resolved, file_name: file.name, mime_type: file.ext === '.pdf' ? 'application/pdf' : `image/${file.ext.slice(1)}` })
        .eq('id', request.payslip_id);
      if (payslipError) throw new Error(`فشل تحديث ظهور الملف: ${payslipError.message}`);
    }

    engineLog('ok', `تم التسليم — ${label} بقى متاح للموظف على الموقع`);
    emit('engine:refresh-stats', {});
  } catch (err) {
    engineLog('err', `فشل ${label}: ${err.message}`);
    await failRequest(request, err.message);
    emit('engine:refresh-stats', {});
  }
}

/** بيجيب الطلبات المعلقة وياكلها واحد واحد */
async function sweepQueue() {
  if (!engineStarted) return;
  try {
    const { data, error } = await adminClient()
      .from('file_requests')
      .select('id, employee_id, local_path, year, month, category, payslip_id')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10);
    if (error) throw error;
    if (!data?.length) return;
    for (const request of data) {
      if (inFlight.has(request.id)) continue;
      inFlight.add(request.id);
      processRequest(request).finally(() => inFlight.delete(request.id));
    }
  } catch (err) {
    engineLog('err', 'فشل قراءة الطابور: ' + err.message);
  }
}

let pollTimer = null;
let channel = null;
let presenceChannel = null;

// ── مؤشر النبض: قناة Presence بتبلّغ لوحة الإدارة إن البرنامج شغّال الآن ──
function startPresence() {
  try {
    const db = adminClient();
    presenceChannel = db
      .channel('agent-presence')
      .on('presence', { event: 'sync' }, () => {
        // مفيش حاجة نعملها هنا — لوحة الإدارة هي اللي بتسمع
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          try { await presenceChannel.track({ device: deviceName(), at: new Date().toISOString() }); } catch { /* ignore */ }
          engineLog('ok', 'Presence شغّال — لوحة الإدارة شايفة إن الوكيل متصل');
        }
      });
  } catch (err) {
    engineLog('err', 'مقدرتش أفتح قناة Presence: ' + err.message);
  }
}

function stopPresence() {
  if (presenceChannel) {
    try { adminClient().removeChannel(presenceChannel); } catch { /* ignore */ }
    presenceChannel = null;
  }
}

/** تشغيل المحرك: اشتراك Realtime + مؤقّت احتياطي يجيب أي طلب فاتته */
function startEngine() {
  if (engineStarted) return;
  engineStarted = true;
  setEngineStatus({ running: true, reason: 'RUNNING' });
  engineLog('info', `تشغيل محرك المعالجة على الجهاز: ${deviceName()}`);

  try {
    const db = adminClient();
    channel = db
      .channel('agent-queue')
      .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'file_requests', filter: 'status=eq.pending' },
        (payload) => {
          // أي تغيير من لوحة الإدارة ينعكس على الإحصائيات فوراً، بدون Refresh.
          emit('engine:refresh-stats', { event: payload.eventType, id: payload.new?.id ?? payload.old?.id });
          if (payload.eventType !== 'INSERT') return;
          const request = payload.new;
          if (!request || request.status !== 'pending') return;
          if (inFlight.has(request.id)) return;
          inFlight.add(request.id);
          processRequest(request).finally(() => inFlight.delete(request.id));
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') engineLog('ok', 'اشتراك Realtime شغال — الطلبات والإحصائيات بتتحدث لحظياً');
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') engineLog('warn', 'Realtime مش متأكد، هنكمل بالاستعلام الدوري');
      });
  } catch (err) {
    engineLog('err', 'مقدرتش أفتح قناة Realtime: ' + err.message);
  }

  // شبكة أمان: كل 10 ثواني نشوف لو فيه طلبات فاتتنا
  pollTimer = setInterval(sweepQueue, 10000);
  sweepQueue();
  startPresence();
}

function stopEngine(reason = 'STOPPED') {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
  if (channel) {
    try { adminClient().removeChannel(channel); } catch { /* ignore */ }
    channel = null;
  }
  stopPresence();
  engineStarted = false;
  setEngineStatus({ running: false, reason });
}

// المحرك يبدأ مع تسجيل الدخول وبيقف مع الخروج
ipcMain.handle('engine:start', () => {
  startEngine();
  return engineStatus;
});

ipcMain.handle('engine:stop', () => {
  stopEngine('LOGGED_OUT');
  return engineStatus;
});

ipcMain.handle('engine:status', () => engineStatus);

/** طلبات في الانتظار دلوقتي (للعرض في اللوحة) */
ipcMain.handle('engine:queue', async () => {
  try {
    const { data, error } = await adminClient()
      .from('file_requests')
      .select('id, category, year, month, local_path, status, error, created_at, completed_at')
      .order('created_at', { ascending: false })
      .limit(12);
    if (error) return { ok: false, error: error.message };
    return { ok: true, rows: data ?? [] };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

/** إعادة معالجة طلب فاشل يدوياً */
ipcMain.handle('engine:retry', async (_e, id) => {
  try {
    const { data, error } = await adminClient()
      .from('file_requests')
      .update({ status: 'pending', error: null })
      .eq('id', id)
      .select('id, employee_id, local_path, year, month, category, payslip_id')
      .maybeSingle();
    if (error || !data) return { ok: false, error: error?.message ?? 'الطلب مش موجود' };
    if (inFlight.has(data.id)) return { ok: false, error: 'الطلب شغال بالفعل' };
    inFlight.add(data.id);
    processRequest(data).finally(() => inFlight.delete(data.id));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// تفتيح/تنظيف عند الإغلاق
app.on('before-quit', () => stopEngine('QUIT'));