const { contextBridge, ipcRenderer } = require('electron');

/**
 * الجسر الآمن بين الـ main process والواجهة.
 * مفيش أي وصول مباشر لـ Node من الـ renderer.
 */
contextBridge.exposeInMainWorld('agent', {
  // ── التحكم في النافذة (من غير إطار) ──
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  toggleFullscreen: () => ipcRenderer.send('window:toggle-fullscreen'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  onWindowState: (cb) => {
    const listener = (_e, maximized) => cb(maximized);
    ipcRenderer.on('window:state', listener);
    return () => ipcRenderer.removeListener('window:state', listener);
  },

  // ── إعدادات Supabase العامة (ما فيهاوش المفتاح السري) ──
  getPublicEnv: () => ipcRenderer.invoke('env:get-public'),

  // ── المصادقة (كلها بتتحصل في الـ main process) ──
  signIn: (email, password) => ipcRenderer.invoke('auth:sign-in', { email, password }),
  checkSession: () => ipcRenderer.invoke('auth:check'),
  signOut: () => ipcRenderer.invoke('auth:sign-out'),

  // ── قاعدة البيانات ──
  pingDatabase: () => ipcRenderer.invoke('db:ping'),
  requestCounts: () => ipcRenderer.invoke('db:request-counts'),

  // ── المحرك الذكي (المرحلة 3) ──
  startEngine: () => ipcRenderer.invoke('engine:start'),
  stopEngine: () => ipcRenderer.invoke('engine:stop'),
  engineStatus: () => ipcRenderer.invoke('engine:status'),
  queue: () => ipcRenderer.invoke('engine:queue'),
  retryRequest: (id) => ipcRenderer.invoke('engine:retry', id),

  // بث الأحداث من المحرك للوحة التحكم
  onEngineLog: (cb) => {
    const listener = (_e, payload) => cb(payload);
    ipcRenderer.on('engine:log', listener);
    return () => ipcRenderer.removeListener('engine:log', listener);
  },
  onEngineStatus: (cb) => {
    const listener = (_e, payload) => cb(payload);
    ipcRenderer.on('engine:status', listener);
    return () => ipcRenderer.removeListener('engine:status', listener);
  },
  onEngineRefreshStats: (cb) => {
    const listener = () => cb();
    ipcRenderer.on('engine:refresh-stats', listener);
    return () => ipcRenderer.removeListener('engine:refresh-stats', listener);
  },

  // ── معلومات النظام ──
  getHostname: () => ipcRenderer.invoke('app:hostname'),
});