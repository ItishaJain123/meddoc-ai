// Dashboard: reads settings from the main process, lets the user edit, saves back.
const $ = (id) => document.getElementById(id);
let settings = null;

async function init() {
  settings = await window.companion.getSettings();
  render();

  // first-run: ask about medicines
  if (!settings.onboarded) $('onboarding').classList.remove('hidden');
}

function render() {
  $('userEmail').textContent = settings.userEmail;
  $('workStart').value = settings.workHours.start;
  $('workEnd').value = settings.workHours.end;
  $('autoLaunch').checked = settings.autoLaunch;
  $('waterEnabled').checked = settings.water.enabled;
  $('waterInterval').value = settings.water.intervalMin;
  $('lunchEnabled').checked = settings.lunch.enabled;
  $('lunchTime').value = settings.lunch.time;
  $('sitEnabled').checked = settings.sit.enabled;
  $('sitThreshold').value = settings.sit.thresholdMin;
  $('sitBreak').value = settings.sit.breakMin;
  renderCharacters();
  renderMeds();
}

function renderCharacters() {
  document.querySelectorAll('.char').forEach((el) => {
    el.classList.toggle('selected', el.dataset.char === settings.character);
    el.onclick = () => { settings.character = el.dataset.char; renderCharacters(); };
  });
}

function renderMeds() {
  const list = $('medList');
  list.innerHTML = '';
  if (settings.medicines.length === 0) {
    list.innerHTML = '<div class="empty-meds">No medicines added — your buddy has nothing to fetch 💤</div>';
    return;
  }
  for (const med of settings.medicines) {
    const item = document.createElement('div');
    item.className = 'med-item';
    item.innerHTML = `
      <span><strong>${escapeHtml(med.name)}</strong>
        <span class="med-times">at ${med.times.join(', ')}</span></span>`;
    const del = document.createElement('button');
    del.className = 'ghost small';
    del.textContent = 'Remove';
    del.onclick = () => {
      settings.medicines = settings.medicines.filter((m) => m.id !== med.id);
      renderMeds();
    };
    item.appendChild(del);
    list.appendChild(item);
  }
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

$('addMedBtn').onclick = () => {
  const name = $('medName').value.trim();
  const time = $('medTime').value;
  if (!name || !time) return;
  // same medicine name → add another time to it
  const existing = settings.medicines.find((m) => m.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    if (!existing.times.includes(time)) existing.times.push(time);
    existing.times.sort();
  } else {
    settings.medicines.push({ id: Date.now().toString(36), name, times: [time] });
  }
  $('medName').value = '';
  $('medTime').value = '';
  renderMeds();
};

$('saveBtn').onclick = async () => {
  settings.workHours = { start: $('workStart').value, end: $('workEnd').value };
  settings.autoLaunch = $('autoLaunch').checked;
  settings.water = { enabled: $('waterEnabled').checked, intervalMin: +$('waterInterval').value || 45 };
  settings.lunch = { enabled: $('lunchEnabled').checked, time: $('lunchTime').value };
  settings.sit = {
    enabled: $('sitEnabled').checked,
    thresholdMin: +$('sitThreshold').value || 60,
    breakMin: +$('sitBreak').value || 5,
  };
  settings = await window.companion.saveSettings(settings);
  $('savedMsg').classList.add('show');
  setTimeout(() => $('savedMsg').classList.remove('show'), 1800);
};

$('logoutBtn').onclick = () => window.companion.logout();

document.querySelectorAll('[data-test]').forEach((btn) => {
  btn.onclick = () => window.companion.testReminder(btn.dataset.test);
});

// onboarding
$('obYes').onclick = async () => {
  settings.onboarded = true;
  await window.companion.saveSettings({ onboarded: true });
  $('onboarding').classList.add('hidden');
  $('medName').focus();
};
$('obNo').onclick = async () => {
  settings.onboarded = true;
  await window.companion.saveSettings({ onboarded: true });
  $('onboarding').classList.add('hidden');
};

init();
