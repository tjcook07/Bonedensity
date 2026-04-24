import { pageShell, attachBackButton } from './layout.js';
import { icon } from '../js/icons.js';
import { navigate } from '../js/router.js';
import modules from '../data/modules.json';

const MODULE_CONTENT = {
  1: `**ASRT Module 1 — Fundamentals.** History: SPA (I-125) to DPA (Gd-153) to DXA. Radiographic absorptiometry uses a hand radiograph with an aluminum wedge. DXA is the current gold standard. **Vendor differences:** Hologic uses kVp switching with internal calibration; GE Lunar and Norland use K-edge filters with external calibration. **Regulatory:** Bone Mass Measurement Act 1997 set Medicare coverage at 23 months with 5 qualifying conditions. **Reporting:** T score 1 decimal, BMD 3 decimals, area and BMC 2 decimals, percent change integer. **Precision:** 30×2 or 15×3 with repositioning. LSC = 2.77 × precision error. ISCD minimum precision 1.9 / 1.8 / 2.5 percent for spine / total hip / femoral neck.`,
  2: `**Module 2 — Physics and radiation.** Photon absorption is a function of tissue density and effective Z. Photoelectric effect dominates at diagnostic DXA energies; Compton scatter increases with higher kVp. **Patient dose:** AP spine ~1 to 5 microSv, hip similar, VFA 3 to 30 microSv, whole body ~3 microSv. All are fractions of background (~3 mSv/yr). **ALARA:** minimize patient and occupational exposure. Operator distance is the most important factor. Time, distance, shielding remain the three pillars.`,
  3: `**Module 3 — Radiation safety and regulation.** The operator should stand at least 1 meter from the scan table for pencil beam and ~3 meters for fan beam systems. **Pregnancy:** defer DXA if possible; avoid VFA. **Regulation:** state licensure, CRCPD, MQSA does not apply (that is mammography). **Shielding:** usually not required for DXA rooms because of low output. Lead aprons are generally unnecessary on the patient because the beam is highly collimated.`,
  4: `**Module 4 — Patient interaction and history.** Ask about recent contrast, nuclear medicine studies, GI bisulfate (barium), and oral contrast within 10 days (wait 72+ hours after Tc-99m). Document height, weight, menopause age, fractures, medications (glucocorticoids, aromatase inhibitors, PPIs, SSRIs, anticonvulsants), secondary causes, falls history, family history of hip fracture, smoking, alcohol. **Informed consent** principles and HIPAA apply.`,
  5: `**Module 5 — Equipment QC.** Daily phantom scan establishes calibration. **Shewhart control chart and CUSUM** track drift; out-of-control signals include a single point beyond ±1.5% of baseline, or 4 consecutive points above or below the mean. Cross calibration needed when replacing a DXA system; in vivo cross calibration requires 30 patients scanned on both systems. Scanner drift must be resolved before patient scanning.`,
  6: `**Module 6 — Professional ethics and communication.** ARRT Standards of Ethics guide the technologist. Scope: do not interpret, only acquire and report technical findings. Refer clinical questions to the interpreting physician. Maintain patient privacy and documentation accuracy. Continuing qualifications and CE are required to maintain ARRT BD credentials.`,
  7: `**Module 7 — Risk factors.** Nonmodifiable: age, female sex, Caucasian or Asian ancestry, family history of hip fracture, prior low trauma fracture, early menopause (before 45). Modifiable: smoking, alcohol (≥ 3/day), low calcium or vitamin D, inactivity, low BMI. Medications: glucocorticoids (≥ 5 mg prednisone equivalent for ≥ 3 months), aromatase inhibitors, ADT for prostate cancer, long term PPIs, anticonvulsants, SSRIs, excessive thyroid hormone.`,
  8: `**Module 8 — Indications and contraindications.** Indications include women age 65+, men 70+, postmenopausal women under 65 with risk factors, adults with a fragility fracture, adults on meds associated with bone loss, anyone being considered for or on pharmacologic therapy. **Contraindications and artifact sources:** recent contrast (barium, IV, oral), radiopharmaceuticals, surgical hardware in the ROI, motion, severe scoliosis, laminectomy, compression fractures invalidate the affected level.`,
  9: `**Module 9 — Lumbar spine scanning.** Position supine with legs on the positioner block (flattens lordosis). ROI should include ~1 inch above L1 through ~1 inch below L4. Intervertebral spaces horizontal and parallel. Identify L1 (lowest rib-bearing vertebra) and L4 (iliac crest). Exclude vertebrae with focal structural change or > 1 SD different from adjacent. Minimum 2 evaluable levels for diagnosis (ISCD). Use the **lowest T score** of evaluable levels for diagnosis.`,
  10: `**Module 10 — Proximal femur scanning.** Internally rotate the leg 15 to 25 degrees using the positioning device; lesser trochanter should be small or invisible. Shaft parallel to the lateral edge of the scan field. Neck box perpendicular to the shaft, placed over the narrowest femoral neck. Avoid ischium overlap. Report total hip and femoral neck T scores; use the lower of the two for diagnosis. Wards area is not for diagnosis. Bilateral total hip mean is preferred for **monitoring**.`,
  11: `**Module 11 — Forearm and other sites.** Forearm used when spine and hip are not evaluable, for hyperparathyroidism (prefer 33% radius), or in very large patients. Site is the nondominant arm by default, at the **33% radius** (one third distal). VFA is a morphometric vertebral assessment, T4 to L4, lateral projection. Use Genant semi quantitative grading (0 to 3) for fractures.`,
  12: `**Module 12 — Monitoring and serial scans.** Only compare scans on the same machine with a calculated LSC. Report the **LSC** in grams/cm² and as a percent. A change is statistically meaningful only if it exceeds the LSC. Typical repeat interval is 1 to 2 years, sooner with high risk drugs or conditions (glucocorticoids, transplantation, malabsorption).`,
  13: `**Module 13 — Reporting and interpretation team.** The technologist produces the scan, measures, and flags artifacts. The interpreting physician integrates BMD, T and Z scores, VFA, fracture history, FRAX, and medications into the final report. BHOF and ISCD reporting standards apply. DXA (not DEXA) is the preferred term.`,
  14: `**Module 14 — Troubleshooting and artifacts.** Motion appears as banding or blur; rescan. Metal artifact (coins, buttons, belly button rings, hardware) invalidates the region. Contrast or radioisotope produces falsely elevated BMD; wait appropriate intervals. Spine fractures raise apparent BMD; exclude those levels. Very narrow or short patients may need manual vertebral identification. Check for scanner drift daily via phantom. Document all artifacts and exclusions.`
};

function renderMarkdown(md) {
  const html = md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-accent-amber font-semibold">$1</strong>');
  return `<p class="text-bone-100 text-sm leading-relaxed">${html}</p>`;
}

function list(container) {
  const mods = modules.modules || [];
  const body = `
    <div class="grid gap-2">
      ${mods.map(m => `
        <button data-module="${m.id}" class="card card-hover flex items-center gap-3 text-left">
          <span class="font-mono text-accent-amber text-sm w-8 text-center">${m.id}</span>
          <span class="flex-1 text-sm">${m.title}</span>
          <span class="text-bone-300">${icon('chevron_right', 'w-4 h-4')}</span>
        </button>
      `).join('')}
    </div>
  `;
  container.innerHTML = pageShell('Study guide', body);
  attachBackButton(container);
  container.querySelectorAll('[data-module]').forEach(btn => {
    btn.addEventListener('click', () => navigate(`study/${btn.getAttribute('data-module')}`));
  });
}

function module(container, id) {
  const m = (modules.modules || []).find(x => String(x.id) === String(id));
  const text = MODULE_CONTENT[id];
  if (!m && !text) return list(container);
  const title = m ? `Module ${m.id}` : `Module ${id}`;
  const topics = m && m.topics ? `
    <div class="card mb-4">
      <div class="text-bone-300 text-xs uppercase tracking-widest mb-2">Topics</div>
      <ul class="text-sm text-bone-200 list-disc pl-5 space-y-1">
        ${m.topics.map(t => `<li>${t}</li>`).join('')}
      </ul>
    </div>
  ` : '';
  const body = `
    <div class="card mb-4">
      <div class="text-xs text-bone-300 uppercase tracking-widest">Module ${id}</div>
      <h2 class="font-display text-2xl mt-1">${m ? m.title : 'Details'}</h2>
    </div>
    ${topics}
    ${text ? `<div class="card mb-4">${renderMarkdown(text)}</div>` : ''}
    <div class="grid grid-cols-2 gap-2">
      <button data-go="quiz/run/module-${id}" class="btn-primary">${icon('brain', 'w-4 h-4')} Quiz this module</button>
      <button data-go="flashcards/run/module-${id}" class="btn-secondary">${icon('cards', 'w-4 h-4')} Flashcards</button>
    </div>
  `;
  container.innerHTML = pageShell(title, body, { back: true, backTo: 'study' });
  attachBackButton(container);
  container.querySelectorAll('[data-go]').forEach(b => {
    b.addEventListener('click', () => navigate(b.getAttribute('data-go')));
  });
}

export async function renderStudyGuide(container, params = []) {
  if (params[0]) return module(container, params[0]);
  list(container);
}
