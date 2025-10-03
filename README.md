# WebSak Plus K6 Performance Tests

**Version:** 2.0.0  
**Last Updated:** October 3, 2025

Comprehensive, modular performance testing framework for WebSak Plus, featuring scenario-based load testing for Case (Sak) and Journal Post (JP) creation workflows with advanced document attachment capabilities.

---

## 📋 Table of Contents

1. [Recent Updates](#-recent-updates)
2. [Quick Start](#-quick-start)
3. [Test Suite Overview](#-test-suite-overview)
4. [Project Structure](#-project-structure)
5. [Configuration System](#%EF%B8%8F-configuration-system)
6. [Running Tests](#-running-tests)
7. [NPM Scripts Reference](#-npm-scripts-reference)
8. [Environment Variables](#-environment-variables)
9. [Test Scenarios](#-test-scenarios)
10. [Documentation](#-documentation)
11. [Troubleshooting](#-troubleshooting)

---

## 🎉 Recent Updates

### October 3, 2025 - Version 2.0.0

✅ **NEW: Multiple JPs with Multiple Documents Test**
- Create both incoming and outgoing Journal Posts
- Attach 10 large test documents (1MB-10MB) OR synthetic documents
- Batch upload support for maximum performance
- Binary file support with proper MIME types

✅ **Fixed document attachment failures** 
- Resolved 404/405 errors with centralized payload builders
- Implemented `dokuments[]` array structure for batch uploads

✅ **Enhanced architecture and documentation**
- Complete [ARCHITECTURE.md](./ARCHITECTURE.md) with data flows
- Detailed test-specific READMEs
- Comprehensive implementation guides

✅ **Improved NPM scripts**
- Clear comments and descriptions
- Better spacing for readability
- Consistent command patterns

---

## 🚀 Quick Start

### Prerequisites

1. **Install K6:** https://k6.io/docs/get-started/installation/
2. **Verify installation:**
   ```powershell
   k6 version
   ```

### Run Your First Test

```powershell
# 1. Smoke test (fastest - validates functionality)
npm run test:create-sak:smoke

# 2. Create Journal Post with documents
npm run test:create-jp-with-multiple-document:smoke

# 3. Multiple JPs with large documents (new!)
npm run test:create-multiplejp-with-multiple-document:smoke

# 4. View HTML report
npm run report:open
```

---

## 🎯 Test Suite Overview

### 1. Create Sak (Case) Test
**File:** `tests/create-sak.js`

**Purpose:** Performance test for Case creation in WebSak Plus

**Workflow:**
```
Authenticate → Retrieve Templates → Create Case → Validate → Report
```

**Features:**
- Scenario-based load testing (smoke → endurance)
- Dynamic user allocation (round-robin from 7 users)
- Template selection logic ("Ny sak" prioritization)
- Comprehensive validation and error handling
- HTML report generation with metrics

**Use Cases:**
- Baseline performance testing
- Capacity planning
- Regression testing
- SLA validation

---

### 2. Create JP (Journal Post) Test
**File:** `tests/create-jp.js`

**Purpose:** End-to-end Journal Post creation workflow

**Workflow:**
```
Authenticate → Create Case → Retrieve JP Templates → Create JP → Validate → Report
```

**Features:**
- Complete case → JP workflow
- Template prioritization ("Utgående dokument")
- JP ID extraction from multiple response locations
- Scenario-based configuration
- Integration with case-module and jp-module

**Use Cases:**
- JP creation performance baseline
- Workflow validation
- User experience simulation

---

### 3. Create JP With Multiple Documents Test
**File:** `tests/create-jp-with-multiple-document.js`

**Purpose:** Test single JP with multiple document attachments

**Workflow:**
```
Create Case → Create JP → Attach Documents (N times) → Validate Uploads
```

**Features:**
- Configurable document count (`DOC_COUNT`)
- Multiple MIME types support
- Real file upload via `DOC_FILES` (base64/plain text)
- Synthetic document generation
- Discovery mode for endpoint testing
- Early-exit on first failure

**Environment Variables:**
```bash
DOC_COUNT=5              # Number of documents
DOC_MIME=application/pdf # MIME type
DOC_FILES=path1,path2    # Real files
JP_ATTACH_DISCOVERY=true # Discovery mode
```

**Use Cases:**
- Document upload performance
- Large file handling
- Bulk attachment testing
- API endpoint discovery

**Documentation:** [README-create-jp-with-multiple-document.md](./tests/README-create-jp-with-multiple-document.md)

---

### 4. Create Multiple JPs With Multiple Documents Test ⭐ NEW
**File:** `tests/create-multiplejp-with-multiple-document.js`

**Purpose:** Create multiple incoming AND outgoing Journal Posts with bulk document attachments

**Workflow:**
```
Authenticate → Create Case → 
Create N Incoming JPs → Create M Outgoing JPs →
Attach Documents to All JPs → Validate All Operations
```

**Features:**
- **Dual JP Types:**
  - **Incoming JPs** (dokTypeId=1): With recipients, copy recipients, due date
  - **Outgoing JPs** (dokTypeId=4): With standard text templates
- **Document Modes:**
  - **Synthetic**: Lightweight text documents (fast functional testing)
  - **Test Documents**: 10 large binary files (1MB-10MB) for realistic performance
- **Batch Upload**: All documents in single API call using `dokuments[]` array
- **Binary Data Support**: K6 `open(file, 'b')` with proper MIME types
- **Configurable Counts**: Control incoming/outgoing JP quantities
- **Preloading**: Test documents loaded in K6 init phase for efficiency

**Test Documents:**
Location: `utils/modules/data/testDocuments/`
- 1mb.pdf, 1mb.docx, 3-mb.pdf, 5mb.docx, 6mb.pdf
- 10mb.pdf, 10mb.docx
- PerfTestingGuide.docx, PerfTestScenarios.xlsx, benchmarks.csv
- **Total:** 10 files, ~37MB

**Environment Variables:**
```bash
INCOMING_COUNT=2      # Number of incoming JPs (default: 2)
OUTGOING_COUNT=2      # Number of outgoing JPs (default: 2)
DOC_COUNT=3           # Documents per JP in synthetic mode (default: 3)
USE_TEST_DOCS=true    # Use large test documents (default: false)
USE_BATCH_UPLOAD=true # Batch vs individual upload (default: true)
SCENARIO=load_test    # Load test scenario (default: smoke_test)
```

**Usage Examples:**
```powershell
# Smoke test with large documents (default)
npm run test:create-multiplejp-with-multiple-document:smoke

# Smoke test with synthetic documents (fast)
npm run test:create-multiplejp-with-multiple-document:smoke:synthetic

# Load test with large documents
npm run test:create-multiplejp-with-multiple-document:load

# Custom configuration
k6 run tests/create-multiplejp-with-multiple-document.js `
  -e INCOMING_COUNT=5 -e OUTGOING_COUNT=3 `
  -e USE_TEST_DOCS=true -e SCENARIO=load_test
```

**Performance Metrics:**
| Mode | JPs | Docs/JP | Total Size | Time (smoke) |
|------|-----|---------|------------|--------------|
| Synthetic | 2+2 | 3 | ~12KB | ~3s |
| Test Documents | 2+2 | 10 | ~148MB | ~20s |

**Use Cases:**
- Realistic document upload performance testing
- Bulk JP creation with attachments
- Network bandwidth testing
- Production capacity simulation
- Different JP type workflows (incoming vs outgoing)

**Documentation:** [README-create-multiplejp-with-multiple-document.md](./tests/README-create-multiplejp-with-multiple-document.md)

---

## 📁 Project Structure

```
k6-tests/
├── package.json                          # NPM scripts (organized with comments)
├── README.md                             # This documentation
├── ARCHITECTURE.md                       # ⭐ System architecture & data flows
├── CHANGELOG.md                          # Version history
│
├── tests/                                # Test scripts
│   ├── create-sak.js                     # Case creation test
│   ├── create-jp.js                      # Journal Post creation test
│   ├── create-jp-with-multiple-document.js         # Single JP + docs
│   ├── create-multiplejp-with-multiple-document.js # ⭐ Multiple JPs + docs
│   └── README-create-multiplejp-with-multiple-document.md
│
├── utils/                                # Shared utilities
│   ├── api-client.js                     # HTTP wrapper (legacy)
│   ├── auth.js                           # Auth helpers (non-module)
│   ├── config-loader.js                  # Config file loader
│   ├── pacing.js                         # Think time utilities
│   ├── report-generator.js               # HTML report generator
│   ├── validation.js                     # Response validation
│   ├── error-sampler.js                  # Error sampling
│   │
│   └── modules/                          # Modular building blocks
│       ├── auth-module.js                # OAuth2 authentication
│       ├── case-module.js                # Case operations
│       ├── jp-module.js                  # ⭐ JP + document operations
│       ├── config-manager.js             # Config orchestration
│       │
│       └── config/                       # Configuration files
│           ├── autotest.json             # Active scenarios & thresholds
│           ├── dev.json                  # Dev environment (optional)
│           │
│           └── data/
│               ├── users-config.json           # OAuth2 credentials (7 users)
│               ├── websak-api-config.json      # API endpoints
│               └── testDocuments/              # ⭐ Test files (10 files, ~37MB)
│                   ├── 1mb.pdf
│                   ├── 1mb.docx
│                   ├── 3-mb.pdf
│                   ├── 5mb.docx
│                   ├── 6mb.pdf
│                   ├── 10mb.pdf
│                   ├── 10mb.docx
│                   ├── PerfTestingGuide.docx
│                   ├── PerfTestScenarios.xlsx
│                   └── benchmarks.csv
│
├── reports/                              # Generated reports (post-run)
│   ├── create-sak-report.html
│   ├── create-sak-summary.json
│   ├── create-jp-report.html
│   ├── create-jp-with-multiple-document-report.html
│   └── create-multiplejp-with-multiple-document-report.html
│
└── docs/                                 # Additional documentation
    ├── FIX_SUMMARY.md                    # Document attachment fix details
    ├── PAYLOAD_BUILDERS_GUIDE.md         # Centralized builders guide
    ├── MULTIPLEJP_IMPLEMENTATION_SUMMARY.md
    └── TEST_DOCUMENTS_ENHANCEMENT.md
```

---

## ⚙️ Configuration System

### Configuration Files

#### 1. autotest.json (Main Configuration)
**Location:** `utils/modules/config/autotest.json`

**Purpose:** 
- Load test scenarios (smoke, load, stress, spike, endurance)
- Performance thresholds (SLAs)
- Default active scenario

**Key Sections:**
```json
{
  "loadTest": {
    "activeScenario": "smoke_test",
    "scenarios": {
      "smoke_test": { "vus": 1, "iterations": 1 },
      "load_test": { "vus": 7, "duration": "5m" },
      "stress_test": { /* ramp pattern */ },
      "spike_test": { /* spike pattern */ },
      "endurance_test": { "vus": 5, "duration": "15m" }
    }
  },
  "thresholds": {
    "http_req_duration": ["p(95)<2000", "p(99)<5000"],
    "http_req_failed": ["rate<0.05"]
  }
}
```

---

#### 2. users-config.json (User Credentials)
**Location:** `utils/modules/config/data/users-config.json`

**Purpose:** OAuth2 user credentials for authentication

**Structure:**
```json
{
  "users": [
    {
      "username": "TA_ARK",
      "clientId": "ta-ark-client",
      "clientSecret": "secret-value"
    }
    // ... 7 users total
  ]
}
```

**User Allocation:** Round-robin per VU: `users[(__VU - 1) % users.length]`

---

#### 3. websak-api-config.json (API Endpoints)
**Location:** `utils/modules/config/data/websak-api-config.json`

**Purpose:** API host and endpoint definitions

**Structure:**
```json
{
  "api": {
    "host": "https://autotest01.acoscloud.no",
    "endpoints": {
      "sakstyper": "/api/websak/api/sakstyper",
      "sak": "/api/websak/api/sak",
      "jpDoktyper": "/api/websak/api/jp/doktyper/{caseId}",
      "jpCreate": "/api/websak/api/jp/ny",
      "jpUpload": "/api/websak/api/jp/uploadfiletodokument/"
    }
  },
  "oauth": {
    "tokenEndpoint": "/identity/connect/token"
  }
}
```

---

### Configuration Priority

```
Environment Variables (highest)
    ↓
Runtime Override (-e SCENARIO=load_test)
    ↓
autotest.json (activeScenario)
    ↓
Test defaults (lowest)
```

**Example:**
```powershell
# Use load_test scenario (override config default)
k6 run -e SCENARIO=load_test tests/create-jp.js

# Use activeScenario from autotest.json
k6 run tests/create-jp.js
```

---

## 🏃 Running Tests

### Basic Usage

```powershell
# Run specific test with npm scripts
npm run test:create-sak:smoke
npm run test:create-jp:load
npm run test:create-multiplejp-with-multiple-document:smoke

# Run with k6 directly
k6 run tests/create-sak.js
k6 run -e SCENARIO=load_test tests/create-jp.js
```

### Advanced Usage

```powershell
# Custom VUs and duration (bypasses scenarios)
k6 run tests/create-jp.js --vus 10 --duration 3m

# Multiple environment variables
k6 run tests/create-multiplejp-with-multiple-document.js `
  -e INCOMING_COUNT=3 `
  -e OUTGOING_COUNT=3 `
  -e USE_TEST_DOCS=true `
  -e SCENARIO=load_test

# HTTP debugging
k6 run --http-debug=full tests/create-jp.js

# Disable pacing (maximum throughput)
$env:PACING_MODE='none'; k6 run tests/create-sak.js
```

---

## 📝 NPM Scripts Reference

### Create Sak (Case) Tests

```powershell
# Scenario-based tests
npm run test:create-sak                  # Default (uses activeScenario)
npm run test:create-sak:smoke            # 1 VU, 1 iteration
npm run test:create-sak:load             # 7 VUs, 5 minutes
npm run test:create-sak:stress           # Ramp 1→7→14 (14 min)
npm run test:create-sak:spike            # Spike 2→14→2 (4 min)
npm run test:create-sak:endurance        # 5 VUs, 15 minutes

# No-pacing variants (maximum throughput)
npm run test:create-sak:load:nopace
npm run test:create-sak:stress:nopace
npm run test:create-sak:spike:nopace
npm run test:create-sak:smoke:nopace
npm run test:create-sak:endurance:nopace
```

---

### Create JP (Journal Post) Tests

```powershell
# Scenario-based tests
npm run test:create-jp                   # Default (uses activeScenario)
npm run test:create-jp:smoke             # 1 VU, 1 iteration
npm run test:create-jp:load              # 7 VUs, 5 minutes
npm run test:create-jp:stress            # Ramp 1→7→14 (14 min)
npm run test:create-jp:spike             # Spike 2→14→2 (4 min)
npm run test:create-jp:endurance         # 5 VUs, 15 minutes

# No-pacing variants
npm run test:create-jp:load:nopace
npm run test:create-jp:stress:nopace
npm run test:create-jp:spike:nopace
npm run test:create-jp:smoke:nopace
npm run test:create-jp:endurance:nopace
```

---

### Create JP With Multiple Documents Tests

```powershell
# Scenario-based tests
npm run test:create-jp-with-multiple-document                  # Default
npm run test:create-jp-with-multiple-document:smoke            # 1 JP, N docs
npm run test:create-jp-with-multiple-document:load             # Multiple users
npm run test:create-jp-with-multiple-document:stress           # High volume
npm run test:create-jp-with-multiple-document:spike            # Sudden spike
npm run test:create-jp-with-multiple-document:endurance        # Extended test

# No-pacing variants
npm run test:create-jp-with-multiple-document:smoke:nopace
npm run test:create-jp-with-multiple-document:load:nopace
npm run test:create-jp-with-multiple-document:stress:nopace
npm run test:create-jp-with-multiple-document:spike:nopace
npm run test:create-jp-with-multiple-document:endurance:nopace
```

---

### Create Multiple JPs With Multiple Documents Tests ⭐ NEW

```powershell
# Default test (uses config defaults)
npm run test:create-multiplejp-with-multiple-document

# Smoke test with large documents (2+2 JPs, 10 docs each)
npm run test:create-multiplejp-with-multiple-document:smoke

# Smoke test with synthetic documents (2+2 JPs, 3 docs each - fast)
npm run test:create-multiplejp-with-multiple-document:smoke:synthetic

# Load test with large documents (realistic performance)
npm run test:create-multiplejp-with-multiple-document:load

# Stress test with large documents (find system limits)
npm run test:create-multiplejp-with-multiple-document:stress
```

---

### Report Management

```powershell
# Open HTML reports
npm run report:open        # Open SAK report
npm run report:open:jp     # Open JP report

# List all reports
npm run report:list        # Shows: name, last modified time
```

---

### Development Tools

```powershell
# Code quality
npm run lint               # ESLint (quiet mode)
npm run format             # Prettier format

# Project setup
npm run prepare            # Husky install (git hooks)
```

---

## 🔧 Environment Variables

### Test Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `SCENARIO` | Override active scenario | From config | `load_test`, `stress_test` |
| `PACING_MODE` | Think time mode | scenario-based | `none`, `fixed` |
| `CONFIG_ENVIRONMENT` | Config file to use | `autotest` | `dev`, `autotest` |

---

### Document Upload Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `DOC_COUNT` | Documents per JP (synthetic) | 3 | `5`, `10` |
| `DOC_MIME` | Single MIME type | `application/pdf` | `text/plain` |
| `DOC_MIME_LIST` | Multiple MIME types | - | `application/pdf,text/plain` |
| `DOC_FILES` | Real file paths | - | `file1.pdf,file2.docx` |
| `DOC_FILE_MODE` | File encoding | `base64` | `plain`, `base64` |
| `DOC_SIZE_BASE` | Synthetic doc base size | 1000 | `5000` |
| `DOC_SIZE_STEP` | Size increment | 500 | `1000` |

---

### Multiple JPs Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `INCOMING_COUNT` | Number of incoming JPs | 2 | `5`, `10` |
| `OUTGOING_COUNT` | Number of outgoing JPs | 2 | `3`, `5` |
| `USE_TEST_DOCS` | Use large test documents | false | `true`, `false` |
| `USE_BATCH_UPLOAD` | Batch vs individual upload | true | `true`, `false` |

---

### Discovery & Debug

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `JP_ATTACH_DISCOVERY` | Discovery mode | false | `true` |
| `JP_ATTACH_SILENT` | Silent mode | false | `true` |
| `JP_ATTACH_PATHS` | Custom endpoints | From config | `/api/custom/upload` |

---

## 📊 Test Scenarios

All scenarios are defined in `autotest.json` under `loadTest.scenarios`:

| Scenario | VUs | Duration/Pattern | Purpose | Command Suffix |
|----------|-----|------------------|---------|----------------|
| **smoke_test** | 1 | 1 iteration | Quick validation, functionality check | `:smoke` |
| **load_test** | 7 | 5 minutes constant | Normal capacity baseline | `:load` |
| **stress_test** | 1→7→14 | 14 min progressive ramp | Find breaking points, max capacity | `:stress` |
| **spike_test** | 2→14→2 | 4 min sudden spike | Test resilience, auto-scaling | `:spike` |
| **endurance_test** | 5 | 15 minutes soak | Memory leaks, long-running stability | `:endurance` |

### Scenario Usage Patterns

**Smoke Test** - Before deploying changes
```powershell
npm run test:create-multiplejp-with-multiple-document:smoke:synthetic
# Fast validation with synthetic documents
```

**Load Test** - Baseline performance
```powershell
npm run test:create-jp:load
# Sustained load to establish performance baseline
```

**Stress Test** - Capacity planning
```powershell
npm run test:create-sak:stress
# Find maximum capacity and breaking points
```

**Spike Test** - Resilience testing
```powershell
npm run test:create-multiplejp-with-multiple-document:load
# Test system recovery from sudden load spikes
```

**Endurance Test** - Stability validation
```powershell
npm run test:create-jp:endurance
# Long-running test to detect memory leaks
```

---

## 📚 Documentation

### Core Documentation

| Document | Description |
|----------|-------------|
| [README.md](./README.md) | This file - comprehensive guide |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture, data flows, design patterns |
| [CHANGELOG.md](./CHANGELOG.md) | Version history and changes |

### Test-Specific Documentation

| Document | Description |
|----------|-------------|
| [README-create-multiplejp-with-multiple-document.md](./tests/README-create-multiplejp-with-multiple-document.md) | Multiple JPs test guide |

### Technical Documentation

| Document | Description |
|----------|-------------|
| [FIX_SUMMARY.md](./FIX_SUMMARY.md) | Document attachment fix details |
| [PAYLOAD_BUILDERS_GUIDE.md](./PAYLOAD_BUILDERS_GUIDE.md) | Centralized payload builders guide |
| [MULTIPLEJP_IMPLEMENTATION_SUMMARY.md](./MULTIPLEJP_IMPLEMENTATION_SUMMARY.md) | Multiple JPs implementation |
| [TEST_DOCUMENTS_ENHANCEMENT.md](./TEST_DOCUMENTS_ENHANCEMENT.md) | Test documents feature details |
| [DOCUMENT_ATTACHMENT_NOTES.md](./DOCUMENT_ATTACHMENT_NOTES.md) | Document attachment research |

---

## 🛠️ Troubleshooting

### Common Issues

#### 1. Authentication Failures
**Symptoms:** `400 Bad Request`, "invalid_client"

**Causes:**
- Incorrect credentials in `users-config.json`
- User not selected properly
- Token endpoint misconfigured

**Solution:**
```javascript
// Verify user selection
const user = users[(__VU - 1) % users.length];
console.log(`Using user: ${user.username}`);

// Check credentials
console.log(`Client ID: ${user.clientId}`);
```

---

#### 2. Document Upload Failures
**Symptoms:** `404 Not Found`, `405 Method Not Allowed`

**Causes:**
- Incorrect endpoint URL
- Missing JP ID in payload
- Wrong payload structure

**Solution:**
- Use `jp-module.js` centralized builders
- Verify endpoint in `websak-api-config.json`
- Enable discovery mode:
  ```powershell
  k6 run -e JP_ATTACH_DISCOVERY=true tests/create-jp-with-multiple-document.js
  ```

---

#### 3. Test Documents Not Loading
**Symptoms:** "File not found" errors

**Causes:**
- Incorrect file paths
- Missing test documents in `testDocuments/` folder

**Solution:**
```javascript
// Verify paths are relative to test file
const testDocPaths = [
  '../utils/modules/data/testDocuments/1mb.pdf',
  // ...
];

// Check file exists
const fileData = open(filePath, 'b');
if (!fileData || fileData.length === 0) {
  console.error(`Failed to load: ${filePath}`);
}
```

---

#### 4. High Error Rates
**Symptoms:** > 5% failed requests

**Causes:**
- Server overloaded (stress test)
- Network issues
- Invalid test data
- Rate limiting

**Solution:**
- Reduce VU count
- Increase ramp-up duration
- Check server logs
- Add pacing between requests:
  ```powershell
  # Don't use :nopace variants
  npm run test:create-sak:load  # With pacing
  ```

---

#### 5. Threshold Violations
**Symptoms:** K6 exit code 1, "thresholds have been crossed"

**Causes:**
- Performance degradation
- Unrealistic thresholds
- Server under heavy load

**Solution:**
- Review thresholds in `autotest.json`
- Check server resources
- Analyze HTML report for bottlenecks
- Adjust thresholds if necessary:
  ```json
  {
    "thresholds": {
      "http_req_duration": ["p(95)<3000"],  // Increased from 2000
      "http_req_failed": ["rate<0.10"]      // Increased from 0.05
    }
  }
  ```

---

## 🔐 Security Considerations

### Credentials Management
- ❌ Never commit credentials to version control
- ✅ Use separate config files (add to `.gitignore`)
- ✅ Rotate credentials regularly
- ✅ Use least-privilege principle

### API Access
- ✅ Always use HTTPS
- ✅ Validate SSL certificates
- ✅ Implement rate limiting awareness
- ✅ Respect API quotas

### Test Data
- ✅ Use anonymized/synthetic data
- ✅ Don't use production data
- ✅ Clean up test artifacts after runs

---

## 📈 Performance Metrics

### Standard K6 Metrics

| Metric | Description |
|--------|-------------|
| `http_req_duration` | Total request time (p50, p95, p99) |
| `http_req_waiting` | Time to first byte (TTFB) |
| `http_req_failed` | Failed requests rate |
| `http_reqs` | Total requests count |
| `iterations` | Completed iterations |
| `vus` | Active virtual users |

### Custom Metrics

Tests can define custom metrics:
```javascript
import { Counter, Rate, Trend } from 'k6/metrics';

const caseCreationTime = new Trend('case_creation_time');
const jpCreationRate = new Rate('jp_creation_rate');
const documentsUploaded = new Counter('documents_uploaded');
```

### Thresholds (SLAs)

Defined in `autotest.json`:
```json
{
  "thresholds": {
    "http_req_duration": ["p(95)<2000", "p(99)<5000"],
    "http_req_failed": ["rate<0.05"],
    "case_creation_time": ["p(95)<1500"]
  }
}
```

---

## 🚧 Future Enhancements

### Planned Features
- [ ] Support for additional JP types (internal, reply)
- [ ] Document verification endpoint calls
- [ ] Custom test document selection (subset)
- [ ] Parallel JP creation optimization
- [ ] Upload speed metrics per file type
- [ ] Support for images and archives
- [ ] Retry logic for large file uploads
- [ ] Document deletion/cleanup functions
- [ ] Real-time metrics dashboard
- [ ] Distributed load testing
- [ ] CI/CD integration templates

### Community Contributions
- Report issues on project repository
- Submit pull requests with tests
- Share performance insights
- Suggest new scenarios or features

---

## 🎓 Best Practices

### Test Design
1. **Start small** - Begin with smoke tests
2. **Use synthetic docs** for functional testing
3. **Use large docs** for performance testing
4. **Validate responses** at each step
5. **Apply proper pacing** for realistic simulation

### Configuration
1. **Define scenarios** in JSON, not code
2. **Use environment variables** for runtime overrides
3. **Keep credentials** in separate config files
4. **Document all options** in README

### Execution
1. **Run smoke tests** before major changes
2. **Establish baseline** with load tests
3. **Find limits** with stress tests
4. **Test resilience** with spike tests
5. **Check stability** with endurance tests

### Analysis
1. **Review HTML reports** after each run
2. **Track metrics** over time
3. **Investigate failures** immediately
4. **Compare baselines** for regression detection
5. **Share results** with team

---

## 📞 Support & Contact

### Getting Help
1. Check this README and [ARCHITECTURE.md](./ARCHITECTURE.md)
2. Review test-specific documentation
3. Search existing issues
4. Contact performance testing team

### Reporting Issues
When reporting issues, include:
- Test name and scenario
- Environment variables used
- K6 version (`k6 version`)
- Error messages and logs
- Expected vs actual behavior

---

## 📄 License

[Your License Here]

---

**Version:** 2.0.0  
**Last Updated:** October 3, 2025  
**Maintained by:** Performance Testing Team

---

## Quick Reference Card

```powershell
# Most Common Commands

# Smoke Tests (Quick Validation)
npm run test:create-sak:smoke
npm run test:create-jp:smoke
npm run test:create-multiplejp-with-multiple-document:smoke:synthetic

# Load Tests (Baseline Performance)
npm run test:create-sak:load
npm run test:create-jp:load
npm run test:create-multiplejp-with-multiple-document:load

# View Reports
npm run report:open
npm run report:open:jp

# Custom Runs
k6 run -e SCENARIO=load_test tests/create-jp.js
k6 run -e INCOMING_COUNT=5 -e USE_TEST_DOCS=true tests/create-multiplejp-with-multiple-document.js

# Debug
k6 run --http-debug=full tests/create-jp.js
```

---

**Happy Testing! 🚀**
