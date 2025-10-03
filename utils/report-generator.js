/**
 * generateHtmlReport(data)
 * Build a single self-contained HTML file (no external assets) summarizing a k6 run.
 * Focuses on stakeholder readability: KPIs, latency, thresholds, raw metric statistics.
 */

function fmt(num, digits = 2) {
  if (num === undefined || num === null || isNaN(num)) return 'n/a';
  return Number(num).toFixed(digits);
}

function fmtInt(num) {
  if (num === undefined || num === null || isNaN(num)) return '0';
  return Math.round(num).toLocaleString();
}

function fmtBytes(bytes) {
  if (!bytes || isNaN(bytes)) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let val = bytes;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${fmt(val)} ${units[i]}`;
}

function safe(obj, path, def = undefined) {
  try {
    return path.split('.').reduce((o, k) => (o || {})[k], obj) ?? def;
  } catch {
    return def;
  }
}

function buildDonut(successRate) {
  const sr = Math.min(Math.max(successRate, 0), 100);
  const radius = 42;
  const circ = 2 * Math.PI * radius;
  const successStroke = (sr / 100) * circ;
  return `<svg width="110" height="110" viewBox="0 0 110 110" role="img" aria-label="Success/Failure Donut">
    <circle cx="55" cy="55" r="42" fill="none" stroke="#eee" stroke-width="14" />
    <circle cx="55" cy="55" r="42" fill="none" stroke="#1B873F" stroke-width="14" stroke-dasharray="${successStroke} ${circ - successStroke}" stroke-linecap="round" transform="rotate(-90 55 55)" />
    <text x="55" y="50" text-anchor="middle" font-size="18" font-weight="600" fill="#333">${fmt(sr, 0)}%</text>
    <text x="55" y="68" text-anchor="middle" font-size="11" fill="#666">Success</text>
  </svg>`;
}

function latencyBar(min, p50, p90, p95, max, thresholds) {
  if ([min, p50, p90, p95, max].some((v) => v === undefined)) return { html: '', css: '' };
  const span = max - min || 1;
  function rel(v) {
    return ((v - min) / span) * 100;
  }
  function classify(v) {
    if (v <= thresholds.LAT_P95_GOOD_MS) return 'lat-good';
    if (v <= thresholds.LAT_P95_WARN_MS) return 'lat-warn';
    return 'lat-bad';
  }
  const marks = [
    { label: 'min', v: min },
    { label: 'med', v: p50 },
    { label: 'p90', v: p90 },
    { label: 'p95', v: p95 },
    { label: 'max', v: max }
  ];
  let dynamicCss = '';
  const ticksHtml = marks
    .map((m, i) => {
      const left = rel(m.v);
      dynamicCss += `.lat-bar .tick-${i}{left:${left}%;}`;
      const cls = classify(m.v);
      return `<span class="tick tick-${i} ${cls}" title="${m.label}: ${fmt(m.v)} ms"><i></i><em>${m.label}</em></span>`;
    })
    .join('');
  return { html: `<div class="lat-bar"><div class="scale">${ticksHtml}</div></div>`, css: dynamicCss };
}

function thresholdsTable(metrics) {
  const rows = [];
  Object.entries(metrics).forEach(([name, m]) => {
    if (m.thresholds) {
      Object.entries(m.thresholds).forEach(([thr, status]) => {
        rows.push({ metric: name, threshold: thr, ok: !!status.ok });
      });
    }
  });
  if (!rows.length) return '<p><em>No thresholds defined.</em></p>';
  return `<table class="compact"><thead><tr><th>Metric</th><th>Threshold</th><th>Status</th></tr></thead><tbody>${rows
    .map(
      (r) =>
        `<tr class="${r.ok ? 'cell-good' : 'cell-bad'}"><td>${r.metric}</td><td><code>${r.threshold}</code></td><td class="${r.ok ? 'cell-good' : 'cell-bad'}">${r.ok ? '<span class="ok">PASS</span>' : '<span class="fail">FAIL</span>'}</td></tr>`
    )
    .join('')}</tbody></table>`;
}

// Build a benchmark table: Actual vs Target per threshold for non-technical readers
function thresholdsBenchmarkTable(metrics) {
  const rows = [];
  const opRegex = /(<=|>=|<|>|==)/;
  Object.entries(metrics).forEach(([metricName, m]) => {
    if (!m.thresholds) return;
    const values = m.values || {};
    Object.entries(m.thresholds).forEach(([rule, status]) => {
      const primary = rule.split('&&')[0].trim();
      const match = primary.match(opRegex);
      if (!match) {
        rows.push({ metricName, rule: primary, stat: 'n/a', target: 'n/a', actual: 'n/a', delta: 'n/a', ok: !!status.ok, cls: '' });
        return;
      }
      const op = match[0];
      const parts = primary.split(op);
      const left = parts[0].trim();
      const rightRaw = (parts[1] || '').trim();
      const target = parseFloat(rightRaw);
      const statKey = left;
      const actual = values[statKey] !== undefined ? values[statKey] : (values[left] !== undefined ? values[left] : undefined);
      let deltaDisplay = 'n/a';
      let improvement = null;
      let pct = null;
      if (actual !== undefined && !isNaN(actual) && !isNaN(target)) {
        if (op === '<' || op === '<=') improvement = target - actual; else if (op === '>' || op === '>=') improvement = actual - target; else if (op === '==') improvement = target - actual;
        pct = target !== 0 ? (improvement / target) * 100 : 0;
        const sign = improvement > 0 ? '+' : improvement < 0 ? '' : '';
        deltaDisplay = `${sign}${improvement.toFixed(2)} (${sign}${pct.toFixed(1)}%)`;
      }
      let severityClass = '';
      if (improvement !== null) {
        if (!status.ok) severityClass = 'cell-bad'; else if (pct >= 10) severityClass = 'cell-good'; else if (pct >= 0) severityClass = 'cell-warn'; else severityClass = 'cell-bad';
      } else if (!status.ok) severityClass = 'cell-bad';
      rows.push({ metricName, rule: primary, stat: statKey, target: isNaN(target) ? rightRaw : target, actual: actual !== undefined && !isNaN(actual) ? (statKey.includes('rate') ? actual : actual.toFixed(2)) : 'n/a', delta: deltaDisplay, ok: !!status.ok, cls: severityClass });
    });
  });
  if (!rows.length) return { html: '', rows: [] };
  const html = `<table class="compact" id="benchmarks-table"><thead><tr><th>Metric</th><th>Rule</th><th>Actual</th><th>Target</th><th>Delta vs Target</th><th>Status</th></tr></thead><tbody>${rows.map(r => `<tr class="${r.cls}"><td>${r.metricName}</td><td><code>${r.rule}</code></td><td>${r.actual}</td><td>${r.target}</td><td class="${r.cls}">${r.delta}</td><td class="${r.ok ? 'cell-good' : 'cell-bad'}">${r.ok ? '<span class="ok">PASS</span>' : '<span class="fail">FAIL</span>'}</td></tr>`).join('')}</tbody></table>`;
  return { html, rows };
}

function buildLatencyTable(metrics) {
  const primary = metrics['http_req_duration'];
  const parts = [
    'http_req_waiting',
    'http_req_blocked',
    'http_req_connecting',
    'http_req_tls_handshaking',
    'http_req_sending',
    'http_req_receiving'
  ];
  function row(label, key) {
    const v = metrics[key]?.values || {};
    if (!Object.keys(v).length) return '';
    return `<tr><td>${label}</td><td>${fmt(v.min)}</td><td>${fmt(v.avg)}</td><td>${fmt(v.med)}</td><td>${fmt(v['p(90)'])}</td><td>${fmt(v['p(95)'])}</td><td>${fmt(v.max)}</td></tr>`;
  }
  const header = `<tr><th>Metric</th><th>Min</th><th>Avg</th><th>Med</th><th>p(90)</th><th>p(95)</th><th>Max</th></tr>`;
  let html = '<table class="latency">' + header;
  if (primary) html += row('Overall Duration', 'http_req_duration');
  parts.forEach((p) => {
    html += row(p.replace('http_req_', '').replace('_', ' '), p);
  });
  html += '</table>';
  return html;
}

// Build a unified table of all metric statistics (dynamic columns)
function buildAllMetricsTable(metrics) {
  const valueKeys = new Set();
  Object.values(metrics).forEach((m) => {
    if (m && m.values) Object.keys(m.values).forEach((k) => valueKeys.add(k));
  });
  if (!valueKeys.size) return '<p><em>No metric statistics captured.</em></p>';

  const preferredOrder = [
    'count',
    'passes',
    'fails',
    'rate',
    'value',
    'min',
    'max',
    'avg',
    'med',
    'p(50)',
    'p(75)',
    'p(90)',
    'p(95)',
    'p(99)',
    'p(99.9)'
  ];
  const ordered = Array.from(valueKeys).sort((a, b) => {
    const ai = preferredOrder.indexOf(a);
    const bi = preferredOrder.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });

  function formatCell(k, v) {
    if (v === undefined || v === null) return '—';
    if (typeof v === 'number') {
      if (k === 'count' || k === 'passes' || k === 'fails') return fmtInt(v);
      if (k === 'rate') return fmt(v, 4);
      return fmt(v);
    }
    return String(v);
  }

  const rows = Object.entries(metrics)
    .map(([name, m]) => {
      const vals = m.values || {};
      // Heuristic classification
      let rowClass = '';
      // Latency-focused metrics (trend durations)
      const p95 = vals['p(95)'];
      const isLatencyMetric = /duration|http_req_(duration|waiting|blocked|connecting|tls_handshaking|sending|receiving)/.test(name);
      if (isLatencyMetric && typeof p95 === 'number') {
        if (p95 <= 800) rowClass = 'cell-good';
        else if (p95 <= 2000) rowClass = 'cell-warn';
        else rowClass = 'cell-bad';
      }
      // HTTP failure rate
      if (name === 'http_req_failed' && typeof vals.rate === 'number') {
        if (vals.rate <= 0.01) rowClass = 'cell-good';
        else if (vals.rate <= 0.05) rowClass = 'cell-warn';
        else rowClass = 'cell-bad';
      }
      // Checks (passes/fails)
      if (name === 'checks' && typeof vals.fails === 'number') {
        const total = (vals.passes || 0) + (vals.fails || 0);
        const failRate = total ? vals.fails / total : 0;
        if (failRate === 0) rowClass = 'cell-good';
        else if (failRate <= 0.02) rowClass = 'cell-warn';
        else rowClass = 'cell-bad';
      }
      const cells = ordered
        .map((k) => {
          let extraClass = '';
          if (rowClass && (k === 'p(95)' || k === 'rate' || k === 'fails')) extraClass = rowClass;
          return `<td class="${extraClass}">${formatCell(k, vals[k])}</td>`;
        })
        .join('');
      return `<tr class="${rowClass}"><td>${name}</td>${cells}</tr>`;
    })
    .join('');

  const legend = `<div class="notes legend"><strong>Legend:</strong> <span class="legend-box cell-good">Good</span> <span class="legend-box cell-warn">Watch</span> <span class="legend-box cell-bad">Investigate</span> &mdash; Heuristics: latency p(95) &le; 800ms (good) / &le; 2000ms (watch) / > 2000ms (investigate); http_req_failed rate &le;1% / &le;5% / >5%; checks fail rate 0 / &le;2% / >2%.</div>`;

  return `${legend}<table class="compact"><thead><tr><th>Metric</th>${ordered
    .map((k) => `<th>${k}</th>`)
    .join('')}</tr></thead><tbody>${rows}</tbody></table>`;
}

export function generateHtmlReport(data, options = {}) {
  const env = (typeof __ENV !== 'undefined' && __ENV) || {};
  const cfg = options.thresholds || {};
  // Initial dark mode preference: default true if not explicitly set to false
  const startDark = (function(){
    // Default is LIGHT mode now; require explicit opt-in for dark.
    if (env.ENABLE_DARK_MODE === undefined) return false; // default off
    const v = String(env.ENABLE_DARK_MODE).toLowerCase();
    return v === '1' || v === 'true' || v === 'yes';
  })();
  const THRESH = {
    KPI_SUCCESS_GOOD: parseFloat(env.KPI_SUCCESS_GOOD || cfg.KPI_SUCCESS_GOOD) || 99,
    KPI_SUCCESS_WARN: parseFloat(env.KPI_SUCCESS_WARN || cfg.KPI_SUCCESS_WARN) || 95,
    LAT_P95_GOOD_MS: parseFloat(env.LAT_P95_GOOD_MS || cfg.LAT_P95_GOOD_MS) || 800,
    LAT_P95_WARN_MS: parseFloat(env.LAT_P95_WARN_MS || cfg.LAT_P95_WARN_MS) || 2000,
    ERR_RATE_WARN: parseFloat(env.ERR_RATE_WARN || cfg.ERR_RATE_WARN) || 0.01,
    ERR_RATE_BAD: parseFloat(env.ERR_RATE_BAD || cfg.ERR_RATE_BAD) || 0.05,
    CHECK_FAIL_WARN: parseFloat(env.CHECK_FAIL_WARN || cfg.CHECK_FAIL_WARN) || 0.02,
    CHECK_FAIL_BAD: parseFloat(env.CHECK_FAIL_BAD || cfg.CHECK_FAIL_BAD) || 0.05
  };
  const metrics = data.metrics || {};
  const dur = safe(metrics, 'http_req_duration.values', {});
  const reqs = safe(metrics, 'http_reqs.values', {});
  const failedRate = safe(metrics, 'http_req_failed.values.rate', 0) || 0;
  const successRate = (1 - failedRate) * 100;
  const checks = safe(metrics, 'checks.values', {});
  const dataRecv = safe(metrics, 'data_received.values.count', 0);
  const dataSent = safe(metrics, 'data_sent.values.count', 0);
  const iterationDur = safe(metrics, 'iteration_duration.values', {});
  const vusVal = safe(metrics, 'vus.values.value', safe(metrics, 'vus_max.values.value', 'n/a'));
  const testDurationSeconds = safe(data, 'state.testRunDurationMs', 0) / 1000;

  // KPI severity classification
  const p95Latency = dur['p(95)'];
  const successKpiClass = successRate >= THRESH.KPI_SUCCESS_GOOD ? 'kpi-good' : successRate >= THRESH.KPI_SUCCESS_WARN ? 'kpi-warn' : 'kpi-bad';
  const durationKpiClass = typeof p95Latency === 'number'
    ? (p95Latency <= 800 ? 'kpi-good' : p95Latency <= 2000 ? 'kpi-warn' : 'kpi-bad')
    : 'kpi-neutral';
  const maxDurKpiClass = durationKpiClass; // reuse same classification for max duration for simplicity
  const neutralKpi = 'kpi-neutral';

  const donut = buildDonut(successRate);
  const latArtifacts = latencyBar(dur.min, dur.med, dur['p(90)'], dur['p(95)'], dur.max, THRESH);
  function spark(d){
    if(!d||!d['p(95)']) return '';
    const pts=[d.med||d['p(50)'], d['p(75)'], d['p(90)'], d['p(95)'], d.max].filter(v=>typeof v==='number');
    if(pts.length<3) return '';
    const mx=Math.max(...pts), mn=Math.min(...pts), rg=mx-mn||1, w=120, h=34, step=w/(pts.length-1);
    const path=pts.map((v,i)=>{const y=h-((v-mn)/rg)*(h-4)-2; const x=i*step; return (i?'L':'M')+x+','+y;}).join(' ');
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" class="spark"><path d="${path}" fill="none" stroke="#1B873F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  const latencySpark = spark(dur);
  const latBar = latArtifacts.html;
  const latencyTable = buildLatencyTable(metrics);
  const thresholds = thresholdsTable(metrics);
  const thresholdsBenchmarks = thresholdsBenchmarkTable(metrics);

  const allMetricsTable = buildAllMetricsTable(metrics);

  // Threshold summary for executive insights (moved up to avoid TDZ)
  const thresholdSummary = (() => {
    let total = 0;
    let failed = 0;
    const failedItems = [];
    Object.entries(metrics).forEach(([name, m]) => {
      if (m && m.thresholds) {
        Object.entries(m.thresholds).forEach(([rule, status]) => {
          total++;
            if (!status.ok) {
              failed++;
              if (failedItems.length < 5) failedItems.push(`${name} :: ${rule}`);
            }
        });
      }
    });
    return { total, failed, failedItems };
  })();

  const overallStatus = thresholdSummary.failed > 0 ? (thresholdSummary.failed / (thresholdSummary.total || 1) > 0.3 ? 'bad' : 'warn') : 'good';
  const overallBadgeText = overallStatus === 'good' ? 'Healthy' : overallStatus === 'warn' ? 'Attention' : 'Action Needed';
  const overallClass = overallStatus === 'good' ? 'alert-good' : overallStatus === 'warn' ? 'alert-warn' : 'alert-bad';
  const p95Text = dur['p(95)'] !== undefined ? `${fmt(dur['p(95)'])} ms p95` : 'p95 n/a';
  const successRateText = `${fmt(successRate,2)}% success (${fmt(100 - successRate,2)}% fail)`;
  const failedThresholdLine = thresholdSummary.total
    ? (thresholdSummary.failed === 0
        ? 'All thresholds passed.'
        : `${thresholdSummary.failed}/${thresholdSummary.total} thresholds failed${thresholdSummary.failedItems.length ? ': ' + thresholdSummary.failedItems.join('; ') + (thresholdSummary.failed > thresholdSummary.failedItems.length ? '…' : '') : ''}`)
    : 'No thresholds defined.';

  // Derive potential SLO target for p95 latency from thresholds
  function extractP95Target() {
    let target = null;
    const hd = metrics['http_req_duration'];
    if (hd && hd.thresholds) {
      Object.keys(hd.thresholds).forEach((rule) => {
        if (target !== null) return;
        const m = rule.match(/p\(95\)\s*<={0,1}\s*(\d+(?:\.\d+)?)/);
        if (m) target = parseFloat(m[1]);
      });
    }
    return target;
  }
  const p95Target = extractP95Target();
  const p95Val = dur['p(95)'];
  const p95Progress = p95Target && p95Val ? Math.min(100, (p95Val / p95Target) * 100) : null;

  // Risk detection
  const risks = [];
  if (p95Val && (p95Val > (p95Target || 2000))) risks.push({ level: 'high', msg: `High p95 latency ${fmt(p95Val)} ms${p95Target ? ' (target ' + p95Target + ' ms)' : ''}` });
  if (failedRate > 0.05) risks.push({ level: 'high', msg: `Error rate ${(failedRate*100).toFixed(2)}% above 5%` });
  else if (failedRate > 0.01) risks.push({ level: 'med', msg: `Error rate ${(failedRate*100).toFixed(2)}% above 1%` });
  if (checks.fails) risks.push({ level: 'med', msg: `${checks.fails} check failure(s)` });
  if (thresholdSummary.failed) risks.push({ level: 'med', msg: `${thresholdSummary.failed} failing threshold(s)` });
  const topRisks = risks.slice(0, 3);

  // Narrative & recommendations
  function buildNarrative() {
    const parts = [];
    parts.push(`Test achieved a ${fmt(successRate,2)}% success rate with p95 latency ${p95Val ? fmt(p95Val) + ' ms' : 'n/a'}.`);
    if (thresholdSummary.failed === 0 && risks.length === 0) parts.push('All monitored objectives were met with no notable performance risks.');
    else parts.push(`${thresholdSummary.failed} of ${thresholdSummary.total || 0} thresholds failed; ${risks.length ? 'key risks identified below' : 'review threshold definitions'}.`);
    return parts.join(' ');
  }
  function buildRecommendations() {
    const recs = [];
    if (p95Target && p95Val && p95Val > p95Target) recs.push('Investigate slow endpoints contributing to p95 latency; profile DB calls or external dependencies.');
    if (failedRate > 0.01) recs.push('Analyze failed request samples (enable HTTP debug logging or trace IDs).');
    if (checks.fails) recs.push('Review failing functional checks for correctness vs environment configuration.');
    if (!recs.length) recs.push('No immediate action required. Continue monitoring and consider setting stricter SLOs as confidence grows.');
    return recs;
  }
  const narrative = buildNarrative();
  const recommendations = buildRecommendations();

  // Baseline comparison (if provided under data.baseline.metrics)
  let baselineHtml = '';
  try {
    const baseMetrics = safe(data, 'baseline.metrics');
    if (baseMetrics) {
      const bDur = safe(baseMetrics, 'http_req_duration.values', {});
      const bFailedRate = safe(baseMetrics, 'http_req_failed.values.rate', 0) || 0;
      const bSuccess = (1 - bFailedRate) * 100;
      const bP95 = bDur['p(95)'];
      const rows = [];
      if (p95Val && bP95) rows.push({ label: 'p95 Latency (ms)', current: fmt(p95Val), baseline: fmt(bP95), delta: (p95Val - bP95).toFixed(2), better: p95Val < bP95 });
      rows.push({ label: 'Success Rate (%)', current: fmt(successRate,2), baseline: fmt(bSuccess,2), delta: (successRate - bSuccess).toFixed(2), better: successRate > bSuccess });
      if (rows.length) {
        baselineHtml = `<h3>Baseline Comparison</h3><table class="compact" id="baseline-table"><thead><tr><th>Metric</th><th>Current</th><th>Baseline</th><th>Delta</th><th>Direction</th></tr></thead><tbody>${rows.map(r => `<tr class="${r.better ? 'cell-good' : 'cell-warn'}"><td>${r.label}</td><td>${r.current}</td><td>${r.baseline}</td><td>${r.delta}</td><td>${r.better ? 'Improved' : 'Regressed'}</td></tr>`).join('')}</tbody></table>`;
      }
    } else {
      baselineHtml = '<div class="notes"><em>No baseline provided. Supply a previous summary JSON as data.baseline to enable comparison.</em></div>';
    }
  } catch (_) {
    baselineHtml = '<div class="notes"><em>Baseline comparison unavailable (parse error).</em></div>';
  }


  // Ensure reports dir exists when running locally (defensive; k6 usually handles serialization path only)
  try {
    if (typeof require === 'function') {
      // placeholder: local fs/report dir preparation not required in k6 runtime
    }
  } catch (_) {
    /* ignored */
  }

  return `<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"UTF-8\" />
  <title>k6 Performance Report</title>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    :root { --ok:#1B873F; --warn:#FF8B00; --fail:#B00020; --bg:#f6f8fa; --card:#fff; --border:#d0d7de; }
    body { font-family: system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,sans-serif; margin:0; background:var(--bg); color:#24292f; }
    header { padding:20px 28px; background:#111827; color:#f9fafb; }
    header h1 { margin:0 0 4px 0; font-size:20px; }
    header small { opacity:.8; }
    main { padding:24px 28px 60px; }
    h2 { margin:34px 0 12px; font-size:18px; }
    h3 { margin:26px 0 10px; font-size:16px; }
    .grid { display:grid; gap:16px; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); }
    .kpi { background:var(--card); border:1px solid var(--border); border-radius:8px; padding:14px 16px; box-shadow:0 1px 2px rgba(0,0,0,.04); position:relative; }
    .kpi h4 { margin:0 0 6px; font-size:12px; letter-spacing:.5px; text-transform:uppercase; color:#57606a; }
    .kpi p { margin:0; font-size:22px; font-weight:600; }
    .muted { color:#57606a; font-size:12px; }
  /* KPI severity backgrounds */
  .kpi-good { background:linear-gradient(135deg,#e6f7ed,#ffffff); border-color:#1B873F55; }
  .kpi-warn { background:linear-gradient(135deg,#fff3d4,#ffffff); border-color:#FF8B0055; }
  .kpi-bad { background:linear-gradient(135deg,#fde2e0,#ffffff); border-color:#B0002055; }
  .kpi-neutral { background:linear-gradient(135deg,#f2f4f8,#ffffff); }
  .kpi-good p { color:#0f6a2d; }
  .kpi-warn p { color:#b05800; }
  .kpi-bad p { color:#7a0016; }
  .kpi span.sub { display:block; font-size:11px; margin-top:4px; color:#555; }
  /* Patterns for accessibility */
  .pattern-warn { background-image:repeating-linear-gradient(-45deg, rgba(255,139,0,.18), rgba(255,139,0,.18) 6px, rgba(255,139,0,0) 6px, rgba(255,139,0,0) 12px); }
  .pattern-bad { background-image:repeating-linear-gradient(45deg, rgba(176,0,32,.18), rgba(176,0,32,.18) 6px, rgba(176,0,32,0) 6px, rgba(176,0,32,0) 12px); }
  /* SLO progress bar */
  .slo-wrapper { margin:18px 0 8px; }
  .slo-bar { position:relative; height:20px; background:#eceef1; border-radius:10px; overflow:hidden; }
  .slo-bar .fill { position:absolute; top:0; left:0; bottom:0; background:#1B873F; transition:width .6s; }
  .slo-bar .fill.warn { background:#FF8B00; }
  .slo-bar .fill.bad { background:#B00020; }
  .slo-meta { font-size:12px; margin-top:4px; color:#555; }
  /* Risks panel */
  .risks { display:grid; gap:12px; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); margin:14px 0 6px; }
  .risk { background:var(--card); border:1px solid var(--border); border-radius:8px; padding:10px 12px; font-size:12px; position:relative; }
  .risk.high { border-color:#B00020; box-shadow:0 0 0 2px rgba(176,0,32,.12); }
  .risk.med { border-color:#FF8B00; }
  .risk:before { content:""; position:absolute; width:6px; top:0; left:0; bottom:0; border-radius:8px 0 0 8px; background:#ccc; }
  .risk.high:before { background:#B00020; }
  .risk.med:before { background:#FF8B00; }
  /* Legend tile */
  .legend-tile { position:fixed; top:10px; right:10px; background:#fff; border:1px solid var(--border); border-radius:8px; padding:8px 10px; font-size:11px; box-shadow:0 2px 6px rgba(0,0,0,.12); z-index:999; max-width:160px; }
  .legend-tile h4 { margin:0 0 4px; font-size:11px; text-transform:uppercase; letter-spacing:.5px; }
  .legend-item { display:flex; align-items:center; gap:6px; margin:2px 0; }
  .legend-dot { width:14px; height:14px; border-radius:50%; background:#ccc; border:1px solid #999; position:relative; }
  .legend-dot.good { background:#1B873F; }
  .legend-dot.warn { background:#FF8B00; }
  .legend-dot.bad { background:#B00020; }
  .legend-dot.good.pattern:after { content:"✓"; position:absolute; font-size:10px; color:#fff; top:1px; left:4px; }
  .legend-dot.warn.pattern:after { content:"!"; position:absolute; font-size:11px; color:#fff; top:0; left:5px; }
  .legend-dot.bad.pattern:after { content:"✕"; position:absolute; font-size:10px; color:#fff; top:1px; left:4px; }
  /* Collapsible sections */
  .toggle-btn { background:none; border:1px solid var(--border); border-radius:4px; padding:2px 6px; font-size:11px; cursor:pointer; margin-left:8px; }
  .section-body.collapsed { display:none; }
  /* Export toolbar */
  .export-bar { display:flex; flex-wrap:wrap; gap:8px; margin:10px 0 14px; }
  .export-bar button { background:#111827; color:#fff; border:0; border-radius:6px; padding:6px 12px; font-size:12px; cursor:pointer; display:flex; align-items:center; gap:4px; }
  .export-bar button:hover { background:#1f2937; }
  /* Executive summary alerts */
  .alert { padding:14px 16px; border-radius:8px; border:1px solid var(--border); background:#fff; margin:20px 0 26px; position:relative; }
  .alert:before { content:""; position:absolute; top:0; left:0; bottom:0; width:5px; border-radius:8px 0 0 8px; }
  .alert-good { background:linear-gradient(135deg,#e6f7ed,#ffffff); border-color:#1B873F55; }
  .alert-good:before { background:#1B873F; }
  .alert-warn { background:linear-gradient(135deg,#fff3d4,#ffffff); border-color:#FF8B0055; }
  .alert-warn:before { background:#FF8B00; }
  .alert-bad { background:linear-gradient(135deg,#fde2e0,#ffffff); border-color:#B0002055; }
  .alert-bad:before { background:#B00020; }
  .alert h2 { margin-top:0; margin-bottom:8px; font-size:20px; }
  .status-badge { display:inline-block; font-size:11px; padding:4px 8px; border-radius:14px; font-weight:600; background:#e5e7eb; margin-left:8px; }
  .alert-good .status-badge { background:#1B873F; color:#fff; }
  .alert-warn .status-badge { background:#FF8B00; color:#fff; }
  .alert-bad .status-badge { background:#B00020; color:#fff; }
  .quick-points { margin:0; padding-left:18px; font-size:13px; line-height:1.5; }
  .quick-points li { margin:2px 0 4px; }
  /* Utility spacing classes (replacing former inline styles) */
  .para-summary { margin:6px 0 10px; font-size:14px; }
  .para-hint { margin-top:10px; }
  .slo-heading { margin:0 0 6px; }
  .slo-fill-width[data-w] { width:attr(data-w percentage); }
    table { border-collapse:collapse; width:100%; background:var(--card); border:1px solid var(--border); }
    table th, table td { padding:6px 8px; border:1px solid var(--border); text-align:left; font-size:13px; }
    table th { background:#f3f4f6; font-weight:600; }
    code { background:#eee; padding:2px 4px; border-radius:4px; font-size:12px; }
    .ok { color:var(--ok); font-weight:600; }
    .fail { color:var(--fail); font-weight:600; }
    .warn { color:var(--warn); font-weight:600; }
    .layout-split { display:flex; flex-wrap:wrap; gap:28px; }
  .panel { flex:1 1 320px; min-width:300px; background:var(--card); border:1px solid var(--border); border-radius:8px; padding:16px 18px; box-shadow:0 1px 2px rgba(0,0,0,.04); }
  .panel-wide { flex:2 1 420px; }
  .mt-4 { margin-top:4px; }
  .mt-6 { margin-top:6px; }
  .mt-10 { margin-top:10px; }
    .lat-bar { position:relative; height:38px; margin-top:6px; background:#fff; border:1px solid var(--border); border-radius:6px; }
    .lat-bar .scale { position:relative; height:100%; }
    .lat-bar .tick { position:absolute; top:0; height:100%; font-size:10px; text-align:center; }
    .lat-bar .tick i { display:block; width:2px; height:60%; margin:2px auto 2px; }
    .lat-bar .tick em { font-style:normal; display:block; transform:translate(-50%,0); position:absolute; left:50%; bottom:2px; background:rgba(255,255,255,.7); padding:0 2px; border-radius:2px; }
    footer { margin:60px 0 20px; text-align:center; font-size:12px; color:#666; }
    .flex-row { display:flex; flex-wrap:wrap; gap:20px; align-items:flex-start; }
    .donut { background:var(--card); border:1px solid var(--border); border-radius:8px; padding:10px; text-align:center; }
    .compact { width:auto; min-width:260px; }
    .notes { font-size:12px; line-height:1.5; color:#555; }
    .badge { display:inline-block; padding:2px 6px; font-size:11px; border-radius:4px; background:#e5e7eb; margin-left:6px; }
  /* Benchmark highlighting */
  .cell-good { background:#e6f7ed; }
  .cell-warn { background:#fff7e0; }
  .cell-bad { background:#fdecea; }
  .cell-good td, .cell-warn td, .cell-bad td { transition:background .3s; }
    /* Dynamic latency tick positioning */
    ${latArtifacts.css}
  /* Latency classification colors */
  .lat-bar .lat-good i { background:#1B873F; }
  .lat-bar .lat-warn i { background:#FF8B00; }
  .lat-bar .lat-bad i { background:#B00020; }
  .lat-bar .lat-good em { color:#1B873F; }
  .lat-bar .lat-warn em { color:#FF8B00; }
  .lat-bar .lat-bad em { color:#B00020; }
  .spark { margin-top:4px; display:block; }
  body.dark { --bg:#0f1115; --card:#1b1f24; --border:#30363d; color:#e6edf3; }
  body.dark header { background:#0a0d11; }
  body.dark table th { background:#20262d; }
  body.dark code { background:#30363d; }
  /* Dark mode contrast overrides */
  body.dark .muted { color:#9da5b4; }
  body.dark .notes { color:#c3cbd4; }
  body.dark .kpi { background:var(--card); }
  body.dark .kpi-good { background:linear-gradient(135deg,#12381e,#1b1f24); border-color:#1B873F99; }
  body.dark .kpi-warn { background:linear-gradient(135deg,#3d2a00,#1b1f24); border-color:#FF8B0099; }
  body.dark .kpi-bad { background:linear-gradient(135deg,#3a0a12,#1b1f24); border-color:#B0002099; }
  body.dark .kpi-good p { color:#4ad27a; }
  body.dark .kpi-warn p { color:#ffa54d; }
  body.dark .kpi-bad p { color:#ff6b81; }
  body.dark .alert-good { background:linear-gradient(135deg,#143f24,#1b1f24); }
  body.dark .alert-warn { background:linear-gradient(135deg,#4a3305,#1b1f24); }
  body.dark .alert-bad { background:linear-gradient(135deg,#4a111d,#1b1f24); }
  body.dark .cell-good { background:#12381e !important; }
  body.dark .cell-warn { background:#4a3305 !important; }
  body.dark .cell-bad { background:#4a111d !important; }
  body.dark .legend-tile { background:#1b1f24; border-color:#30363d; }
  body.dark .lat-bar { background:#262b31; }
  body.dark .lat-bar .tick em { background:rgba(0,0,0,.55); color:#e6edf3; }
  body.dark table td, body.dark table th { border-color:#30363d; }
  body.dark .export-bar button { background:#30363d; }
  body.dark .export-bar button:hover { background:#3a424b; }
  body.dark .risk.high { border-color:#ff6b81; box-shadow:0 0 0 2px rgba(255,107,129,.15); }
  body.dark .risk.med { border-color:#ffa54d; }
  body.dark .risk:before { background:#555; }
  body.dark .risk.high:before { background:#ff6b81; }
  body.dark .risk.med:before { background:#ffa54d; }
  body.dark .legend-dot.good { background:#4ad27a; }
  body.dark .legend-dot.warn { background:#ffa54d; }
  body.dark .legend-dot.bad { background:#ff6b81; }
  body.dark .status-badge { filter:brightness(1.1); }
  @media print { #btn-dark-mode,#btn-print,.legend-tile,.export-bar { display:none !important;} body { background:#fff; } }
  </style></head><body${startDark ? ' class=\"dark\"' : ''}>
  <header><h1>Performance Report</h1><small>Generated ${new Date().toISOString()}</small></header>
  <main>
    <div class="alert ${overallClass}" aria-label="Executive Summary">
      <h2>Executive Summary <span class="status-badge">${overallBadgeText}</span></h2>
  <p class="para-summary">${failedThresholdLine}</p>
      <ul class="quick-points">
        <li>${p95Text} (latency focus)</li>
        <li>${successRateText}</li>
        <li>${iterationDur.avg !== undefined ? `Avg iteration ${fmt(iterationDur.avg)} ms` : 'Iteration avg n/a'}${vusVal ? `, VUs ${vusVal}` : ''}</li>
      </ul>
  <p class="muted para-hint">Generated automatically – highlight sections above for at-a-glance health. Use detailed tables below for deeper analysis.</p>
    </div>
    <div class="legend-tile" aria-label="Legend"><h4>Legend</h4><div class="legend-item"><span class="legend-dot good pattern"></span>Good</div><div class="legend-item"><span class="legend-dot warn pattern"></span>Attention</div><div class="legend-item"><span class="legend-dot bad pattern"></span>Action Needed</div></div>

  ${p95Progress !== null ? `<div class="slo-wrapper"><h3 class="slo-heading">SLO Progress (p95)</h3><div class="slo-bar" aria-label="p95 latency progress bar"><div class="fill ${p95Progress > 100 ? 'bad' : p95Progress > 80 ? 'warn' : ''}" data-width="${Math.min(100, p95Progress).toFixed(1)}" style="width:${Math.min(100, p95Progress).toFixed(1)}%"></div></div><div class="slo-meta">${p95Val ? fmt(p95Val) : 'n/a'} ms of target ${p95Target} ms &mdash; ${(p95Target - p95Val).toFixed(2)} ms headroom</div></div>` : ''}

    <h3>Plain Language Narrative</h3>
    <div class="notes" id="narrative"><p>${narrative}</p></div>

    <h3>Top Risks</h3>
    ${topRisks.length ? `<div class="risks">${topRisks.map(r => `<div class="risk ${r.level === 'high' ? 'high pattern-bad' : 'med pattern-warn'}">${r.level === 'high' ? '⚠️' : '❕'} ${r.msg}</div>`).join('')}</div>` : '<div class="notes"><em>No major risks detected.</em></div>'}

    <h3>Recommended Actions</h3>
    <div class="notes"><ul>${recommendations.map(r => `<li>${r}</li>`).join('')}</ul></div>

    <div class="export-bar" aria-label="Export and share tools">
      <button id="btn-copy-summary" type="button">📋 Copy Summary</button>
      <button id="btn-export-json" type="button">💾 Export JSON</button>
      <button id="btn-export-bench" type="button">📈 Export Benchmarks CSV</button>
      <button id="btn-print" type="button">🖨️ PDF/Print</button>
      <button id="btn-dark-mode" type="button">🌙 Dark</button>
    </div>
    <h2>Key Performance Indicators</h2>
    <div class="grid">
      <div class="kpi ${neutralKpi}"><h4>Total Requests</h4><p>${fmtInt(reqs.count)}</p><div class="muted">Rate: ${fmt(reqs.rate || 0, 2)} /s</div></div>
      <div class="kpi ${successKpiClass}"><h4>Success Rate</h4><p>${fmt(successRate, 2)}%</p><div class="muted">Fail ${(failedRate * 100).toFixed(2)}%</div></div>
  <div class="kpi ${durationKpiClass}"><h4>Avg Duration (ms)</h4><p>${fmt(dur.avg)}</p><div class="muted">p95 ${fmt(dur['p(95)'])}</div>${latencySpark}</div>
      <div class="kpi ${maxDurKpiClass}"><h4>Max Duration (ms)</h4><p>${fmt(dur.max)}</p><div class="muted">Min ${fmt(dur.min)}</div></div>
      <div class="kpi ${neutralKpi}"><h4>Data In</h4><p>${fmtBytes(dataRecv)}</p><div class="muted">Raw: ${fmtInt(dataRecv)} B</div></div>
      <div class="kpi ${neutralKpi}"><h4>Data Out</h4><p>${fmtBytes(dataSent)}</p><div class="muted">Raw: ${fmtInt(dataSent)} B</div></div>
      <div class="kpi ${neutralKpi}"><h4>Iterations</h4><p>${fmtInt(safe(metrics, 'iterations.values.count', 0))}</p><div class="muted">Avg Iter (ms) ${fmt(iterationDur.avg)}</div></div>
      <div class="kpi ${neutralKpi}"><h4>VUs</h4><p>${vusVal}</p><div class="muted">Test Length ${fmt(testDurationSeconds, 2)} s</div></div>
    </div>

    <h2>Success vs Failure</h2>
    <div class="flex-row">
      <div class="donut">${donut}<div class="muted mt-4">Checks: ${checks.passes || 0} pass / ${checks.fails || 0} fail</div></div>
      <div class="panel panel-wide">
        <h3>Latency Distribution (Markers)</h3>
        <div class="muted">Markers show relative position of key percentiles.</div>
        ${latBar}
        <div class="mt-10">${latencyTable}</div>
      </div>
    </div>

  <h2>Thresholds <button class="toggle-btn" data-target="sec-thresholds">Toggle</button></h2>
  <div id="sec-thresholds" class="section-body">${thresholds}</div>

    <div class="notes" aria-label="Thresholds explanation">
      <p><strong>What are thresholds?</strong> They are pre-defined pass/fail rules that describe the minimum acceptable performance or reliability. Example: <code>http_req_duration p(95)<3000</code> means “95% of all request durations must be below 3000&nbsp;ms”.</p>
      <p><strong>How to read the table:</strong> Each row shows (1) the metric we watched, (2) the rule (threshold) we set before the test started, and (3) whether the live results satisfied that rule (PASS) or not (FAIL).</p>
      <p><strong>Why it matters:</strong> A FAIL doesn’t always mean an outage, but it signals a potential risk or unmet service expectation (e.g. slower user experience or too many errors). Revisit failed thresholds by checking logs, slow endpoints, or adjusting unrealistic rules. Over time, refine thresholds so they align with your business Service Level Objectives (SLOs).</p>
    </div>

  ${thresholdsBenchmarks.html ? `<h3>Threshold Benchmarks (Actual vs Target) <button class="toggle-btn" data-target="sec-bench">Toggle</button></h3><div id="sec-bench" class="section-body">${thresholdsBenchmarks.html}<div class="notes"><p><strong>Actual</strong> is what the test measured; <strong>Target</strong> is the rule; <strong>Delta</strong> shows headroom (positive) or deficit (negative) relative to target.</p></div></div>` : ''}

  <h3>Baseline</h3>
  <div id="baseline-comparison" class="section-body">${baselineHtml}</div>

    <h2>All Metrics (Raw Statistics) <button class="toggle-btn" data-target="sec-all-metrics">Toggle</button></h2>
    <div class="panel mt-6 section-body" id="sec-all-metrics">
      <p class="notes">Every metric collected during the run with its available statistics. Trend metrics expose percentiles (p(90), p(95), etc.), counters expose counts and derived rates, gauges expose the latest <code>value</code>, and rates show success ratios.</p>
      ${allMetricsTable}
    </div>

    <h2>Endpoint / Group Breakdown <button class="toggle-btn" data-target="sec-groups">Toggle</button></h2>
    <div id="sec-groups" class="panel section-body">${typeof groupBreakdown!=='undefined'?groupBreakdown:'<div class=\"notes\"><em>Group breakdown unavailable.</em></div>'}</div>

    <h2>Error Samples <button class="toggle-btn" data-target="sec-error-samples">Toggle</button></h2>
    <div id="sec-error-samples" class="panel section-body">${(data.errorSamples && data.errorSamples.length) ? `<table class=\"compact\"><thead><tr><th>Status</th><th>Endpoint</th><th>Method</th><th>Snippet</th></tr></thead><tbody>${data.errorSamples.map(s=>`<tr><td>${s.status}</td><td>${s.endpoint||''}</td><td>${s.method||''}</td><td><code>${(s.body||'').replace(/`/g,'&#96;')}</code></td></tr>`).join('')}</tbody></table><div class=\"notes\"><em>Showing up to ${(data.errorSamples||[]).length} captured failures (limit).</em></div>` : '<div class="notes"><em>No error samples captured.</em></div>'}</div>

    <h2>Top Failing Endpoints</h2>
    <div class="panel">${(data.topFailingEndpoints && data.topFailingEndpoints.length) ? `<table class=\"compact\"><thead><tr><th>Endpoint</th><th>Failures</th></tr></thead><tbody>${data.topFailingEndpoints.map(e=>`<tr><td>${e.endpoint}</td><td>${e.count}</td></tr>`).join('')}</tbody></table>` : '<div class="notes"><em>No failing endpoints recorded.</em></div>'}</div>

    <h2>Environment / Metadata</h2>
    <table class="compact"><tbody>
      <tr><th>Environment</th><td>${safe(data, 'setup_data.configEnvironment', 'n/a')}</td></tr>
      <tr><th>Use Data File Config</th><td>${safe(data, 'setup_data.useDataFileConfig', 'n/a')}</td></tr>
      <tr><th>Duration (s)</th><td>${fmt(testDurationSeconds, 2)}</td></tr>
      <tr><th>Summary Stats</th><td>${(safe(data, 'options.summaryTrendStats', []) || []).join(', ')}</td></tr>
    </tbody></table>

    <h2>Notes & Next Steps</h2>
    <div class="notes">
      <ul>
        <li>Integrate with InfluxDB/Prometheus + Grafana for per-endpoint & time-series exploration.</li>
        <li>Add request labeling (name tags) and export raw metrics for finer granularity.</li>
        <li>Track error bodies and correlation IDs to accelerate root cause analysis.</li>
        <li>Introduce comparison mode (baseline vs current) in CI.</li>
      </ul>
    </div>
    <footer>Generated by custom k6 report generator &middot; ${new Date().getFullYear()}</footer>
    <script>
    (function(){
      const payload = {
        generated: new Date().toISOString(),
        successRate: ${fmt(successRate,2)},
        p95: ${p95Val !== undefined ? JSON.stringify(p95Val) : 'null'},
        p95Target: ${p95Target !== null ? JSON.stringify(p95Target) : 'null'},
        thresholdsFailed: ${thresholdSummary.failed},
        thresholdsTotal: ${thresholdSummary.total},
        benchmarks: ${JSON.stringify(thresholdsBenchmarks.rows || [])},
        classificationThresholds: ${typeof THRESH!=='undefined'?JSON.stringify(THRESH):'{}'}
      };
      window.__reportPayload__ = payload;
      function download(filename, text){ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([text],{type:'text/plain'})); a.download=filename; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),500); }
      function toCsv(rows){
        if(!rows.length) return 'metric,rule,actual,target,delta,status';
        const header='metric,rule,actual,target,delta,status';
        const body=rows.map(r=>[r.metricName,r.rule,r.actual,r.target,r.delta,r.ok?'PASS':'FAIL'].join(','));
        return [header,...body].join(String.fromCharCode(10));
      }
      const copyBtn=document.getElementById('btn-copy-summary');
      if(copyBtn) copyBtn.addEventListener('click',()=>{ const text=document.getElementById('narrative')?.innerText||'Summary unavailable'; navigator.clipboard.writeText(text).then(()=>{ copyBtn.textContent='✅ Copied'; setTimeout(()=>copyBtn.textContent='📋 Copy Summary',2000); }); });
      const jsonBtn=document.getElementById('btn-export-json');
      if(jsonBtn) jsonBtn.addEventListener('click',()=> download('report-summary.json', JSON.stringify(payload,null,2)) );
      const benchBtn=document.getElementById('btn-export-bench');
      if(benchBtn) benchBtn.addEventListener('click',()=> download('benchmarks.csv', toCsv(payload.benchmarks||[])) );
      const printBtn=document.getElementById('btn-print'); if(printBtn) printBtn.addEventListener('click',()=> window.print());
      const darkBtn=document.getElementById('btn-dark-mode');
      if(darkBtn){
        darkBtn.textContent=document.body.classList.contains('dark')?'☀️ Light':'🌙 Dark';
        darkBtn.addEventListener('click',()=>{
          document.body.classList.toggle('dark');
          darkBtn.textContent=document.body.classList.contains('dark')?'☀️ Light':'🌙 Dark';
        });
      }
      document.querySelectorAll('.toggle-btn').forEach(btn=>{ btn.addEventListener('click',()=>{ const id=btn.getAttribute('data-target'); const el=document.getElementById(id); if(!el)return; el.classList.toggle('collapsed'); btn.textContent = el.classList.contains('collapsed')? 'Expand' : 'Toggle'; }); });
    })();
    </script>
  </main></body></html>`;
}

export default generateHtmlReport;
