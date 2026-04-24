import { pageShell, attachBackButton } from './layout.js';
import { icon } from '../js/icons.js';
import { navigate } from '../js/router.js';
import { computeStats } from '../js/stats.js';
import { getAllSessions, clearAllData } from '../js/storage.js';
import { formatDate, percent } from '../js/util.js';
import modules from '../data/modules.json';

function moduleTitle(n) {
  const m = (modules.modules || []).find(x => x.id === n);
  return m ? m.title : `Module ${n}`;
}

function moduleBar(n, data) {
  const seenPct = data.total > 0 ? (data.seen / data.total) * 100 : 0;
  const masterPct = data.total > 0 ? (data.mastered / data.total) * 100 : 0;
  return `
    <div class="mb-3">
      <div class="flex items-center justify-between text-xs mb-1">
        <div class="flex items-center gap-2">
          <span class="font-mono text-accent-amber">${n}</span>
          <span class="text-bone-200">${moduleTitle(n)}</span>
        </div>
        <span class="text-bone-300">${data.mastered} / ${data.total}</span>
      </div>
      <div class="h-2 bg-ink-700 rounded-full overflow-hidden relative">
        <div class="absolute inset-y-0 left-0 bg-bone-300/30" style="width:${seenPct}%"></div>
        <div class="absolute inset-y-0 left-0 bg-accent-amber" style="width:${masterPct}%"></div>
      </div>
    </div>
  `;
}

export async function renderStats(container) {
  let stats = null;
  let sessions = [];
  try {
    stats = await computeStats();
    sessions = (await getAllSessions()).slice().sort((a, b) => b.startedAt - a.startedAt).slice(0, 10);
  } catch {
    stats = { accuracy: 0, coverage: 0, streak: 0, byModule: {}, totalAttempts: 0, totalCorrect: 0, questionsAnswered: 0, totalQuestions: 0, sessions: 0 };
  }

  const moduleIds = Object.keys(stats.byModule).map(Number).sort((a, b) => a - b);

  const body = `
    <div class="grid grid-cols-2 gap-2 mb-4">
      <div class="card text-center">
        <div class="text-bone-300 text-xs uppercase tracking-widest">Accuracy</div>
        <div class="font-display text-3xl mt-1 text-accent-amber">${percent(stats.totalCorrect, stats.totalAttempts)}%</div>
        <div class="text-bone-300 text-xs mt-1">${stats.totalCorrect} of ${stats.totalAttempts}</div>
      </div>
      <div class="card text-center">
        <div class="text-bone-300 text-xs uppercase tracking-widest">Coverage</div>
        <div class="font-display text-3xl mt-1 text-accent-amber">${Math.round(stats.coverage * 100)}%</div>
        <div class="text-bone-300 text-xs mt-1">${stats.questionsAnswered} of ${stats.totalQuestions}</div>
      </div>
    </div>

    <div class="card mb-4">
      <div class="flex items-center justify-between mb-3">
        <div class="text-bone-300 text-xs uppercase tracking-widest">Module progress</div>
        <div class="flex items-center gap-3 text-xs">
          <span class="flex items-center gap-1"><span class="w-3 h-2 bg-bone-300/40 rounded"></span>seen</span>
          <span class="flex items-center gap-1"><span class="w-3 h-2 bg-accent-amber rounded"></span>mastered</span>
        </div>
      </div>
      ${moduleIds.map(n => moduleBar(n, stats.byModule[n])).join('')}
    </div>

    <div class="card mb-4">
      <div class="flex items-center justify-between mb-3">
        <div class="text-bone-300 text-xs uppercase tracking-widest">Recent sessions</div>
        <div class="text-bone-300 text-xs">${sessions.length}</div>
      </div>
      ${sessions.length === 0 ? `
        <div class="text-bone-300 text-sm">No sessions yet. Try a quick drill.</div>
      ` : `
        <div class="grid gap-2">
          ${sessions.map(s => `
            <div class="flex items-center gap-3 border-b border-ink-700 pb-2 last:border-0">
              <div class="text-xs text-bone-300 w-20">${formatDate(s.startedAt)}</div>
              <div class="flex-1 text-sm capitalize">${s.kind || 'session'}</div>
              <div class="font-mono ${s.score >= 70 ? 'text-ok' : 'text-bone-200'}">${s.score != null ? s.score + '%' : ''}</div>
            </div>
          `).join('')}
        </div>
      `}
    </div>

    <button id="clear" class="btn-danger w-full">${icon('trash', 'w-4 h-4')} Clear all progress data</button>
  `;

  container.innerHTML = pageShell('Stats', body);
  attachBackButton(container);
  container.querySelector('#clear').addEventListener('click', async () => {
    if (!confirm('Clear all progress, sessions, and spaced repetition data? This cannot be undone.')) return;
    await clearAllData();
    navigate('home');
  });
}
