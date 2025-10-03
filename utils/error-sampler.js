// Lightweight error sampling utility for k6 scripts.
// Usage: import { recordErrorSample, getErrorSamples, summarizeFailures } from '../utils/error-sampler.js';
// Call recordErrorSample(res, context) for non-2xx responses. Limit samples to avoid memory bloat.

const MAX_SAMPLES = parseInt(__ENV.ERROR_SAMPLE_LIMIT || '25', 10); // cap overall stored samples
const MAX_BODY_BYTES = parseInt(__ENV.ERROR_SAMPLE_BODY_BYTES || '2048', 10); // truncate large bodies
const samples = [];
const failCounts = {}; // endpoint -> count

function safeTruncate(body, limit) {
  if (!body) return '';
  if (body.length <= limit) return body;
  return body.slice(0, limit) + `...[truncated ${body.length - limit} bytes]`;
}

export function recordErrorSample(res, ctx = {}) {
  try {
    if (!res || (res.status >= 200 && res.status < 400)) return; // treat 4xx/5xx & others as errors
    const endpoint = ctx.endpoint || res.request?.url || 'unknown';
    failCounts[endpoint] = (failCounts[endpoint] || 0) + 1;
    if (samples.length >= MAX_SAMPLES) return;
    samples.push({
      ts: Date.now(),
      status: res.status,
      endpoint,
      method: res.request?.method,
      tagName: ctx.name,
      body: safeTruncate(String(res.body || ''), MAX_BODY_BYTES),
      error: ctx.error || null
    });
  } catch (e) {
    // swallow – sampling must not break test
  }
}

export function getErrorSamples() {
  return samples;
}

export function summarizeFailures() {
  const entries = Object.entries(failCounts).map(([endpoint, count]) => ({ endpoint, count }));
  entries.sort((a, b) => b.count - a.count);
  return entries;
}

export function injectErrorAnalyticsIntoSummary(summary) {
  summary.errorSamples = getErrorSamples();
  summary.topFailingEndpoints = summarizeFailures();
}
