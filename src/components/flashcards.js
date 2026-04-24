import { pageShell, attachBackButton } from './layout.js';
import { icon } from '../js/icons.js';
import { navigate } from '../js/router.js';
import { shuffle, percent } from '../js/util.js';
import { scheduleReview } from '../js/storage.js';
import flashcards from '../data/flashcards.json';
import modules from '../data/modules.json';

function moduleLabel(n) {
  const mod = (modules.modules || []).find(m => m.id === n);
  return mod ? `${n}. ${mod.title}` : `Module ${n}`;
}

function picker(container) {
  const byModule = {};
  for (const c of flashcards) byModule[c.module] = (byModule[c.module] || 0) + 1;
  const modList = Object.keys(byModule).map(Number).sort((a, b) => a - b);
  const body = `
    <div class="mb-4">
      <button data-go="all" class="card card-hover flex items-center gap-3 text-left w-full">
        <span class="text-accent-amber">${icon('cards', 'w-6 h-6')}</span>
        <span class="flex-1">
          <div class="font-display text-lg">Full deck</div>
          <div class="text-bone-300 text-xs">${flashcards.length} cards</div>
        </span>
        <span class="text-bone-300">${icon('chevron_right', 'w-5 h-5')}</span>
      </button>
    </div>
    <div>
      <div class="text-bone-300 text-xs uppercase tracking-widest mb-2">By module</div>
      <div class="grid gap-2">
        ${modList.map(m => `
          <button data-go="module-${m}" class="card card-hover flex items-center gap-3 text-left py-3">
            <span class="font-mono text-accent-amber text-sm w-6 text-center">${m}</span>
            <span class="flex-1 text-sm">${moduleLabel(m)}</span>
            <span class="chip-muted">${byModule[m]}</span>
            <span class="text-bone-300">${icon('chevron_right', 'w-4 h-4')}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;
  container.innerHTML = pageShell('Flashcards', body);
  attachBackButton(container);
  container.querySelectorAll('[data-go]').forEach(b => {
    b.addEventListener('click', () => navigate(`flashcards/run/${b.getAttribute('data-go')}`));
  });
}

function pickDeck(key) {
  if (key === 'all') return shuffle(flashcards);
  if (key.startsWith('module-')) {
    const m = parseInt(key.slice(7), 10);
    return shuffle(flashcards.filter(c => c.module === m));
  }
  return [];
}

async function runner(container, key) {
  const deck = pickDeck(key);
  if (deck.length === 0) {
    container.innerHTML = pageShell('Flashcards', `
      <div class="card text-center py-10">
        <div class="text-bone-300">No cards for this selection.</div>
        <button data-action="back" data-to="flashcards" class="btn-primary mt-4">Back</button>
      </div>
    `, { back: true, backTo: 'flashcards' });
    attachBackButton(container);
    return;
  }

  const state = { index: 0, tally: { again: 0, good: 0, easy: 0 } };

  function render() {
    if (state.index >= deck.length) {
      const t = state.tally;
      const total = t.again + t.good + t.easy;
      container.innerHTML = pageShell('Flashcards', `
        <div class="card text-center mb-4">
          <div class="text-bone-300 text-xs uppercase tracking-widest">Deck complete</div>
          <div class="font-display text-5xl mt-2 text-accent-amber">${total}</div>
          <div class="text-bone-300 text-sm mt-1">cards reviewed</div>
        </div>
        <div class="grid grid-cols-3 gap-2 mb-4">
          <div class="card text-center"><div class="text-err font-display text-2xl">${t.again}</div><div class="text-bone-300 text-xs">Again</div></div>
          <div class="card text-center"><div class="text-accent-amber font-display text-2xl">${t.good}</div><div class="text-bone-300 text-xs">Good</div></div>
          <div class="card text-center"><div class="text-ok font-display text-2xl">${t.easy}</div><div class="text-bone-300 text-xs">Easy</div></div>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <button data-nav-to="flashcards" class="btn-secondary">More</button>
          <button data-nav-to="home" class="btn-primary">Home</button>
        </div>
      `, { back: true, backTo: 'flashcards' });
      attachBackButton(container);
      container.querySelectorAll('[data-nav-to]').forEach(b => {
        b.addEventListener('click', () => navigate(b.getAttribute('data-nav-to')));
      });
      return;
    }

    const card = deck[state.index];
    const t = state.tally;
    const body = `
      <div class="flex items-center justify-between mb-3">
        <span class="text-bone-300 text-xs">Card ${state.index + 1} of ${deck.length}</span>
        <div class="flex gap-2 text-xs">
          <span class="chip-err">${t.again}</span>
          <span class="chip-warn">${t.good}</span>
          <span class="chip-ok">${t.easy}</span>
        </div>
      </div>
      <div class="h-1 bg-ink-700 rounded-full overflow-hidden mb-4">
        <div class="h-full bg-accent-amber" style="width:${percent(state.index, deck.length)}%"></div>
      </div>
      <div class="flashcard mb-4" id="fc">
        <div class="flashcard-inner">
          <div class="flashcard-face">
            <div>
              <div class="text-xs text-bone-300 uppercase tracking-widest mb-2">Mod ${card.module}${card.topic ? ` · ${card.topic}` : ''}</div>
              <div class="text-lg leading-relaxed">${card.front}</div>
              <div class="text-bone-300 text-xs mt-4">Tap to flip</div>
            </div>
          </div>
          <div class="flashcard-face flashcard-back">
            <div class="text-base leading-relaxed">${card.back}</div>
          </div>
        </div>
      </div>
      <div id="ratings" class="grid grid-cols-3 gap-2 ${null}" hidden>
        <button data-rate="again" class="btn-danger">Again</button>
        <button data-rate="good" class="btn-secondary">Good</button>
        <button data-rate="easy" class="btn-primary">Easy</button>
      </div>
    `;
    container.innerHTML = pageShell('Flashcards', body, { back: true, backTo: 'flashcards' });
    attachBackButton(container);

    const fc = container.querySelector('#fc');
    const ratings = container.querySelector('#ratings');
    fc.addEventListener('click', () => {
      fc.classList.add('flipped');
      ratings.hidden = false;
    });
    ratings.querySelectorAll('[data-rate]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const rating = btn.getAttribute('data-rate');
        state.tally[rating]++;
        try { await scheduleReview(card.id, rating); } catch {}
        state.index++;
        render();
      });
    });
  }

  render();
}

export async function renderFlashcards(container, params = []) {
  if (params[0] === 'run' && params[1]) {
    await runner(container, params[1]);
    return;
  }
  picker(container);
}
