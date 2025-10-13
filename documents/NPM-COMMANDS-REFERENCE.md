# 📋 K6 Performance Testing - Complete NPM Commands Reference Guide

**Version:** 3.0.0  
**Last Updated:** October 10, 2025  
**Project:** ACOS GRAF Load Test - WebSak Plus Performance Testing Framework

---

## 📖 Table of Contents
1. [Quick Start Commands](#-quick-start-commands-for-non-technical-users)
2. [Test Scenarios Explained](#-test-scenarios-explained)
3. [Create SAK (Case) Tests](#-create-sak-case-tests)
4. [Create JP (Journal Post) Tests](#-create-jp-journal-post-tests)
5. [Create JP with Multiple Documents Tests](#-create-jp-with-multiple-documents-tests)
6. [Create Multiple JPs with Documents Tests](#-create-multiple-jps-incoming--outgoing-with-documents-tests)
7. [Verbose Logging Commands](#-verbose-logging-commands-detailed-debug-output)
8. [HTML Report Generation Commands](#-html-report-generation-commands)
9. [Run All Tests Commands](#-run-all-tests-commands-autotestjson-configuration)
10. [Environment-Specific Tests](#-environment-specific-tests)
11. [Report Management](#-report-management-commands)
12. [Development & Utility Commands](#-development--utility-commands)

---

## 🚀 Quick Start Commands (For Non-Technical Users)

| NPM Command | Actual K6 Command | Description |
|-------------|-------------------|-------------|
| `npm run simple` | `k6 run -e SCENARIO=smoke_test -e SCENARIO_NAME=smoke_test -e ENABLE_VERBOSE_REPORT=true tests/api/cases/create-sak.js` | Quick validation test - verify system is working (1 user, basic case creation) |
| `npm run load` | `k6 run -e SCENARIO=load_test -e SCENARIO_NAME=load_test -e ENABLE_VERBOSE_REPORT=true tests/api/cases/create-sak.js` | Normal traffic test - 7 users for 2 minutes |
| `npm run stress` | `k6 run -e SCENARIO=stress_test -e SCENARIO_NAME=stress_test -e ENABLE_VERBOSE_REPORT=true tests/api/cases/create-sak.js` | High traffic test - gradually increases from 7 to 14 users |
| `npm run jp-docs` | `k6 run -e SCENARIO=smoke_test -e SCENARIO_NAME=smoke_test -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-jp-with-multiple-document.js` | Document upload test - journal post with multiple attachments |
| `npm run complex` | `k6 run -e SCENARIO=smoke_test -e SCENARIO_NAME=smoke_test -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-multiple-jp-with-multiple-document.js` | Full feature test - multiple incoming/outgoing JPs with documents |

---

### 1.1 Quick Start Command Execution Mapping

This mapping expands each simplified npm command into the exact underlying k6 target, key environment variables, whether the enhanced verbose report is embedded, and the resulting HTML report file name.

| NPM Command | Invokes Script | k6 Target File | `SCENARIO` | `SCENARIO_NAME` | Verbose Report? | Report File | Notes |
|-------------|----------------|----------------|-----------|-----------------|-----------------|------------|-------|
| `npm run simple` | `test:simple` | `tests/api/cases/create-sak.js` | `smoke_test` | `smoke_test` | Yes (`ENABLE_VERBOSE_REPORT=true`) | `create-sak-smoke_test-report.html` | Case (SAK) sanity check |
| `npm run load` | `test:load` | `tests/api/cases/create-sak.js` | `load_test` | `load_test` | Yes | `create-sak-load_test-report.html` | Sustained case load |
| `npm run stress` | `test:stress` | `tests/api/cases/create-sak.js` | `stress_test` | `stress_test` | Yes | `create-sak-stress_test-report.html` | Ramping stress find limits |
| `npm run jp-docs` | `test:simple:documents` | `tests/api/journalposts/create-jp-with-multiple-document.js` | `smoke_test` | `smoke_test` | Yes | `create-jp-with-multiple-document-smoke_test-report.html` | JP + multiple documents |
| `npm run complex` | `test:simple:complex` | `tests/api/journalposts/create-multiple-jp-with-multiple-document.js` | `smoke_test` | `smoke_test` | Yes | `create-multiple-jp-with-multiple-document-smoke_test-report.html` | Multiple incoming & outgoing JPs with docs |
| `npm run test:load:jp` | `test:load:jp` | `tests/api/journalposts/create-jp.js` | `load_test` | `load_test` | Yes | `create-jp-load_test-report.html` | Single JP load scenario |
| `npm run test:load:documents` | `test:load:documents` | `tests/api/journalposts/create-jp-with-multiple-document.js` | `load_test` | `load_test` | Yes | `create-jp-with-multiple-document-load_test-report.html` | JP w/ documents load |
| `npm run test:load:complex` | `test:load:complex` | `tests/api/journalposts/create-multiple-jp-with-multiple-document.js` | `load_test` | `load_test` | Yes | `create-multiple-jp-with-multiple-document-load_test-report.html` | Multi JP/doc load |
| `npm run jp:load:verbose:report` | `jp:load:verbose:report` | `tests/api/journalposts/create-jp.js` | `load_test` | `load_test` | Yes (console+HTML) | `create-jp-load_test-report.html` | JP load + verbose |
| `npm run complex:load:verbose:report` | `complex:load:verbose:report` | `tests/api/journalposts/create-multiple-jp-with-multiple-document.js` | `load_test` | `load_test` | Yes (console+HTML) | `create-multiple-jp-with-multiple-document-load_test-report.html` | Complex load + verbose |

*Report naming pattern:* `{base-test-file}-{SCENARIO_NAME}-report.html`. Override with a custom name using `-e SCENARIO_NAME=my_custom_name` to keep results separated.

> Need clarity? Commands without `jp`, `jp-docs`, or `complex` prefixes target the case (`create-sak.js`) test; those with the prefixes run Journal Post flows.

---

## 📊 Test Scenarios Explained

| Scenario | Virtual Users (VUs) | Duration/Pattern | Purpose | Report File Suffix |
|----------|---------------------|------------------|---------|-------------------|
| **Smoke Test** | 1 VU | 1 iteration | Quick validation - verify everything works | `-smoke_test-report.html` |
| **Load Test** | 7 VUs | 2 minutes constant | Normal traffic - sustained realistic load | `-load_test-report.html` |
| **Stress Test** | Ramps 1→7→14 VUs | ~14 minutes ramping | High load - find breaking points | `-stress_test-report.html` |
| **Spike Test** | Spikes to 14 VUs | ~4 minutes with spike | Sudden traffic bursts - test resilience | `-spike_test-report.html` |
| **Endurance Test** | 5 VUs | Extended duration | Long-running - check for memory leaks | `-endurance_test-report.html` |

---

## 🎯 Create SAK (Case) Tests

### Basic SAK Test Commands

| NPM Command | Actual K6 Command | Scenario | Description |
|-------------|-------------------|----------|-------------|
| `npm run test:create-sak` | `k6 run tests/api/cases/create-sak.js` | Default | Basic case creation test (uses default scenario) |
| `npm run test:create-sak:smoke` | `k6 run -e SCENARIO=smoke_test tests/api/cases/create-sak.js` | Smoke | Quick validation with 1 user, 1 case creation |
| `npm run test:create-sak:load` | `k6 run -e SCENARIO=load_test tests/api/cases/create-sak.js` | Load | Sustained load with 7 users creating cases |
| `npm run test:create-sak:stress` | `k6 run -e SCENARIO=stress_test tests/api/cases/create-sak.js` | Stress | Push system beyond normal capacity (7→14 VUs) |
| `npm run test:create-sak:spike` | `k6 run -e SCENARIO=spike_test tests/api/cases/create-sak.js` | Spike | Sudden traffic spikes to 14 VUs |
| `npm run test:create-sak:endurance` | `k6 run -e SCENARIO=endurance_test tests/api/cases/create-sak.js` | Endurance | Extended duration test (5 VUs, long-running) |

### SAK Tests - No Pacing (Maximum Throughput)

| NPM Command | Actual K6 Command | Description |
|-------------|-------------------|-------------|
| `npm run test:create-sak:smoke:nopace` | `powershell -Command "$env:PACING_MODE='none'; k6 run -e SCENARIO=smoke_test tests/api/cases/create-sak.js"` | Smoke test without think time between actions |
| `npm run test:create-sak:load:nopace` | `powershell -Command "$env:PACING_MODE='none'; k6 run -e SCENARIO=load_test tests/api/cases/create-sak.js"` | Load test at maximum throughput |
| `npm run test:create-sak:stress:nopace` | `powershell -Command "$env:PACING_MODE='none'; k6 run -e SCENARIO=stress_test tests/api/cases/create-sak.js"` | Stress test at maximum throughput |
| `npm run test:create-sak:spike:nopace` | `powershell -Command "$env:PACING_MODE='none'; k6 run -e SCENARIO=spike_test tests/api/cases/create-sak.js"` | Spike test at maximum throughput |
| `npm run test:create-sak:endurance:nopace` | `powershell -Command "$env:PACING_MODE='none'; k6 run -e SCENARIO=endurance_test tests/api/cases/create-sak.js"` | Endurance test at maximum throughput |

---

## 🎯 Create JP (Journal Post) Tests

### Basic JP Test Commands

| NPM Command | Actual K6 Command | Scenario | Description |
|-------------|-------------------|----------|-------------|
| `npm run test:create-jp` | `k6 run tests/api/journalposts/create-jp.js` | Default | Basic journal post creation |
| `npm run test:create-jp:smoke` | `k6 run -e SCENARIO=smoke_test tests/api/journalposts/create-jp.js` | Smoke | Quick validation with 1 user, 1 JP |
| `npm run test:create-jp:load` | `k6 run -e SCENARIO=load_test tests/api/journalposts/create-jp.js` | Load | Sustained load with 7 users creating JPs |
| `npm run test:create-jp:stress` | `k6 run -e SCENARIO=stress_test tests/api/journalposts/create-jp.js` | Stress | High volume JP creation (7→14 VUs) |
| `npm run test:create-jp:spike` | `k6 run -e SCENARIO=spike_test tests/api/journalposts/create-jp.js` | Spike | Sudden spikes in JP creation |
| `npm run test:create-jp:endurance` | `k6 run -e SCENARIO=endurance_test tests/api/journalposts/create-jp.js` | Endurance | Extended JP creation test |

### JP Tests - No Pacing (Maximum Throughput)

| NPM Command | Actual K6 Command | Description |
|-------------|-------------------|-------------|
| `npm run test:create-jp:smoke:nopace` | `powershell -Command "$env:PACING_MODE='none'; k6 run -e SCENARIO=smoke_test tests/api/journalposts/create-jp.js"` | Smoke test without think time |
| `npm run test:create-jp:load:nopace` | `powershell -Command "$env:PACING_MODE='none'; k6 run -e SCENARIO=load_test tests/api/journalposts/create-jp.js"` | Load test at maximum throughput |
| `npm run test:create-jp:stress:nopace` | `powershell -Command "$env:PACING_MODE='none'; k6 run -e SCENARIO=stress_test tests/api/journalposts/create-jp.js"` | Stress test at maximum throughput |
| `npm run test:create-jp:spike:nopace` | `powershell -Command "$env:PACING_MODE='none'; k6 run -e SCENARIO=spike_test tests/api/journalposts/create-jp.js"` | Spike test at maximum throughput |
| `npm run test:create-jp:endurance:nopace` | `powershell -Command "$env:PACING_MODE='none'; k6 run -e SCENARIO=endurance_test tests/api/journalposts/create-jp.js"` | Endurance test at maximum throughput |

---

## 🎯 Create JP with Multiple Documents Tests

### Basic JP + Documents Test Commands

| NPM Command | Actual K6 Command | Scenario | Description |
|-------------|-------------------|----------|-------------|
| `npm run test:create-jp-with-multiple-document` | `k6 run tests/api/journalposts/create-jp-with-multiple-document.js` | Default | Single JP with multiple document attachments |
| `npm run test:create-jp-with-multiple-document:smoke` | `k6 run -e SCENARIO=smoke_test tests/api/journalposts/create-jp-with-multiple-document.js` | Smoke | 1 user creating 1 JP with multiple documents |
| `npm run test:create-jp-with-multiple-document:load` | `k6 run -e SCENARIO=load_test tests/api/journalposts/create-jp-with-multiple-document.js` | Load | 7 users creating JPs with document attachments |
| `npm run test:create-jp-with-multiple-document:stress` | `k6 run -e SCENARIO=stress_test tests/api/journalposts/create-jp-with-multiple-document.js` | Stress | High volume JP+documents creation |
| `npm run test:create-jp-with-multiple-document:spike` | `k6 run -e SCENARIO=spike_test tests/api/journalposts/create-jp-with-multiple-document.js` | Spike | Sudden spikes in JP+documents creation |
| `npm run test:create-jp-with-multiple-document:endurance` | `k6 run -e SCENARIO=endurance_test tests/api/journalposts/create-jp-with-multiple-document.js` | Endurance | Extended JP+documents test |

### JP + Documents Tests - No Pacing

| NPM Command | Actual K6 Command | Description |
|-------------|-------------------|-------------|
| `npm run test:create-jp-with-multiple-document:smoke:nopace` | `powershell -Command "$env:PACING_MODE='none'; k6 run -e SCENARIO=smoke_test tests/api/journalposts/create-jp-with-multiple-document.js"` | Smoke test without think time |
| `npm run test:create-jp-with-multiple-document:load:nopace` | `powershell -Command "$env:PACING_MODE='none'; k6 run -e SCENARIO=load_test tests/api/journalposts/create-jp-with-multiple-document.js"` | Load test at maximum throughput |
| `npm run test:create-jp-with-multiple-document:stress:nopace` | `powershell -Command "$env:PACING_MODE='none'; k6 run -e SCENARIO=stress_test tests/api/journalposts/create-jp-with-multiple-document.js"` | Stress test at maximum throughput |
| `npm run test:create-jp-with-multiple-document:spike:nopace` | `powershell -Command "$env:PACING_MODE='none'; k6 run -e SCENARIO=spike_test tests/api/journalposts/create-jp-with-multiple-document.js"` | Spike test at maximum throughput |
| `npm run test:create-jp-with-multiple-document:endurance:nopace` | `powershell -Command "$env:PACING_MODE='none'; k6 run -e SCENARIO=endurance_test tests/api/journalposts/create-jp-with-multiple-document.js"` | Endurance test at maximum throughput |

---

## 🎯 Create Multiple JPs (Incoming & Outgoing) with Documents Tests

### Basic Complex Multi-JP Test Commands

| NPM Command | Actual K6 Command | Scenario | Description |
|-------------|-------------------|----------|-------------|
| `npm run test:create-multiplejp-with-multiple-document` | `k6 run tests/api/journalposts/create-multiple-jp-with-multiple-document.js` | Default | Multiple incoming/outgoing JPs with documents |
| `npm run test:create-multiplejp-with-multiple-document:smoke` | `k6 run -e SCENARIO=smoke_test -e INCOMING_COUNT=2 -e OUTGOING_COUNT=2 -e USE_TEST_DOCS=true tests/api/journalposts/create-multiple-jp-with-multiple-document.js` | Smoke | 2 incoming + 2 outgoing JPs with 10 large documents (1MB-10MB) |
| `npm run test:create-multiplejp-with-multiple-document:smoke:synthetic` | `k6 run -e SCENARIO=smoke_test -e INCOMING_COUNT=2 -e OUTGOING_COUNT=2 -e DOC_COUNT=3 -e USE_TEST_DOCS=false tests/api/journalposts/create-multiple-jp-with-multiple-document.js` | Smoke | 2 incoming + 2 outgoing JPs with 3 synthetic documents (fast) |
| `npm run test:create-multiplejp-with-multiple-document:load` | `k6 run -e SCENARIO=load_test -e USE_TEST_DOCS=true tests/api/journalposts/create-multiple-jp-with-multiple-document.js` | Load | Multiple incoming/outgoing JPs with large documents |
| `npm run test:create-multiplejp-with-multiple-document:stress` | `k6 run -e SCENARIO=stress_test -e USE_TEST_DOCS=true tests/api/journalposts/create-multiple-jp-with-multiple-document.js` | Stress | High volume complex JPs with documents |
| `npm run test:create-multiplejp-with-multiple-document:spike` | `k6 run -e SCENARIO=spike_test -e USE_TEST_DOCS=true tests/api/journalposts/create-multiple-jp-with-multiple-document.js` | Spike | Traffic spikes for complex JPs |
| `npm run test:create-multiplejp-with-multiple-document:endurance` | `k6 run -e SCENARIO=endurance_test -e USE_TEST_DOCS=true tests/api/journalposts/create-multiple-jp-with-multiple-document.js` | Endurance | Extended complex JP creation |

### Complex Multi-JP Tests - No Pacing

| NPM Command | Actual K6 Command | Description |
|-------------|-------------------|-------------|
| `npm run test:create-multiplejp-with-multiple-document:smoke:nopace` | `powershell -Command "$env:PACING_MODE='none'; k6 run -e SCENARIO=smoke_test tests/api/journalposts/create-multiple-jp-with-multiple-document.js"` | Smoke test without think time |
| `npm run test:create-multiplejp-with-multiple-document:load:nopace` | `powershell -Command "$env:PACING_MODE='none'; k6 run -e SCENARIO=load_test tests/api/journalposts/create-multiple-jp-with-multiple-document.js"` | Load test at maximum throughput |
| `npm run test:create-multiplejp-with-multiple-document:stress:nopace` | `powershell -Command "$env:PACING_MODE='none'; k6 run -e SCENARIO=stress_test tests/api/journalposts/create-multiple-jp-with-multiple-document.js"` | Stress test at maximum throughput |
| `npm run test:create-multiplejp-with-multiple-document:spike:nopace` | `powershell -Command "$env:PACING_MODE='none'; k6 run -e SCENARIO=spike_test tests/api/journalposts/create-multiple-jp-with-multiple-document.js"` | Spike test at maximum throughput |
| `npm run test:create-multiplejp-with-multiple-document:endurance:nopace` | `powershell -Command "$env:PACING_MODE='none'; k6 run -e SCENARIO=endurance_test tests/api/journalposts/create-multiple-jp-with-multiple-document.js"` | Endurance test at maximum throughput |

---

## 🔧 Verbose Logging Commands (Detailed Debug Output)

### SAK (Case) Tests with Verbose Logging

| NPM Command | Actual K6 Command | Description |
|-------------|-------------------|-------------|
| `npm run sak:verbose` | `k6 run --verbose -e SCENARIO=smoke_test -e SCENARIO_NAME=smoke_test -e ENABLE_VERBOSE_REPORT=true tests/api/cases/create-sak.js` | SAK smoke test with detailed console output |
| `npm run sak:load:verbose` | `k6 run --verbose -e SCENARIO=load_test -e SCENARIO_NAME=load_test -e ENABLE_VERBOSE_REPORT=true tests/api/cases/create-sak.js` | SAK load test with verbose logging |
| `npm run sak:stress:verbose` | `k6 run --verbose -e SCENARIO=stress_test -e SCENARIO_NAME=stress_test -e ENABLE_VERBOSE_REPORT=true tests/api/cases/create-sak.js` | SAK stress test with verbose logging |
| `npm run sak:spike:verbose` | `k6 run --verbose -e SCENARIO=spike_test -e SCENARIO_NAME=spike_test -e ENABLE_VERBOSE_REPORT=true tests/api/cases/create-sak.js` | SAK spike test with verbose logging |
| `npm run sak:endurance:verbose` | `k6 run --verbose -e SCENARIO=endurance_test -e SCENARIO_NAME=endurance_test -e ENABLE_VERBOSE_REPORT=true tests/api/cases/create-sak.js` | SAK endurance test with verbose logging |

---

## 🧭 Flow Classification & Verbose Report Controls

The enhanced verbose report auto-detects whether to include Journal Post / Document flows or just Case Creation. Use these environment variables to override or guide classification:

| Variable | Values | Effect | When to Use |
|----------|--------|--------|-------------|
| `FLOW_TYPE` | `case-only`, `jp`, `journalpost` | Hard override of flow classification (highest precedence). | Force a known flow in CI or mixed pipelines. |
| `FORCE_CASE_ONLY` | `true` | Forces Case-only flow even if heuristics lean JP. | Long case load/endurance runs misclassified due to high request volume. |
| `IS_CASE_ONLY` | `true` | Alias for `FLOW_TYPE=case-only`. | Backward compatibility. |
| `JP_ENDPOINT_HIT` | `true` | Signals JP endpoints were executed (prevents reclassification to case-only). | Set in JP scripts if heuristics might under-detect. |
| `SCENARIO_NAME` | e.g. `create-sak-load_test` | Names containing `create-sak` / `sak` bias to case-only if no JP indicators. | Improve clarity across multi-flow runs. |
| `ENABLE_VERBOSE_REPORT` | `true` | Embeds verbose narrative in HTML report. | Whenever you want detailed execution story. |

**JP heuristic indicators:** scenario name contains `journal`, `jp`, `document`; or env vars `DOC_COUNT`, `INCOMING_COUNT`, `OUTGOING_COUNT`, `USE_TEST_DOCS=true`; or very high total HTTP request volume (> 40).

**Case bias:** scenario name contains `create-sak` (and no JP indicators) or explicit overrides.

**Automatic JP flags:** All Journal Post scripts now auto-set `FLOW_TYPE=jp` (when not already defined) and `JP_ENDPOINT_HIT=true` internally. This removes the need to manually export those for small JP tests while still allowing overrides (`FORCE_CASE_ONLY=true` or `FLOW_TYPE=case-only`).

**Recommended explicit case run:**

```powershell
$env:FORCE_CASE_ONLY='true'; $env:ENABLE_VERBOSE_REPORT='true'; npm run load
```

**Recommended explicit JP run:**

```powershell
$env:FLOW_TYPE='jp'; $env:ENABLE_VERBOSE_REPORT='true'; npm run test:load:jp
```

> Troubleshooting: If JP lines appear in a pure case test, add `FORCE_CASE_ONLY=true`. If case-only appears in a JP test, add `FLOW_TYPE=jp` or ensure the script sets `JP_ENDPOINT_HIT=true`.

### Journal Post Tests with Verbose Logging

| NPM Command | Actual K6 Command | Description |
|-------------|-------------------|-------------|
| `npm run jp:verbose` | `k6 run --verbose -e SCENARIO=smoke_test -e SCENARIO_NAME=smoke_test -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-jp.js` | JP smoke test with verbose logging |
| `npm run jp:load:verbose` | `k6 run --verbose -e SCENARIO=load_test -e SCENARIO_NAME=load_test -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-jp.js` | JP load test with verbose logging |
| `npm run jp:stress:verbose` | `k6 run --verbose -e SCENARIO=stress_test -e SCENARIO_NAME=stress_test -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-jp.js` | JP stress test with verbose logging |
| `npm run jp:spike:verbose` | `k6 run --verbose -e SCENARIO=spike_test -e SCENARIO_NAME=spike_test -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-jp.js` | JP spike test with verbose logging |
| `npm run jp:endurance:verbose` | `k6 run --verbose -e SCENARIO=endurance_test -e SCENARIO_NAME=endurance_test -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-jp.js` | JP endurance test with verbose logging |

### JP with Documents Tests with Verbose Logging

| NPM Command | Actual K6 Command | Description |
|-------------|-------------------|-------------|
| `npm run jp-docs:verbose` | `k6 run --verbose -e SCENARIO=smoke_test -e SCENARIO_NAME=smoke_test -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-jp-with-multiple-document.js` | JP+docs smoke test with verbose logging |
| `npm run jp-docs:load:verbose` | `k6 run --verbose -e SCENARIO=load_test -e SCENARIO_NAME=load_test -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-jp-with-multiple-document.js` | JP+docs load test with verbose logging |
| `npm run jp-docs:stress:verbose` | `k6 run --verbose -e SCENARIO=stress_test -e SCENARIO_NAME=stress_test -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-jp-with-multiple-document.js` | JP+docs stress test with verbose logging |
| `npm run jp-docs:spike:verbose` | `k6 run --verbose -e SCENARIO=spike_test -e SCENARIO_NAME=spike_test -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-jp-with-multiple-document.js` | JP+docs spike test with verbose logging |
| `npm run jp-docs:endurance:verbose` | `k6 run --verbose -e SCENARIO=endurance_test -e SCENARIO_NAME=endurance_test -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-jp-with-multiple-document.js` | JP+docs endurance test with verbose logging |

### Complex Multi-JP Tests with Verbose Logging

| NPM Command | Actual K6 Command | Description |
|-------------|-------------------|-------------|
| `npm run complex:verbose` | `k6 run --verbose -e SCENARIO=smoke_test -e SCENARIO_NAME=smoke_test -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-multiple-jp-with-multiple-document.js` | Complex smoke test with verbose logging |
| `npm run complex:load:verbose` | `k6 run --verbose -e SCENARIO=load_test -e SCENARIO_NAME=load_test -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-multiple-jp-with-multiple-document.js` | Complex load test with verbose logging |
| `npm run complex:stress:verbose` | `k6 run --verbose -e SCENARIO=stress_test -e SCENARIO_NAME=stress_test -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-multiple-jp-with-multiple-document.js` | Complex stress test with verbose logging |
| `npm run complex:spike:verbose` | `k6 run --verbose -e SCENARIO=spike_test -e SCENARIO_NAME=spike_test -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-multiple-jp-with-multiple-document.js` | Complex spike test with verbose logging |
| `npm run complex:endurance:verbose` | `k6 run --verbose -e SCENARIO=endurance_test -e SCENARIO_NAME=endurance_test -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-multiple-jp-with-multiple-document.js` | Complex endurance test with verbose logging |

### Environment-Specific Verbose Tests

| NPM Command | Actual K6 Command | Description |
|-------------|-------------------|-------------|
| `npm run dev:verbose` | `k6 run --verbose --env CONFIG_ENV=dev -e SCENARIO=smoke_test tests/api/cases/create-sak.js` | Verbose test in development environment |
| `npm run autotest:verbose` | `k6 run --verbose --env CONFIG_ENV=autotest -e SCENARIO=smoke_test tests/api/cases/create-sak.js` | Verbose test in autotest environment |
| `npm run dev:load:verbose` | `k6 run --verbose --env CONFIG_ENV=dev -e SCENARIO=load_test tests/api/cases/create-sak.js` | Verbose load test in dev environment |
| `npm run autotest:load:verbose` | `k6 run --verbose --env CONFIG_ENV=autotest -e SCENARIO=load_test tests/api/cases/create-sak.js` | Verbose load test in autotest environment |

---

## 📈 HTML Report Generation Commands

### SAK (Case) Reports with Verbose Logs

| NPM Command | Actual K6 Command | Generated Report File |
|-------------|-------------------|----------------------|
| `npm run simple:verbose:report` | `k6 run --verbose -e SCENARIO=smoke_test -e SCENARIO_NAME=smoke_test -e ENABLE_VERBOSE_REPORT=true tests/api/cases/create-sak.js` | `create-sak-smoke_test-report.html` |
| `npm run load:verbose:report` | `k6 run --verbose -e SCENARIO=load_test -e SCENARIO_NAME=load_test -e ENABLE_VERBOSE_REPORT=true tests/api/cases/create-sak.js` | `create-sak-load_test-report.html` |
| `npm run stress:verbose:report` | `k6 run --verbose -e SCENARIO=stress_test -e SCENARIO_NAME=stress_test -e ENABLE_VERBOSE_REPORT=true tests/api/cases/create-sak.js` | `create-sak-stress_test-report.html` |
| `npm run spike:verbose:report` | `k6 run --verbose -e SCENARIO=spike_test -e SCENARIO_NAME=spike_test -e ENABLE_VERBOSE_REPORT=true tests/api/cases/create-sak.js` | `create-sak-spike_test-report.html` |
| `npm run endurance:verbose:report` | `k6 run --verbose -e SCENARIO=endurance_test -e SCENARIO_NAME=endurance_test -e ENABLE_VERBOSE_REPORT=true tests/api/cases/create-sak.js` | `create-sak-endurance_test-report.html` |

### Journal Post Reports with Verbose Logs

| NPM Command | Actual K6 Command | Generated Report File |
|-------------|-------------------|----------------------|
| `npm run jp:verbose:report` | `k6 run --verbose -e SCENARIO=smoke_test -e SCENARIO_NAME=smoke_test -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-jp.js` | `create-jp-smoke_test-report.html` |
| `npm run jp:load:verbose:report` | `k6 run --verbose -e SCENARIO=load_test -e SCENARIO_NAME=load_test -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-jp.js` | `create-jp-load_test-report.html` |
| `npm run jp:stress:verbose:report` | `k6 run --verbose -e SCENARIO=stress_test -e SCENARIO_NAME=stress_test -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-jp.js` | `create-jp-stress_test-report.html` |
| `npm run jp:spike:verbose:report` | `k6 run --verbose -e SCENARIO=spike_test -e SCENARIO_NAME=spike_test -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-jp.js` | `create-jp-spike_test-report.html` |
| `npm run jp:endurance:verbose:report` | `k6 run --verbose -e SCENARIO=endurance_test -e SCENARIO_NAME=endurance_test -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-jp.js` | `create-jp-endurance_test-report.html` |

### JP with Documents Reports with Verbose Logs

| NPM Command | Actual K6 Command | Generated Report File |
|-------------|-------------------|----------------------|
| `npm run jp-docs:verbose:report` | `k6 run --verbose -e SCENARIO=smoke_test -e SCENARIO_NAME=smoke_test -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-jp-with-multiple-document.js` | `create-jp-with-multiple-document-smoke_test-report.html` |
| `npm run jp-docs:load:verbose:report` | `k6 run --verbose -e SCENARIO=load_test -e SCENARIO_NAME=load_test -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-jp-with-multiple-document.js` | `create-jp-with-multiple-document-load_test-report.html` |
| `npm run jp-docs:stress:verbose:report` | `k6 run --verbose -e SCENARIO=stress_test -e SCENARIO_NAME=stress_test -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-jp-with-multiple-document.js` | `create-jp-with-multiple-document-stress_test-report.html` |
| `npm run jp-docs:spike:verbose:report` | `k6 run --verbose -e SCENARIO=spike_test -e SCENARIO_NAME=spike_test -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-jp-with-multiple-document.js` | `create-jp-with-multiple-document-spike_test-report.html` |
| `npm run jp-docs:endurance:verbose:report` | `k6 run --verbose -e SCENARIO=endurance_test -e SCENARIO_NAME=endurance_test -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-jp-with-multiple-document.js` | `create-jp-with-multiple-document-endurance_test-report.html` |

### Complex Multi-JP Reports with Verbose Logs

| NPM Command | Actual K6 Command | Generated Report File |
|-------------|-------------------|----------------------|
| `npm run complex:verbose:report` | `k6 run --verbose -e SCENARIO=smoke_test -e SCENARIO_NAME=smoke_test -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-multiple-jp-with-multiple-document.js` | `create-multiple-jp-with-multiple-document-smoke_test-report.html` |
| `npm run complex:load:verbose:report` | `k6 run --verbose -e SCENARIO=load_test -e SCENARIO_NAME=load_test -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-multiple-jp-with-multiple-document.js` | `create-multiple-jp-with-multiple-document-load_test-report.html` |
| `npm run complex:stress:verbose:report` | `k6 run --verbose -e SCENARIO=stress_test -e SCENARIO_NAME=stress_test -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-multiple-jp-with-multiple-document.js` | `create-multiple-jp-with-multiple-document-stress_test-report.html` |
| `npm run complex:spike:verbose:report` | `k6 run --verbose -e SCENARIO=spike_test -e SCENARIO_NAME=spike_test -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-multiple-jp-with-multiple-document.js` | `create-multiple-jp-with-multiple-document-spike_test-report.html` |
| `npm run complex:endurance:verbose:report` | `k6 run --verbose -e SCENARIO=endurance_test -e SCENARIO_NAME=endurance_test -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-multiple-jp-with-multiple-document.js` | `create-multiple-jp-with-multiple-document-endurance_test-report.html` |

### Full-Name Multi-JP Reports (With Real Test Documents)

| NPM Command | Actual K6 Command | Generated Report File |
|-------------|-------------------|----------------------|
| `npm run test:create-multiplejp-with-multiple-document:smoke:verbose:report` | `k6 run --verbose -e SCENARIO=smoke_test -e SCENARIO_NAME=smoke_test -e INCOMING_COUNT=2 -e OUTGOING_COUNT=2 -e USE_TEST_DOCS=true -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-multiple-jp-with-multiple-document.js` | `create-multiple-jp-with-multiple-document-smoke_test-report.html` |
| `npm run test:create-multiplejp-with-multiple-document:load:verbose:report` | `k6 run --verbose -e SCENARIO=load_test -e SCENARIO_NAME=load_test -e USE_TEST_DOCS=true -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-multiple-jp-with-multiple-document.js` | `create-multiple-jp-with-multiple-document-load_test-report.html` |
| `npm run test:create-multiplejp-with-multiple-document:stress:verbose:report` | `k6 run --verbose -e SCENARIO=stress_test -e SCENARIO_NAME=stress_test -e USE_TEST_DOCS=true -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-multiple-jp-with-multiple-document.js` | `create-multiple-jp-with-multiple-document-stress_test-report.html` |
| `npm run test:create-multiplejp-with-multiple-document:spike:verbose:report` | `k6 run --verbose -e SCENARIO=spike_test -e SCENARIO_NAME=spike_test -e USE_TEST_DOCS=true -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-multiple-jp-with-multiple-document.js` | `create-multiple-jp-with-multiple-document-spike_test-report.html` |
| `npm run test:create-multiplejp-with-multiple-document:endurance:verbose:report` | `k6 run --verbose -e SCENARIO=endurance_test -e SCENARIO_NAME=endurance_test -e USE_TEST_DOCS=true -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-multiple-jp-with-multiple-document.js` | `create-multiple-jp-with-multiple-document-endurance_test-report.html` |

---

## 🏃 Run All Tests Commands (autotest.json Configuration)

### Run All Tests by Type (5 Scenarios Each)

| NPM Command | Description | Scenarios | Total Reports |
|-------------|-------------|-----------|---------------|
| `npm run run-all-sak-autotest` | Run ALL SAK (case) tests with all 5 scenarios using autotest.json | smoke, load, stress, spike, endurance | 5 HTML reports |
| `npm run run-all-jp-autotest` | Run ALL JP tests with all 5 scenarios using autotest.json | smoke, load, stress, spike, endurance | 5 HTML reports |
| `npm run run-all-jp-docs-autotest` | Run ALL JP+documents tests with all 5 scenarios using autotest.json | smoke, load, stress, spike, endurance | 5 HTML reports |
| `npm run run-all-complex-autotest` | Run ALL complex multi-JP tests with all 5 scenarios using autotest.json | smoke, load, stress, spike, endurance | 5 HTML reports |
| `npm run run-all-autotest` | **Run EVERYTHING** - All 4 test types × 5 scenarios = 20 tests | ALL scenarios across ALL test types | 20 HTML reports |

### Run All Tests Commands - Detailed Breakdown

| NPM Command | Actual Command Chain | Total Tests |
|-------------|---------------------|-------------|
| `npm run run-all-sak-autotest` | `npm run simple:verbose:report -- --env CONFIG_ENV=autotest && npm run load:verbose:report -- --env CONFIG_ENV=autotest && npm run stress:verbose:report -- --env CONFIG_ENV=autotest && npm run spike:verbose:report -- --env CONFIG_ENV=autotest && npm run endurance:verbose:report -- --env CONFIG_ENV=autotest` | 5 tests |
| `npm run run-all-jp-autotest` | `npm run jp:verbose:report -- --env CONFIG_ENV=autotest && npm run jp:load:verbose:report -- --env CONFIG_ENV=autotest && npm run jp:stress:verbose:report -- --env CONFIG_ENV=autotest && npm run jp:spike:verbose:report -- --env CONFIG_ENV=autotest && npm run jp:endurance:verbose:report -- --env CONFIG_ENV=autotest` | 5 tests |
| `npm run run-all-jp-docs-autotest` | `npm run jp-docs:verbose:report -- --env CONFIG_ENV=autotest && npm run jp-docs:load:verbose:report -- --env CONFIG_ENV=autotest && npm run jp-docs:stress:verbose:report -- --env CONFIG_ENV=autotest && npm run jp-docs:spike:verbose:report -- --env CONFIG_ENV=autotest && npm run jp-docs:endurance:verbose:report -- --env CONFIG_ENV=autotest` | 5 tests |
| `npm run run-all-complex-autotest` | `npm run complex:verbose:report -- --env CONFIG_ENV=autotest && npm run complex:load:verbose:report -- --env CONFIG_ENV=autotest && npm run complex:stress:verbose:report -- --env CONFIG_ENV=autotest && npm run complex:spike:verbose:report -- --env CONFIG_ENV=autotest && npm run complex:endurance:verbose:report -- --env CONFIG_ENV=autotest` | 5 tests |

### Individual Scenario Runs (All Test Types)

| NPM Command | Actual Command Chain | Description |
|-------------|---------------------|-------------|
| `npm run run-all-smoke` | `npm run test:simple -- -e SCENARIO_NAME=sak_smoke_test -e ENABLE_VERBOSE_REPORT=true && npm run test:simple:jp -- -e SCENARIO_NAME=jp_smoke_test -e ENABLE_VERBOSE_REPORT=true && npm run test:simple:documents -- -e SCENARIO_NAME=jp_docs_smoke_test -e ENABLE_VERBOSE_REPORT=true && npm run test:simple:complex -- -e SCENARIO_NAME=complex_smoke_test -e ENABLE_VERBOSE_REPORT=true` | Run smoke tests for all 4 test types |
| `npm run run-all-load` | `npm run test:load -- -e SCENARIO_NAME=sak_load_test -e ENABLE_VERBOSE_REPORT=true && npm run test:load:jp -- -e SCENARIO_NAME=jp_load_test -e ENABLE_VERBOSE_REPORT=true && npm run test:load:documents -- -e SCENARIO_NAME=jp_docs_load_test -e ENABLE_VERBOSE_REPORT=true && npm run test:load:complex -- -e SCENARIO_NAME=complex_load_test -e ENABLE_VERBOSE_REPORT=true` | Run load tests for all 4 test types |
| `npm run run-all-stress` | `npm run test:stress -- -e SCENARIO_NAME=sak_stress_test -e ENABLE_VERBOSE_REPORT=true && npm run test:stress:jp -- -e SCENARIO_NAME=jp_stress_test -e ENABLE_VERBOSE_REPORT=true && npm run test:stress:documents -- -e SCENARIO_NAME=jp_docs_stress_test -e ENABLE_VERBOSE_REPORT=true && npm run test:stress:complex -- -e SCENARIO_NAME=complex_stress_test -e ENABLE_VERBOSE_REPORT=true` | Run stress tests for all 4 test types |
| `npm run run-all-tests` | `npm run run-all-smoke && npm run run-all-load && npm run run-all-stress` | Execute smoke, load, and stress tests sequentially |
| `npm run run-comprehensive` | `echo '=== Running Comprehensive Test Suite with Unique Scenario Names ===' && npm run run-all-tests && echo '=== All tests completed! Check reports in src/reports/ with unique scenario names ==='` | Complete suite with status messages |

---

## 🌍 Environment-Specific Tests

### Development Environment Tests

| NPM Command | Actual K6 Command | Description |
|-------------|-------------------|-------------|
| `npm run test:dev` | `k6 run -e CONFIG_ENV=dev tests/api/cases/create-sak.js` | Run SAK test in dev environment |
| `npm run test:dev:load` | `k6 run -e CONFIG_ENV=dev -e SCENARIO=load_test tests/api/cases/create-sak.js` | Run SAK load test in dev environment |
| `npm run test:dev:jp:smoke` | `k6 run --env CONFIG_ENV=dev -e SCENARIO=smoke_test tests/api/journalposts/create-jp.js` | Run JP smoke test in dev environment |
| `npm run test:dev:jp:load` | `k6 run --env CONFIG_ENV=dev -e SCENARIO=load_test tests/api/journalposts/create-jp.js` | Run JP load test in dev environment |
| `npm run test:dev:jp-docs` | `k6 run --env CONFIG_ENV=dev -e SCENARIO=smoke_test tests/api/journalposts/create-jp-with-multiple-document.js` | Run JP+docs test in dev environment |

### Autotest Environment Tests

| NPM Command | Actual K6 Command | Description |
|-------------|-------------------|-------------|
| `npm run test:autotest` | `k6 run -e CONFIG_ENV=autotest tests/api/cases/create-sak.js` | Run SAK test in autotest environment |
| `npm run test:autotest:load` | `k6 run -e CONFIG_ENV=autotest -e SCENARIO=load_test tests/api/cases/create-sak.js` | Run SAK load test in autotest environment |
| `npm run test:autotest:jp:smoke` | `k6 run --env CONFIG_ENV=autotest -e SCENARIO=smoke_test tests/api/journalposts/create-jp.js` | Run JP smoke test in autotest environment |
| `npm run test:autotest:jp:load` | `k6 run --env CONFIG_ENV=autotest -e SCENARIO=load_test tests/api/journalposts/create-jp.js` | Run JP load test in autotest environment |
| `npm run test:autotest:jp-docs` | `k6 run --env CONFIG_ENV=autotest -e SCENARIO=smoke_test tests/api/journalposts/create-jp-with-multiple-document.js` | Run JP+docs test in autotest environment |
| `npm run test:autotest:complex` | `k6 run --env CONFIG_ENV=autotest -e SCENARIO=load_test tests/api/journalposts/create-multiple-jp-with-multiple-document.js` | Run complex test in autotest environment |

---

## 📄 Report Management Commands

| NPM Command | Actual Command | Description |
|-------------|---------------|-------------|
| `npm run reports:view` | `start src/reports` | Open the reports folder in Windows Explorer |
| `npm run reports:clean` | `powershell -Command "Remove-Item -Path 'src/reports/*.html', 'src/reports/*.json' -Force -ErrorAction SilentlyContinue"` | Delete all HTML and JSON reports from reports folder |
| `npm run reports:verbose:info` | `echo 'Verbose logs are now integrated into HTML reports! Run any :verbose:report command, then open the HTML report and look for the "Verbose Debug Logs" section with expand/collapse.'` | Display information about verbose reports |
| `npm run report:open` | `powershell -Command "if (Test-Path src/reports/create-sak-report.html) { Start-Process src/reports/create-sak-report.html } else { Write-Host 'Report not found. Run a test first.' }"` | Open the latest SAK report in default browser |
| `npm run report:open:jp` | `powershell -Command "if (Test-Path src/reports/create-jp-report.html) { Start-Process src/reports/create-jp-report.html } else { Write-Host 'JP Report not found. Run a test first.' }"` | Open the latest JP report in default browser |
| `npm run report:list` | `Get-ChildItem src/reports/*-report.html -ErrorAction SilentlyContinue \| Sort-Object LastWriteTime -Descending \| Select-Object Name,LastWriteTime` | List all report files with timestamps (sorted by newest first) |

---

## 🛠️ Development & Utility Commands

| NPM Command | Actual Command | Description |
|-------------|---------------|-------------|
| `npm run help` | `echo 'Available commands: npm run simple (basic test), npm run load (performance test), npm run stress (high load), npm run jp-docs (document upload test), npm run complex (full feature test)'` | Display available quick start commands |
| `npm run test:info` | `echo 'Test Types: simple=basic JP creation, load=performance testing, stress=high volume, jp-docs=document uploads, complex=multiple JPs with documents'` | Show information about test types |
| `npm run lint` | `eslint "tests/**/*.js" "src/**/*.js" --quiet` | Run ESLint on all test and source files (quiet mode) |
| `npm run format` | `prettier --write "tests/**/*.js" "src/**/*.js"` | Format all JavaScript files with Prettier |
| `npm run prepare` | `husky install` | Install Husky git hooks (runs automatically after npm install) |
| `npm run quick-smoke` | `k6 run -e SCENARIO=smoke_test -e SCENARIO_NAME=quick_smoke -e ENABLE_VERBOSE_REPORT=true tests/api/cases/create-sak.js && echo 'Quick smoke test completed! Check: src/reports/create-sak-quick_smoke-report.html'` | Quick smoke test with instant results |
| `npm run quick-load` | `k6 run -e SCENARIO=load_test -e SCENARIO_NAME=quick_load -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-jp.js && echo 'Quick load test completed! Check: src/reports/create-jp-quick_load-report.html'` | Quick load test with instant results |
| `npm run quick-stress` | `k6 run -e SCENARIO=stress_test -e SCENARIO_NAME=quick_stress -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-jp-with-multiple-document.js && echo 'Quick stress test completed! Check: src/reports/create-jp-with-multiple-document-quick_stress-report.html'` | Quick stress test with instant results |
| `npm run test:verbose` | `k6 run --verbose -e SCENARIO=smoke_test tests/api/journalposts/create-jp.js` | Run JP test with verbose console output |
| `npm run test:debug` | `k6 run --verbose --env CONFIG_ENV=dev -e SCENARIO=smoke_test tests/api/journalposts/create-jp.js` | Run JP test in dev environment with verbose output |
| `npm run simple:verbose` | `k6 run -e SCENARIO=smoke_test -e SCENARIO_NAME=smoke_test -e ENABLE_VERBOSE_REPORT=true --verbose tests/api/cases/create-sak.js` | Simple test with verbose console output |
| `npm run load:verbose` | `k6 run -e SCENARIO=load_test -e SCENARIO_NAME=load_test -e ENABLE_VERBOSE_REPORT=true --verbose tests/api/cases/create-sak.js` | Load test with verbose console output |
| `npm run stress:verbose` | `k6 run -e SCENARIO=stress_test -e SCENARIO_NAME=stress_test -e ENABLE_VERBOSE_REPORT=true --verbose tests/api/cases/create-sak.js` | Stress test with verbose console output |
| `npm run spike:verbose` | `k6 run -e SCENARIO=spike_test -e SCENARIO_NAME=spike_test -e ENABLE_VERBOSE_REPORT=true --verbose tests/api/cases/create-sak.js` | Spike test with verbose console output |
| `npm run endurance:verbose` | `k6 run -e SCENARIO=endurance_test -e SCENARIO_NAME=endurance_test -e ENABLE_VERBOSE_REPORT=true --verbose tests/api/cases/create-sak.js` | Endurance test with verbose console output |

---

## 📚 Additional Test Variants

### Simple Test Shortcuts

| NPM Command | Actual K6 Command | Description |
|-------------|-------------------|-------------|
| `npm run test:simple` | `k6 run -e SCENARIO=smoke_test -e SCENARIO_NAME=smoke_test -e ENABLE_VERBOSE_REPORT=true tests/api/cases/create-sak.js` | Simple SAK smoke test with report |
| `npm run test:simple:verbose` | `k6 run -e SCENARIO=smoke_test -e SCENARIO_NAME=smoke_test -e ENABLE_VERBOSE_REPORT=true --verbose tests/api/cases/create-sak.js` | Simple SAK smoke test with verbose output |
| `npm run test:simple:jp` | `k6 run -e SCENARIO=smoke_test -e SCENARIO_NAME=smoke_test -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-jp.js` | Simple JP smoke test with report |
| `npm run test:simple:documents` | `k6 run -e SCENARIO=smoke_test -e SCENARIO_NAME=smoke_test -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-jp-with-multiple-document.js` | Simple JP+documents smoke test with report |
| `npm run test:simple:complex` | `k6 run -e SCENARIO=smoke_test -e SCENARIO_NAME=smoke_test -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-multiple-jp-with-multiple-document.js` | Simple complex multi-JP smoke test with report |

### Load Test Shortcuts

| NPM Command | Actual K6 Command | Description |
|-------------|-------------------|-------------|
| `npm run test:load` | `k6 run -e SCENARIO=load_test -e SCENARIO_NAME=load_test -e ENABLE_VERBOSE_REPORT=true tests/api/cases/create-sak.js` | Load SAK test with report |
| `npm run test:load:verbose` | `k6 run -e SCENARIO=load_test -e SCENARIO_NAME=load_test -e ENABLE_VERBOSE_REPORT=true --verbose tests/api/cases/create-sak.js` | Load SAK test with verbose output |
| `npm run test:load:jp` | `k6 run -e SCENARIO=load_test -e SCENARIO_NAME=load_test -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-jp.js` | Load JP test with report |
| `npm run test:load:documents` | `k6 run -e SCENARIO=load_test -e SCENARIO_NAME=load_test -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-jp-with-multiple-document.js` | Load JP+documents test with report |
| `npm run test:load:complex` | `k6 run -e SCENARIO=load_test -e SCENARIO_NAME=load_test -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-multiple-jp-with-multiple-document.js` | Load complex multi-JP test with report |

### Stress Test Shortcuts

| NPM Command | Actual K6 Command | Description |
|-------------|-------------------|-------------|
| `npm run test:stress` | `k6 run -e SCENARIO=stress_test -e SCENARIO_NAME=stress_test -e ENABLE_VERBOSE_REPORT=true tests/api/cases/create-sak.js` | Stress SAK test with report |
| `npm run test:stress:verbose` | `k6 run -e SCENARIO=stress_test -e SCENARIO_NAME=stress_test -e ENABLE_VERBOSE_REPORT=true --verbose tests/api/cases/create-sak.js` | Stress SAK test with verbose output |
| `npm run test:stress:jp` | `k6 run -e SCENARIO=stress_test -e SCENARIO_NAME=stress_test -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-jp.js` | Stress JP test with report |
| `npm run test:stress:documents` | `k6 run -e SCENARIO=stress_test -e SCENARIO_NAME=stress_test -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-jp-with-multiple-document.js` | Stress JP+documents test with report |
| `npm run test:stress:complex` | `k6 run -e SCENARIO=stress_test -e SCENARIO_NAME=stress_test -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-multiple-jp-with-multiple-document.js` | Stress complex multi-JP test with report |

### Spike Test Shortcuts

| NPM Command | Actual K6 Command | Description |
|-------------|-------------------|-------------|
| `npm run test:spike` | `k6 run -e SCENARIO=spike_test -e SCENARIO_NAME=spike_test -e ENABLE_VERBOSE_REPORT=true tests/api/cases/create-sak.js` | Spike SAK test with report |
| `npm run test:spike:verbose` | `k6 run -e SCENARIO=spike_test -e SCENARIO_NAME=spike_test -e ENABLE_VERBOSE_REPORT=true --verbose tests/api/cases/create-sak.js` | Spike SAK test with verbose output |
| `npm run test:spike:jp` | `k6 run -e SCENARIO=spike_test -e SCENARIO_NAME=spike_test -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-jp.js` | Spike JP test with report |
| `npm run test:spike:documents` | `k6 run -e SCENARIO=spike_test -e SCENARIO_NAME=spike_test -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-jp-with-multiple-document.js` | Spike JP+documents test with report |
| `npm run test:spike:complex` | `k6 run -e SCENARIO=spike_test -e SCENARIO_NAME=spike_test -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-multiple-jp-with-multiple-document.js` | Spike complex multi-JP test with report |

### Endurance Test Shortcuts

| NPM Command | Actual K6 Command | Description |
|-------------|-------------------|-------------|
| `npm run test:endurance` | `k6 run -e SCENARIO=endurance_test -e SCENARIO_NAME=endurance_test -e ENABLE_VERBOSE_REPORT=true tests/api/cases/create-sak.js` | Endurance SAK test with report |
| `npm run test:endurance:verbose` | `k6 run -e SCENARIO=endurance_test -e SCENARIO_NAME=endurance_test -e ENABLE_VERBOSE_REPORT=true --verbose tests/api/cases/create-sak.js` | Endurance SAK test with verbose output |
| `npm run test:endurance:jp` | `k6 run -e SCENARIO=endurance_test -e SCENARIO_NAME=endurance_test -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-jp.js` | Endurance JP test with report |
| `npm run test:endurance:documents` | `k6 run -e SCENARIO=endurance_test -e SCENARIO_NAME=endurance_test -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-jp-with-multiple-document.js` | Endurance JP+documents test with report |
| `npm run test:endurance:complex` | `k6 run -e SCENARIO=endurance_test -e SCENARIO_NAME=endurance_test -e ENABLE_VERBOSE_REPORT=true tests/api/journalposts/create-multiple-jp-with-multiple-document.js` | Endurance complex multi-JP test with report |

---

## 📝 Key Notes for End Users

### 🎯 Most Recommended Commands

1. **`npm run simple`** - Start here! Quick 1-minute validation test
2. **`npm run load`** - Test system under normal load (2 minutes, 7 users)
3. **`npm run stress`** - Find system limits (~14 minutes, 7→14 users)
4. **`npm run run-all-sak-autotest`** - Run all 5 SAK scenarios with autotest.json
5. **`npm run run-all-autotest`** - Run EVERYTHING (20 tests total)
6. **`npm run reports:view`** - Open reports folder to view results

### 📊 Report Locations & Naming

- **Report Folder:** `src/reports/`
- **Report Format:** `{test-name}-{scenario}-report.html`
- **Examples:**
  - `create-sak-smoke_test-report.html`
  - `create-jp-load_test-report.html`
  - `create-multiple-jp-with-multiple-document-stress_test-report.html`

### ⚡ Performance Test Duration Guide

| Scenario | Typical Duration | Best For |
|----------|-----------------|----------|
| Smoke | < 1 minute | Quick validation before deployments |
| Load | 2-5 minutes | Regular performance baseline testing |
| Stress | 10-15 minutes | Finding breaking points, capacity planning |
| Spike | 3-5 minutes | Testing resilience during traffic bursts |
| Endurance | 15-60 minutes | Memory leak detection, long-term stability |

### 🔧 When to Use What

- **Smoke Tests**: Before every deployment, quick health checks
- **Load Tests**: Weekly baseline measurements, regression testing
- **Stress Tests**: Capacity planning, finding system limits
- **Spike Tests**: Testing system resilience during sudden traffic increases
- **Endurance Tests**: Checking for memory leaks and long-term stability
- **No-Pacing Tests**: Maximum throughput testing (no think time)

### 📈 Understanding Test Reports

Each HTML report includes:
- **KPI Metrics**: Response times, throughput, error rates, VU counts
- **Performance Graphs**: Visual charts of metrics over time
- **Detailed Metrics Table**: Comprehensive statistics (min, max, avg, percentiles)
- **Verbose Debug Logs**: Expandable section with detailed console output
- **Test Configuration**: Scenario settings, environment details

### 🌍 Environment Configuration

- **Default**: Uses `dev.json` configuration (if no environment specified)
- **Dev Environment**: Use `--env CONFIG_ENV=dev` or commands with `:dev:`
- **Autotest Environment**: Use `--env CONFIG_ENV=autotest` or commands with `:autotest:`
- **Run-All Commands**: Automatically use `autotest.json` via `--env CONFIG_ENV=autotest`

### 💡 Pro Tips

1. **Always check reports**: After running tests, open `npm run reports:view`
2. **Clean old reports**: Use `npm run reports:clean` before major test runs
3. **Start small**: Begin with smoke tests before running load/stress tests
4. **Use verbose for debugging**: Add `:verbose` or `:verbose:report` for detailed logs
5. **Monitor system resources**: Keep an eye on CPU/Memory during stress tests
6. **Sequential vs Parallel**: All `run-all-*` commands run tests sequentially (one after another)

### 🚨 Troubleshooting

- **Test Failed?** Check the HTML report verbose logs section
- **Authentication Issues?** Verify `users-config.json` credentials
- **File Not Found?** Ensure test documents exist in `src/data/testDocuments/`
- **API Errors?** Check `websak-api-config.json` for correct API endpoints
- **Reports Missing?** Ensure `-e ENABLE_VERBOSE_REPORT=true` is in command

---

## �️ Performance Governance & Validation

Central performance rules (k6 enforcement and UI classification) are managed centrally – do NOT add `thresholds:` blocks inside test scripts.

### Single Source of Truth

| File | Purpose |
|------|---------|
| `src/config/performance-thresholds.json` | Defines global k6 thresholds (`defaults.k6.*` plus optional `operations.*.k6` overrides) and presentation-only `uiBands` used for coloring latency, error rate, and check failure rate in HTML reports. |

### What Lives Where

| Concern | Location | Notes |
|---------|----------|-------|
| k6 pass/fail thresholds (p95/p99, error rate) | `performance-thresholds.json > defaults.k6` and optional `operations.*.k6` | Merged at runtime; no inline thresholds permitted. |
| Operation-specific overrides | `performance-thresholds.json > operations` | Adds/tightens thresholds for semantic groups (e.g. grouped durations). |
| Visual status colors (Good / Watch / Investigate) | `performance-thresholds.json > uiBands` | Presentation only; doesn’t affect exit code. |

### Validation Commands

| Command | Description |
|---------|-------------|
| `npm run validate:thresholds` | Schema + ordering validation of `performance-thresholds.json` (Ajv). |
| `npm run validate:no-inline-thresholds` | Scans `tests/**` for disallowed inline `thresholds:` definitions. |
| `npm run validate:perf` | Runs both of the above. Use before every commit. |

The Husky `pre-commit` hook (installed via `npm run prepare`) automatically runs `validate:perf` and blocks commits if governance fails.

### uiBands Guidance

`uiBands` classify aggregate metrics; recommended inequality:

```text
good <= watch <= investigate
```

If `investigate` equals `watch` you effectively have two tiers; raise `investigate` to restore three distinct signal levels.

### Changing Thresholds – Workflow

1. Edit `src/config/performance-thresholds.json` (update `defaults`, add/adjust an `operations` entry, or tune `uiBands`).
2. Run `npm run validate:perf` until it passes.
3. Commit (hook re-validates).
4. Re-run representative tests; inspect new HTML report (colors & pass/fail markers update automatically).

### Typical Validation Failures

| Failure | Example Message | Fix |
|---------|-----------------|-----|
| Band ordering anomaly | `Warning: uiBands.latencyMs.good (900) > watch (800)` | Correct numerical ordering. |
| Missing required property | `defaults.k6.http_req_duration.p95 is required` | Add the missing field. |
| Inline thresholds detected | `Inline thresholds found in tests/api/cases/create-sak.js` | Remove the inline block; rely on central file. |

> Policy: All performance changes must pass `validate:perf`; inline threshold regressions will be rejected.

---

## �📧 Support & Documentation

- **Main Documentation**: `documents/README.md`
- **Architecture Guide**: `documents/ARCHITECTURE.md`
- **Metrics Guide**: `documents/METRICS-GUIDE.md`
- **Configuration Files**:
  - `src/config/autotest.json` - Autotest environment settings
  - `src/config/dev.json` - Development environment settings
  - `src/config/paths-config.json` - File paths configuration
  - `src/data/users-config.json` - User credentials
  - `src/data/websak-api-config.json` - API endpoints

For technical support or questions about test results, contact your performance testing team.

---

**Document Version:** 1.0  
**Last Updated:** October 10, 2025  
**Framework Version:** 3.0.0  
**K6 Version:** 0.57.0
