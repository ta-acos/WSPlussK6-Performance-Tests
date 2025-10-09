# NPM Commands Guide

Complete reference for all available test commands and their usage patterns.

## Command Categories Overview

The framework provides 50+ organized NPM commands across different categories:

| Category | Purpose | Command Count | Examples |
|----------|---------|---------------|----------|
| **Quick Start** | Simple one-command testing | 5 | `npm run simple`, `npm run load` |
| **Basic Tests** | Smoke testing scenarios | 5 | `npm run test:simple`, `npm run test:simple:verbose` |
| **Performance Tests** | Load, stress, spike testing | 15 | `npm run test:load`, `npm run test:stress` |
| **Environment Tests** | Environment-specific execution | 8 | `npm run test:dev`, `npm run test:autotest` |
| **Comprehensive** | Full test suites | 3 | `npm run run-all-tests` |
| **Reports** | Report management | 4 | `npm run report:open`, `npm run report:list` |
| **Development** | Code quality tools | 3 | `npm run lint`, `npm run format` |

## Quick Start Commands

Perfect for first-time users and daily testing:

### `npm run simple`
**Purpose**: Basic case creation smoke test
**What it does**: 1 user for 30 seconds creating cases
**When to use**: First test, daily smoke checks, functionality verification
**Output**: Case creation report in `src/reports/`

```bash
# Basic usage
npm run simple

# What happens:
# ✅ Authenticates test user
# ✅ Retrieves case templates  
# ✅ Creates new case
# ✅ Generates performance report
```

### `npm run jp-docs`
**Purpose**: Journal post creation with document upload
**What it does**: 1 user creating JPs and uploading 3 documents
**When to use**: Testing document upload functionality, end-to-end workflow validation
**Output**: JP with documents report

### `npm run load`
**Purpose**: Load testing with realistic user simulation
**What it does**: Ramps from 1→5→1 users over 4 minutes
**When to use**: Performance validation, capacity planning
**Output**: Load test performance report

### `npm run stress`
**Purpose**: High-load stress testing
**What it does**: Ramps to 15 users for extended duration
**When to use**: Breaking point analysis, system limits testing
**Output**: Stress test report with failure analysis

### `npm run complex`
**Purpose**: Complex scenario with multiple JPs and documents
**What it does**: Multiple journal posts each with document attachments
**When to use**: Full system integration testing, complex workflow validation
**Output**: Complex scenario report

## Test Type Matrix

### Case Creation Tests

| Command | Users | Duration | Scenario | Purpose |
|---------|--------|----------|----------|---------|
| `npm run test:simple` | 1 | 30s | Smoke | Basic functionality |
| `npm run test:simple:verbose` | 1 | 30s | Smoke + Verbose | Detailed debugging |
| `npm run test:load` | 1→5→1 | 4m | Load | Normal capacity |
| `npm run test:stress` | 1→15→1 | 8m | Stress | High load limits |
| `npm run test:spike` | 1→50→1 | 6m | Spike | Traffic bursts |

### Journal Post Tests

| Command | Users | Duration | Documents | Purpose |
|---------|--------|----------|-----------|---------|
| `npm run test:simple:jp` | 1 | 30s | No | JP basic functionality |
| `npm run test:load:jp` | 1→5→1 | 4m | No | JP load testing |
| `npm run test:stress:jp` | 1→15→1 | 8m | No | JP stress testing |
| `npm run test:simple:documents` | 1 | 30s | Yes (3 files) | Document upload basic |
| `npm run test:load:documents` | 1→5→1 | 4m | Yes (3 files) | Document upload load |
| `npm run test:stress:documents` | 1→15→1 | 8m | Yes (3 files) | Document upload stress |

### Complex Workflow Tests

| Command | Users | Duration | JPs per Case | Docs per JP | Purpose |
|---------|--------|----------|--------------|-------------|---------|
| `npm run test:simple:complex` | 1 | 30s | Multiple | 3 each | Complex workflow basic |
| `npm run test:load:complex` | 1→5→1 | 4m | Multiple | 3 each | Complex workflow load |
| `npm run test:stress:complex` | 1→15→1 | 8m | Multiple | 3 each | Complex workflow stress |

## Environment-Specific Commands

### Auto-test Environment (Default)
```bash
npm run test:autotest           # Auto-test load test  
npm run test:autotest:load      # Auto-test specific load
npm run test:autotest:jp:smoke  # Auto-test JP smoke test
```

### Development Environment
```bash
npm run test:dev                # Dev environment load test
npm run test:dev:jp:smoke       # Dev environment JP smoke
npm run test:dev:stress         # Dev environment stress test
```

### Environment Selection Pattern
All environment commands follow this pattern:
- `test:[environment]` - Load test for specific environment
- `test:[environment]:[testtype]:[scenario]` - Specific test combination

## Report Management Commands

### Opening Reports
```bash
npm run report:open             # Open latest case creation report
npm run report:open:jp          # Open latest journal post report
```

### Report Listing
```bash
npm run report:list             # List all available reports
```

**Report file naming convention:**
- Case reports: `create-sak-report-[timestamp].html`
- JP reports: `create-jp-report-[timestamp].html`
- Summary data: `create-sak-summary.json`

## Development & Quality Commands

### Code Quality
```bash
npm run lint                    # Run ESLint on all JavaScript files
npm run format                  # Format code with Prettier
```

**What gets checked/formatted:**
- All files in `tests/**/*.js`
- All files in `src/**/*.js`
- Consistent code style enforcement
- Error and warning reporting

## Comprehensive Test Suites

### `npm run run-all-tests`
**Purpose**: Sequential execution of smoke, load, and stress tests
**Duration**: ~15-20 minutes
**What it runs**:
1. Smoke test (1 user, 30s)
2. Load test (1→5→1 users, 4m)
3. Stress test (1→15→1 users, 8m)

**Output**: Separate report for each test phase
**When to use**: 
- Pre-deployment validation
- Comprehensive performance assessment
- Regression testing

### `npm run run-comprehensive`
**Purpose**: Complete test suite with detailed reporting
**Duration**: ~25-30 minutes
**What it runs**:
1. All smoke tests (case, JP, documents, complex)
2. All load tests 
3. All stress tests
4. Report generation and analysis

## Advanced Usage Patterns

### Custom Scenario Execution
You can override scenarios using environment variables:

```bash
# Override scenario in any test
k6 run -e SCENARIO=custom_scenario tests/api/cases/create-sak.js

# Custom scenario name for reports
k6 run -e SCENARIO_NAME="Custom Load Test" tests/api/cases/create-sak.js

# Enable verbose reporting for any test
k6 run -e ENABLE_VERBOSE_REPORT=true tests/api/cases/create-sak.js

# Environment override
k6 run -e CONFIG_ENV=dev tests/api/cases/create-sak.js
```

### Chaining Commands
```bash
# Run test then immediately open report
npm run simple && npm run report:open

# Format code then run tests
npm run format && npm run lint && npm run simple

# Full quality check and test cycle
npm run format ; npm run lint ; npm run test:load ; npm run report:open
```

## Command Reference by Use Case

### Daily Development Workflow
```bash
npm run format                  # Format code changes
npm run lint                    # Check for issues
npm run simple                  # Quick smoke test
npm run report:open             # Review results
```

### Performance Validation
```bash
npm run load                    # Standard load test
npm run stress                  # High load test
npm run test:spike              # Traffic burst test
npm run report:list             # Compare results
```

### Full Feature Testing
```bash
npm run simple                  # Basic case creation
npm run jp-docs                 # JP with documents
npm run complex                 # Complex workflows
npm run run-all-tests          # Comprehensive suite
```

### Environment Testing
```bash
npm run test:dev                # Test dev environment
npm run test:autotest          # Test autotest environment
npm run test:dev:jp:smoke      # Specific env + test type
```

### Debugging & Analysis
```bash
npm run test:simple:verbose     # Detailed logging
npm run test:load -- -e ENABLE_VERBOSE_REPORT=true  # Force verbose
npm run report:open             # Analyze results
```

## Performance Expectations

### Response Time Targets
| Test Type | p95 Target | p99 Target | Notes |
|-----------|------------|------------|--------|
| Case Creation | <800ms | <1200ms | Single case |
| JP Creation | <1000ms | <1500ms | Without documents |
| Document Upload | <2000ms | <3000ms | 3 files, ~15MB total |
| Complex Workflow | <3000ms | <4500ms | Multiple JPs + docs |

### Throughput Expectations
| Scenario | Target RPS | Max Users | Duration |
|----------|------------|-----------|----------|
| Smoke | 1-2 RPS | 1 user | 30s |
| Load | 5-8 RPS | 5 users | 4m |
| Stress | 10-15 RPS | 15 users | 8m |
| Spike | 25-50 RPS | 50 users | Bursts |

### Error Rate Thresholds
- **Success Rate**: >99% for smoke, >95% for load, >90% for stress
- **Error Rate**: <1% for smoke, <5% for load, <10% for stress
- **Timeout Rate**: <0.1% for all scenarios

## Troubleshooting Commands

### Common Issues & Solutions

**Test fails immediately:**
```bash
# Check configuration
npm run test:simple -- --verbose

# Verify environment connectivity  
k6 run -e CONFIG_ENV=autotest tests/api/cases/create-sak.js
```

**No reports generated:**
```bash
# Force verbose reporting
npm run test:simple -- -e ENABLE_VERBOSE_REPORT=true

# Check reports directory
ls src/reports/
```

**Performance issues:**
```bash
# Run with single user to isolate
npm run test:simple

# Check with verbose logging
npm run test:simple:verbose

# Compare environments
npm run test:dev
npm run test:autotest
```

**Authentication errors:**
```bash
# Check user configuration
cat src/data/users-config.json

# Test authentication only
k6 run -e SCENARIO=auth_only tests/api/cases/create-sak.js
```

## Best Practices

### Command Selection
1. **Start simple**: Always begin with `npm run simple`
2. **Progress gradually**: simple → load → stress → complex
3. **Environment awareness**: Test dev before autotest/prod
4. **Regular checks**: Use daily smoke tests for regression detection

### Performance Testing
1. **Baseline establishment**: Run `npm run simple` for baseline metrics
2. **Load progression**: Gradually increase load (simple → load → stress)
3. **Environment consistency**: Use same environment for comparative tests
4. **Report analysis**: Always review generated reports for insights

### Development Workflow
1. **Code quality first**: `npm run format && npm run lint` before testing
2. **Incremental testing**: Test changes with `npm run simple`
3. **Full validation**: Use `npm run run-all-tests` before commits
4. **Report archival**: Keep reports for trend analysis

This guide provides comprehensive coverage of all available commands, their purposes, and optimal usage patterns for effective performance testing.