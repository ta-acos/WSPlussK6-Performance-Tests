/**
 * ===================================================================
 * HTML REPORT GENERATOR MODULE
 * ===================================================================
 *
 * @author Senthilkumar Sengottuvel
 *
 * WHAT THIS MODULE DOES:
 * This module generates comprehensive, self-contained HTML reports from K6 test results.
 * It transforms raw performance data into visually appealing, stakeholder-friendly
 * reports with charts, graphs, and detailed analysis.
 *
 * MAIN CAPABILITIES:
 *
 * 1. 📊 VISUAL REPORT GENERATION:
 *    - Creates self-contained HTML files with embedded CSS and JavaScript
 *    - Generates charts and graphs for performance visualization
 *    - Includes donut charts for success/failure rates
 *    - Responsive design that works on all devices
 *
 * 2. 📈 PERFORMANCE ANALYSIS:
 *    - Calculates key performance indicators (KPIs)
 *    - Analyzes response time percentiles and trends
 *    - Evaluates threshold compliance and failure rates
 *    - Provides performance summaries and recommendations
 *
 * 3. 🎯 STAKEHOLDER FOCUSED:
 *    - Non-technical summaries for business stakeholders
 *    - Executive dashboard with high-level metrics
 *    - Color-coded status indicators (green/yellow/red)
 *    - Easy-to-understand performance interpretations
 *
 * 4. 🔍 DETAILED TECHNICAL DATA:
 *    - Raw metric statistics for technical analysis
 *    - Error breakdown and categorization
 *    - Request/response details and timing data
 *    - Threshold evaluation and compliance reporting
 *
 * 5. 📋 COMPREHENSIVE REPORTING:
 *    - Test configuration and environment details
 *    - User load patterns and scenario information
 *    - Error analysis and troubleshooting guidance
 *    - Historical trend analysis (when baseline data available)
 *
 * WHY THIS MODULE EXISTS:
 * K6's default output is technical and hard for non-technical stakeholders
 * to understand. This module creates business-friendly reports that clearly
 * communicate performance results and their implications.
 *
 * EXAMPLE USAGE:
 * ```javascript
 * import { generateHtmlReport } from '../utils/report-generator.js';
 *
 * export function handleSummary(data) {
 *   const html = generateHtmlReport(data, { apdexT: 500 });
 *   return { 'report.html': html };
 * }
 * ```
 */

// ========================================
// UTILITY FUNCTIONS FOR DATA FORMATTING
// ========================================

/**
 * Format numeric values with specified decimal places
 * Handles null, undefined, and NaN values gracefully
 * @param {number} num - Number to format
 * @param {number} digits - Number of decimal places (default: 2)
 * @returns {string} Formatted number string
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
  const fr = 100 - sr; // failure rate
  const radius = 42;
  const circ = 2 * Math.PI * radius;
  const successStroke = (sr / 100) * circ;
  const failureStroke = (fr / 100) * circ;

  // Only render failure ring if there are actual failures (avoid red dot at 100%)
  const failureRing =
    fr > 0
      ? `
    <!-- Failure ring (red) - starts where success ends -->
    <circle cx="55" cy="55" r="42" fill="none" stroke="#DC3545" stroke-width="14" 
            stroke-dasharray="${failureStroke} ${circ - failureStroke}" 
            stroke-linecap="round" 
            transform="rotate(${-90 + (sr / 100) * 360} 55 55)" />`
      : '';

  return `<svg width="110" height="110" viewBox="0 0 110 110" role="img" aria-label="Success/Failure Donut">
    <circle cx="55" cy="55" r="42" fill="none" stroke="#eee" stroke-width="14" />
    <!-- Success ring (green) -->
    <circle cx="55" cy="55" r="42" fill="none" stroke="#1B873F" stroke-width="14" 
            stroke-dasharray="${successStroke} ${circ - successStroke}" 
            stroke-linecap="round" transform="rotate(-90 55 55)" />${failureRing}
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
        rows.push({
          metricName,
          rule: primary,
          stat: 'n/a',
          target: 'n/a',
          actual: 'n/a',
          delta: 'n/a',
          ok: !!status.ok,
          cls: ''
        });
        return;
      }
      const op = match[0];
      const parts = primary.split(op);
      const left = parts[0].trim();
      const rightRaw = (parts[1] || '').trim();
      const target = parseFloat(rightRaw);
      const statKey = left;
      const actual =
        values[statKey] !== undefined
          ? values[statKey]
          : values[left] !== undefined
            ? values[left]
            : undefined;
      let deltaDisplay = 'n/a';
      let improvement = null;
      let pct = null;
      if (actual !== undefined && !isNaN(actual) && !isNaN(target)) {
        if (op === '<' || op === '<=') improvement = target - actual;
        else if (op === '>' || op === '>=') improvement = actual - target;
        else if (op === '==') improvement = target - actual;
        pct = target !== 0 ? (improvement / target) * 100 : 0;
        const sign = improvement > 0 ? '+' : improvement < 0 ? '' : '';
        deltaDisplay = `${sign}${improvement.toFixed(2)} (${sign}${pct.toFixed(1)}%)`;
      }
      let severityClass = '';
      if (improvement !== null) {
        if (!status.ok) severityClass = 'cell-bad';
        else if (pct >= 10) severityClass = 'cell-good';
        else if (pct >= 0) severityClass = 'cell-warn';
        else severityClass = 'cell-bad';
      } else if (!status.ok) severityClass = 'cell-bad';
      rows.push({
        metricName,
        rule: primary,
        stat: statKey,
        target: isNaN(target) ? rightRaw : target,
        actual:
          actual !== undefined && !isNaN(actual)
            ? statKey.includes('rate')
              ? actual
              : actual.toFixed(2)
            : 'n/a',
        delta: deltaDisplay,
        ok: !!status.ok,
        cls: severityClass
      });
    });
  });
  if (!rows.length) return { html: '', rows: [] };
  const html = `<table class="compact" id="benchmarks-table"><thead><tr><th>Metric</th><th>Rule</th><th>Actual</th><th>Target</th><th>Delta vs Target</th><th>Status</th></tr></thead><tbody>${rows.map((r) => `<tr class="${r.cls}"><td>${r.metricName}</td><td><code>${r.rule}</code></td><td>${r.actual}</td><td>${r.target}</td><td class="${r.cls}">${r.delta}</td><td class="${r.ok ? 'cell-good' : 'cell-bad'}">${r.ok ? '<span class="ok">PASS</span>' : '<span class="fail">FAIL</span>'}</td></tr>`).join('')}</tbody></table>`;
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
      const isLatencyMetric =
        /duration|http_req_(duration|waiting|blocked|connecting|tls_handshaking|sending|receiving)/.test(
          name
        );
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

  const legend = `<div class="notes legend"><strong>Legend:</strong> <span class="legend-box cell-good">✓ Good</span> <span class="legend-box cell-warn">⚠ Watch</span> <span class="legend-box cell-bad">✗ Investigate</span><br><strong style="margin-top:8px; display:inline-block;">Color Meanings:</strong><br>• <strong style="color:#1B873F;">Green (Good):</strong> Performance is within acceptable limits<br>• <strong style="color:#FF8B00;">Yellow (Watch):</strong> Performance is degraded but acceptable - monitor closely, may need optimization soon<br>• <strong style="color:#B00020;">Red (Investigate):</strong> Performance is poor - requires immediate attention and optimization<br><strong style="margin-top:8px; display:inline-block;">Thresholds:</strong> Response time p(95) ≤ 800ms (good) / ≤ 2000ms (watch) / > 2000ms (investigate); HTTP errors ≤1% / ≤5% / >5%; Check failures 0 / ≤2% / >2%</div>`;

  return `${legend}<table class="compact"><thead><tr><th>Metric</th>${ordered
    .map((k) => `<th>${k}</th>`)
    .join('')}</tr></thead><tbody>${rows}</tbody></table>`;
}

export function generateHtmlReport(data, options = {}) {
  const env = (typeof __ENV !== 'undefined' && __ENV) || {};
  const cfg = options.thresholds || {};
  const verboseLogs = options.verboseLogs || null; // NEW: Accept verbose logs
  // Initial dark mode preference: default true if not explicitly set to false
  const startDark = (function () {
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
  const checks = safe(metrics, 'checks.values', {});

  // Calculate overall success rate based on checks (includes HTTP + thresholds)
  // This provides a complete picture: HTTP success + performance thresholds
  const totalChecks = (checks.passes || 0) + (checks.fails || 0);
  const checkSuccessRate = totalChecks > 0 ? ((checks.passes || 0) / totalChecks) * 100 : 100;

  // Use check success rate for donut - shows both HTTP success AND threshold compliance
  // Red portion = any failures (HTTP errors OR slow responses)
  const successRate = checkSuccessRate;
  const dataRecv = safe(metrics, 'data_received.values.count', 0);
  const dataSent = safe(metrics, 'data_sent.values.count', 0);
  const iterationDur = safe(metrics, 'iteration_duration.values', {});
  // Use vus_max to show the maximum VUs that ran during the test, not the current value at report time
  const vusVal = safe(metrics, 'vus_max.values.max', safe(metrics, 'vus_max.values.value', safe(metrics, 'vus.values.max', 'n/a')));
  const testDurationSeconds = safe(data, 'state.testRunDurationMs', 0) / 1000;

  // KPI severity classification
  const p95Latency = dur['p(95)'];
  const successKpiClass =
    successRate >= THRESH.KPI_SUCCESS_GOOD
      ? 'kpi-good'
      : successRate >= THRESH.KPI_SUCCESS_WARN
        ? 'kpi-warn'
        : 'kpi-bad';
  const durationKpiClass =
    typeof p95Latency === 'number'
      ? p95Latency <= 800
        ? 'kpi-good'
        : p95Latency <= 2000
          ? 'kpi-warn'
          : 'kpi-bad'
      : 'kpi-neutral';
  const maxDurKpiClass = durationKpiClass; // reuse same classification for max duration for simplicity
  const neutralKpi = 'kpi-neutral';

  // Generate explanatory text for why metrics have specific colors
  function getColorExplanation(metricType, value, className, extraData = {}) {
    if (className === 'kpi-neutral' || className === 'kpi-good') return '';

    const explanations = {
      'overall-warn': `<div class="color-reason" style="margin-top:8px; padding:8px; background:#fff3d4; border-left:3px solid #FF8B00; border-radius:4px; font-size:0.85em;"><strong>⚠ Why Yellow (Watch)?</strong><br>${extraData.failed} out of ${extraData.total} performance thresholds failed (${fmt((extraData.failed / extraData.total) * 100, 0)}% failure rate, less than 30%). <strong>Ideal:</strong> 0% failures<br>Some performance goals were not met. Review the failed thresholds below and consider optimizations. <strong>Action:</strong> Check "Thresholds (Pass/Fail)" section for specific failures.</div>`,
      'overall-bad': `<div class="color-reason" style="margin-top:8px; padding:8px; background:#fde2e0; border-left:3px solid #B00020; border-radius:4px; font-size:0.85em;"><strong>✗ Why Red (Investigate)?</strong><br>${extraData.failed} out of ${extraData.total} performance thresholds failed (${fmt((extraData.failed / extraData.total) * 100, 0)}% failure rate, 30% or more). <strong>Ideal:</strong> 0% failures<br>Critical: Many performance goals were not met. <strong>Action required:</strong> Review all failed thresholds in the "Thresholds (Pass/Fail)" section, prioritize fixing the most critical ones (response time and error rates first), and re-test after optimizations.</div>`,
      'success-warn': `<div class="color-reason" style="margin-top:8px; padding:8px; background:#fff3d4; border-left:3px solid #FF8B00; border-radius:4px; font-size:0.85em;"><strong>⚠ Why Yellow (Watch)?</strong><br>Success rate is ${fmt(value, 2)}% (between 95-99%). <strong>Ideal:</strong> ≥99%<br>This is acceptable but below optimal. Consider investigating occasional failures to improve reliability.</div>`,
      'success-bad': `<div class="color-reason" style="margin-top:8px; padding:8px; background:#fde2e0; border-left:3px solid #B00020; border-radius:4px; font-size:0.85em;"><strong>✗ Why Red (Investigate)?</strong><br>Success rate is ${fmt(value, 2)}% (below 95%). <strong>Ideal:</strong> ≥99%<br>This indicates significant failures. <strong>Action required:</strong> Check error logs, validate API endpoints, review authentication, and verify server capacity.</div>`,
      'duration-warn': `<div class="color-reason" style="margin-top:8px; padding:8px; background:#fff3d4; border-left:3px solid #FF8B00; border-radius:4px; font-size:0.85em;"><strong>⚠ Why Yellow (Watch)?</strong><br>p95 latency is ${fmt(value)}ms (between 800-2000ms). <strong>Ideal:</strong> &lt;800ms<br>Responses are slower than ideal. <strong>Consider:</strong> Optimizing database queries, adding caching, or reviewing API logic.</div>`,
      'duration-bad': `<div class="color-reason" style="margin-top:8px; padding:8px; background:#fde2e0; border-left:3px solid #B00020; border-radius:4px; font-size:0.85em;"><strong>✗ Why Red (Investigate)?</strong><br>p95 latency is ${fmt(value)}ms (above 2000ms). <strong>Ideal:</strong> &lt;800ms<br>Responses are unacceptably slow. <strong>Action required:</strong> Profile slow endpoints, check database performance, review external API calls, verify server resources (CPU/memory), and consider load balancing.</div>`,
      'maxduration-warn': `<div class="color-reason" style="margin-top:8px; padding:8px; background:#fff3d4; border-left:3px solid #FF8B00; border-radius:4px; font-size:0.85em;"><strong>⚠ Why Yellow (Watch)?</strong><br>Max duration is ${fmt(value)}ms (between 800-2000ms). <strong>Ideal:</strong> &lt;800ms<br>Some requests are taking longer than ideal. This could indicate occasional slow queries or resource contention. <strong>Consider:</strong> Identifying the slowest endpoints and optimizing them.</div>`,
      'maxduration-bad': `<div class="color-reason" style="margin-top:8px; padding:8px; background:#fde2e0; border-left:3px solid #B00020; border-radius:4px; font-size:0.85em;"><strong>✗ Why Red (Investigate)?</strong><br>Max duration is ${fmt(value)}ms (above 2000ms). <strong>Ideal:</strong> &lt;800ms<br>At least one request took unacceptably long. <strong>Action required:</strong> Review the slowest endpoints (check logs for timeouts), investigate database locks, check for memory issues, and consider query optimization or adding timeouts.</div>`
    };

    const key = `${metricType}-${className.replace('kpi-', '')}`;
    return explanations[key] || '';
  }

  const successExplanation = getColorExplanation('success', successRate, successKpiClass);
  const durationExplanation = getColorExplanation('duration', p95Latency, durationKpiClass);
  const maxDurationExplanation = getColorExplanation('maxduration', dur.max, maxDurKpiClass);

  const donut = buildDonut(successRate);
  const latArtifacts = latencyBar(dur.min, dur.med, dur['p(90)'], dur['p(95)'], dur.max, THRESH);
  function spark(d) {
    if (!d || !d['p(95)']) return '';
    const pts = [d.med || d['p(50)'], d['p(75)'], d['p(90)'], d['p(95)'], d.max].filter(
      (v) => typeof v === 'number'
    );
    if (pts.length < 3) return '';
    const mx = Math.max(...pts),
      mn = Math.min(...pts),
      rg = mx - mn || 1,
      w = 120,
      h = 34,
      step = w / (pts.length - 1);
    const path = pts
      .map((v, i) => {
        const y = h - ((v - mn) / rg) * (h - 4) - 2;
        const x = i * step;
        return (i ? 'L' : 'M') + x + ',' + y;
      })
      .join(' ');
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

  const overallStatus =
    thresholdSummary.failed > 0
      ? thresholdSummary.failed / (thresholdSummary.total || 1) > 0.3
        ? 'bad'
        : 'warn'
      : 'good';
  const overallBadgeText =
    overallStatus === 'good' ? 'Healthy' : overallStatus === 'warn' ? 'Attention' : 'Action Needed';
  const overallClass =
    overallStatus === 'good' ? 'alert-good' : overallStatus === 'warn' ? 'alert-warn' : 'alert-bad';
  const overallKpiClass =
    overallStatus === 'good' ? 'kpi-good' : overallStatus === 'warn' ? 'kpi-warn' : 'kpi-bad';
  const p95Text = dur['p(95)'] !== undefined ? `${fmt(dur['p(95)'])} ms p95` : 'p95 n/a';
  const successRateText = `${fmt(successRate, 2)}% success (${fmt(100 - successRate, 2)}% fail)`;
  const failedThresholdLine = thresholdSummary.total
    ? thresholdSummary.failed === 0
      ? 'All thresholds passed.'
      : `${thresholdSummary.failed}/${thresholdSummary.total} thresholds failed${thresholdSummary.failedItems.length ? ': ' + thresholdSummary.failedItems.join('; ') + (thresholdSummary.failed > thresholdSummary.failedItems.length ? '…' : '') : ''}`
    : 'No thresholds defined.';

  // Generate explanation for Overall Test Status
  const overallExplanation = getColorExplanation('overall', thresholdSummary.failed, overallKpiClass, {
    failed: thresholdSummary.failed,
    total: thresholdSummary.total
  });

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
  if (p95Val && p95Val > (p95Target || 2000))
    risks.push({
      level: 'high',
      msg: `High p95 latency ${fmt(p95Val)} ms${p95Target ? ' (target ' + p95Target + ' ms)' : ''}`
    });
  if (failedRate > 0.05)
    risks.push({ level: 'high', msg: `Error rate ${(failedRate * 100).toFixed(2)}% above 5%` });
  else if (failedRate > 0.01)
    risks.push({ level: 'med', msg: `Error rate ${(failedRate * 100).toFixed(2)}% above 1%` });
  if (checks.fails) risks.push({ level: 'med', msg: `${checks.fails} check failure(s)` });
  if (thresholdSummary.failed)
    risks.push({ level: 'med', msg: `${thresholdSummary.failed} failing threshold(s)` });
  const topRisks = risks.slice(0, 3);

  // Narrative & recommendations
  function buildNarrative() {
    const parts = [];
    parts.push(
      `Test achieved a ${fmt(successRate, 2)}% success rate with p95 latency ${p95Val ? fmt(p95Val) + ' ms' : 'n/a'}.`
    );
    if (thresholdSummary.failed === 0 && risks.length === 0)
      parts.push('All monitored objectives were met with no notable performance risks.');
    else
      parts.push(
        `${thresholdSummary.failed} of ${thresholdSummary.total || 0} thresholds failed; ${risks.length ? 'key risks identified below' : 'review threshold definitions'}.`
      );
    return parts.join(' ');
  }
  // Stakeholder-friendly threshold explanations
  function explainThresholds() {
    if (!thresholdSummary.failedItems || thresholdSummary.failedItems.length === 0) {
      return '<div class="alert alert-good"><strong>✅ All Performance Targets Met!</strong><p>The application performed within acceptable limits for all measured criteria.</p></div>';
    }

    const explanations = [];
    explanations.push('<div class="alert alert-bad">');
    explanations.push('<strong>⚠️ Performance Targets Not Met</strong>');
    explanations.push(
      "<p>Some performance thresholds were exceeded. Here's what this means in simple terms:</p>"
    );
    explanations.push('<div class="threshold-explanations">');

    thresholdSummary.failedItems.forEach((item) => {
      // Parse threshold like "http_req_duration :: p(95)<2000"
      const parts = item.split('::').map((s) => s.trim());
      const metric = parts[0];
      const condition = parts[1] || '';

      let explanation = '';
      let impact = '';
      let action = '';

      if (metric === 'http_req_duration' && condition.includes('p(95)')) {
        const match = condition.match(/p\(95\)\s*<\s*(\d+)/);
        const targetMs = match ? match[1] : 'N/A';
        const actualMs = dur['p(95)'] ? Math.round(dur['p(95)']) : 'N/A';

        explanation = `<strong>Response Time (95th Percentile)</strong>: Target was ${targetMs}ms, but 95% of requests took ${actualMs}ms or less.`;
        impact = `This means <strong>5% of requests</strong> took longer than ${actualMs}ms. Users may experience slower page loads or delays.`;
        action = `<em>Action:</em> Investigate slow API endpoints, database queries, or external service calls that are causing delays.`;
      } else if (metric === 'iteration_duration' && condition.includes('p(95)')) {
        const match = condition.match(/p\(95\)\s*<\s*(\d+)/);
        // const targetMs = match ? match[1] : 'N/A'; // TODO: Use for detailed metrics
        const targetSec = match ? (parseInt(match[1]) / 1000).toFixed(1) : 'N/A';
        // const actualMs = iterationDur['p(95)'] ? Math.round(iterationDur['p(95)']) : 'N/A'; // TODO: Use for detailed metrics
        const actualSec = iterationDur['p(95)'] ? (iterationDur['p(95)'] / 1000).toFixed(1) : 'N/A';

        explanation = `<strong>Complete Test Iteration Time</strong>: Target was ${targetSec} seconds, but 95% of iterations took ${actualSec} seconds or less.`;
        impact = `This measures the <strong>total time</strong> to complete all operations in a test scenario (creating cases, journal posts, uploading documents, etc.).`;
        action = `<em>Action:</em> Break down which specific operations are slow. Check document upload times, API response times, and network latency.`;
      } else if (metric.includes('http_req_failed')) {
        explanation = `<strong>HTTP Request Failures</strong>: More requests failed than the acceptable threshold.`;
        impact = `Failed requests indicate errors, timeouts, or service unavailability.`;
        action = `<em>Action:</em> Review error logs, check server capacity, and verify API endpoint availability.`;
      } else if (metric.includes('http_reqs')) {
        explanation = `<strong>Request Rate</strong>: The number of requests per second didn't meet expectations.`;
        impact = `This may indicate throughput limitations or performance bottlenecks.`;
        action = `<em>Action:</em> Check server capacity, connection pooling, and network bandwidth.`;
      } else {
        // Generic explanation
        explanation = `<strong>${metric}</strong>: ${condition}`;
        impact = `Performance metric exceeded acceptable threshold.`;
        action = `<em>Action:</em> Review detailed metrics below to identify the root cause.`;
      }

      explanations.push(`
        <div class="threshold-item">
          <div class="threshold-metric">${explanation}</div>
          <div class="threshold-impact">${impact}</div>
          <div class="threshold-action">${action}</div>
        </div>
      `);
    });

    explanations.push('</div>'); // close threshold-explanations
    explanations.push('<p class="threshold-summary"><strong>📊 Overall Impact:</strong> ');

    if (thresholdSummary.failed === 1) {
      explanations.push(
        'One performance target was not met. This requires attention but may not be critical.'
      );
    } else if (thresholdSummary.failed === 2) {
      explanations.push('Two performance targets were not met. Performance optimization is recommended.');
    } else {
      explanations.push(
        `${thresholdSummary.failed} performance targets were not met. Immediate performance optimization is strongly recommended.`
      );
    }

    explanations.push('</p></div>');

    return explanations.join('\n');
  }

  function buildRecommendations() {
    const recs = [];
    if (p95Target && p95Val && p95Val > p95Target)
      recs.push(
        'Investigate slow endpoints contributing to p95 latency; profile DB calls or external dependencies.'
      );
    if (failedRate > 0.01)
      recs.push('Analyze failed request samples (enable HTTP debug logging or trace IDs).');
    if (checks.fails)
      recs.push('Review failing functional checks for correctness vs environment configuration.');
    if (!recs.length)
      recs.push(
        'No immediate action required. Continue monitoring and consider setting stricter SLOs as confidence grows.'
      );
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
      if (p95Val && bP95)
        rows.push({
          label: 'p95 Latency (ms)',
          current: fmt(p95Val),
          baseline: fmt(bP95),
          delta: (p95Val - bP95).toFixed(2),
          better: p95Val < bP95
        });
      rows.push({
        label: 'Success Rate (%)',
        current: fmt(successRate, 2),
        baseline: fmt(bSuccess, 2),
        delta: (successRate - bSuccess).toFixed(2),
        better: successRate > bSuccess
      });
      if (rows.length) {
        baselineHtml = `<h3>Baseline Comparison</h3><table class="compact" id="baseline-table"><thead><tr><th>Metric</th><th>Current</th><th>Baseline</th><th>Delta</th><th>Direction</th></tr></thead><tbody>${rows.map((r) => `<tr class="${r.better ? 'cell-good' : 'cell-warn'}"><td>${r.label}</td><td>${r.current}</td><td>${r.baseline}</td><td>${r.delta}</td><td>${r.better ? 'Improved' : 'Regressed'}</td></tr>`).join('')}</tbody></table>`;
      }
    } else {
      baselineHtml =
        '<div class="notes"><em>No baseline provided. Supply a previous summary JSON as data.baseline to enable comparison.</em></div>';
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

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" />
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
  /* Dark mode styles for explanation boxes */
  body.dark .kpi-warn .color-reason { background:#4a3305 !important; border-left-color:#ffa54d !important; color:#e6edf3 !important; }
  body.dark .kpi-bad .color-reason { background:#4a111d !important; border-left-color:#ff6b81 !important; color:#e6edf3 !important; }
  body.dark .color-reason strong { color:#ffa54d !important; }
  body.dark .kpi-bad .color-reason strong { color:#ff6b81 !important; }
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
  /* Threshold explanations */
  .threshold-explanations { margin-top:16px; }
  .threshold-item { margin-bottom:20px; padding:12px; background:rgba(255,255,255,0.05); border-left:4px solid #FF8B00; border-radius:4px; }
  .threshold-metric { font-weight:600; margin-bottom:8px; color:#1a73e8; }
  .threshold-impact { margin-bottom:8px; line-height:1.6; }
  .threshold-action { font-style:italic; color:#666; }
  .threshold-summary { margin-top:16px; font-weight:500; padding:12px; background:rgba(255,235,59,0.1); border-radius:4px; }
  body.dark .threshold-item { background:rgba(255,255,255,0.03); border-left-color:#ffa54d; }
  body.dark .threshold-metric { color:#4a9eff; }
  body.dark .threshold-action { color:#9da5b4; }
  body.dark .threshold-summary { background:rgba(255,235,59,0.05); }
  body.dark .risk.high:before { background:#ff6b81; }
  body.dark .risk.med:before { background:#ffa54d; }
  body.dark .legend-dot.good { background:#4ad27a; }
  body.dark .legend-dot.warn { background:#ffa54d; }
  body.dark .legend-dot.bad { background:#ff6b81; }
  body.dark .status-badge { filter:brightness(1.1); }
  @media print { #btn-dark-mode,#btn-print,.legend-tile,.export-bar { display:none !important;} body { background:#fff; } }
  </style></head><body${startDark ? ' class="dark"' : ''}>
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
    ${topRisks.length ? `<div class="risks">${topRisks.map((r) => `<div class="risk ${r.level === 'high' ? 'high pattern-bad' : 'med pattern-warn'}">${r.level === 'high' ? '⚠️' : '❕'} ${r.msg}</div>`).join('')}</div>` : '<div class="notes"><em>No major risks detected.</em></div>'}

    <h3>Recommended Actions</h3>
    <div class="notes"><ul>${recommendations.map((r) => `<li>${r}</li>`).join('')}</ul></div>

    <div class="export-bar" aria-label="Export and share tools">
      <button id="btn-copy-summary" type="button">📋 Copy Summary</button>
      <button id="btn-export-json" type="button">💾 Export JSON</button>
      <button id="btn-export-bench" type="button">📈 Export Benchmarks CSV</button>
      <button id="btn-print" type="button">🖨️ PDF/Print</button>
      <button id="btn-dark-mode" type="button">🌙 Dark</button>
    </div>
    <h2>Key Performance Indicators</h2>
    <div class="grid">
      <div class="kpi ${overallStatus === 'good' ? 'kpi-good' : overallStatus === 'warn' ? 'kpi-warn' : 'kpi-bad'}"><h4>Overall Test Status</h4><p>${overallBadgeText}</p><div class="muted">${failedThresholdLine}</div>${overallExplanation}</div>
      <div class="kpi ${neutralKpi}"><h4>Total Requests</h4><p>${fmtInt(reqs.count)}</p><div class="muted">Rate: ${fmt(reqs.rate || 0, 2)} /s</div></div>
      <div class="kpi ${successKpiClass}"><h4>Request Success Rate</h4><p>${fmt(successRate, 2)}%</p><div class="muted">HTTP errors ${(failedRate * 100).toFixed(2)}%</div>${successExplanation}</div>
  <div class="kpi ${durationKpiClass}"><h4>Avg Duration (ms)</h4><p>${fmt(dur.avg)}</p><div class="muted">p95 ${fmt(dur['p(95)'])}</div>${latencySpark}${durationExplanation}</div>
      <div class="kpi ${maxDurKpiClass}"><h4>Max Duration (ms)</h4><p>${fmt(dur.max)}</p><div class="muted">Min ${fmt(dur.min)}</div>${maxDurationExplanation}</div>
      <div class="kpi ${neutralKpi}"><h4>Data In</h4><p>${fmtBytes(dataRecv)}</p><div class="muted">Raw: ${fmtInt(dataRecv)} B</div></div>
      <div class="kpi ${neutralKpi}"><h4>Data Out</h4><p>${fmtBytes(dataSent)}</p><div class="muted">Raw: ${fmtInt(dataSent)} B</div></div>
      <div class="kpi ${neutralKpi}"><h4>Iterations</h4><p>${fmtInt(safe(metrics, 'iterations.values.count', 0))}</p><div class="muted">Avg Iter (ms) ${fmt(iterationDur.avg)}</div></div>
      <div class="kpi ${neutralKpi}"><h4>VUs</h4><p>${vusVal}</p><div class="muted">Test Length ${fmt(testDurationSeconds, 2)} s</div></div>
    </div>

    ${
      thresholdSummary.failed > 0
        ? `
    <h2>📋 Understanding the Results (For Stakeholders)</h2>
    ${explainThresholds()}
    `
        : ''
    }

    <h2>Overall Success Rate (Checks & Thresholds)</h2>
    <div class="flex-row">
      <div class="donut">${donut}<div class="muted mt-4">Checks: ${checks.passes || 0} pass / ${checks.fails || 0} fail</div><div class="notes" style="margin-top:10px; font-size:0.9em;">This shows the percentage of checks that passed. Checks include response time thresholds, HTTP status validation, and other test criteria.</div></div>
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
      
      <div style="background: linear-gradient(135deg, #e3f2fd, #ffffff); border: 1px solid #90caf9; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <h3 style="margin-top: 0; color: #1976d2; font-size: 16px;">📖 Understanding Metrics - Quick Guide</h3>
        <div style="font-size: 13px; line-height: 1.6;">
          <p style="margin: 8px 0;"><strong>Response Time Benchmarks (p95):</strong> 
            <span style="color: #1B873F; font-weight: 600;">✓ Excellent: &lt;800ms</span> | 
            <span style="color: #FF8B00; font-weight: 600;">⚠ Good: 800-2000ms</span> | 
            <span style="color: #B00020; font-weight: 600;">✗ Slow: &gt;2000ms</span>
          </p>
          <p style="margin: 8px 0;"><strong>Success Rate:</strong> 
            <span style="color: #1B873F; font-weight: 600;">✓ Excellent: &gt;99%</span> | 
            <span style="color: #FF8B00; font-weight: 600;">⚠ Acceptable: 95-99%</span> | 
            <span style="color: #B00020; font-weight: 600;">✗ Poor: &lt;95%</span>
          </p>
          <details style="margin-top: 12px;">
            <summary style="cursor: pointer; font-weight: 600; color: #1976d2;">📊 Click to see detailed metric explanations</summary>
            <div style="margin-top: 12px; padding-left: 12px; border-left: 3px solid #90caf9;">
              <p><strong>🔹 http_req_duration</strong> - Total time from sending request to receiving response (most important metric)</p>
              <p><strong>🔹 http_req_waiting</strong> - Server processing time (excludes network)</p>
              <p><strong>🔹 http_req_blocked</strong> - Time waiting for available connection (should be ~0ms)</p>
              <p><strong>🔹 http_req_connecting</strong> - TCP connection setup time</p>
              <p><strong>🔹 http_req_tls_handshaking</strong> - SSL/TLS encryption setup time</p>
              <p><strong>🔹 http_req_sending</strong> - Time to upload request data</p>
              <p><strong>🔹 http_req_receiving</strong> - Time to download response data</p>
              <p><strong>🔹 http_req_failed</strong> - Percentage of failed requests (rate: 0.01 = 1%)</p>
              <p><strong>🔹 http_reqs</strong> - Total requests and throughput (requests/second)</p>
              <p><strong>🔹 data_received</strong> - Total data downloaded from server</p>
              <p><strong>🔹 data_sent</strong> - Total data uploaded to server</p>
              <p><strong>🔹 checks</strong> - Validation results (includes HTTP status + thresholds)</p>
              <p><strong>🔹 iteration_duration</strong> - Complete test scenario time (all steps)</p>
              <p><strong>🔹 vus</strong> - Number of virtual users (simulated concurrent users)</p>
              <hr style="margin: 12px 0; border: none; border-top: 1px solid #90caf9;">
              <p style="margin-top: 12px;"><strong>📐 Column Meanings:</strong></p>
              <ul style="margin: 8px 0; padding-left: 20px;">
                <li><strong>min</strong> - Fastest (best case)</li>
                <li><strong>avg</strong> - Average (can be skewed by outliers)</li>
                <li><strong>med</strong> - Median/middle value (typical experience)</li>
                <li><strong>p(90)</strong> - 90% were faster than this</li>
                <li><strong>p(95)</strong> - 95% were faster (use this for SLAs) ⭐</li>
                <li><strong>p(99)</strong> - 99% were faster than this</li>
                <li><strong>max</strong> - Slowest (worst case)</li>
                <li><strong>count</strong> - Total number</li>
                <li><strong>rate</strong> - Per second or percentage (0.02 = 2%)</li>
              </ul>
              <p style="margin-top: 12px; padding: 10px; background: #fff3e0; border-radius: 4px;">
                💡 <strong>Tip:</strong> Focus on <strong>p(95)</strong> response time and <strong>http_req_failed</strong> rate first. 
                For complete benchmarks, see <strong>METRICS-GUIDE.md</strong> file.
              </p>
            </div>
          </details>
        </div>
      </div>
      
      ${allMetricsTable}
    </div>

    <h2>Endpoint / Group Breakdown <button class="toggle-btn" data-target="sec-groups">Toggle</button></h2>
    <div id="sec-groups" class="panel section-body">${typeof data.groupBreakdown !== 'undefined' ? data.groupBreakdown : '<div class="notes"><em>Group breakdown unavailable.</em></div>'}</div>

    ${
      data.errorSamples && data.errorSamples.length
        ? `
    <h2>📊 Error Analysis for Stakeholders <button class="toggle-btn" data-target="sec-error-samples">Toggle</button></h2>
    <div id="sec-error-samples" class="panel section-body">
      ${data.errorSamples
        .map((sample) => {
          // Handle new stakeholder-friendly format
          if (sample['📊 Error Summary']) {
            return `
            <div style="margin-bottom: 30px;">
              <h3 style="color: #d32f2f; margin-top: 0;">📊 Error Summary</h3>
              <table class="compact">
                <tbody>
                  ${Object.entries(sample['📊 Error Summary'])
                    .map(([key, val]) => `<tr><th style="width: 200px;">${key}</th><td>${val}</td></tr>`)
                    .join('')}
                </tbody>
              </table>

              <h3 style="color: #d32f2f; margin-top: 20px;">❌ Issue Description</h3>
              <table class="compact">
                <tbody>
                  ${Object.entries(sample['❌ Issue Description'])
                    .map(([key, val]) => `<tr><th style="width: 200px;">${key}</th><td>${val}</td></tr>`)
                    .join('')}
                </tbody>
              </table>

              <h3 style="color: #1976d2; margin-top: 20px;">🔍 What Happened</h3>
              <div class="notes" style="background-color: #e3f2fd; padding: 15px; border-left: 4px solid #1976d2;">
                ${sample['🔍 What Happened']}
              </div>

              <h3 style="color: #f57c00; margin-top: 20px;">📋 Individual Error Details</h3>
              <div class="notes" style="background-color: #fff3e0; padding: 15px; border-left: 4px solid #f57c00;">
                <pre style="white-space: pre-wrap; margin: 0; font-family: inherit;">${sample['📋 Individual Error Details']}</pre>
              </div>

              <h3 style="color: #7b1fa2; margin-top: 20px;">📍 Where to Find Full Details</h3>
              <table class="compact">
                <tbody>
                  ${Object.entries(sample['📍 Where to Find Full Details'])
                    .map(([key, val]) => `<tr><th style="width: 200px;">${key}</th><td>${val}</td></tr>`)
                    .join('')}
                </tbody>
              </table>

              <h3 style="color: #388e3c; margin-top: 20px;">💡 Example Error Message</h3>
              <div class="notes" style="background-color: #e8f5e9; padding: 15px; border-left: 4px solid #388e3c;">
                <code style="background: none; padding: 0;">${sample['💡 Example Error Message']}</code>
              </div>

              <h3 style="color: #0288d1; margin-top: 20px;">🎯 For Stakeholders</h3>
              <table class="compact">
                <tbody>
                  ${Object.entries(sample['🎯 For Stakeholders'])
                    .map(([key, val]) => `<tr><th style="width: 200px;">${key}</th><td>${val}</td></tr>`)
                    .join('')}
                </tbody>
              </table>
            </div>
          `;
          } else {
            // Fallback for old format
            return `<div class="notes"><strong>Status:</strong> ${sample.status || 'N/A'} | <strong>Endpoint:</strong> ${sample.endpoint || 'N/A'} | <strong>Message:</strong> ${sample.message || 'No details available'}</div>`;
          }
        })
        .join('<hr style="margin: 30px 0; border: none; border-top: 2px solid #e0e0e0;">')}
    </div>
    `
        : ''
    }

    ${
      data.topFailingEndpoints && data.topFailingEndpoints.length
        ? `
    <h2>Top Failing Endpoints</h2>
    <div class="panel"><table class="compact"><thead><tr><th>Endpoint</th><th>Failures</th></tr></thead><tbody>${data.topFailingEndpoints.map((e) => `<tr><td>${e.endpoint}</td><td>${e.count}</td></tr>`).join('')}</tbody></table></div>
    `
        : ''
    }

    ${
      verboseLogs
        ? `
    <h2>🔍 Verbose Debug Logs <button class="toggle-btn" data-target="sec-verbose-logs">Expand</button></h2>
    <div id="sec-verbose-logs" class="section-body collapsed">
      <div class="notes" style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #666; margin-bottom: 20px;">
        <h4 style="margin: 0 0 10px 0; color: #333;">📊 What's in the Verbose Logs</h4>
        <p style="margin: 0; font-size: 13px;">Complete K6 debug output including HTTP request/response details, threshold crossings, authentication flows, performance metrics, error details, and step-by-step execution flow. Perfect for troubleshooting the "<strong>8 fail</strong>" type issues!</p>
      </div>
      
      <div style="background: #1e1e1e; color: #f0f0f0; padding: 20px; border-radius: 8px; overflow: auto; max-height: 600px; font-family: 'Courier New', Consolas, monospace; font-size: 12px; line-height: 1.4;">
        <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #444; padding-bottom: 10px;">
          <h4 style="margin: 0; color: #4fc3f7;">🔍 K6 Verbose Debug Output</h4>
          <small style="color: #888;">Generated: ${new Date().toISOString()}</small>
        </div>
        <pre style="margin: 0; white-space: pre-wrap; word-wrap: break-word; color: #f0f0f0;">${verboseLogs.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
      </div>
      
      <div class="notes" style="margin-top: 15px; padding: 12px; background-color: #e8f4fd; border-left: 4px solid #2196f3;">
        <h4 style="margin: 0 0 8px 0; color: #1976d2;">💡 How to Use These Logs</h4>
        <ul style="margin: 0; padding-left: 20px; font-size: 13px;">
          <li><strong>Find Threshold Failures:</strong> Search for "DEBU" + "Thresholds on" to see which performance thresholds were crossed</li>
          <li><strong>HTTP Error Details:</strong> Look for HTTP status codes (500, 404, etc.) to identify failing API calls</li>
          <li><strong>Authentication Issues:</strong> Search for "auth" or "token" to debug login problems</li>
          <li><strong>Performance Bottlenecks:</strong> Check request durations and look for patterns in slow responses</li>
          <li><strong>Configuration Problems:</strong> Review environment settings and test parameters at the top</li>
        </ul>
      </div>
    </div>`
        : ''
    }

    <h2>Environment / Metadata</h2>
    <table class="compact"><tbody>
      <tr><th>Environment</th><td>${safe(data, 'setup_data.configEnvironment', 'n/a')}</td></tr>
      <tr><th>Use Data File Config</th><td>${safe(data, 'setup_data.useDataFileConfig', 'n/a')}</td></tr>
      <tr><th>Config File</th><td>${safe(data, 'setup_data.configFile', 'n/a')}</td></tr>
      <tr><th>API Host</th><td>${safe(data, 'setup_data.apiHost', 'n/a')}</td></tr>
      <tr><th>Total Users Available</th><td>${safe(data, 'setup_data.totalUsers', 'n/a')}</td></tr>
      <tr><th>Scenario Override</th><td>${safe(data, 'setup_data.scenarioOverride', 'n/a')}</td></tr>
      <tr><th>Test Execution Time</th><td>${safe(data, 'setup_data.testExecutionTime', 'n/a')}</td></tr>
      <tr><th>Duration (s)</th><td>${fmt(testDurationSeconds, 2)}</td></tr>
      <tr><th>Summary Stats</th><td>${(safe(data, 'options.summaryTrendStats', []) || []).join(', ')}</td></tr>
      ${verboseLogs ? `<tr><th>Verbose Logging</th><td><span style="color: #1B873F; font-weight: bold;">✓ Enabled</span> - Debug logs included below</td></tr>` : `<tr><th>Verbose Logging</th><td><span style="color: #666;">✗ Disabled</span> - Use :verbose:report commands for detailed logs</td></tr>`}
    </tbody></table>

    <footer>Generated by custom k6 report generator &middot; ${new Date().getFullYear()}</footer>
    <script>
    (function(){
      const payload = {
        generated: new Date().toISOString(),
        successRate: ${fmt(successRate, 2)},
        p95: ${p95Val !== undefined ? JSON.stringify(p95Val) : 'null'},
        p95Target: ${p95Target !== null ? JSON.stringify(p95Target) : 'null'},
        thresholdsFailed: ${thresholdSummary.failed},
        thresholdsTotal: ${thresholdSummary.total},
        benchmarks: ${JSON.stringify(thresholdsBenchmarks.rows || [])},
        classificationThresholds: ${typeof THRESH !== 'undefined' ? JSON.stringify(THRESH) : '{}'}
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
