import { pageShell, attachBackButton } from './layout.js';
import { icon } from '../js/icons.js';
import { navigate } from '../js/router.js';
import { shuffle, shuffleOptions, percent } from '../js/util.js';
import { recordAttempt, startSession, endSession } from '../js/storage.js';
import { getReviewQuestions } from '../js/stats.js';
import questions from '../data/questions.json';
import modules from '../data/modules.json';

function dedupShuffle(pool) {
  const shuffled = shuffle(pool);
  const keptIds = new Set();
  const result = [];
  for (const q of shuffled) {
    if (q.duplicate_of && keptIds.has(q.duplicate_of)) continue;
    result.push(q);
    keptIds.add(q.id);
  }
  return result;
}

function moduleLabel(n) {
  const mod = (modules.modules || []).find(m => m.id === n);
  return mod ? `${n}. ${mod.title}` : `Module ${n}`;
}

function picker(container) {
  const moduleCounts = {};
  for (const q of questions) moduleCounts[q.module] = (moduleCounts[q.module] || 0) + 1;
  const moduleList = Object.keys(moduleCounts).map(Number).sort((a, b) => a - b);

  const body = `
    <div class="mb-4">
      <div class="text-bone-300 text-xs uppercase tracking-widest mb-2">Quick drills</div>
      <div class="grid gap-3">
        <button data-go="all" class="card card-hover flex items-center gap-3 text-left">
          <span class="text-accent-amber">${icon('zap', 'w-6 h-6')}</span>
          <span class="flex-1">
            <div class="font-display text-lg">Mixed drill</div>
            <div class="text-bone-300 text-xs">15 random questions across modules</div>
          </span>
          <span class="text-bone-300">${icon('chevron_right', 'w-5 h-5')}</span>
        </button>
        <button data-go="review" class="card card-hover flex items-center gap-3 text-left">
          <span class="text-accent-amber">${icon('target', 'w-6 h-6')}</span>
          <span class="flex-1">
            <div class="font-display text-lg">Review weak areas</div>
            <div class="text-bone-300 text-xs">Prioritizes unseen and missed questions</div>
          </span>
          <span class="text-bone-300">${icon('chevron_right', 'w-5 h-5')}</span>
        </button>
      </div>
    </div>
    <div>
      <div class="text-bone-300 text-xs uppercase tracking-widest mb-2">By module</div>
      <div class="grid gap-2">
        ${moduleList.map(m => `
          <button data-go="module-${m}" class="card card-hover flex items-center gap-3 text-left py-3">
            <span class="font-mono text-accent-amber text-sm w-6 text-center">${m}</span>
            <span class="flex-1 text-sm">${moduleLabel(m)}</span>
            <span class="chip-muted">${moduleCounts[m]}</span>
            <span class="text-bone-300">${icon('chevron_right', 'w-4 h-4')}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;

  container.innerHTML = pageShell('Quiz', body);
  attachBackButton(container);
  container.querySelectorAll('[data-go]').forEach(btn => {
    btn.addEventListener('click', () => navigate(`quiz/run/${btn.getAttribute('data-go')}`));
  });
}

async function pickQuestions(key) {
  if (key === 'all') {
    const pool = dedupShuffle(questions);
    return pool.slice(0, 15).map(shuffleOptions);
  }
  if (key === 'review') {
    const pool = await getReviewQuestions(15);
    const deduped = dedupShuffle(pool);
    return deduped.map(shuffleOptions);
  }
  if (key.startsWith('module-')) {
    const m = parseInt(key.slice(7), 10);
    const pool = dedupShuffle(questions.filter(q => q.module === m));
    return pool.map(shuffleOptions);
  }
  return [];
}

async function runner(container, key) {
  const quiz = await pickQuestions(key);
  if (quiz.length === 0) {
    container.innerHTML = pageShell('Quiz', `
      <div class="card text-center py-10">
        <div class="text-bone-300">No questions available for this selection.</div>
        <button data-action="back" data-to="quiz" class="btn-primary mt-4">Back</button>
      </div>
    `, { back: true, backTo: 'quiz' });
    attachBackButton(container);
    return;
  }

  const sessionId = await startSession('quiz');
  const state = { index: 0, answers: new Array(quiz.length).fill(null), startTime: Date.now() };

  async function renderQ() {
    const q = quiz[state.index];
    const isTF = q.type === 'true_false';
    const prefixLabels = isTF ? ['T', 'F'] : ['A', 'B', 'C', 'D', 'E', 'F'];
    const chips = `
      <div class="flex flex-wrap gap-2 text-xs mb-3">
        <span class="chip-muted">Mod ${q.module}</span>
        ${q.topic ? `<span class="chip-muted">${q.topic}</span>` : ''}
        ${q.difficulty ? `<span class="chip-${q.difficulty === 'hard' ? 'err' : q.difficulty === 'medium' ? 'warn' : 'ok'}">${q.difficulty}</span>` : ''}
      </div>
    `;
    const opts = q.options.map((o, i) => `
      <button class="answer-option" data-opt="${i}">
        <span class="font-mono text-accent-amber mr-2">${prefixLabels[i] || (i + 1)}</span>${o}
      </button>
    `).join('');

    const body = `
      <div class="flex items-center justify-between mb-3">
        <span class="text-bone-300 text-xs">Question ${state.index + 1} of ${quiz.length}</span>
        <div class="h-1 flex-1 ml-3 bg-ink-700 rounded-full overflow-hidden">
          <div class="h-full bg-accent-amber" style="width:${percent(state.index, quiz.length)}%"></div>
        </div>
      </div>
      <div class="card mb-4">
        ${chips}
        <div class="text-bone-100 text-base leading-relaxed">${q.question}</div>
      </div>
      <div class="grid gap-2" id="opts">${opts}</div>
      <div id="explain" class="hidden card mt-4 border-accent-amber/30">
        <div class="text-accent-amber text-xs uppercase tracking-widest mb-2">Explanation</div>
        <div class="text-bone-100 text-sm leading-relaxed">${q.explanation || ''}</div>
        ${q.mnemonic ? `<div class="mt-3 text-bone-300 text-sm"><span class="text-accent-amber font-medium">Mnemonic:</span> ${q.mnemonic}</div>` : ''}
        ${q.source ? `<div class="mt-2 text-bone-300 text-xs">${q.source}</div>` : ''}
        <div class="mt-4 flex gap-2">
          <button id="next-btn" class="btn-primary flex-1">
            ${state.index + 1 === quiz.length ? 'Finish' : 'Next'}
            ${icon('chevron_right', 'w-4 h-4')}
          </button>
        </div>
      </div>
    `;
    container.innerHTML = pageShell('Quiz', body, { back: true, backTo: 'quiz' });
    attachBackButton(container);

    const explainEl = container.querySelector('#explain');
    const optsEl = container.querySelector('#opts');
    const tStart = Date.now();

    optsEl.querySelectorAll('[data-opt]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const chosen = parseInt(btn.getAttribute('data-opt'), 10);
        const correct = chosen === q.correct;
        state.answers[state.index] = { chosen, correct };
        optsEl.querySelectorAll('[data-opt]').forEach(b => {
          b.disabled = true;
          const idx = parseInt(b.getAttribute('data-opt'), 10);
          if (idx === q.correct) b.classList.add('correct');
          else if (idx === chosen) b.classList.add('wrong');
        });
        explainEl.classList.remove('hidden');
        await recordAttempt({ qId: q.id, correct, sessionId, timeMs: Date.now() - tStart });
        const nextBtn = container.querySelector('#next-btn');
        nextBtn.addEventListener('click', () => {
          state.index++;
          if (state.index >= quiz.length) finish();
          else renderQ();
        });
      });
    });
  }

  async function finish() {
    const correct = state.answers.filter(a => a && a.correct).length;
    const score = percent(correct, quiz.length);
    const pass = score >= 70;
    await endSession(sessionId, { total: quiz.length, correct, score });
    const missed = quiz.map((q, i) => ({ q, a: state.answers[i] })).filter(x => x.a && !x.a.correct);
    const body = `
      <div class="card text-center mb-4">
        <div class="text-bone-300 text-xs uppercase tracking-widest">Results</div>
        <div class="font-display text-6xl mt-2 ${pass ? 'text-ok' : 'text-err'}">${score}%</div>
        <div class="text-bone-300 text-sm mt-1">${correct} of ${quiz.length} correct</div>
        <div class="mt-3"><span class="${pass ? 'chip-ok' : 'chip-err'}">${pass ? 'Passing' : 'Below passing'} at 70% threshold</span></div>
      </div>
      ${missed.length ? `
        <div class="mb-2 text-bone-300 text-xs uppercase tracking-widest">Missed questions (${missed.length})</div>
        <div class="grid gap-3 mb-4">
          ${missed.map(m => `
            <div class="card">
              <div class="text-xs text-bone-300 mb-2">Mod ${m.q.module}${m.q.topic ? ` · ${m.q.topic}` : ''}</div>
              <div class="text-sm mb-2">${m.q.question}</div>
              <div class="text-xs mb-2"><span class="text-err">Your answer:</span> ${m.q.options[m.a.chosen]}</div>
              <div class="text-xs mb-2"><span class="text-ok">Correct:</span> ${m.q.options[m.q.correct]}</div>
              <div class="text-xs text-bone-300">${m.q.explanation || ''}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}
      <div class="grid grid-cols-2 gap-2">
        <button data-nav-to="quiz" class="btn-secondary">More practice</button>
        <button data-nav-to="home" class="btn-primary">Home</button>
      </div>
    `;
    container.innerHTML = pageShell('Results', body, { back: true, backTo: 'quiz' });
    attachBackButton(container);
    container.querySelectorAll('[data-nav-to]').forEach(b => {
      b.addEventListener('click', () => navigate(b.getAttribute('data-nav-to')));
    });
  }

  renderQ();
}

export async function renderQuiz(container, params = []) {
  if (params[0] === 'run' && params[1]) {
    await runner(container, params[1]);
    return;
  }
  picker(container);
}
