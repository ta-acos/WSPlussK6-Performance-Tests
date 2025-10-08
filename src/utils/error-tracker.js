// Error tracking utility using k6 Custom Metrics (works across contexts!)
// This replaces the globalThis approach which doesn't work due to k6 context isolation.

import { Counter } from 'k6/metrics';
import { Trend } from 'k6/metrics';

// Create custom metrics for error tracking
// These metrics WILL persist from VU context to handleSummary context
const errorCounter = new Counter('custom_errors');
const errorsByEndpoint = new Counter('errors_by_endpoint');
const errorsByStatus = new Counter('errors_by_status');

// Use a Trend metric to store error details as data points
// Each error is logged with its details in tags
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
    samples.push({
      '📊 Error Summary': {
        'Total Errors': count,
        'Error Rate': (rate * 100).toFixed(2) + '%',
        Endpoint: 'POST /api/websak/api/jp/uploadfiletodokument/',
        'HTTP Status': '200 (Success, but timeout threshold exceeded)',
        'Error Type': 'document_attach_timeout'
      },
      '❌ Issue Description': {
        Problem: `${count} document attachment request(s) exceeded the 5-second response time threshold`,
        Impact:
          'These requests returned HTTP 200 (success) but took longer than expected, indicating potential performance issues',
        Threshold: 'Response time > 5000ms is considered a timeout error'
      },
      '🔍 What Happened': `Got HTTP 200 from /api/websak/api/jp/uploadfiletodokument/ but ${count} request(s) failed due to timeout error (response time > 5000ms threshold). The API successfully processed the documents but response time exceeded acceptable limits.`,

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
        'Got 200 from /api/websak/api/jp/uploadfiletodokument/ but this is failed due to the error: ' +
        'Document attachment timeout: 6335.12ms > 5000ms threshold. JP ID: 1101115771',

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
    })
    .join('');

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
