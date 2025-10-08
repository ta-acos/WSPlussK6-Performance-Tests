# Acos GRAF Load Test - Architecture Guide

**Version:** 3.0.0  
**Last Updated:** October 8, 2025

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Evolution](#architecture-evolution)
3. [Core Architecture Layers](#core-architecture-layers)
4. [Centralized Configuration System](#centralized-configuration-system)
5. [Test Suite Components](#test-suite-components)
6. [Path Management Architecture](#path-management-architecture)
7. [Environment Metadata System](#environment-metadata-system)
8. [Module Dependencies](#module-dependencies)
9. [Best Practices](#best-practices)

---

## System Overview

### Purpose

**Acos GRAF (Generic Reusable Automation Framework) - Load Test** is a comprehensive K6-based performance testing framework designed for WebSak Plus, focusing on Case (Sak) and Journal Post (JP) creation workflows with advanced document attachment capabilities and centralized configuration management.

### Key Architectural Features

#### ✅ Centralized Path Management

- Single point of control for all framework paths
- Environment-specific path configurations
- Dynamic path resolution with fallback defaults
- No hardcoded paths in test or framework code

#### ✅ Enhanced Environment Awareness

- Automatic environment detection and metadata collection
- Environment-specific configuration overrides
- Dynamic configuration loading based on environment

#### ✅ Modular Architecture

- Separation of concerns with clear layer boundaries
- Reusable components across test scenarios
- Pluggable configuration system

#### ✅ Advanced Configuration System

- Multi-layered configuration management
- Flag-based configuration control
- JSON-based configuration files with validation

### Technology Stack

- **K6 v0.x** - Load testing framework
- **JavaScript (ES6+)** - Test scripting with modern features
- **OAuth2/OIDC** - Authentication protocol
- **JSON** - Configuration format with schema validation
- **PowerShell** - NPM scripts (Windows environment)
- **Node.js** - Development tooling and package management

---

## Architecture Evolution

### Version 3.0.0 Major Enhancements

#### 🆕 Centralized Path Management

- Introduced `src/config/paths-config.json` for all path configurations
- Enhanced `config-manager.js` with path resolution functions
- Eliminated hardcoded paths from all framework files

#### 🆕 Enhanced Environment Metadata

- Added automatic environment detection
- Enhanced report generation with environment details
- Improved debugging and tracking capabilities

#### 🆕 Configuration System Improvements

- Multi-layered configuration loading
- Environment-specific overrides
- Fallback mechanisms for missing configurations

### Migration Impact

```javascript
// Before v3.0.0 (hardcoded paths)
const reportPath = 'src/reports/test-report.html';

// After v3.0.0 (configurable paths)
import { getReportPaths } from '../lib/config-manager.js';
const reportPath = getReportPaths().getHtmlPath('test');
```

---

## Core Architecture Layers

```text
┌─────────────────────────────────────────────────────────────┐
│                    Test Scenarios Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  create-sak  │  │  create-jp   │  │ create-jp-with-  │  │
│  │     .js      │  │     .js      │  │ multiple-doc.js  │  │
│  │              │  │              │  │                  │  │
│  │ • Smoke      │  │ • JP Flows   │  │ • Doc Attachments│  │
│  │ • Load       │  │ • Performance│  │ • Batch Process  │  │
│  │ • Stress     │  │ • Validation │  │ • File Upload    │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │      create-multiplejp-with-multiple-document.js       │  │
│  │  • Bulk JP Creation    • High-Volume Processing        │  │
│  │  • Multiple Documents  • Production Workload Sim       │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                Configuration Management Layer                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              🆕 Enhanced Config Manager                  │  │
│  │                  config-manager.js                      │  │
│  │                                                         │  │
│  │  • getPathsConfig()      • getEnvironmentMetadata()    │  │
│  │  • getReportPaths()      • getApiEndpoints()           │  │
│  │  • getTestDataPaths()    • Configuration Loading       │  │
│  │  • Dynamic Path Resolution • Environment Detection     │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   Core Business Logic Layer                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ auth-module  │  │ case-module  │  │    jp-module     │  │
│  │              │  │              │  │                  │  │
│  │ • OAuth2     │  │ • Case Create│  │ • JP Workflows   │  │
│  │ • Token Mgmt │  │ • Templates  │  │ • Doc Attachments│  │
│  │ • Multi-user │  │ • Validation │  │ • Payload Build  │  │
│  │ • Credentials│  │ • Errors     │  │ • 🆕 Config APIs │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  Configuration Data Layer                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │🆕paths-config│  │autotest.json │  │users-config.json │  │
│  │    .json     │  │              │  │                  │  │
│  │              │  │ • Scenarios  │  │ • Credentials    │  │
│  │ • Report Path│  │ • Load Profile│ • Multi-user      │  │
│  │ • Data Paths │  │ • Thresholds │  │ • OAuth2 Config  │  │
│  │ • API Endpts │  │ • Performance│  │                  │  │
│  │ • External   │  │   Criteria   │  │                  │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│  ┌──────────────┐  ┌─────────────────────────────────────┐  │
│  │  dev.json    │  │      websak-api-config.json        │  │
│  │              │  │                                     │  │
│  │ • Dev Config │  │ • API Endpoints • OAuth2 Config    │  │
│  │ • Debug Flag │  │ • Service URLs  • Auth Settings    │  │
│  │ • Local Set  │  │ • Request Temps • API Versions     │  │
│  └──────────────┘  └─────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              testDocuments/ (Binary Files)             │  │
│  │ • 1MB-10MB Test Files  • Multiple Format Support       │  │
│  │ • Performance Benchmarks • Real-world File Testing     │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    External Services Layer                   │
│  ┌──────────────────┐    ┌─────────────────────────────────┐│
│  │ Identity Server  │    │       WebSak Plus API           ││
│  │  (OAuth2/OIDC)   │    │                                 ││
│  │                  │    │ • Case Management  • JP Mgmt    ││
│  │ • Token Endpoint │◄──►│ • Template Service • Doc Upload ││
│  │ • Client Creds   │    │ • Validation APIs  • File Proc  ││
│  │ • Token Validate │    │ • Error Responses  • Status     ││
│  └──────────────────┘    └─────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## Centralized Configuration System

### 🆕 Configuration Architecture

The framework implements a **3-layer configuration system**:

1. **Base Configuration**: Default settings and fallbacks
2. **Environment Configuration**: Environment-specific overrides
3. **Runtime Configuration**: Dynamic settings and user preferences

### Configuration Manager Enhanced Functions

```javascript
// Path Management Functions
getPathsConfig()          // Load centralized path configuration
getReportPaths()          // Get dynamic report path generators
getTestDataPaths()        // Get test data file locations
getApiEndpoints()         // Get configurable API endpoint patterns
getExternalUrls()         // Get external resource URLs

// Environment Functions
getEnvironmentMetadata()  // Get environment details and metadata
detectEnvironment()       // Automatic environment detection
loadEnvironmentConfig()   // Load environment-specific settings

// Utility Functions
validateConfiguration()   // Validate configuration completeness
getConfigurationSummary() // Get configuration loading summary
```

### 🆕 Centralized Path Configuration

**File**: `src/config/paths-config.json`

```json
{
  "description": "Centralized path configuration for Acos GRAF Load Test framework",
  "version": "1.0.0",
  "lastUpdated": "2025-10-08",
  
  "paths": {
    "reports": {
      "baseDir": "src/reports",
      "htmlSuffix": "-report.html",
      "jsonSuffix": "-summary.json"
    },
    "testData": {
      "baseDir": "src/data",
      "testDocuments": "src/data/testDocuments",
      "usersConfig": "src/data/users-config.json",
      "apiConfig": "src/data/websak-api-config.json"
    },
    "apiEndpoints": {
      "websak": {
        "base": "/api/websak/api",
        "endpoints": {
          "jpAttach": "/jp/uploadfiletodokument/",
          "caseCreate": "/case/create",
          "templateGet": "/templates"
        }
      }
    },
    "external": {
      "papaparseUrl": "https://jslib.k6.io/papaparse/5.1.1/index.js"
    }
  }
}
```

### Configuration Loading Process

```javascript
// 1. Initialize Configuration Manager (K6 Init Phase)
import { 
  getPathsConfig, 
  getReportPaths, 
  getEnvironmentMetadata 
} from '../lib/config-manager.js';

// 2. Load Path Configuration
const pathsConfig = getPathsConfig();
const reportPaths = getReportPaths();

// 3. Generate Dynamic Paths
export function handleSummary(data) {
  const testName = 'create-sak';
  return {
    [reportPaths.getHtmlPath(testName)]: htmlReport(data),
    [reportPaths.getJsonPath(testName)]: JSON.stringify(data)
  };
}

// 4. Environment Metadata Collection
const envMetadata = getEnvironmentMetadata();
console.log(`Environment: ${envMetadata.environment}`);
console.log(`Use Data File Config: ${envMetadata.useDataFileConfig}`);
```

---

## Test Suite Components

### 1. Case (Sak) Creation Test

**File**: `tests/api/cases/create-sak.js`

**Architecture Flow**:

- **Configuration Loading**: Load paths, environment metadata, credentials, API config
- **Authentication Phase**: OAuth2 client credentials flow, token management
- **Template Retrieval**: Get available case templates, validation
- **Case Creation**: Payload construction, HTTP POST to configurable endpoint
- **Performance Measurement**: Response time tracking, success rate monitoring
- **Report Generation**: HTML report with configurable path, environment metadata

### 2. Journal Post (JP) Creation Tests

**Files**:

- `tests/api/journalposts/create-jp.js`
- `tests/api/journalposts/create-jp-with-multiple-document.js`
- `tests/api/journalposts/create-multiplejp-with-multiple-document.js`

**Enhanced Architecture**:

- **Configuration & Environment Setup**: Centralized path loading, environment-aware configuration
- **Authentication & Session Management**: OAuth2 token management, multi-user handling
- **Prerequisite Case Creation**: Dynamic case creation for JP attachment
- **JP Template & Creation Pipeline**: JP template retrieval, bulk JP creation
- **Document Attachment Architecture**: Configurable test document paths, multiple formats
- **Performance Monitoring & Analytics**: Real-time performance metrics, error analysis
- **Enhanced Reporting System**: Configurable report paths, environment metadata inclusion

---

## Path Management Architecture

### 🆕 Dynamic Path Resolution System

The framework eliminates hardcoded paths and provides deployment flexibility.

#### Core Path Management Components

```javascript
{
  "paths": {
    "reports": {
      "baseDir": "src/reports",           // Base directory for reports
      "htmlSuffix": "-report.html",       // HTML report suffix
      "jsonSuffix": "-summary.json"       // JSON summary suffix
    },
    "testData": {
      "baseDir": "src/data",              // Base data directory
      "testDocuments": "src/data/testDocuments", // Test files location
      "usersConfig": "src/data/users-config.json", // User credentials
      "apiConfig": "src/data/websak-api-config.json" // API configuration
    },
    "apiEndpoints": {
      "websak": {
        "base": "/api/websak/api",        // API base path
        "endpoints": {
          "jpAttach": "/jp/uploadfiletodokument/", // JP attachment endpoint
          "caseCreate": "/case/create",              // Case creation endpoint
          "templateGet": "/templates"                // Template retrieval endpoint
        }
      }
    }
  }
}
```

#### Benefits of Centralized Path Management

🎯 **Single Point of Control**

- Change report output directory for all tests from one location
- Modify API endpoints without touching test code
- Update test document locations globally

🔄 **Environment Flexibility**

- Different path configurations for dev/staging/prod
- Easy migration between different server structures
- Support for different deployment scenarios

🛡️ **Reliability & Fallbacks**

- Automatic fallbacks to default paths if configuration missing
- Validation of path existence and accessibility
- Clear error messages for configuration issues

---

## Environment Metadata System

### 🆕 Automatic Environment Detection

The framework automatically detects and collects environment metadata for enhanced reporting and debugging.

#### Environment Metadata Collection

```javascript
// Enhanced environment metadata collection
export function getEnvironmentMetadata() {
  return {
    environment: detectEnvironment(),           // Auto-detected environment
    useDataFileConfig: 'Yes',                  // Configuration mode
    apiHost: getApiHost(),                     // API host information
    testExecutionTime: new Date().toISOString(), // Execution timestamp
    k6Version: getK6Version(),                 // K6 version info
    configurationSource: 'paths-config.json',  // Configuration source
    pathConfigurationLoaded: true,              // Path config status
    testDataPath: getTestDataPaths().getDataDir(), // Test data location
    reportOutputPath: getReportPaths().getBaseDir() // Report output location
  };
}
```

#### Enhanced Report Integration

Environment metadata is automatically included in all test reports:

```html
<!-- Environment Information Section in HTML Reports -->
<div class="environment-info">
  <h3>🌍 Environment Information</h3>
  <div class="metadata-grid">
    <div class="metadata-item">
      <strong>Environment:</strong> <span class="env-badge">Auto Test</span>
    </div>
    <div class="metadata-item">
      <strong>Use Data File Config:</strong> <span class="config-badge">Yes</span>
    </div>
    <div class="metadata-item">
      <strong>API Host:</strong> <span class="host-info">api.websak.local</span>
    </div>
    <div class="metadata-item">
      <strong>Configuration Source:</strong> <span class="source-info">paths-config.json</span>
    </div>
  </div>
</div>
```

---

## Module Dependencies

### 🆕 Enhanced Dependency Graph

```text
config-manager.js (CORE)
├── paths-config.json (NEW)
├── autotest.json
├── dev.json
├── users-config.json
└── websak-api-config.json

auth-module.js
├── config-manager.js
├── users-config.json
└── websak-api-config.json

case-module.js
├── config-manager.js (for API endpoints)
├── auth-module.js
└── websak-api-config.json

jp-module.js (ENHANCED)
├── config-manager.js (for paths & endpoints)
├── auth-module.js
├── case-module.js
└── testDocuments/ (configurable path)

Test Files (ALL ENHANCED)
├── config-manager.js (centralized configuration)
├── auth-module.js
├── case-module.js
├── jp-module.js
└── Dynamic path resolution for reports
```

### Configuration Loading Dependencies

```javascript
// Dependency loading order in K6 init phase
1. paths-config.json → Base path configuration
2. Environment detection → Environment-specific settings
3. autotest.json → Test scenarios and thresholds
4. users-config.json → Authentication credentials
5. websak-api-config.json → API endpoint configuration
6. dev.json → Development overrides (optional)
```

---

## Best Practices

### Configuration Management

✅ **Do:**

- Use centralized path configuration for all file paths
- Implement fallback defaults for missing configuration
- Validate configuration completeness at startup
- Use environment-specific overrides when needed

❌ **Don't:**

- Hardcode paths in test files or modules
- Mix configuration loading with business logic
- Ignore configuration validation errors
- Use different configuration patterns across modules

### Performance Testing

✅ **Do:**

- Use configurable thresholds based on environment
- Implement proper pacing and think time
- Monitor both functional and performance metrics
- Use SharedArray for test data to reduce memory usage

❌ **Don't:**

- Run performance tests without baseline metrics
- Ignore error rates in favor of response times only
- Use unrealistic load patterns
- Mix functional and performance testing in same scenarios

### Error Handling & Debugging

✅ **Do:**

- Include environment metadata in all reports
- Log configuration loading status and paths
- Provide clear error messages for configuration issues
- Track and categorize different types of failures

❌ **Don't:**

- Suppress configuration loading errors
- Use generic error messages without context
- Ignore failed configuration validations
- Mix error handling with business logic

### Framework Maintenance

✅ **Do:**

- Keep framework code (`src/`) separate from test scenarios (`tests/`)
- Use consistent naming conventions across all modules
- Document configuration changes and new features
- Maintain backward compatibility when possible

❌ **Don't:**

- Mix framework utilities with test-specific code
- Change configuration structure without migration plan
- Add new features without updating documentation
- Break existing test scenarios with framework changes

---

## Conclusion

The **Acos GRAF - Load Test Framework v3.0.0** represents a significant evolution in performance testing architecture, introducing:

🎯 **Centralized Configuration Management** - Single point of control for all framework paths and settings

🌍 **Enhanced Environment Awareness** - Automatic environment detection and metadata collection

⚙️ **Flexible Architecture** - Modular design with clear separation of concerns

📊 **Advanced Reporting** - Comprehensive reports with environment context and performance analytics

🚀 **Production Ready** - Designed for enterprise deployment with configuration flexibility

The framework provides a solid foundation for scalable performance testing while maintaining simplicity and ease of use for test developers and performance engineers.

---

**Framework Architecture maintained by the Acos Performance Testing Team**  
**Version 3.0.0 - October 8, 2025**
