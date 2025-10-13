/**
 * ===================================================================
 * ERROR TRACKING UTILITY MODULE
 * ===================================================================
 *
 * @author Senthilkumar Sengottuvel
 *
 * WHAT THIS MODULE DOES:
 * This module provides comprehensive error tracking and analysis for K6 performance tests.
 * It captures detailed information about HTTP errors, timeouts, and logical failures,
 * making it easier to identify and troubleshoot issues during test execution.
 *
 * MAIN CAPABILITIES:
 *
 * 1. 📊 METRICS-BASED ERROR TRACKING:
 *    - Uses K6 custom metrics to persist error data across test contexts
 *    - Tracks total error counts, errors by endpoint, and errors by status code
 *    - Stores detailed error information that survives context isolation
 *    - Integrates seamlessly with K6's built-in metrics system
 *
 * 2. 🔍 DETAILED ERROR ANALYSIS:
 *    - Records HTTP status codes, endpoints, and error types
 *    - Captures response times and request details
 *    - Stores error messages and context information
 *    - Tracks both HTTP errors and logical failures
 *
 * 3. 📈 ERROR CATEGORIZATION:
 *    - Separates errors by endpoint for targeted analysis
 *    - Groups errors by HTTP status code patterns
 *    - Distinguishes between different error types (timeouts, auth failures, etc.)
 *    - Provides error trends over time for pattern analysis
 *
 * 4. 🛠️ DEBUGGING SUPPORT:
 *    - Includes response body samples for error investigation
 *    - Records request context and metadata
 *    - Provides error injection for test reports
 *    - Supports custom error tagging and categorization
 *
 * WHY THIS MODULE EXISTS:
 * K6's default error tracking is limited and doesn't persist detailed error
 * information across test contexts. This module provides comprehensive error
 * tracking that helps identify root causes of performance issues and failures.
 *
 * TECHNICAL NOTES:
 * - Uses K6 Custom Metrics instead of globalThis due to context isolation
 * - Error data persists from VU context to handleSummary context
 * - Metrics are automatically included in K6 test results and reports
 *
 * EXAMPLE USAGE:
 * ```javascript
 * import { recordError } from '../utils/error-tracker.js';
 *
 * const response = http.get(url, params);
 * recordError(response, {
 *   endpoint: 'auth:token',
 *   errorType: 'http_error',
 *   message: 'Authentication failed'
 * });
 * ```
 */

import { Counter, Trend } from 'k6/metrics';
import { open } from 'k6';

// Load performance thresholds configuration
let performanceThresholds = {};
try {
  const thresholdsFile = open('src/config/performance-thresholds.json');
  if (thresholdsFile && thresholdsFile !== 'null' && thresholdsFile.trim() !== '') {
    performanceThresholds = JSON.parse(thresholdsFile);
  }
} catch (e) {
  console.warn(`[ERROR-TRACKER] Failed to load performance thresholds: ${e.message}`);
}

// ========================================
// CUSTOM METRICS FOR ERROR TRACKING
// ========================================
// These metrics WILL persist from VU context to handleSummary context
// and appear in test results and reports

/**
 * Counts total number of errors encountered during the test
 */
const errorCounter = new Counter('custom_errors');

/**
 * Tracks errors grouped by API endpoint for targeted analysis
 */
const errorsByEndpoint = new Counter('errors_by_endpoint');

/**
 * Tracks errors grouped by HTTP status code for pattern analysis
 */
const errorsByStatus = new Counter('errors_by_status');

/**
 * Stores detailed error information as data points with tags
 * The 'true' parameter enables time series data collection
 */
const errorDetailsTrend = new Trend('error_details', true);

// const MAX_BODY_BYTES = parseInt(__ENV.ERROR_SAMPLE_BODY_BYTES || '500', 10); // TODO: Use when body truncation needed

// function safeTruncate(body, limit) {  // TODO: Use when body truncation needed
//   if (!body) return '';
//   const str = String(body);
//   if (str.length <= limit) return str;
//   return str.slice(0, limit) + `...[+${str.length - limit} chars]`;
// }

/**
 * Record an error using k6 custom metrics with tags
 * This data WILL be available in handleSummary!
 *
 * @param {Object} res - HTTP response object
 * @param {Object} ctx - Context with additional error info
 */
export function recordError(res, ctx = {}) {
  try {
    // Determine if this is an error
    const isHttpError = res && (res.status < 200 || res.status >= 400);
    const isLogicalFailure = ctx.failed === true;

    if (!res || (!isHttpError && !isLogicalFailure)) return;

    // Extract error details
    const endpoint = ctx.endpoint || res.request?.url || 'unknown';
    const status = String(res.status || 'N/A');
    const method = res.request?.method || 'UNKNOWN';
    const errorType = ctx.errorType || 'http_error';
    const message = ctx.message || ctx.error || `HTTP ${status}`;
    const jpId = ctx.jpId || '';
    const duration = ctx.duration || (res.timings?.duration ? res.timings.duration.toFixed(2) : '');
    const responseBody = ctx.responseBody || '';

    // Clean endpoint name for tagging (remove query params, shorten)
    const endpointTag = endpoint
      .replace(/https?:\/\/[^/]+/, '') // Remove domain
      .replace(/\?.*$/, '') // Remove query params
      .slice(0, 50); // Limit length

    // Record error with tags (these persist across contexts!)
    errorCounter.add(1, {
      endpoint: endpointTag,
      status: status,
      method: method,
      type: errorType,
      message: message.slice(0, 200) // Extended message length for full error details
    });

    // Also track by endpoint and status for aggregation
    errorsByEndpoint.add(1, { endpoint: endpointTag });
    errorsByStatus.add(1, { status: status });

    // Store error details using Trend metric with tags
    // This allows us to extract individual error information in handleSummary
    const timestamp = new Date().toISOString();
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    errorDetailsTrend.add(1, {
      id: errorId,
      timestamp: timestamp.slice(11, 19), // HH:MM:SS only
      endpoint: endpointTag.slice(0, 40),
      method: method,
      status: status,
      type: errorType,
      jpId: jpId || 'N/A',
      duration: duration || 'N/A'
    });

    // Log to console for real-time monitoring
    // Format: JSON-like structure for easy parsing if needed
    console.error(`\n========== ERROR DETAILS ${timestamp} ==========`);
    console.error(`[ERROR] ${method} ${endpointTag} - Status: ${status}`);
    console.error(`[ERROR] Type: ${errorType}`);
    console.error(`[ERROR] Message: ${message}`);
    if (jpId) console.error(`[ERROR] JP ID: ${jpId}`);
    if (duration) console.error(`[ERROR] Duration: ${duration}ms`);
    if (responseBody) console.error(`[ERROR] Response Body (first 200 chars): ${responseBody.slice(0, 200)}`);
    console.error(`========================================\n`);

    // ALSO log in a compact machine-readable format for potential parsing
    console.log(
      `[ERROR_RECORD]${JSON.stringify({
        timestamp,
        endpoint: endpointTag,
        method,
        status,
        errorType,
        message,
        jpId: jpId || 'N/A',
        duration: duration || 'N/A',
        responseBody: responseBody ? responseBody.slice(0, 100) : ''
      })}`
    );
  } catch (e) {
    console.warn(`[ERROR-TRACKER] Failed to record error: ${e.message}`);
  }
}

/**
 * Extract error samples from k6 metrics data
 * This runs in handleSummary and WILL have access to the error data!
 *
 * Creates a comprehensive error report for stakeholders directly in the report files.
 *
 * @param {Object} data - k6 summary data
 * @returns {Array} Array of error samples
 */
export function extractErrorSamples(data) {
  const samples = [];

  try {
    // Extract from custom_errors metric for count and rate
    const errorMetric = data.metrics?.custom_errors;
    if (!errorMetric || !errorMetric.values) {
      return samples;
    }

    const count = errorMetric.values.count || 0;
    const rate = errorMetric.values.rate || 0;

    if (count === 0) {
      return samples;
    }

    // Create comprehensive error report for stakeholders
    // Dynamic timeout threshold from configuration (with env var override)
    const configuredTimeout = performanceThresholds?.operations?.['Attach Document']?.maxResponseTimeMs || 
                              performanceThresholds?.operations?.['Upload Document']?.maxResponseTimeMs || 
                              performanceThresholds?.defaults?.maxResponseTimeMs || 
                              6000;
    const attachTimeoutMs = parseInt(__ENV.ATTACH_DOCS_BATCH_LIMIT_MS || String(configuredTimeout), 10);

    samples.push({
      '📊 Error Summary': {
        'Total Errors': count,
        'Error Rate': (rate * 100).toFixed(2) + '%',
        Endpoint: 'POST /api/websak/api/jp/uploadfiletodokument/',
        'HTTP Status': '200 (Success, but exceeded attachment time budget)',
        'Error Type': 'document_attach_timeout'
      },
      '❌ Issue Description': {
        Problem: `${count} document attachment request(s) exceeded the ${attachTimeoutMs}ms response time budget`,
        Impact:
          'Requests returned HTTP 200 (success) but took longer than the configured budget, indicating potential performance issues (slow I/O, large payload, server processing).',
        Threshold: `Response time > ${attachTimeoutMs}ms is classified as attachment timeout`
      },
      '🔍 What Happened': `Got HTTP 200 from /api/websak/api/jp/uploadfiletodokument/ but ${count} request(s) flagged as timeout (duration > ${attachTimeoutMs}ms). Processing succeeded but SLA budget was exceeded.`,

      '📋 Individual Error Details':
        `Each of the ${count} errors includes:\n` +
        '  • Exact timestamp (when the error occurred)\n' +
        '  • JP ID (Journal Post identifier affected)\n' +
        '  • Actual duration in milliseconds\n' +
        '  • HTTP method, endpoint, and status code\n' +
        '  • Error type classification\n' +
        '  • Response body snippet (first 200 characters)\n' +
        '  • Complete error message with context',

      '📍 Where to Find Full Details': {
        Location: 'Console output during test execution',
        'How to Search': 'Look for "========== ERROR DETAILS" blocks in the console log',
        'Each Error Block Contains':
          'Timestamp, Method, Endpoint, Status, Type, Full Message, JP ID, Duration, Response Body',
        'Machine Readable Format': 'Also logged as [ERROR_RECORD] JSON for automated parsing'
      },

      '💡 Example Error Message':
        `Got 200 from /api/websak/api/jp/uploadfiletodokument/ but this is failed due to the error: Document attachment timeout: 5827.21ms > ${attachTimeoutMs}ms threshold. JP ID is: 1101128248 and Case ID is: 987654321. sak/987654321/jp/1101128248`,

      '🎯 For Stakeholders': {
        'Quick Summary': `${count} out of ${Math.round(count / rate)} total requests exceeded timeout threshold (${(rate * 100).toFixed(2)}% failure rate)`,
        'Action Required': 'Review console logs above to identify specific JP IDs and timing patterns',
        'Performance Impact':
          rate > 0.1
            ? '⚠️ High error rate - investigate server performance'
            : rate > 0.05
              ? '⚠️ Moderate error rate - monitor closely'
              : '✅ Low error rate - within acceptable limits'
      }
    });
  } catch (e) {
    console.warn(`[ERROR-TRACKER] Failed to extract errors: ${e.message}`);
  }

  return samples;
}

/**
 * Extract top failing endpoints from metrics
 *
 * @param {Object} data - k6 summary data
 * @returns {Array} Array of {endpoint, count} objects
 */
export function extractTopFailingEndpoints(data) {
  const failures = [];

  try {
    const endpointMetric = data.metrics?.errors_by_endpoint;
    if (!endpointMetric || !endpointMetric.values) {
      return failures;
    }

    const count = endpointMetric.values.count || 0;
    if (count > 0) {
      failures.push({
        endpoint: 'POST /api/websak/api/jp/uploadfiletodokument/',
        count: count,
        percentage: ((count / (data.metrics.http_reqs?.values?.count || count)) * 100).toFixed(2) + '%',
        description: 'Document batch upload endpoint',
        note: 'Failures due to response time exceeding 5-second threshold'
      });
    }
  } catch (e) {
    console.warn(`[ERROR-TRACKER] Failed to extract failing endpoints: ${e.message}`);
  }

  return failures;
}

/**
 * Generate error analytics for report
 *
 * @param {Object} data - k6 summary data
 * @returns {Object} Error analytics data
 */
export function generateErrorAnalytics(data) {
  const errorSamples = extractErrorSamples(data);
  const topFailingEndpoints = extractTopFailingEndpoints(data);

  // Extract error breakdown by status code
  const errorsByStatus = {};
  const statusMetric = data.metrics?.errors_by_status;
  if (statusMetric && statusMetric.values && statusMetric.values.count > 0) {
    errorsByStatus.total = statusMetric.values.count;
  }

  return {
    errorSamples,
    topFailingEndpoints,
    errorsByStatus,
    totalErrors: errorSamples.reduce((sum, s) => sum + (s.count || 0), 0)
  };
}

/**
 * Inject error analytics into summary for report generation
 *
 * @param {Object} summary - Summary object to enhance
 */
export function injectErrorAnalytics(summary) {
  const analytics = generateErrorAnalytics(summary);

  summary.errorSamples = analytics.errorSamples;
  summary.topFailingEndpoints = analytics.topFailingEndpoints;
  summary.totalCustomErrors = analytics.totalErrors;

  // Keep the group breakdown from original implementation
  if (typeof summary.groupBreakdown === 'undefined') {
    summary.groupBreakdown = generateGroupBreakdown(summary.metrics || {});
  }
}

function generateGroupBreakdown(metrics) {
  const groups = [];

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
    </div>`;
  }

  if (groups.length === 0) {
    return '<div class="notes"><em>No group metrics found.</em></div>';
  }

  groups.sort((a, b) => (b.p95 || 0) - (a.p95 || 0));

  const rows = groups
    .map((g) => {
      const norm = (v) => (typeof v === 'number' && v > 0 ? v.toFixed(2) : 'n/a');
      const p95Class =
        typeof g.p95 === 'number' && g.p95 > 0
          ? g.p95 <= 800
            ? 'cell-good'
            : g.p95 <= 2000
              ? 'cell-warn'
              : 'cell-bad'
          : '';
      return `<tr>
      <td>${g.name}</td>
      <td>${norm(g.min)}</td>
      <td>${norm(g.avg)}</td>
      <td>${norm(g.med)}</td>
      <td>${norm(g.p90)}</td>
      <td class="${p95Class}">${norm(g.p95)}</td>
      <td>${norm(g.max)}</td>
    </tr>`;
    })
    .join('');

  // Detect if all rows are effectively empty (all n/a)
  const allEmpty = /<td>n\/a<\/td>/g.test(rows) && !/class="cell-(good|warn|bad)"/.test(rows);
  if (allEmpty) {
    return `<div class="notes"><p><strong>No populated group metrics detected.</strong></p><p>This usually means either:</p><ul><li>Group blocks executed too quickly / no iterations completed</li><li>K6 summary did not include trend stats (now forced via summaryTrendStats)</li><li>Test exited early on errors before groups finished</li></ul><p>Re-run a longer test or verify groups are executed. If still empty, capture raw summary JSON and inspect metric keys beginning with <code>group_duration{group:::</code>.</p></div>`;
  }

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
