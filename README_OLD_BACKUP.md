# WebSak Plus K6 Performance Tests

Modular performance testing framework for WebSak Plus, featuring scenario-based load testing for Case (Sak) and Journal Post (JP) creation workflows.

## � Recent Updates (October 3, 2025)

✅ **Fixed document attachment failures** - Resolved 404/405 errors  
✅ **Created centralized payload builders** - Reusable `buildJpDocumentPayload()` and `buildMultipartFormData()`  
✅ **Simplified attachment logic** - Reduced code by 67%, improved test execution by 87%  
✅ **Enhanced documentation** - Added comprehensive guides and architecture diagrams

📖 **Documentation:**
- [`FIX_SUMMARY.md`](./FIX_SUMMARY.md) - Quick overview of changes
- [`PAYLOAD_BUILDERS_GUIDE.md`](./PAYLOAD_BUILDERS_GUIDE.md) - How to use centralized builders
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) - System architecture and data flows
- [`CHANGES_SUMMARY.md`](./CHANGES_SUMMARY.md) - Detailed technical changes

## �🎯 Active Test Scripts

### 1. Create Sak (Case) Test
**File:** `tests/create-sak.js`
- Creates new Cases in WebSak Plus
- Uses scenario-based configuration from `autotest.json`
- Supports smoke, load, stress, spike, and endurance testing
- Dynamic user allocation from JSON user config
- Comprehensive validation and HTML reporting

### 2. Create JP (Journal Post) Test
**File:** `tests/create-jp.js`
- Complete workflow: Creates Case → Creates Journal Post
- Template selection logic (prioritizes "Ny sak" and "Utgående dokument")
- Scenario-based load testing via environment variables
- Enhanced JP ID extraction from multiple response locations
- Full integration with autotest.json configuration

### 3. Create JP With Multiple Documents Test
**File:** `tests/create-jp-with-multiple-document.js`
- Extended workflow: Case → Journal Post → Multiple document attachment attempts
- Configurable document count (`DOC_COUNT`), MIME types (`DOC_MIME` / `DOC_MIME_LIST`), and synthetic size pattern (`DOC_SIZE_BASE`, `DOC_SIZE_STEP`)
- Supports attaching real files from repository via `DOC_FILES` (comma-separated paths) with base64 or plain text mode (`DOC_FILE_MODE`)
- Early-exit on first failed attachment to avoid inflating failure rate when endpoint under discovery
- Optional discovery & silent modes via `JP_ATTACH_DISCOVERY`, `JP_ATTACH_SILENT`
- Centralized attachment endpoint list now resides in `websak-api-config.json` (`jpAttachCandidates`)

## 📁 Project Structure

```
k6-tests/
├── package.json                     # NPM scripts for all scenarios & reports
├── README.md                        # This documentation
├── (removed) config/                # Legacy folder removed; configs now live under utils/modules/config
├── tests/
│   ├── create-sak.js                # Case creation performance test
│   └── create-jp.js                 # Case + Journal Post workflow test
├── utils/
│   ├── api-client.js                # Low-level HTTP wrapper(s)
│   ├── auth.js                      # Shared auth helpers (non‑module usage)
│   ├── config-loader.js             # Generic config file loader
│   ├── pacing.js                    # Think time / pacing utilities
│   ├── report-generator.js          # Enhanced HTML report generator
│   ├── validation.js                # Common validation helpers
│   └── modules/                     # Modular high-level building blocks
│       ├── auth-module.js           # OAuth2 authentication logic
│       ├── case-module.js           # Case template retrieval & creation
│       ├── jp-module.js             # Journal Post template & creation
│       ├── config-manager.js        # Scenario-based config orchestration
│       └── config/
│           ├── autotest.json        # Canonical active scenario/thresholds
│           ├── dev.json             # Dev variant (optional)
│           └── data/
│               ├── users-config.json       # OAuth2 credentials (7 users)
│               ├── websak-api-config.json  # API + register endpoints
│               └── Endpoints.Config file   # Additional endpoint metadata (if present)
└── reports/                          # Generated artefacts (post‑run)
  ├── create-sak-report.html       # SAK test HTML report
  ├── create-sak-summary.json      # SAK test raw metrics
  ├── create-jp-report.html        # JP test HTML report
  └── create-jp-summary.json       # JP test raw metrics
```

## ⚙️ Configuration System

Both tests use scenario-based configuration from `autotest.json`:

| Configuration | Location | Purpose |
|--------------|----------|---------|
| **Load Test Scenarios** | `autotest.json` → `loadTest.scenarios` | Defines smoke, load, stress, spike, endurance patterns |
| **Active Scenario** | `autotest.json` → `loadTest.activeScenario` | Default scenario when no override specified |
| **User Credentials** | `users-config.json` | OAuth2 client credentials (round-robin allocation) |
| **API Endpoints** | `websak-api-config.json` → `api.endpoints` | Base URLs and core endpoints |
| **JP Attachment Endpoints** | `websak-api-config.json` → `api.endpoints.jpAttach` / `jpAttachCandidates` | Primary + fallback document attach paths |

#### Centralized JP Endpoints (Attachment)
`websak-api-config.json` now contains dedicated keys for Journal Post document handling:

```
"jpAttach": "/api/websak/api/jp/{jpId}/dokumenter",
"jpDocuments": "/api/websak/api/jp/{jpId}/dokumenter",
"jpAttachCandidates": [
  "/api/websak/api/jp/{jpId}/dokumenter",
  "/api/websak/api/jp/{jpId}/dokumenter/ny",
  "/api/websak/api/jp/{jpId}/dokument",
  "/api/websak/api/jp/{jpId}/innhold",
  "/api/websak/api/dokument/ny?jpId={jpId}",
  "/api/websak/api/dokument/{jpId}/innhold",
  "/api/websak/api/jp/{jpId}/dokumentinnhold"
]
```

You can override all candidate paths at runtime using env var:
```powershell
$env:JP_ATTACH_PATHS='/api/websak/api/dokument/ny?jpId={jpId}'
```

Attachment payload is generated centrally in `buildJpDocumentPayload()` within `jp-module.js`, so structural changes only need to be made in one place.
| **Register Endpoints** | `websak-api-config.json` → `api.endpoints` | sakstyper, avgjorelsekoder, ordningsprinsipper, ordningsverdierPattern, noekkelord, nymalsak |
| **Thresholds** | `autotest.json` → `thresholds` | Performance SLA definitions |

### Configuration Flags (in test files)

| Flag | Purpose | Value |
|------|---------|-------|
| `USE_DATA_FILE_CONFIG` | Enable scenario-based config | `true` (enabled for both tests) |
| `CONFIG_ENVIRONMENT` | Which config file to use | `autotest` |
| `SCENARIO` (env var) | Override active scenario | e.g., `load_test`, `stress_test` |

**How it works:**
1. `config-manager.js` preloads JSON config files during K6 init phase
2. Test script calls `getK6OptionsWithScenarios(config, scenarioOverride)`
3. K6 executor applies the selected scenario pattern (VUs, duration, ramp stages, etc.)

## 🚀 Running the Tests

### Prerequisites

Install K6: https://k6.io/docs/get-started/installation/

Verify installation:
```powershell
k6 version
```

### Quick Start

```powershell
# 1. Smoke test either workflow (fastest - 1 iteration)
npm run test:create-sak:smoke
npm run test:create-jp:smoke

# 2. Standard load baseline (7 VUs / 5 min)
npm run test:create-sak:load
npm run test:create-jp:load

# 3. Open latest reports (after a run)
npm run report:open       # SAK
npm run report:open:jp    # JP
```

### 📊 Available Test Scenarios

All scenarios are defined in `autotest.json` under `loadTest.scenarios`:

| Scenario | VUs | Duration/Pattern | Purpose | Command Suffix |
|----------|-----|------------------|---------|----------------|
| **smoke_test** | 1 | 1 iteration | Quick validation | `:smoke` |
| **load_test** | 7 | 5 minutes | Normal load baseline | `:load` |
| **stress_test** | 1→7→14 | 14 min ramp | Find breaking points | `:stress` |
| **spike_test** | 2→14→2 | 4 min spike | Test resilience | `:spike` |
| **endurance_test** | 5 | 15 minutes | Long-running stability | `:endurance` |

### 📝 NPM Scripts Reference

All scenario scripts are symmetric for SAK and JP tests.

#### Case (SAK) Tests - Scenario-Based
```powershell
# Specific scenarios
npm run test:create-sak:smoke       # 1 VU, 1 iteration
npm run test:create-sak:load        # 7 VUs, 5 minutes
npm run test:create-sak:stress      # Ramp to 14 VUs (progressive)
npm run test:create-sak:spike       # Sudden spike & recovery
npm run test:create-sak:endurance   # 15 minute soak test

# Default (uses activeScenario from autotest.json)
npm run test:create-sak
```

#### Journal Post (JP) Tests - Scenario-Based
```powershell
# Specific scenarios
npm run test:create-jp:smoke        # 1 VU, 1 iteration
npm run test:create-jp:load         # 7 VUs, 5 minutes
npm run test:create-jp:stress       # Ramp to 14 VUs (progressive)
npm run test:create-jp:spike        # Sudden spike & recovery
npm run test:create-jp:endurance    # 15 minute soak test

# Default (uses activeScenario from autotest.json)
npm run test:create-jp
```

#### Utility / Reporting / Quality
```powershell
npm run report:open        # Open latest SAK HTML report
npm run report:open:jp     # Open latest JP HTML report
npm run report:list        # List available HTML reports
npm run lint               # ESLint (quiet) over tests & utils
npm run format             # Prettier format JS sources
```

#### Complete Script Matrix
| Script | Purpose |
|--------|---------|
| test:create-sak | Run SAK test with default activeScenario |
| test:create-sak:smoke | SAK smoke scenario |
| test:create-sak:load | SAK load scenario |
| test:create-sak:stress | SAK stress scenario |
| test:create-sak:spike | SAK spike scenario |
| test:create-sak:endurance | SAK endurance scenario |
| test:create-jp | Run JP test with default activeScenario |
| test:create-jp:smoke | JP smoke scenario |
| test:create-jp:load | JP load scenario |
| test:create-jp:stress | JP stress scenario |
| test:create-jp:spike | JP spike scenario |
| test:create-jp:endurance | JP endurance scenario |
| report:open | Open SAK HTML report |
| report:open:jp | Open JP HTML report |
| report:list | List generated reports |
| lint | Lint code (ESLint) |
| format | Format code (Prettier) |

#### Report Viewing
```powershell
# Open SAK test report
npm run report:open

# Open JP test report
npm run report:open:jp

# List all reports
npm run report:list
```

### 🔧 Advanced Usage

#### Direct K6 Invocation

Override scenario via environment variable:
```powershell
# JP test with specific scenario
k6 run -e SCENARIO=load_test tests/create-jp.js
k6 run -e SCENARIO=stress_test tests/create-jp.js

# SAK test (uses activeScenario from config)
k6 run tests/create-sak.js
```

Bypass scenarios with manual VU/duration:
```powershell
# Override with custom load pattern
k6 run tests/create-jp.js --vus 10 --duration 3m
k6 run tests/create-sak.js --vus 5 --duration 30s
```

#### Changing Default Scenario

Edit the configuration file to change which scenario runs by default:

**Location:** `utils/modules/config/autotest.json`

```json
{
  "loadTest": {
    "activeScenario": "smoke_test",  // Change this value
    "scenarios": {
---

### 📝 Change Log (Excerpt)

| Date | Version | Change |
|------|---------|--------|
| 2025-10-03 | 1.1.0 | Removed unused CSV loader (`csv-loader.js`) and README references |
      "smoke_test": { ... },
      "load_test": { ... },
      ...
    }
  }
}
```

**Available values:** `smoke_test`, `load_test`, `stress_test`, `spike_test`, `endurance_test`

#### HTTP Debugging

Enable detailed HTTP logging:
```powershell
k6 run --http-debug=full tests/create-jp.js
k6 run --http-debug="headers,body" tests/create-sak.js
```

#### Pacing Control (Disable or Tune Think Time)

Short randomized pauses (e.g. `randomSleep(0.2, 0.7)`) are inserted between logical steps to:
- De-synchronize VUs (avoid burst waves)
- Model basic user “think time”
- Stabilize percentile metrics & throughput
- Reduce artificial contention during template / register lookups

You can override or disable this pacing without editing code using environment variables.

| Env Var | Meaning | Typical Values |
|---------|---------|----------------|
| `PACING_MODE` | Global pacing switch | `normal` (default), `none` |
| `PACE_MIN` | Override minimum seconds for randomSleep | e.g. `0.05` |
| `PACE_MAX` | Override maximum seconds for randomSleep | e.g. `0.15` |

When `PACING_MODE=none`, all pacing sleeps are skipped (maximum raw throughput; less realistic).

PowerShell examples (current repo scripts):
```powershell
# Disable pacing for smoke scenario (fastest functional path)
$env:PACING_MODE='none'; npm run test:create-sak:smoke
$env:PACING_MODE='none'; npm run test:create-jp:smoke

# Disable pacing for a load scenario
$env:PACING_MODE='none'; npm run test:create-sak:load
$env:PACING_MODE='none'; npm run test:create-jp:load

# Disable pacing + explicit scenario override using base script
$env:PACING_MODE='none'; $env:SCENARIO='stress_test'; npm run test:create-sak

# Custom pacing window (narrow think time)
$env:PACE_MIN=0.05; $env:PACE_MAX=0.15; npm run test:create-sak:spike

# Restore default pacing (remove env vars)
Remove-Item Env:PACING_MODE -ErrorAction SilentlyContinue
Remove-Item Env:PACE_MIN -ErrorAction SilentlyContinue
Remove-Item Env:PACE_MAX -ErrorAction SilentlyContinue
```

Direct k6 invocation (bypass npm script):
```powershell
$env:PACING_MODE='none'; k6 run -e SCENARIO=load_test tests/create-sak.js
```

Recommended usage:
- Keep pacing ON for baseline, endurance and comparative trend tests.
- Turn pacing OFF (`PACING_MODE=none`) for stress / spike diagnostics or to measure upper RPS ceiling.
- Use tighter bounds (`PACE_MIN/PACE_MAX`) for latency-sensitive experiments.

If you prefer dedicated npm scripts (e.g. `test:create-sak:load:nopace`), add entries using `cross-env` (not yet added by default) and commit.
##### Dedicated No-Pace Scripts Added
You can now use built-in no‑pace variants:
```powershell
npm run test:create-sak:load:nopace
npm run test:create-sak:stress:nopace
npm run test:create-sak:spike:nopace
npm run test:create-sak:smoke:nopace
npm run test:create-sak:endurance:nopace

npm run test:create-jp:load:nopace
npm run test:create-jp:stress:nopace
npm run test:create-jp:spike:nopace
npm run test:create-jp:smoke:nopace
npm run test:create-jp:endurance:nopace
```

## 📊 HTML Reporting

Both tests generate comprehensive HTML reports using `utils/report-generator.js` (self-contained, no external assets). Markdown summaries are disabled; raw JSON + HTML only.

### Report Files Generated

| Test | HTML Report | JSON Summary |
|------|-------------|--------------|
| **SAK Test** | `reports/create-sak-report.html` | `reports/create-sak-summary.json` |
| **JP Test** | `reports/create-jp-report.html` | `reports/create-jp-summary.json` |

### Report Contents

✅ **Executive Summary**
- Test duration and iteration count
- Total requests and failure rate
- Active scenario details

✅ **Performance Metrics**
- Response time percentile markers (min, median, p90, p95, max)
- Success vs failure donut
- Detailed latency component breakdown (waiting, blocked, TLS, sending, receiving)

✅ **Threshold Status**
- Pass/fail indicators for each defined threshold
- Color coded badges

✅ **Test Configuration**
- Scenario name and description
- VU count and duration
- User count and API host

✅ **APDEX (Approx)**
- Approximate APDEX indicator (based on percentiles) with configurable threshold via `APDEX_T` env var

### Opening Reports & APDEX Override

```powershell
 # Via npm scripts (recommended)
 npm run report:open        # SAK report
 npm run report:open:jp     # JP report
 
 # Override APDEX threshold (default 500 ms)
 $env:APDEX_T=700; npm run test:create-sak:smoke

# Via PowerShell directly
Start-Process reports/create-sak-report.html
Start-Process reports/create-jp-report.html

# List all reports with timestamps
npm run report:list
```

## 🔄 Test Workflows

### Create SAK Test (`create-sak.js`)
**Per VU iteration:**
1. ✅ User assignment (round-robin from 7 users in Config file)
2. ✅ OAuth2 client credentials authentication
3. ✅ Retrieve case templates (GET `/api/register/sakmaler`)
4. ✅ Select "Ny sak" template (or first available)
5. ✅ Generate unique case data (title with VU identifier)
6. ✅ Create new case (POST `/api/sak/ny`)
7. ✅ Pacing sleep (0.3-1.1s for steady throughput)

### Create JP Test (`create-jp.js`)
**Per VU iteration:**
1. ✅ User assignment (round-robin from 7 users in Config file)
2. ✅ OAuth2 client credentials authentication
3. ✅ Retrieve case templates (GET `/api/register/sakmaler`)
4. ✅ Select "Ny sak" template (prioritized)
5. ✅ Create new case (POST `/api/sak/ny`)
6. ✅ Retrieve JP templates for created case (GET `/api/register/sak/{caseId}/jpmaler`)
7. ✅ Select "Utgående dokument" template (prioritized)
8. ✅ Create journal post (POST `/api/jp/ny`)
9. ✅ Extract JP ID from response (multiple fallback locations)
10. ✅ Pacing sleep (0.3-1.1s)

### 🔍 Built-in Validations

Both tests include comprehensive validation and diagnostic logging:
- ✅ Missing users or credentials detection
- ✅ API host / base URL verification
- ✅ Empty template response handling
- ✅ Case creation failure diagnostics
- ✅ JP ID extraction with fallback logic
- ✅ HTTP status code validation (200/201 expected)
- ✅ Response time thresholds
- ✅ Request failure rate monitoring

## Customization Points
- Adjust thresholds in `ORIGINAL_TEST_CONFIG` or `autotest.json`
- Add more scenarios under `loadTest.scenarios` in the JSON
- Extend `case-module.js` for additional domain steps
- Implement journaling in `jp-module.js` (stub reserved)

## 🔧 Troubleshooting

### Common Issues

| Symptom | Likely Cause | Action |
|---------|--------------|--------|
| "No user data available" | JSON parse error or empty file | Verify `users-config.json` contains a `users` array with objects { userName, clientId, clientSecret } |
| "Loaded 0 users from config" | File path or format issue | Check `utils/modules/data/users-config.json` exists and is valid JSON |
| Auth failures (401) | Invalid credentials | Verify entries in `users-config.json` |
| Auth failures (404) | Wrong token endpoint | Check `api.oauth.tokenPath` in `websak-api-config.json` |
| "No templates available" | Permission or endpoint error | Confirm user roles and `api.endpoints.sakmaler` in `websak-api-config.json` |
| Case creation 400/422 | Payload mismatch | Review console logs for validation errors |
| JP creation returns no ID | Backend doesn't return ID | Check for warning logs; creation likely succeeded |
| Report missing | Test aborted early | Re-run with `:smoke` variant; check console output |
| Scenario not found | Wrong scenario name | Check `autotest.json` for valid scenario names |
| Threshold failures | Performance degradation | Review metrics; adjust thresholds if needed |

### Diagnostic Commands

```powershell
# Enable full HTTP debugging
k6 run --http-debug=full tests/create-jp.js

# Show only headers and bodies
k6 run --http-debug="headers,body" tests/create-sak.js

# Run with verbose logging
k6 run --verbose tests/create-jp.js

# Test specific scenario
k6 run -e SCENARIO=smoke_test tests/create-jp.js
```

### Validation Checklist

Before running tests, verify:
- ✅ K6 is installed: `k6 version`
- ✅ JSON config files exist in `utils/modules/data/`
- ✅ `users-config.json` has valid user entries
- ✅ `websak-api-config.json` has correct API endpoints
- ✅ `autotest.json` exists in `utils/modules/config/`
- ✅ Network connectivity to `autotest01.acoscloud.no`

### Console Log Markers

Look for these emoji indicators in console output:
- 🚀 Test start
- 📋 Configuration loaded
- 🎯 Scenario selected
- 🔐 Authentication
- ✅ Success operations
- ❌ Errors
- ⚠️ Warnings
- 🔥 Critical failures
- 📊 Report generation
- 🏁 Test complete

## ⚡ Performance Thresholds

Defined in `autotest.json` under `thresholds`:

| Metric | Threshold | Purpose |
|--------|-----------|---------|
| **http_req_duration** | p(95) < 2s, p(99) < 5s | Response time SLA |
| **http_req_failed** | rate < 5% | Reliability target |
| **http_reqs** | rate > 0.5/s | Minimum throughput |
| **iteration_duration** | p(95) < 30s | End-to-end iteration time |

**⚠️ Test fails if any threshold is breached.**

## 🎨 Customization

### Adding New Scenarios

Edit `utils/modules/config/autotest.json`:

```json
{
  "loadTest": {
    "scenarios": {
      "your_custom_scenario": {
        "executor": "ramping-vus",
        "startVUs": 1,
        "stages": [
          { "duration": "1m", "target": 5 },
          { "duration": "3m", "target": 10 },
          { "duration": "1m", "target": 0 }
        ]
      }
    },
    "descriptions": {
      "your_custom_scenario": "Custom load pattern description"
    }
  }
}
```

Then add npm script to `package.json`:
```json
"test:create-jp:custom": "k6 run -e SCENARIO=your_custom_scenario tests/create-jp.js"
```

### Adjusting Thresholds

Edit `autotest.json` to match your SLA requirements:
```json
{
  "thresholds": {
    "http_req_duration": ["p(95)<3000"],    // Relax to 3 seconds
    "http_req_failed": ["rate<0.1"]         // Allow 10% failures
  }
}
```

### Creating New Tests

When adding new test scenarios:
1. Create new script in `tests/` (e.g., `search-documents.js`)
2. Import and use existing modules from `utils/modules/`
3. Add npm scripts to `package.json`
4. Update this README with test description
5. Configure reports to `reports/` directory

**Example module usage:**
```javascript
import { loadTestConfig, getK6OptionsWithScenarios } from '../utils/modules/config-manager.js';
import { authenticate } from '../utils/modules/auth-module.js';
import { generateEnhancedReport } from '../utils/html-reporter.js';
```

## 🗺️ Roadmap & Future Enhancements

**Completed ✅**
- Scenario-based load testing (smoke, load, stress, spike, endurance)
- Environment variable scenario override (`SCENARIO`)
- Enhanced JP ID extraction with multiple fallback locations
- Comprehensive HTML reporting with threshold status
- Both SAK and JP workflow tests

**In Progress 🔄**
- Document attachment to Journal Posts
- Search and filter operations testing

**Planned 📋**
- Integration with InfluxDB/Grafana for real-time metrics
- CI/CD pipeline integration (GitHub Actions)
- Synthetic data generation for varied payloads
- Retry/backoff logic for transient 5xx errors
- Multi-region testing support
- Performance baseline tracking over time

## 📚 Additional Resources

- **K6 Documentation:** https://k6.io/docs/
- **Scenario Executors:** https://k6.io/docs/using-k6/scenarios/executors/
- **Thresholds Guide:** https://k6.io/docs/using-k6/thresholds/
- **Metrics Reference:** https://k6.io/docs/using-k6/metrics/
- **HTTP Debugging:** https://k6.io/docs/using-k6/http-debugging/

## 📞 Support & Best Practices

### Quick Debugging Steps

1. **Check Console Logs**
   - Look for 🔥 (critical errors) and ⚠️ (warnings)
   - Search for "VALIDATION" blocks for detailed checks

2. **Review JSON Reports**
   - Inspect `reports/*-summary.json` for raw metric values
   - Check `http_req_failed` rate and error details

3. **Verify Configuration**
  - Ensure `users-config.json` lists all required users
  - Check `websak-api-config.json` endpoints are correct
  - Confirm `autotest.json` scenarios are properly defined

4. **Test Incrementally**
   - Always start with `:smoke` variant before longer tests
   - Use `--http-debug=full` for detailed HTTP inspection
   - Check network connectivity to `autotest01.acoscloud.no`

### Best Practices

✅ **Before Testing:**
- Verify K6 installation: `k6 version`
- Check JSON config files exist (`users-config.json`, `websak-api-config.json`)
- Review threshold values in `autotest.json`
- Ensure target environment is accessible

✅ **During Testing:**
- Monitor console for validation failures
- Watch for threshold breaches in real-time
- Check resource usage on test machine

✅ **After Testing:**
- Review HTML reports for detailed analysis
- Compare metrics against baseline
- Document any threshold failures
- Archive reports for trend analysis

---

## 🧩 Externalized Register Endpoints

Previously hardcoded register-related API paths are now configured in `utils/modules/data/websak-api-config.json` under `api.endpoints`.

| JSON Field | Purpose | Consumed By |
|------------|---------|-------------|
| `sakstyper` | List case types | `getSakstyper` |
| `avgjorelsekoder` | List decision codes | `getAvgjorelsekoder` |
| `ordningsprinsipper` | List classification principles | `getOrdningsprinsipper` |
| `ordningsverdierPattern` | Pattern with placeholders | `getOrdningsverdier` |
| `noekkelord` | List keywords | `getNoekkelord` |
| `nymalsak` | Create case from template | `createMalSak` |

### Updating an Endpoint
1. Open the JSON file.
2. Modify the value (keep `{prinsipp}` / `{sakstype}` placeholders intact in patterns).
3. Save the file and re-run the test (loaded at init phase).

### Pattern Replacement
`getOrdningsverdier` replaces `{prinsipp}` and `{sakstype}` dynamically. If the pattern column is blank, a built-in default is used.

### Benefits
Centralizes environment-specific path changes, avoids editing multiple JS modules, and keeps test logic stable across dev/test/prod.


**Project Status:** ✅ Production Ready  
**Last Updated:** October 3, 2025  
**Version:** 1.1.1  
**Active Tests:** 2 (Create SAK + Create JP)  
**Scenarios:** 5 (smoke, load, stress, spike, endurance)  
**Users:** 7 (OAuth2 client credentials)

---

## 🔐 Environment Variables Reference (Unified)

Set with PowerShell before running (example):
```powershell
$env:PACING_MODE='none'; $env:SCENARIO='load_test'; npm run test:create-sak
```

### Pacing & Think Time
| Var | Default | Description |
|-----|---------|-------------|
| `PACING_MODE` | `normal` | `none` disables all sleeps (max throughput) |
| `PACE_MIN` | 0.2 | Lower bound seconds for random pacing sleeps |
| `PACE_MAX` | 1.0 | Upper bound seconds for random pacing sleeps |
| `PACE_FIXED` | (unset) | If set, use fixed sleep (seconds) instead of random range |

### Scenario Override
| Var | Example | Description |
|-----|---------|-------------|
| `SCENARIO` | `stress_test` | Overrides `activeScenario` in config |

### Classification Threshold Overrides
| Var | Default | Meaning |
|-----|---------|---------|
| `LAT_P95_GOOD_MS` | 500 | p95 latency <= this is GOOD |
| `LAT_P95_WARN_MS` | 1000 | p95 latency <= this is WARN ( > GOOD ) |
| `ERR_RATE_WARN` | 0.01 | Error rate above this → WARN |
| `ERR_RATE_BAD` | 0.05 | Error rate above this → BAD |
| `CHECK_FAIL_WARN` | 0.01 | Check failure rate WARN threshold |
| `CHECK_FAIL_BAD` | 0.05 | Check failure rate BAD threshold |
| `KPI_SUCCESS_GOOD` | 0.99 | Success ratio GOOD floor |
| `KPI_SUCCESS_WARN` | 0.95 | Success ratio WARN floor |

### Report Feature Toggles
| Var | Default | Description |
|-----|---------|-------------|
| `ENABLE_DARK_MODE` | false | Set to true to start report in dark mode |
| `ENABLE_SPARKLINES` | true | Enable inline percentile distribution spark bars |

### Baseline Comparison
| Var | Description |
|-----|-------------|
| `BASELINE_JSON` | Raw JSON string of a prior `*-summary.json` for delta comparison |

### Error Sampling & Diagnostics
| Var | Default | Description |
|-----|---------|-------------|
| `ERROR_SAMPLE_LIMIT` | 25 | Max captured error samples (response snippets) |
| `ERROR_SAMPLE_BODY_BYTES` | 2048 | Truncate body capture to this size |

### APDEX / QoE Approximation
| Var | Default | Description |
|-----|---------|-------------|
| `APDEX_T` | 500 | Tolerable threshold (ms) if APDEX approximation used |

### Practical Tips
1. Keep WARN and BAD thresholds separated enough to avoid constant orange/red flicker.
2. Set `BASELINE_JSON` in ephemeral CI (where previous file system state is unavailable) to retain historical comparison.
3. Use pacing ON for longitudinal trend accuracy; OFF only for ceiling or burst tests.
4. Reduce `ERROR_SAMPLE_LIMIT` for very high error-rate chaos tests to protect memory.


