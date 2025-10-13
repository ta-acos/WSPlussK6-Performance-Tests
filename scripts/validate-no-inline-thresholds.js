#!/usr/bin/env node
/* eslint-env node */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
// We only scan test scripts. Framework code in src/** is allowed to manipulate threshold objects.
const SEARCH_DIRS = [path.join(ROOT, 'tests')];

// Heuristic: flag thresholds only when declared inside an exported k6 options object
// This greatly reduces false positives from logging or dynamic generation logic.
const THRESHOLD_PATTERNS = [
  /export\s+const\s+options\s*=\s*\{[\s\S]*?thresholds\s*:/i,
  /module\.exports\s*=\s*\{[\s\S]*?thresholds\s*:/i
];

// Allowlist files (e.g., central threshold injection logic) - currently none explicit
const ALLOWLIST = [
  // Add paths (relative) here if needed
];

const violations = [];

function scanFile(filePath) {
  const rel = path.relative(ROOT, filePath);
  if (ALLOWLIST.some(a => rel.includes(a))) return; // skip allowlisted
  const content = fs.readFileSync(filePath, 'utf-8');
  for (const pat of THRESHOLD_PATTERNS) {
    if (pat.test(content)) {
      violations.push(rel);
      return;
    }
  }
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full); else if (full.endsWith('.js')) scanFile(full);
  }
}

SEARCH_DIRS.forEach(walk);

if (violations.length) {
  console.error('\n❌ Inline threshold definitions detected (should be centralized):');
  violations.forEach(v => console.error(' - ' + v));
  process.exit(1);
}
console.log('✅ No inline threshold definitions detected.');
