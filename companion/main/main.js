const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { app, BrowserWindow, Tray, Menu, ipcMain, Notification, nativeImage, screen } = require('electron');
const http = require('http');
const fs = require('fs');
const store = require('./store');
const ReminderEngine = require('./reminderEngine');

const RENDERER_PORT = 43110; // local static server so Clerk gets a real http origin
const BASE = `http://localhost:${RENDERER_PORT}`; // localhost origin keeps Clerk dev happy

let loginWin = null;
let dashboardWin = null;
let companionWin = null;
let tray = null;
let engine = null;
let isQuitting = false;

// ── tiny static server for renderer files (Clerk needs an http origin) ───────
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.json': 'application/json' };

function startRendererServer() {
  const root = path.join(__dirname, '../renderer');
  const server = http.createServer((req, res) => {
    if (req.url === '/config') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY || '',
        apiUrl: process.env.MEDDOC_API_URL || 'http://localhost:5000/api',
      }));
    }
    const urlPath = req.url.split('?')[0];
    const file = path.join(root, urlPath === '/' ? 'login.html' : urlPath);
    if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); return res.end('Not found'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  });
  server.listen(RENDERER_PORT, '127.0.0.1');
}

// ── windows ───────────────────────────────────────────────────────────────────
const PRELOAD = path.join(__dirname, '../preload/preload.js');

// Press F12 / Ctrl+Shift+I on any window to open Chromium DevTools (like browser inspect)
function enableDevtools(win) {
  win.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      win.webContents.toggleDevTools();
      event.preventDefault();
    }
  });
}

function createLoginWindow() {
  loginWin = new BrowserWindow({
    width: 480, height: 640, resizable: false,
    title: 'MedDoc Companion — Sign in',
    webPreferences: { preload: PRELOAD, contextIsolation: true, nodeIntegration: false },
  });
  loginWin.removeMenu();
  enableDevtools(loginWin);
  loginWin.loadURL(`${BASE}/login.html`);
  loginWin.on('closed', () => { loginWin = null; });
}

function createDashboardWindow() {
  dashboardWin = new BrowserWindow({
    width: 900, height: 700, minWidth: 720, minHeight: 560,
    title: 'MedDoc Companion',
    webPreferences: { preload: PRELOAD, contextIsolation: true, nodeIntegration: false },
  });
  dashboardWin.removeMenu();
  enableDevtools(dashboardWin);
  dashboardWin.loadURL(`${BASE}/dashboard.html`);
  // ✕ hides to tray instead of quitting — the companion keeps running
  dashboardWin.on('close', (e) => {
    if (!isQuitting) { e.preventDefault(); dashboardWin.hide(); }
  });
}

function createCompanionWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  // Sit above the Windows toast area (bottom-right) so system popups can't cover the buddy
  companionWin = new BrowserWindow({
    width: 450, height: 430,
    x: width - 470, y: height - 560,
    frame: false, transparent: true, alwaysOnTop: true,
    resizable: false, skipTaskbar: true, focusable: true,
    show: false, hasShadow: false,
    webPreferences: { preload: PRELOAD, contextIsolation: true, nodeIntegration: false },
  });
  companionWin.setAlwaysOnTop(true, 'screen-saver');
  companionWin.loadURL(`${BASE}/companion.html`);
  companionWin.on('close', (e) => {
    if (!isQuitting) { e.preventDefault(); companionWin.hide(); }
  });
}

// ── tray ──────────────────────────────────────────────────────────────────────
function trayIcon() {
  const custom = path.join(__dirname, '../assets/tray.png');
  if (fs.existsSync(custom)) return nativeImage.createFromPath(custom);
  // fallback: tiny embedded dot so the tray never fails
  const dot = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  return nativeImage.createFromDataURL(`data:image/png;base64,${dot}`).resize({ width: 16, height: 16 });
}

function createTray() {
  tray = new Tray(trayIcon());
  tray.setToolTip('MedDoc Companion — watching over you 💙');
  const menu = Menu.buildFromTemplate([
    { label: 'Open MedDoc Companion', click: () => showDashboard() },
    { type: 'separator' },
    { label: 'Pause reminders for 1 hour', click: () => store.save({ pausedUntil: Date.now() + 60 * 60 * 1000 }) },
    { label: 'Resume reminders', click: () => store.save({ pausedUntil: 0 }) },
    { type: 'separator' },
    { label: 'Quit', click: () => { isQuitting = true; app.quit(); } },
  ]);
  tray.setContextMenu(menu);
  tray.on('double-click', () => showDashboard());
}

function showDashboard() {
  if (!dashboardWin) createDashboardWindow();
  dashboardWin.show();
  dashboardWin.focus();
}

// Called when the website triggers meddoc-companion:// or a second launch happens.
// Opens the right window depending on whether the user is signed in.
function openApp() {
  if (store.load().loggedIn) {
    showDashboard();
  } else if (loginWin) {
    loginWin.show();
    loginWin.focus();
  } else {
    createLoginWindow();
  }
}

// ── reminder firing ───────────────────────────────────────────────────────────
function onReminderFire(type, msg) {
  // The buddy IS the notification — a native toast would pop up in the same
  // bottom-right corner and cover it, so we only toast as a fallback.
  if (companionWin && !companionWin.isDestroyed()) {
    companionWin.webContents.send('reminder', { type, ...msg, character: store.load().character });
    companionWin.showInactive(); // show without stealing focus from the user's work
    companionWin.moveTop();
  } else {
    new Notification({ title: `${msg.emoji} ${msg.title}`, body: msg.body, silent: false }).show();
  }
}

// ── IPC (renderer → main) ─────────────────────────────────────────────────────
function registerIpc() {
  ipcMain.handle('settings:get', () => store.load());
  ipcMain.handle('settings:save', (e, patch) => {
    const s = store.save(patch);
    if ('autoLaunch' in patch) {
      app.setLoginItemSettings({ openAtLogin: !!patch.autoLaunch });
    }
    return s;
  });

  // Verify the Clerk token against the MedDoc server FROM NODE (no browser CORS here)
  ipcMain.handle('auth:verify', async (e, { token }) => {
    const apiUrl = process.env.MEDDOC_API_URL || 'http://localhost:5000/api';
    try {
      const res = await fetch(`${apiUrl}/medications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return { ok: res.ok, status: res.status };
    } catch (err) {
      return { ok: false, status: 0, error: err.message };
    }
  });

  // login.html verified the Clerk session against the MedDoc API and hands us the result
  ipcMain.handle('auth:success', (e, { email }) => {
    store.save({ loggedIn: true, userEmail: email });
    if (loginWin) loginWin.close();
    createCompanionWindow();
    showDashboard();
    engine.start();
    return true;
  });

  ipcMain.handle('auth:logout', () => {
    engine.stop();
    store.save({ loggedIn: false, userEmail: '' });
    if (dashboardWin) { dashboardWin.destroy(); dashboardWin = null; }
    if (companionWin) { companionWin.destroy(); companionWin = null; }
    createLoginWindow();
    return true;
  });

  // buttons on the companion bubble
  ipcMain.handle('reminder:action', (e, { type, action }) => {
    if (action === 'done') engine.done(type);
    if (action === 'snooze') engine.snooze(type, 10);
    if (companionWin) companionWin.hide();
    return true;
  });

  // test button on the dashboard — fire a reminder right now
  ipcMain.handle('reminder:test', (e, type) => {
    const bodies = { medicine: 'Time to take: (test medicine)' };
    onReminderFire(type, {
      emoji: { water: '💧', lunch: '🍱', sit: '🚶', medicine: '💊' }[type],
      title: { water: 'Water time!', lunch: 'Lunch time!', sit: 'You have been sitting too long!', medicine: 'Medicine time!' }[type],
      body: bodies[type] || 'This is a test reminder.',
    });
    return true;
  });
}

// ── app lifecycle ─────────────────────────────────────────────────────────────
// Register the meddoc-companion:// custom protocol so a website link can open this app.
const PROTOCOL = 'meddoc-companion';
if (process.defaultApp && process.argv.length >= 2) {
  // dev mode: point the protocol at electron + this script
  app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
} else {
  app.setAsDefaultProtocolClient(PROTOCOL);
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  // Fired when a second launch happens (e.g. clicking meddoc-companion:// while running)
  app.on('second-instance', () => openApp());
  // macOS deep-link
  app.on('open-url', () => openApp());

  app.whenReady().then(() => {
    startRendererServer();
    registerIpc();
    createTray();
    engine = new ReminderEngine(onReminderFire);

    const s = store.load();
    if (s.loggedIn) {
      // trust the stored session; login.html silently re-verifies Clerk in the background
      createCompanionWindow();
      showDashboard();
      engine.start();
    } else {
      createLoginWindow();
    }
  });

  app.on('window-all-closed', (e) => {
    // keep running in the tray — this is the whole point
  });

  app.on('before-quit', () => { isQuitting = true; });
}
