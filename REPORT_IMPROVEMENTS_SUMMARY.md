# HTML Report Improvements Summary

## Changes Made

### 1. Enhanced Test Metadata Collection

**File:** `tests/create-multiplejp-with-multiple-document.js`

#### Added Error Sampling Import
```javascript
import { injectErrorAnalyticsIntoSummary } from '../utils/error-sampler.js';
```

#### Enhanced setup() Function
The `setup()` function now returns comprehensive metadata for the HTML report:
```javascript
return {
  started: true,
  configEnvironment: CONFIG_ENVIRONMENT,        // "autotest"
  useDataFileConfig: USE_DATA_FILE_CONFIG,      // true
  testName: 'create-multiplejp-with-multiple-document',
  incomingCount: INCOMING_COUNT,                // 1, 2, etc.
  outgoingCount: OUTGOING_COUNT,                // 1, 2, etc.
  docCount: DOC_COUNT,                          // 2, 3, etc.
  useBatchUpload: USE_BATCH_UPLOAD,             // true/false
  useTestDocs: USE_TEST_DOCS,                   // true/false
  preloadedDocsCount: preloadedTestDocuments.length,
  scenarioOverride: SCENARIO_OVERRIDE,          // "smoke_test", etc.
  baseUrl: config.baseUrl                       // API host
};
```

#### Updated handleSummary() Function
Now injects error analytics before generating the report:
```javascript
export function handleSummary(data) {
  // Inject error analytics into summary data
  injectErrorAnalyticsIntoSummary(data);
  
  const apdexEnv = __ENV.APDEX_T || __ENV.APDex_T;
  const apdexT = apdexEnv ? parseInt(apdexEnv, 10) : 500;
  const html = generateHtmlReport(data, { apdexT });
  
  return {
    'reports/create-multiplejp-with-multiple-document-summary.json': JSON.stringify(data, null, 2),
    'reports/create-multiplejp-with-multiple-document-report.html': html,
    stdout: ''
  };
}
```

## What's Fixed in the Report

### Before Changes
- ❌ Environment: n/a
- ❌ Use Data File Config: n/a
- ❌ Group breakdown unavailable
- ❌ No error samples captured (even when errors occurred)
- ❌ Top Failing Endpoints: empty

### After Changes
- ✅ **Environment:** autotest (properly displayed)
- ✅ **Use Data File Config:** true (properly displayed)
- ✅ **Metadata includes:**
  - Test name
  - Incoming/Outgoing JP counts
  - Document count per JP
  - Batch upload mode
  - Test documents usage
  - Scenario override
  - Base URL
- ✅ **Error Sampling:** Errors are now captured when they occur (via existing error-sampler.js)
- ✅ **Group Breakdown:** Available when groups exist in test execution
- ✅ **Failing Endpoints:** Tracked and displayed when failures occur

## Test Results

### Latest Successful Test Run
```
✅ Test: create-multiplejp-with-multiple-document
✅ Scenario: smoke_test
✅ Duration: 6.6 seconds
✅ Iterations: 1/1 completed

Results:
- Authenticated: TA_ARK ✅
- Case Templates: 34 retrieved ✅
- Case Created: ID 1101163724 ✅
- Incoming JPs: 1/1 created ✅
- Outgoing JPs: 1/1 created ✅
- Documents Attached: 4 total (2 per JP) ✅
```

### Captured Metadata in Report
```json
{
  "started": true,
  "testName": "create-multiplejp-with-multiple-document",
  "useBatchUpload": true,
  "useTestDocs": false,
  "baseUrl": "https://autotest01.acoscloud.no",
  "docCount": 2,
  "outgoingCount": 1,
  "scenarioOverride": "smoke_test",
  "useDataFileConfig": true,
  "configEnvironment": "autotest",
  "incomingCount": 1,
  "preloadedDocsCount": 0
}
```

## How to View Reports

### Open HTML Report
```powershell
Start-Process "reports\create-multiplejp-with-multiple-document-report.html"
```

### View JSON Summary
```powershell
Get-Content "reports\create-multiplejp-with-multiple-document-summary.json" | ConvertFrom-Json | Format-List
```

### Check Metadata
```powershell
Get-Content "reports\create-multiplejp-with-multiple-document-summary.json" | ConvertFrom-Json | Select-Object -ExpandProperty setup_data | Format-List
```

## Error Capture

The error sampling system is now fully integrated:
- **Automatic:** Errors are captured automatically when HTTP requests fail
- **Limited:** Up to 25 error samples stored (configurable via ERROR_SAMPLE_LIMIT)
- **Body Truncation:** Error response bodies truncated to 2KB (configurable via ERROR_SAMPLE_BODY_BYTES)
- **Top Failures:** Endpoints with most failures are ranked and displayed

### When Errors Occur
The report will show:
1. **Error Samples** section with:
   - Timestamp
   - HTTP status code
   - Endpoint
   - Request method
   - Response body (truncated)
2. **Top Failing Endpoints** table with failure counts

## Benefits

1. ✅ **Complete Test Context:** All test parameters visible in report
2. ✅ **Environment Tracking:** Know which environment was tested
3. ✅ **Configuration Visibility:** Understand test configuration at a glance
4. ✅ **Error Diagnostics:** Failed requests captured for troubleshooting
5. ✅ **Failure Analysis:** Top failing endpoints identified quickly
6. ✅ **Audit Trail:** Full metadata for compliance and debugging

## Related Files

- **Test File:** `tests/create-multiplejp-with-multiple-document.js`
- **Report Generator:** `utils/report-generator.js`
- **Error Sampler:** `utils/error-sampler.js`
- **Config Files:** `utils/modules/config/autotest.json`, `dev.json`
- **Reports Output:** `reports/` directory

## Running Different Scenarios

```powershell
# Smoke test (quick validation)
& "C:\Program Files\k6\k6.exe" run tests/create-multiplejp-with-multiple-document.js -e SCENARIO=smoke_test --vus 1 --iterations 1

# With test documents
& "C:\Program Files\k6\k6.exe" run tests/create-multiplejp-with-multiple-document.js -e SCENARIO=smoke_test -e USE_TEST_DOCS=true --vus 1 --iterations 1

# Custom JP and document counts
& "C:\Program Files\k6\k6.exe" run tests/create-multiplejp-with-multiple-document.js -e INCOMING_COUNT=3 -e OUTGOING_COUNT=2 -e DOC_COUNT=5 --vus 1 --iterations 1

# Load test scenario
& "C:\Program Files\k6\k6.exe" run tests/create-multiplejp-with-multiple-document.js -e SCENARIO=load_test
```

## Notes

- The error sampler is already integrated in the case-module and jp-module
- Metadata is preserved in both JSON and HTML reports
- All changes are backward compatible
- No breaking changes to existing tests
