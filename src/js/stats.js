import { getAllAttempts, getAllSessions } from './storage.js';
import questions from '../data/questions.json';

export async function computeStats() {
  const attempts = await getAllAttempts();
  const sessions = await getAllSessions();

  const byQuestion = new Map();
  for (const a of attempts) {
    if (!byQuestion.has(a.qId)) byQuestion.set(a.qId, []);
    byQuestion.get(a.qId).push(a);
  }

  let totalAttempts = 0;
  let totalCorrect = 0;
  const byModule = {};
  for (let i = 1; i <= 14; i++) {
    byModule[i] = { total: 0, correct: 0, seen: 0, mastered: 0 };
  }

  for (const q of questions) {
    const m = q.module;
    if (!byModule[m]) byModule[m] = { total: 0, correct: 0, seen: 0, mastered: 0 };
    byModule[m].total++;
    const history = byQuestion.get(q.id) || [];
    if (history.length > 0) {
      byModule[m].seen++;
      const recent = history.slice(-3);
      const recentCorrect = recent.filter(a => a.correct).length;
      if (recentCorrect >= 2 && recent[recent.length - 1].correct) {
        byModule[m].mastered++;
      }
    }
    for (const a of history) {
      totalAttempts++;
      if (a.correct) {
        totalCorrect++;
        byModule[m].correct++;
      }
    }
  }

  const accuracy = totalAttempts > 0 ? totalCorrect / totalAttempts : 0;
  const coverage = questions.length > 0 ? byQuestion.size / questions.length : 0;
  const streak = computeStreak(attempts);

  return {
    totalAttempts, totalCorrect, accuracy, coverage,
    questionsAnswered: byQuestion.size,
    totalQuestions: questions.length,
    sessions: sessions.length,
    streak, byModule
  };
}

function computeStreak(attempts) {
  if (attempts.length === 0) return 0;
  const days = new Set();
  for (const a of attempts) {
    const d = new Date(a.ts);
    days.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  }
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (days.has(key)) streak++;
    else if (i > 0) break;
  }
  return streak;
}

export async function getReviewQuestions(limit = 15) {
  const attempts = await getAllAttempts();
  const byQuestion = new Map();
  for (const a of attempts) {
    if (!byQuestion.has(a.qId)) byQuestion.set(a.qId, []);
    byQuestion.get(a.qId).push(a);
  }
  const scored = questions.map(q => {
    const history = byQuestion.get(q.id) || [];
    const recent = history.slice(-5);
    const recentWrong = recent.filter(a => !a.correct).length;
    const seen = history.length;
    let priority;
    if (seen === 0) priority = 100;
    else priority = recentWrong * 50 - Math.min(seen, 5);
    return { q, priority, seen };
  });
  scored.sort((a, b) => b.priority - a.priority);
  return scored.slice(0, limit).map(s => s.q);
}
