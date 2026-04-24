/*
 * Retag every question and flashcard into the new 14-category taxonomy.
 * Adds `category`, `subCategory`, `highYield` to each object.
 * Writes src/data/questions.json and src/data/flashcards.json in place.
 * Does not touch any other fields.
 *
 * Run: node scripts/retag.js
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(__dirname);
const Q_PATH = join(ROOT, 'src', 'data', 'questions.json');
const F_PATH = join(ROOT, 'src', 'data', 'flashcards.json');

const CATEGORIES = [
  'physiology', 'pharmacology', 'patient-care', 'radiation-safety',
  'equipment-qc', 'statistics', 'criteria',
  'spine', 'hip', 'forearm', 'vfa', 'pediatric', 'body-comp', 'special-pop'
];

// Manual overrides by id. Applied after normal classification runs.
// Extend this map when manual review reveals a miscategorization.
const EXPLICIT_OVERRIDES = {
  // Questions
  'm4-q044': 'criteria',
  'web-q049': 'criteria',
  'web-q046': 'criteria',
  'ptest-q107': 'patient-care',
  'm1-q264': 'radiation-safety',
  'web-q042': 'radiation-safety',
  // Flashcards
  'f038': 'criteria',
  'f095': 'equipment-qc'
};

// Search helper: lowercased text to scan against.
function haystack(item) {
  const parts = [
    item.topic || '',
    Array.isArray(item.tags) ? item.tags.join(' ') : '',
    item.source || ''
  ];
  return parts.join(' | ').toLowerCase();
}

// Special population keywords (apply across any module per the brief).
const SPECIAL_POP_RE = /(transgender|spinal cord injur|\bsci\b|\bckd\b|renal osteodystrophy|chronic kidney|hyperparathyroid|\bhpt\b|ankylosing|\b(as )artifact|multiple myeloma|myeloma|bilateral hip replacement|both hips replaced|hip replacement scan)/i;

// Statistics / scoring keywords (T/Z score, BMD formulas, precision formulas, LSC math, SD/CV concepts).
const STATISTICS_RE = /(\bt-score\b|\btscore\b|\bz-score\b|\bzscore\b|standard score|standard deviation|\bsd definition\b|\bcv concept\b|\bmean definition\b|bmd formula|bmd calculation|bmd units|bmd decimals|bmc grams|reporting decimals|\blsc\b|\brms[- ]?sd\b|precision study design|precision degrees|precision example|precision error source|trueness|accuracy vs precision|precision vs accuracy)/i;

// Equipment / QC keywords (history, hardware, phantoms, calibration, QC control charts).
const EQUIPMENT_RE = /(\bspa\b|\bdpa\b|\bdxa technology\b|\bdxa history\b|\bdxa uses\b|\bqct\b|\bqus\b|peripheral densitometry|radiographic absorptiometry|radiogrammetry|heel classifications|k-edge|pencil beam|fan beam|detector|collimation|scan pattern|x-ray tube|voltage switching|manufacturer calibration|manufacturer differences|hologic|lunar|\bge external\b|\bgc external\b|external calibration|auto calibration|internal calibration|bone edge detection|phantom|shewhart|\bcusum\b|westgard|daily qc\b|qc failure|qc log|qc frequency|qa frequency|qc long-term|archive frequency|copy compare|scan mode consistency|cross-calibration|cross calibration|adding (same|scanner)|same-model new scanner|different tech scanner|software upgrade|precision before hardware|precision site-specific|precision training cutoff|precision consent|consent for precision|precision study duration|precision study purpose|precision study technologist|technologist-specific|multiple technologists lsc|dxa spelling|dxa physics|dxa x-ray tube|areal bmd|volumetric bmd|sbmd|energy shifting|dxa error factors|dxa influences|baseline comparison|comparison analysis|serial monitoring method|monitoring site choice|rate of change|serial scan interval|serial hip comparison|follow-up interval|when to repeat precision|rapid change follow-up|follow-up bmd|multiple follow-up lsc|acceptable clinical lsc|anthropomorphic phantom|phantom expected bmd|phantom fail action|phantom scan frequency|phantom types)/i;

// Radiation safety / physics.
const RAD_SAFETY_RE = /(\balara\b|operator distance|operator scatter|occupational limit|background radiation|effective dose|central dxa dose|central dxa effective|sievert|most basic unit radiation|photoelectric|declared pregnancy|\bpregnancy\b)/i;

// Patient care (non-radiation).
const PATIENT_CARE_RE = /(contrast wait|nuclear medicine wait|height importance|weight limit|fall prevention|informed consent|patient history|patient interaction|hipaa)/i;

// Criteria family (WHO, BHOF, ISCD, FRAX, TBS, diagnostic rules).
const CRITERIA_RE = /(\bwho\b|\bbmma\b|\bbhof\b|\bnof\b|\bfrax\b|\btbs\b|iscd|9th pdc|white preferred|uniform reference|reference database|reference site|reference standard|osteopenia terminology|minus 2\.5|fracture not required|bilateral hip diagnosis|bilateral hip terminology|who can perform dxa|forearm roi diagnosis|men under 50 bmd alone|what site is monitored|menopause transition|initial population|femoral neck reference|content spec|arrt 202|arrt content|arrt categories|arrt pass rate|arrt blueprint|arrt spec)/i;

// Pharmacology (drug names, mechanisms, warnings).
const PHARMA_RE = /(bisphosphonate|\bsermm?\b|raloxifene|denosumab|teriparatide|abaloparatide|romosozumab|\bmronj\b|\bonj\b|drug holiday|sequential therapy|anabolic|antiresorptive|calcium rda|calcium ppi|vitamin d|weight-bearing exercise|exercise types|sunlight|pharmacology)/i;

// VFA topics.
const VFA_RE = /(\bvfa\b|vertebral fracture assessment|genant|morphometry|secondary fragility|upper thoracic vfa)/i;

// Spine topics.
const SPINE_RE = /(spine|\bl1\b|\bl4\b|\bt12\b|lumbar|vertebra|scoliosis|laminectomy|kyphoplasty|schmorl|harrington|compression fracture|aortic calcification|disc space|arms position|shoulder position|leg elevation|1\.0 t-score rule|1\.0 rule|\bppm\b)/i;

// Hip topics.
const HIP_RE = /(hip|femur|femoral|ward|lesser trochanter|greater trochanter|gruen|delee[- ]charnley|\baff\b|atypical femur|hip axis|\bhal\b|shaft parallel|foot positioner|femoral head|periprosthetic|over-rotation|rotation degrees|rotation technique|rotation effect|rotation angle|hip replacement|which hip|total hip|proximal femur|scan field edge)/i;

// Forearm topics.
const FOREARM_RE = /(forearm|radius|ulnar|colles|\b33%\b|33 percent|33% roi|ultra[- ]?distal|non-dominant|nondominant|cortical sites|fingers in field)/i;

// Body comp.
const BODYCOMP_RE = /(body composition|whole body positioning|visceral adipose|\bfmi\b|hip axis length)/i;

// Pediatric.
const PEDIATRIC_RE = /(pediatric|child|\btblh\b|\bbmad\b|tanner[- ]whitehouse|\bchop\b)/i;

// High-yield topic signals.
const HIGH_YIELD_RE = new RegExp([
  't-score', 'tscore', 'z-score', 'zscore',
  'who criteria', 'who cutoff', 'who femoral', 'who reference', 'who initial', 'who osteopenia',
  '\\blsc\\b', 'precision study', 'precision error', 'precision site', 'rms[- ]?sd',
  'iscd 2023', 'iscd minimum', 'iscd pediatric', '9th pdc',
  'bilateral hip rule', 'bilateral hip diagnosis', 'bilateral hip monitoring', 'bilateral hip terminology',
  'vertebral exclusion', 'vertebra 1\\.0', '1\\.0 t-score rule', 'minimum vertebrae', 'vertebrae number rule', 'vertebrae exclusion minimum',
  'roi placement', 'roi neck box', 'spine roi', 'neck roi', 'femoral neck roi', '33% roi', 'ultra-distal roi',
  '\\baff\\b', 'atypical femur',
  '\\bvfa\\b', 'vfa indication', 'vfa advantages', 'genant',
  '\\bbmma\\b', 'bmma qualifying', 'bmma year', 'bmma 23',
  '\\bfrax\\b', 'frax inputs', 'frax bmd', 'frax age', 'frax outputs', 'frax limitations', 'frax secondary', 'frax previous', 'frax glucocorticoid', 'frax us ethnicities', 'frax tbs',
  'bhof treatment', 'bhof diagnosis',
  'bisphosphonate administration', 'oral bisphosphonate', 'bisphosphonate mechanism', 'bisphosphonate dosing', 'bisphosphonate renal',
  'denosumab rebound', 'denosumab',
  'romosozumab cv', 'romosozumab duration', 'romosozumab mechanism',
  'teriparatide 2 year', 'teriparatide', 'abaloparatide',
  'glucocorticoid', 'steroid bone',
  'cross-calibration', 'cross calibration',
  'phantom scan frequency', 'phantom fail action', 'phantom expected', 'daily qc', 'qc failure action', 'shewhart 1\\.5', 'westgard'
].join('|'), 'i');

// Authority citation detection in source field.
const SOURCE_AUTH_RE = /\b(iscd|arrt|\bwho\b|bhof|\bnof\b|\bfda\b|bmma)\b/i;

// Primary classifier.
function classify(item) {
  const mod = Number(item.module);
  const h = haystack(item);
  const topic = (item.topic || '').toLowerCase();
  const tagsStr = Array.isArray(item.tags) ? item.tags.join(' ').toLowerCase() : '';

  // 1. Global override: special populations regardless of module.
  if (SPECIAL_POP_RE.test(h)) return { category: 'special-pop', reason: 'special-pop keyword' };

  // 2. Global override: VFA content regardless of module.
  if (VFA_RE.test(h) && mod !== 10 && mod !== 11 && mod !== 12) {
    return { category: 'vfa', reason: 'vfa keyword' };
  }

  // 3. Module-specific logic.
  switch (mod) {
    case 1: {
      // Fundamentals. Topic drives classification; tags are secondary.
      // Criteria topics (WHO/BMMA/BHOF/FRAX/TBS/ISCD/reference/terminology) win over stat tags.
      if (CRITERIA_RE.test(topic)) return { category: 'criteria', reason: 'mod 1 criteria topic' };
      if (STATISTICS_RE.test(topic)) return { category: 'statistics', reason: 'stat topic' };
      if (EQUIPMENT_RE.test(topic) || /heel|radiographic absorptiometry|radiogrammetry|peripheral|qct|qus|\bspa\b|\bdpa\b|dxa technology|dxa uses|dxa history/i.test(topic)) {
        return { category: 'equipment-qc', reason: 'equipment/history keyword' };
      }
      if (FOREARM_RE.test(topic)) return { category: 'forearm', reason: 'forearm keyword' };
      // No topic match — fall back to tag-based stat routing, then criteria default.
      if (STATISTICS_RE.test(tagsStr)) return { category: 'statistics', reason: 'stat tag' };
      return { category: 'criteria', reason: 'mod 1 default' };
    }
    case 2:
      return { category: 'physiology', reason: 'mod 2 default' };
    case 3: {
      // Pathology — mostly physiology. Move pure stat concepts out.
      if (STATISTICS_RE.test(topic)) return { category: 'statistics', reason: 'stat concept in pathology mod' };
      return { category: 'physiology', reason: 'mod 3 default' };
    }
    case 4:
      return { category: 'pharmacology', reason: 'mod 4 default' };
    case 5: {
      // Physics / equipment — default equipment-qc.
      if (RAD_SAFETY_RE.test(h)) return { category: 'radiation-safety', reason: 'radiation keyword in mod 5' };
      return { category: 'equipment-qc', reason: 'mod 5 default' };
    }
    case 6: {
      // Patient care / radiation safety. Most mod 6 content is radiation-related;
      // keep patient-care only for explicit patient-prep topics.
      if (PATIENT_CARE_RE.test(h)) return { category: 'patient-care', reason: 'patient-care keyword' };
      return { category: 'radiation-safety', reason: 'mod 6 default' };
    }
    case 7:
      return { category: 'pediatric', reason: 'mod 7 default' };
    case 8:
      return { category: 'criteria', reason: 'mod 8 default (FRAX)' };
    case 9:
      return { category: 'vfa', reason: 'mod 9 default' };
    case 10: {
      // Spine. TBS is a diagnostic adjunct -> criteria.
      if (/\btbs\b/i.test(h)) return { category: 'criteria', reason: 'TBS -> criteria' };
      return { category: 'spine', reason: 'mod 10 default' };
    }
    case 11:
      return { category: 'hip', reason: 'mod 11 default' };
    case 12: {
      // Forearm. HPT and bilateral hip replacement already captured by SPECIAL_POP earlier.
      return { category: 'forearm', reason: 'mod 12 default' };
    }
    case 13:
      return { category: 'body-comp', reason: 'mod 13 default' };
    case 14: {
      // QC / Precision. Math/score topics -> statistics; procedural -> equipment-qc.
      if (/\blsc\b|\brms[- ]?sd\b|precision degrees|precision example|t-score not serial|bmd formula|standard score/i.test(h)) {
        return { category: 'statistics', reason: 'stat/score topic in QC mod' };
      }
      if (/arrt (2022|2027|blueprint|spec|categories|pass rate|content)/i.test(h)) {
        return { category: 'criteria', reason: 'ARRT spec reference' };
      }
      return { category: 'equipment-qc', reason: 'mod 14 default' };
    }
    default:
      return { category: 'criteria', reason: `unknown module ${mod}` };
  }
}

function isHighYield(item) {
  if (item.source && SOURCE_AUTH_RE.test(item.source)) return true;
  if (HIGH_YIELD_RE.test(item.topic || '')) return true;
  if (Array.isArray(item.tags) && HIGH_YIELD_RE.test(item.tags.join(' '))) return true;
  return false;
}

function retagCollection(items, kind) {
  const ambiguous = [];
  const counts = Object.fromEntries(CATEGORIES.map(c => [c, 0]));
  let hyYes = 0, hyNo = 0;

  const out = items.map(item => {
    let { category, reason } = classify(item);
    // Apply manual override by id, if any.
    if (EXPLICIT_OVERRIDES[item.id]) {
      category = EXPLICIT_OVERRIDES[item.id];
      reason = 'explicit override';
    }
    if (!CATEGORIES.includes(category)) {
      ambiguous.push({ id: item.id, module: item.module, topic: item.topic, reason: `unknown category: ${category}` });
    }
    counts[category] = (counts[category] || 0) + 1;
    const hy = isHighYield(item);
    if (hy) hyYes++; else hyNo++;

    // Flag an item as ambiguous only when it landed on a module default AND its
    // topic/tags contain no recognizable keyword for the resolved category.
    if (reason.endsWith('default')) {
      const CAT_PATTERNS = {
        criteria: CRITERIA_RE,
        'equipment-qc': EQUIPMENT_RE,
        'radiation-safety': RAD_SAFETY_RE,
        'patient-care': PATIENT_CARE_RE,
        statistics: STATISTICS_RE,
        physiology: /(bone|physiology|osteo|remodel|cortical|trabecular|cell|haversian|peak|mass|matrix|growth|appendicular|ossification|menopause|collagen|vitamin|paget|cushing|hypogonadism|hypothyroidism|arthritis|fibrous|severe|secondary|peak bone mass|mean|standard deviation|type 1|type 2|resorption|discordance)/i,
        pharmacology: PHARMA_RE,
        spine: SPINE_RE,
        hip: HIP_RE,
        forearm: FOREARM_RE,
        vfa: VFA_RE,
        pediatric: PEDIATRIC_RE,
        'body-comp': BODYCOMP_RE,
        'special-pop': SPECIAL_POP_RE
      };
      const pat = CAT_PATTERNS[category];
      const h2 = haystack(item);
      if (pat && !pat.test(h2)) {
        ambiguous.push({ id: item.id, module: item.module, topic: item.topic, resolved: category, reason });
      }
    }

    const tagged = { ...item, category, subCategory: item.topic || '', highYield: hy };
    // For flashcards that had a prior `category`, the new value overwrites. Good.
    return tagged;
  });

  return { out, counts, hyYes, hyNo, ambiguous };
}

function printCounts(label, counts) {
  console.log(`\n${label} counts by category:`);
  const rows = CATEGORIES.map(c => [c, counts[c] || 0]);
  const width = Math.max(...rows.map(r => r[0].length));
  for (const [c, n] of rows) {
    console.log(`  ${c.padEnd(width)}  ${String(n).padStart(4)}`);
  }
}

function main() {
  const questions = JSON.parse(readFileSync(Q_PATH, 'utf8'));
  const flashcards = JSON.parse(readFileSync(F_PATH, 'utf8'));

  const qResult = retagCollection(questions, 'question');
  const fResult = retagCollection(flashcards, 'flashcard');

  writeFileSync(Q_PATH, JSON.stringify(qResult.out, null, 2) + '\n');
  writeFileSync(F_PATH, JSON.stringify(fResult.out, null, 2) + '\n');

  console.log(`Retagged ${qResult.out.length} questions and ${fResult.out.length} flashcards.`);
  printCounts('Question', qResult.counts);
  console.log(`\nQuestion high-yield: ${qResult.hyYes} yes, ${qResult.hyNo} no (${Math.round(qResult.hyYes / (qResult.hyYes + qResult.hyNo) * 100)}% high-yield)`);
  printCounts('Flashcard', fResult.counts);
  console.log(`\nFlashcard high-yield: ${fResult.hyYes} yes, ${fResult.hyNo} no (${Math.round(fResult.hyYes / (fResult.hyYes + fResult.hyNo) * 100)}% high-yield)`);

  if (qResult.ambiguous.length) {
    console.log(`\n${qResult.ambiguous.length} question(s) flagged for review (conditional module fell to default):`);
    for (const a of qResult.ambiguous) {
      console.log(`  [${a.id}] mod=${a.module} topic="${a.topic}" resolved=${a.resolved || '?'} reason=${a.reason}`);
    }
  } else {
    console.log('\nNo ambiguous questions.');
  }

  if (fResult.ambiguous.length) {
    console.log(`\n${fResult.ambiguous.length} flashcard(s) flagged for review:`);
    for (const a of fResult.ambiguous) {
      console.log(`  [${a.id}] mod=${a.module} topic="${a.topic}" resolved=${a.resolved || '?'} reason=${a.reason}`);
    }
  } else {
    console.log('\nNo ambiguous flashcards.');
  }
}

main();
