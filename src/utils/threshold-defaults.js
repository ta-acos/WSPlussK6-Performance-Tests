/**
 * Centralized minimal fallback thresholds helper.
 * This prevents scattering inline threshold arrays across scripts.
 * Only reliability-focused generic safety nets belong here.
 * Performance (latency) thresholds are defined exclusively in performance-thresholds.json.
 */
export function getFallbackThresholds() {
  return {
    // Fail test if more than 5% of requests fail (basic reliability gate)
    http_req_failed: ['rate<0.05']
  };
}
