# Architecture Documentation

## System Overview

Acos GRAF Load Test v3.0 is a comprehensive K6-based performance testing framework designed for WebSak Plus applications. The system employs a modular architecture with centralized configuration management, environment abstraction, and enhanced reporting capabilities.

## Core Principles

### 1. Modularity
- **Separation of Concerns**: Each module handles a specific aspect (auth, cases, journal posts, documents)
- **Reusable Components**: Common functionality abstracted into utility modules
- **Pluggable Architecture**: Easy to add new test types or modify existing ones

### 2. Configuration Management
- **Environment Abstraction**: Support for multiple environments (autotest, dev, prod)
- **Centralized Settings**: All configuration in dedicated JSON files
- **Dynamic Loading**: Runtime environment and scenario selection

### 3. Enhanced Reporting
- **Verbose Logging**: Detailed activity tracking with smart content detection
- **Multi-format Reports**: HTML dashboards, JSON summaries, CSV exports
- **Performance Benchmarking**: Industry-standard threshold comparisons

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   NPM Script Layer                      │
│  (50+ commands organized by complexity & test type)     │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                 K6 Test Layer                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │   Cases     │  │Journal Posts│  │   Documents     │ │
│  │create-sak.js│  │ create-jp.js│  │ Multi-uploads   │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│              Business Logic Layer                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │Auth Module  │  │Case Module  │  │  JP Module      │ │
│  │ • Login     │  │• Templates  │  │ • Templates     │ │
│  │ • Session   │  │• Creation   │  │ • Creation      │ │
│  │ • Refresh   │  │• Validation │  │ • Documents     │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                Utility Layer                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │Config Mgmt  │  │Report Gen   │  │ Verbose Logger  │ │
│  │• Env Load   │  │• HTML       │  │ • Smart Content │ │
│  │• Dynamic    │  │• JSON       │  │ • Test Detection│ │
│  │• Validation │  │• Thresholds │  │ • Activity Log  │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│             Configuration Layer                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │Environment  │  │Test Data    │  │  Scenarios      │ │
│  │• API URLs   │  │• Users      │  │ • Load Profiles │ │
│  │• Settings   │  │• Documents  │  │ • Thresholds    │ │
│  │• Paths      │  │• Templates  │  │ • Duration      │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Module Breakdown

### 1. Configuration System

#### Configuration Manager (`src/lib/config-manager.js`)
**Purpose**: Centralized configuration loading and environment management

**Key Features**:
- Dynamic environment detection
- Configuration validation
- Runtime parameter override
- Error handling with fallbacks

**Configuration Files**:
```
src/config/
├── environments.json       # Environment definitions
├── autotest.json          # Test scenarios and thresholds
├── dev.json              # Development environment settings
└── paths-config.json     # Path and endpoint configurations
```

**Usage Pattern**:
```javascript
// Dynamic environment loading
const config = loadConfig(environment || 'autotest');
const apiUrl = config.environments[environment].baseUrl;
```

### 2. Authentication System

#### Auth Module (`src/lib/auth-module.js`)
**Purpose**: Handle authentication flows and session management

**Capabilities**:
- User authentication with credentials
- Session token management
- Token refresh handling
- Authentication error recovery

**Flow**:
1. Load user credentials from `users-config.json`
2. Perform login API call
3. Extract and store session tokens
4. Provide authentication headers for subsequent requests

### 3. Test Workflow System

#### Case Module (`src/lib/case-module.js`)
**Purpose**: Handle case-related operations

**Operations**:
- Retrieve case templates
- Create new cases
- Fetch reference data (case types, decision codes)
- Validate case creation responses

#### JP Module (`src/lib/jp-module.js`)
**Purpose**: Handle journal post operations

**Operations**:
- Retrieve JP templates
- Create journal posts (incoming/outgoing)
- Handle document attachments
- Validate JP creation responses

### 4. Utility Systems

#### Report Generator (`src/utils/report-generator.js`)
**Purpose**: Generate comprehensive performance reports

**Features**:
- HTML dashboard generation
- JSON summary export
- Performance threshold analysis
- Benchmark comparisons
- Error rate calculations

#### Verbose Logger (`src/utils/k6-verbose-logger.js`)
**Purpose**: Enhanced logging with smart content detection

**Capabilities**:
- Test type detection (case-only vs JP vs documents)
- Dynamic content generation based on test flow
- Activity timeline tracking
- Error highlighting and categorization

#### Document Attachment (`src/utils/document-attachment.js`)
**Purpose**: Handle file upload operations

**Features**:
- Multi-file upload support
- File type validation
- Size limit checking
- Upload progress tracking

## Test Execution Flow

### 1. Initialization Phase
```javascript
// 1. Load configuration
const config = loadConfig(CONFIG_ENVIRONMENT);

// 2. Setup test data
const testUsers = JSON.parse(open('../data/users-config.json'));

// 3. Initialize modules
const authModule = createAuthModule(config);
const caseModule = createCaseModule(config);
```

### 2. Setup Phase
```javascript
export function setup() {
    // 1. Authenticate test users
    const authData = authModule.authenticate(testUsers[0]);
    
    // 2. Prepare test context
    return {
        authHeaders: authData.headers,
        config: config,
        startTime: new Date()
    };
}
```

### 3. Execution Phase
```javascript
export default function(data) {
    // 1. Case creation flow
    const caseResponse = caseModule.createCase(data.authHeaders);
    
    // 2. JP creation flow (if enabled)
    if (TEST_TYPE.includes('jp')) {
        const jpResponse = jpModule.createJP(data.authHeaders, caseResponse.caseId);
    }
    
    // 3. Document upload flow (if enabled)
    if (TEST_TYPE.includes('documents')) {
        const uploadResponse = documentModule.uploadFiles(data.authHeaders, jpId);
    }
}
```

### 4. Teardown Phase
```javascript
export function teardown(data) {
    // 1. Generate verbose report
    if (__ENV.ENABLE_VERBOSE_REPORT === 'true') {
        verboseLogger.generateReport(data);
    }
    
    // 2. Calculate performance metrics
    reportGenerator.generateSummary(data.startTime);
    
    // 3. Export results
    exportReports();
}
```

## Configuration Architecture

### Environment Management
**File**: `src/config/environments.json`

```json
{
  "autotest": {
    "baseUrl": "https://autotest01.acoscloud.no",
    "description": "Auto-test environment",
    "thresholds": {
      "http_req_duration": "p(95)<2000",
      "http_req_failed": "rate<0.05"
    }
  }
}
```

### Scenario Configuration
**File**: `src/config/autotest.json`

```json
{
  "scenarios": {
    "smoke_test": {
      "executor": "constant-vus",
      "vus": 1,
      "duration": "30s"
    },
    "load_test": {
      "executor": "ramping-vus",
      "startVUs": 1,
      "stages": [
        { "duration": "1m", "target": 5 },
        { "duration": "2m", "target": 5 },
        { "duration": "1m", "target": 0 }
      ]
    }
  }
}
```

### Test Data Management
**Files**:
- `src/data/users-config.json` - Test user accounts
- `src/data/websak-api-config.json` - API endpoint configurations
- `src/data/testDocuments/` - Sample files for upload testing

## Reporting Architecture

### 1. Verbose Reporting System
**Smart Content Detection**:
- Analyzes test execution flow
- Detects case-only vs JP vs document workflows
- Generates appropriate activity descriptions
- Provides detailed error analysis

### 2. Performance Metrics
**Collected Metrics**:
- Response times (p50, p95, p99)
- Success/failure rates
- Request throughput
- Error categorization
- Resource utilization

### 3. Report Formats
**HTML Dashboard**:
- Visual performance charts
- Threshold compliance indicators
- Error highlighting
- Benchmark comparisons

**JSON Summary**:
- Raw performance data
- Test configuration metadata
- Error details
- Timeline information

## Scalability Considerations

### 1. Horizontal Scaling
- Tests can run on multiple K6 instances
- Configuration supports distributed execution
- Reports can be aggregated across instances

### 2. Performance Optimization
- Lazy loading of test data
- Efficient memory management
- Optimized API call patterns
- Connection pooling

### 3. Extensibility
- Plugin architecture for new test types
- Configurable thresholds and scenarios
- Modular utility system
- Environment-specific customizations

## Security Architecture

### 1. Credential Management
- Separate user configuration files
- Environment-specific credential isolation
- No hardcoded credentials in test files
- Secure token handling

### 2. Environment Isolation
- Separate configurations per environment
- Production environment safeguards
- Access control through configuration
- Audit trail for test executions

## Maintenance & Operations

### 1. Configuration Updates
**Adding New Environment**:
1. Add entry to `environments.json`
2. Create environment-specific config file
3. Update npm scripts if needed
4. Test configuration validation

**Adding New Test Type**:
1. Create test file in appropriate directory
2. Add business logic module if needed
3. Update verbose logger for new test type
4. Add npm scripts for new test scenarios

### 2. Monitoring & Alerting
- Performance threshold violations
- Test failure notifications
- Environment availability checks
- Configuration validation alerts

### 3. Version Management
- Semantic versioning for releases
- Configuration schema versioning
- Backward compatibility maintenance
- Migration guides for updates

## Best Practices

### 1. Test Design
- Single responsibility per test file
- Modular business logic
- Comprehensive error handling
- Performance-focused implementation

### 2. Configuration Management
- Environment-specific settings
- Centralized configuration
- Validation at startup
- Documentation of all parameters

### 3. Reporting
- Meaningful metric collection
- Clear threshold definitions
- Actionable error messages
- Comprehensive test coverage reporting

This architecture ensures maintainability, scalability, and reliability while providing comprehensive performance testing capabilities for WebSak Plus applications.