// The brain: decides WHEN a reminder is due. Pure logic + timers — no Electron UI here,
// so this file could be reused in a website/PWA version later.
const { powerMonitor } = require('electron');
const store = require('./store');

const TICK_MS = 30 * 1000;       // check every 30s
const IDLE_RESET_SEC = 5 * 60;   // 5 min away from keyboard = you left the desk

const MESSAGES = {
  water: { emoji: '💧', title: 'Water time!', body: 'Take a few sips — your body will thank you.' },
  lunch: { emoji: '🍱', title: 'Lunch time!', body: 'Step away from the screen and eat properly.' },
  sit:   { emoji: '🚶', title: 'You have been sitting too long!', body: 'Walk 5 minutes or jump 10 times. Seriously. Go!' },
  medicine: { emoji: '💊', title: 'Medicine time!', body: '' }, // body filled per medicine
};

class ReminderEngine {
  constructor(onFire) {
    this.onFire = onFire;          // callback(type, { title, body, emoji })
    this.timer = null;
    this.lastWaterAt = Date.now();
    this.activeSince = Date.now(); // continuous keyboard/mouse activity start
    this.firedToday = new Set();   // 'lunch', 'med-<id>-<time>' — reset at midnight
    this.today = new Date().getDate();
    this.snoozedUntil = {};        // type -> epoch ms
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
  }

  snooze(type, minutes = 10) {
    this.snoozedUntil[type] = Date.now() + minutes * 60 * 1000;
  }

  done(type) {
    if (type === 'water') this.lastWaterAt = Date.now();
    if (type === 'sit') this.activeSince = Date.now();
  }

  // ── helpers ──────────────────────────────────────────────────────────────
  nowHHMM() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  inWorkHours(s) {
    const now = this.nowHHMM();
    return now >= s.workHours.start && now <= s.workHours.end;
  }

  isSnoozed(type) {
    return (this.snoozedUntil[type] || 0) > Date.now();
  }

  fire(type, overrides = {}) {
    if (this.isSnoozed(type)) return;
    this.onFire(type, { ...MESSAGES[type], ...overrides });
  }

  // ── main loop ────────────────────────────────────────────────────────────
  tick() {
    const s = store.load();
    const now = Date.now();

    // midnight rollover — allow lunch/medicines to fire again tomorrow
    const day = new Date().getDate();
    if (day !== this.today) { this.firedToday.clear(); this.today = day; }

    if (!s.loggedIn) return;                    // login-gated
    if (s.pausedUntil > now) return;            // user hit "Pause"

    // ── sitting detection (uses real keyboard/mouse idle time) ────────────
    const idleSec = powerMonitor.getSystemIdleTime();
    if (idleSec > IDLE_RESET_SEC) {
      // user left the desk — sitting streak resets, fresh start when they return
      this.activeSince = now;
    }

    // ── medicine (exact times — fires even outside work hours) ────────────
    const nowStr = this.nowHHMM();
    for (const med of s.medicines) {
      for (const t of med.times) {
        const key = `med-${med.id}-${t}`;
        if (t === nowStr && !this.firedToday.has(key)) {
          this.firedToday.add(key);
          this.fire('medicine', { body: `Time to take: ${med.name}` });
        }
      }
    }

    // everything below only nags during work hours
    if (!this.inWorkHours(s)) return;

    // ── lunch ──────────────────────────────────────────────────────────────
    if (s.lunch.enabled && nowStr === s.lunch.time && !this.firedToday.has('lunch')) {
      this.firedToday.add('lunch');
      this.fire('lunch');
    }

    // ── water ──────────────────────────────────────────────────────────────
    if (s.water.enabled && now - this.lastWaterAt >= s.water.intervalMin * 60 * 1000) {
      this.lastWaterAt = now; // re-arm; "Done" also resets
      this.fire('water');
    }

    // ── long sitting ───────────────────────────────────────────────────────
    if (s.sit.enabled && idleSec < IDLE_RESET_SEC &&
        now - this.activeSince >= s.sit.thresholdMin * 60 * 1000) {
      this.activeSince = now;
      this.fire('sit', { body: `Walk ${s.sit.breakMin} minutes or jump 10 times. Seriously. Go!` });
    }
  }
}

module.exports = ReminderEngine;
