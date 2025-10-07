import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
export const apiErrorRate = new Rate('api_errors');
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
