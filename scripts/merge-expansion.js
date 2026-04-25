#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const BANK_PATH = resolve(ROOT, 'src/data/questions.json');
const EXPANSION_DIR = resolve(ROOT, 'data');
const EXPANSION_COUNT = 9;
const DEFAULT_SOURCE = 'Original question bank';

const REQUIRED_FIELDS = [
  'id', 'module', 'category', 'subCategory', 'highYield',
  'topic', 'difficulty', 'type', 'question', 'options',
  'correct', 'explanation', 'source', 'tags'
];
const VALID_DIFFICULTY = new Set(['easy', 'medium', 'hard']);
const VALID_TYPES = new Set(['multiple_choice', 'true_false']);

function loadJson(path) {
  if (!existsSync(path)) throw new Error(`File not found: ${path}`);
  const raw = readFileSync(path, 'utf8');
  try { return JSON.parse(raw); }
  catch (e) { throw new Error(`Invalid JSON in ${path}: ${e.message}`); }
}

function validateQuestion(q, label) {
  const problems = [];
  for (const f of REQUIRED_FIELDS) {
    if (!(f in q)) problems.push(`missing field "${f}"`);
  }
  if (q.id != null && typeof q.id !== 'string') problems.push('id must be string');
  if (q.module != null && typeof q.module !== 'number') problems.push('module must be number');
  if (q.category != null && typeof q.category !== 'string') problems.push('category must be string');
  if (q.highYield != null && typeof q.highYield !== 'boolean') problems.push('highYield must be boolean');
  if (q.difficulty != null && !VALID_DIFFICULTY.has(q.difficulty)) problems.push(`difficulty must be easy|medium|hard (got "${q.difficulty}")`);
  if (q.type != null && !VALID_TYPES.has(q.type)) problems.push(`type must be one of ${[...VALID_TYPES].join('|')} (got "${q.type}")`);
  if (!Array.isArray(q.options)) problems.push('options must be array');
  else if (q.options.length < 2) problems.push('options must have at least 2 items');
  if (!Array.isArray(q.tags)) problems.push('tags must be array');
  if (Array.isArray(q.options)) {
    if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct >= q.options.length) {
      problems.push(`correct (${q.correct}) is not a valid index into options[${q.options.length}]`);
    }
  }
  if (problems.length) {
    throw new Error(`${label} (id=${q.id ?? '<no id>'}): ${problems.join('; ')}`);
  }
}

function summarize(list) {
  const byCat = {}, byDiff = {}, byHigh = { true: 0, false: 0 };
  for (const q of list) {
    byCat[q.category] = (byCat[q.category] || 0) + 1;
    byDiff[q.difficulty] = (byDiff[q.difficulty] || 0) + 1;
    byHigh[q.highYield ? 'true' : 'false']++;
  }
  return { byCat, byDiff, byHigh };
}

function formatTable(obj, keyHeader, valHeader = 'count') {
  const keys = Object.keys(obj).sort();
  const maxK = Math.max(keyHeader.length, ...keys.map(k => k.length));
  const lines = [];
  lines.push(`  ${keyHeader.padEnd(maxK)}  ${valHeader}`);
  lines.push(`  ${'-'.repeat(maxK)}  ${'-'.repeat(valHeader.length)}`);
  for (const k of keys) lines.push(`  ${k.padEnd(maxK)}  ${obj[k]}`);
  return lines.join('\n');
}

function main() {
  console.log(`Loading bank: ${BANK_PATH}`);
  const base = loadJson(BANK_PATH);
  if (!Array.isArray(base)) throw new Error('Bank must be a JSON array');
  console.log(`  ${base.length} existing questions`);

  // Backfill source on originals that lack it (defensive — current bank already has source on most/all)
  let backfilled = 0;
  for (const q of base) {
    if (!q.source || typeof q.source !== 'string' || q.source.trim() === '') {
      q.source = DEFAULT_SOURCE;
      backfilled++;
    }
  }
  if (backfilled) console.log(`  backfilled source on ${backfilled} existing question(s)`);

  // Index existing by id
  const seen = new Map();
  for (const q of base) {
    if (seen.has(q.id)) {
      throw new Error(`Duplicate id in existing bank: ${q.id}`);
    }
    seen.set(q.id, 'original');
  }

  // Load expansion files
  const merged = [...base];
  let addedTotal = 0;
  let skippedTotal = 0;
  for (let i = 1; i <= EXPANSION_COUNT; i++) {
    const path = resolve(EXPANSION_DIR, `questions_expansion_${i}.json`);
    const list = loadJson(path);
    if (!Array.isArray(list)) throw new Error(`Expansion file must be an array: ${path}`);
    let added = 0, skipped = 0;
    for (let j = 0; j < list.length; j++) {
      const q = list[j];
      validateQuestion(q, `expansion_${i}[${j}]`);
      if (seen.has(q.id)) {
        skipped++;
        continue;
      }
      seen.set(q.id, `expansion_${i}`);
      merged.push(q);
      added++;
    }
    console.log(`  expansion_${i}: +${added} new, ${skipped} skipped (already present)`);
    addedTotal += added;
    skippedTotal += skipped;
  }

  // Validate all originals too (defensive; catches stale records)
  for (const q of base) validateQuestion(q, `original id=${q.id}`);

  console.log(`\nMerge result: ${merged.length} total (${addedTotal} added, ${skippedTotal} already present)`);

  // Write
  writeFileSync(BANK_PATH, JSON.stringify(merged, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${BANK_PATH}`);

  // Summary
  const { byCat, byDiff, byHigh } = summarize(merged);
  console.log(`\nTotal questions: ${merged.length}`);
  console.log(`\nBy category:`);
  console.log(formatTable(byCat, 'category'));
  console.log(`\nBy difficulty:`);
  console.log(formatTable(byDiff, 'difficulty'));
  console.log(`\nBy highYield:`);
  console.log(`  true   ${byHigh.true}`);
  console.log(`  false  ${byHigh.false}`);
}

try { main(); }
catch (e) {
  console.error(`\nERROR: ${e.message}`);
  process.exit(1);
}
