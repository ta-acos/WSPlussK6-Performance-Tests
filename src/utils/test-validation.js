/**
 * Reusable Test Validation Utilities
 * Centralizes common validation patterns used across K6 performance tests
 */

/**
 * Validates user data loaded from configuration
 * @param {Array} users - Array of user objects
 * @param {string} vuId - VU identifier for logging
 * @returns {boolean} - Returns true if validation passes
 */
export function validateUserData(users, vuId = '') {
  if (!users || !Array.isArray(users) || users.length === 0) {
    console.error('🔥 CRITICAL: No user data available from direct config load');
    console.error('🔍 TestConfig keys:', Object.keys(users || {}));
    return false;
  }
  return true;
}

/**
 * Validates individual user object for required fields
 * @param {Object} user - User configuration object
 * @param {string} vuId - VU identifier for logging
 * @param {number} userIndex - Index of user in array
 * @param {number} totalUsers - Total number of users available
 * @returns {boolean} - Returns true if validation passes
 */
export function validateUser(user, vuId, userIndex, totalUsers) {
  if (!user) {
    console.error(`🔥 CRITICAL: ${vuId}: User at index ${userIndex} is undefined/null`);
    console.error(`🔍 Available users: ${totalUsers}, UserIndex: ${userIndex}, __VU: ${__VU}`);
    return false;
  }

  if (!user.UserName || !user.ClientID || !user.ClientSecret) {
    console.error('🔥 USER CONFIGURATION VALIDATION FAILURE');
    console.error(`❌ ${vuId}: Invalid user configuration`);
    console.error(`🔍 User object:`, JSON.stringify(user, null, 2));
    console.error('💡 Tip: Check users-config.json has objects with userName/clientId/clientSecret');
    return false;
  }

  return true;
}

/**
 * Validates test configuration object
 * @param {Object} testConfig - Test configuration object
 * @param {string} vuId - VU identifier for logging
 * @returns {boolean} - Returns true if validation passes
 */
export function validateTestConfig(testConfig, vuId) {
  if (!testConfig || !testConfig.baseUrl) {
    console.error('🔥 CONFIGURATION VALIDATION FAILURE');
    console.error(`❌ ${vuId}: Missing configuration or baseUrl`);
    console.error(`🔍 Config keys:`, Object.keys(testConfig || {}));
    console.error('💡 Tip: Check configuration loading and websak-api-config.json file');
    return false;
  }

  if (!testConfig.apiConfig || !testConfig.apiConfig.endpoints) {
    console.error('🔥 API CONFIGURATION VALIDATION FAILURE');
    console.error(`❌ ${vuId}: Missing API configuration or endpoints`);
    console.error('💡 Tip: Check websak-api-config.json has required endpoint configurations');
    return false;
  }

  return true;
}

/**
 * Validates authentication result
 * @param {string} accessToken - Access token returned from authentication
 * @param {Object} user - User object that was authenticated
 * @param {string} vuId - VU identifier for logging
 * @returns {boolean} - Returns true if validation passes
 */
export function validateAuthentication(accessToken, user, vuId) {
  if (!accessToken) {
    console.error(`❌ ${vuId}: Terminating ${user.UserName} due to authentication failure`);
    return false;
  }
  return true;
}

/**
 * Validates templates array
 * @param {Array} templates - Array of template objects
 * @param {Object} user - User object for context
 * @param {string} vuId - VU identifier for logging
 * @param {string} templateType - Type of templates (e.g., 'case', 'JP')
 * @returns {boolean} - Returns true if validation passes
 */
export function validateTemplates(templates, user, vuId, templateType = 'templates') {
  if (!templates || templates.length === 0) {
    console.error(`❌ ${vuId}: No ${templateType} available for ${user.UserName} - terminating workflow`);
    return false;
  }
  return true;
}

/**
 * Validates case creation result
 * @param {Object} caseData - Case data returned from creation
 * @param {string} vuId - VU identifier for logging
 * @returns {boolean} - Returns true if validation passes
 */
export function validateCaseCreation(caseData, vuId) {
  if (!caseData || !caseData.id) {
    console.error(`❌ ${vuId}: Case creation failed`);
    return false;
  }
  return true;
}

/**
 * Validates journal post creation result
 * @param {Object} jpData - Journal post data returned from creation
 * @param {string} vuId - VU identifier for logging
 * @returns {boolean} - Returns true if validation passes
 */
export function validateJournalPostCreation(jpData, vuId) {
  if (!jpData || !jpData.id) {
    console.error(`❌ ${vuId}: Journal post creation failed`);
    return false;
  }
  return true;
}

/**
 * Logs validation failure troubleshooting guide
 * This provides centralized guidance for common validation failures
 */
export function logValidationTroubleshootingGuide() {
  console.log('\n📋 VALIDATION FAILURE TROUBLESHOOTING GUIDE:');
  console.log('\n--------------------------------------------------\n');
  console.log('🔥 If you saw validation failures during the test:');
  console.log('   • Authentication failures: Check OAuth2 credentials in users-config.json');
  console.log('   • Template failures: Verify user permissions and template availability');
  console.log('   • Case creation failures: Check API endpoints and payload format');
  console.log('   • Configuration failures: Verify websak-api-config.json settings');
  console.log('💡 All validation failures are logged with detailed context above');
  console.log('📖 Search for "VALIDATION FAILURE" in logs for specific error details');
  console.log('\n---------------------------------------------------\n');
}

/**
 * Generic error logger with consistent formatting
 * @param {string} vuId - VU identifier
 * @param {string} operation - Operation that failed
 * @param {string|Object} details - Error details or response
 */
export function logError(vuId, operation, details) {
  console.error(`❌ ${vuId}: ${operation} failed`);
  if (typeof details === 'string') {
    console.error(`📥 Details: ${details}`);
  } else if (details && typeof details === 'object') {
    console.error(`📥 Details:`, JSON.stringify(details, null, 2));
  }
}

/**
 * Generic warning logger with consistent formatting
 * @param {string} vuId - VU identifier
 * @param {string} message - Warning message
 */
export function logWarning(vuId, message) {
  console.log(`⚠️ ${vuId}: ${message}`);
}

/**
 * Generic info logger with consistent formatting
 * @param {string} vuId - VU identifier
 * @param {string} message - Info message
 */
export function logInfo(vuId, message) {
  console.log(`ℹ️ ${vuId}: ${message}`);
}
