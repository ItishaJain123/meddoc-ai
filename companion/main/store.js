// Local JSON settings store — lives in the OS user-data folder, survives restarts.
const { app } = require('electron');
const fs = require('fs');
const path = require('path');

const FILE = () => path.join(app.getPath('userData'), 'companion-settings.json');

const DEFAULTS = {
  loggedIn: false,
  userEmail: '',
  onboarded: false,          // has the user answered the first-run questions yet
  character: 'blob',         // blob | cat | robot
  workHours: { start: '09:00', end: '18:00' },
  water: { enabled: true, intervalMin: 45 },
  lunch: { enabled: true, time: '13:00' },
  sit: { enabled: true, thresholdMin: 60, breakMin: 5 },
  medicines: [],             // [{ id, name, times: ['09:00', '21:00'] }]
  autoLaunch: false,
  pausedUntil: 0,            // epoch ms — reminders muted until then
};

let cache = null;

function load() {
  if (cache) return cache;
  try {
    const raw = JSON.parse(fs.readFileSync(FILE(), 'utf8'));
    cache = { ...DEFAULTS, ...raw };
  } catch {
    cache = { ...DEFAULTS };
  }
  return cache;
}

function save(patch) {
  cache = { ...load(), ...patch };
  fs.writeFileSync(FILE(), JSON.stringify(cache, null, 2), 'utf8');
  return cache;
}

function reset() {
  cache = { ...DEFAULTS };
  fs.writeFileSync(FILE(), JSON.stringify(cache, null, 2), 'utf8');
  return cache;
}

module.exports = { load, save, reset, DEFAULTS };
