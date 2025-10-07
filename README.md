# Acos GRAF - Load Test

**Version:** 3.0.0  
**Last Updated:** October 7, 2025

Acos GRAF (Generic Reusable Automation Framework) - Load Test: A comprehensive, modular performance testing framework for WebSak Plus, featuring scenario-based load testing for Case (Sak) and Journal Post (JP) creation workflows with advanced document attachment capabilities, centralized configuration management, and enhanced reporting with environment metadata.

---

## 📋 Table of Contents

1. [Framework Overview](#-framework-overview)
2. [Quick Start](#-quick-start)
3. [Framework Structure](#-framework-structure)
4. [Test Scenarios](#-test-scenarios)
5. [Configuration System](#%EF%B8%8F-configuration-system)
6. [Running Tests](#-running-tests)
7. [NPM Scripts Reference](#-npm-scripts-reference)
8. [Environment Variables](#-environment-variables)
9. [Documentation](#-documentation)
10. [Troubleshooting](#-troubleshooting)

---

## 🎯 Framework Overview

Acos GRAF - Load Test is a generic, reusable automation framework built on K6 for comprehensive performance testing. The framework follows industry best practices for test automation architecture:

### Key Features

✅ **Modular Architecture**
- Separation of concerns with `src/` framework core and `tests/` scenarios
- Reusable libraries and utilities
- Centralized configuration management with path flexibility
- Enhanced environment metadata collection

✅ **Multiple Test Scenarios**
- Case (Sak) creation tests
- Journal Post (JP) creation workflows  
- Document attachment testing (single and batch)
- Incoming and outgoing JP workflows
- Bulk JP creation with multiple documents

✅ **Advanced Configuration System**
- Centralized path management (single point of control)
- Environment-specific configuration overrides
- Configurable API endpoints and external resources
- Dynamic report path generation
- Enhanced environment metadata detection

✅ **Advanced Capabilities**
- Scenario-based load testing (smoke → endurance)
- Document attachment with real files (1MB-10MB)
- Batch upload support for maximum performance
- Comprehensive HTML reporting with Apdex scoring
- Real-time error tracking and analytics

✅ **Production Ready**
- Environment-specific configuration
- Centralized path management for easy deployment
- Enhanced error analytics and tracking
- Configurable report generation
- Performance metrics collection
- CI/CD integration ready

---

## 🚀 Quick Start

### Prerequisites

1. **Install K6:** https://k6.io/docs/get-started/installation/

2. **Clone and Setup:**
   ```powershell
   cd "path/to/your/workspace"
   npm install
   ```

### Run Your First Test

```powershell
# Smoke test - quick validation
npm run test:create-sak:smoke

# Load test - sustained performance
npm run test:create-sak:load

# View generated reports
npm run report:open
```

---

## 📁 Framework Structure

```
├── src/                          # Framework Core
│   ├── config/                   # Configuration Management
│   │   ├── autotest.json        # Test scenarios & thresholds
│   │   ├── dev.json             # Development environment
│   │   └── paths-config.json    # 🆕 Centralized path configuration
│   ├── data/                    # Test data and fixtures
│   │   ├── users-config.json    # User credentials
│   │   ├── websak-api-config.json # API configuration
│   │   └── testDocuments/       # Test files (1MB-10MB)
│   ├── lib/                     # Core framework libraries
│   │   ├── auth-module.js       # Authentication handling
│   │   ├── case-module.js       # Case creation logic
│   │   ├── config-manager.js    # 🆕 Enhanced configuration management
│   │   └── jp-module.js         # Journal Post operations
│   ├── utils/                   # Framework utilities (DEPRECATED)
│   │   ├── api-client.js        # HTTP client wrapper
│   │   ├── error-tracker.js     # Error analytics
│   │   ├── pacing.js           # Think time management
│   │   ├── report-generator.js  # HTML report generation
│   │   └── validation.js       # Response validation
│   └── reports/                 # Generated test reports (configurable path)
├── tests/                       # Test Scenarios
│   ├── api/                     # API-specific test suites
│   │   ├── cases/              # Case creation tests
│   │   │   └── create-sak.js   # Sak (Case) creation scenarios
│   │   └── journalposts/       # Journal Post tests
│   │       ├── create-jp.js    # Basic JP creation
│   │       ├── create-jp-with-multiple-document.js
│   │       └── create-multiplejp-with-multiple-document.js
│   └── common/                  # Shared test utilities
├── docs/                        # Documentation
│   ├── ARCHITECTURE.md         # Framework architecture
│   └── METRICS-GUIDE.md        # Performance metrics guide
└── package.json                # NPM configuration
```

### Framework Design Principles

1. **Separation of Concerns**: Framework code (`src/`) is separate from test scenarios (`tests/`)
2. **Reusability**: Core libraries can be reused across different test scenarios
3. **Maintainability**: Clear module boundaries and consistent naming conventions
4. **Scalability**: Easy to add new test scenarios and extend functionality
5. **Configuration-Driven**: Environment-specific settings externalized to config files
6. **🆕 Centralized Path Management**: Single point of control for all framework paths
7. **🆕 Environment Awareness**: Automatic environment detection and metadata collection
8. **🆕 Flexible Deployment**: Configurable paths for different deployment scenarios

---

## 🧪 Test Scenarios

### 1. Create Sak (Case) Test
**Location:** `tests/api/cases/create-sak.js`

**Flow:**
```
Authenticate → Get Templates → Create Case → Validate Response
```

**Features:**
- Scenario-based load testing (smoke → endurance)
- OAuth2 client credentials authentication  
- Template retrieval and case creation
- Comprehensive error handling

**Use Cases:**
- Baseline performance testing
- Authentication workflow validation
- Case creation capacity planning

### 2. Create JP (Journal Post) Test  
**Location:** `tests/api/journalposts/create-jp.js`

**Flow:**
```
Authenticate → Create Case → Get JP Templates → Create JP → Validate
```

**Features:**
- Complete case → JP workflow
- Template-based JP creation
- Performance metrics collection

**Use Cases:**
- JP creation performance baseline
- End-to-end workflow testing
- Integration testing

### 3. Create JP With Multiple Documents Test
**Location:** `tests/api/journalposts/create-jp-with-multiple-document.js`

**Flow:**
```
Authenticate → Create Case → Create JP → Attach N Documents → Validate
```

**Features:**
- Document attachment workflows
- Configurable document count (DOC_COUNT)
- Real file attachment testing
- Batch upload capabilities

**Use Cases:**
- Document upload performance
- Storage system stress testing
- File processing workflows

### 4. Create Multiple JPs with Multiple Documents
**Location:** `tests/api/journalposts/create-multiplejp-with-multiple-document.js`

**Flow:**
```
Authenticate → Create Case → Create Multiple JPs (Incoming + Outgoing) → Attach Documents → Validate
```

**Features:**
- Bulk JP creation (incoming + outgoing)
- Large test documents (1MB-10MB)
- Batch document processing
- Comprehensive workflow testing

**Use Cases:**
- High-volume processing simulation
- System capacity planning
- Production workload simulation

---

## ⚙️ Configuration System

The framework now features a **centralized configuration system** with path management and environment-specific overrides.

### Core Configuration Files

- **`src/config/autotest.json`**: Test scenarios, thresholds, and performance criteria
- **`src/config/dev.json`**: Development environment settings
- **`src/config/paths-config.json`**: 🆕 **Centralized path configuration** - single point to change all framework paths
- **`src/data/users-config.json`**: User credentials for authentication
- **`src/data/websak-api-config.json`**: API endpoints and configuration

### 🆕 Centralized Path Management

All framework paths are now configurable through `src/config/paths-config.json`:

```json
{
  "paths": {
    "reports": {
      "baseDir": "src/reports",
      "htmlSuffix": "-report.html",
      "jsonSuffix": "-summary.json"
    },
    "testData": {
      "testDocuments": "src/data/testDocuments",
      "usersConfig": "src/data/users-config.json"
    },
    "apiEndpoints": {
      "websak": {
        "base": "/api/websak/api",
        "jpAttach": "/jp/uploadfiletodokument/"
      }
    }
  }
}
```

**Benefits:**
- 🎯 **Single Point of Control**: Change all paths from one location
- 🔄 **Environment Flexibility**: Different path configurations per environment
- 🚀 **Easy Deployment**: No code changes needed for different deployments
- 🛡️ **Fallback Defaults**: Automatic fallbacks if configuration is missing

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SCENARIO` | Load test scenario | `load_test` |
| `PACING_MODE` | Think time mode | `normal` |
| `DOC_COUNT` | Documents per JP | `3` |
| `USE_TEST_DOCS` | Use real test files | `false` |
| `INCOMING_COUNT` | Incoming JPs count | `2` |
| `OUTGOING_COUNT` | Outgoing JPs count | `2` |

---

## 🏃 Running Tests

### Basic Test Execution

```powershell
# Case creation tests
npm run test:create-sak:smoke      # Quick validation
npm run test:create-sak:load       # Sustained load
npm run test:create-sak:stress     # High load
npm run test:create-sak:spike      # Traffic spikes
npm run test:create-sak:endurance  # Extended duration

# Journal Post tests
npm run test:create-jp:smoke       # JP workflow validation
npm run test:create-jp:load        # JP load testing

# Document attachment tests
npm run test:create-jp-with-multiple-document:smoke
npm run test:create-multiplejp-with-multiple-document:smoke
```

### Advanced Test Options

```powershell
# No-pacing variants (maximum throughput)
npm run test:create-sak:load:nopace
npm run test:create-jp:stress:nopace

# Custom scenarios with environment variables
k6 run -e SCENARIO=smoke_test -e DOC_COUNT=5 tests/api/journalposts/create-jp-with-multiple-document.js

# Multiple JPs with large test documents
npm run test:create-multiplejp-with-multiple-document:smoke
```

---

## 📊 NPM Scripts Reference

### Test Execution Scripts
- `test:create-sak*`: Case creation test variants
- `test:create-jp*`: Journal Post test variants  
- `test:create-jp-with-multiple-document*`: JP + document tests
- `test:create-multiplejp-with-multiple-document*`: Bulk JP tests

### Report Management
- `report:open`: Open latest case report
- `report:open:jp`: Open latest JP report
- `report:list`: List all generated reports

### Development Tools
- `lint`: ESLint code quality checks
- `format`: Prettier code formatting
- `prepare`: Husky git hooks setup

---

## 🔧 Environment Variables

### Load Test Configuration
- `SCENARIO`: `smoke_test`, `load_test`, `stress_test`, `spike_test`, `endurance_test`
- `PACING_MODE`: `normal`, `none` (for maximum throughput testing)

### Document Testing
- `DOC_COUNT`: Number of documents to attach per JP
- `USE_TEST_DOCS`: Use real test files from `src/data/testDocuments/`
- `ENABLE_JP_ATTACH`: Enable/disable document attachment phase

### Bulk Processing
- `INCOMING_COUNT`: Number of incoming JPs to create
- `OUTGOING_COUNT`: Number of outgoing JPs to create
- `USE_BATCH_UPLOAD`: Enable batch document upload

### Reporting
- `APDEX_T`: Custom Apdex threshold for HTML reports

---

## 📚 Documentation

- **[Framework Architecture](docs/ARCHITECTURE.md)**: Detailed technical architecture
- **[Metrics Guide](docs/METRICS-GUIDE.md)**: Performance metrics and analysis

---

## 🔍 Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Verify credentials in `src/data/users-config.json`
   - Check API configuration in `src/data/websak-api-config.json`

2. **File Not Found Errors**
   - Ensure test documents exist in `src/data/testDocuments/`
   - Check file paths in configuration files

3. **Import/Module Errors**
   - Verify all imports use correct paths relative to new structure
   - Check that all files were moved to correct locations

4. **Performance Issues**
   - Use `PACING_MODE=none` for maximum throughput testing
   - Adjust `DOC_COUNT` and document sizes for capacity testing

### Getting Help

1. Check the generated HTML reports for detailed error analysis
2. Review console output for specific error messages
3. Validate configuration files are properly formatted
4. Ensure K6 version compatibility

---

**Framework maintained by the Acos Performance Testing Team**