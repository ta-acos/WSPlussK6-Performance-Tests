# Acos GRAF Load Test - Performance Metrics Guide

**Version:** 3.0.0  
**Last Updated:** October 7, 2025

## Understanding Your Performance Test Reports

This guide explains how to read and interpret performance test results from the enhanced Acos GRAF Load Test framework, including the new environment metadata and advanced reporting features.

---

## 🎯 Key Performance Indicators (KPIs)

### 1. Environment Information Panel (NEW)

The enhanced reports now include environment context:

```text
🌍 Environment Information
├── Environment: Auto Test
├── Use Data File Config: Yes  
├── API Host: api.websak.local
├── Configuration Source: paths-config.json
└── Test Execution Time: 2025-10-07T10:30:00.000Z
```

**What this tells you:**

- **Environment**: Which environment the test was executed against
- **Use Data File Config**: Whether centralized configuration is active
- **API Host**: The target API server for the test
- **Configuration Source**: Which configuration file provided the settings

### 2. Request Success Rate

**What it shows**: Percentage of successful HTTP requests

**How to interpret**:

- 🟢 **Green portion** = Successful requests (2xx responses)
- 🔴 **Red portion** = Failed requests (4xx, 5xx, timeouts)

**Benchmarks**:

- ✅ **Excellent**: 99.5% or higher
- ✅ **Good**: 99.0-99.5%
- ⚠️ **Warning**: 95-99%
- ❌ **Critical**: Below 95%

### 3. Response Time Performance (p95)

**What it measures**: 95% of all requests completed within this time

**Industry Benchmarks**:

- ✅ **Excellent**: < 500ms (sub-second response)
- ✅ **Good**: 500-1000ms (1 second or less)
- ⚠️ **Acceptable**: 1-2 seconds (noticeable delay)
- ❌ **Poor**: 2-5 seconds (user frustration)
- 🚨 **Critical**: > 5 seconds (users likely to abandon)

### 4. System Throughput (Requests/Second)

**What it measures**: How many requests the system processed per second

**Business Impact**:

- **Higher RPS = Better system capacity**
- **Sustained RPS = System stability**
- **Declining RPS = Performance degradation**

---

## 📈 Detailed Metrics Analysis

### HTTP Request Performance Metrics

#### `http_req_duration` ⭐ **[PRIMARY SLA METRIC]**

**Definition**: Complete request-response cycle time (network + server processing)

**Statistical Breakdown**:

| Metric | Excellent | Good | Acceptable | Slow | Critical |
|--------|-----------|------|------------|------|----------|
| **min** | < 50ms | 50-100ms | 100-200ms | 200-500ms | > 500ms |
| **avg** | < 300ms | 300-800ms | 800-1500ms | 1.5-3sec | > 3sec |
| **med** | < 250ms | 250-600ms | 600-1200ms | 1.2-2.5sec | > 2.5sec |
| **p(90)** | < 600ms | 600-1200ms | 1.2-2.5sec | 2.5-5sec | > 5sec |
| **p(95)** | < 1sec | 1-2sec | 2-4sec | 4-8sec | > 8sec |
| **p(99)** | < 2sec | 2-5sec | 5-10sec | 10-20sec | > 20sec |
| **max** | < 3sec | 3-8sec | 8-15sec | 15-30sec | > 30sec |

**Example Interpretation**:

```text
http_req_duration  min=45ms  avg=380ms  med=320ms  p(95)=1.2s  max=4.8s

✅ min (45ms): Excellent - system can respond very fast when optimal
✅ avg/med (~350ms): Good - typical user experience is responsive  
✅ p(95) (1.2s): Good - 95% of users get sub-2-second response
⚠️ max (4.8s): Acceptable but investigate - someone waited ~5 seconds
```

#### `http_req_waiting` ⏳ **[SERVER PERFORMANCE INDICATOR]**

**Definition**: Server processing time (excluding network latency)

**Benchmarks by Request Type**:

| Request Type | Excellent | Good | Slow | Critical |
|--------------|-----------|------|------|----------|
| **Simple GET** | < 100ms | 100-300ms | 300-1000ms | > 1000ms |
| **Database Query** | < 200ms | 200-500ms | 500-2000ms | > 2000ms |
| **Complex POST** | < 500ms | 500-1500ms | 1500-5000ms | > 5000ms |
| **File Upload** | < 1000ms | 1000-5000ms | 5000-15000ms | > 15000ms |

#### `http_req_failed` ❌ **[RELIABILITY INDICATOR]**

**Definition**: Percentage of requests that failed (4xx, 5xx, timeouts)

**Critical Thresholds**:

- **< 0.1%**: Excellent system reliability
- **0.1-1%**: Good reliability, monitor trends
- **1-5%**: Concerning, investigate failure patterns
- **> 5%**: Critical reliability issues, immediate action needed

---

## 🎯 Performance Analysis Frameworks

### Apdex Score Analysis

**Apdex (Application Performance Index)** provides a standardized way to measure user satisfaction.

**Scoring System**:

```text
Apdex Score = (Satisfied + (Tolerating ÷ 2)) ÷ Total Samples

Where:
├── Satisfied: Response time ≤ T (threshold)
├── Tolerating: T < Response time ≤ 4T  
└── Frustrated: Response time > 4T
```

**Score Interpretation**:

- **0.94-1.00**: Excellent user experience
- **0.85-0.94**: Good user experience  
- **0.70-0.85**: Fair user experience
- **0.50-0.70**: Poor user experience
- **0.00-0.50**: Unacceptable user experience

### Percentile Analysis Framework

**Why Percentiles Matter**:

```text
Average can be misleading:
├── 90% of requests: 200ms (fast)
├── 9% of requests: 300ms (acceptable)
├── 1% of requests: 10,000ms (timeout)
└── Average: 299ms (looks good but 1% users suffer)

p95 = 300ms (more realistic user experience indicator)
```

**Percentile Usage Guidelines**:

- **p50 (median)**: Typical user experience
- **p90**: Good performance target for SLAs
- **p95**: Common SLA metric (5% of users may experience slower)
- **p99**: Strict SLA metric (1% of users may experience slower)

---

## 🔧 Troubleshooting Performance Issues

### High Response Times

**Investigation Steps**:

1. **Check `http_req_waiting`**: High = server-side bottleneck
2. **Check `http_req_connecting`**: High = network/connection issues  
3. **Check `http_req_receiving`**: High = large responses or slow network
4. **Check error rates**: Errors often correlate with performance degradation

**Common Root Causes**:

```text
High http_req_waiting:
├── Database performance issues
├── CPU bottlenecks
├── Memory pressure/garbage collection
├── Lock contention
└── Inefficient algorithms

High http_req_connecting:
├── Server connection pool exhaustion
├── Network congestion
├── DNS resolution issues
└── Load balancer problems
```

### High Error Rates

**Analysis Framework**:

```text
Error Rate Analysis:
├── Identify error types (4xx vs 5xx vs timeouts)
├── Correlate errors with load level
├── Check error distribution across time
└── Analyze error patterns (steady vs spikes)
```

**Common Error Patterns**:

- **Gradual increase**: System resource exhaustion
- **Sudden spikes**: Application crashes or restarts
- **Periodic patterns**: Background processes interfering
- **Load-correlated**: System capacity exceeded

---

## 📋 Performance Test Report Checklist

### Pre-Analysis Checklist

Before diving into metrics, verify:

- [ ] **Environment Information** is correctly displayed
- [ ] **Test configuration** matches intended scenario  
- [ ] **Test duration** was sufficient for meaningful results
- [ ] **Load pattern** executed as expected (check VU ramping)
- [ ] **No major errors** disrupted the test execution

### Key Metrics Review

For each test, evaluate:

- [ ] **Success Rate** > 99% (or meets SLA requirements)
- [ ] **p95 Response Time** < SLA threshold (typically 1-2 seconds)
- [ ] **Throughput (RPS)** meets capacity requirements
- [ ] **Error patterns** are understood and acceptable
- [ ] **Performance consistency** across test duration

### Comparative Analysis

When comparing results:

- [ ] **Same test environment** and configuration
- [ ] **Consistent load patterns** and duration
- [ ] **Similar data volumes** and test scenarios
- [ ] **Account for external factors** (network, other system load)

---

## 🎯 Setting Performance SLAs

### Response Time SLAs

**Web Applications**:

```text
User Interface Actions:
├── Page loads: p95 < 2 seconds
├── Form submissions: p95 < 1 second  
├── Search results: p95 < 1 second
└── Navigation: p95 < 500ms

API Endpoints:
├── Simple queries: p95 < 500ms
├── Complex queries: p95 < 2 seconds
├── Data updates: p95 < 1 second
└── File uploads: p95 < 10 seconds per MB
```

### Availability SLAs

**Success Rate Targets**:

- **99.9%**: 3 nines (43 minutes downtime/month)
- **99.95%**: High availability (22 minutes downtime/month)
- **99.99%**: Very high availability (4 minutes downtime/month)

### Capacity SLAs

**Throughput Requirements**:

```text
Concurrent Users:
├── Peak business hours: System handles 500 concurrent users
├── Normal operations: System handles 200 concurrent users
├── Degraded performance acceptable: Up to 800 concurrent users
└── System failure acceptable: Beyond 1000 concurrent users
```

---

## 📈 Performance Trend Analysis

### Monitoring Key Trends

Track these metrics over time:

1. **Response Time Trends**: Are applications getting slower?
2. **Throughput Trends**: Is system capacity increasing/decreasing?
3. **Error Rate Trends**: Are applications becoming more/less reliable?
4. **Resource Utilization Trends**: How efficiently is the system operating?

### Performance Regression Detection

**Red Flags**:

- **p95 increases > 20%** compared to baseline
- **Throughput decreases > 10%** under same load
- **Error rate increases > 2x** baseline
- **New error types** appearing in results

---

## 📚 Complete Metrics Reference

### Metrics Glossary

| Metric | Unit | Description | Good Value |
|--------|------|-------------|------------|
| `http_req_duration` | ms | Complete request time | p95 < 2000ms |
| `http_req_waiting` | ms | Server processing time | p95 < 1000ms |
| `http_req_connecting` | ms | Connection establishment | p95 < 100ms |
| `http_req_receiving` | ms | Response download time | p95 < 50ms |
| `http_reqs` | count | Total requests made | Higher = better throughput |
| `http_req_failed` | % | Failed request percentage | < 1% |
| `vus` | count | Active virtual users | Test scenario dependent |
| `vus_max` | count | Peak virtual users | Test scenario dependent |
| `iterations` | count | Completed test iterations | Higher = better throughput |
| `iteration_duration` | ms | Time per test iteration | Consistent values preferred |

### Performance Benchmark References

**Response Time Benchmarks** (Web Applications):

- **Excellent**: < 100ms (perceived as instant)
- **Good**: 100-300ms (slight delay noticed)
- **Acceptable**: 300-1000ms (some delay noticed)
- **Slow**: 1-3 seconds (delay definitely noticed)
- **Very Slow**: 3-10 seconds (users start task-switching)
- **Unacceptable**: > 10 seconds (users abandon task)

---

**Performance Metrics Guide maintained by the Acos Performance Testing Team**  
**Version 3.0.0 - October 7, 2025**