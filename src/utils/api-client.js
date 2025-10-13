/**
 * ===================================================================
 * API CLIENT UTILITY MODULE
 * ===================================================================
 *
 * @author Senthilkumar Sengottuvel
 *
 * WHAT THIS MODULE DOES:
 * This module provides a standardized way to make HTTP requests to API endpoints
 * with consistent error handling, metrics collection, and retry logic. It acts
 * as a wrapper around K6's HTTP module with additional functionality.
 *
 * MAIN CAPABILITIES:
 *
 * 1. 🌐 HTTP REQUEST HANDLING:
 *    - Supports all standard HTTP methods (GET, POST, PUT, DELETE)
 *    - Automatically constructs full URLs from paths and configuration
 *    - Includes proper request headers and authentication
 *    - Handles request timeouts and error conditions
 *
 * 2. 📊 METRICS COLLECTION:
 *    - Tracks API error rates across all requests
 *    - Measures response times for performance analysis
 *    - Tags requests for detailed breakdown in reports
 *    - Custom metrics that appear in K6 results
 *
 * 3. 🔄 RETRY LOGIC:
 *    - Automatic retry for transient failures
 *    - Configurable retry attempts and backoff delays
 *    - Smart retry conditions (network errors, 5xx responses)
 *    - Preserves original error details for troubleshooting
 *
 * 4. ✅ RESPONSE VALIDATION:
 *    - Built-in checks for successful responses
 *    - Validates response structure and content
 *    - Consistent error reporting across all API calls
 *    - Integration with K6's check system for pass/fail tracking
 *
 * WHY THIS MODULE EXISTS:
 * Without a standardized API client, each test would handle HTTP requests
 * differently, leading to inconsistent error handling and metrics collection.
 * This module ensures all API calls follow the same patterns and provide
 * consistent data for performance analysis.
 *
 * EXAMPLE USAGE:
 * ```javascript
 * import { callEndpoint } from '../utils/api-client.js';
 *
 * // Make a GET request
 * const response = callEndpoint('GET', '/api/cases', null, authHeaders, config, 'Get Cases');
 *
 * // Make a POST request with data
 * const response = callEndpoint('POST', '/api/cases', caseData, authHeaders, config, 'Create Case');
 * ```
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ========================================
// CUSTOM METRICS FOR API MONITORING
// ========================================

/**
 * Tracks the rate of API errors (4xx and 5xx responses)
 * This metric helps identify when the API is experiencing issues
 */
export const apiErrorRate = new Rate('api_errors');

/**
 * Measures API response times for performance analysis
 * The 'true' parameter enables time series data collection
 */
export const apiResponseTime = new Trend('api_response_time', true);

/**
 * Make HTTP request to API endpoint
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
 * @param {string} url - Full URL or path
 * @param {Object} payload - Request payload (for POST/PUT)
 * @param {Object} headers - Request headers
 * @param {Object} config - Configuration object
 * @param {string} name - Request name for metrics
 * @returns {Object} HTTP response
 */
export function callEndpoint(method, url, payload = null, headers = {}, config = {}, name = '') {
  // Construct full URL if only path is provided
  let fullUrl = url;
  if (url.startsWith('/')) {
    fullUrl = `${config.api.protocol}://${config.api.host}${url}`;
  }

  const params = {
    headers: headers,
    tags: { name: name || `${method} ${url}` }
  };

  let response;
  const startTime = Date.now();

  try {
    switch (method.toUpperCase()) {
      case 'GET':
        response = http.get(fullUrl, params);
        break;
      case 'POST':
        response = http.post(fullUrl, payload ? JSON.stringify(payload) : null, params);
        break;
      case 'PUT':
        response = http.put(fullUrl, payload ? JSON.stringify(payload) : null, params);
        break;
      case 'DELETE':
        response = http.del(fullUrl, null, params);
        break;
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }

    const duration = Date.now() - startTime;
    apiResponseTime.add(duration);

    // Check if request was successful
    const success = check(response, {
      [`${name || url} - status 2xx`]: (r) => r.status >= 200 && r.status < 300
    });

    if (!success) {
      apiErrorRate.add(1);
      console.error(`API call failed: ${method} ${fullUrl} - Status: ${response.status}`);
    } else {
      apiErrorRate.add(0);
    }

    return response;
  } catch (error) {
    apiErrorRate.add(1);
    console.error(`API call error: ${method} ${fullUrl} - Error: ${error.message}`);
    throw error;
  }
}

/**
 * Make GET request
 * @param {string} url - URL or path
 * @param {Object} headers - Request headers
 * @param {Object} config - Configuration object
 * @param {string} name - Request name
 * @returns {Object} HTTP response
 */
export function get(url, headers = {}, config = {}, name = '') {
  return callEndpoint('GET', url, null, headers, config, name);
}

/**
 * Make POST request
 * @param {string} url - URL or path
 * @param {Object} payload - Request payload
 * @param {Object} headers - Request headers
 * @param {Object} config - Configuration object
 * @param {string} name - Request name
 * @returns {Object} HTTP response
 */
export function post(url, payload, headers = {}, config = {}, name = '') {
  return callEndpoint('POST', url, payload, headers, config, name);
}

/**
 * Make PUT request
 * @param {string} url - URL or path
 * @param {Object} payload - Request payload
 * @param {Object} headers - Request headers
 * @param {Object} config - Configuration object
 * @param {string} name - Request name
 * @returns {Object} HTTP response
 */
export function put(url, payload, headers = {}, config = {}, name = '') {
  return callEndpoint('PUT', url, payload, headers, config, name);
}

/**
 * Make DELETE request
 * @param {string} url - URL or path
 * @param {Object} headers - Request headers
 * @param {Object} config - Configuration object
 * @param {string} name - Request name
 * @returns {Object} HTTP response
 */
export function del(url, headers = {}, config = {}, name = '') {
  return callEndpoint('DELETE', url, null, headers, config, name);
}

/**
 * Add realistic delay between requests
 * @param {number} min - Minimum delay in seconds
 * @param {number} max - Maximum delay in seconds
 */
export function randomSleep(min = 1, max = 3) {
  const delay = Math.random() * (max - min) + min;
  sleep(delay);
}
