import { pageShell, attachBackButton } from './layout.js';
import { icon } from '../js/icons.js';
import { navigate } from '../js/router.js';

const SECTIONS = [
  { id: 'formulas', title: 'Formulas and numbers', icon: 'calculator', blurb: 'BMD, T and Z scores, LSC, precision study design, reporting decimals' },
  { id: 'who', title: 'WHO and BHOF criteria', icon: 'target', blurb: 'Diagnostic thresholds, treatment thresholds, FRAX basics' },
  { id: 'positioning', title: 'Positioning cheat sheet', icon: 'clipboard', blurb: 'AP spine, proximal femur, forearm, VFA, whole body' },
  { id: 'iscd', title: 'ISCD 2023 updates', icon: 'book', blurb: 'AFF screening, TBS, bilateral hip, transgender, SCI, periprosthetic' },
  { id: 'pediatric', title: 'Pediatric', icon: 'baby', blurb: 'ISCD 2019 diagnostic rule, terminology, sites, height adjustment' },
  { id: 'blueprint', title: 'Exam blueprint (2022)', icon: 'grid', blurb: '75 scored + 30 pilot, 1h 45m, 75 scaled passing' }
];

function h(title, sub) {
  return `<div class="mb-5"><h2 class="font-display text-xl">${title}</h2>${sub ? `<div class="text-bone-300 text-xs mt-1">${sub}</div>` : ''}</div>`;
}

function kv(rows) {
  return `
    <div class="grid gap-2">
      ${rows.map(([k, v]) => `
        <div class="flex gap-3 border-b border-ink-700 pb-2">
          <div class="flex-1 text-sm">${k}</div>
          <div class="font-mono text-accent-amber text-sm text-right">${v}</div>
        </div>
      `).join('')}
    </div>
  `;
}

const CONTENT = {
  formulas: () => `
    ${h('Core formulas', 'Memorize these cold.')}
    <div class="card mb-4">
      ${kv([
        ['BMD', 'BMC / Area (g/cm²)'],
        ['T score', '(measured BMD − young adult mean) / young adult SD'],
        ['Z score', '(measured BMD − age matched mean) / age matched SD'],
        ['LSC (95% confidence, serial)', '2.77 × precision error'],
        ['LSC (80% confidence, serial)', '1.81 × precision error'],
        ['LSC (single vs fixed reference)', '1.96 × precision error'],
        ['RMS SD', 'sqrt( sum(SD²) / n )'],
        ['%CV', 'SD / mean × 100']
      ])}
    </div>
    ${h('Precision study design', 'ISCD sanctioned options')}
    <div class="card mb-4">
      ${kv([
        ['Design option A', '30 patients × 2 scans (30 df)'],
        ['Design option B', '15 patients × 3 scans (30 df)'],
        ['Reposition between scans', 'Yes'],
        ['Minimum df', '30']
      ])}
    </div>
    ${h('ISCD minimum precision and LSC', 'Least acceptable per technologist')}
    <div class="card mb-4">
      ${kv([
        ['AP lumbar spine', '1.9% precision, 5.3% LSC'],
        ['Total hip', '1.8% precision, 5.0% LSC'],
        ['Femoral neck', '2.5% precision, 6.9% LSC']
      ])}
    </div>
    ${h('Reporting decimals')}
    <div class="card">
      ${kv([
        ['BMD', '3 decimals (g/cm²)'],
        ['BMC', '2 decimals (g)'],
        ['Area', '2 decimals (cm²)'],
        ['T score and Z score', '1 decimal'],
        ['Percent change', 'Integer']
      ])}
    </div>
  `,
  who: () => `
    ${h('WHO T score categories', 'Postmenopausal women and men age 50+')}
    <div class="card mb-4">
      ${kv([
        ['Normal', 'T ≥ −1.0'],
        ['Low bone mass (osteopenia)', 'T between −1.0 and −2.5'],
        ['Osteoporosis', 'T ≤ −2.5'],
        ['Severe (established)', 'T ≤ −2.5 plus fragility fracture']
      ])}
    </div>
    ${h('BHOF treatment thresholds', 'Bone Health and Osteoporosis Foundation (rebranded from NOF in June 2022)')}
    <div class="card mb-4">
      <ul class="text-sm text-bone-200 leading-relaxed list-disc pl-5 space-y-1">
        <li>Hip or vertebral fracture (clinical or morphometric).</li>
        <li>T score ≤ −2.5 at femoral neck, total hip, or lumbar spine.</li>
        <li>T score between −1.0 and −2.5 AND 10 year FRAX hip ≥ 3% or MOF ≥ 20%.</li>
      </ul>
    </div>
    ${h('FRAX basics')}
    <div class="card">
      ${kv([
        ['Age range', '40 to 90 years'],
        ['BMD input', 'Femoral neck only'],
        ['Outputs', '10 year MOF and 10 year hip probability'],
        ['Secondary osteoporosis flag', 'Auto inactivated when BMD entered'],
        ['Not for', 'Patients already on therapy']
      ])}
    </div>
  `,
  positioning: () => `
    ${h('AP lumbar spine')}
    <div class="card mb-4 text-sm leading-relaxed text-bone-200">
      Patient supine, legs elevated on the positioning block to flatten lordosis. Align spine to the center of the table. Scan field should capture ~1 inch above L1 through ~1 inch below L4. Intervertebral spaces horizontal and parallel. Minimum of 2 evaluable vertebrae for diagnosis.
    </div>
    ${h('Proximal femur')}
    <div class="card mb-4 text-sm leading-relaxed text-bone-200">
      Leg internally rotated 15 to 25 degrees (positioner foot brace). Lesser trochanter small or invisible if correct. Femoral shaft parallel to the edge of the scan field. Neck box perpendicular to the shaft. Avoid ischium overlap.
    </div>
    ${h('Forearm (33% radius)')}
    <div class="card mb-4 text-sm leading-relaxed text-bone-200">
      Nondominant arm typically (or per manufacturer), unless indicated otherwise. ROI at 33% from the ulnar styloid (aka one third radius). Used when spine and hip are not evaluable, for hyperparathyroidism, or when BMI is very high.
    </div>
    ${h('VFA (T4 to L4)')}
    <div class="card mb-4 text-sm leading-relaxed text-bone-200">
      Lateral scan from T4 to L4. Patient in left lateral decubitus (some systems supine). Arms forward so they do not overlap the spine. Used to detect morphometric vertebral fractures.
    </div>
    ${h('Whole body and body comp (NHANES)')}
    <div class="card text-sm leading-relaxed text-bone-200">
      Patient supine, arms at the sides, palms against the thighs, head straight. Feet rotated slightly inward and taped together. Entire body within the scan limit. Follow NHANES positioning for body composition consistency.
    </div>
  `,
  iscd: () => `
    ${h('ISCD 2023 position highlights')}
    <div class="card mb-4 text-sm leading-relaxed text-bone-200 space-y-3">
      <div><strong class="text-accent-amber">AFF screening:</strong> Use the Femur Fracture Index (FFI) on long bone scans to screen for atypical femoral fractures in patients on long term antiresorptive therapy.</div>
      <div><strong class="text-accent-amber">TBS:</strong> Trabecular Bone Score is formalized as an adjunct to BMD, adjusting FRAX in postmenopausal women and men age 50+.</div>
      <div><strong class="text-accent-amber">Bilateral hip rules:</strong> Use the lowest T score of the two hips for diagnosis. For monitoring serial change, use the mean total hip BMD of both sides.</div>
      <div><strong class="text-accent-amber">Fewer than 4 vertebrae:</strong> Diagnosis allowed with as few as 2 evaluable vertebrae, exclude those with focal structural change or >1 SD from adjacent.</div>
      <div><strong class="text-accent-amber">Reference database:</strong> Uniform white (Caucasian) female NHANES III reference for T scores in all postmenopausal women and men age 50+ regardless of race or ethnicity.</div>
      <div><strong class="text-accent-amber">Transgender reporting:</strong> Use T scores referenced to the affirmed gender after 1+ year of gender affirming hormones. Before that or in nonbinary patients, Z scores may be more appropriate.</div>
      <div><strong class="text-accent-amber">SCI sites:</strong> For spinal cord injury, measure distal femur and proximal tibia in addition to standard sites.</div>
      <div><strong class="text-accent-amber">Periprosthetic DXA:</strong> Report Gruen zones for hip and DeLee Charnley zones for the acetabulum.</div>
      <div><strong class="text-accent-amber">Reporting terminology:</strong> The modality is DXA, not DEXA, in professional reports.</div>
    </div>
    ${h('Links')}
    <div class="card">
      <ul class="text-sm text-accent-amber space-y-2">
        <li>iscd.org — ISCD positions and guidelines</li>
        <li>arrt.org — ARRT content specifications</li>
        <li>bonehealthandosteoporosis.org — BHOF (formerly NOF)</li>
      </ul>
    </div>
  `,
  pediatric: () => `
    ${h('ISCD 2019 pediatric diagnostic rule')}
    <div class="card mb-4 text-sm leading-relaxed text-bone-200 space-y-2">
      <div>Diagnosis of osteoporosis in children requires either:</div>
      <ul class="list-disc pl-5 space-y-1">
        <li>One or more vertebral compression fractures in the absence of high energy trauma, OR</li>
        <li>Z score ≤ −2.0 AND a clinically significant fracture history (≥ 2 long bone fractures by age 10, or ≥ 3 by age 19).</li>
      </ul>
    </div>
    ${h('Terminology rules')}
    <div class="card mb-4">
      ${kv([
        ['T scores', 'NEVER used in children'],
        ['Osteopenia', 'NEVER used in children (use "low bone mass for age")'],
        ['Osteoporosis', 'Only with the diagnostic rule above']
      ])}
    </div>
    ${h('Preferred sites')}
    <div class="card mb-4">
      ${kv([
        ['Primary', 'PA spine L1 to L4'],
        ['Secondary', 'Total body less head (TBLH)'],
        ['Hip', 'Not recommended (variable skeletal development)']
      ])}
    </div>
    ${h('Height adjustment')}
    <div class="card text-sm leading-relaxed text-bone-200 space-y-2">
      Short or tall stature can distort DXA results in growing skeletons. Adjust using BMAD (bone mineral apparent density), height for age Z score, or the CHOP (Children's Hospital of Philadelphia) calculator to avoid misclassification.
    </div>
  `,
  blueprint: () => `
    ${h('ARRT Bone Densitometry 2022 blueprint', 'Valid through Dec 31, 2026. 2027 revision effective Jan 1, 2027.')}
    <div class="card mb-4">
      ${kv([
        ['Total items', '105 (75 scored + 30 pilot)'],
        ['Time allowed', '1 hour 45 minutes'],
        ['Passing scaled score', '75'],
        ['2024 first time pass rate', '68.8%']
      ])}
    </div>
    ${h('Category breakdown (scored items)')}
    <div class="card">
      ${kv([
        ['Patient Care', '17 items (≈23%)'],
        ['Equipment Operation and Quality Control', '20 items (≈27%)'],
        ['DXA Scanning', '38 items (≈50%)'],
        ['Total', '75 items']
      ])}
    </div>
  `
};

function list(container) {
  const body = `
    <div class="grid gap-3">
      ${SECTIONS.map(s => `
        <button data-section="${s.id}" class="card card-hover flex items-center gap-3 text-left">
          <span class="text-accent-amber">${icon(s.icon, 'w-6 h-6')}</span>
          <span class="flex-1">
            <div class="font-display text-lg">${s.title}</div>
            <div class="text-bone-300 text-xs mt-1 leading-snug">${s.blurb}</div>
          </span>
          <span class="text-bone-300">${icon('chevron_right', 'w-5 h-5')}</span>
        </button>
      `).join('')}
    </div>
  `;
  container.innerHTML = pageShell('Reference', body);
  attachBackButton(container);
  container.querySelectorAll('[data-section]').forEach(btn => {
    btn.addEventListener('click', () => navigate(`reference/${btn.getAttribute('data-section')}`));
  });
}

function section(container, id) {
  const s = SECTIONS.find(x => x.id === id);
  if (!s || !CONTENT[id]) return list(container);
  container.innerHTML = pageShell(s.title, CONTENT[id](), { back: true, backTo: 'reference' });
  attachBackButton(container);
}

export async function renderReference(container, params = []) {
  if (params[0]) return section(container, params[0]);
  list(container);
}
