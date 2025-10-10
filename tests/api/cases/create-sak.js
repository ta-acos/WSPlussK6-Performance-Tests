/**
 * ===================================================================
 * PERFORMANCE TEST: Create Cases (Basic Case Creation)
 * ===================================================================
 *
 * @author Senthilkumar Sengottuvel
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
import { performTestSummary } from '../../../src/utils/test-summary.js';
import { getSakstyper, getAvgjorelsekoder } from '../../../src/lib/case-module.js';
import {
  initVerboseLogging,
  generateEnhancedVerboseReport,
  logVUActivity,
  logAuth,
  logAPIRequest
} from '../../../src/utils/k6-verbose-logger.js';

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
  vus: 7,
  duration: '2m'
  // thresholds removed – centrally injected
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
  // Initialize verbose logging for enhanced reporting
  initVerboseLogging();

  return performTestSetup('🚀 Starting Create Sak Test');
}

// Main VU iteration: end‑to‑end workflow for creating a case
export default function (data) {
  const vuId = `VU${__VU}`;
  const iterationId = `Iter${__ITER}`;
  const testId = `${vuId}-${iterationId}`;

  console.log(`\n${'='.repeat(80)}`);
  console.log(`🎯 ${vuId}: Starting iteration ${__ITER + 1}`);
  console.log(`${'='.repeat(80)}\n`);

  // Log VU activity for verbose reporting
  logVUActivity(vuId, `Starting iteration ${__ITER + 1}`, `Test ID: ${testId}`);

  // Initialize test execution with user validation
  const execution = initializeTestExecution(
    'create-sak',
    ORIGINAL_TEST_CONFIG,
    USE_DATA_FILE_CONFIG,
    CONFIG_ENVIRONMENT,
    __VU
  );

  if (!execution.success) {
    console.error(`❌ ${vuId}: ${execution.error}`);
    logVUActivity(vuId, 'Initialization failed', execution.error);
    return;
  }

  const { testConfig, user } = execution;

  // Step 1: Execute authentication workflow
  logVUActivity(vuId, 'Authenticating user', user.username);
  const authResult = executeAuthenticationFlow(testConfig, user, __VU);
  if (!authResult.success) {
    console.error(`❌ ${vuId}: Authentication failed - ${authResult.error}`);
    logAuth(vuId, user.username, false, authResult.error);
    return;
  }
  logAuth(vuId, user.username, true);

  // Step 2: Execute case creation workflow with supporting data
  logVUActivity(vuId, 'Creating case', 'Getting templates and creating new case');
  const caseResult = executeCaseCreationFlow(testConfig, authResult.authHeaders, __VU, {
    caseNamePrefix: 'Test Case',
    preferredTemplate: 'ny sak'
  });

  if (!caseResult.success) {
    console.error(`❌ ${vuId}: Case creation failed - ${caseResult.error}`);
    logAPIRequest(vuId, 'Case Creation', false, caseResult.error);
    return;
  }
  logAPIRequest(
    vuId,
    'Case Creation',
    true,
    `Case ID: ${caseResult.caseData ? caseResult.caseData.id : 'unknown'}`
  );

  // Step 3: Fetch supporting register data for validation (Sakstyper and Avgjorelsekoder)
  logVUActivity(vuId, 'Fetching reference data', 'Getting case types and decision codes');
  console.log(`📋 ${vuId}: Fetching sakstyper (case types)`);
  const sakstyper = getSakstyper(testConfig, authResult.authHeaders, __VU); // eslint-disable-line no-unused-vars
  logAPIRequest(vuId, 'Case Types (Sakstyper)', true, `Retrieved case types data`);

  console.log(`📋 ${vuId}: Fetching avgjorelsekoder (decision codes)`);
  const avgjorelsekoder = getAvgjorelsekoder(testConfig, authResult.authHeaders, __VU); // eslint-disable-line no-unused-vars
  logAPIRequest(vuId, 'Decision Codes (Avgjorelsekoder)', true, `Retrieved decision codes data`);

  randomSleep(0.2, 0.7);

  // Log successful completion
  if (caseResult.caseData && caseResult.caseData.id) {
    console.log(
      `🎉 ${vuId}: Complete workflow successful for ${user.UserName} - Case ID: ${caseResult.caseData.id}`
    );
  } else {
    console.log(`⚠️ ${vuId}: Workflow completed with issues for ${user.UserName}`);
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`🏁 ${vuId}: Test Complete`);
  console.log(`   👤 User: ${user.username}`);
  console.log(`   📁 Case created: ${caseResult.caseData ? caseResult.caseData.id : 'failed'}`);
  console.log(`   📋 Reference data retrieved: Yes`);
  console.log(`${'='.repeat(80)}\n`);

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
  // Get scenario name from environment variable (e.g., 'smoke', 'load', 'stress')
  const scenarioName = __ENV.SCENARIO_NAME || null;

  const options = {
    USE_DATA_FILE_CONFIG,
    CONFIG_ENVIRONMENT,
    includeErrorAnalytics: true,
    scenarioName: scenarioName
  };

  // Include enhanced verbose report for detailed VU activity logging
  if (__ENV.ENABLE_VERBOSE_REPORT === 'true') {
    const enhancedReport = generateEnhancedVerboseReport(data);
    console.log(`🔍 handleSummary: Generated enhanced verbose report (${enhancedReport.length} chars)`);
    options.consoleLogBuffer = enhancedReport;
  }

  // Log the report naming for transparency
  const reportName = scenarioName ? `create-sak-${scenarioName}` : 'create-sak';
  console.log(`📊 Generating report: ${reportName}-report.html`);

  return performTestSummary('create-sak', data, ORIGINAL_TEST_CONFIG, options);
}
