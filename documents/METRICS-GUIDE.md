# Performance Metrics Guide

Comprehensive guide to understanding, interpreting, and acting on performance test metrics from the Acos GRAF Load Test framework.

## Overview

This framework collects detailed performance metrics across all test scenarios and provides both real-time monitoring and comprehensive reporting. Understanding these metrics is crucial for system performance optimization and capacity planning.

## Core Metrics Categories

### 1. Response Time Metrics

#### HTTP Request Duration (`http_req_duration`)
**What it measures**: Time from request initiation to response completion

**Key Percentiles**:
- **p50 (Median)**: 50% of requests complete faster than this time
- **p95**: 95% of requests complete faster than this time  
- **p99**: 99% of requests complete faster than this time
- **max**: Slowest request in the test

**Interpretation**:
```
p50: 450ms, p95: 800ms, p99: 1200ms, max: 2100ms
✅ Good performance - most users have sub-second response
```

```  
p50: 1200ms, p95: 3000ms, p99: 5500ms, max: 8900ms
❌ Performance issues - investigate bottlenecks
```

**Thresholds by Test Type**:
| Test Type | p50 Target | p95 Target | p99 Target |
|-----------|------------|------------|------------|
| Case Creation | <400ms | <800ms | <1200ms |
| JP Creation | <500ms | <1000ms | <1500ms |  
| Document Upload | <1000ms | <2000ms | <3000ms |
| Complex Workflow | <1500ms | <3000ms | <4500ms |

### 2. Success Rate Metrics

#### HTTP Request Failed (`http_req_failed`)
**What it measures**: Percentage of requests that failed (4xx, 5xx status codes, timeouts)

**Calculation**: `failed_requests / total_requests * 100`

**Interpretation**:
- **0-1%**: Excellent - System handling load well
- **1-5%**: Warning - Monitor for degradation  
- **5-10%**: Critical - Performance issues present
- **>10%**: Severe - System likely overloaded

**Common Failure Patterns**:
```
Gradual increase: 1% → 3% → 7% → 15%
Indicates: System reaching capacity limits

Sudden spike: 0.5% → 0.5% → 0.5% → 45%  
Indicates: System component failure or bottleneck hit
```

### 3. Throughput Metrics  

#### HTTP Requests per Second (`http_reqs`)
**What it measures**: Number of requests processed per second

**Calculation**: `total_requests / test_duration_seconds`

**Target Ranges by Scenario**:
| Scenario | Target RPS | Max Users | Notes |
|----------|------------|-----------|--------|
| Smoke Test | 1-2 RPS | 1 user | Functionality validation |
| Load Test | 5-10 RPS | 5 users | Normal capacity |
| Stress Test | 10-20 RPS | 15 users | High load |
| Spike Test | 25-50 RPS | 50 users | Peak traffic |

### 4. Connection Metrics

#### HTTP Request Connecting (`http_req_connecting`)
**What it measures**: Time spent establishing connections

**Normal Values**: <50ms for local network, <200ms for internet
**Warning Signs**: 
- Increasing over test duration (connection pool exhaustion)
- High variance (network instability)

#### HTTP Request Waiting (`http_req_waiting`) 
**What it measures**: Time waiting for server response (excludes network)

**Significance**: Pure server processing time
**Target**: <70% of total response time

## Advanced Metrics Analysis

### Performance Profiles

#### Healthy System Profile
```
Metrics Summary:
✅ http_req_duration.......: avg=420ms min=180ms med=410ms max=890ms p(90)=650ms p(95)=720ms
✅ http_req_failed.........: 0.45%
✅ http_reqs...............: 8.2/s
✅ http_req_connecting.....: avg=12ms
✅ http_req_waiting........: avg=385ms

Analysis: System performing well within acceptable limits
```

#### Overloaded System Profile  
```
Metrics Summary:
❌ http_req_duration.......: avg=2100ms min=450ms med=1800ms max=12500ms p(90)=4200ms p(95)=6800ms
❌ http_req_failed.........: 15.2% 
❌ http_reqs...............: 3.1/s
❌ http_req_connecting.....: avg=340ms
❌ http_req_waiting........: avg=1650ms

Analysis: System overloaded - reduce load or scale resources
```

### Correlation Analysis

#### Response Time vs. Load
Monitor how response times change with concurrent users:
```
1 user:  p95=400ms  (baseline)
5 users: p95=650ms  (acceptable degradation)
10 users: p95=1200ms (concerning)
15 users: p95=3400ms (overloaded)
```

#### Error Rate Progression
Track error rate as load increases:
```
Load Ramp: 1→5→10→15 users
Error Rate: 0%→0.5%→3%→18%

Interpretation: System breaks down after 10 concurrent users
```

## Report Interpretation

### HTML Report Analysis

The generated HTML reports provide visual representations of all metrics:

#### Performance Dashboard
- **Response Time Charts**: Visual timeline of response times
- **Error Rate Graphs**: Error distribution over test duration  
- **Throughput Visualization**: Requests per second trends
- **Threshold Compliance**: Pass/fail status for all metrics

#### Detailed Activity Log
- **Test Flow Timeline**: Step-by-step execution details
- **Error Categorization**: Specific error types and frequencies
- **Resource Utilization**: Connection and processing metrics

### JSON Summary Analysis

The JSON summary provides raw data for programmatic analysis:

```json
{
  "performance_summary": {
    "http_req_duration": {
      "avg": 456.78,
      "p50": 420.12,
      "p95": 789.45,
      "p99": 1234.56,
      "max": 2100.89
    },
    "http_req_failed": 0.0234,
    "total_requests": 1250,
    "test_duration": 240
  }
}
```

## Threshold Configuration

### Setting Performance Thresholds

Thresholds are defined in test configuration files:

```javascript
thresholds: {
  'http_req_duration': ['p(95)<800', 'p(99)<1200'],
  'http_req_failed': ['rate<0.05'],
  'http_reqs': ['rate>5']
}
```

### Environment-Specific Thresholds

Different environments may have different performance characteristics:

```json
{
  "autotest": {
    "thresholds": {
      "http_req_duration": "p(95)<800",
      "http_req_failed": "rate<0.05"
    }
  },
  "dev": {
    "thresholds": {
      "http_req_duration": "p(95)<1200",
      "http_req_failed": "rate<0.10"  
    }
  }
}
```

## Troubleshooting by Metrics

### High Response Times

**Symptoms**: p95 > targets, increasing trend over test duration
**Possible Causes**:
- Database query performance  
- Memory pressure
- Network latency
- Resource contention

**Investigation Steps**:
1. Check `http_req_waiting` vs `http_req_duration` ratio
2. Monitor connection establishment times
3. Review server-side logs for slow queries
4. Analyze garbage collection patterns

### High Error Rates

**Symptoms**: `http_req_failed` > 5%
**Common Error Patterns**:
- **Authentication failures**: Check token refresh logic
- **Timeout errors**: System capacity exceeded
- **5xx errors**: Server-side application issues
- **Connection refused**: Service unavailable

### Low Throughput

**Symptoms**: `http_reqs` below expected rates
**Possible Causes**:
- Connection limits
- Rate limiting  
- Resource bottlenecks
- Client-side constraints

## Benchmarking & Baselines

### Industry Standards

Compare your results against industry benchmarks:

| Application Type | p95 Response Time | Error Rate | Availability |
|------------------|-------------------|------------|--------------|
| Web Applications | <1000ms | <1% | >99.9% |
| API Services | <500ms | <0.5% | >99.95% |
| Document Systems | <2000ms | <2% | >99.5% |

### Establishing Baselines

1. **Initial Baseline**: Run smoke tests to establish minimum performance
2. **Capacity Baseline**: Determine maximum stable load  
3. **Degradation Points**: Identify load levels where performance degrades
4. **Breaking Points**: Find system failure thresholds

### Performance Trends

Track metrics over time to identify trends:

```
Week 1: p95=650ms, errors=0.8%
Week 2: p95=720ms, errors=1.2%  
Week 3: p95=850ms, errors=2.1%
Week 4: p95=980ms, errors=3.4%

Trend: Performance degrading - investigate system changes
```

## Metric Collection Best Practices

### Test Design
- **Consistent Load Patterns**: Use same ramp-up/down profiles for comparability
- **Sufficient Duration**: Run tests long enough for steady-state metrics
- **Environment Isolation**: Minimize external factors affecting results

### Data Quality
- **Multiple Runs**: Execute tests multiple times to ensure consistency
- **Outlier Analysis**: Investigate unusually high or low values
- **Context Documentation**: Record system state, versions, configurations

### Reporting Standards
- **Standardized Formats**: Use consistent metric presentation across reports
- **Threshold Documentation**: Clearly define pass/fail criteria
- **Historical Comparison**: Include previous test results for trend analysis

## Advanced Analysis Techniques

### Percentile Analysis
Understanding the full distribution of response times:

```
p50: 400ms  - Typical user experience
p90: 800ms  - 90% of users satisfied
p95: 1200ms - 5% experience slower responses
p99: 2500ms - 1% have poor experience
p99.9: 8900ms - Outliers that may indicate issues
```

### Load Pattern Analysis
Different load patterns reveal different characteristics:

**Constant Load**: Steady-state performance
**Ramping Load**: System behavior under increasing stress  
**Spike Load**: Response to sudden traffic increases
**Step Load**: Threshold identification

### Error Pattern Analysis
Categorize errors to identify root causes:

```
HTTP 401 Unauthorized: 23% - Authentication issues
HTTP 408 Request Timeout: 45% - Performance bottleneck  
HTTP 500 Internal Server Error: 18% - Application bugs
HTTP 502 Bad Gateway: 14% - Infrastructure issues
```

This comprehensive metrics guide enables effective performance analysis and system optimization based on detailed measurement and interpretation of key performance indicators.