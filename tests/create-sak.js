/**
 * Test: Create Case (Sak)
 * Scenario origin: Converted from JMeter (End_WebSak_Create_Sak.jmx)
 * Goal: Exercise authentication, template retrieval, register lookups and case creation.
 *
 * Flags:
 *  USE_DATA_FILE_CONFIG=true  -> use autotest.json scenarios & thresholds
 *  USE_DATA_FILE_CONFIG=false -> fall back to ORIGINAL_TEST_CONFIG below
 *
 * Quick run example:
 *  k6 run tests/create-sak.js --vus 3 --duration 15s
 */

import { sleep } from 'k6';
import { randomSleep } from '../utils/pacing.js';
import {
  loadTestConfig,
  getK6Options,
  getK6OptionsWithScenarios,
  getAvailableScenarios,
  printConfigSummary
} from '../utils/modules/config-manager.js';
import { authenticate, createAuthHeaders } from '../utils/modules/auth-module.js';
import {
  getTemplates,
  createCase,
  generateCaseTestData,
  getSakstyper,
  getAvgjorelsekoder
} from '../utils/modules/case-module.js';
import { generateHtmlReport } from '../utils/report-generator.js';
import { injectErrorAnalyticsIntoSummary } from '../utils/error-sampler.js';

// ========================================
// CONFIGURATION FLAGS - MODIFY THESE TO CONTROL BEHAVIOR
// ========================================
const USE_DATA_FILE_CONFIG = true; // Set to true to use autotest.json config
const CONFIG_ENVIRONMENT = 'autotest'; // Which config file to use when flag is true
const SCENARIO_OVERRIDE = __ENV.SCENARIO || null; // Override scenario via -e SCENARIO=smoke_test

// Original test configuration (used when USE_DATA_FILE_CONFIG = false)
const ORIGINAL_TEST_CONFIG = {
  // Dynamic VUs based on user config count - each user gets their own VU
  vus: 7, // Will be overridden by usersData.length when config loads
  duration: '2m', // Run for 2 minutes with full load

  thresholds: {
    http_req_duration: ['p(95)<3000'], // Relaxed for load test
    http_req_failed: ['rate<0.1'], // Allow 10% failures under load
    'group_duration{group:::Authentication}': ['p(95)<2000'],
    'group_duration{group:::Get Case Templates}': ['p(95)<2500'],
    'group_duration{group:::Create New Case}': ['p(95)<3000'],
    // Load testing metrics
    http_reqs: ['rate>2'] // Minimum 2 requests per second
  }
};

// Load configuration
const config = loadTestConfig('create-sak', ORIGINAL_TEST_CONFIG, USE_DATA_FILE_CONFIG, CONFIG_ENVIRONMENT);

// Override VUs with user count for original behavior (when using original config)
if (!USE_DATA_FILE_CONFIG) {
  config.vus = config.users.length; // Use all available users from user config
  ORIGINAL_TEST_CONFIG.vus = config.users.length;
}

// Export K6 options with scenario support
// Use scenario-based configuration when available, otherwise fall back to traditional options
export const options = USE_DATA_FILE_CONFIG
  ? getK6OptionsWithScenarios(config, SCENARIO_OVERRIDE)
  : getK6Options(config);

/**
 * Test Setup
 */
export function setup() {
  console.log('🚀 Starting Create Sak LOAD TEST ');
  printConfigSummary(config);

  if (!USE_DATA_FILE_CONFIG) {
    console.log('🔥 ORIGINAL LOAD TEST MODE ACTIVATED:');
    console.log(`⚡ Virtual Users: ${config.vus} (1 VU per configured user)`);
    console.log('🎯 Each user will run continuously with their own credentials');
  }

  // Return lightweight metadata (no SharedArray) for use in teardown/summary
  return {
    testStarted: true,
    configEnvironment: CONFIG_ENVIRONMENT,
    useDataFileConfig: USE_DATA_FILE_CONFIG,
    configSource: USE_DATA_FILE_CONFIG ? 'configFile' : 'inlineConfig',
    totalUsers: Array.isArray(config.users) ? config.users.length : 0,
    scenario: SCENARIO_OVERRIDE || config.activeScenario || ''
  };
}

// Main VU iteration: end‑to‑end workflow for creating a case
export default function (data) {
  // Instead of using serialized data from setup(), load config directly in main function
  // This avoids K6's SharedArray serialization issues
  const testConfig = loadTestConfig(
    'create-sak',
    ORIGINAL_TEST_CONFIG,
    USE_DATA_FILE_CONFIG,
    CONFIG_ENVIRONMENT
  );

  const users = testConfig.users;

  // Validate user data
  if (!users || !Array.isArray(users) || users.length === 0) {
    console.error('🔥 CRITICAL: No user data available from direct config load');
    console.error('🔍 TestConfig keys:', Object.keys(testConfig || {}));
    return;
  }

  // Each VU gets a unique user from config (VU 1 = User 0, VU 2 = User 1, etc.)
  const userIndex = (__VU - 1) % users.length;
  const user = users[userIndex];
  const vuId = `VU${__VU}`;

  // Generate unique test data for this iteration
  const testData = generateCaseTestData('Test Case', vuId);

  // Early validation of user object
  if (!user) {
    console.error(`🔥 CRITICAL: ${vuId}: User at index ${userIndex} is undefined/null`);
    console.error(`🔍 Available users: ${users.length}, UserIndex: ${userIndex}, __VU: ${__VU}`);
    return;
  }

  console.log(
    `🔄 ${vuId}: Starting workflow with user ${user.UserName || 'UNKNOWN'} (${user.ClientID || 'UNKNOWN'})`
  );

  // Pre-execution validation checks
  if (!user.UserName || !user.ClientID || !user.ClientSecret) {
    console.error('🔥 USER CONFIGURATION VALIDATION FAILURE');
    console.error(`❌ ${vuId}: Invalid user configuration`);
    console.error(`🔍 User object:`, JSON.stringify(user, null, 2));
    console.error('💡 Tip: Check users-config.json has objects with userName/clientId/clientSecret');
    return;
  }

  // Use testConfig (loaded directly) instead of setup data which can't serialize SharedArrays
  if (!testConfig || !testConfig.baseUrl) {
    console.error('🔥 CONFIGURATION VALIDATION FAILURE');
    console.error(`❌ ${vuId}: Missing configuration or baseUrl`);
    console.error(`🔍 Config keys:`, Object.keys(testConfig || {}));
    console.error('💡 Tip: Check configuration loading and websak-api-config.json file');
    return;
  }

  if (!testConfig.apiConfig || !testConfig.apiConfig.endpoints) {
    console.error('🔥 API CONFIGURATION VALIDATION FAILURE');
    console.error(`❌ ${vuId}: Missing API configuration or endpoints`);
    console.error('💡 Tip: Check websak-api-config.json has required endpoint configurations');
    return;
  }

  // Step 1: Authentication using modular approach
  const accessToken = authenticate(testConfig, user, vuId);
  if (!accessToken) {
    console.error(`❌ ${vuId}: Terminating ${user.UserName} due to authentication failure`);
    return;
  }

  // Create authenticated headers
  const authHeaders = createAuthHeaders(accessToken);

  // Pacing pause after authentication
  randomSleep(1, 3);

  // Step 2: Get Case Templates using modular approach
  const availableTemplates = getTemplates(testConfig, authHeaders, vuId);
  if (availableTemplates.length === 0) {
    console.error(`❌ ${vuId}: No templates available for ${user.UserName} - terminating workflow`);
    return;
  }

  randomSleep(0.2, 0.7);

  // Step 3: Fetch Sakstyper (Case Types) for ID resolution
  const sakstyper = getSakstyper(testConfig, authHeaders, vuId);

  // Step 4: Fetch Avgjorelsekoder (Decision Codes) for ID resolution
  const avgjorelsekoder = getAvgjorelsekoder(testConfig, authHeaders, vuId);

  randomSleep(0.2, 0.7);

  // Step 5: Create New Case using modular approach with resolved IDs
  const caseData = createCase(
    testConfig,
    authHeaders,
    availableTemplates,
    testData,
    vuId,
    sakstyper,
    avgjorelsekoder
  );

  if (caseData && caseData.id) {
    console.log(`🎉 ${vuId}: Complete workflow successful for ${user.UserName} - Case ID: ${caseData.id}`);
  } else {
    console.log(`⚠️ ${vuId}: Workflow completed with issues for ${user.UserName}`);
  }

  randomSleep(0.2, 0.7);
}

// Teardown: high level log notes
export function teardown(data) {
  console.log('🏁 Create-Sak LOAD TEST completed!');
  const cfgEnv = data?.configEnvironment || CONFIG_ENVIRONMENT;
  const cfgSource =
    data?.configSource || (data?.useDataFileConfig ? 'Performance Test Data File' : 'inlineConfig');
  const totalUsers = data?.totalUsers ?? (Array.isArray(config.users) ? config.users.length : 'n/a');
  const scenarioName = data?.scenario || SCENARIO_OVERRIDE || 'n/a';
  console.log(`📈 Configuration used: ${cfgSource} (${cfgEnv})`);
  console.log(`📈 Scenario: ${scenarioName}`);
  console.log(`📈 Total users tested: ${totalUsers}`);
  console.log('📊 Check the metrics above for performance results');

  if (!USE_DATA_FILE_CONFIG) {
    console.log('ℹ️  Each user ran with their own credentials from users-config.json');
  }

  // Log validation failure guidance
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
 * Rich summary artifacts (HTML, JSON, Markdown)
 * HTML is generated via reusable generator in utils/report-generator.js
 */
export function handleSummary(data) {
  // Attach error sampling data (if any)
  try {
    injectErrorAnalyticsIntoSummary(data);
  } catch (e) {
    /* no-op */
  }
  const m = data.metrics || {};
  const dur = m.http_req_duration?.values || {};
  const checks = m.checks?.values || {};
  const failedRate = m.http_req_failed?.values?.rate || 0;
  const totalReqs = m.http_reqs?.values?.count || 0;
  const passChecks = checks.passes || 0;
  const failChecks = checks.fails || 0;
  const runSecs = (data.state?.testRunDurationMs || 0) / 1000;
  // Markdown summary intentionally disabled (user request to avoid .md artifact)

  const apdexEnv = __ENV.APDex_T || __ENV.APDEX_T; // allow both spellings
  const apdexT = apdexEnv ? parseInt(apdexEnv, 10) : 500;
  // Auto-load baseline (best-effort): look for latest previous summary JSON in reports excluding current run
  let baseline = null;
  try {
    if (typeof __ENV !== 'undefined') {
      // k6 JS runtime does not provide fs, so baseline must be injected externally or via options.
      // Allow passing BASELINE_JSON (stringified) through env.
      if (__ENV.BASELINE_JSON) {
        baseline = JSON.parse(__ENV.BASELINE_JSON);
      }
    }
  } catch (e) {
    console.error('⚠️ Failed to parse baseline JSON from env BASELINE_JSON:', e.message);
  }

  if (baseline) {
    data.baseline = baseline; // attach for report generator
  }

  const html = generateHtmlReport(data, { apdexT });

  return {
    'reports/create-sak-summary.json': JSON.stringify(data, null, 2),
    'reports/create-sak-report.html': html,
    stdout: '' // keep console summary clean (k6 still prints its default)
  };
}
