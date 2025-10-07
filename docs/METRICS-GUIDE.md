# 📊 K6 Performance Metrics Guide for Non-Technical Users

## Understanding Your Performance Test Report

This guide explains what each metric means in simple terms and how to read the report.

---

## 🎯 Key Performance Indicators (KPIs) - Top Summary

These are the most important numbers at the top of your report:

### 1. **Success Rate Donut Chart**
- **What it shows**: Percentage of successful requests
- **How to read**: 
  - 🟢 **Green portion** = Successful requests
  - 🔴 **Red portion** = Failed requests
- **Good**: 99% or higher (mostly green)
- **Warning**: 95-99% (small red slice)
- **Problem**: Below 95% (large red slice)

### 2. **Request Success Rate**
- **What it is**: Percentage of HTTP requests that completed successfully (got back 200 OK responses)
- **How to read**: `98.50%` means 98.5 out of 100 requests worked
- **Good**: 99% or higher
- **Action needed**: Below 95% means server issues

### 3. **Response Time (p95)**
- **What it is**: 95% of users experienced this response time or faster
- **How to read**: `850ms` means 95% of requests took less than 850 milliseconds
- **Good**: Under 800ms (less than 1 second)
- **Warning**: 800-2000ms (1-2 seconds)
- **Problem**: Over 2000ms (more than 2 seconds)
- **Why p95**: We ignore the slowest 5% to avoid outliers skewing results

### 4. **Max Response Time**
- **What it is**: The slowest request in the entire test
- **How to read**: `5000ms` means the slowest request took 5 seconds
- **Note**: This is usually higher than p95 and represents worst-case scenario

### 5. **Total Requests**
- **What it is**: How many HTTP requests were made during the test
- **How to read**: `1,234` requests means your test generated 1,234 API calls

### 6. **Requests Per Second**
- **What it is**: How many requests the system handled per second (throughput)
- **How to read**: `50 req/s` means the server processed 50 requests every second
- **Higher is better**: Shows system capacity

---

## 📈 All Metrics (Raw Statistics) - Detailed Breakdown

This section appears in your report as a table with many rows. Here's what each metric means with real-world benchmarks.

---

### **HTTP Request Metrics** (How fast was the server?)

#### `http_req_duration` ⏱️ **[MOST IMPORTANT]**
**What it is**: Total time from sending request until receiving complete response (end-to-end)

**Real-world example**: Like asking a question and waiting for the complete answer

**Benchmarks** (based on industry standards):
| Metric | Excellent | Good | Acceptable | Slow | Very Slow |
|--------|-----------|------|------------|------|-----------|
| **min** | < 50ms | 50-100ms | 100-200ms | 200-500ms | > 500ms |
| **avg** | < 200ms | 200-500ms | 500-1000ms | 1-2 sec | > 2 sec |
| **med** | < 200ms | 200-500ms | 500-1000ms | 1-2 sec | > 2 sec |
| **p(90)** | < 500ms | 500-800ms | 800-1500ms | 1.5-3 sec | > 3 sec |
| **p(95)** | < 800ms | 800-2000ms | 2-3 sec | 3-5 sec | > 5 sec |
| **max** | < 1 sec | 1-3 sec | 3-5 sec | 5-10 sec | > 10 sec |

**What each column means**:
- **min**: Fastest request (best case scenario)
- **avg**: Average across all requests (can be misleading due to outliers)
- **med**: Middle value - 50% faster, 50% slower (typical user experience)
- **p(90)**: 90% of users experienced this speed or better
- **p(95)**: 95% of users experienced this speed or better ⭐ **Use this for SLAs**
- **max**: Slowest request (worst case scenario)

**Example interpretation**:
```
http_req_duration  min=45.2ms  avg=320ms  med=280ms  p(95)=1.2s  max=5.3s
```
✅ **min**: Excellent - best case was super fast  
✅ **avg/med**: Good - typical requests took about 300ms  
⚠️ **p(95)**: Acceptable - 5% of users waited over 1.2 seconds  
❌ **max**: Problem - someone waited 5.3 seconds (investigate why!)

---

#### `http_req_waiting` ⏳
**What it is**: Time server spent processing your request (pure server time, no network)

**Real-world example**: How long the chef takes to cook your food (not including waiting for delivery)

**Benchmarks**:
| Response Type | Excellent | Good | Slow | Critical |
|---------------|-----------|------|------|----------|
| Simple GET | < 50ms | 50-200ms | 200-500ms | > 500ms |
| Database query | < 100ms | 100-300ms | 300-800ms | > 800ms |
| File upload | < 1s | 1-5s | 5-10s | > 10s |
| Heavy processing | < 2s | 2-5s | 5-10s | > 10s |

**Why it matters**: 
- Should be similar to `http_req_duration` 
- If much smaller → network delay is significant
- If much larger → server processing is the bottleneck

---

#### `http_req_blocked` 🚧
**What it is**: Time spent waiting for an available connection slot

**Real-world example**: Like waiting in line for an available phone line

**Benchmarks**:
| Scenario | Normal | Warning | Problem |
|----------|--------|---------|---------|
| **First request** | 0-100ms | 100-200ms | > 200ms |
| **Subsequent requests** | 0-5ms | 5-50ms | > 50ms |

**What to check**:
- ✅ **0-5ms**: Good - connections are reused efficiently
- ⚠️ **50-200ms**: Connection pool may be too small
- ❌ **> 200ms**: Critical - connection pool exhaustion

---

#### `http_req_connecting` 🔌
**What it is**: Time to establish TCP connection to server

**Real-world example**: Time to dial a phone number before it starts ringing

**Benchmarks**:
| Network | Excellent | Good | Slow | Problem |
|---------|-----------|------|------|---------|
| Same datacenter | < 1ms | 1-5ms | 5-10ms | > 10ms |
| Same region | < 10ms | 10-50ms | 50-100ms | > 100ms |
| Cross-region | < 50ms | 50-150ms | 150-300ms | > 300ms |

**What to check**:
- Should be **0ms** for most requests (connection reuse)
- Only **first request** should show connection time
- High values on all requests = connection pool problem

---

#### `http_req_tls_handshaking` 🔐
**What it is**: Time for SSL/TLS encryption setup (HTTPS security)

**Real-world example**: Time to verify someone's ID before letting them in

**Benchmarks**:
| Scenario | Normal | Acceptable | Slow |
|----------|--------|------------|------|
| First request | 50-150ms | 150-300ms | > 300ms |
| Reused connection | 0ms | 0-5ms | > 5ms |

**What to check**:
- ✅ **0ms** on most requests = Good (SSL session reuse working)
- ⚠️ **> 200ms** on all requests = Problem (no session reuse)

---

#### `http_req_sending` 📤
**What it is**: Time to upload your request data to server

**Real-world example**: Time to tell your order to the waiter

**Benchmarks by request size**:
| Request Size | Normal | Acceptable | Slow |
|--------------|--------|------------|------|
| Small (< 1KB) | < 1ms | 1-5ms | > 5ms |
| Medium (1-100KB) | < 10ms | 10-50ms | > 50ms |
| Large (100KB-1MB) | < 100ms | 100-500ms | > 500ms |
| Very Large (> 1MB) | < 1s | 1-5s | > 5s |

**What to check**:
- Should be very small for API requests
- Large values = slow upload speed or big request payload

---

#### `http_req_receiving` 📥
**What it is**: Time to download response data from server

**Real-world example**: Time for delivery person to hand you your food

**Benchmarks by response size**:
| Response Size | Normal | Acceptable | Slow |
|---------------|--------|------------|------|
| Small (< 1KB) | < 1ms | 1-10ms | > 10ms |
| Medium (1-100KB) | < 10ms | 10-100ms | > 100ms |
| Large (100KB-1MB) | < 100ms | 100-1s | > 1s |
| Very Large (> 1MB) | < 1s | 1-10s | > 10s |

**What to check**:
- Should be consistent across similar requests
- Varies with response size (larger = slower)
- High values = slow download or large response

---

#### `http_req_failed` ❌
**What it is**: Percentage of HTTP requests that failed (4xx, 5xx errors)

**Real-world example**: How many orders were rejected by the restaurant

**Benchmarks**:
| Rate | Status | Action |
|------|--------|--------|
| **0** | ✅ Perfect | No action needed |
| **0.001 (0.1%)** | ✅ Excellent | Monitor only |
| **0.01 (1%)** | ⚠️ Warning | Investigate cause |
| **0.05 (5%)** | 🔴 Problem | Immediate attention |
| **> 0.1 (10%)** | 🔴 Critical | System failure |

**Example**:
```
http_req_failed  rate=0.02  (2%)
```
⚠️ **Meaning**: 2 out of every 100 requests failed - needs investigation

---

#### `http_reqs` 📊
**What it is**: Total HTTP requests and throughput

**Benchmarks** (depends on your system):
| System Type | Light Load | Normal Load | Heavy Load | Max Capacity |
|-------------|------------|-------------|------------|--------------|
| Small API | 1-10 req/s | 10-50 req/s | 50-100 req/s | > 100 req/s |
| Medium API | 10-50 req/s | 50-200 req/s | 200-500 req/s | > 500 req/s |
| Large API | 50-200 req/s | 200-1000 req/s | 1K-5K req/s | > 5K req/s |

**Example**:
```
http_reqs  count=1250  rate=41.67/s
```
📊 **Meaning**: Made 1,250 total requests at 41.67 requests per second

---

### **Data Transfer Metrics** (How much data moved?)

#### `data_received` 📥

**What it is**: Total amount of data downloaded from server during entire test

**Real-world example**: Like checking how much data your phone used

**Benchmarks** (depends on test duration and load):

| Test Duration | API Responses | Normal | High | Very High |
|---------------|---------------|--------|------|-----------|
| 1 minute | JSON (< 10KB each) | < 1 MB | 1-10 MB | > 10 MB |
| 1 minute | JSON + Files | 1-50 MB | 50-200 MB | > 200 MB |
| 10 minutes | JSON (< 10KB each) | < 10 MB | 10-100 MB | > 100 MB |
| 10 minutes | JSON + Files | 10-500 MB | 0.5-2 GB | > 2 GB |

**Example**:
```text
data_received  2.5 MB
```
📥 **Meaning**: Downloaded 2.5 megabytes total during the test

**What to check**:
- Compare with expected response sizes × request count
- Large values = big responses or many requests
- Helps estimate bandwidth costs

---

#### `data_sent` 📤

**What it is**: Total amount of data uploaded to server during entire test

**Real-world example**: Like checking how much you uploaded to cloud storage

**Benchmarks**:

| Request Type | Per Request | 100 Requests | 1000 Requests |
|--------------|-------------|--------------|---------------|
| Simple GET | < 500 bytes | < 50 KB | < 500 KB |
| POST (JSON) | 1-10 KB | 100 KB - 1 MB | 1-10 MB |
| File upload (small) | 100 KB - 1 MB | 10-100 MB | 100 MB - 1 GB |
| File upload (large) | 1-10 MB | 100 MB - 1 GB | 1-10 GB |

**Example**:
```text
data_sent  450 KB
```
📤 **Meaning**: Uploaded 450 kilobytes total during the test

**What to check**:
- Should match expected payload sizes
- Large values = big uploads (files, documents)
- Helps estimate network requirements

---

### **Test Validation Metrics** (Did requests work correctly?)

#### `checks` ✅

**What it is**: Validation rules that verify responses are correct

**Real-world example**: Like checking if your order is correct before eating

**Common checks**:
- "Status code is 200" (request succeeded)
- "Response time < 2000ms" (fast enough)
- "Response contains expected data" (correct content)
- "No errors in response body" (no bugs)

**Columns explained**:
- **passes**: How many checks succeeded
- **fails**: How many checks failed  
- **rate**: Success percentage (0.98 = 98%)

**Benchmarks**:

| Result | Status | Meaning | Action |
|--------|--------|---------|--------|
| **0 fails** | ✅ Perfect | Everything validated correctly | None |
| **1-5% fails** | ⚠️ Warning | Minor issues detected | Investigate |
| **5-10% fails** | 🔴 Problem | Significant validation failures | Fix immediately |
| **> 10% fails** | 🔴 Critical | Major system issues | Emergency response |

**Example**:
```text
checks  passes=95  fails=5  rate=0.95 (95%)
```
⚠️ **Meaning**: 95 checks passed, 5 failed = 95% success rate (investigate the 5 failures)

---

### **Iteration Metrics** (How long per complete test scenario?)

#### `iteration_duration` 🔄

**What it is**: Time to complete one full user journey (all steps together)

**Real-world example**: Time from entering restaurant to leaving (including waiting, ordering, eating)

**Components**:
- All HTTP requests in the scenario
- Think time (pauses between actions)
- Data processing time

**Benchmarks**:

| Scenario Type | Good | Acceptable | Slow |
|---------------|------|------------|------|
| Simple (1-3 requests) | < 2s | 2-5s | > 5s |
| Medium (4-10 requests) | < 10s | 10-30s | > 30s |
| Complex (10+ requests) | < 30s | 30-60s | > 60s |
| With file uploads | < 60s | 60-120s | > 120s |

**Example**:
```text
iteration_duration  avg=15s  p(95)=25s  max=45s
```
📊 **Meaning**: Average user journey took 15 seconds, 95% completed within 25 seconds

**Note**: Always higher than `http_req_duration` because includes multiple requests + pauses

---

#### `iterations` 🔁

**What it is**: How many times the complete test scenario ran

**Real-world example**: How many customers completed their full shopping journey

**Benchmarks**:

| Test Type | Duration | Expected Iterations |
|-----------|----------|---------------------|
| Smoke test | 30s - 1min | 1-5 |
| Load test | 5-10 min | 10-100 |
| Stress test | 10-30 min | 50-500 |
| Endurance test | 30+ min | 100-1000+ |

**Example**:
```text
iterations  count=47  rate=1.57/s
```
🔁 **Meaning**: Test ran 47 complete scenarios, averaging 1.57 scenarios per second

---

### **System Load Metrics** (How many users are testing?)

#### `vus` (Virtual Users) 👥

**What it is**: Number of simulated users running tests simultaneously

**Real-world example**: Number of customers in the store at the same time

**Benchmarks by system size**:

| System Size | Light Load | Normal Load | Heavy Load | Stress Load |
|-------------|------------|-------------|------------|-------------|
| **Small/Dev** | 1-5 VUs | 5-20 VUs | 20-50 VUs | 50-100 VUs |
| **Medium** | 5-20 VUs | 20-100 VUs | 100-500 VUs | 500-1000 VUs |
| **Large** | 20-100 VUs | 100-500 VUs | 500-2000 VUs | 2000+ VUs |

**Example**:
```text
vus  value=25
```
👥 **Meaning**: 25 virtual users were running tests concurrently

---

#### `vus_max` 👥📈

**What it is**: Maximum number of virtual users configured for the test

**Example**:
```text
vus_max  value=50
```
📈 **Meaning**: Test was configured to use up to 50 virtual users (actual usage was shown in `vus`)

---

### **Custom Error Metrics** (Application-specific problems)

#### `custom_errors` 🔴

**What it is**: Errors specific to your application logic (not just HTTP errors)

**Real-world example**: Order succeeded but food was cold (technical success, quality failure)

**Common custom errors**:
- Document upload timeout (took > 5 seconds)
- Business rule violation (invalid data format)
- Timeout waiting for processing
- Response missing required fields

**Benchmarks**:

| Count | Status | Action |
|-------|--------|--------|
| **0** | ✅ Perfect | No issues |
| **1-10** | ⚠️ Minor | Review and fix |
| **10-50** | 🔴 Problem | Investigate immediately |
| **> 50** | 🔴 Critical | Major system issue |

**Example**:
```text
custom_errors  count=8
```
⚠️ **Meaning**: 8 application-level errors detected (check Error Details section for specifics)

---

#### `errors_by_endpoint` 📍

**What it is**: Shows which API endpoints had errors

**Example**:
```text
/api/jp/uploadfiletodokument  →  8 errors
/api/case/create  →  0 errors
```
📍 **Meaning**: File upload endpoint had 8 errors, case creation had none

**Why it matters**: Helps pinpoint exactly where problems are occurring

---

#### `errors_by_status` 📊

**What it is**: HTTP status codes of failed requests

**Common status codes**:

| Code | Meaning | Common Cause |
|------|---------|--------------|
| **200** | Success (but check failed) | Timeout, slow response |
| **400** | Bad Request | Invalid data sent |
| **401** | Unauthorized | Authentication failed |
| **403** | Forbidden | No permission |
| **404** | Not Found | Wrong URL or resource deleted |
| **500** | Server Error | Application bug/crash |
| **502** | Bad Gateway | Server unreachable |
| **503** | Service Unavailable | Server overloaded |
| **504** | Gateway Timeout | Request took too long |

**Example**:
```text
errors_by_status:
  200  →  8 errors (timeout threshold exceeded)
  404  →  2 errors (resource not found)
```
📊 **Meaning**: 8 requests succeeded (200) but were too slow, 2 resources were not found

---

## 🎨 Color Coding in Report

### Cell/Box Colors:
- 🟢 **Green** = Good performance (meet targets)
- 🟡 **Yellow/Orange** = Warning (approaching limits)
- 🔴 **Red** = Problem (exceeds thresholds)

### Legend in Raw Statistics Table:
- **Good**: p(95) ≤ 800ms, failure rate ≤ 1%
- **Watch**: p(95) ≤ 2000ms, failure rate ≤ 5%
- **Investigate**: p(95) > 2000ms, failure rate > 5%

---

## 🤔 Common Questions

### Q: Why is the donut chart red when all requests passed?
**A**: The donut shows **check success rate** including performance thresholds. Even if HTTP requests succeed (200 OK), if they're too slow (exceed threshold), checks fail and show red.

**Example**: 
- Request returns 200 OK ✅ (HTTP success)
- But took 5 seconds ❌ (exceeds 2-second threshold)
- Result: Red in donut chart

### Q: What's the difference between "avg", "med", and "p(95)"?
**A**: 
- **avg** (average): Sum of all values ÷ count (can be skewed by extremes)
- **med** (median): Middle value (50th percentile)
- **p(95)** (95th percentile): 95% were faster, 5% were slower (best for SLAs)

**Example with 10 requests**: [100, 100, 100, 100, 100, 100, 100, 100, 100, 5000]
- avg = 590ms (affected by the 5000ms outlier)
- med = 100ms (true middle experience)
- p(95) = 5000ms (captures worst cases that users experience)

### Q: What does "rate" mean?
**A**: A decimal representing percentage:
- `rate: 0.01` = 1%
- `rate: 0.05` = 5%
- `rate: 1.0` = 100%

### Q: How do I know if my test passed?
**A**: Look for:
1. ✅ Success Rate ≥ 99%
2. ✅ p(95) Response Time ≤ 2000ms
3. ✅ No red boxes in Threshold Benchmarks section
4. ✅ "checks" metric shows 0 fails

### Q: What should I focus on first?
**A**: Priority order:
1. **Success Rate** - Are requests completing?
2. **Response Time (p95)** - Are they fast enough?
3. **Error Details** - What specific errors occurred?
4. **Throughput (req/s)** - Can the system handle the load?

---

## � Practical Example: Reading a Real Report

Let's interpret actual metrics from a test:

### Sample Metrics Table:
```text
http_req_duration     min=45ms  avg=680ms  med=520ms  p(95)=1800ms  max=5200ms
http_req_waiting      min=42ms  avg=650ms  med=500ms  p(95)=1750ms  max=5100ms
http_req_failed       rate=0.02 (2%)
http_reqs             count=1000  rate=33.3/s
checks                passes=980  fails=20  rate=0.98
data_received         12.5 MB
iterations            count=50  rate=1.67/s
vus                   value=10
```

### 🔍 What This Tells You:

#### ✅ **Good News**:
- **min=45ms**: Best case was super fast
- **med=520ms**: Most users got responses in half a second
- **rate=33.3/s**: System handled 33 requests per second successfully
- **98% checks passed**: Most validations succeeded

#### ⚠️ **Concerns**:
- **p(95)=1800ms**: 5% of users waited almost 2 seconds (approaching limit)
- **max=5200ms**: Worst case was 5.2 seconds (someone had a bad experience)
- **2% failures**: 20 out of 1000 requests failed (need to investigate why)
- **20 check fails**: Some validation rules failed (timeout thresholds?)

#### 🎯 **Recommended Actions**:
1. **Investigate the 20 failed checks** - Look at Error Details section
2. **Optimize slow requests** - Why did some take 5+ seconds?
3. **Review the 2% HTTP failures** - What caused them?
4. **Consider raising p(95) threshold** - If 1800ms is acceptable for your use case

---

## 🎓 Quick Reference Card

### Response Time Goals:
- 🟢 **Excellent**: p(95) < 800ms
- 🟡 **Good**: p(95) < 2000ms  
- 🔴 **Poor**: p(95) > 2000ms

### Success Rate Goals:
- 🟢 **Excellent**: 99%+ success
- 🟡 **Acceptable**: 95-99% success
- 🔴 **Poor**: < 95% success

### What to Check First:
1. **Donut Chart** - Overall health at a glance
2. **p(95) Response Time** - User experience quality
3. **Success Rate** - Are requests completing?
4. **Error Details** - What specifically went wrong?
5. **Threshold Benchmarks** - Which limits were exceeded?

---

## 📞 Need Help?

### When to Contact Your Team:

#### 🔴 **Urgent** (Contact immediately):
- Success rate < 90%
- p(95) response time > 5 seconds
- More than 10% check failures
- System crashes or 500 errors

#### ⚠️ **Important** (Contact within 24 hours):
- Success rate 90-95%
- p(95) response time 2-5 seconds
- 5-10% check failures
- Multiple threshold violations

#### ℹ️ **Informational** (Next meeting):
- Success rate 95-99%
- p(95) response time approaching thresholds
- 1-5% check failures
- Minor optimization opportunities

### What to Include When Reporting Issues:
1. ✅ Link to the HTML report file
2. ✅ Screenshot of the donut chart
3. ✅ Specific metric values (p95, success rate)
4. ✅ Screenshot of Error Details section (if errors exist)
5. ✅ Test scenario used (smoke, load, stress)
6. ✅ Number of virtual users and duration

### Sample Report Message:
```text
Subject: Performance Test Results - Action Needed

Hi Team,

I ran a load test with 10 VUs for 5 minutes. Here are the results:

📊 Overall Success Rate: 86% (see attached report)
⏱️ Response Time (p95): 1800ms
❌ Checks Failed: 8 out of 56 (14%)

Issues Detected:
- 8 document upload timeouts (took 7-20 seconds instead of <5 seconds)
- All failures on /api/jp/uploadfiletodokument endpoint

Report: [attach create-multiplejp-with-multiple-document-report.html]

Please review and advise on next steps.

Thanks!
```

---

**Last Updated**: October 6, 2025  
**Version**: 2.0 (Enhanced with benchmarks and practical examples)
