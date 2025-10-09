# Acos GRAF - Load Test v3.0

Enhanced K6 performance testing framework for WebSak Plus with centralized path management, environment metadata, and advanced configuration system.

## 🚀 Quick Start

### Prerequisites

1. **Install K6**: Download and install [K6](https://k6.io/docs/getting-started/installation/)
2. **Install Node.js**: Version 14.0.0 or higher
3. **Install Dependencies**: Run `npm install`

### Run Your First Test

```bash
# Simple case creation test (recommended for first-time users)
npm run simple

# Journal post creation test
npm run jp-docs

# View the generated report
npm run report:open
```

## 📊 Test Types Available

### 🟢 Basic Tests (Start Here!)

| Command | Description | What It Tests |
|---------|-------------|---------------|
| `npm run simple` | Case creation only | Authentication → Case Templates → Create Case |
| `npm run jp-docs` | Journal posts with documents | Above + JP Creation + Document Upload |
| `npm run complex` | Multiple JPs with documents | Above + Multiple JP Creation + Batch Upload |

### 🔵 Performance Test Scenarios

| Scenario | Users | Duration | Purpose |
|----------|-------|----------|---------|
| **Smoke** | 1 user | 30s | Verify functionality works |
| **Load** | 5-10 users | 2-5 min | Normal usage simulation |
| **Stress** | 15-25 users | 5-10 min | High load testing |
| **Spike** | 1→50→1 users | Bursts | Traffic spike testing |
| **Endurance** | 10 users | 30+ min | Long-term stability |

### 🔴 Advanced Commands

```bash
# Different test types with different scenarios
npm run test:load        # Load test - case creation
npm run test:stress:jp   # Stress test - journal posts
npm run test:spike:documents  # Spike test - with documents

# Environment-specific tests
npm run test:dev         # Development environment
npm run test:autotest    # Auto-test environment

# Comprehensive testing
npm run run-all-tests    # Run all test types sequentially
```

## 📈 Understanding Reports

After running tests, reports are generated in `src/reports/`:

- **HTML Report**: `create-sak-report.html` - Visual performance dashboard
- **JSON Summary**: `create-sak-summary.json` - Raw metrics data

### Key Metrics to Monitor

| Metric | Good | Warning | Critical |
|--------|------|---------|----------|
| **Response Time (p95)** | <800ms | 800-2000ms | >2000ms |
| **Success Rate** | >99% | 95-99% | <95% |
| **Error Rate** | <1% | 1-5% | >5% |

### Report Features

✅ **Performance Benchmarks** - Compare against industry standards  
✅ **Verbose Activity Logs** - See exactly what each test did  
✅ **Error Detection** - Automatic highlighting of issues  
✅ **Threshold Analysis** - Pass/fail status for all metrics  
✅ **Export Options** - JSON, CSV, and PDF export  

## 🛠 Configuration

### Environment Setup

Tests can run against different environments:

- **autotest** (default) - `autotest01.acoscloud.no`
- **dev** - Development environment
- **prod** - Production environment (use with caution)

Configuration files:
- `src/config/environments.json` - Environment settings
- `src/config/autotest.json` - Test scenarios and thresholds
- `src/data/users-config.json` - Test user credentials

### Test Configuration

Each test uses a centralized configuration system:

```javascript
// Enable/disable data file configuration
const USE_DATA_FILE_CONFIG = true;

// Choose environment
const CONFIG_ENVIRONMENT = 'autotest';

// Override scenario via command line
// Example: k6 run -e SCENARIO=stress_test tests/api/cases/create-sak.js
```

## 📋 Available NPM Commands

### Quick Start Commands
- `npm run simple` - Simple case creation test
- `npm run load` - Load testing
- `npm run stress` - Stress testing
- `npm run jp-docs` - Journal post with documents
- `npm run complex` - Complex multi-JP test

### Test Categories

#### Simple Tests (Smoke Testing)
- `npm run test:simple` - Basic case creation
- `npm run test:simple:verbose` - With detailed logging
- `npm run test:simple:jp` - Journal post creation
- `npm run test:simple:documents` - JP with document upload
- `npm run test:simple:complex` - Multiple JPs with documents

#### Load Tests (Normal Traffic)
- `npm run test:load` - Load test cases
- `npm run test:load:jp` - Load test journal posts
- `npm run test:load:documents` - Load test with documents
- `npm run test:load:complex` - Load test complex scenarios

#### Stress Tests (High Traffic)
- `npm run test:stress` - Stress test cases
- `npm run test:stress:jp` - Stress test journal posts
- `npm run test:stress:documents` - Stress test with documents
- `npm run test:stress:complex` - Stress test complex scenarios

#### Environment-Specific Tests
- `npm run test:dev` - Development environment
- `npm run test:autotest` - Auto-test environment
- `npm run test:dev:jp:smoke` - Dev environment JP smoke test
- `npm run test:autotest:load` - Auto-test environment load test

### Report Management
- `npm run report:open` - Open latest case creation report
- `npm run report:open:jp` - Open latest JP report
- `npm run report:list` - List all available reports

### Development Tools
- `npm run lint` - Check code quality
- `npm run format` - Format code with Prettier

### Comprehensive Testing
- `npm run run-all-tests` - Run smoke, load, and stress tests
- `npm run run-comprehensive` - Complete test suite with reporting

## 📁 Project Structure

```
WSPlussK6-Performance-Tests/
├── 📁 src/
│   ├── 📁 config/           # Test configurations
│   │   ├── environments.json    # Environment settings
│   │   ├── autotest.json       # Test scenarios & thresholds
│   │   ├── dev.json            # Development config
│   │   └── paths-config.json   # Path configurations
│   ├── 📁 data/             # Test data
│   │   ├── users-config.json   # Test user accounts
│   │   ├── websak-api-config.json # API endpoints
│   │   └── 📁 testDocuments/   # Sample files for upload tests
│   ├── 📁 lib/              # Core libraries
│   │   ├── auth-module.js      # Authentication handling
│   │   ├── case-module.js      # Case creation logic
│   │   ├── jp-module.js        # Journal post handling
│   │   └── config-manager.js   # Configuration management
│   ├── 📁 utils/            # Utilities
│   │   ├── report-generator.js # HTML report generation
│   │   ├── k6-verbose-logger.js # Enhanced logging
│   │   ├── document-attachment.js # File upload handling
│   │   └── test-workflow.js    # Test execution flow
│   └── 📁 reports/          # Generated test reports
├── 📁 tests/
│   └── 📁 api/
│       ├── 📁 cases/        # Case creation tests
│       │   └── create-sak.js
│       └── 📁 journalposts/ # Journal post tests
│           ├── create-jp.js
│           ├── create-jp-with-multiple-document.js
│           └── create-multiple-jp-with-multiple-document.js
├── 📁 examples/             # Usage examples
├── 📁 documents/            # Documentation
└── package.json             # NPM configuration
```

## 🔍 Test Details

### Case Creation Test (`create-sak.js`)
**What it does:**
1. Authenticates test user
2. Retrieves case templates
3. Creates new case
4. Fetches reference data (case types, decision codes)

**Performance expectations:**
- Response time: <800ms (p95)
- Success rate: >99%
- Typical duration: 2-4 seconds per iteration

### Journal Post Tests (`create-jp*.js`)
**What they do:**
1. All case creation steps above
2. Retrieves JP templates
3. Creates journal posts (incoming/outgoing)
4. Optionally uploads documents

**Document upload variants:**
- `create-jp.js` - Simple JP creation (no documents)
- `create-jp-with-multiple-document.js` - Single JP + 3 documents
- `create-multiple-jp-with-multiple-document.js` - Multiple JPs + documents each

## 🐛 Troubleshooting

### Common Issues

**Test fails with authentication error:**
```bash
# Check if test users are configured correctly
ls src/data/users-config.json

# Verify environment configuration
ls src/config/environments.json
```

**No reports generated:**
```bash
# Ensure verbose reporting is enabled
npm run test:simple -- -e ENABLE_VERBOSE_REPORT=true

# Check reports directory
ls src/reports/
```

**K6 not found:**
```bash
# Install K6 first
# Windows: choco install k6
# macOS: brew install k6
# Linux: See https://k6.io/docs/getting-started/installation/
```

### Performance Issues

**High response times:**
1. Check network connectivity
2. Verify environment isn't under load
3. Review threshold settings in `autotest.json`

**Test failures:**
1. Check verbose logs in HTML reports
2. Look for specific error messages
3. Verify test user permissions

## 🔧 Advanced Usage

### Custom Test Scenarios

Create custom scenarios by modifying `src/config/autotest.json`:

```json
{
  "scenarios": {
    "custom_scenario": {
      "executor": "constant-vus",
      "vus": 10,
      "duration": "5m",
      "env": { "TEST_TYPE": "custom" }
    }
  }
}
```

### Environment Variables

Control test behavior via environment variables:

```bash
# Scenario selection
k6 run -e SCENARIO=load_test tests/api/cases/create-sak.js

# Scenario naming (for report identification)
k6 run -e SCENARIO_NAME=my_custom_test tests/api/cases/create-sak.js

# Enable verbose reporting
k6 run -e ENABLE_VERBOSE_REPORT=true tests/api/cases/create-sak.js

# Environment selection
k6 run -e CONFIG_ENV=dev tests/api/cases/create-sak.js
```

### Custom Thresholds

Modify performance thresholds in test files or config:

```javascript
thresholds: {
  'http_req_duration': ['p(95)<1000'],  // 95% under 1 second
  'http_req_failed': ['rate<0.01'],     // Less than 1% errors
  'http_reqs': ['rate>10']              // At least 10 req/sec
}
```

## 📞 Support

For issues or questions:
1. Check the [Troubleshooting](#-troubleshooting) section
2. Review test logs in `src/reports/`
3. Examine configuration files in `src/config/`
4. Check the [Project Structure](#-project-structure) for file locations

## 📄 License

ISC License - See package.json for details.