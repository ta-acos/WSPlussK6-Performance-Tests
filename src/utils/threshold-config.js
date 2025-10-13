// Helper to access canonical performance threshold configuration
// without duplicating literals across reporter / logger modules.
import { getPerformanceThresholds } from '../lib/config-manager.js';

export function getLatencyBands() {
  const cfg = getPerformanceThresholds();
  return cfg?.uiBands?.latencyMs || { good: 1200, watch: 9000, investigate: 12000 };
}

export function getErrorRateBands() {
  const cfg = getPerformanceThresholds();
  return cfg?.uiBands?.errorRate || { good: 0.01, watch: 0.05, investigate: 0.05 };
}

export function getIterationBands() {
  const cfg = getPerformanceThresholds();
  return cfg?.uiBands?.iterationMs || { good: 8000, watch: 30000, investigate: 45000 };
}

export function getGlobalHttpTargets() {
  const cfg = getPerformanceThresholds();
  const http = cfg?.defaults?.k6?.http_req_duration || {};
  return { p95: http.p95, p99: http.p99 };
}

export function getInvestigateLatency() {
  return getLatencyBands().investigate ?? 12000;
}

export function getWatchLatency() {
  return getLatencyBands().watch ?? 9000;
}

export function getGoodLatency() {
  return getLatencyBands().good ?? 1200;
}
