/**
 * ===================================================================
 * PERFORMANCE TEST: Create Cases (Basic Case Creation)
 * ===================================================================
 *
 * WHAT THIS TEST DOES:
 * This test simulates users creating new cases in the case management system.
 * Think of this like creating a new case file for a client matter, incident,
 * or request that needs to be tracked and managed.
 *
 * TEST WORKFLOW STEPS:
 * 1. 🔐 Log in to the system (authenticate user)
 * 2. 📋 Get available case templates (what types of cases can be created)
 * 3. 📊 Get reference data (case types, decision codes, etc.)
 * 4. 📁 Create a new case using the selected template and data
 *
 * WHY WE TEST THIS:
 * Case creation is a fundamental operation in the system. This test measures
 * how fast cases can be created and whether the system can handle multiple
 * users creating cases simultaneously without performance degradation.
 *
 * BACKGROUND:
 * Originally converted from JMeter test (End_WebSak_Create_Sak.jmx)
 *
 * CONFIGURATION OPTIONS:
 *  - USE_DATA_FILE_CONFIG: true = use autotest.json, false = use built-in settings
 *  - SCENARIO: Choose test intensity (smoke_test, load_test, stress_test)
 *
 * QUICK TEST COMMAND:
 *  k6 run tests/api/cases/create-sak.js --vus 3 --duration 15s
 */

import { randomSleep } from '../../../src/utils/pacing.js';
import {
  generateK6Options,
  performTestSetup,
  initializeTestExecution,
  executeAuthenticationFlow,
  executeCaseCreationFlow
} from '../../../src/utils/test-workflow.js';
import { performSimpleTeardown } from '../../../src/utils/test-teardown.js';
import { performSimpleSummary } from '../../../src/utils/test-summary.js';
import { getSakstyper, getAvgjorelsekoder } from '../../../src/lib/case-module.js';

// ========================================
// CONFIGURATION SETTINGS
// ========================================
// These settings control how the test runs and where it gets its configuration

// Whether to load test settings from config files (autotest.json) or use built-in defaults
const USE_DATA_FILE_CONFIG = true;

// Which environment to test against (autotest, development, production, etc.)
const CONFIG_ENVIRONMENT = 'autotest';

// Override the test scenario if specified via command line: -e SCENARIO=smoke_test
const SCENARIO_OVERRIDE = __ENV.SCENARIO || null;

// ========================================
// PERFORMANCE THRESHOLDS & TEST SETTINGS
// ========================================
// Backup settings used when config files are not available (USE_DATA_FILE_CONFIG = false)
const ORIGINAL_TEST_CONFIG = {
  // Number of virtual users (will be adjusted based on available test users)
  vus: 7,

  // How long to run the test
  duration: '2m',

  // Performance thresholds - what response times are acceptable:
  thresholds: {
    http_req_duration: ['p(95)<3000'], // 95% of requests must complete within 3 seconds
    http_req_failed: ['rate<0.1'], // Allow 10% failures under load
    'group_duration{group:::Authentication}': ['p(95)<2000'],
    'group_duration{group:::Get Case Templates}': ['p(95)<2500'],
    'group_duration{group:::Create New Case}': ['p(95)<3000'],
    // Load testing metrics
    http_reqs: ['rate>2'] // Minimum 2 requests per second
  }
};

// Export K6 options with scenario support - using workflow utility
export const options = generateK6Options(
  'create-sak',
  ORIGINAL_TEST_CONFIG,
  USE_DATA_FILE_CONFIG,
  CONFIG_ENVIRONMENT,
  SCENARIO_OVERRIDE
);

/**
 * Test Setup
 */
export function setup() {
  return performTestSetup('🚀 Starting Create Sak LOAD TEST');
}

// Main VU iteration: end‑to‑end workflow for creating a case
export default function (data) {
  const vuId = __VU;

  // Initialize test execution with user validation
  const execution = initializeTestExecution(
    'create-sak',
    ORIGINAL_TEST_CONFIG,
    USE_DATA_FILE_CONFIG,
    CONFIG_ENVIRONMENT,
    vuId
  );

  if (!execution.success) {
    console.error(`❌ ${vuId}: ${execution.error}`);
    return;
  }

  const { testConfig, user } = execution;

  // Step 1: Execute authentication workflow
  const authResult = executeAuthenticationFlow(testConfig, user, vuId);
  if (!authResult.success) {
    console.error(`❌ ${vuId}: Authentication failed - ${authResult.error}`);
    return;
  }

  // Step 2: Execute case creation workflow with supporting data
  const caseResult = executeCaseCreationFlow(testConfig, authResult.authHeaders, vuId, {
    caseNamePrefix: 'Test Case',
    preferredTemplate: 'ny sak'
  });

  if (!caseResult.success) {
    console.error(`❌ ${vuId}: Case creation failed - ${caseResult.error}`);
    return;
  }

  // Step 3: Fetch supporting register data for validation (Sakstyper and Avgjorelsekoder)
  console.log(`📋 ${vuId}: Fetching sakstyper (case types)`);
  getSakstyper(testConfig, authResult.authHeaders, vuId);

  console.log(`📋 ${vuId}: Fetching avgjorelsekoder (decision codes)`);
  getAvgjorelsekoder(testConfig, authResult.authHeaders, vuId);

  randomSleep(0.2, 0.7);

  // Log successful completion
  if (caseResult.caseData && caseResult.caseData.id) {
    console.log(
      `🎉 ${vuId}: Complete workflow successful for ${user.UserName} - Case ID: ${caseResult.caseData.id}`
    );
  } else {
    console.log(`⚠️ ${vuId}: Workflow completed with issues for ${user.UserName}`);
  }

  randomSleep(0.2, 0.7);
}

// Teardown: high level log notes
export function teardown() {
  performSimpleTeardown('Create-Sak');
}

/**
 * Rich summary artifacts (HTML, JSON, Markdown)
 * HTML is generated via reusable generator in utils/report-generator.js
 */
export function handleSummary(data) {
  return performSimpleSummary('create-sak', data, ORIGINAL_TEST_CONFIG, {
    USE_DATA_FILE_CONFIG,
    CONFIG_ENVIRONMENT
  });
}
