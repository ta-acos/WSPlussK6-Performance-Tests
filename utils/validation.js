/**
 * Data Validation Utilities for K6 Tests
 *
 * This module provides validation functions for test data and responses
 */

import { check } from 'k6';

/**
 * Validate CSV data structure
 * @param {Array} data - CSV data array
 * @param {Array} requiredFields - Required field names
 * @param {string} fileName - CSV file name for error reporting
 * @returns {boolean} Validation result
 */
export function validateCSVData(data, requiredFields, fileName = 'CSV') {
  if (!Array.isArray(data)) {
    console.error(`${fileName}: Data is not an array`);
    return false;
  }

  if (data.length === 0) {
    console.error(`${fileName}: No data rows found`);
    return false;
  }

  // Check if all required fields exist in the first row
  const firstRow = data[0];
  for (const field of requiredFields) {
    if (!(field in firstRow)) {
      console.error(`${fileName}: Missing required field '${field}'`);
      return false;
    }
  }

  // Check for empty required fields
  let invalidRows = 0;
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    for (const field of requiredFields) {
      if (!row[field] || row[field].trim() === '') {
        console.warn(`${fileName}: Row ${i + 1} has empty value for '${field}'`);
        invalidRows++;
      }
    }
  }

  if (invalidRows > 0) {
    console.warn(`${fileName}: Found ${invalidRows} rows with empty required fields`);
  }

  console.log(`${fileName}: Validation successful - ${data.length} rows loaded`);
  return true;
}

/**
 * Validate user data from users-config.json
 * @param {Array} users - Users array
 * @returns {boolean} Validation result
 */
export function validateUsers(users) {
  const requiredFields = ['UserName', 'ClientID', 'ClientSecret'];
  return validateCSVData(users, requiredFields, 'users-config.json');
}

/**
 * Validate API info structure (legacy helper retained for compatibility)
 * @param {Array} apiInfo - API info array
 * @returns {boolean} Validation result
 */
export function validateAPIInfo(apiInfo) {
  // In JSON mode this may not be used; keep minimal structural check for backward compatibility
  if (!apiInfo || typeof apiInfo !== 'object') {
    console.error('API config validation failed: expected object');
    return false;
  }
  return true;
}

/**
 * Validate HTTP response with common checks
 * @param {Object} response - HTTP response object
 * @param {string} operationName - Name of the operation for error reporting
 * @param {number} expectedStatus - Expected HTTP status code (default: 200)
 * @returns {boolean} Validation result
 */
export function validateResponse(response, operationName, expectedStatus = 200) {
  return check(response, {
    [`${operationName} - status ${expectedStatus}`]: (r) => r.status === expectedStatus,
    [`${operationName} - response time < 5s`]: (r) => r.timings.duration < 5000,
    [`${operationName} - has response body`]: (r) => r.body && r.body.length > 0
  });
}

/**
 * Validate JSON response structure
 * @param {Object} response - HTTP response object
 * @param {string} operationName - Name of the operation
 * @param {Array} requiredFields - Required fields in JSON response
 * @returns {boolean} Validation result
 */
export function validateJSONResponse(response, operationName, requiredFields = []) {
  const basicValidation = validateResponse(response, operationName);

  if (!basicValidation) {
    return false;
  }

  try {
    const jsonData = response.json();

    const jsonValidation = check(response, {
      [`${operationName} - valid JSON`]: () => jsonData !== null && typeof jsonData === 'object'
    });

    if (requiredFields.length > 0) {
      const fieldValidation = check(response, {
        [`${operationName} - has required fields`]: () => {
          return requiredFields.every((field) => {
            const hasField = field in jsonData;
            if (!hasField) {
              console.warn(`${operationName}: Missing field '${field}' in response`);
            }
            return hasField;
          });
        }
      });

      return jsonValidation && fieldValidation;
    }

    return jsonValidation;
  } catch (error) {
    console.error(`${operationName}: JSON parsing error - ${error.message}`);
    return false;
  }
}

/**
 * Validate authentication token
 * @param {string} token - Authentication token
 * @param {string} user - User identifier for error reporting
 * @returns {boolean} Validation result
 */
export function validateAuthToken(token, user = 'unknown') {
  if (!token || typeof token !== 'string' || token.trim() === '') {
    console.error(`Authentication failed for user ${user}: Invalid token`);
    return false;
  }

  if (token.length < 10) {
    console.error(`Authentication failed for user ${user}: Token too short`);
    return false;
  }

  console.log(`Authentication successful for user ${user}`);
  return true;
}

/**
 * Log test execution summary
 * @param {string} testName - Name of the test
 * @param {number} vuId - Virtual User ID
 * @param {Object} metrics - Test metrics object
 */
export function logTestSummary(testName, vuId, metrics = {}) {
  console.log(`=== Test Summary: ${testName} (VU ${vuId}) ===`);

  if (metrics.requests) {
    console.log(`Total Requests: ${metrics.requests}`);
  }

  if (metrics.successful) {
    console.log(`Successful Requests: ${metrics.successful}`);
  }

  if (metrics.failed) {
    console.log(`Failed Requests: ${metrics.failed}`);
  }

  if (metrics.averageResponseTime) {
    console.log(`Average Response Time: ${metrics.averageResponseTime}ms`);
  }

  console.log('=====================================');
}

/**
 * Generate test data with validation
 * @param {string} prefix - Prefix for generated data
 * @param {number} length - Length of random part
 * @returns {Object} Generated test data
 */
export function generateValidTestData(prefix = 'Test', length = 8) {
  const randomString = generateRandomString(length);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  return {
    id: `${prefix}-${randomString}`,
    title: `${prefix} Title ${randomString}`,
    description: `${prefix} description generated at ${timestamp}`,
    timestamp: timestamp,
    randomString: randomString
  };
}

/**
 * Generate random alphanumeric string
 * @param {number} length - String length
 * @returns {string} Random string
 */
export function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
