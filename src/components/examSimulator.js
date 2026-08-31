import { pageShell, attachBackButton } from './layout.js';
import { icon } from '../js/icons.js';
import { navigate } from '../js/router.js';
import { shuffle, shuffleOptions, formatTime, percent, timeAgo } from '../js/util.js';
import { recordAttempt, startSession, endSession } from '../js/storage.js';
import { saveSession, loadSession, clearSession, sessionSummary } from '../js/resumeSession.js';
import questions from '../data/questions.json';

const RESUME_KIND = 'examSim';

const SCORED_TOTAL = 75;
const PILOT_TOTAL = 30;
const TOTAL = SCORED_TOTAL + PILOT_TOTAL;
const DURATION_MS = 125 * 60 * 1000;
const WARN_MS = 30 * 60 * 1000;
const DANGER_MS = 10 * 60 * 1000;

const ARRT_AREAS = [
  { id: 'patient-care', name: 'Patient Care', categories: ['patient-care', 'radiation-safety'] },
  { id: 'image-production', name: 'Image Production', categories: ['equipment-qc', 'statistics'] },
  { id: 'procedures', name: 'Procedures', categories: ['spine', 'hip', 'forearm', 'vfa', 'criteria', 'pediatric', 'special-pop', 'physiology', 'pharmacology'] }
];

function areaForCategory(cat) {
  const a = ARRT_AREAS.find(x => x.categories.includes(cat));
  return a ? a.id : 'procedures';
}

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
  const picked = dedupPick(questions, TOTAL, seen);
  const tagged = picked.map((q, i) => ({
    ...q,
    isPilot: i < PILOT_TOTAL,
    arrtArea: areaForCategory(q.category)
  }));
  return shuffle(tagged).map(shuffleOptions);
}

function resumeCardHtml(summary) {
  const mins = Math.max(1, Math.round(summary.remainingMs / 60000));
  return `
    <div class="card mb-4 border-accent-amber/50 bg-accent-amber/5">
      <div class="flex items-center gap-3">
        <div class="text-accent-amber">${icon('clock', 'w-6 h-6')}</div>
        <div class="flex-1 min-w-0">
          <div class="font-display text-lg">Exam in progress</div>
          <div class="text-bone-300 text-sm">${summary.answered} of ${summary.total} answered · ~${mins} min left · saved ${timeAgo(summary.savedAt)}</div>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-2 mt-3">
        <button id="discard-resume" class="btn-secondary">Discard</button>
        <button id="resume" class="btn-primary">${icon('play', 'w-5 h-5')} Resume</button>
      </div>
    </div>
  `;
}

function introScreen(container) {
  const summary = sessionSummary(RESUME_KIND);
  const body = `
    ${summary ? resumeCardHtml(summary) : ''}
    <div class="card mb-4">
      <div class="text-accent-amber text-xs uppercase tracking-widest">Registry Exam Simulator</div>
      <h2 class="font-display text-2xl mt-1">105 questions · 125 minutes</h2>
      <p class="text-bone-300 text-sm mt-2 leading-relaxed">
        Simulates the real ARRT BD exam. 105 questions pulled randomly from the full ${questions.length}-question bank. 75 count toward your score, 30 are unscored pilots, just like the actual registry. You will not know which are pilots until the results screen.
      </p>
    </div>
    <div class="card mb-4">
      <div class="text-bone-300 text-xs uppercase tracking-widest mb-2">Rules</div>
      <ul class="text-sm text-bone-300 space-y-2 leading-relaxed">
        <li>125-minute countdown. Auto-submits at zero.</li>
        <li>Cannot pause once started.</li>
        <li>Only the 75 scored questions count. ARRT uses a scaled score (1-99, pass at 75); this sim estimates readiness from your raw percentage.</li>
        <li>Every question and every option order is randomized — retake for a fresh mix.</li>
        <li>You can flag questions and revisit via the Navigator.</li>
        <li>Pilot questions are invisible during the exam and revealed at the end.</li>
      </ul>
    </div>
    <button id="begin" class="btn-primary w-full">
      ${icon('play', 'w-5 h-5')} Begin exam
    </button>
  `;
  container.innerHTML = pageShell('Registry Exam Simulator', body, { back: true, backTo: 'quiz' });
  attachBackButton(container);

  container.querySelector('#begin').addEventListener('click', () => {
    if (sessionSummary(RESUME_KIND) && !confirm('You have an exam in progress. Start a new one and discard it?')) return;
    clearSession(RESUME_KIND);
    navigate('examSim/run');
  });

  const resumeBtn = container.querySelector('#resume');
  if (resumeBtn) resumeBtn.addEventListener('click', () => navigate('examSim/resume'));
  const discardBtn = container.querySelector('#discard-resume');
  if (discardBtn) discardBtn.addEventListener('click', () => {
    if (!confirm('Discard your in-progress exam? This cannot be undone.')) return;
    clearSession(RESUME_KIND);
    introScreen(container);
  });
}

async function runner(container, resume = null) {
  let exam, sessionId, state;

  if (resume && Array.isArray(resume.items) && resume.items.length) {
    exam = resume.items;
    sessionId = resume.sessionId;
    state = {
      index: Math.min(resume.index || 0, exam.length - 1),
      answers: Array.isArray(resume.answers) ? resume.answers : new Array(exam.length).fill(null),
      flagged: new Set(resume.flagged || []),
      recorded: new Set(resume.recorded || []),
      mode: resume.mode === 'nav' ? 'nav' : 'quiz',
      startTime: resume.startTime || Date.now(),
      // Clock was paused while away: resume from the saved remaining time.
      endsAt: Date.now() + Math.max(resume.remainingMs || 0, 0),
      timerId: null,
      finished: false
    };
  } else {
    exam = buildExam();
    if (exam.length < TOTAL) {
      container.innerHTML = pageShell('Registry Exam Simulator', `
        <div class="card text-center py-10">
          <div class="text-bone-300">Not enough questions in the bank to build a full ${TOTAL}-question exam.</div>
          <button data-action="back" data-to="examSim" class="btn-primary mt-4">Back</button>
        </div>
      `, { back: true, backTo: 'examSim' });
      attachBackButton(container);
      return;
    }
    sessionId = await startSession('exam-sim');
    state = {
      index: 0,
      answers: new Array(exam.length).fill(null),
      flagged: new Set(),
      recorded: new Set(),
      mode: 'quiz',
      startTime: Date.now(),
      endsAt: Date.now() + DURATION_MS,
      timerId: null,
      finished: false
    };
  }

  function persist() {
    if (state.finished) return;
    saveSession(RESUME_KIND, {
      items: exam,
      answers: state.answers,
      flagged: [...state.flagged],
      recorded: [...state.recorded],
      index: state.index,
      mode: state.mode,
      sessionId,
      startTime: state.startTime,
      remainingMs: Math.max(state.endsAt - Date.now(), 0)
    });
  }

  let torndown = false;
  function onHide() { if (document.visibilityState === 'hidden') persist(); }
  function onLeave() { teardown(true); }
  function teardown(persistFirst) {
    if (torndown) return;
    torndown = true;
    if (persistFirst) persist();
    stopTimer();
    document.removeEventListener('visibilitychange', onHide);
    window.removeEventListener('pagehide', persist);
    window.removeEventListener('hashchange', onLeave);
  }
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('pagehide', persist);
  window.addEventListener('hashchange', onLeave);

  persist();

  function applyTimerStyle(el, remaining) {
    el.classList.remove('text-warn', 'text-err');
    if (remaining < DANGER_MS) el.classList.add('text-err');
    else if (remaining < WARN_MS) el.classList.add('text-warn');
  }

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
      applyTimerStyle(el, remaining);
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
    const timerInitClass = remaining < DANGER_MS ? 'text-err' : remaining < WARN_MS ? 'text-warn' : '';
    const body = `
      <div class="flex items-center gap-3 mb-3">
        <div class="text-bone-300 text-xs">Q ${state.index + 1} of ${exam.length}</div>
        <div class="flex-1 h-1 bg-ink-700 rounded-full overflow-hidden">
          <div class="h-full bg-accent-amber" style="width:${percent(state.index, exam.length)}%"></div>
        </div>
        <div id="timer" class="font-mono text-sm ${timerInitClass}">${formatTime(remaining)}</div>
        <button id="flag" class="btn-ghost px-2 py-1 ${flagged ? 'text-accent-amber' : 'text-bone-300'}" aria-label="Flag">
          ${icon('flag', 'w-5 h-5')}
        </button>
      </div>
      <div class="card mb-4">
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
    container.innerHTML = pageShell('Registry Exam Simulator', body, { back: false });

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
        persist();
      });
    });

    container.querySelector('#flag').addEventListener('click', () => {
      if (state.flagged.has(state.index)) state.flagged.delete(state.index);
      else state.flagged.add(state.index);
      persist();
      renderQ();
    });
    container.querySelector('#prev').addEventListener('click', () => {
      if (state.index > 0) { state.index--; persist(); renderQ(); }
    });
    container.querySelector('#next').addEventListener('click', () => {
      if (state.index < exam.length - 1) { state.index++; persist(); renderQ(); }
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
    const timerInitClass = remaining < DANGER_MS ? 'text-err' : remaining < WARN_MS ? 'text-warn' : '';
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
        <div id="timer" class="font-mono text-sm ${timerInitClass}">${formatTime(remaining)}</div>
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
    container.innerHTML = pageShell('Registry Exam Simulator', body, { back: false });

    container.querySelectorAll('[data-goto]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.index = parseInt(btn.getAttribute('data-goto'), 10);
        state.mode = 'quiz';
        persist();
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
    if (state.finished) return;
    state.finished = true;
    teardown(false);
    clearSession(RESUME_KIND);

    const elapsedMs = Math.min(Date.now() - state.startTime, DURATION_MS);
    const scoredEntries = [];
    const pilotEntries = [];
    exam.forEach((q, i) => {
      const a = state.answers[i];
      const entry = { q, a, i, correct: a && a.correct };
      if (q.isPilot) pilotEntries.push(entry);
      else scoredEntries.push(entry);
    });

    const scoredCorrect = scoredEntries.filter(e => e.correct).length;
    // Floor the displayed percent so a sub-threshold score never rounds up.
    const scoredPct = Math.floor((scoredCorrect / SCORED_TOTAL) * 100);
    const pilotCorrect = pilotEntries.filter(e => e.correct).length;

    // ARRT reports a scaled score (1-99, pass at 75) that adjusts for form
    // difficulty. We cannot reproduce that from raw counts, so instead of a
    // hard PASS/FAIL we estimate readiness from the raw scored percentage.
    let readiness, readinessTone;
    if (scoredCorrect >= 64) { readiness = 'Strong pass - well above minimum'; readinessTone = 'ok'; }
    else if (scoredCorrect >= 56) { readiness = 'Likely pass - comfortable margin'; readinessTone = 'ok'; }
    else if (scoredCorrect >= 49) { readiness = 'Borderline - the real ARRT scaling could go either way'; readinessTone = 'warn'; }
    else { readiness = 'Below passing range - more study needed'; readinessTone = 'err'; }
    const toneText = readinessTone === 'ok' ? 'text-ok' : readinessTone === 'warn' ? 'text-warn' : 'text-err';
    const toneChip = readinessTone === 'ok' ? 'chip-ok' : readinessTone === 'warn' ? 'chip-warn' : 'chip-err';

    const areaResults = ARRT_AREAS.map(area => {
      const items = scoredEntries.filter(e => e.q.arrtArea === area.id);
      const correct = items.filter(e => e.correct).length;
      return { ...area, taken: items.length, correct };
    });

    try { await endSession(sessionId, { total: SCORED_TOTAL, correct: scoredCorrect, score: scoredPct, timeOut, pilotCorrect, pilotTotal: PILOT_TOTAL }); } catch {}

    const missedScored = scoredEntries.filter(e => !e.correct);
    const missedPilots = pilotEntries.filter(e => !e.correct);
    const allReview = [...missedScored.slice(0, 30), ...missedPilots.slice(0, 10)];

    const elapsedH = Math.floor(elapsedMs / 3600000);
    const elapsedM = Math.floor((elapsedMs % 3600000) / 60000);
    const timeUsed = elapsedH > 0 ? `${elapsedH}h ${elapsedM}m` : `${elapsedM}m`;

    const body = `
      <div class="card text-center mb-4">
        <div class="text-bone-300 text-xs uppercase tracking-widest">${timeOut ? 'Time up' : 'Exam complete'}</div>
        <div class="font-display text-6xl mt-2 ${toneText}">${scoredCorrect} / 75</div>
        <div class="text-bone-300 text-sm mt-1">${scoredCorrect} / 75 scored questions correct (${scoredPct}%)</div>
        <div class="mt-3"><span class="${toneChip}">Estimated readiness: ${readiness}</span></div>
        <div class="mt-3 text-bone-300 text-xs leading-relaxed">
          ARRT uses a scaled score (1-99, pass at 75) that adjusts for test form difficulty. This simulator uses raw percentage as an estimate. The actual passing threshold on the real exam typically falls around 65-70 percent correct on scored questions.
        </div>
        <div class="mt-3 text-bone-300 text-xs">Time used: ${timeUsed} / 2h 5m</div>
      </div>

      <div class="card mb-4">
        <div class="text-bone-300 text-xs uppercase tracking-widest mb-3">Breakdown by ARRT content area</div>
        <div class="grid gap-2">
          ${areaResults.map(a => {
            const areaPct = a.taken ? Math.round(a.correct / a.taken * 100) : 0;
            const tone = areaPct >= 75 ? 'text-ok' : areaPct >= 60 ? 'text-warn' : 'text-err';
            return `
              <div class="flex items-center gap-3 border-b border-ink-700 pb-2">
                <div class="flex-1 text-sm">${a.name}</div>
                <div class="font-mono text-sm ${tone}">${a.correct} / ${a.taken}</div>
                <div class="font-mono text-xs text-bone-300 w-10 text-right">${areaPct}%</div>
              </div>`;
          }).join('')}
        </div>
      </div>

      <div class="card mb-4">
        <div class="text-bone-300 text-xs uppercase tracking-widest mb-2">Pilot questions (unscored)</div>
        <div class="text-sm text-bone-200 mb-3">${PILOT_TOTAL} pilot questions did not count toward your score (${pilotCorrect} / ${PILOT_TOTAL} correct).</div>
        <div class="grid gap-1">
          ${pilotEntries.map(e => {
            const tone = e.correct ? 'text-ok' : (e.a ? 'text-err' : 'text-bone-300');
            const mark = e.correct ? '✓' : (e.a ? '✗' : '–');
            return `<div class="flex items-center gap-3 text-xs border-b border-ink-700 pb-1">
              <span class="font-mono ${tone} w-4">${mark}</span>
              <span class="text-bone-300 w-12">Q ${e.i + 1}</span>
              <span class="text-bone-200 flex-1 truncate">${e.q.id}${e.q.topic ? ` · ${e.q.topic}` : ''}</span>
              <span class="text-bone-300">${e.q.category}</span>
            </div>`;
          }).join('')}
        </div>
      </div>

      ${allReview.length ? `
        <div class="mb-2 text-bone-300 text-xs uppercase tracking-widest">Review missed (showing ${allReview.length})</div>
        <div class="grid gap-3 mb-4">
          ${allReview.map(m => `
            <div class="card">
              <div class="flex items-center gap-2 text-xs text-bone-300 mb-2">
                <span>Q ${m.i + 1}</span>
                ${m.q.isPilot ? '<span class="chip-muted">pilot · unscored</span>' : `<span class="chip-muted">${ARRT_AREAS.find(a => a.id === m.q.arrtArea)?.name || 'scored'}</span>`}
                <span class="ml-auto">${m.q.id}</span>
              </div>
              <div class="text-sm mb-2">${m.q.question}</div>
              ${m.a ? `<div class="text-xs mb-2"><span class="text-err">Your answer:</span> ${m.q.options[m.a.chosen]}</div>` : '<div class="text-xs mb-2"><span class="text-err">Not answered</span></div>'}
              <div class="text-xs mb-2"><span class="text-ok">Correct:</span> ${m.q.options[m.q.correct]}</div>
              <div class="text-xs text-bone-300">${m.q.explanation || ''}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <div class="grid grid-cols-2 gap-2">
        <button data-nav-to="examSim" class="btn-secondary">Retake</button>
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

export async function renderExamSimulator(container, params = []) {
  if (params[0] === 'run') {
    await runner(container);
    return;
  }
  if (params[0] === 'resume') {
    const saved = loadSession(RESUME_KIND);
    if (saved) { await runner(container, saved); return; }
    introScreen(container);
    return;
  }
  introScreen(container);
}
