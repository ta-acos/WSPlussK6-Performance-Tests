/**
 * Pacing helpers for k6 VU flows.
 * Keeps all random sleep logic in one place for consistency and future tuning.
 */
import { sleep } from 'k6';

// Environment-driven pacing controls
// PACING_MODE=none      -> disable all pacing sleeps
// PACE_MIN / PACE_MAX   -> override default bounds (in seconds) for randomSleep
// Defaults chosen for moderate user think time realism.
function shouldPace() {
  return (__ENV.PACING_MODE || 'normal').toLowerCase() !== 'none';
}

function resolveBounds(minSeconds, maxSeconds) {
  const envMin = parseFloat(__ENV.PACE_MIN);
  const envMax = parseFloat(__ENV.PACE_MAX);
  const min = isNaN(envMin) ? minSeconds : envMin;
  const max = isNaN(envMax) ? maxSeconds : envMax;
  if (max <= min) return { min, max: min }; // safeguard
  return { min, max };
}

/** Sleep random time between min and max seconds (float). */
export function randomSleep(minSeconds = 0.2, maxSeconds = 1.0) {
  if (!shouldPace()) return; // pacing disabled
  const { min, max } = resolveBounds(minSeconds, maxSeconds);
  const dur = Math.random() * (max - min) + min;
  sleep(dur);
}

/** Sleep with a biased distribution (short spikes less frequent). */
export function weightedSleep(short = 0.3, long = 1.5, weightLong = 0.25) {
  if (!shouldPace()) return;
  const useLong = Math.random() < weightLong;
  randomSleep(useLong ? long * 0.7 : short * 0.5, useLong ? long : short);
}

/** Deterministic pacing for smoke tests (constant small delay). */
export function steadySleep(delaySeconds = 0.4) {
  if (!shouldPace()) return;
  const envFixed = parseFloat(__ENV.PACE_FIXED || '');
  const d = isNaN(envFixed) ? delaySeconds : envFixed;
  sleep(d);
}
