/**
 * ===================================================================
 * TEST WORKFLOW UTILITIES MODULE
 * ===================================================================
 *
 * @author Senthilkumar Sengottuvel
 *
 * WHAT THIS MODULE DOES:
 * This module contains common workflow patterns that are used by multiple tests.
 * Instead of each test repeating the same setup and execution code, they can
 * use these standardized functions to ensure consistency and reduce duplication.
 *
 * MAIN CAPABILITIES:
 *
 * 1. 🔧 TEST SETUP & CONFIGURATION:
 *    - Loads test settings from config files or uses defaults
 *    - Sets up K6 test options (users, duration, thresholds)
 *    - Validates test configuration before running
 *
 * 2. 👤 USER MANAGEMENT:
 *    - Selects which test user each virtual user should simulate
 *    - Validates user credentials and data
 *    - Handles user rotation when more virtual users than test accounts
 *
 * 3. 🔐 AUTHENTICATION WORKFLOW:
 *    - Standardized login process across all tests
 *    - Creates authentication headers for API calls
 *    - Handles authentication failures consistently
 *
 * 4. 📋 TEMPLATE SELECTION:
 *    - Helper functions to find specific templates by name
 *    - Fallback logic when preferred templates aren't available
 *    - Consistent template handling across tests
 *
 * 5. 📁 CASE CREATION WORKFLOW:
 *    - Complete case creation process from template selection to creation
 *    - Handles template retrieval, data generation, and validation
 *    - Consistent error handling and logging
 *
 * WHY THIS MODULE EXISTS:
 * Without this module, every test would duplicate the same setup code, making
 * maintenance difficult and inconsistent. By centralizing common workflows,
 * we ensure all tests behave similarly and are easier to maintain.
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Instead of writing 50+ lines of setup code in each test:
 * const { testConfig, vuId, user, authHeaders } = initializeTestExecution(config);
 *
 * // Instead of writing complex case creation logic in each test:
 * const caseData = executeCaseCreationFlow(testConfig, authHeaders, vuId);
 * ```
 */

import { loadTestConfig, getK6Options, getK6OptionsWithScenarios } from '../lib/config-manager.js';
import { authenticate, createAuthHeaders } from '../lib/auth-module.js';
import { getTemplates, createCase } from '../lib/case-module.js';
import { generateCaseTestData } from '../lib/payload-module.js';
import {
  validateUserData,
  validateUser,
  validateTestConfig,
  validateAuthentication,
  validateTemplates,
  validateCaseCreation
} from './test-validation.js';
import { randomSleep } from './pacing.js';

// ========================================
// CONFIGURATION SETUP UTILITIES
// ========================================

/**
 * Create standardized test configuration with common defaults
 * @param {string} testName - Name of the test for logging and identification
 * @param {Object} originalConfig - Fallback configuration when data file config is disabled
 * @param {Object} options - Configuration options
 * @param {boolean} options.useDataFileConfig - Whether to use autotest.json config
 * @param {string} options.configEnvironment - Environment config identifier
 * @param {string} options.scenarioOverride - Override scenario from environment
 * @returns {Object} - Complete test configuration object
 */
export function createTestConfiguration(testName, originalConfig, options = {}) {
  const {
    useDataFileConfig = true,
    configEnvironment = 'autotest',
    scenarioOverride = __ENV.SCENARIO || null
  } = options;

  // Load configuration
  const config = loadTestConfig(testName, originalConfig, useDataFileConfig, configEnvironment);

  // Override VUs with user count for original behavior (when using original config)
  if (!useDataFileConfig) {
    config.vus = config.users.length || originalConfig.vus;
    originalConfig.vus = config.users.length;
  }

  return {
    config,
    useDataFileConfig,
    configEnvironment,
    scenarioOverride,
    originalConfig
  };
}

/**
 * Generate K6 options with scenario support
 * @param {string} testName - Test name identifier
 * @param {Object} originalTestConfig - Original test configuration
 * @param {boolean} useDataFileConfig - Whether to use data file config
 * @param {string} configEnvironment - Configuration environment
 * @param {Object} scenarioOverride - Scenario override options
 * @returns {Object} - K6 options object
 */
export function generateK6Options(
  testName,
  originalTestConfig,
  useDataFileConfig,
  configEnvironment,
  scenarioOverride
) {
  const testConfig = createTestConfiguration(
    testName,
    originalTestConfig,
    useDataFileConfig,
    configEnvironment
  );

  return testConfig.useDataFileConfig
    ? getK6OptionsWithScenarios(testConfig.config, scenarioOverride)
    : getK6Options(testConfig.config);
}

/**
 * Simple test setup function
 * @param {string} testTitle - Display title for the test
 * @returns {Object} - Setup metadata for use in teardown/summary
 */
export function performTestSetup(testTitle) {
  console.log(`🚀 Starting ${testTitle}`);
  console.log('� Test Configuration Summary:');

  return {
    testStarted: true,
    startTime: new Date()
  };
}

// ========================================
// USER MANAGEMENT UTILITIES
// ========================================

/**
 * Initialize test execution with user validation
 * @param {string} testName - Test name for configuration loading
 * @param {Object} originalConfig - Fallback configuration
 * @param {boolean} useDataFileConfig - Whether to use data file config
 * @param {string} configEnvironment - Configuration environment
 * @param {string} vuId - Virtual User ID
 * @returns {Object} - Test execution context with user and config
 */
export function initializeTestExecution(
  testName,
  originalConfig,
  useDataFileConfig,
  configEnvironment,
  vuId
) {
  // Load configuration directly in main function to avoid K6 SharedArray serialization issues
  const testConfig = loadTestConfig(testName, originalConfig, useDataFileConfig, configEnvironment);
  const users = testConfig.users;

  // Validate user data
  if (!validateUserData(users, vuId)) {
    return { success: false, error: 'User data validation failed' };
  }

  // Each VU gets a unique user from config (VU 1 = User 0, VU 2 = User 1, etc.)
  const userIndex = (__VU - 1) % users.length;
  const user = users[userIndex];

  // Early validation of user object
  if (!validateUser(user, vuId, userIndex, users.length)) {
    return { success: false, error: 'User validation failed' };
  }

  console.log(
    `🔄 ${vuId}: Starting workflow with user ${user.UserName || 'UNKNOWN'} (${user.ClientID || 'UNKNOWN'})`
  );

  // Validate test configuration
  if (!validateTestConfig(testConfig, vuId)) {
    return { success: false, error: 'Test configuration validation failed' };
  }

  return {
    success: true,
    testConfig,
    user,
    userIndex,
    vuId,
    users
  };
}

// ========================================
// TEMPLATE SELECTION UTILITIES
// ========================================

/**
 * Select template by name with fallback to first template
 * @param {Array} templates - Array of template objects
 * @param {string} preferredName - Preferred template name (case insensitive)
 * @param {string} vuId - Virtual User ID for logging
 * @returns {Object} - Selected template object
 */
export function selectTemplateByName(templates, preferredName, vuId = '') {
  if (!templates || templates.length === 0) {
    console.warn(`⚠️ ${vuId}: No templates available for selection`);
    return null;
  }

  const preferred = templates.find((t) => {
    const templateTitle = t.tittel || t.name || '';
    return templateTitle.toLowerCase().includes(preferredName.toLowerCase());
  });

  if (preferred) {
    console.log(`🎯 ${vuId}: Selected preferred template: "${preferred.tittel}" (ID: ${preferred.id})`);
    return preferred;
  }

  console.log(
    `🎯 ${vuId}: Preferred template "${preferredName}" not found, using first available: "${templates[0].tittel}" (ID: ${templates[0].id})`
  );
  return templates[0];
}

/**
 * Reorder template array to prioritize a specific template
 * @param {Array} templates - Array of template objects
 * @param {string} preferredName - Preferred template name (case insensitive)
 * @returns {Array} - Reordered templates array with preferred template first
 */
export function prioritizeTemplate(templates, preferredName) {
  if (!templates || templates.length === 0) {
    return templates;
  }

  const preferredTemplate = templates.find((t) =>
    (t.tittel || '').toLowerCase().includes(preferredName.toLowerCase())
  );

  if (preferredTemplate) {
    const idx = templates.indexOf(preferredTemplate);
    if (idx > 0) {
      // Move preferred template to front
      templates.unshift(templates.splice(idx, 1)[0]);
    }
  }

  return templates;
}

// ========================================
// WORKFLOW EXECUTION PATTERNS
// ========================================

/**
 * Execute authentication workflow with validation
 * @param {Object} testConfig - Test configuration object
 * @param {Object} user - User object with credentials
 * @param {string} vuId - Virtual User ID for logging
 * @returns {Object} - Authentication result with headers
 */
export function executeAuthenticationFlow(testConfig, user, vuId) {
  console.log(`🔐 ${vuId}: Authenticating user ${user.UserName}`);

  const accessToken = authenticate(testConfig, user, vuId);
  if (!validateAuthentication(accessToken, user, vuId)) {
    return { success: false, error: 'Authentication failed' };
  }

  const authHeaders = createAuthHeaders(accessToken);
  console.log(`✅ ${vuId}: Authentication successful for ${user.UserName}`);

  // Add pacing after authentication
  randomSleep(1, 3);

  return {
    success: true,
    accessToken,
    authHeaders
  };
}

/**
 * Execute case creation workflow with template selection and validation
 * @param {Object} testConfig - Test configuration object
 * @param {Object} authHeaders - Authentication headers
 * @param {string} vuId - Virtual User ID for logging
 * @param {Object} options - Case creation options
 * @param {string} options.caseNamePrefix - Prefix for case name generation
 * @param {string} options.preferredTemplate - Preferred template name
 * @param {Object} options.additionalData - Additional case creation data
 * @returns {Object} - Case creation result
 */
export function executeCaseCreationFlow(testConfig, authHeaders, vuId, options = {}) {
  const { caseNamePrefix = 'Test Case', preferredTemplate = 'ny sak', additionalData = null } = options;

  // Step 1: Get Case Templates
  console.log(`📋 ${vuId}: Retrieving available case templates`);
  const availableTemplates = getTemplates(testConfig, authHeaders, vuId);
  if (!validateTemplates(availableTemplates, { UserName: 'User' }, vuId, 'case templates')) {
    return { success: false, error: 'Failed to retrieve case templates' };
  }

  randomSleep(0.2, 0.7);

  // Step 2: Select preferred template
  const selectedTemplate = selectTemplateByName(availableTemplates, preferredTemplate, vuId);
  if (!selectedTemplate) {
    return { success: false, error: 'Failed to select case template' };
  }

  // Step 3: Generate test data
  const caseTestData = additionalData || generateCaseTestData(caseNamePrefix, vuId);

  // Step 4: Create case
  console.log(`📝 ${vuId}: Creating new case "${caseTestData.caseName}"`);
  const caseData = createCase(
    testConfig,
    authHeaders,
    availableTemplates,
    caseTestData,
    vuId,
    selectedTemplate
  );

  if (!validateCaseCreation(caseData, vuId)) {
    return { success: false, error: 'Case creation failed' };
  }

  console.log(`✅ ${vuId}: Case created successfully - ID: ${caseData.id}`);
  randomSleep(0.2, 0.7);

  return {
    success: true,
    caseData,
    selectedTemplate,
    caseTestData,
    availableTemplates
  };
}

/**
 * Execute complete case + JP creation workflow
 * @param {Object} testConfig - Test configuration object
 * @param {Object} authHeaders - Authentication headers
 * @param {string} vuId - Virtual User ID for logging
 * @param {Object} options - Workflow options
 * @returns {Object} - Complete workflow result
 */
export function executeCompleteWorkflow(testConfig, authHeaders, vuId, options = {}) {
  const { caseNamePrefix = 'PerfTestCase', preferredCaseTemplate = 'ny sak' } = options;

  // Execute case creation workflow
  const caseResult = executeCaseCreationFlow(testConfig, authHeaders, vuId, {
    caseNamePrefix,
    preferredTemplate: preferredCaseTemplate
  });

  if (!caseResult.success) {
    return { success: false, error: `Case creation failed: ${caseResult.error}` };
  }

  return {
    success: true,
    caseData: caseResult.caseData,
    selectedCaseTemplate: caseResult.selectedTemplate,
    caseTestData: caseResult.caseTestData
  };
}

// All functions are already exported individually above
