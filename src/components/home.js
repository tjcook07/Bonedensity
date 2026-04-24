import { pageShell, attachBackButton } from './layout.js';
import { icon } from '../js/icons.js';
import { navigate } from '../js/router.js';
import { computeStats } from '../js/stats.js';
import { getSettings } from '../js/storage.js';
import { daysBetween, percent } from '../js/util.js';

function heroCard() {
  return `
    <div class="card mb-4 relative overflow-hidden">
      <div class="text-xs uppercase tracking-widest text-accent-amber font-semibold">ARRT Bone Densitometry</div>
      <h2 class="font-display text-3xl mt-1">Registry Prep</h2>
      <p class="text-bone-300 mt-2 text-sm leading-relaxed">
        Question bank, Leitner flashcards, timed 75 question exam simulator, reference material, precision calculator, and per module tracking. Works offline.
      </p>
    </div>
  `;
}

function statCard(label, value, sub, accent = 'amber') {
  const color = accent === 'amber' ? 'text-accent-amber' : accent === 'ok' ? 'text-ok' : 'text-bone-100';
  return `
    <div class="card text-center">
      <div class="text-bone-300 text-xs uppercase tracking-widest">${label}</div>
      <div class="font-display text-3xl mt-1 ${color}">${value}</div>
      <div class="text-bone-300 text-xs mt-1">${sub}</div>
    </div>
  `;
}

function countdownCard(examDate) {
  if (!examDate) {
    return `
      <div class="card mb-4">
        <div class="flex items-center gap-3">
          <div class="text-accent-amber">${icon('target', 'w-6 h-6')}</div>
          <div class="flex-1">
            <div class="font-display text-lg">Set your exam date</div>
            <div class="text-bone-300 text-sm">Track your countdown from Settings.</div>
          </div>
          <button data-nav-to="settings" class="btn-secondary">Set</button>
        </div>
      </div>
    `;
  }
  const now = new Date();
  const target = new Date(examDate + 'T00:00:00');
  const days = daysBetween(now, target);
  let color = 'text-bone-100';
  let chip = 'chip-ok';
  if (days < 30) { color = 'text-err'; chip = 'chip-err'; }
  else if (days < 60) { color = 'text-warn'; chip = 'chip-warn'; }
  const label = days < 0 ? 'Exam date passed' : `${days} day${days === 1 ? '' : 's'} to go`;
  return `
    <div class="card mb-4 relative overflow-hidden">
      <div class="flex items-center gap-3">
        <div class="text-accent-amber">${icon('clock', 'w-6 h-6')}</div>
        <div class="flex-1">
          <div class="text-bone-300 text-xs uppercase tracking-widest">Exam countdown</div>
          <div class="font-display text-2xl mt-1 ${color}">${label}</div>
          <div class="text-bone-300 text-xs mt-1">${target.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
        <span class="${chip}">${days < 0 ? 'past' : days < 30 ? 'close' : days < 60 ? 'soon' : 'on track'}</span>
      </div>
    </div>
  `;
}

function actionGrid() {
  const items = [
    { to: 'quiz', icon: 'brain', title: 'Quiz', sub: 'Practice by module or mixed drill' },
    { to: 'flashcards', icon: 'cards', title: 'Flashcards', sub: 'Spaced repetition review' },
    { to: 'exam', icon: 'clipboard', title: 'Exam Simulator', sub: '75 questions, 1h 45m' },
    { to: 'reference', icon: 'book', title: 'Reference', sub: 'Formulas and criteria' }
  ];
  return `
    <div class="grid grid-cols-2 gap-3 mb-4">
      ${items.map(it => `
        <button data-nav-to="${it.to}" class="card card-hover text-left">
          <div class="text-accent-amber mb-2">${icon(it.icon, 'w-7 h-7')}</div>
          <div class="font-display text-lg">${it.title}</div>
          <div class="text-bone-300 text-xs mt-1 leading-snug">${it.sub}</div>
        </button>
      `).join('')}
    </div>
  `;
}

function toolsCard() {
  return `
    <div class="card">
      <div class="text-bone-300 text-xs uppercase tracking-widest mb-2">Tools</div>
      <button data-nav-to="precision" class="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-ink-700 transition">
        <span class="text-accent-amber">${icon('calculator', 'w-5 h-5')}</span>
        <span class="flex-1 text-left">
          <div class="font-medium">Precision and LSC calculator</div>
          <div class="text-bone-300 text-xs">Paired scan input, RMS SD, LSC</div>
        </span>
        <span class="text-bone-300">${icon('chevron_right', 'w-4 h-4')}</span>
      </button>
      <button data-nav-to="study" class="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-ink-700 transition mt-1">
        <span class="text-accent-amber">${icon('book', 'w-5 h-5')}</span>
        <span class="flex-1 text-left">
          <div class="font-medium">Module study guide</div>
          <div class="text-bone-300 text-xs">14 module high yield breakdown</div>
        </span>
        <span class="text-bone-300">${icon('chevron_right', 'w-4 h-4')}</span>
      </button>
    </div>
  `;
}

export async function renderHome(container) {
  const settings = getSettings();
  let stats = { accuracy: 0, coverage: 0, streak: 0 };
  try { stats = await computeStats(); } catch {}

  const body = `
    ${heroCard()}
    <div class="grid grid-cols-3 gap-2 mb-4">
      ${statCard('Accuracy', percent(stats.totalCorrect || 0, stats.totalAttempts || 0) + '%', `${stats.totalCorrect || 0} of ${stats.totalAttempts || 0}`)}
      ${statCard('Coverage', Math.round((stats.coverage || 0) * 100) + '%', `${stats.questionsAnswered || 0} of ${stats.totalQuestions || 0}`)}
      ${statCard('Streak', (stats.streak || 0), stats.streak === 1 ? 'day' : 'days', 'ok')}
    </div>
    ${countdownCard(settings.examDate)}
    ${actionGrid()}
    ${toolsCard()}
  `;

  container.innerHTML = pageShell('DEXA Prep', body);
  attachBackButton(container);
  container.querySelectorAll('[data-nav-to]').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.getAttribute('data-nav-to')));
  });
}
