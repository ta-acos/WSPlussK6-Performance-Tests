/* eslint-env node */
/**
 * Validation: Disallow inline http_req_duration thresholds in code.
 * Allowed source: src/config/performance-thresholds.json only.
 * Any inline array e.g. http_req_duration: ['p(95)<2000'] is forbidden.
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const ALLOWED_FILE = path.join('src','config','performance-thresholds.json');

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue; // skip hidden
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc); else acc.push(full);
  }
  return acc;
}

// Pattern: http_req_duration: [ 'p(95)<..', 'p(99)<..' ] (allow comments) – broad but effective
const INLINE_PATTERN = /http_req_duration\s*:\s*\[[^\]]*(p\(9[59]\)|p95|p99)[^\]]*\]/i;

const violations = [];
for (const file of walk(ROOT)) {
  if (!/\.(js|ts|json)$/.test(file)) continue;
  if (file.replace(/\\/g,'/').endsWith(ALLOWED_FILE)) continue;
  // Skip this validator file itself to avoid example text triggering violations
  if (/validate-no-inline-http-thresholds\.js$/.test(file)) continue;
  const text = fs.readFileSync(file,'utf8');
  if (!INLINE_PATTERN.test(text)) continue;
  const lines = text.split(/\r?\n/);
  lines.forEach((line, idx) => {
    if (
      INLINE_PATTERN.test(line) &&
      !/^\s*\/\//.test(line) && // not a // comment
      !/^\s*\*/.test(line)       // not inside a block comment line ( * )
    ) {
      violations.push({ file, line: idx+1, snippet: line.trim().slice(0,140) });
    }
  });
}

if (violations.length) {
  console.error('\n❌ Inline http_req_duration threshold definitions detected (move to ' + ALLOWED_FILE + '):');
  violations.forEach(v => console.error(`  - ${v.file}:${v.line} => ${v.snippet}`));
  console.error('\nFix: Remove inline array and rely on central performance-thresholds.json.');
  process.exit(1);
} else {
  console.log('✅ No inline http_req_duration thresholds found.');
}
