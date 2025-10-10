// threshold-builder.js
// Builds final k6 thresholds from canonical performance-thresholds.json + profile modifiers
// Single Source of Truth pattern.

const CANON_CANDIDATES = [
  './src/config/performance-thresholds.json',
  '../src/config/performance-thresholds.json',
  '../../src/config/performance-thresholds.json',
  '../../../src/config/performance-thresholds.json',
  'src/config/performance-thresholds.json'
];
const PROFILE_CANDIDATES = [
  './src/config/performance-threshold-profiles.json',
  '../src/config/performance-threshold-profiles.json',
  '../../src/config/performance-threshold-profiles.json',
  '../../../src/config/performance-threshold-profiles.json',
  'src/config/performance-threshold-profiles.json'
];

function loadFirst(candidates) {
  for (let i = 0; i < candidates.length; i++) {
    const p = candidates[i];
    try {
      return JSON.parse(open(p));
    } catch (e) {
      /* try next */
    }
  }
  return null;
}

function applyMetricSpec(metric, spec, add) {
  if (!spec || typeof spec !== 'object') return;
  Object.entries(spec).forEach(([k, v]) => {
    if (v === null || v === undefined) return;
    if (/^p\d{2}$/i.test(k)) add(metric, `p(${k.slice(1)})<${v}`);
    else if (/^p(95|99)$/i.test(k)) add(metric, `p(${k.replace(/[^0-9]/g, '')})<${v}`);
    else if (k === 'rate') add(metric, `rate<${v}`);
    else if (k === 'value') add(metric, `value<${v}`);
  });
}

function parseRuleForAdjust(rule) {
  // supports patterns like p(95)<4500, rate<0.05
  const m = /(p\((\d+)\)|rate|value)<(\d+(?:\.\d+)?)/.exec(rule);
  if (!m) return null;
  return { stat: m[1] === 'rate' || m[1] === 'value' ? m[1] : `p${m[2]}`, value: parseFloat(m[3]) };
}

function rebuildRule(stat, value) {
  if (stat === 'rate' || stat === 'value') return `${stat}<${value}`;
  if (/^p\d+$/.test(stat)) return `p(${stat.slice(1)})<${value}`;
  return null;
}

export function buildThresholds(params = {}) {
  const scenario = params.scenario;
  const environment = params.environment;
  const canonical = params.canonical || loadFirst(CANON_CANDIDATES) || {};
  const profiles = params.profiles || loadFirst(PROFILE_CANDIDATES) || { scenarios: {}, environments: {} };

  const rules = []; // [metric, rule]
  const add = (metric, rule) => {
    if (!rule) return;
    rules.push([metric, rule]);
  };

  // 1. defaults
  if (canonical.defaults && canonical.defaults.k6) {
    Object.entries(canonical.defaults.k6).forEach(function (pair) {
      const metric = pair[0];
      const spec = pair[1];
      applyMetricSpec(metric, spec, add);
    });
  }

  // 2. operations
  if (canonical.operations) {
    Object.keys(canonical.operations).forEach(function (k) {
      const op = canonical.operations[k];
      if (op && op.k6) {
        Object.entries(op.k6).forEach(function (pair) {
          const metric = pair[0];
          const spec = pair[1];
          applyMetricSpec(metric, spec, add);
        });
      }
    });
  }

  // 3. derive http_req_duration p95 from maxResponseTimeMs if absent
  if (
    !rules.some(function (r) {
      return r[0] === 'http_req_duration' && /p\(95\)</.test(r[1]);
    })
  ) {
    const fallback = canonical.defaults && canonical.defaults.maxResponseTimeMs;
    if (fallback) add('http_req_duration', `p(95)<${fallback}`);
  }

  // Helper: apply profile modifiers (multipliers, addRules, disabledStats)
  function applyProfileModifier(profile) {
    if (!profile) return;
    // Multipliers apply to existing numeric comparators
    if (profile.multipliers) {
      Object.entries(profile.multipliers).forEach(([key, mult]) => {
        const [metric, stat] = key.split('.');
        for (let i = 0; i < rules.length; i++) {
          const [m, rule] = rules[i];
          if (m !== metric) continue;
          const parsed = parseRuleForAdjust(rule);
          if (!parsed) continue;
          if (parsed.stat === stat) {
            const newVal = parsed.value * mult;
            const rebuilt = rebuildRule(parsed.stat, Math.round(newVal));
            if (rebuilt) rules[i] = [m, rebuilt];
          }
        }
      });
    }
    // Add rules
    if (profile.addRules) {
      Object.entries(profile.addRules).forEach(([metric, arr]) => {
        (Array.isArray(arr) ? arr : [arr]).forEach((rule) => add(metric, rule));
      });
    }
    // disabledStats: remove rules whose stat matches
    if (profile.disabledStats) {
      for (const stat of profile.disabledStats) {
        for (let i = rules.length - 1; i >= 0; i--) {
          const parsed = parseRuleForAdjust(rules[i][1]);
          if (parsed && parsed.stat === stat.replace(/\(/, '').replace(/\)/, '')) rules.splice(i, 1);
        }
      }
    }
  }

  const scenarioKey = scenario || __ENV.SCENARIO || '';
  const envKey = environment || __ENV.ENVIRONMENT || '';

  if (profiles.environments && profiles.environments[envKey]) {
    applyProfileModifier(profiles.environments[envKey]);
  }
  if (profiles.scenarios && profiles.scenarios[scenarioKey]) {
    applyProfileModifier(profiles.scenarios[scenarioKey]);
  }

  // Deduplicate by metric+stat choosing stricter (< smaller number)
  const finalMap = {}; // metric -> stat -> {value, rule}
  for (let i = 0; i < rules.length; i++) {
    const metric = rules[i][0];
    const rule = rules[i][1];
    const parsed = parseRuleForAdjust(rule);
    if (!parsed) {
      if (!finalMap[metric]) finalMap[metric] = [];
      finalMap[metric].push(rule);
      continue;
    }
    const statKey = parsed.stat;
    if (!finalMap[metric] || Array.isArray(finalMap[metric])) {
      if (!finalMap[metric] || Array.isArray(finalMap[metric])) finalMap[metric] = {};
    }
    const existing = finalMap[metric][statKey];
    if (!existing || parsed.value < existing.value) {
      finalMap[metric][statKey] = { value: parsed.value, rule: rule };
    }
  }

  const out = {};
  Object.keys(finalMap).forEach(function (metric) {
    const v = finalMap[metric];
    if (Array.isArray(v)) out[metric] = v;
    else
      out[metric] = Object.keys(v).map(function (k) {
        return v[k].rule;
      });
  });

  return out;
}
