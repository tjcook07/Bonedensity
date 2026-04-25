import { pageShell, attachBackButton } from './layout.js';
import { icon } from '../js/icons.js';
import { navigate } from '../js/router.js';
import { shuffle } from '../js/util.js';
import questions from '../data/questions.json';

const STORAGE_KEY = 'quizBuilder.lastFilters';
const SESSION_KEY = 'quizBuilder.currentSession';
const QUICK_STARTS = [10, 25, 50, 75];
const MIN_COUNT = 5;
const MAX_COUNT = 100;

const ALL_CATEGORIES = (() => {
  const counts = {};
  for (const q of questions) counts[q.category] = (counts[q.category] || 0) + 1;
  return Object.keys(counts).sort();
})();

const CATEGORY_COUNTS = (() => {
  const counts = {};
  for (const q of questions) counts[q.category] = (counts[q.category] || 0) + 1;
  return counts;
})();

function defaultFilters() {
  return {
    categories: [...ALL_CATEGORIES],
    difficulty: { easy: true, medium: true, hard: true },
    types: ['multiple_choice', 'true_false'],
    highYieldOnly: false,
    count: 25,
    mode: 'study',
    order: 'random'
  };
}

function loadFilters() {
  const fallback = defaultFilters();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      categories: Array.isArray(parsed.categories)
        ? parsed.categories.filter(c => ALL_CATEGORIES.includes(c))
        : fallback.categories,
      difficulty: {
        easy: parsed.difficulty?.easy !== false,
        medium: parsed.difficulty?.medium !== false,
        hard: parsed.difficulty?.hard !== false
      },
      types: Array.isArray(parsed.types) && parsed.types.length ? parsed.types : fallback.types,
      highYieldOnly: parsed.highYieldOnly === true,
      count: clampCount(parsed.count ?? fallback.count),
      mode: parsed.mode === 'test' ? 'test' : 'study',
      order: parsed.order === 'category' ? 'category' : 'random'
    };
  } catch {
    return fallback;
  }
}

function saveFilters(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

function clampCount(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 25;
  return Math.max(MIN_COUNT, Math.min(MAX_COUNT, Math.round(x)));
}

function applyFilters(state) {
  const cats = new Set(state.categories);
  const diffs = new Set(Object.entries(state.difficulty).filter(([, on]) => on).map(([k]) => k));
  const types = new Set(state.types);
  return questions.filter(q =>
    cats.has(q.category) &&
    diffs.has(q.difficulty) &&
    types.has(q.type) &&
    (!state.highYieldOnly || q.highYield === true)
  );
}

function orderQuestions(list, order) {
  if (order === 'category') {
    const grouped = list.slice().sort((a, b) => {
      const c = a.category.localeCompare(b.category);
      if (c !== 0) return c;
      return (a.module || 0) - (b.module || 0);
    });
    return grouped;
  }
  return shuffle(list);
}

function startQuiz(filtered, state) {
  const ordered = orderQuestions(filtered, state.order);
  const sliced = ordered.slice(0, Math.min(state.count, ordered.length));
  const session = {
    questions: sliced,
    mode: state.mode,
    createdAt: Date.now()
  };
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); }
  catch {
    // Fall back to in-memory cache if sessionStorage is unavailable
    window.__quizBuilderSession = session;
  }
  navigate('quiz/run/custom');
}

function chipButton(label, count, selected) {
  const base = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition active:scale-[0.98]';
  const cls = selected
    ? `${base} bg-accent-amber text-ink-950 border-accent-amber`
    : `${base} bg-ink-700 text-bone-300 border-ink-600 hover:bg-ink-600`;
  return `<button data-chip="${label}" class="${cls}">
    <span>${label}</span>
    <span class="${selected ? 'text-ink-950/70' : 'text-bone-300/70'} font-mono">${count}</span>
  </button>`;
}

function quickStartPill(n) {
  return `<button data-quickstart="${n}" class="flex-1 min-w-[5rem] py-3 rounded-xl bg-accent-amber text-ink-950 font-display text-lg font-semibold border border-accent-amber/60 transition hover:bg-accent-gold active:scale-[0.98]">
    ${n}
    <span class="block text-[10px] uppercase tracking-widest text-ink-950/70 font-body font-medium mt-0.5">questions</span>
  </button>`;
}

function checkbox(id, label, checked) {
  return `<label class="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-ink-800 border border-ink-700 cursor-pointer hover:bg-ink-700 transition">
    <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} class="accent-accent-amber w-4 h-4" />
    <span class="text-sm">${label}</span>
  </label>`;
}

function radio(name, value, label, selected, helper) {
  return `<label class="flex-1 flex items-start gap-2 px-3 py-2.5 rounded-lg bg-ink-800 border ${selected ? 'border-accent-amber' : 'border-ink-700'} cursor-pointer hover:bg-ink-700 transition">
    <input type="radio" name="${name}" value="${value}" ${selected ? 'checked' : ''} class="accent-accent-amber w-4 h-4 mt-0.5" />
    <span>
      <span class="text-sm font-medium block">${label}</span>
      ${helper ? `<span class="text-bone-300 text-xs">${helper}</span>` : ''}
    </span>
  </label>`;
}

function buildBody(state) {
  const filtered = applyFilters(state);
  const matchCount = filtered.length;
  const requested = state.count;
  const allSelected = state.categories.length === ALL_CATEGORIES.length;

  const categoryChips = ALL_CATEGORIES.map(cat =>
    chipButton(cat, CATEGORY_COUNTS[cat] || 0, state.categories.includes(cat))
  ).join('');

  return `
    <div class="card mb-4">
      <div class="text-bone-300 text-xs uppercase tracking-widest mb-2">Quick start</div>
      <div class="flex gap-2">
        ${QUICK_STARTS.map(quickStartPill).join('')}
      </div>
      <div class="text-bone-300 text-xs mt-2">All categories, all difficulties, random order, study mode.</div>
    </div>

    <div class="card mb-4">
      <div class="flex items-center justify-between mb-2">
        <div class="text-bone-300 text-xs uppercase tracking-widest">Categories</div>
        <button data-action="all-cats" class="text-xs text-accent-amber hover:underline">${allSelected ? 'Clear' : 'All'}</button>
      </div>
      <div class="flex flex-wrap gap-2">${categoryChips}</div>
    </div>

    <div class="card mb-4">
      <div class="text-bone-300 text-xs uppercase tracking-widest mb-2">Difficulty</div>
      <div class="flex flex-wrap gap-2">
        ${checkbox('diff-easy', 'Easy', state.difficulty.easy)}
        ${checkbox('diff-medium', 'Medium', state.difficulty.medium)}
        ${checkbox('diff-hard', 'Hard', state.difficulty.hard)}
      </div>
    </div>

    <div class="card mb-4">
      <div class="text-bone-300 text-xs uppercase tracking-widest mb-2">Source</div>
      ${checkbox('high-yield', 'High-yield only', state.highYieldOnly)}
    </div>

    <div class="card mb-4">
      <div class="flex items-center justify-between mb-2">
        <div class="text-bone-300 text-xs uppercase tracking-widest">Count</div>
        <div class="font-mono text-accent-amber text-lg" id="count-display">${state.count}</div>
      </div>
      <input type="range" id="count-slider" min="${MIN_COUNT}" max="${MAX_COUNT}" step="1" value="${state.count}" class="w-full accent-accent-amber" />
      <div class="flex justify-between text-bone-300 text-xs mt-1">
        <span>${MIN_COUNT}</span><span>${MAX_COUNT}</span>
      </div>
    </div>

    <div class="card mb-4">
      <div class="text-bone-300 text-xs uppercase tracking-widest mb-2">Mode</div>
      <div class="flex gap-2">
        ${radio('mode', 'study', 'Study mode', state.mode === 'study', 'Show explanation after each answer')}
        ${radio('mode', 'test', 'Test mode', state.mode === 'test', 'Score shown at the end, no explanations')}
      </div>
    </div>

    <div class="card mb-4">
      <div class="text-bone-300 text-xs uppercase tracking-widest mb-2">Order</div>
      <div class="flex gap-2">
        ${radio('order', 'random', 'Random', state.order === 'random', 'Shuffle the matching pool')}
        ${radio('order', 'category', 'By category', state.order === 'category', 'Group consecutive by category')}
      </div>
    </div>

    <div class="sticky bottom-20 -mx-4 px-4 pt-3 pb-3 bg-ink-900/95 backdrop-blur border-t border-ink-700">
      <button id="start-quiz" class="btn-primary w-full text-base font-display py-3" ${matchCount === 0 ? 'disabled' : ''}>
        ${icon('play', 'w-5 h-5')} Start Quiz
      </button>
      <div id="match-line" class="text-center text-bone-300 text-xs mt-2">
        <span class="font-mono ${matchCount === 0 ? 'text-err' : 'text-bone-100'}">${matchCount}</span> question${matchCount === 1 ? '' : 's'} match your filters
        ${matchCount > 0 && matchCount < requested ? `<span class="block text-warn mt-0.5">Only ${matchCount} match — quiz will use ${matchCount} (or reduce filters)</span>` : ''}
        ${matchCount === 0 ? '<span class="block text-err mt-0.5">No questions match — relax your filters</span>' : ''}
      </div>
    </div>
  `;
}

function refreshMatchLine(container, state) {
  const filtered = applyFilters(state);
  const matchCount = filtered.length;
  const requested = state.count;
  const startBtn = container.querySelector('#start-quiz');
  const line = container.querySelector('#match-line');
  if (startBtn) startBtn.disabled = matchCount === 0;
  if (line) {
    line.innerHTML = `
      <span class="font-mono ${matchCount === 0 ? 'text-err' : 'text-bone-100'}">${matchCount}</span> question${matchCount === 1 ? '' : 's'} match your filters
      ${matchCount > 0 && matchCount < requested ? `<span class="block text-warn mt-0.5">Only ${matchCount} match — quiz will use ${matchCount} (or reduce filters)</span>` : ''}
      ${matchCount === 0 ? '<span class="block text-err mt-0.5">No questions match — relax your filters</span>' : ''}
    `;
  }
}

function attachHandlers(container, state) {
  // Quick-start pills bypass current filter state — instant default-config quiz
  container.querySelectorAll('[data-quickstart]').forEach(btn => {
    btn.addEventListener('click', () => {
      const n = parseInt(btn.getAttribute('data-quickstart'), 10);
      const fresh = defaultFilters();
      fresh.count = n;
      saveFilters(fresh);
      const filtered = applyFilters(fresh);
      startQuiz(filtered, fresh);
    });
  });

  // Category chips
  container.querySelectorAll('[data-chip]').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.getAttribute('data-chip');
      const idx = state.categories.indexOf(cat);
      if (idx >= 0) state.categories.splice(idx, 1);
      else state.categories.push(cat);
      saveFilters(state);
      rerender(container, state);
    });
  });

  const allCatsBtn = container.querySelector('[data-action="all-cats"]');
  if (allCatsBtn) {
    allCatsBtn.addEventListener('click', () => {
      const allSelected = state.categories.length === ALL_CATEGORIES.length;
      state.categories = allSelected ? [] : [...ALL_CATEGORIES];
      saveFilters(state);
      rerender(container, state);
    });
  }

  // Difficulty checkboxes
  ['easy', 'medium', 'hard'].forEach(d => {
    const el = container.querySelector(`#diff-${d}`);
    if (el) el.addEventListener('change', () => {
      state.difficulty[d] = el.checked;
      saveFilters(state);
      refreshMatchLine(container, state);
    });
  });

  // High-yield checkbox
  const hy = container.querySelector('#high-yield');
  if (hy) hy.addEventListener('change', () => {
    state.highYieldOnly = hy.checked;
    saveFilters(state);
    refreshMatchLine(container, state);
  });

  // Count slider
  const slider = container.querySelector('#count-slider');
  const countDisplay = container.querySelector('#count-display');
  if (slider) {
    slider.addEventListener('input', () => {
      state.count = clampCount(slider.value);
      if (countDisplay) countDisplay.textContent = String(state.count);
      saveFilters(state);
      refreshMatchLine(container, state);
    });
  }

  // Mode radios
  container.querySelectorAll('input[name="mode"]').forEach(r => {
    r.addEventListener('change', () => {
      if (r.checked) {
        state.mode = r.value;
        saveFilters(state);
        rerender(container, state);
      }
    });
  });

  // Order radios
  container.querySelectorAll('input[name="order"]').forEach(r => {
    r.addEventListener('change', () => {
      if (r.checked) {
        state.order = r.value;
        saveFilters(state);
        rerender(container, state);
      }
    });
  });

  // Start button
  const startBtn = container.querySelector('#start-quiz');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      const filtered = applyFilters(state);
      if (filtered.length === 0) return;
      startQuiz(filtered, state);
    });
  }
}

function rerender(container, state) {
  container.innerHTML = pageShell('Quiz', buildBody(state));
  attachBackButton(container);
  attachHandlers(container, state);
}

export function renderQuizBuilder(container) {
  const state = loadFilters();
  rerender(container, state);
}

export function consumeBuilderSession() {
  let session = null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      session = JSON.parse(raw);
      sessionStorage.removeItem(SESSION_KEY);
    }
  } catch {}
  if (!session && window.__quizBuilderSession) {
    session = window.__quizBuilderSession;
    delete window.__quizBuilderSession;
  }
  return session;
}
