import { pageShell, attachBackButton } from './layout.js';
import { icon } from '../js/icons.js';

function computePrecision(pairs) {
  const valid = pairs.filter(p => Number.isFinite(p[0]) && Number.isFinite(p[1]));
  if (valid.length < 2) return null;
  const n = valid.length;
  let sdSqSum = 0;
  let allVals = [];
  for (const [a, b] of valid) {
    const sd = Math.abs(a - b) / Math.SQRT2;
    sdSqSum += sd * sd;
    allVals.push(a, b);
  }
  const rmsSd = Math.sqrt(sdSqSum / n);
  const mean = allVals.reduce((s, v) => s + v, 0) / allVals.length;
  const pctCv = mean > 0 ? (rmsSd / mean) * 100 : 0;
  const lscAbs = 2.77 * rmsSd;
  const lscPct = 2.77 * pctCv;
  return { n, mean, rmsSd, pctCv, lscAbs, lscPct };
}

function fmt(v, decimals) {
  if (!Number.isFinite(v)) return '—';
  return v.toFixed(decimals);
}

export async function renderPrecision(container) {
  const state = {
    rows: [[null, null], [null, null], [null, null]]
  };

  function rerender() {
    const pairs = state.rows.map(([a, b]) => [parseFloat(a), parseFloat(b)]);
    const result = computePrecision(pairs);

    const rowsHtml = state.rows.map((r, i) => `
      <div class="grid grid-cols-[1fr_1fr_auto] gap-2 mb-2 items-center">
        <input type="number" step="0.001" placeholder="BMD 1" value="${r[0] ?? ''}" data-row="${i}" data-col="0" class="input-field font-mono" />
        <input type="number" step="0.001" placeholder="BMD 2" value="${r[1] ?? ''}" data-row="${i}" data-col="1" class="input-field font-mono" />
        <button data-remove="${i}" class="btn-ghost text-bone-300 px-2 py-2" aria-label="Remove row" ${state.rows.length <= 1 ? 'disabled' : ''}>${icon('x', 'w-5 h-5')}</button>
      </div>
    `).join('');

    const resultsCard = result ? `
      <div class="card mb-4">
        <div class="text-bone-300 text-xs uppercase tracking-widest mb-2">Results</div>
        <div class="grid grid-cols-2 gap-2 text-sm">
          <div class="flex justify-between border-b border-ink-700 pb-2"><span>Patients</span><span class="font-mono text-accent-amber">${result.n}</span></div>
          <div class="flex justify-between border-b border-ink-700 pb-2"><span>Group mean BMD</span><span class="font-mono text-accent-amber">${fmt(result.mean, 3)}</span></div>
          <div class="flex justify-between border-b border-ink-700 pb-2"><span>RMS SD</span><span class="font-mono text-accent-amber">${fmt(result.rmsSd, 4)}</span></div>
          <div class="flex justify-between border-b border-ink-700 pb-2"><span>RMS %CV</span><span class="font-mono text-accent-amber">${fmt(result.pctCv, 2)}%</span></div>
          <div class="flex justify-between col-span-2 pt-2"><span class="font-semibold">LSC (g/cm²)</span><span class="font-mono text-accent-amber text-lg">${fmt(result.lscAbs, 4)}</span></div>
          <div class="flex justify-between col-span-2"><span class="font-semibold">LSC (%)</span><span class="font-mono text-accent-amber text-lg">${fmt(result.lscPct, 2)}%</span></div>
        </div>
      </div>
    ` : `
      <div class="card mb-4 text-bone-300 text-sm">Enter at least 2 complete paired scans to see results.</div>
    `;

    const body = `
      <div class="card mb-4">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-accent-amber">${icon('calculator', 'w-6 h-6')}</span>
          <h2 class="font-display text-xl">Precision and LSC</h2>
        </div>
        <p class="text-bone-300 text-sm leading-relaxed">
          Enter paired scan BMD values from your precision study. RMS SD combines the pairwise SDs. LSC (least significant change) at 95% confidence for serial measurements is 2.77 × precision error.
        </p>
      </div>

      <div class="card mb-4">
        <div class="flex items-center justify-between mb-3">
          <div class="text-bone-300 text-xs uppercase tracking-widest">Paired scans (g/cm²)</div>
          <span class="text-bone-300 text-xs">${state.rows.length} row${state.rows.length === 1 ? '' : 's'}</span>
        </div>
        ${rowsHtml}
        <div class="grid grid-cols-2 gap-2 mt-3">
          <button id="add" class="btn-secondary">Add row</button>
          <button id="clear" class="btn-ghost">${icon('refresh', 'w-4 h-4')} Clear</button>
        </div>
      </div>

      ${resultsCard}

      <div class="card mb-4">
        <div class="text-bone-300 text-xs uppercase tracking-widest mb-2">ISCD minimum precision</div>
        <div class="grid gap-2 text-sm">
          <div class="flex justify-between border-b border-ink-700 pb-2"><span>AP lumbar spine</span><span class="font-mono text-accent-amber">1.9% · LSC 5.3%</span></div>
          <div class="flex justify-between border-b border-ink-700 pb-2"><span>Total hip</span><span class="font-mono text-accent-amber">1.8% · LSC 5.0%</span></div>
          <div class="flex justify-between"><span>Femoral neck</span><span class="font-mono text-accent-amber">2.5% · LSC 6.9%</span></div>
        </div>
      </div>

      <div class="card">
        <div class="text-bone-300 text-xs uppercase tracking-widest mb-2">Formulas</div>
        <pre class="font-mono text-xs text-bone-200 whitespace-pre-wrap leading-relaxed">SD_pair = |BMD1 − BMD2| / sqrt(2)
RMS SD  = sqrt( sum(SD²) / n )
mean    = mean of all BMD values
%CV     = RMS SD / mean × 100
LSC     = 2.77 × RMS SD
LSC %   = 2.77 × %CV</pre>
      </div>
    `;

    container.innerHTML = pageShell('Precision', body, { back: true, backTo: 'home' });
    attachBackButton(container);

    container.querySelectorAll('input[data-row]').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const row = parseInt(inp.getAttribute('data-row'), 10);
        const col = parseInt(inp.getAttribute('data-col'), 10);
        state.rows[row][col] = inp.value === '' ? null : inp.value;
        const r = computePrecision(state.rows.map(([a, b]) => [parseFloat(a), parseFloat(b)]));
        if ((r === null) !== (result === null)) rerender();
        else if (r) rerender();
      });
    });
    container.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (state.rows.length <= 1) return;
        const i = parseInt(btn.getAttribute('data-remove'), 10);
        state.rows.splice(i, 1);
        rerender();
      });
    });
    container.querySelector('#add').addEventListener('click', () => {
      state.rows.push([null, null]);
      rerender();
    });
    container.querySelector('#clear').addEventListener('click', () => {
      state.rows = [[null, null], [null, null], [null, null]];
      rerender();
    });
  }

  rerender();
}
