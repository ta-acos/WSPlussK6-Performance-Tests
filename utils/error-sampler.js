// Lightweight error sampling utility for k6 scripts.
// Usage: import { recordErrorSample, getErrorSamples, summarizeFailures } from '../utils/error-sampler.js';
// Call recordErrorSample(res, context) for non-2xx responses. Limit samples to avoid memory bloat.

// Use a global object to store state (works across VU boundaries in k6)
if (typeof globalThis.__ERROR_SAMPLES__ === 'undefined') {
  globalThis.__ERROR_SAMPLES__ = [];
  globalThis.__FAIL_COUNTS__ = {};
}

const MAX_SAMPLES = parseInt(__ENV.ERROR_SAMPLE_LIMIT || '25', 10); // cap overall stored samples
const MAX_BODY_BYTES = parseInt(__ENV.ERROR_SAMPLE_BODY_BYTES || '2048', 10); // truncate large bodies

function safeTruncate(body, limit) {
  if (!body) return '';
  if (body.length <= limit) return body;
  return body.slice(0, limit) + `...[truncated ${body.length - limit} bytes]`;
}

export function recordErrorSample(res, ctx = {}) {
  try {
    // NOTE: Due to k6 context isolation, error samples recorded in VU context
    // will NOT persist to handleSummary context. This is a known k6 limitation.
    // See K6_CONTEXT_LIMITATION.md for details and workarounds.
    
    // Record if: HTTP error (4xx/5xx) OR explicit failure flag in context
    const isHttpError = res && (res.status < 200 || res.status >= 400);
    const isLogicalFailure = ctx.failed === true;
    
    if (!res || (!isHttpError && !isLogicalFailure)) return;
    
    const endpoint = ctx.endpoint || res.request?.url || 'unknown';
    globalThis.__FAIL_COUNTS__[endpoint] = (globalThis.__FAIL_COUNTS__[endpoint] || 0) + 1;
    
    if (globalThis.__ERROR_SAMPLES__.length >= MAX_SAMPLES) return;
    
    globalThis.__ERROR_SAMPLES__.push({
      ts: Date.now(),
      status: res.status,
      endpoint,
      method: res.request?.url,
      tagName: ctx.name,
      body: safeTruncate(String(res.body || ''), MAX_BODY_BYTES),
      error: ctx.error || null
    });
  } catch (e) {
    // swallow – sampling must not break test
  }
}

export function getErrorSamples() {
  return globalThis.__ERROR_SAMPLES__ || [];
}

export function summarizeFailures() {
  const entries = Object.entries(globalThis.__FAIL_COUNTS__ || {}).map(([endpoint, count]) => ({ endpoint, count }));
  entries.sort((a, b) => b.count - a.count);
  return entries;
}

export function generateGroupBreakdown(metrics) {
  const groups = [];
  
  // Find all group_duration metrics with group names
  Object.keys(metrics).forEach((metricName) => {
    if (metricName.startsWith('group_duration{group:::')) {
      const groupMatch = metricName.match(/group:::([^}]+)/);
      if (groupMatch) {
        const groupName = groupMatch[1];
        const values = metrics[metricName].values || {};
        groups.push({
          name: groupName,
          avg: values.avg || 0,
          min: values.min || 0,
          max: values.max || 0,
          med: values.med || 0,
          p90: values['p(90)'] || 0,
          p95: values['p(95)'] || 0
        });
      }
    }
  });
  
  // If no named groups found, show generic group duration
  if (groups.length === 0 && metrics.group_duration) {
    const values = metrics.group_duration.values || {};
    return `<div class="notes">
      <p><strong>Overall Group Metrics:</strong></p>
      <ul>
        <li>Average: ${(values.avg || 0).toFixed(2)} ms</li>
        <li>Median: ${(values.med || 0).toFixed(2)} ms</li>
        <li>p(95): ${(values['p(95)'] || 0).toFixed(2)} ms</li>
        <li>Max: ${(values.max || 0).toFixed(2)} ms</li>
      </ul>
      <p><em>Tip: Add thresholds for specific groups to see individual group breakdowns. Example:</em></p>
      <code>'group_duration{group:::Authentication}': ['p(95)<2000']</code>
    </div>`;
  }
  
  if (groups.length === 0) {
    return '<div class="notes"><em>No group metrics found.</em></div>';
  }
  
  // Sort by p95 descending (slowest first)
  groups.sort((a, b) => (b.p95 || 0) - (a.p95 || 0));
  
  const rows = groups.map(g => {
    const p95Class = g.p95 <= 800 ? 'cell-good' : g.p95 <= 2000 ? 'cell-warn' : 'cell-bad';
    return `<tr>
      <td>${g.name}</td>
      <td>${g.min.toFixed(2)}</td>
      <td>${g.avg.toFixed(2)}</td>
      <td>${g.med.toFixed(2)}</td>
      <td>${g.p90.toFixed(2)}</td>
      <td class="${p95Class}">${g.p95.toFixed(2)}</td>
      <td>${g.max.toFixed(2)}</td>
    </tr>`;
  }).join('');
  
  return `<table class="compact">
    <thead>
      <tr>
        <th>Group / Operation</th>
        <th>Min (ms)</th>
        <th>Avg (ms)</th>
        <th>Med (ms)</th>
        <th>p90 (ms)</th>
        <th>p95 (ms)</th>
        <th>Max (ms)</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

export function injectErrorAnalyticsIntoSummary(summary) {
  // NOTE: Due to k6 context isolation, error samples will always be empty here.
  // VU context data does not persist to handleSummary (init context).
  // This is a known k6 architectural limitation. See K6_CONTEXT_LIMITATION.md
  
  summary.errorSamples = getErrorSamples();
  summary.topFailingEndpoints = summarizeFailures();
  summary.groupBreakdown = generateGroupBreakdown(summary.metrics || {});
}
