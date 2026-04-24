const DB_NAME = 'dexa-prep';
const DB_VERSION = 1;

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('attempts')) {
        const s = db.createObjectStore('attempts', { keyPath: 'id', autoIncrement: true });
        s.createIndex('qId', 'qId', { unique: false });
        s.createIndex('sessionId', 'sessionId', { unique: false });
        s.createIndex('ts', 'ts', { unique: false });
      }
      if (!db.objectStoreNames.contains('sessions')) {
        const s = db.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
        s.createIndex('startedAt', 'startedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains('srs')) {
        db.createObjectStore('srs', { keyPath: 'qId' });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
  return dbPromise;
}

async function tx(store, mode = 'readonly') {
  const db = await openDB();
  return db.transaction(store, mode).objectStore(store);
}

export async function recordAttempt({ qId, correct, sessionId, timeMs }) {
  const store = await tx('attempts', 'readwrite');
  return new Promise((resolve, reject) => {
    const req = store.add({ qId, correct, sessionId, timeMs, ts: Date.now() });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllAttempts() {
  const store = await tx('attempts');
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAttemptsForQuestion(qId) {
  const store = await tx('attempts');
  const idx = store.index('qId');
  return new Promise((resolve, reject) => {
    const req = idx.getAll(qId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function startSession(kind) {
  const store = await tx('sessions', 'readwrite');
  return new Promise((resolve, reject) => {
    const req = store.add({ kind, startedAt: Date.now() });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function endSession(id, stats) {
  const store = await tx('sessions', 'readwrite');
  return new Promise((resolve, reject) => {
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const s = getReq.result || { id, kind: 'unknown', startedAt: Date.now() };
      s.endedAt = Date.now();
      Object.assign(s, stats);
      const putReq = store.put(s);
      putReq.onsuccess = () => resolve(s);
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function getAllSessions() {
  const store = await tx('sessions');
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const SRS_INTERVALS = [1, 2, 5, 10, 21];

export async function getSrsCard(qId) {
  const store = await tx('srs');
  return new Promise((resolve, reject) => {
    const req = store.get(qId);
    req.onsuccess = () => resolve(req.result || { qId, box: 0, dueAt: Date.now() });
    req.onerror = () => reject(req.error);
  });
}

export async function getAllSrs() {
  const store = await tx('srs');
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function scheduleReview(qId, rating) {
  const card = await getSrsCard(qId);
  let box = card.box || 0;
  if (rating === 'again') box = 0;
  else if (rating === 'good') box = Math.min(box + 1, SRS_INTERVALS.length - 1);
  else if (rating === 'easy') box = Math.min(box + 2, SRS_INTERVALS.length - 1);
  const daysAhead = SRS_INTERVALS[box];
  const dueAt = Date.now() + daysAhead * 86400000;
  const updated = { qId, box, dueAt, lastReviewed: Date.now() };
  const store = await tx('srs', 'readwrite');
  return new Promise((resolve, reject) => {
    const req = store.put(updated);
    req.onsuccess = () => resolve(updated);
    req.onerror = () => reject(req.error);
  });
}

export async function clearAllData() {
  const db = await openDB();
  const stores = ['attempts', 'sessions', 'srs'];
  return Promise.all(stores.map(name => new Promise((resolve, reject) => {
    const t = db.transaction(name, 'readwrite');
    const req = t.objectStore(name).clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  })));
}

const SETTINGS_KEY = 'dexa-settings';

export function getSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; }
  catch { return {}; }
}

export function setSettings(updates) {
  const current = getSettings();
  const merged = { ...current, ...updates };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
  return merged;
}
