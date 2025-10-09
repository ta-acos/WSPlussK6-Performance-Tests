# User Guide - Getting Started

Complete guide for end users to quickly start using the Acos GRAF Load Test v3.0 framework.

## What This Framework Does

The Acos GRAF Load Test framework helps you:

- **Test Performance**: Measure how fast your WebSak Plus application responds
- **Validate Capacity**: Determine how many users your system can handle
- **Identify Issues**: Find performance bottlenecks before they affect real users
- **Generate Reports**: Get detailed analysis with visual dashboards

## Who Should Use This

- **Developers**: Testing code changes impact on performance
- **QA Engineers**: Validating system performance before releases  
- **System Administrators**: Monitoring system capacity and health
- **Product Managers**: Understanding user experience under load

## Quick Start (5 Minutes)

### Step 1: Verify Installation

Open a terminal/command prompt and check if everything is installed:

```bash
# Check K6 is installed
k6 version

# Check Node.js is installed  
node --version

# Navigate to project directory
cd WSPlussK6-Performance-Tests
```

### Step 2: Run Your First Test

```bash
# Run a simple test (30 seconds, 1 user)
npm run simple
```

**What happens:**
1. Framework authenticates a test user
2. Creates a case in WebSak Plus
3. Measures response times
4. Generates a performance report

### Step 3: View Results

```bash
# Open the generated report
npm run report:open
```

The report opens in your browser showing:
- ✅ Response times (should be under 1 second)
- ✅ Success rate (should be 100%)
- ✅ Performance graphs and analysis

**Congratulations!** You've run your first performance test.

## Understanding Your Results

### Good Results Look Like This:
```
✓ Response Time (p95): 650ms
✓ Success Rate: 100%  
✓ Errors: 0%
✓ All thresholds passed
```

### Warning Signs:
```
⚠ Response Time (p95): 1,200ms
⚠ Success Rate: 98%
⚠ Some thresholds failed
```

### Problem Indicators:
```
❌ Response Time (p95): 3,400ms
❌ Success Rate: 85%
❌ Error Rate: 15%
❌ Multiple thresholds failed
```

## Common Testing Scenarios

### Daily Development Testing

**Use Case**: Check if your code changes affect performance
**Command**: `npm run simple`
**Duration**: 30 seconds
**Purpose**: Quick smoke test for functionality

```bash
# Make code changes
# Test performance impact
npm run simple

# Review results
npm run report:open
```

### Pre-Release Validation  

**Use Case**: Validate system before deploying to production
**Commands**: Multiple test types
**Duration**: 10-15 minutes total
**Purpose**: Comprehensive performance validation

```bash
# Step 1: Basic functionality test
npm run simple

# Step 2: Normal load test  
npm run load

# Step 3: Stress test
npm run stress

# Review all results
npm run report:list
```

### Capacity Planning

**Use Case**: Determine maximum system capacity
**Commands**: Progressively higher loads
**Duration**: 20-30 minutes
**Purpose**: Find system breaking points

```bash
# Test increasing loads
npm run test:load      # 5 users
npm run test:stress    # 15 users  
npm run test:spike     # 50 users peak

# Analyze where system starts failing
```

### Feature-Specific Testing

**Use Case**: Test specific application features
**Commands**: Feature-targeted tests
**Duration**: Varies by feature complexity
**Purpose**: Validate specific functionality performance

```bash
# Case creation only
npm run simple

# Journal posts (no documents)  
npm run test:simple:jp

# Document uploads
npm run jp-docs

# Complex workflows
npm run complex
```

## Test Types Explained

### 1. Smoke Tests
**Purpose**: Verify basic functionality works
**Load**: 1 user for 30 seconds
**When to use**: Daily checks, after code changes

```bash
npm run simple              # Case creation
npm run test:simple:jp      # Journal posts
npm run test:simple:documents # With document upload
```

### 2. Load Tests  
**Purpose**: Test normal operating conditions
**Load**: 5 users for 4 minutes
**When to use**: Regular performance validation

```bash
npm run load               # Default load test
npm run test:load:jp       # Journal post load test
npm run test:load:documents # Document upload load test
```

### 3. Stress Tests
**Purpose**: Test system limits
**Load**: 15 users for 8 minutes  
**When to use**: Capacity planning, breaking point analysis

```bash
npm run stress             # High load testing
npm run test:stress:jp     # JP stress testing
npm run test:stress:complex # Complex workflow stress
```

### 4. Spike Tests
**Purpose**: Test sudden traffic increases
**Load**: 1→50→1 users in bursts
**When to use**: Prepare for traffic spikes, validate auto-scaling

```bash
npm run test:spike         # Traffic spike simulation
```

## Interpreting Reports

### HTML Dashboard

When you open a report, you'll see:

1. **Summary Section**
   - Overall test results (Pass/Fail)
   - Key metrics at a glance
   - Performance score

2. **Response Time Charts**  
   - Timeline of response times during test
   - Percentile distributions (p50, p95, p99)
   - Trend analysis

3. **Error Analysis**
   - Error rate over time
   - Error type breakdown
   - Failure reasons

4. **Activity Log**
   - Detailed step-by-step execution
   - What the test actually did
   - Timing for each operation

### Key Metrics to Watch

| Metric | Good | Warning | Critical | Action Required |
|--------|------|---------|----------|-----------------|
| **Response Time (p95)** | <800ms | 800-2000ms | >2000ms | Investigate slow queries, optimize code |
| **Success Rate** | >99% | 95-99% | <95% | Check error logs, fix application issues |
| **Error Rate** | <1% | 1-5% | >5% | Review application errors, check system resources |

### Performance Trends

Run the same test regularly to track trends:

```
Week 1: p95=650ms, Success=100%  ✅ Baseline
Week 2: p95=720ms, Success=99%   ✅ Still good  
Week 3: p95=890ms, Success=97%   ⚠ Degrading
Week 4: p95=1200ms, Success=94%  ❌ Action needed
```

## Environment Testing

### Test Different Environments

The framework supports testing multiple environments:

```bash
# Test development environment
npm run test:dev

# Test auto-test environment (default)
npm run test:autotest

# Environment-specific scenarios
npm run test:dev:jp:smoke
npm run test:autotest:load
```

### Environment Comparison

Compare performance across environments:

1. Run same test on different environments
2. Compare response times and error rates
3. Identify environment-specific issues

```bash
# Compare environments
npm run test:dev     # Development
npm run test:autotest # Auto-test

# Compare reports to see differences
npm run report:list
```

## Troubleshooting Common Issues

### Test Fails Immediately

**Symptoms**: Test stops right after starting
**Possible Causes**: Authentication, network, configuration
**Solutions**:
```bash
# Check configuration
ls src/config/
ls src/data/

# Test with verbose output
npm run test:simple:verbose

# Verify connectivity
ping autotest01.acoscloud.no
```

### High Response Times

**Symptoms**: All requests take >2 seconds
**Possible Causes**: System overload, network issues, database problems
**Solutions**:
1. Reduce test load (use smoke test instead of stress test)
2. Check system resources on target environment  
3. Review application logs for slow operations
4. Test during off-peak hours

### High Error Rates

**Symptoms**: Many requests failing (404, 500, timeout errors)
**Possible Causes**: Application bugs, system overload, invalid test data
**Solutions**:
1. Check error details in HTML report
2. Verify test user accounts are valid
3. Confirm target environment is running
4. Review application error logs

### No Reports Generated

**Symptoms**: Test completes but no HTML report appears
**Possible Causes**: Report generation disabled, file permissions
**Solutions**:
```bash
# Force verbose reporting  
npm run test:simple -- -e ENABLE_VERBOSE_REPORT=true

# Check reports directory
ls src/reports/

# Check file permissions
chmod 755 src/reports/
```

## Best Practices

### Testing Schedule

**Daily**: Run smoke tests to catch regressions
```bash
npm run simple
```

**Weekly**: Run load tests for performance validation  
```bash
npm run load
npm run test:load:jp
```

**Before Releases**: Run comprehensive test suite
```bash
npm run run-all-tests
```

**Monthly**: Run capacity planning tests
```bash
npm run test:stress
npm run test:spike
```

### Result Analysis

1. **Always review reports** - Don't just check pass/fail status
2. **Track trends** - Keep historical data for comparison
3. **Document issues** - Record what caused performance problems
4. **Share results** - Communicate findings with team

### Test Environment Hygiene

1. **Use dedicated test accounts** - Don't test with production users
2. **Clean test data** - Remove test cases/documents after testing
3. **Coordinate testing** - Avoid conflicts with other testers
4. **Monitor system resources** - Check if environment is healthy

## Advanced Usage

### Custom Test Scenarios

You can create custom test scenarios by modifying configuration:

1. Edit `src/config/autotest.json`
2. Add new scenarios with different user counts and durations
3. Create new npm scripts in `package.json`

### Automated Testing

Integrate tests into your CI/CD pipeline:

```bash
# In your build script
npm run simple
if [ $? -eq 0 ]; then
    echo "Performance test passed"
else
    echo "Performance test failed"
    exit 1
fi
```

### Performance Monitoring

Set up regular automated tests:

```bash
# Create a monitoring script
#!/bin/bash
npm run simple
npm run load
# Send results to monitoring system
```

## Getting Help

### Documentation Resources

1. **README.md** - Project overview and quick start
2. **ARCHITECTURE.md** - Technical system details
3. **NPM-COMMANDS-GUIDE.md** - Complete command reference
4. **METRICS-GUIDE.md** - Detailed metrics explanation
5. **INSTALLATION-GUIDE.md** - Setup instructions

### Self-Service Debugging

1. **Check the basics** - Is K6 installed? Are credentials correct?
2. **Start simple** - Use `npm run simple` to isolate issues
3. **Read error messages** - Error messages often indicate the problem
4. **Check configuration** - Verify environment settings and user accounts

### Report Issues

When reporting issues, include:
1. Command that failed
2. Complete error message
3. Environment being tested
4. System information (OS, K6 version, Node version)

## Next Steps

After mastering the basics:

1. **Learn advanced commands** - Explore the full NPM commands guide
2. **Understand metrics deeply** - Read the metrics guide for detailed analysis
3. **Customize scenarios** - Modify test configurations for your specific needs
4. **Automate testing** - Integrate into your development workflow
5. **Share knowledge** - Train team members on performance testing

This framework provides a comprehensive foundation for performance testing WebSak Plus applications. Start with simple tests and gradually explore more advanced features as you become comfortable with the system.