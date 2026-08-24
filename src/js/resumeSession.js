// Save/resume for in-progress quizzes and exams.
// Progress is snapshotted to localStorage so a session survives leaving the
// app (switching tasks, backgrounding on mobile) and can be finished later.
//
// Payload shape (per kind):
//   {
//     kind, version, savedAt,
//     items:      [...],        // the resolved question/exam array (with shuffled options)
//     answers:    [...],        // per-index answers (null = unanswered)
//     index, mode,
//     sessionId,                // IndexedDB session id, kept so attempts are not re-recorded
//     flagged:   [...],         // exam only
//     recorded:  [...],         // exam only
//     startTime,                // exam only
//     remainingMs,              // timed exams only — clock is paused while away
//     meta: {...}               // kind-specific extras (e.g. quiz key)
//   }

const PREFIX = 'resume:';
const VERSION = 1;

export function saveSession(kind, data) {
  try {
    const payload = { ...data, kind, version: VERSION, savedAt: new Date().toISOString() };
    localStorage.setItem(PREFIX + kind, JSON.stringify(payload));
  } catch {
    // Quota exceeded or serialization failure — fail silently, the live
    // session keeps working, we just cannot offer resume this time.
  }
}

export function loadSession(kind) {
  try {
    const raw = localStorage.getItem(PREFIX + kind);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (d.version !== VERSION) { clearSession(kind); return null; }
    if (!Array.isArray(d.items) || d.items.length === 0) { clearSession(kind); return null; }
    // A timed session whose clock already ran out is not resumable.
    if (typeof d.remainingMs === 'number' && d.remainingMs <= 0) { clearSession(kind); return null; }
    return d;
  } catch {
    return null;
  }
}

export function clearSession(kind) {
  try { localStorage.removeItem(PREFIX + kind); } catch {}
}

export function sessionSummary(kind) {
  const d = loadSession(kind);
  if (!d) return null;
  const answered = Array.isArray(d.answers) ? d.answers.filter(Boolean).length : 0;
  return {
    answered,
    total: d.items.length,
    remainingMs: d.remainingMs,
    savedAt: d.savedAt,
    index: d.index || 0
  };
}
