#!/usr/bin/env node
/**
 * Ensures environment config JSON files (src/config/*.json) do NOT contain a top-level "thresholds" key.
 * Promotes single-source threshold governance via performance-thresholds.json + profiles.
 */

import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

/* eslint-disable no-undef */
// Assumes Node.js execution environment
const CONFIG_DIR = join(process.cwd(), 'src', 'config');
let failed = false;

for (const file of readdirSync(CONFIG_DIR)) {
  if (!file.endsWith('.json')) continue;
  if (file === 'performance-thresholds.json' || file === 'performance-threshold-profiles.json' || file === 'environments.json') continue;
  const full = join(CONFIG_DIR, file);
  try {
    const content = readFileSync(full, 'utf8');
    const json = JSON.parse(content);
    if (Object.prototype.hasOwnProperty.call(json, 'thresholds')) {
      console.error(`❌ ${file}: contains disallowed top-level 'thresholds' (remove it; use canonical config)`);
      failed = true;
    }
  } catch (e) {
    console.error(`⚠️ Could not parse ${file}: ${e.message}`);
  }
}

if (failed) {
  console.error('\nPolicy violation: Remove inline env thresholds.');
  process.exit(1);
}
console.log('✅ No disallowed environment-level thresholds found.');
