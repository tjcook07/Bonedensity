import { pageShell, attachBackButton } from './layout.js';
import { icon } from '../js/icons.js';
import { navigate } from '../js/router.js';
import { getSettings, setSettings, clearAllData } from '../js/storage.js';

export async function renderSettings(container) {
  const s = getSettings();
  const examDate = s.examDate || '';
  const dailyGoal = s.dailyGoal || 20;
  const blueprint = s.blueprint || '2022';

  const body = `
    <div class="card mb-4">
      <div class="text-bone-300 text-xs uppercase tracking-widest mb-2">Exam date</div>
      <label class="block">
        <span class="text-bone-300 text-xs">Your scheduled test day</span>
        <input id="exam-date" type="date" value="${examDate}" class="input-field mt-1 font-mono" />
      </label>
    </div>

    <div class="card mb-4">
      <div class="text-bone-300 text-xs uppercase tracking-widest mb-2">Daily goal</div>
      <label class="block">
        <span class="text-bone-300 text-xs">Questions per day (5 to 200)</span>
        <input id="daily-goal" type="number" min="5" max="200" value="${dailyGoal}" class="input-field mt-1 font-mono" />
      </label>
    </div>

    <div class="card mb-4">
      <div class="text-bone-300 text-xs uppercase tracking-widest mb-2">Blueprint version</div>
      <div class="grid gap-2">
        <label class="flex items-start gap-3 p-2 rounded-lg hover:bg-ink-700 cursor-pointer">
          <input type="radio" name="bp" value="2022" ${blueprint === '2022' ? 'checked' : ''} class="mt-1 accent-amber-500" />
          <span>
            <div class="font-medium">2022</div>
            <div class="text-bone-300 text-xs">Valid through Dec 31, 2026. Current default.</div>
          </span>
        </label>
        <label class="flex items-start gap-3 p-2 rounded-lg hover:bg-ink-700 cursor-pointer">
          <input type="radio" name="bp" value="2027" ${blueprint === '2027' ? 'checked' : ''} class="mt-1 accent-amber-500" />
          <span>
            <div class="font-medium">2027</div>
            <div class="text-bone-300 text-xs">Effective Jan 1, 2027.</div>
          </span>
        </label>
      </div>
    </div>

    <div class="card border-err/40 mb-4">
      <div class="text-err text-xs uppercase tracking-widest mb-2">Danger zone</div>
      <p class="text-bone-300 text-sm mb-3">Deletes all attempts, sessions, spaced repetition data, and settings. This cannot be undone.</p>
      <button id="reset" class="btn-danger w-full">${icon('trash', 'w-4 h-4')} Reset all progress and settings</button>
    </div>

    <div class="text-center text-bone-300 text-xs mt-8">
      Cook Media Systems · DEXA Registry Prep v1.0
    </div>
  `;

  container.innerHTML = pageShell('Settings', body);
  attachBackButton(container);

  const saveFlash = () => {
    // persist is immediate; no flash needed
  };

  container.querySelector('#exam-date').addEventListener('change', (e) => {
    setSettings({ examDate: e.target.value || null });
    saveFlash();
  });
  container.querySelector('#daily-goal').addEventListener('change', (e) => {
    let v = parseInt(e.target.value, 10);
    if (!Number.isFinite(v)) v = 20;
    v = Math.max(5, Math.min(200, v));
    e.target.value = v;
    setSettings({ dailyGoal: v });
    saveFlash();
  });
  container.querySelectorAll('input[name="bp"]').forEach(r => {
    r.addEventListener('change', (e) => {
      setSettings({ blueprint: e.target.value });
      saveFlash();
    });
  });
  container.querySelector('#reset').addEventListener('click', async () => {
    if (!confirm('Reset everything? All progress and settings will be deleted.')) return;
    await clearAllData();
    try { localStorage.clear(); } catch {}
    navigate('home');
  });
}
