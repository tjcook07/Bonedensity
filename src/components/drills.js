import { pageShell, attachBackButton } from './layout.js';
import { icon } from '../js/icons.js';
import { navigate } from '../js/router.js';
import { shuffle, percent } from '../js/util.js';
import drillData from '../data/drills.json';

const DECKS = drillData.decks || [];
const PROGRESS_KEY = 'drill-progress';
const MASTERY_STREAK = 3;

/* ---------- localStorage progress ---------- */

function getProgress() {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {}; }
  catch { return {}; }
}

function saveProgress(p) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
}

function cardStat(progress, id) {
  return progress[id] || { seen: 0, correct: 0, streak: 0, lastReviewed: null };
}

function recordAnswer(id, gotIt) {
  const p = getProgress();
  const s = cardStat(p, id);
  const next = {
    seen: s.seen + 1,
    correct: s.correct + (gotIt ? 1 : 0),
    streak: gotIt ? s.streak + 1 : 0,
    lastReviewed: new Date().toISOString()
  };
  p[id] = next;
  saveProgress(p);
}

/* ---------- mastery + priority ---------- */

function deckById(id) { return DECKS.find(d => d.deckId === id); }

function masteredCount(deck, progress) {
  return deck.cards.filter(c => cardStat(progress, c.id).streak >= MASTERY_STREAK).length;
}

function masteryPct(deck, progress) {
  return percent(masteredCount(deck, progress), deck.cards.length);
}

// streak -> priority tier: 0 (highest) ... 3 (lowest)
function tier(streak) {
  if (streak <= 0) return 0;
  if (streak === 1) return 1;
  if (streak === 2) return 2;
  return 3;
}
const TIER_WEIGHT = [8, 4, 2, 1];

// Full deck: every card, low-streak tiers first, shuffled within each tier.
function orderFullDeck(cards, progress) {
  const buckets = [[], [], [], []];
  for (const c of cards) buckets[tier(cardStat(progress, c.id).streak)].push(c);
  return buckets.flatMap(b => shuffle(b));
}

// N cards: weighted sample without replacement, favoring low-streak cards.
function weightedSample(cards, progress, n) {
  const pool = cards.map(c => ({ c, w: TIER_WEIGHT[tier(cardStat(progress, c.id).streak)] }));
  const picked = [];
  while (picked.length < n && pool.length) {
    const total = pool.reduce((s, x) => s + x.w, 0);
    let r = Math.random() * total;
    let idx = 0;
    for (; idx < pool.length; idx++) { r -= pool[idx].w; if (r <= 0) break; }
    if (idx >= pool.length) idx = pool.length - 1;
    picked.push(pool[idx].c);
    pool.splice(idx, 1);
  }
  return picked;
}

/* ---------- landing (deck list) ---------- */

let sortMode = 'default'; // 'default' | 'least'

function landing(container) {
  const progress = getProgress();
  let decks = DECKS.map(d => ({ deck: d, pct: masteryPct(d, progress) }));
  if (sortMode === 'least') decks = decks.slice().sort((a, b) => a.pct - b.pct);

  const sortBtn = (mode, label) => `
    <button data-sort="${mode}" class="chip ${sortMode === mode ? 'bg-accent-amber text-ink-950' : 'chip-muted'}">${label}</button>
  `;

  const rows = decks.map(({ deck, pct }) => `
    <button data-deck="${deck.deckId}" class="card card-hover text-left w-full">
      <div class="flex items-center gap-3">
        <span class="text-accent-amber">${icon('zap', 'w-5 h-5')}</span>
        <span class="flex-1 min-w-0">
          <div class="font-display text-base truncate">${deck.deckName}</div>
          <div class="text-bone-300 text-xs mt-0.5">${deck.cards.length} cards · ${pct}% mastered</div>
        </span>
        <span class="text-bone-300">${icon('chevron_right', 'w-4 h-4')}</span>
      </div>
      <div class="h-1.5 bg-ink-700 rounded-full overflow-hidden mt-3">
        <div class="h-full bg-accent-amber transition-all" style="width:${pct}%"></div>
      </div>
    </button>
  `).join('');

  const body = `
    <div class="mb-4">
      <p class="text-bone-300 text-sm">Rapid recall practice</p>
    </div>
    <div class="flex items-center gap-2 mb-4">
      <span class="text-bone-300 text-xs uppercase tracking-widest mr-1">Sort</span>
      ${sortBtn('default', 'Default order')}
      ${sortBtn('least', 'Least mastered first')}
    </div>
    <div class="grid gap-2.5">
      ${rows}
    </div>
  `;

  container.innerHTML = pageShell('Drills', body);
  attachBackButton(container);
  container.querySelectorAll('[data-sort]').forEach(b => {
    b.addEventListener('click', () => { sortMode = b.getAttribute('data-sort'); landing(container); });
  });
  container.querySelectorAll('[data-deck]').forEach(b => {
    b.addEventListener('click', () => navigate(`drills/deck/${b.getAttribute('data-deck')}`));
  });
}

/* ---------- deck config screen ---------- */

function deckConfig(container, deckId) {
  const deck = deckById(deckId);
  if (!deck) { landing(container); return; }
  const cfg = { direction: 'front-back', size: '10' };

  function render() {
    const toggle = (group, value, label) => `
      <button data-group="${group}" data-value="${value}"
        class="drill-btn flex-1 rounded-lg font-medium transition ${cfg[group] === value ? 'bg-accent-amber text-ink-950' : 'bg-ink-700 text-bone-100'}">
        ${label}
      </button>
    `;
    const fullLabel = `Full deck (${deck.cards.length})`;
    const sizeTen = Math.min(10, deck.cards.length);
    const body = `
      <div class="mb-6">
        <div class="text-bone-300 text-xs uppercase tracking-widest mb-2">Direction</div>
        <div class="flex gap-2">
          ${toggle('direction', 'front-back', 'Front to Back')}
          ${toggle('direction', 'back-front', 'Back to Front')}
        </div>
        <div class="text-bone-300 text-xs mt-2">
          ${cfg.direction === 'front-back'
            ? 'See the term, recall the definition.'
            : 'See the definition, recall the term.'}
        </div>
      </div>
      <div class="mb-8">
        <div class="text-bone-300 text-xs uppercase tracking-widest mb-2">Session size</div>
        <div class="flex gap-2">
          ${toggle('size', '10', `${sizeTen} cards`)}
          ${toggle('size', 'full', fullLabel)}
        </div>
      </div>
      <button data-start class="btn-primary drill-btn w-full">
        ${icon('play', 'w-5 h-5')} Start
      </button>
    `;
    container.innerHTML = pageShell(deck.deckName, body, { back: true, backTo: 'drills' });
    attachBackButton(container);
    container.querySelectorAll('[data-group]').forEach(b => {
      b.addEventListener('click', () => {
        cfg[b.getAttribute('data-group')] = b.getAttribute('data-value');
        render();
      });
    });
    container.querySelector('[data-start]').addEventListener('click', () => {
      const progress = getProgress();
      const selection = cfg.size === 'full'
        ? orderFullDeck(deck.cards, progress)
        : weightedSample(deck.cards, progress, Math.min(10, deck.cards.length));
      startSession(container, deck, cfg.direction, selection);
    });
  }

  render();
}

/* ---------- session screen ---------- */

function toFace(card, direction) {
  return direction === 'back-front'
    ? { prompt: card.back, answer: card.front }
    : { prompt: card.front, answer: card.back };
}

function startSession(container, deck, direction, sourceCards) {
  const cards = sourceCards.map(c => ({ src: c, ...toFace(c, direction) }));
  const state = { i: 0, flipped: false, correct: 0, missed: [] };

  function complete() {
    const total = cards.length;
    const pct = percent(state.correct, total);
    const missedList = state.missed.length
      ? `
        <div class="mt-4">
          <div class="text-bone-300 text-xs uppercase tracking-widest mb-2">Missed cards</div>
          <div class="grid gap-2">
            ${state.missed.map(m => {
              const f = toFace(m, direction);
              return `
                <div class="card flex items-center gap-3 py-3">
                  <span class="flex-1 text-sm">${f.prompt}</span>
                  <span class="text-bone-300">${icon('chevron_right', 'w-4 h-4')}</span>
                  <span class="flex-1 text-sm text-accent-amber text-right">${f.answer}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `
      : `<div class="card text-center text-ok mt-4">Perfect run — nothing missed.</div>`;

    const body = `
      <div class="card text-center mb-2">
        <div class="text-bone-300 text-xs uppercase tracking-widest">Session complete</div>
        <div class="font-display text-5xl mt-2 text-accent-amber">${pct}%</div>
        <div class="text-bone-300 text-sm mt-1">You got ${state.correct} out of ${total} correct</div>
      </div>
      ${missedList}
      <div class="grid grid-cols-2 gap-2 mt-6">
        <button data-redo class="btn-secondary drill-btn" ${state.missed.length ? '' : 'disabled'}>Redo Missed</button>
        <button data-decks class="btn-primary drill-btn">Back to Decks</button>
      </div>
    `;
    container.innerHTML = pageShell(deck.deckName, body, { back: true, backTo: 'drills' });
    attachBackButton(container);
    const redo = container.querySelector('[data-redo]');
    if (redo && state.missed.length) {
      redo.addEventListener('click', () => startSession(container, deck, direction, shuffle(state.missed)));
    }
    container.querySelector('[data-decks]').addEventListener('click', () => navigate('drills'));
  }

  function render() {
    if (state.i >= cards.length) { complete(); return; }
    const card = cards[state.i];
    const answered = state.flipped;
    const body = `
      <div class="flex items-center justify-between mb-2">
        <span class="text-bone-300 text-xs">Card ${state.i + 1} of ${cards.length}</span>
        <span class="text-bone-300 text-xs">${state.correct} correct</span>
      </div>
      <div class="h-1.5 bg-ink-700 rounded-full overflow-hidden mb-4">
        <div class="h-full bg-accent-amber transition-all" style="width:${percent(state.i, cards.length)}%"></div>
      </div>
      <div class="drill-card mb-5 ${state.flipped ? 'flipped' : ''}" id="dc" role="button" tabindex="0" aria-label="Flashcard, tap to reveal answer">
        <div class="drill-card-inner">
          <div class="drill-face drill-face-front">
            <div class="text-2xl leading-relaxed font-display">${card.prompt}</div>
            <div class="text-bone-300 text-xs mt-4">Tap to reveal</div>
          </div>
          <div class="drill-face drill-face-back">
            <div class="text-xs text-accent-amber/80 uppercase tracking-widest mb-2">Answer</div>
            <div class="text-2xl leading-relaxed font-display text-bone-50">${card.answer}</div>
          </div>
        </div>
      </div>
      ${answered
        ? `
          <div class="grid grid-cols-2 gap-3">
            <button data-mark="miss" class="btn-danger drill-btn">${icon('x', 'w-5 h-5')} Missed</button>
            <button data-mark="got" class="btn-primary drill-btn" style="background-color:#16a34a;color:#fff">${icon('check', 'w-5 h-5')} Got it</button>
          </div>
        `
        : `<button data-show class="btn-secondary drill-btn w-full">Show Answer</button>`}
    `;
    container.innerHTML = pageShell(deck.deckName, body, { back: true, backTo: 'drills' });
    attachBackButton(container);

    const flip = () => { if (!state.flipped) { state.flipped = true; render(); } };
    const dc = container.querySelector('#dc');
    dc.addEventListener('click', flip);
    dc.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });
    const showBtn = container.querySelector('[data-show]');
    if (showBtn) showBtn.addEventListener('click', flip);

    container.querySelectorAll('[data-mark]').forEach(b => {
      b.addEventListener('click', () => {
        const gotIt = b.getAttribute('data-mark') === 'got';
        recordAnswer(card.src.id, gotIt);
        if (gotIt) state.correct++;
        else state.missed.push(card.src);
        state.i++;
        state.flipped = false;
        render();
      });
    });
  }

  render();
}

/* ---------- entry ---------- */

export async function renderDrills(container, params = []) {
  if (params[0] === 'deck' && params[1]) {
    deckConfig(container, params[1]);
    return;
  }
  landing(container);
}
