export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function shuffleOptions(question) {
  const indices = question.options.map((_, i) => i);
  const shuffled = shuffle(indices);
  const newOptions = shuffled.map(i => question.options[i]);
  const newCorrect = shuffled.indexOf(question.correct);
  return { ...question, options: newOptions, correct: newCorrect, _originalCorrect: question.correct };
}

export function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function formatDate(ts) { return new Date(ts).toLocaleDateString(); }
export function daysBetween(d1, d2) { return Math.ceil((d2 - d1) / 86400000); }
export function percent(n, d) { if (d === 0) return 0; return Math.round((n / d) * 100); }
