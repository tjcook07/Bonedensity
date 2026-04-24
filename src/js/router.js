import { renderHome } from '../components/home.js';
import { renderQuiz } from '../components/quiz.js';
import { renderFlashcards } from '../components/flashcards.js';
import { renderReference } from '../components/reference.js';
import { renderStats } from '../components/stats.js';
import { renderExam } from '../components/exam.js';
import { renderSettings } from '../components/settings.js';
import { renderPrecision } from '../components/precision.js';
import { renderStudyGuide } from '../components/studyGuide.js';

const routes = {
  '': renderHome,
  'home': renderHome,
  'quiz': renderQuiz,
  'flashcards': renderFlashcards,
  'reference': renderReference,
  'stats': renderStats,
  'exam': renderExam,
  'settings': renderSettings,
  'precision': renderPrecision,
  'study': renderStudyGuide
};

function parseHash() {
  const h = window.location.hash.replace(/^#\/?/, '');
  const [path, ...rest] = h.split('/');
  return { path: path || 'home', params: rest };
}

export function initRouter() {
  const app = document.getElementById('app');
  const render = async () => {
    const { path, params } = parseHash();
    const handler = routes[path] || routes.home;
    app.classList.add('opacity-0');
    await new Promise(r => setTimeout(r, 50));
    app.innerHTML = '';
    await handler(app, params);
    app.classList.remove('opacity-0');
  };
  window.addEventListener('hashchange', render);
  app.classList.add('transition-opacity', 'duration-150');
  render();
}

export function navigate(path) {
  window.location.hash = `#/${path}`;
}
