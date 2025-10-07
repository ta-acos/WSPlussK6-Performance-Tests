# WebSak Plus K6 Performance Testing - Architecture Documentation

**Last Updated:** October 3, 2025  
**Version:** 2.0.0

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Layers](#architecture-layers)
3. [Test Suite Components](#test-suite-components)
4. [Data Flow & Interactions](#data-flow--interactions)
5. [Configuration Management](#configuration-management)
6. [Module Dependencies](#module-dependencies)
7. [Test Execution Flow](#test-execution-flow)
8. [Document Attachment Architecture](#document-attachment-architecture)
9. [Performance Testing Patterns](#performance-testing-patterns)
10. [Extensibility & Best Practices](#extensibility--best-practices)

---

## System Overview

### Purpose
Comprehensive K6-based performance testing framework for WebSak Plus, focusing on Case (Sak) and Journal Post (JP) creation workflows with document attachment capabilities.

### Key Features
- **Scenario-based load testing** (smoke, load, stress, spike, endurance)
- **Modular architecture** with reusable components
- **Centralized configuration** management
- **Multiple test types**: Single/Multiple JPs with document attachments
- **Binary & synthetic document** support
- **OAuth2 authentication** with multi-user support
- **HTML reporting** with metrics visualization
- **Configurable pacing** and think time

### Technology Stack
- **K6 v0.x** - Load testing framework
- **JavaScript (ES6)** - Test scripting
- **OAuth2** - Authentication protocol
- **JSON** - Configuration format
- **PowerShell** - NPM scripts (Windows environment)

---

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                        Test Scripts Layer                        │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐  │
│  │  create-sak.js │  │  create-jp.js  │  │ create-jp-with-  │  │
│  │                │  │                │  │  multiple-doc    │  │
│  └────────────────┘  └────────────────┘  └──────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │      create-multiplejp-with-multiple-document.js         │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Utility Modules Layer                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ auth-module  │  │ case-module  │  │    jp-module         │  │
│  │              │  │              │  │ (payload builders)   │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │config-manager│  │ api-client   │  │  report-generator    │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   pacing.js  │  │ validation.js│  │  error-tracker.js    │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Configuration Data Layer                      │
│  ┌──────────────────┐  ┌────────────────────┐  ┌─────────────┐ │
│  │  autotest.json   │  │ users-config.json  │  │  dev.json   │ │
│  │  (scenarios)     │  │  (credentials)     │  │  (optional) │ │
│  └──────────────────┘  └────────────────────┘  └─────────────┘ │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           websak-api-config.json (endpoints)             │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           testDocuments/ (binary files)                  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       External Services                          │
│  ┌──────────────────┐  ┌────────────────────────────────────┐  │
│  │ Identity Server  │  │   WebSak Plus API                  │  │
│  │  (OAuth2/OIDC)   │  │   - Case Management                │  │
│  │                  │  │   - Journal Post Management        │  │
│  └──────────────────┘  │   - Document Upload                │  │
│                        └────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Test Suite Components

### 1. Test Scripts (tests/)

#### create-sak.js
**Purpose:** Performance test for Case (Sak) creation  
**Workflow:**
1. Authenticate user
2. Retrieve case templates
3. Create new case
4. Validate response
5. Apply pacing

**Key Features:**
- Scenario-based execution (smoke → endurance)
- Dynamic user allocation (round-robin)
- Template selection logic
- Comprehensive error handling
- HTML report generation

**Configuration:**
- Uses `autotest.json` for scenarios
- Reads users from `users-config.json`
- Supports all 5 load patterns

---

#### create-jp.js
**Purpose:** Performance test for Journal Post creation  
**Workflow:**
1. Authenticate user
2. Create case
3. Retrieve JP templates
4. Create journal post
5. Validate JP creation
6. Apply pacing

**Key Features:**
- Complete case → JP workflow
- Template prioritization ("Utgående dokument")
- JP ID extraction from multiple response locations
- Integration with case-module and jp-module
- Scenario-based load testing

**Configuration:**
- Inherits scenario config from autotest.json
- Supports runtime scenario override via `-e SCENARIO=<name>`

---

#### create-jp-with-multiple-document.js
**Purpose:** Test single JP creation with multiple document attachments  
**Workflow:**
1. Create case
2. Create journal post
3. Attach multiple documents (sequential or batch)
4. Validate attachments

**Key Features:**
- Configurable document count (`DOC_COUNT`)
- Supports real files via `DOC_FILES` (base64 or plain text)
- Synthetic document generation
- MIME type configuration (`DOC_MIME`, `DOC_MIME_LIST`)
- Discovery mode for endpoint testing
- Early-exit on first failure

**Environment Variables:**
```bash
DOC_COUNT=5              # Number of documents to attach
DOC_MIME=application/pdf # Single MIME type
DOC_FILES=path1,path2    # Real file paths
DOC_FILE_MODE=base64     # Encoding mode
JP_ATTACH_DISCOVERY=true # Discovery mode
```

---

#### create-multiplejp-with-multiple-document.js
**Purpose:** Test multiple incoming/outgoing JPs with bulk document attachments  
**Workflow:**
1. Authenticate user
2. Create case
3. Create N incoming JPs
4. Create M outgoing JPs
5. Attach documents to all JPs (batch upload)
6. Validate all operations

**Key Features:**
- **Dual JP types:** Incoming (dokTypeId=1) & Outgoing (dokTypeId=4)
- **Incoming JP payload:** Recipients, copy recipients, due date
- **Outgoing JP payload:** Standard text templates
- **Document modes:**
  - Synthetic: Lightweight text documents (fast)
  - Test documents: 10 large binary files (1MB-10MB)
- **Batch upload:** All documents in single API call using `dokuments[]` array
- **Binary data support:** K6 `open(file, 'b')` with proper MIME types
- **Configurable counts:** Control incoming/outgoing JP quantities

**Environment Variables:**
```bash
INCOMING_COUNT=2      # Number of incoming JPs
OUTGOING_COUNT=2      # Number of outgoing JPs
DOC_COUNT=3           # Documents per JP (synthetic mode)
USE_TEST_DOCS=true    # Use large test documents
USE_BATCH_UPLOAD=true # Batch vs individual upload
```

**Test Documents:**
Location: `utils/modules/data/testDocuments/`
- 1mb.pdf, 1mb.docx, 3-mb.pdf, 5mb.docx
- 6mb.pdf, 10mb.pdf, 10mb.docx
- PerfTestingGuide.docx, PerfTestScenarios.xlsx
- benchmarks.csv

Total: 10 files, ~37MB

**JP Type Structures:**

*Incoming JP (dokTypeId: 1):*
```javascript
{
  dokTypeId: 1,
  dokStatusId: 7,
  brevDato: "2025-10-03T00:00:00+02:00",
  forfallsDato: "2025-10-24T00:00:00+02:00", // 21 days
  nyeMottakere: [{ id: 31, navn: "TestAutomation - Arkivar" }],
  nyeKopiMottakere: [{ id: 33, navn: "TestAutomation - Saksbehandler" }]
}
```

*Outgoing JP (dokTypeId: 4):*
```javascript
{
  dokTypeId: 4,
  dokStatusId: 6,
  brevDato: "2025-10-03T00:00:00+02:00",
  standardTekster: [{ key: 'Start', id: 42 }]
}
```

---

### 2. Utility Modules (utils/modules/)

#### auth-module.js
**Purpose:** OAuth2 authentication management  
**Functions:**
- `authenticate(config, user, vuId)` - Obtain access token
- Token caching and refresh logic
- Multi-user support with round-robin

**Dependencies:**
- `users-config.json` - Credentials
- `websak-api-config.json` - Token endpoint

**Authentication Flow:**
```
User Credentials → OAuth2 Token Request → Access Token
                 ↓
        Store in VU-specific variable
                 ↓
        Use in Authorization header
```

---

#### case-module.js
**Purpose:** Case (Sak) management operations  
**Functions:**
- `getCaseTemplates(config, authToken, vuId)` - Retrieve templates
- `createCase(config, authToken, caseName, templateId, vuId)` - Create case
- Template selection logic ("Ny sak" prioritization)

**API Interactions:**
- GET `/api/websak/api/sakstyper` - List templates
- POST `/api/websak/api/sak` - Create case

---

#### jp-module.js
**Purpose:** Journal Post management and document handling  
**Functions:**
- `getJpTemplates(config, authToken, caseId, vuId)` - Retrieve JP templates
- `createJournalPost(config, authToken, caseId, jpName, jpTypeId, vuId)` - Create JP
- `buildJpDocumentPayload(documentData, jpId, isMainDocument)` - Build doc payload
- `buildMultipartFormData(documentData, jpId, documentIndex, isMainDocument)` - Individual upload
- `buildBatchMultipartFormData(documentsArray, jpId, mainDocumentIndex)` - Batch upload
- `attachDocumentToJp(config, authToken, jpId, documentData, vuId)` - Upload document

**Key Features:**
- **Centralized payload builders** - Single source of truth for document payloads
- **Binary data support** - `binaryData || content || base64Content` fallback
- **Batch upload** - All documents in one request using `dokuments[i]` array
- **Individual upload** - Sequential uploads with proper array indices
- **MIME type handling** - Automatic detection from file extensions
- **Template prioritization** - "Utgående dokument" preferred

**Payload Structure:**
```javascript
// Individual document
{
  'jp.id': jpId,
  'dokuments[0].tittel': 'Document Title',
  'dokuments[0].dokumentBeskrivelse': 'Description',
  'dokuments[0].hovedDokument': true/false,
  'dokuments[0].file': http.file(binaryData, name, mimeType)
}

// Batch upload
{
  'jp.id': jpId,
  'dokuments[0].tittel': 'Doc 1',
  'dokuments[0].file': file1,
  'dokuments[1].tittel': 'Doc 2',
  'dokuments[1].file': file2,
  // ... up to N documents
}
```

**API Interactions:**
- GET `/api/websak/api/jp/doktyper/{caseId}` - List JP templates
- POST `/api/websak/api/jp/ny` - Create JP
- POST `/api/websak/api/jp/uploadfiletodokument/` - Upload documents

---

#### config-manager.js
**Purpose:** Centralized configuration orchestration  
**Functions:**
- `loadTestConfig(environment)` - Load all configs
- `getK6OptionsWithScenarios(config, scenarioOverride)` - Generate K6 options
- `getConfiguredUsers(config)` - User allocation
- `formatTime(ms)` - Time formatting utilities

**Configuration Sources:**
1. `autotest.json` or `dev.json` - Scenarios, thresholds
2. `users-config.json` - User credentials
3. `websak-api-config.json` - API endpoints

**Scenario Resolution:**
```javascript
Env var SCENARIO → Override
     ↓ (if not set)
config.loadTest.activeScenario → Default
     ↓
Apply VUs, duration, stages, thresholds
```

---

#### report-generator.js
**Purpose:** Enhanced HTML report generation  
**Functions:**
- `generateHtmlReport(data, outputPath)` - Create HTML report
- `generateSummaryJson(data, outputPath)` - Export metrics JSON

**Report Sections:**
1. Test Overview (duration, VUs, scenarios)
2. Performance Metrics (response times, throughput)
3. Pass/Fail Thresholds
4. Error Analysis
5. Visual Charts (if applicable)

---

### 3. Shared Utilities (utils/)

#### api-client.js
**Purpose:** Low-level HTTP wrapper  
**Note:** Mostly used for legacy support; most tests use http directly

---

#### pacing.js
**Purpose:** Think time and pacing control  
**Functions:**
- `applyPacing(duration)` - Sleep between iterations
- `calculatePacing(targetRPS, vus)` - Dynamic pacing calculation

**Pacing Modes:**
- `PACING_MODE=none` - No delays (maximum throughput)
- `PACING_MODE=fixed` - Fixed sleep duration
- Default - Scenario-based pacing

---

#### validation.js
**Purpose:** Common validation helpers  
**Functions:**
- `validateResponse(response, expectedStatus)` - HTTP response validation
- `extractField(response, fieldName)` - Data extraction
- Error categorization

---

#### error-tracker.js
**Purpose:** Error tracking using k6 Custom Metrics (fixes context isolation issues)  
**Functions:**
- Record errors using k6 Custom Metrics (persists across contexts)
- Detailed error logging with timestamps and context
- Error analytics injection into summary reports

---

## Data Flow & Interactions

### Typical Test Execution Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         Init Phase                               │
│  • Load configuration files (JSON)                               │
│  • Preload test documents (if USE_TEST_DOCS=true)               │
│  • Setup K6 options (scenarios, thresholds)                      │
│  • Initialize counters and metrics                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      VU Init Phase (per VU)                      │
│  • Assign user credentials (round-robin)                         │
│  • Initialize VU-specific state                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Main Execution (default)                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  1. Authentication                                         │  │
│  │     • Get OAuth2 token for assigned user                  │  │
│  │     • Cache token for VU session                          │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ↓                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  2. Create Case                                            │  │
│  │     • Retrieve case templates                             │  │
│  │     • Select template ("Ny sak" preferred)                │  │
│  │     • POST to create case                                 │  │
│  │     • Extract case ID from response                       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ↓                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  3. Create Journal Post(s)                                 │  │
│  │     • Retrieve JP templates for case                      │  │
│  │     • Select JP template (type-specific)                  │  │
│  │     • Build JP payload (incoming vs outgoing)             │  │
│  │     • POST to create JP                                   │  │
│  │     • Extract JP ID from response                         │  │
│  │     • Repeat for multiple JPs (if applicable)             │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ↓                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  4. Attach Documents (if applicable)                       │  │
│  │     • Generate/load document data                         │  │
│  │     • Build multipart form data                           │  │
│  │     • Batch upload (all docs) OR                          │  │
│  │     • Individual upload (sequential)                      │  │
│  │     • Validate each upload response                       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ↓                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  5. Validation & Metrics                                   │  │
│  │     • Check HTTP status codes                             │  │
│  │     • Validate response structure                         │  │
│  │     • Record custom metrics                               │  │
│  │     • Log success/failure                                 │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ↓                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  6. Pacing                                                 │  │
│  │     • Apply think time (if PACING_MODE != 'none')         │  │
│  │     • Sleep before next iteration                         │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        Teardown Phase                            │
│  • Aggregate metrics                                             │
│  • Generate HTML report                                          │
│  • Export summary JSON                                           │
│  • Display test summary                                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Configuration Management

### Configuration Files

#### 1. autotest.json / dev.json
**Location:** `utils/modules/config/`  
**Purpose:** Load test scenarios and thresholds

**Structure:**
```json
{
  "loadTest": {
    "activeScenario": "smoke_test",
    "scenarios": {
      "smoke_test": {
        "name": "smoke_test",
        "description": "Quick validation",
        "executor": "shared-iterations",
        "vus": 1,
        "iterations": 1,
        "maxDuration": "5m"
      },
      "load_test": {
        "executor": "constant-vus",
        "vus": 7,
        "duration": "5m"
      }
      // ... other scenarios
    }
  },
  "thresholds": {
    "http_req_duration": ["p(95)<2000", "p(99)<5000"],
    "http_req_failed": ["rate<0.05"]
  }
}
```

---

#### 2. users-config.json
**Location:** `utils/modules/config/data/`  
**Purpose:** OAuth2 user credentials

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

**User Allocation:**
- Round-robin: `users[(__VU - 1) % users.length]`
- Each VU gets dedicated user
- Prevents credential conflicts

---

#### 3. websak-api-config.json
**Location:** `utils/modules/config/data/`  
**Purpose:** API endpoints and configuration

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
    "tokenEndpoint": "/identity/connect/token",
    "scope": ""
  }
}
```

---

### Runtime Configuration Override

```bash
# Override scenario
k6 run -e SCENARIO=load_test tests/create-jp.js

# Override document settings
k6 run -e DOC_COUNT=10 -e USE_TEST_DOCS=true tests/create-multiplejp-with-multiple-document.js

# Override JP counts
k6 run -e INCOMING_COUNT=5 -e OUTGOING_COUNT=3 tests/create-multiplejp-with-multiple-document.js

# Disable pacing
$env:PACING_MODE='none'; k6 run tests/create-sak.js
```

---

## Module Dependencies

### Dependency Graph

```
create-multiplejp-with-multiple-document.js
    ├── config-manager.js
    │   ├── config-loader.js
    │   ├── autotest.json
    │   ├── users-config.json
    │   └── websak-api-config.json
    ├── auth-module.js
    │   └── http (K6 built-in)
    ├── case-module.js
    │   ├── http
    │   └── validation.js
    ├── jp-module.js
    │   ├── http
    │   └── validation.js
    ├── pacing.js
    │   └── sleep (K6 built-in)
    ├── report-generator.js
    │   └── htmlContent (template)
    └── testDocuments/ (10 binary files)

create-jp-with-multiple-document.js
    ├── [same as above, minus testDocuments]
    └── real files via DOC_FILES env var

create-jp.js
    ├── config-manager.js
    ├── auth-module.js
    ├── case-module.js
    ├── jp-module.js
    ├── pacing.js
    └── report-generator.js

create-sak.js
    ├── config-manager.js
    ├── auth-module.js
    ├── case-module.js
    ├── pacing.js
    └── report-generator.js
```

---

## Document Attachment Architecture

### Breakthrough: dokuments[] Array Structure

**Key Discovery:** WebSak API accepts document arrays in multipart form data using indexed keys:

```javascript
// Batch upload - all documents in one request
{
  'jp.id': jpId,
  'dokuments[0].tittel': 'First Document',
  'dokuments[0].dokumentBeskrivelse': 'Description',
  'dokuments[0].hovedDokument': true,
  'dokuments[0].file': http.file(data1, 'file1.pdf', 'application/pdf'),
  'dokuments[1].tittel': 'Second Document',
  'dokuments[1].dokumentBeskrivelse': 'Description',
  'dokuments[1].hovedDokument': false,
  'dokuments[1].file': http.file(data2, 'file2.pdf', 'application/pdf')
  // ... up to N documents
}
```

### Centralized Payload Builders (jp-module.js)

#### buildMultipartFormData()
**Purpose:** Build individual document upload payload  
**Parameters:**
- `documentData` - Document metadata and content
- `jpId` - Journal Post ID
- `documentIndex` - Array index (for batch upload)
- `isMainDocument` - Flag for primary document

**Returns:** Multipart form data object

**Content Priority:**
1. `binaryData` - Raw binary file content (preferred for test documents)
2. `content` - Text content (synthetic documents)
3. `base64Content` - Base64 encoded (legacy support)
4. Fallback: Default text content

---

#### buildBatchMultipartFormData()
**Purpose:** Build batch upload payload for multiple documents  
**Parameters:**
- `documentsArray` - Array of document objects
- `jpId` - Journal Post ID
- `mainDocumentIndex` - Index of primary document (default: 0)

**Returns:** Multipart form data object with all documents

**Features:**
- Single request for N documents
- Proper array indexing (`dokuments[i]`)
- Main document designation
- MIME type per document

---

### Document Upload Modes

#### Batch Upload (USE_BATCH_UPLOAD=true)
**Benefits:**
- Single API call for all documents
- Reduced network overhead
- Faster execution
- Lower server load

**Use Cases:**
- Performance testing
- Bulk document scenarios
- Production workflows

**Implementation:**
```javascript
const formData = buildBatchMultipartFormData(documentsArray, jpId, 0);
const response = http.post(uploadUrl, formData, { headers });
```

---

#### Individual Upload (USE_BATCH_UPLOAD=false)
**Benefits:**
- Granular error handling
- Progress tracking per document
- Easier debugging
- Endpoint discovery

**Use Cases:**
- Error testing
- Incremental uploads
- Legacy system support

**Implementation:**
```javascript
documentsArray.forEach((doc, index) => {
  const formData = buildMultipartFormData(doc, jpId, index, index === 0);
  const response = http.post(uploadUrl, formData, { headers });
});
```

---

### Test Document Preloading

**Location:** Init phase (K6 setup function)  
**Trigger:** `USE_TEST_DOCS=true`

**Process:**
```javascript
const testDocPaths = [
  '../utils/modules/data/testDocuments/1mb.pdf',
  '../utils/modules/data/testDocuments/1mb.docx',
  // ... 10 files total
];

const preloadedTestDocuments = [];

testDocPaths.forEach((filePath) => {
  const fileData = open(filePath, 'b'); // Binary mode
  const mimeType = detectMimeType(fileName);
  
  preloadedTestDocuments.push({
    name: fileName,
    binaryData: fileData,
    mimeType: mimeType,
    tittel: fileName.replace(/\.[^/.]+$/, ''),
    size: fileData.length
  });
});
```

**MIME Type Detection:**
```javascript
function detectMimeType(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  const mimeTypes = {
    'pdf': 'application/pdf',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'csv': 'text/csv'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}
```

---

## Performance Testing Patterns

### 1. Scenario-Based Testing

**Pattern:** Define reusable load patterns in configuration

**Benefits:**
- Consistent test methodology
- Easy scenario switching
- Reproducible results
- Clear test objectives

**Scenarios:**

| Scenario | Pattern | Purpose |
|----------|---------|---------|
| **Smoke** | 1 VU, 1 iteration | Quick validation, functionality check |
| **Load** | 7 VUs, 5 min constant | Normal capacity baseline |
| **Stress** | Ramp 1→7→14 over 14 min | Find breaking points, max capacity |
| **Spike** | 2→14→2 over 4 min | Test resilience, auto-scaling |
| **Endurance** | 5 VUs, 15 min | Memory leaks, stability, resource exhaustion |

---

### 2. Multi-User Testing

**Pattern:** Round-robin user allocation

**Implementation:**
```javascript
const users = getConfiguredUsers(testConfig);
const user = users[(__VU - 1) % users.length];
```

**Benefits:**
- Prevents credential conflicts
- Simulates real user behavior
- Tests concurrent access
- Load distribution

---

### 3. Document Testing Strategies

#### Synthetic Documents (Fast Functional Testing)
**Use Case:** API validation, quick smoke tests  
**Characteristics:**
- Small text content (~1KB)
- Fast generation
- Minimal network impact
- High iteration rate

**Configuration:**
```bash
USE_TEST_DOCS=false
DOC_COUNT=3
```

---

#### Large Test Documents (Realistic Performance)
**Use Case:** Production simulation, capacity planning  
**Characteristics:**
- Real file types (PDF, DOCX, XLSX, CSV)
- Large sizes (1MB-10MB)
- Binary content
- Network bandwidth testing

**Configuration:**
```bash
USE_TEST_DOCS=true
# Uses all 10 preloaded files automatically
```

---

### 4. Pacing Control

**Pattern:** Configurable think time between iterations

**Modes:**
1. **None** (`PACING_MODE=none`) - Maximum throughput
2. **Fixed** - Constant sleep duration
3. **Scenario-based** - Defined per scenario

**Implementation:**
```javascript
if (__ENV.PACING_MODE !== 'none') {
  sleep(thinkTime);
}
```

**Use Cases:**
- Realistic user simulation (with pacing)
- Capacity testing (without pacing)
- SLA validation (scenario-based)

---

## Extensibility & Best Practices

### Adding New Tests

1. **Create test file** in `tests/`
2. **Import required modules:**
   ```javascript
   import { authenticate } from '../utils/modules/auth-module.js';
   import { getK6OptionsWithScenarios } from '../utils/modules/config-manager.js';
   ```
3. **Use centralized config:**
   ```javascript
   const testConfig = loadTestConfig('autotest');
   export const options = getK6OptionsWithScenarios(testConfig);
   ```
4. **Implement default function:**
   ```javascript
   export default function() {
     // Test logic
   }
   ```
5. **Add npm scripts** to `package.json`
6. **Update documentation**

---

### Adding New Document Upload Endpoints

1. **Update websak-api-config.json:**
   ```json
   {
     "api": {
       "endpoints": {
         "jpUploadNew": "/api/websak/api/jp/{jpId}/newdocument"
       }
     }
   }
   ```

2. **Use centralized builders in jp-module.js:**
   - No changes needed if payload structure is consistent
   - Modify `buildMultipartFormData()` if structure differs

3. **Test with discovery mode:**
   ```bash
   k6 run -e JP_ATTACH_DISCOVERY=true tests/create-jp-with-multiple-document.js
   ```

---

### Adding New JP Types

1. **Create payload generator function:**
   ```javascript
   function generateCustomJpPayload(caseId, jpName, testMeta) {
     return {
       dokTypeId: X,
       dokStatusId: Y,
       // ... custom fields
     };
   }
   ```

2. **Use in test:**
   ```javascript
   const payload = generateCustomJpPayload(caseId, jpName, testMeta);
   const jpResponse = createJournalPostWithPayload(config, authToken, payload, vuId);
   ```

3. **Document JP type in this file**

---

### Best Practices

#### Code Organization
- ✅ Use centralized modules for reusable logic
- ✅ Keep test files focused on workflow
- ✅ Separate configuration from code
- ✅ Use descriptive function and variable names

#### Configuration
- ✅ Define scenarios in JSON, not in code
- ✅ Use environment variables for runtime overrides
- ✅ Keep credentials in separate config files
- ✅ Document all configuration options

#### Testing
- ✅ Start with smoke tests
- ✅ Use synthetic documents for functional testing
- ✅ Use large documents for performance testing
- ✅ Validate responses at each step
- ✅ Apply proper pacing for realistic simulation

#### Documentation
- ✅ Update README for new tests
- ✅ Document environment variables
- ✅ Provide usage examples
- ✅ Keep architecture diagram current

#### Error Handling
- ✅ Validate HTTP status codes
- ✅ Log errors with context (VU, iteration)
- ✅ Use error sampling to prevent log flooding
- ✅ Fail fast in smoke tests
- ✅ Graceful degradation in load tests

---

## Performance Metrics

### Standard Metrics

K6 automatically collects:
- `http_req_duration` - Total request time
- `http_req_waiting` - Time to first byte (TTFB)
- `http_req_sending` - Time sending request
- `http_req_receiving` - Time receiving response
- `http_req_failed` - Failed requests rate
- `http_reqs` - Total requests count
- `vus` - Active virtual users
- `iterations` - Completed iterations

### Custom Metrics

Tests can define custom metrics:
```javascript
import { Counter, Rate, Trend } from 'k6/metrics';

const caseCreationTime = new Trend('case_creation_time');
const jpCreationRate = new Rate('jp_creation_rate');
const documentsUploaded = new Counter('documents_uploaded');

// Record metrics
caseCreationTime.add(response.timings.duration);
jpCreationRate.add(response.status === 200);
documentsUploaded.add(docCount);
```

### Thresholds

Defined in `autotest.json`:
```json
{
  "thresholds": {
    "http_req_duration": ["p(95)<2000", "p(99)<5000"],
    "http_req_failed": ["rate<0.05"],
    "case_creation_time": ["p(95)<1500"],
    "jp_creation_rate": ["rate>0.95"]
  }
}
```

**Threshold Evaluation:**
- ✅ Pass: All thresholds met
- ❌ Fail: Any threshold violated
- Exit code reflects pass/fail status

---

## Security Considerations

### Credentials Management
- ❌ Never commit credentials to version control
- ✅ Use separate config files (`.gitignore`)
- ✅ Use environment variables for sensitive data
- ✅ Rotate credentials regularly

### Token Management
- ✅ Tokens cached per VU session
- ✅ Short-lived tokens (OAuth2 standard)
- ✅ No token sharing between VUs
- ❌ Tokens not persisted to disk

### API Access
- ✅ Use HTTPS for all API calls
- ✅ Validate SSL certificates
- ✅ Implement rate limiting awareness
- ✅ Respect API quotas

---

## Troubleshooting

### Common Issues

#### 1. Authentication Failures
**Symptoms:** 400 Bad Request, "invalid_client"  
**Causes:**
- Incorrect credentials in `users-config.json`
- User not selected properly (round-robin issue)
- Token endpoint misconfigured

**Solution:**
```javascript
// Verify user selection
const user = users[(__VU - 1) % users.length];
console.log(`Using user: ${user.username}`);

// Check token endpoint
console.log(`Token URL: ${config.api.host}${config.oauth.tokenEndpoint}`);
```

---

#### 2. Document Upload Failures
**Symptoms:** 404 Not Found, 405 Method Not Allowed  
**Causes:**
- Incorrect endpoint URL
- Missing JP ID in payload
- Wrong payload structure

**Solution:**
- Use `jp-module.js` centralized builders
- Verify `jp.id` is set correctly
- Check endpoint in `websak-api-config.json`
- Enable discovery mode: `-e JP_ATTACH_DISCOVERY=true`

---

#### 3. Test Documents Not Loading
**Symptoms:** "File not found" errors  
**Causes:**
- Incorrect file paths
- Missing test documents

**Solution:**
```javascript
// Verify paths are relative to test file
const testDocPaths = [
  '../utils/modules/data/testDocuments/1mb.pdf',
  // ...
];

// Check file exists
const fileData = open(filePath, 'b');
if (!fileData) {
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

**Solution:**
- Reduce VU count
- Increase ramp-up duration
- Check server logs
- Validate test data

---

## Future Enhancements

### Planned Features
- [ ] Support for additional JP types (internal, reply, etc.)
- [ ] Document verification endpoint calls
- [ ] Custom test document selection (subset of 10 files)
- [ ] Document size threshold configuration
- [ ] Parallel JP creation for load testing
- [ ] Upload speed metrics per file type
- [ ] Support for additional file formats (images, archives)
- [ ] Retry logic for large file uploads
- [ ] Document deletion/cleanup functions
- [ ] Real-time metrics dashboard
- [ ] Distributed load testing support
- [ ] CI/CD integration templates

### Community Contributions
- Report issues on GitHub
- Submit pull requests with tests
- Share performance insights
- Suggest new scenarios

---

## Conclusion

This architecture provides a robust, maintainable, and extensible framework for performance testing WebSak Plus. Key strengths:

1. **Modularity** - Reusable components across tests
2. **Configuration-driven** - Easy scenario management
3. **Centralized logic** - Single source of truth for payloads
4. **Comprehensive** - Covers multiple workflows and document strategies
5. **Well-documented** - Clear guidance for users and developers

For questions or support, refer to the main [README.md](./README.md) or individual test documentation files.

---

**Document Version:** 2.0.0  
**Last Updated:** October 3, 2025  
**Maintained by:** Performance Testing Team
