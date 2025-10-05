# Understanding Test Success vs Performance Thresholds

## Your Observation
> "I see that we have some failures but Key Performance Indicators shows 100% success"

You're absolutely correct to notice this! This is an important distinction in performance testing. Let me explain what's happening.

---

## The Two Types of "Success"

### 1. **Functional Success (Request Success Rate)** ✅ 100%
This measures whether HTTP requests completed successfully:
- Did the API respond with 2xx status codes?
- Were cases, journal posts, and documents created successfully?
- Did any requests fail with 4xx or 5xx errors?

**Your test: 100% success** ✅
- All HTTP requests returned 2xx status
- All cases were created
- All journal posts were created
- All documents were attached
- Zero HTTP errors

### 2. **Performance Success (Threshold Compliance)** ❌ FAILED
This measures whether the system met **performance expectations**:
- Were responses fast enough?
- Did latency stay within acceptable limits?
- Were performance SLOs (Service Level Objectives) met?

**Your test: FAILED** ❌
- Threshold: `p(95) < 2000ms` (95% of requests should be under 2 seconds)
- Actual: `p(95) = 2358.99ms` (95% of requests were under 2.36 seconds)
- **Result**: Exceeded threshold by 358ms

---

## What Happened in Your Test

### ✅ Functional Success (100%)
```
✓ Authenticated: TA_ARK
✓ Retrieved 34 case templates
✓ Created case: ID 1101163725
✓ Created 1 incoming JP: ID 1101115403
✓ Created 1 outgoing JP: ID 1101115404
✓ Attached 4 documents (2 per JP)
✓ HTTP Error Rate: 0%
```

### ❌ Performance Failure
```
Threshold: p(95) < 2000ms
Actual:    p(95) = 2358.99ms
Exceeded by: 358ms (17.9% slower)

Latency Breakdown:
- Min: 1154.87ms
- Avg: 1788.62ms
- p90: 2295.61ms
- p95: 2358.99ms ← THRESHOLD BREACH
- Max: 2422.36ms
```

---

## Why K6 Exited with Code 1

K6 considers a test **failed** if:
1. ❌ Any threshold is breached (even if all requests succeed)
2. ❌ HTTP errors exceed configured limits
3. ❌ Checks fail

In your case:
- ✅ All HTTP requests succeeded
- ❌ **Performance threshold failed** → Exit Code 1

This is **correct behavior**. The system works functionally, but it's **too slow** according to your performance requirements.

---

## Updated Report - What's Changed

### Before
```
Key Performance Indicators
┌────────────────────┐
│ Success Rate       │
│ 100%               │  ← Confusing: "100% but test failed?"
└────────────────────┘
```

### After (Improved)
```
Key Performance Indicators
┌───────────────────────────────────┐
│ Overall Test Status               │
│ Attention                         │  ← Clear overall status
│ 1/2 thresholds failed: http_req_ │
│ duration :: p(95)<2000            │
└───────────────────────────────────┘
┌────────────────────┐
│ Request Success    │
│ Rate               │
│ 100%               │  ← Clarified: "Request" success
│ HTTP errors 0.00%  │
└────────────────────┘
```

Now the report shows:
1. **Overall Test Status**: "Attention" (because threshold failed)
2. **Request Success Rate**: 100% (all HTTP requests succeeded)
3. Clear distinction between functional and performance success

---

## What This Means for You

### Is this a problem?
**It depends on your requirements:**

✅ **If you care about functionality only:**
- System works perfectly
- All operations completed successfully
- No errors

⚠️ **If you care about performance:**
- System is **17.9% slower** than target
- User experience may be degraded
- Need to investigate slow endpoints

### Recommendations

#### Option 1: Investigate Performance Issues
If 2 seconds p(95) is a real requirement:
1. Identify which endpoints are slow
2. Optimize database queries
3. Add caching
4. Scale infrastructure
5. Reduce payload sizes

#### Option 2: Adjust Thresholds
If the current performance is acceptable:
```json
// In autotest.json
"thresholds": {
  "http_req_duration": [
    "p(95)<2500",  // Changed from 2000 to 2500
    "p(99)<5000"
  ]
}
```

---

## Detailed Latency Analysis

### Current Performance
| Metric | Value (ms) | Status |
|--------|-----------|--------|
| Min | 1154.87 | ✅ Good |
| Average | 1788.62 | ✅ Good |
| Median | 1788.62 | ✅ Good |
| p(90) | 2295.61 | ⚠️ Watch |
| **p(95)** | **2358.99** | ❌ **Exceeded threshold** |
| p(99) | N/A | - |
| Max | 2422.36 | ⚠️ Slow |

### Threshold Analysis
```
Target:  ═══════════════════════════════════════════════ 2000ms
Actual:                                           ║      2358ms
                                                  ▲
                                             359ms over
```

---

## How to Read the Updated Report

### 1. Check Overall Status First
```
┌───────────────────────────────┐
│ Overall Test Status           │
│ Healthy / Attention / Action  │ ← Start here
└───────────────────────────────┘
```
- **Healthy**: All thresholds passed ✅
- **Attention**: Some thresholds failed ⚠️
- **Action Needed**: Many thresholds failed ❌

### 2. Then Check Request Success Rate
```
┌─────────────────────┐
│ Request Success Rate│
│ 100%                │ ← Functional correctness
└─────────────────────┘
```
- Shows if HTTP requests succeeded
- Separate from performance

### 3. Review Performance Metrics
```
┌──────────────────┐
│ Avg Duration (ms)│
│ 1788.62          │ ← Performance indicators
│ p95 2358.99      │
└──────────────────┘
```

### 4. Scroll to Thresholds Section
See exactly which thresholds failed and by how much.

---

## Common Scenarios

### Scenario 1: 100% Success + All Thresholds Pass ✅
```
Overall Status: Healthy
Request Success: 100%
Thresholds: All passed
```
**Meaning**: Perfect! System is functional AND fast.

### Scenario 2: 100% Success + Some Thresholds Fail ⚠️ (YOUR CASE)
```
Overall Status: Attention
Request Success: 100%
Thresholds: 1/2 failed (performance)
```
**Meaning**: System works but is too slow. Needs performance optimization.

### Scenario 3: <100% Success + Thresholds Pass
```
Overall Status: Action Needed
Request Success: 95%
Thresholds: All passed (but error rate threshold allows 5%)
```
**Meaning**: Some requests failed but within acceptable limits. Investigate errors.

### Scenario 4: <100% Success + Thresholds Fail ❌
```
Overall Status: Action Needed
Request Success: 90%
Thresholds: 3/5 failed
```
**Meaning**: Serious issues. System has both functional failures and performance problems.

---

## Next Steps

### Immediate Actions
1. ✅ **Report updated** - Now shows clear distinction
2. 📊 Open report: `reports/create-multiplejp-with-multiple-document-report.html`
3. 👀 Check "Overall Test Status" KPI (first card)
4. 📈 Review "Thresholds" section for details

### Performance Investigation
If you want to fix the performance issue:

```powershell
# Run with more detailed output
& "C:\Program Files\k6\k6.exe" run tests/create-multiplejp-with-multiple-document.js `
  -e SCENARIO=smoke_test `
  --out json=reports/detailed-results.json

# Check which specific operations are slow
# Look at group_duration metrics in the report
```

### Adjust Thresholds
If current performance is acceptable:

**Edit:** `utils/modules/config/autotest.json`
```json
{
  "thresholds": {
    "http_req_duration": [
      "p(95)<2500",  // Increased from 2000 to 2500
      "p(99)<5000"
    ],
    "http_req_failed": ["rate<0.05"],
    "http_reqs": ["rate>0.5"],
    "iteration_duration": ["p(95)<30000"]
  }
}
```

Then re-run:
```powershell
& "C:\Program Files\k6\k6.exe" run tests/create-multiplejp-with-multiple-document.js `
  -e SCENARIO=smoke_test `
  -e INCOMING_COUNT=1 `
  -e OUTGOING_COUNT=1 `
  -e DOC_COUNT=2 `
  --vus 1 --iterations 1
```

---

## Summary

| Question | Answer |
|----------|--------|
| Did the test create everything successfully? | ✅ Yes - 100% success |
| Did any HTTP requests fail? | ✅ No - 0% errors |
| Did the system meet performance targets? | ❌ No - p(95) exceeded by 359ms |
| Is this a critical issue? | ⚠️ Depends on your SLOs |
| Should I be concerned? | Investigate if <2s is a hard requirement |

**Bottom line**: Your system **works correctly** but is **slightly slower than target**. The updated report now makes this distinction clear with the "Overall Test Status" KPI showing "Attention" while "Request Success Rate" shows 100%.

---

## Files Changed

- `utils/report-generator.js` - Added "Overall Test Status" KPI and clarified "Request Success Rate"
- Report now clearly distinguishes functional vs performance success

## View Report

```powershell
Start-Process "reports\create-multiplejp-with-multiple-document-report.html"
```
