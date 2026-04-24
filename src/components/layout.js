import { icon } from '../js/icons.js';
import { navigate } from '../js/router.js';

const NAV_TABS = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'quiz', label: 'Quiz', icon: 'brain' },
  { key: 'flashcards', label: 'Cards', icon: 'cards' },
  { key: 'reference', label: 'Ref', icon: 'book' },
  { key: 'stats', label: 'Stats', icon: 'chart' }
];

function currentRoot() {
  const h = window.location.hash.replace(/^#\/?/, '');
  return h.split('/')[0] || 'home';
}

function headerHtml(title, { back, backTo }) {
  const left = back
    ? `<button data-action="back" data-to="${backTo || 'home'}" class="btn-ghost px-2 py-1 -ml-2" aria-label="Back">${icon('back', 'w-5 h-5')}</button>`
    : `<div class="w-8"></div>`;
  return `
    <header class="safe-top sticky top-0 z-20 bg-ink-900/85 backdrop-blur border-b border-ink-700">
      <div class="max-w-2xl mx-auto px-4 h-14 flex items-center gap-2">
        ${left}
        <h1 class="font-display text-lg flex-1 truncate">${title}</h1>
      </div>
    </header>
  `;
}

function navHtml() {
  const active = currentRoot();
  const tabs = NAV_TABS.map(t => `
    <button data-nav="${t.key}" class="nav-tab ${t.key === active ? 'active' : ''}" aria-label="${t.label}">
      ${icon(t.icon, 'w-5 h-5')}
      <span>${t.label}</span>
    </button>
  `).join('');
  return `
    <nav class="safe-bottom fixed bottom-0 inset-x-0 z-20 bg-ink-900/90 backdrop-blur border-t border-ink-700">
      <div class="max-w-2xl mx-auto flex">
        ${tabs}
      </div>
    </nav>
  `;
}

export function pageShell(title, bodyHtml, opts = {}) {
  return `
    ${headerHtml(title, opts)}
    <main class="max-w-2xl mx-auto px-4 pt-4 pb-28 animate-fade-in">
      ${bodyHtml}
    </main>
    ${navHtml()}
  `;
}

export function attachBackButton(container) {
  container.querySelectorAll('[data-action="back"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const to = btn.getAttribute('data-to') || 'home';
      navigate(to);
    });
  });
  container.querySelectorAll('[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => {
      navigate(btn.getAttribute('data-nav'));
    });
  });
}
