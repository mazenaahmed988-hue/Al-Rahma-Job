'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, BriefcaseBusiness, CalendarDays, Check, ChevronLeft, CircleUserRound, Download, FileText, IdCard, LogOut, Phone, Send, Share2, ShieldCheck, X } from 'lucide-react';
import { supabase, supabaseUrl, supabaseAnonKey } from '../lib/supabase';

function Logo({ compact = false }) { return <div className={`brand ${compact ? 'brand--compact' : ''}`}><img src="/assets/logo.png" alt="الرحمة المهداة للتوظيف" />{!compact && <span>بوابة الموظفين</span>}</div>; }
function GlassCard({ children, className = '' }) { return <section className={`glass-card ${className}`}>{children}</section>; }

function ShimmerSkeleton() { return <div className="files-skeleton" aria-label="جارٍ تحميل الملفات"><span /><span /><span /></div>; }

function ConfettiPop() { return <motion.div className="confetti-pop" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 1 }} aria-hidden="true">{Array.from({ length: 24 }, (_, index) => <i key={index} style={{ '--i': index }} />)}</motion.div>; }

function LoginScreen({ onLogin }) {
  const [nationalId, setNationalId] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  async function submit(event) {
    event.preventDefault(); setError(''); if (!/^\d{14}$/.test(nationalId)) return setError('أدخل الرقم القومي المكون من 14 رقمًا فقط.'); setLoading(true);
    // الاتصال مباشر بـ Supabase Production — مفيش أي داتا وهمية كـ fallback.
    let response, body = null;
    try {
      response = await fetch('/api/employee-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nationalId }),
      });
      body = await response.json().catch(() => null);
    } catch { response = null; }
    if (response?.ok && body?.id && body?.national_id) {
      onLogin({
        ...body,
        full_name: body.full_name ?? '',
        job_title: body.job_title ?? '',
        payslips: Array.isArray(body.payslips) ? body.payslips : [],
      });
    } else if (!response) setError('مفيش اتصال بالسيرفر. اتأكد من الإنترنت وجرب تاني.');
    else if (response.status === 400 || body?.error === 'INVALID_ID') setError(body?.message || 'الرقم القومي لازم يكون 14 رقم.');
    else if (response.status === 403 || body?.error === 'ACCOUNT_INACTIVE') setError('عذراً، حسابك غير نشط حالياً. يرجى مراجعة إدارة الموارد البشرية');
    else if (response.status === 404 || body?.error === 'NOT_FOUND') setError(body?.message || 'الرقم القومي غير مسجل.');
    else setError(body?.message || 'حصل خطأ في السيرفر. جرّب كمان شوية.');
    setLoading(false);
  }
  return <main className="login-page"><motion.div className="login-wrap" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7 }}><Logo /><GlassCard className="login-card"><div className="login-heading"><div className="icon-badge"><ShieldCheck size={21} /></div><div><h1>تسجيل الدخول</h1></div></div><form onSubmit={submit}><label htmlFor="nationalId">الرقم القومي</label><div className="input-wrap"><IdCard size={19} /><input id="nationalId" inputMode="numeric" maxLength={14} value={nationalId} onChange={(event) => setNationalId(event.target.value.replace(/\D/g, ''))} placeholder="أدخل 14 رقمًا" /></div><button className="primary-button" type="submit" disabled={loading}>{loading ? 'جارٍ التحقق...' : <>دخول <ChevronLeft size={18} /></>}</button>{error && <p className={`form-error ${error.startsWith('عذراً') ? 'form-error--blocked' : ''}`}>{error}</p>}</form><div className="secure-note"><ShieldCheck size={15} /> اتصال آمن</div></GlassCard></motion.div></main>;
}

function EmployeeCard({ data }) { const [tilt, setTilt] = useState({ x: 0, y: 0 }); return <motion.div className="tilt-wrap" onMouseMove={(event) => { const rect = event.currentTarget.getBoundingClientRect(); setTilt({ x: ((event.clientY - rect.top) / rect.height - .5) * -8, y: ((event.clientX - rect.left) / rect.width - .5) * 8 }); }} onMouseLeave={() => setTilt({ x: 0, y: 0 })} style={{ transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}><GlassCard className="details-card digital-card"><div className="card-shine" /><div className="section-title"><div><span className="section-kicker">ملف الموظف</span><h2>بياناتي</h2></div><ShieldCheck className="card-mark" size={18} /></div><div className="profile-row"><div className="avatar"><CircleUserRound size={32} /></div><div className="profile-name"><strong>{data.full_name}</strong></div></div><div className="identity-grid"><div><span>الرقم القومي</span><strong>{data.national_id}</strong></div></div></GlassCard></motion.div>; }

function FileCard({ file, onDownload, onShare }) {
  const available = file.status === 'available';
  const [downloadState, setDownloadState] = useState('idle');
  const [shareState, setShareState] = useState('idle');
  const [downloadedBefore, setDownloadedBefore] = useState(false);
  async function handleDownload() {
    setDownloadState('loading');
    await new Promise((resolve) => setTimeout(resolve, 650));
    setDownloadState('done');
    setDownloadedBefore(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    await onDownload(file);
    setDownloadState('idle');
  }
  async function handleShare() {
    setShareState('loading');
    const ok = await onShare(file);
    setShareState(ok === false ? 'idle' : 'done');
    await new Promise((resolve) => setTimeout(resolve, 900));
    setShareState('idle');
  }
  return (
    <GlassCard className="file-card">
      <div className="file-card-top">
        <div className="pdf-icon"><FileText size={19} /></div>
        <div className="document-info"><strong>{file.month_label}</strong><span>{file.category} <i>•</i> {file.year}</span></div>
        <span className={`file-status ${available ? 'file-status--ready' : 'file-status--pending'}`}>{available ? 'متاح' : 'قيد التجهيز'}</span>
      </div>
      {available && (
        <div className="document-actions">
          <motion.button className={`wide-download-button download-morph--${downloadState}`} onClick={handleDownload} disabled={downloadState !== 'idle'} aria-label={`اضغط هنا لتنزيل ${file.month_label}`}>
            <AnimatePresence mode="wait" initial={false}>
              {downloadState === 'loading'
                ? <motion.span key="loading" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="mini-spinner" />
                : downloadState === 'done'
                  ? <motion.span key="done" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="download-check">✓</motion.span>
                  : <motion.span key="idle" initial={{ scale: 0 }} animate={{ scale: 1 }} className="wide-download-label"><Download size={18} /> اضغط هنا لتنزيل الملف</motion.span>}
            </AnimatePresence>
          </motion.button>
          <motion.button whileTap={{ scale: .97 }} className="wide-share-button" onClick={handleShare} disabled={shareState !== 'idle'} aria-label={`شارك ${file.month_label} مع اصدقائك`}>
            <AnimatePresence mode="wait" initial={false}>
              {shareState === 'loading'
                ? <motion.span key="loading" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="mini-spinner" />
                : shareState === 'done'
                  ? <motion.span key="done" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="download-check">✓</motion.span>
                  : <motion.span key="idle" initial={{ scale: 0 }} animate={{ scale: 1 }} className="wide-share-label"><Share2 size={17} /> شارك الملف مع اصدقائك</motion.span>}
            </AnimatePresence>
          </motion.button>
        </div>
      )}
      {downloadedBefore && <p className="downloaded-before"><Check size={13} /> تم تحميله مسبقاً.. تقدر تحمله تاني في أي وقت</p>}
      {file.note && <p className="custom-note">{file.note}</p>}
      {!available && <div className="pending-state"><CalendarDays size={15} /> جاري تجهيز الملف</div>}
    </GlassCard>
  );
}

function EmptyFiles() { return <div className="empty-files"><img className="empty-files-logo" src="/assets/logo.png" alt="" aria-hidden="true" /><div className="empty-files-body"><FileText size={24} /><strong>مفيش ملفات مخصصة ليك دلوقتي</strong><span>أول ما الإدارة ترفع ملفاتك هتظهر هنا على طول.</span></div></div>; }

function FilesSection({ data, onDownload, onShare }) { const files = data.payslips || []; const years = [...new Set(files.map((file) => file.year))].sort((a, b) => b - a); const categories = [...new Set(files.map((file) => file.category))]; const [year, setYear] = useState(years[0] || new Date().getFullYear()); const [category, setCategory] = useState(categories[0] || 'مفردات مرتب'); const [loading, setLoading] = useState(true); useEffect(() => { const timer = window.setTimeout(() => setLoading(false), 650); return () => window.clearTimeout(timer); }, [year, category]); const visibleFiles = files.filter((file) => file.year === year && file.category === category).sort((a, b) => a.month - b.month); const hasAnyFiles = files.length > 0; return <GlassCard className="payslip-card files-section"><div className="section-title"><div><span className="section-kicker">المستندات</span><h2>ملفاتي</h2></div><span className="count-pill">{visibleFiles.length} شهر</span></div>{hasAnyFiles && <div className="filter-row"><div className="filter-group"><span>السنة</span><select value={year} onChange={(event) => setYear(Number(event.target.value))}>{years.map((item) => <option key={item}>{item}</option>)}</select></div><div className="category-tabs">{categories.map((item) => <motion.button whileTap={{ scale: .94 }} whileHover={{ y: -2 }} key={item} className={category === item ? 'is-active' : ''} onClick={() => setCategory(item)}>{item}</motion.button>)}</div></div>}{loading ? <ShimmerSkeleton /> : <motion.div className="files-list" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: .1 }}}}>{visibleFiles.length ? visibleFiles.map((file) => <motion.div key={file.id} variants={{ hidden: { opacity: 0, x: 18 }, show: { opacity: 1, x: 0, transition: { duration: .35 }}}}><FileCard file={file} onDownload={onDownload} onShare={onShare} /></motion.div>) : <EmptyFiles />}</motion.div>}</GlassCard>; }


function formatDate(value) { if (!value) return ''; return new Date(value).toLocaleString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }

function MyMessages({ nationalId }) {
  const [state, setState] = useState({ loading: true, messages: [], error: '' });

  useEffect(() => {
    let active = true;
    let interval;
    const loadMessages = async () => {
      if (!supabase) { if (active) setState({ loading: false, messages: [], error: '' }); return; }
      try {
        const response = await fetch('/api/employee-messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nationalId }),
          cache: 'no-store',
        });
        const payload = await response.json().catch(() => null);
        if (!active) return;
        if (!response.ok) setState((previous) => ({ ...previous, loading: false, error: payload?.error || 'LOAD_FAILED' }));
        else setState({ loading: false, messages: payload.messages || [], error: '' });
      } catch { if (active) setState((previous) => ({ ...previous, loading: false, error: 'NETWORK' })); }
    };
    loadMessages();
    interval = window.setInterval(loadMessages, 15000);
    return () => { active = false; window.clearInterval(interval); };
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
  const [contact, setContact] = useState(false); const [notifications, setNotifications] = useState(false); const [hasUnread, setHasUnread] = useState(false); const [showConfetti, setShowConfetti] = useState(false); const [replies, setReplies] = useState([]); const [liveFiles, setLiveFiles] = useState(data.payslips || []); const [newFiles, setNewFiles] = useState([]);
  useEffect(() => {
    let active = true;
    let interval;
    let isLoading = false;
    const seenKey = `alrahma-seen-notifications-${data.national_id}`;
    let initialized = false;
    const loadReplies = async () => {
      if (!supabase || isLoading) return;
      isLoading = true;
      try {
        const [replyResponse, profileResponse] = await Promise.all([
          fetch('/api/employee-messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nationalId: data.national_id }), cache: 'no-store' }),
          fetch('/api/employee-lookup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nationalId: data.national_id }), cache: 'no-store' }),
        ]);
        const [replyPayload, profilePayload] = await Promise.all([replyResponse.json().catch(() => null), profileResponse.json().catch(() => null)]);
        if (!active || !replyResponse.ok) return;
        const nextReplies = (replyPayload.messages || []).filter((message) => message.admin_reply);
        setReplies(nextReplies);
        const nextFiles = profileResponse.ok && Array.isArray(profilePayload?.payslips) ? profilePayload.payslips : data.payslips || [];
        setLiveFiles(nextFiles);
        let storedSeen = null;
        try { storedSeen = JSON.parse(window.localStorage.getItem(seenKey) || 'null'); } catch {}
        if (storedSeen === null) {
          storedSeen = { replies: nextReplies.map((message) => message.id), files: nextFiles.map((file) => file.id) };
          try { window.localStorage.setItem(seenKey, JSON.stringify(storedSeen)); } catch {}
        }
        const seenReplies = new Set(storedSeen.replies || []);
        const seenFiles = new Set(storedSeen.files || []);
        const addedFiles = initialized ? nextFiles.filter((file) => !seenFiles.has(file.id)) : [];
        setNewFiles(addedFiles);
        setHasUnread(nextReplies.some((message) => !seenReplies.has(message.id)) || addedFiles.length > 0);
        initialized = true;
      } catch { /* تحديث دوري؛ المحاولة التالية تعيد الاتصال تلقائياً */ }
      finally { isLoading = false; }
    };
    loadReplies();
    interval = window.setInterval(loadReplies, 15000);
    return () => { active = false; window.clearInterval(interval); };
  }, [data.national_id]);
  useEffect(() => { const currentKey = `alrahma-current-file-${new Date().getFullYear()}-${new Date().getMonth() + 1}`; if (!window.localStorage.getItem(currentKey)) { window.localStorage.setItem(currentKey, 'seen'); setShowConfetti(true); window.setTimeout(() => setShowConfetti(false), 1000); } }, []);
  const name = data.full_name || data.name;
  async function getFileUrl(file) { if (file.url) return file.url; if (file.storage_path) { try { const response = await fetch('/api/file-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileId: file.id, nationalId: data.national_id }) }); const payload = await response.json().catch(() => null); return response.ok ? (payload?.url ?? '') : ''; } catch { return ''; } } return ''; }
  async function download(file) { const url = await getFileUrl(file); if (!url) return; const fileName = file.file_name || `${file.category}-${file.month_label}-${file.year}.pdf`; try { const response = await fetch(url); if (!response.ok) throw new Error('FAILED'); const blob = await response.blob(); const objectUrl = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = objectUrl; link.download = fileName; document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(objectUrl), 4000); } catch { const link = document.createElement('a'); link.href = url; link.download = fileName; link.target = '_blank'; link.rel = 'noopener'; document.body.appendChild(link); link.click(); link.remove(); } }
  // زرار المشاركة الذكي: بنجيب الملف نفسه كـ Blob ونحوله File وبنفتح شاشة المشاركة
  async function share(file) { const url = await getFileUrl(file); if (!url) return false; const fileName = file.file_name || `${file.category}-${file.month_label}-${file.year}.pdf`; try { const response = await fetch(url); if (!response.ok) throw new Error('FAILED'); const blob = await response.blob(); const shareFile = new File([blob], fileName, { type: blob.type || 'application/pdf' }); if (navigator.canShare && navigator.canShare({ files: [shareFile] })) { await navigator.share({ files: [shareFile], title: `ملف ${file.category} - ${file.month_label} ${file.year}`, text: `ملف ${file.category} - ${file.month_label} ${file.year}` }); return true; } const text = `ملف ${file.category} - ${file.month_label} ${file.year}\n${url}`; window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer'); return true; } catch (error) { if (error?.name === 'AbortError') return false; const text = `ملف ${file.category} - ${file.month_label} ${file.year}\n${url}`; window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer'); return true; } }
  return <main className="dashboard-page">{showConfetti && <ConfettiPop />}<header className="topbar"><Logo compact /><div className="topbar-actions"><button className="notification-button" aria-label="الإشعارات" onClick={() => { const next = !notifications; setNotifications(next); if (next) { setHasUnread(false); try { window.localStorage.setItem(`alrahma-seen-notifications-${data.national_id}`, JSON.stringify({ replies: replies.map((message) => message.id), files: liveFiles.map((file) => file.id) })); } catch {} } }}><Bell size={22} />{hasUnread && <i />}</button><motion.button whileHover={{ scale: 1.04, x: -2 }} whileTap={{ scale: .96 }} className="logout-button" onClick={onLogout}><LogOut size={17} /><span>خروج</span></motion.button></div></header>{notifications && <div className="notification-popover glass-card"><strong>الإشعارات</strong>{newFiles.map((file) => <div key={`file-${file.id}`} className="notif-item"><span className="notif-title">ملف جديد متاح</span><span className="notif-body">{file.category} · {file.month_label} {file.year}</span></div>)}{replies.slice(0, 3).map((message) => <div key={message.id} className="notif-item"><span className="notif-title">رد جديد من إدارة الموارد البشرية</span><span className="notif-body">{message.admin_reply}</span><small>{formatDate(message.replied_at)}</small></div>)}{!replies.length && !newFiles.length && <span>مفيش إشعارات جديدة دلوقتي</span>}<small>{newFiles.length ? `${newFiles.length} ملف جديد` : replies.length ? `${replies.length} رد على رسائلك` : 'تحديث تلقائي'}</small><button onClick={() => { setHasUnread(false); setNotifications(false); try { window.localStorage.setItem(`alrahma-seen-notifications-${data.national_id}`, JSON.stringify({ replies: replies.map((message) => message.id), files: liveFiles.map((file) => file.id) })); } catch {} setContact(true); }}>عرض رسائلي</button></div>}<div className="dashboard-content"><motion.div className="dashboard-intro" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}><div><h1>أهلاً بك، {name}</h1><p>ملفاتك وبياناتك في مكان واحد.</p></div></motion.div><motion.div className="cards-stack" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .12 }}><EmployeeCard data={data} /><FilesSection data={{ ...data, payslips: liveFiles }} onDownload={download} onShare={share} /></motion.div><motion.button whileHover={{ y: -3 }} whileTap={{ scale: .98 }} className="help-strip" onClick={() => setContact(true)}><div className="help-icon"><Phone size={18} /></div><div><strong>تواصل معنا</strong><span>استفسار أو شكوى</span></div><ChevronLeft size={19} /></motion.button></div><footer className="dashboard-footer"><span>© ٢٠٢٦ الرحمة المهداة للتوظيف</span><span><ShieldCheck size={13} /> خصوصيتك أولويتنا</span></footer><AnimatePresence>{contact && <ContactModal nationalId={data.national_id} onClose={() => setContact(false)} />}</AnimatePresence></main>;
}

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [data, setData] = useState({ full_name: '', job_title: '', national_id: '', payslips: [] });

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
    const safeEmployee = {
      ...employeeData,
      full_name: employeeData?.full_name ?? '',
      job_title: employeeData?.job_title ?? '',
      payslips: Array.isArray(employeeData?.payslips) ? employeeData.payslips : [],
    };
    setData(safeEmployee);
    setLoggedIn(true);
    try {
      window.localStorage.setItem('alrahma-employee-session', JSON.stringify({ employee: safeEmployee, expiresAt: Date.now() + 24 * 60 * 60 * 1000 }));
    } catch {
      // localStorage ممكن يكون مقفول في وضع الخصوصية؛ الجلسة تفضل شغالة للصفحة الحالية.
    }
  }
  function logout() { window.localStorage.removeItem('alrahma-employee-session'); setLoggedIn(false); }
  return loggedIn ? <Dashboard data={data} onLogout={logout} /> : <LoginScreen onLogin={login} />;
}
