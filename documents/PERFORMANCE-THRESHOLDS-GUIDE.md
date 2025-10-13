# Performance Thresholds Guide

This guide explains how performance thresholds are defined, loaded, and overridden in the test framework.

## 1. Canonical Source
The single source of truth is `src/config/performance-thresholds.json`.
If the file is missing, an embedded minimal emergency default is used (avoid relying on this).

## 2. File Structure
```jsonc
{
  "defaults": {
    "maxResponseTimeMs": 5000,
    "apdexT": 500,
    "k6": {
      "http_req_duration": { "p95": 4500, "p99": 8000 },
      "http_req_failed": { "rate": 0.05 }
    }
  },
  "operations": { /* per-operation group_duration overrides */ },
  "uiBands": { /* classification bands for report visuals */ }
}
```
- `defaults.k6` -> global k6 thresholds applied unless overridden by operation-specific rules or scenario multipliers.
- `operations` -> keys are human readable operation names; inside each, keys under `k6` map full metric names (e.g. `group_duration{group:::Attach Documents to JP}`) to p95/p99 targets.
- `uiBands` -> affects only UI coloring / labels, not pass/fail logic.

## 3. Scenario & Environment Modifiers
`src/config/performance-threshold-profiles.json` optionally adds multipliers per scenario or environment:
```jsonc
{
  "scenarios": { "smoke_test": { "multipliers": { "http_req_duration.p95": 1.5 } } },
  "environments": { "dev": { "multipliers": { "http_req_duration.p95": 1.3 } } }
}
```
These adjust only the global `http_req_duration` targets currently. Extend the pattern if you need per-group multipliers.

## 4. Environment Variable Overrides
During `getPerformanceThresholds()` the following env variables (if set) override values:
- `MAX_RESPONSE_TIME_MS` or `OP_RESPONSE_MAX_MS` -> overrides `defaults.maxResponseTimeMs`
- `APDEX_T` or `APDex_T` -> overrides `defaults.apdexT`
- `PERFORMANCE_THRESHOLDS_FILE` -> points loader to an alternate thresholds JSON

## 5. Threshold Injection Precedence
When building k6 options:
1. Explicit thresholds already present in a test script/config (`options.thresholds`)
2. Operation-level definitions in `operations.*.k6`
3. `defaults.k6` global definitions
4. (Fallback) Derived rule from `defaults.maxResponseTimeMs` only if no explicit http_req_duration rule exists (implemented in builder logic)
Profile multipliers applied where relevant.

## 6. Updating a Threshold
Example: Increase p95 for attaching documents group.
Edit: `operations["Upload Document"].k6["group_duration{group:::Attach Documents to JP}"].p95`

## 7. Attachment Timeout vs Threshold
`ATTACH_DOCS_BATCH_LIMIT_MS` is an application safety timeout (internal logic) and not a k6 threshold. Keep it aligned with or slightly above the operation's p99 to avoid false negatives.

## 8. Adding a New Operation Threshold
1. Add human-friendly operation name under `operations`.
2. Inside, add `k6` object.
3. Use the exact metric name as key (e.g. `group_duration{group:::My New Operation}`)
4. Provide `{ "p95": <number>, "p99": <number?> }`.
5. Re-run test; k6 options builder will merge it automatically.

## 9. Extending Multipliers to Group Metrics (Optional)
Add keys like `group_duration{group:::Attach Documents to JP}.p95` under a scenario/environment `multipliers` block.

## 10. Validation & Governance
- Scripts disallow inline threshold arrays in test files; central JSON must be used.
- Consider adding a JSON Schema and a validation npm script (already present if you ran earlier setup).

## 11. Troubleshooting
| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Threshold not applied | Metric name mismatch | Confirm exact metric name in k6 summary and JSON key |
| Scenario multiplier ignored | Key path wrong | Use `http_req_duration.p95` format |
| UI shows red but test passes | UI bands only | Adjust `uiBands.latencyMs` |
| Test fails unexpectedly after raising group p95 | Profile multiplier lowering it | Check `performance-threshold-profiles.json` |

## 12. Recommended Review Cadence
- Monthly sanity check of global p95/p99 vs real trend medians.
- Post-release: compare last build deltas in report; adjust only after investigating regressions.

## 13. Change Control Tips
- Bump p95 modestly (5–10%) unless major architectural change.
- Avoid raising both p95 and p99 simultaneously unless clearly justified.
- Record rationale in commit message: "Raise Attach Documents p95 6500→7000 due to larger file mix introduced (see run 2025-10-13)."

---
Maintaining all threshold values in one JSON keeps performance governance auditable and reduces drift across scripts.
