import { pageShell, attachBackButton } from './layout.js';
import { icon } from '../js/icons.js';
import { navigate } from '../js/router.js';
import { shuffle, shuffleOptions, formatTime, percent } from '../js/util.js';
import { recordAttempt, startSession, endSession } from '../js/storage.js';
import questions from '../data/questions.json';

const BLUEPRINT = [
  { name: 'Patient Care', modules: [3, 4, 6, 7, 8, 13], count: 17 },
  { name: 'Equipment Operation and QC', modules: [1, 5, 14], count: 20 },
  { name: 'DXA Scanning', modules: [9, 10, 11, 12], count: 38 }
];

const TOTAL = 75;
const DURATION_MS = 105 * 60 * 1000;
const PASS_SCALED = 75;

function dedupPick(pool, want, seen) {
  const shuffled = shuffle(pool);
  const out = [];
  for (const q of shuffled) {
    if (seen.has(q.id)) continue;
    if (q.duplicate_of && seen.has(q.duplicate_of)) continue;
    out.push(q);
    seen.add(q.id);
    if (q.duplicate_of) seen.add(q.duplicate_of);
    if (out.length >= want) break;
  }
  return out;
}

function buildExam() {
  const seen = new Set();
  const picked = [];
  for (const cat of BLUEPRINT) {
    const pool = questions.filter(q => cat.modules.includes(q.module));
    const picks = dedupPick(pool, cat.count, seen);
    picked.push(...picks);
  }
  if (picked.length < TOTAL) {
    const rest = dedupPick(questions, TOTAL - picked.length, seen);
    picked.push(...rest);
  }
  return shuffle(picked.slice(0, TOTAL)).map(shuffleOptions);
}

function introScreen(container) {
  const body = `
    <div class="card mb-4">
      <div class="text-accent-amber text-xs uppercase tracking-widest">Exam Simulator</div>
      <h2 class="font-display text-2xl mt-1">75 question timed exam</h2>
      <p class="text-bone-300 text-sm mt-2 leading-relaxed">
        This simulator mirrors the 2022 ARRT Bone Densitometry blueprint. You have 1 hour 45 minutes to answer 75 scored questions. The real exam also includes 30 unscored pilot items for a total of 105 items and the same time limit.
      </p>
    </div>
    <div class="card mb-4">
      <div class="text-bone-300 text-xs uppercase tracking-widest mb-2">Blueprint weights</div>
      <div class="grid gap-2">
        ${BLUEPRINT.map(c => `
          <div class="flex items-center gap-3">
            <div class="flex-1 text-sm">${c.name}</div>
            <div class="font-mono text-accent-amber text-sm">${c.count}</div>
            <div class="text-bone-300 text-xs">${Math.round(c.count / TOTAL * 100)}%</div>
          </div>
        `).join('')}
      </div>
    </div>
    <div class="card mb-4">
      <div class="text-bone-300 text-xs uppercase tracking-widest mb-2">Rules</div>
      <ul class="text-sm text-bone-300 space-y-2 leading-relaxed">
        <li>Timer starts on Begin and auto submits at 0.</li>
        <li>You can flag questions and return to them via the Navigator.</li>
        <li>Pass at a scaled score of 75 (about 70% correct on this bank).</li>
        <li>Answers are recorded to your stats.</li>
      </ul>
    </div>
    <button id="begin" class="btn-primary w-full">
      ${icon('play', 'w-5 h-5')} Begin exam
    </button>
  `;
  container.innerHTML = pageShell('Exam Simulator', body, { back: true, backTo: 'home' });
  attachBackButton(container);
  container.querySelector('#begin').addEventListener('click', () => navigate('exam/run'));
}

async function runner(container) {
  const exam = buildExam();
  if (exam.length < TOTAL) {
    container.innerHTML = pageShell('Exam', `
      <div class="card text-center py-10">
        <div class="text-bone-300">Not enough questions in the bank to build a full 75 question exam.</div>
        <button data-action="back" data-to="exam" class="btn-primary mt-4">Back</button>
      </div>
    `, { back: true, backTo: 'exam' });
    attachBackButton(container);
    return;
  }

  const sessionId = await startSession('exam');
  const state = {
    index: 0,
    answers: new Array(exam.length).fill(null),
    flagged: new Set(),
    recorded: new Set(),
    mode: 'quiz',
    startTime: Date.now(),
    endsAt: Date.now() + DURATION_MS,
    timerId: null
  };

  function startTimer() {
    state.timerId = setInterval(() => {
      const remaining = state.endsAt - Date.now();
      const el = document.getElementById('timer');
      if (!el) return;
      if (remaining <= 0) {
        clearInterval(state.timerId);
        finish(true);
        return;
      }
      el.textContent = formatTime(remaining);
      if (remaining < 5 * 60 * 1000) el.classList.add('text-err');
    }, 500);
  }

  function stopTimer() {
    if (state.timerId) clearInterval(state.timerId);
    state.timerId = null;
  }

  function renderQ() {
    if (state.mode === 'nav') return renderNav();
    const q = exam[state.index];
    const isTF = q.type === 'true_false';
    const labels = isTF ? ['T', 'F'] : ['A', 'B', 'C', 'D', 'E', 'F'];
    const current = state.answers[state.index];
    const remaining = Math.max(state.endsAt - Date.now(), 0);

    const opts = q.options.map((o, i) => `
      <button class="answer-option ${current && current.chosen === i ? 'selected' : ''}" data-opt="${i}">
        <span class="font-mono text-accent-amber mr-2">${labels[i] || (i + 1)}</span>${o}
      </button>
    `).join('');

    const flagged = state.flagged.has(state.index);
    const body = `
      <div class="flex items-center gap-3 mb-3">
        <div class="text-bone-300 text-xs">Q ${state.index + 1} of ${exam.length}</div>
        <div class="flex-1 h-1 bg-ink-700 rounded-full overflow-hidden">
          <div class="h-full bg-accent-amber" style="width:${percent(state.index, exam.length)}%"></div>
        </div>
        <div id="timer" class="font-mono text-sm">${formatTime(remaining)}</div>
        <button id="flag" class="btn-ghost px-2 py-1 ${flagged ? 'text-accent-amber' : 'text-bone-300'}" aria-label="Flag">
          ${icon('flag', 'w-5 h-5')}
        </button>
      </div>
      <div class="card mb-4">
        <div class="text-xs text-bone-300 mb-2">Mod ${q.module}${q.topic ? ` · ${q.topic}` : ''}</div>
        <div class="text-base leading-relaxed">${q.question}</div>
      </div>
      <div class="grid gap-2" id="opts">${opts}</div>
      <div class="grid grid-cols-4 gap-2 mt-5">
        <button id="prev" class="btn-secondary" ${state.index === 0 ? 'disabled' : ''}>
          ${icon('chevron_left', 'w-4 h-4')} Prev
        </button>
        <button id="nav" class="btn-secondary col-span-2">${icon('grid', 'w-4 h-4')} Navigator</button>
        <button id="next" class="btn-primary" ${state.index === exam.length - 1 ? 'disabled' : ''}>
          Next ${icon('chevron_right', 'w-4 h-4')}
        </button>
      </div>
      <button id="submit" class="btn-danger w-full mt-3">Submit exam</button>
    `;
    container.innerHTML = pageShell('Exam', body, { back: true, backTo: 'home' });
    attachBackButton(container);

    container.querySelectorAll('[data-opt]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const chosen = parseInt(btn.getAttribute('data-opt'), 10);
        const correct = chosen === q.correct;
        state.answers[state.index] = { chosen, correct };
        if (!state.recorded.has(state.index)) {
          state.recorded.add(state.index);
          try { await recordAttempt({ qId: q.id, correct, sessionId, timeMs: 0 }); } catch {}
        }
        container.querySelectorAll('[data-opt]').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });

    container.querySelector('#flag').addEventListener('click', () => {
      if (state.flagged.has(state.index)) state.flagged.delete(state.index);
      else state.flagged.add(state.index);
      renderQ();
    });
    container.querySelector('#prev').addEventListener('click', () => {
      if (state.index > 0) { state.index--; renderQ(); }
    });
    container.querySelector('#next').addEventListener('click', () => {
      if (state.index < exam.length - 1) { state.index++; renderQ(); }
    });
    container.querySelector('#nav').addEventListener('click', () => {
      state.mode = 'nav';
      renderNav();
    });
    container.querySelector('#submit').addEventListener('click', confirmSubmit);
  }

  function renderNav() {
    const unanswered = state.answers.filter(a => !a).length;
    const remaining = Math.max(state.endsAt - Date.now(), 0);
    const cells = exam.map((_, i) => {
      const answered = !!state.answers[i];
      const flagged = state.flagged.has(i);
      const current = i === state.index;
      const base = 'h-10 rounded flex items-center justify-center font-mono text-xs transition';
      const cls = [
        base,
        current ? 'bg-accent-amber text-ink-950' : 'bg-ink-800',
        answered && !current ? 'border border-accent-amber' : 'border border-ink-700',
        flagged && !current ? 'text-accent-amber' : ''
      ].join(' ');
      return `<button class="${cls}" data-goto="${i}">${i + 1}${flagged ? '·' : ''}</button>`;
    }).join('');

    const body = `
      <div class="flex items-center gap-3 mb-3">
        <div class="text-bone-300 text-xs">Navigator</div>
        <div class="flex-1"></div>
        <div id="timer" class="font-mono text-sm">${formatTime(remaining)}</div>
      </div>
      <div class="card mb-4">
        <div class="grid grid-cols-4 gap-2 text-xs mb-3">
          <div><span class="chip-muted">${exam.length - unanswered}</span> answered</div>
          <div><span class="chip-warn">${unanswered}</span> left</div>
          <div><span class="chip-muted">${state.flagged.size}</span> flagged</div>
          <div></div>
        </div>
        <div class="grid grid-cols-6 gap-2">${cells}</div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <button id="back-to-q" class="btn-secondary">Back to question</button>
        <button id="submit-nav" class="btn-danger">Submit exam</button>
      </div>
    `;
    container.innerHTML = pageShell('Exam', body, { back: true, backTo: 'home' });
    attachBackButton(container);

    container.querySelectorAll('[data-goto]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.index = parseInt(btn.getAttribute('data-goto'), 10);
        state.mode = 'quiz';
        renderQ();
      });
    });
    container.querySelector('#back-to-q').addEventListener('click', () => {
      state.mode = 'quiz';
      renderQ();
    });
    container.querySelector('#submit-nav').addEventListener('click', confirmSubmit);
  }

  function confirmSubmit() {
    const unanswered = state.answers.filter(a => !a).length;
    const msg = unanswered > 0
      ? `You have ${unanswered} unanswered question${unanswered === 1 ? '' : 's'}. Submit anyway?`
      : 'Submit your exam?';
    if (confirm(msg)) finish(false);
  }

  async function finish(timeOut) {
    stopTimer();
    const correct = state.answers.filter(a => a && a.correct).length;
    const total = exam.length;
    const score = percent(correct, total);
    const scaled = Math.round((correct / total) * 100);
    const pass = scaled >= PASS_SCALED;
    try { await endSession(sessionId, { total, correct, score, timeOut }); } catch {}
    const missedAll = exam.map((q, i) => ({ q, a: state.answers[i], i })).filter(x => !x.a || !x.a.correct);
    const missed = missedAll.slice(0, 20);

    const body = `
      <div class="card text-center mb-4">
        <div class="text-bone-300 text-xs uppercase tracking-widest">${timeOut ? 'Time up' : 'Exam complete'}</div>
        <div class="font-display text-6xl mt-2 ${pass ? 'text-ok' : 'text-err'}">${score}%</div>
        <div class="text-bone-300 text-sm mt-1">${correct} of ${total} correct</div>
        <div class="mt-2 font-mono text-accent-amber">Scaled score est: ${scaled}</div>
        <div class="mt-3"><span class="${pass ? 'chip-ok' : 'chip-err'}">${pass ? 'Passing' : 'Below passing'} at scaled 75</span></div>
      </div>
      ${missedAll.length ? `
        <div class="mb-2 text-bone-300 text-xs uppercase tracking-widest">Missed or skipped (showing ${missed.length} of ${missedAll.length})</div>
        <div class="grid gap-3 mb-4">
          ${missed.map(m => `
            <div class="card">
              <div class="text-xs text-bone-300 mb-2">Q ${m.i + 1} · Mod ${m.q.module}${m.q.topic ? ` · ${m.q.topic}` : ''}</div>
              <div class="text-sm mb-2">${m.q.question}</div>
              ${m.a ? `<div class="text-xs mb-2"><span class="text-err">Your answer:</span> ${m.q.options[m.a.chosen]}</div>` : '<div class="text-xs mb-2"><span class="text-err">Not answered</span></div>'}
              <div class="text-xs mb-2"><span class="text-ok">Correct:</span> ${m.q.options[m.q.correct]}</div>
              <div class="text-xs text-bone-300">${m.q.explanation || ''}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}
      <div class="grid grid-cols-2 gap-2">
        <button data-nav-to="exam" class="btn-secondary">Retake</button>
        <button data-nav-to="home" class="btn-primary">Home</button>
      </div>
    `;
    container.innerHTML = pageShell('Exam results', body, { back: true, backTo: 'home' });
    attachBackButton(container);
    container.querySelectorAll('[data-nav-to]').forEach(b => {
      b.addEventListener('click', () => navigate(b.getAttribute('data-nav-to')));
    });
  }

  renderQ();
  startTimer();
}

export async function renderExam(container, params = []) {
  if (params[0] === 'run') {
    await runner(container);
    return;
  }
  introScreen(container);
}
