// The companion window: a rigged SVG buddy that walks in, waves, then performs a
// context-specific animation (drink / eat / jumping-jacks / take-medicine), and is
// interactive — click it to pet it and it hops happily with little hearts.
const CHAR_CLASS = { blob: 'char-blob', cat: 'char-cat', robot: 'char-robot' };
const BUBBLE_EMOJI = { water: '💧', lunch: '🍱', sit: '🏃', medicine: '💊' };

const stage = document.getElementById('stage');
const scene = document.getElementById('scene');
const bubble = document.getElementById('bubble');
const buddy = document.getElementById('buddy');
const hearts = document.getElementById('hearts');
const MODES = ['mode-water', 'mode-lunch', 'mode-sit', 'mode-medicine'];
let currentType = null;

function setCharacter(name) {
  buddy.classList.remove('char-blob', 'char-cat', 'char-robot');
  buddy.classList.add(CHAR_CLASS[name] || 'char-blob');
}

window.companion.onReminder((data) => {
  currentType = data.type;
  setCharacter(data.character);
  document.getElementById('bubbleEmoji').textContent = BUBBLE_EMOJI[data.type] || '💧';
  document.getElementById('title').textContent = data.title;
  document.getElementById('body').textContent = data.body;

  // reset everything
  bubble.classList.remove('show', 'leaving');
  buddy.classList.remove('walking', 'in', 'idle', 'wave', 'leaving', 'happy', ...MODES);
  stage.classList.remove(...MODES);
  void scene.offsetWidth; // reflow so the walk-in animation replays

  // 1) walk in
  buddy.classList.add('walking');

  // 2) arrive → wave hello → start the action + show bubble
  setTimeout(() => {
    buddy.classList.remove('walking');
    buddy.classList.add('in', 'idle', 'wave'); // 'in' keeps it at the arrived spot
  }, 1200);
  setTimeout(() => {
    buddy.classList.remove('wave');
    buddy.classList.add(`mode-${data.type}`);
    stage.classList.add(`mode-${data.type}`);
    bubble.classList.add('show');
  }, 2150);
});

// ── pet the buddy: click makes it hop + spawn hearts ──────────────
buddy.addEventListener('click', () => {
  buddy.classList.add('happy');
  hearts.innerHTML = '<span>💛</span><span>💙</span><span>💚</span>';
  hearts.classList.remove('go'); void hearts.offsetWidth; hearts.classList.add('go');
  setTimeout(() => buddy.classList.remove('happy'), 1000);
});

async function answer(action) {
  const type = currentType;
  buddy.classList.remove('idle', ...MODES);
  stage.classList.remove(...MODES);
  buddy.classList.add('leaving');
  bubble.classList.add('leaving');
  setTimeout(() => window.companion.reminderAction(type, action), 850);
}

document.getElementById('doneBtn').onclick = () => answer('done');
document.getElementById('snoozeBtn').onclick = () => answer('snooze');
