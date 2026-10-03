'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, BriefcaseBusiness, CalendarDays, Check, ChevronLeft, CircleUserRound, Download, FileText, FolderUp, IdCard, LogOut, Phone, Send, ShieldCheck, X } from 'lucide-react';
import { supabase, supabaseUrl, supabaseAnonKey } from '../lib/supabase';

const demoEmployee = {
  full_name: 'أحمد محمد السيد', job_title: 'أخصائي موارد بشرية', national_id: '29001011501234',
  payslips: [
    { id: 'jan-24', category: 'مفردات مرتب', year: 2024, month: 1, month_label: 'يناير', note: 'تمت مراجعة الملف', status: 'available', storage_path: '', url: '' },
    { id: 'mar-24', category: 'مفردات مرتب', year: 2024, month: 3, month_label: 'مارس', note: 'تمت مراجعة الملف', status: 'available', storage_path: '', url: '' },
    { id: 'jun-24', category: 'مفردات مرتب', year: 2024, month: 6, month_label: 'يونيو', note: 'تمت مراجعة الملف', status: 'available', storage_path: '', url: '' },
    { id: 'sep-24', category: 'حوافز', year: 2024, month: 9, month_label: 'سبتمبر', note: 'مكافأة الأداء السنوية', status: 'available', storage_path: '', url: '' },
    { id: 'dec-24', category: 'مفردات مرتب', year: 2024, month: 12, month_label: 'ديسمبر', note: 'تم أرشفة الملف', status: 'available', storage_path: '', url: '' },
    { id: 'jan-25', category: 'مفردات مرتب', year: 2025, month: 1, month_label: 'يناير', note: 'تمت مراجعة الملف', status: 'available', storage_path: '', url: '' },
    { id: 'mar-25', category: 'حوافز', year: 2025, month: 3, month_label: 'مارس', note: 'تم إضافة مكافأة', status: 'available', storage_path: '', url: '' },
    { id: 'may-25', category: 'مفردات مرتب', year: 2025, month: 5, month_label: 'مايو', note: 'تم تحديث البيانات', status: 'available', storage_path: '', url: '' },
    { id: 'aug-25', category: 'مفردات مرتب', year: 2025, month: 8, month_label: 'أغسطس', note: 'تمت مراجعة الملف', status: 'available', storage_path: '', url: '' },
    { id: 'nov-25', category: 'حوافز', year: 2025, month: 11, month_label: 'نوفمبر', note: 'حافز إضافي', status: 'available', storage_path: '', url: '' },
    { id: 'jan-26', category: 'مفردات مرتب', year: 2026, month: 1, month_label: 'يناير', note: 'الملف قيد التجهيز', status: 'pending', storage_path: '', url: '' },
    { id: 'mar-26', category: 'مفردات مرتب', year: 2026, month: 3, month_label: 'مارس', note: 'تمت مراجعة الملف', status: 'available', storage_path: '', url: '' },
    { id: 'jun-26', category: 'حوافز', year: 2026, month: 6, month_label: 'يونيو', note: 'مكافأة منتصف العام', status: 'available', storage_path: '', url: '' },
    { id: 'sep-26', category: 'مفردات مرتب', year: 2026, month: 9, month_label: 'سبتمبر', note: 'آخر ملف مرفوع', status: 'available', storage_path: '', url: '' },
  ],
};

function Logo({ compact = false }) { return <div className={`brand ${compact ? 'brand--compact' : ''}`}><img src="/assets/logo.png" alt="الرحمة المهداة للتوظيف" />{!compact && <span>بوابة الموظفين</span>}</div>; }
function GlassCard({ children, className = '' }) { return <section className={`glass-card ${className}`}>{children}</section>; }

function ShimmerSkeleton() { return <div className="files-skeleton" aria-label="جارٍ تحميل الملفات"><span /><span /><span /></div>; }

function ConfettiPop() { return <motion.div className="confetti-pop" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 1 }} aria-hidden="true">{Array.from({ length: 24 }, (_, index) => <i key={index} style={{ '--i': index }} />)}</motion.div>; }

function LoginScreen({ onLogin }) {
  const [nationalId, setNationalId] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  async function submit(event) {
    event.preventDefault(); setError(''); if (!/^\d{14}$/.test(nationalId)) return setError('أدخل الرقم القومي المكون من 14 رقمًا فقط.'); setLoading(true);
    if (supabase) {
      // بننادي الـ function مباشرة عشان نقدر نقرأ الـ status والرسالة،
      // لأن supabase.functions.invoke مش بيرجّع جسم الخطأ.
      let response, body = null;
      try {
        response = await fetch('/api/employee-lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nationalId }),
        });
        body = await response.json().catch(() => null);
      } catch { response = null; }
      if (response?.ok && body) onLogin(body);
      else if (response?.status === 403 || body?.error === 'ACCOUNT_INACTIVE') setError('عذراً، حسابك غير نشط حالياً. يرجى مراجعة إدارة الموارد البشرية');
      else setError('لم يتم العثور على موظف بهذا الرقم.');
    } else onLogin({ ...demoEmployee, national_id: nationalId });
    setLoading(false);
  }
  return <main className="login-page"><motion.div className="login-wrap" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7 }}><Logo /><GlassCard className="login-card"><div className="login-heading"><div className="icon-badge"><ShieldCheck size={21} /></div><div><h1>تسجيل الدخول</h1></div></div><form onSubmit={submit}><label htmlFor="nationalId">الرقم القومي</label><div className="input-wrap"><IdCard size={19} /><input id="nationalId" inputMode="numeric" maxLength={14} value={nationalId} onChange={(event) => setNationalId(event.target.value.replace(/\D/g, ''))} placeholder="أدخل 14 رقمًا" /></div><button className="primary-button" type="submit" disabled={loading}>{loading ? 'جارٍ التحقق...' : <>دخول <ChevronLeft size={18} /></>}</button>{error && <p className={`form-error ${error.startsWith('عذراً') ? 'form-error--blocked' : ''}`}>{error}</p>}</form><div className="secure-note"><ShieldCheck size={15} /> اتصال آمن</div></GlassCard></motion.div></main>;
}

function EmployeeCard({ data }) { const [tilt, setTilt] = useState({ x: 0, y: 0 }); return <motion.div className="tilt-wrap" onMouseMove={(event) => { const rect = event.currentTarget.getBoundingClientRect(); setTilt({ x: ((event.clientY - rect.top) / rect.height - .5) * -8, y: ((event.clientX - rect.left) / rect.width - .5) * 8 }); }} onMouseLeave={() => setTilt({ x: 0, y: 0 })} style={{ transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}><GlassCard className="details-card digital-card"><div className="card-shine" /><div className="section-title"><div><span className="section-kicker">ملف الموظف</span><h2>بياناتي</h2></div><ShieldCheck className="card-mark" size={18} /></div><div className="profile-row"><div className="avatar">{data.avatar_url ? <img src={data.avatar_url} alt="" /> : <CircleUserRound size={32} />}</div><div className="profile-name"><strong>{data.full_name}</strong></div></div><div className="identity-grid"><div><span>الرقم القومي</span><strong>{data.national_id}</strong></div></div></GlassCard></motion.div>; }

function FileCard({ file, onDownload, onWhatsApp }) { const available = file.status === 'available'; const [downloadState, setDownloadState] = useState('idle'); const [downloadedBefore, setDownloadedBefore] = useState(false); async function handleDownload() { setDownloadState('loading'); await new Promise((resolve) => setTimeout(resolve, 650)); setDownloadState('done'); setDownloadedBefore(true); await new Promise((resolve) => setTimeout(resolve, 500)); await onDownload(file); setDownloadState('idle'); } return <GlassCard className="file-card"><div className="file-card-top"><div className="pdf-icon"><FileText size={19} /></div><div className="document-info"><strong>{file.month_label}</strong><span>{file.category} <i>•</i> {file.year}</span></div><span className={`file-status ${available ? 'file-status--ready' : 'file-status--pending'}`}>{available ? 'متاح' : 'قيد التجهيز'}</span></div>{available && <div className="document-actions"><motion.button className={`icon-button icon-button--download download-morph download-morph--${downloadState}`} onClick={handleDownload} disabled={downloadState !== 'idle'} aria-label={`تحميل ${file.month_label}`} title="تحميل"><AnimatePresence mode="wait" initial={false}>{downloadState === 'loading' ? <motion.span key="loading" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="mini-spinner" /> : downloadState === 'done' ? <motion.span key="done" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="download-check">✓</motion.span> : <motion.span key="idle" initial={{ scale: 0 }} animate={{ scale: 1 }}><Download size={14} /></motion.span>}</AnimatePresence></motion.button><button className="icon-button icon-button--whatsapp" onClick={() => onWhatsApp(file)} aria-label={`حفظ ${file.month_label} للواتساب`} title="حفظ للواتساب"><Send size={13} /></button></div>}{downloadedBefore && <p className="downloaded-before"><Check size={13} /> تم تحميله مسبقاً.. تقدر تحمله تاني في أي وقت</p>}{file.note && <p className="custom-note">{file.note}</p>}{!available && <div className="pending-state"><CalendarDays size={15} /> جاري تجهيز الملف</div>}</GlassCard>; }

function EmptyFiles() { return <div className="empty-files"><img className="empty-files-logo" src="/assets/logo.png" alt="" aria-hidden="true" /><div className="empty-files-body"><FileText size={24} /><strong>مفيش ملفات مخصصة ليك دلوقتي</strong><span>أول ما الإدارة ترفع ملفاتك هتظهر هنا على طول.</span></div></div>; }

function FilesSection({ data, onDownload, onWhatsApp }) { const files = data.payslips || []; const years = [...new Set(files.map((file) => file.year))].sort((a, b) => b - a); const categories = [...new Set(files.map((file) => file.category))]; const [year, setYear] = useState(years[0] || new Date().getFullYear()); const [category, setCategory] = useState(categories[0] || 'مفردات مرتب'); const [loading, setLoading] = useState(true); useEffect(() => { const timer = window.setTimeout(() => setLoading(false), 650); return () => window.clearTimeout(timer); }, [year, category]); const visibleFiles = files.filter((file) => file.year === year && file.category === category).sort((a, b) => a.month - b.month); const hasAnyFiles = files.length > 0; return <GlassCard className="payslip-card files-section"><div className="section-title"><div><span className="section-kicker">المستندات</span><h2>ملفاتي</h2></div><span className="count-pill">{visibleFiles.length} شهر</span></div>{hasAnyFiles && <div className="filter-row"><div className="filter-group"><span>السنة</span><select value={year} onChange={(event) => setYear(Number(event.target.value))}>{years.map((item) => <option key={item}>{item}</option>)}</select></div><div className="category-tabs">{categories.map((item) => <motion.button whileTap={{ scale: .94 }} whileHover={{ y: -2 }} key={item} className={category === item ? 'is-active' : ''} onClick={() => setCategory(item)}>{item}</motion.button>)}</div></div>}{loading ? <ShimmerSkeleton /> : <motion.div className="files-list" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: .1 }}}}>{visibleFiles.length ? visibleFiles.map((file) => <motion.div key={file.id} variants={{ hidden: { opacity: 0, x: 18 }, show: { opacity: 1, x: 0, transition: { duration: .35 }}}}><FileCard file={file} onDownload={onDownload} onWhatsApp={onWhatsApp} /></motion.div>) : <EmptyFiles />}</motion.div>}</GlassCard>; }


const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

function UploadRequestModal({ nationalId, onClose }) {
  const now = new Date();
  const [localPath, setLocalPath] = useState('');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [category, setCategory] = useState('مفردات مرتب');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [rows, setRows] = useState([]);

  // حالة طلباتي — بتتحدّث كل 5 ثواني لحد ما الطلب يوصل "اتسلّم"
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch(`/api/file-request?nationalId=${encodeURIComponent(nationalId)}`);
        const payload = await response.json().catch(() => null);
        if (active && response.ok) setRows(payload.rows || []);
      } catch { /* نتجاهل ونجرب تاني */ }
    }
    load();
    const timer = window.setInterval(load, 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [nationalId]);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setDone('');
    setSending(true);
    try {
      const response = await fetch('/api/file-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nationalId, localPath, year, month, category }),
      });
      const payload = await response.json().catch(() => null);
      if (response.ok) {
        setDone(payload.message || 'استلمنا طلبك');
        setLocalPath('');
      } else setError(payload?.message || 'مقدرناش نبعت الطلب. جرّب تاني.');
    } catch {
      setError('مفيش اتصال بالسيرفر دلوقتي.');
    }
    setSending(false);
  }

  const label = (row) => `${row.category} — ${MONTHS_AR[(row.month || 1) - 1]} ${row.year}`;
  const stateText = { pending: 'في الانتظار', processing: 'بيرفع دلوقتي', completed: 'اتسلّم ✅', failed: 'فشل' };

  return <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
    <motion.div className="preview-modal glass-card upload-modal" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onClick={(event) => event.stopPropagation()}>
      <div className="modal-header">
        <div><span className="section-kicker">من جهازك</span><h2>أرسل ملف</h2></div>
        <button className="close-button" onClick={onClose} aria-label="إغلاق"><X size={18} /></button>
      </div>
      <p className="upload-hint">اكتب المسار الكامل للملف اللي على جهازك. البرنامج اللي شغال على جهازك هيلقط الطلب ويرفعه دلوقتي.</p>
      <form onSubmit={submit}>
        <label htmlFor="localPath">مسار الملف على جهازك</label>
        <div className="input-wrap"><FolderUp size={19} /><input id="localPath" dir="ltr" value={localPath} onChange={(event) => setLocalPath(event.target.value)} placeholder="K:\\HR\\Ahmed.pdf" /></div>
        <div className="upload-row">
          <div className="filter-group"><span>الشهر</span><select value={month} onChange={(event) => setMonth(Number(event.target.value))}>{MONTHS_AR.map((item, index) => <option key={item} value={index + 1}>{item}</option>)}</select></div>
          <div className="filter-group"><span>السنة</span><select value={year} onChange={(event) => setYear(Number(event.target.value))}>{[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
          <div className="filter-group"><span>النوع</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option>مفردات مرتب</option><option>حوافز</option><option>مستحقات</option></select></div>
        </div>
        <button className="primary-button full-button" type="submit" disabled={sending}>{sending ? 'جارٍ الإرسال...' : <><FolderUp size={17} /> ابعت الطلب</>}</button>
        {done && <p className="upload-success"><Check size={14} /> {done}</p>}
        {error && <p className="form-error">{error}</p>}
      </form>
      {rows.length > 0 && <div className="upload-history">
        <strong>طلباتي السابقة</strong>
        {rows.map((row) => <div key={row.id} className={`upload-history__row upload-history__row--${row.status}`}>
          <span>{label(row)}</span>
          <span className="upload-history__state">{stateText[row.status] ?? row.status}</span>
        </div>)}
      </div>}
    </motion.div>
  </motion.div>;
}

function formatDate(value) { if (!value) return ''; return new Date(value).toLocaleString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }

function MyMessages({ nationalId }) {
  const [state, setState] = useState({ loading: true, messages: [], error: '' });

  useEffect(() => {
    let active = true;
    (async () => {
      if (!supabase) { if (active) setState({ loading: false, messages: [], error: '' }); return; }
      try {
        const response = await fetch('/api/employee-messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nationalId }),
        });
        const payload = await response.json().catch(() => null);
        if (!active) return;
        if (!response.ok) setState({ loading: false, messages: [], error: payload?.error || 'LOAD_FAILED' });
        else setState({ loading: false, messages: payload.messages || [], error: '' });
      } catch { if (active) setState({ loading: false, messages: [], error: 'NETWORK' }); }
    })();
    return () => { active = false; };
  }, [nationalId]);

  if (state.loading) return <div className="messages-loading">جارٍ تحميل رسائلك...</div>;
  if (state.error) return <div className="messages-empty">مش قادرين نحمّل رسائلك دلوقتي. جرّب تاني كمان شوية.</div>;
  if (!state.messages.length) return <div className="messages-empty">لسه مابعتش أي رسالة. أي استفسار أو شكوى ابعت-us من الزرار تحت.</div>;

  return <div className="my-messages">{state.messages.map((message) => <article key={message.id} className={`my-message ${message.admin_reply ? 'has-reply' : ''}`}>
    <header><span className="type-pill">{message.message_type}</span><span className="message-date">{formatDate(message.created_at)}</span></header>
    <p className="my-message-text">{message.body}</p>
    {message.admin_reply
      ? <div className="my-reply"><div className="reply-head"><ShieldCheck size={15} /><strong>رد إدارة الموارد البشرية</strong><span>{formatDate(message.replied_at)}</span></div><p>{message.admin_reply}</p></div>
      : <div className="my-pending"><CalendarDays size={14} /> في انتظار رد الإدارة</div>}
  </article>)}</div>;
}

function ContactModal({ onClose, nationalId }) {
  const [body, setBody] = useState(''); const [sent, setSent] = useState(false); const [sending, setSending] = useState(false); const [tab, setTab] = useState('new');
  async function send(event) { event.preventDefault(); if (!body.trim()) return; setSending(true); if (supabase) { const response = await fetch('/api/employee-messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nationalId, message: body, messageType: 'استفسار' }) }); setSent(response.ok); } setSending(false); setBody(''); }
  return <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}><motion.div className="preview-modal glass-card contact-modal" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><span className="section-kicker">التواصل</span><h2>رسائلي</h2></div><button className="close-button" onClick={onClose}><X size={18} /></button></div>
    <div className="contact-tabs"><button className={tab === 'new' ? 'is-active' : ''} onClick={() => setTab('new')}>رسالة جديدة</button><button className={tab === 'history' ? 'is-active' : ''} onClick={() => setTab('history')}>رسائلي السابقة</button></div>
    {tab === 'history' ? <MyMessages nationalId={nationalId} /> : (sent ? <div className="success-message"><ShieldCheck size={32} /><strong>تم إرسال رسالتك</strong><span>سيراجعها فريق الموارد البشرية قريبًا.</span><button className="ghost-link" onClick={() => setTab('history')}>شوف رسائلي السابقة</button></div> : <form onSubmit={send}><label htmlFor="message">الرسالة</label><textarea id="message" value={body} onChange={(event) => setBody(event.target.value)} placeholder="اكتب استفسارك أو شكواك هنا..." rows="5" /><button className="primary-button full-button" disabled={sending}><Send size={17} /> {sending ? 'جارٍ الإرسال...' : 'إرسال الرسالة'}</button></form>)}
  </motion.div></motion.div>;
}

function Dashboard({ data, onLogout }) {
  const [contact, setContact] = useState(false); const [notifications, setNotifications] = useState(false); const [hasUnread, setHasUnread] = useState(true); const [showConfetti, setShowConfetti] = useState(false); const [replies, setReplies] = useState([]); const [upload, setUpload] = useState(false);
  useEffect(() => { let active = true; (async () => { if (!supabase) return; try { const response = await fetch('/api/employee-messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nationalId: data.national_id }) }); const payload = await response.json().catch(() => null); if (active && response.ok) setReplies((payload.messages || []).filter((m) => m.admin_reply)); } catch {} })(); return () => { active = false; }; }, [data.national_id]);
  useEffect(() => { const currentKey = `alrahma-current-file-${new Date().getFullYear()}-${new Date().getMonth() + 1}`; if (!window.localStorage.getItem(currentKey)) { window.localStorage.setItem(currentKey, 'seen'); setShowConfetti(true); window.setTimeout(() => setShowConfetti(false), 1000); } }, []);
  const name = data.full_name || data.name;
  async function getFileUrl(file) { if (file.url) return file.url; if (file.storage_path) { try { const response = await fetch('/api/file-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileId: file.id, nationalId: data.national_id }) }); const payload = await response.json().catch(() => null); return response.ok ? (payload?.url ?? '') : ''; } catch { return ''; } } return ''; }
  async function download(file) { const url = await getFileUrl(file); if (url) { const link = document.createElement('a'); link.href = url; link.download = file.file_name || `${file.category}-${file.month_label}-${file.year}`; link.target = '_blank'; link.rel = 'noopener'; document.body.appendChild(link); link.click(); link.remove(); } }
  async function whatsapp(file) { const url = await getFileUrl(file); const text = url ? `ملف ${file.category} - ${file.month_label} ${file.year}\n${url}` : `ملف ${file.category} - ${file.month_label} ${file.year}`; window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer'); }
  return <main className="dashboard-page">{showConfetti && <ConfettiPop />}<header className="topbar"><Logo compact /><div className="topbar-actions"><button className="notification-button" aria-label="الإشعارات" onClick={() => { setNotifications(!notifications); setHasUnread(false); }}><Bell size={22} />{(hasUnread || replies.length > 0) && <i />}</button><motion.button whileHover={{ scale: 1.04, x: -2 }} whileTap={{ scale: .96 }} className="logout-button" onClick={onLogout}><LogOut size={17} /><span>خروج</span></motion.button></div></header>{notifications && <div className="notification-popover glass-card"><strong>الإشعارات</strong>{replies.length ? replies.slice(0, 3).map((message) => <div key={message.id} className="notif-item"><span className="notif-title">رد جديد من إدارة الموارد البشرية</span><span className="notif-body">{message.admin_reply}</span><small>{formatDate(message.replied_at)}</small></div>) : <span>تم تحديث ملفاتك المتاحة</span>}<small>{replies.length ? `${replies.length} رد على رسائلك` : 'منذ يومين'}</small><button onClick={() => { setHasUnread(false); setNotifications(false); setContact(true); }}>عرض رسائلي</button></div>}<div className="dashboard-content"><motion.div className="dashboard-intro" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}><div><h1>أهلاً بك، {name}</h1><p>ملفاتك وبياناتك في مكان واحد.</p></div></motion.div><motion.div className="cards-stack" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .12 }}><EmployeeCard data={data} /><FilesSection data={data} onDownload={download} onWhatsApp={whatsapp} /></motion.div><motion.button whileHover={{ y: -3 }} whileTap={{ scale: .98 }} className="help-strip" onClick={() => setUpload(true)}><div className="help-icon"><FolderUp size={18} /></div><div><strong>أرسل ملف من جهازك</strong><span>البرنامج بيوصّله للسحابة</span></div><ChevronLeft size={19} /></motion.button><motion.button whileHover={{ y: -3 }} whileTap={{ scale: .98 }} className="help-strip" onClick={() => setContact(true)}><div className="help-icon"><Phone size={18} /></div><div><strong>تواصل معنا</strong><span>استفسار أو شكوى</span></div><ChevronLeft size={19} /></motion.button></div><footer className="dashboard-footer"><span>© ٢٠٢٦ الرحمة المهداة للتوظيف</span><span><ShieldCheck size={13} /> خصوصيتك أولويتنا</span></footer><AnimatePresence>{upload && <UploadRequestModal nationalId={data.national_id} onClose={() => setUpload(false)} />}</AnimatePresence><AnimatePresence>{contact && <ContactModal nationalId={data.national_id} onClose={() => setContact(false)} />}</AnimatePresence></main>;
}

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [data, setData] = useState(demoEmployee);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('alrahma-employee-session');
      if (!raw) return;
      const session = JSON.parse(raw);
      if (session?.expiresAt > Date.now() && session.employee?.national_id) {
        setData(session.employee);
        setLoggedIn(true);
      } else window.localStorage.removeItem('alrahma-employee-session');
    } catch { window.localStorage.removeItem('alrahma-employee-session'); }
  }, []);

  useEffect(() => {
    if (!loggedIn) return undefined;
    let timer;
    const logoutForInactivity = () => {
      window.localStorage.removeItem('alrahma-employee-session');
      setLoggedIn(false);
    };
    const resetTimer = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(logoutForInactivity, 15 * 60 * 1000);
    };
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((event) => window.addEventListener(event, resetTimer, { passive: true }));
    resetTimer();
    return () => { window.clearTimeout(timer); events.forEach((event) => window.removeEventListener(event, resetTimer)); };
  }, [loggedIn]);

  function login(employeeData) {
    setData(employeeData);
    setLoggedIn(true);
    window.localStorage.setItem('alrahma-employee-session', JSON.stringify({ employee: employeeData, expiresAt: Date.now() + 24 * 60 * 60 * 1000 }));
  }
  function logout() { window.localStorage.removeItem('alrahma-employee-session'); setLoggedIn(false); }
  return loggedIn ? <Dashboard data={data} onLogout={logout} /> : <LoginScreen onLogin={login} />;
}
