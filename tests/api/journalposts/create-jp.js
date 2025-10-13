/**
 * ===================================================================
 * PERFORMANCE TEST: Create Journal Posts (Basic Workflow)
 * ===================================================================
 *
 * @author Senthilkumar Sengottuvel
 *
 * WHAT THIS TEST DOES:
 * This test simulates users creating cases and then adding journal posts to them.
 * A journal post is like adding an email, phone call record, or document entry
 * to a case file. This is a simpler version that doesn't attach documents.
 *
 * TEST WORKFLOW STEPS:
 * 1. 🔐 Log in to the system (authenticate user)
 * 2. 📋 Get available case templates (what types of cases can be created)
 * 3. 📁 Create a new case using a template
 * 4. 📄 Get available journal post templates (types of journal entries)
 * 5. ✉️  Create a journal post in the case (like logging an email or call)
 *
 * WHY WE TEST THIS:
 * This tests the basic case + journal post workflow that users do frequently.
 * It's faster than the document attachment version, so good for testing
 * basic system performance under load.
 *
 * CONFIGURATION OPTIONS:
 *  - SCENARIO: Choose test intensity (smoke_test, load_test, stress_test)
 *
 * QUICK TEST COMMAND:
 *  k6 run tests/api/journalposts/create-jp.js --vus 1 --duration 10s
 */

import { group } from 'k6';
import { randomSleep } from '../../../src/utils/pacing.js';
import {
  generateK6Options,
  performTestSetup,
  initializeTestExecution,
  executeAuthenticationFlow,
  executeCaseCreationFlow
} from '../../../src/utils/test-workflow.js';
import { getJpTemplates, createJournalPost } from '../../../src/lib/jp-module.js';
import { generateJpTestData } from '../../../src/lib/payload-module.js';
// --- Auto classification flags (added 2025-10-10) ---
if (!__ENV.FLOW_TYPE) {
  __ENV.FLOW_TYPE = 'jp';
}
__ENV.JP_ENDPOINT_HIT = 'true';
import { validateTemplates } from '../../../src/utils/test-validation.js';
import { performSimpleTeardown } from '../../../src/utils/test-teardown.js';
import { performTestSummary } from '../../../src/utils/test-summary.js';
import {
  initVerboseLogging,
  generateEnhancedVerboseReport,
  logVUActivity,
  logAuth,
  logAPIRequest,
  logJPCreation
} from '../../../src/utils/k6-verbose-logger.js';

// ========================================
// CONFIGURATION SETTINGS
// ========================================
// Whether to load test settings from config files (autotest.json) or use built-in defaults
const USE_DATA_FILE_CONFIG = true;

// Which environment to test against (autotest, development, production, etc.)
const CONFIG_ENVIRONMENT = 'autotest';

// Override the test scenario if specified (smoke_test, load_test, stress_test, etc.)
// Usage: k6 run -e SCENARIO=load_test tests/create-jp.js
const SCENARIO_OVERRIDE = __ENV.SCENARIO || null;

// ========================================
// PERFORMANCE THRESHOLDS & TEST SETTINGS
// ========================================
// Backup settings used when config files are not available
const ORIGINAL_TEST_CONFIG = {
  vus: 5,
  duration: '10s'
  // thresholds removed – centrally injected
};

// Configuration is handled by workflow utilities

// Export k6 options - use workflow utility for configuration
export const options = generateK6Options(
  'create-jp',
  ORIGINAL_TEST_CONFIG,
  USE_DATA_FILE_CONFIG,
  CONFIG_ENVIRONMENT,
  SCENARIO_OVERRIDE
);

export function setup() {
  // Initialize verbose logging for enhanced reporting
  initVerboseLogging();

  return performTestSetup('🚀 Starting Create JP Test');
}

export default function createJournalPostTest(data) {
  const vuId = `VU${__VU}`;
  const iterationId = `Iter${__ITER}`;
  const testId = `${vuId}-${iterationId}`;

  console.log(`\n${'='.repeat(80)}`);
  console.log(`🎯 ${vuId}: Starting iteration ${__ITER + 1}`);
  console.log(`${'='.repeat(80)}\n`);

  // Log VU activity for verbose reporting
  logVUActivity(vuId, `Starting iteration ${__ITER + 1}`, `Test ID: ${testId}`);

  // Initialize test execution
  const { testConfig, user } = initializeTestExecution(
    'create-jp',
    ORIGINAL_TEST_CONFIG,
    USE_DATA_FILE_CONFIG,
    CONFIG_ENVIRONMENT,
    __VU
  );
  if (!testConfig || !user) return;

  // Step 1: Authentication
  logVUActivity(vuId, 'Authenticating user', user.username);
  const authResult = executeAuthenticationFlow(testConfig, user, __VU);
  if (!authResult || !authResult.success) {
    logAuth(vuId, user.username, false, 'Authentication flow failed');
    return;
  }
  logAuth(vuId, user.username, true);
  const authHeaders = authResult.authHeaders;

  // Step 2: Create Case
  logVUActivity(vuId, 'Creating new case', 'Getting case templates and creating case');
  const caseResult = executeCaseCreationFlow(testConfig, authHeaders, __VU);
  if (!caseResult || !caseResult.success) {
    logAPIRequest(vuId, 'Case Creation', false, 'Case creation flow failed');
    return;
  }

  const caseData = caseResult.caseData;
  logAPIRequest(vuId, 'Case Creation', true, `Case ID: ${caseData.id}`);

  // Step 3: Get JP templates for the created case
  logVUActivity(vuId, 'Getting JP templates', `For case ID: ${caseData.id}`);
  const jpTemplates = group('Get JP Templates', () => {
    return getJpTemplates(testConfig, authHeaders, caseData.id, __VU);
  });
  if (!validateTemplates(jpTemplates, 'JP', __VU)) {
    logAPIRequest(vuId, 'JP Templates', false, 'No valid JP templates found');
    return;
  }
  logAPIRequest(vuId, 'JP Templates', true, `Retrieved ${jpTemplates.length} templates`);

  // Step 4: Select and create journal post
  const outgoingTemplate = jpTemplates.find((t) => (t.tittel || '').toLowerCase().includes('utgående'));
  if (outgoingTemplate) {
    // Move outgoing template to front of array
    const idx = jpTemplates.indexOf(outgoingTemplate);
    if (idx > 0) jpTemplates.unshift(jpTemplates.splice(idx, 1)[0]);
  }
  console.log(`📄 ${vuId}: Using JP template: ${jpTemplates[0]?.tittel || 'Unknown'}`);

  logVUActivity(vuId, 'Creating journal post', `Using template: ${jpTemplates[0]?.tittel || 'Unknown'}`);

  // Generate JP test data and create journal post
  const jpTestData = generateJpTestData('PerfTestJP', vuId);
  const jpData = group('Create Journal Post', () => {
    return createJournalPost(testConfig, authHeaders, caseData.id, jpTemplates, jpTestData, __VU);
  });

  if (jpData && jpData.id) {
    console.log(`✅ ${vuId}: Successfully created JP "${jpTestData.jpName}" with ID: ${jpData.id}`);
    logJPCreation(vuId, jpTestData.jpName, jpData.id, 'Journal post created successfully');
  } else {
    console.warn(`⚠️ ${vuId}: JP creation completed but no ID returned`);
    logJPCreation(vuId, jpTestData.jpName, 'unknown', 'JP creation completed but no ID returned');
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`🏁 ${vuId}: Test Complete`);
  console.log(`   📝 Journal Post created: ${jpData && jpData.id ? 'Success' : 'Warning'}`);
  console.log(`${'='.repeat(80)}\n`);

  // Optional pacing between iterations
  randomSleep(testConfig);
}

export function teardown() {
  performSimpleTeardown('Create JP Modular');
}

/**
 * Rich summary artifacts (HTML, JSON, Markdown) produced for distribution.
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
  const reportName = scenarioName ? `create-jp-${scenarioName}` : 'create-jp';
  console.log(`📊 Generating report: ${reportName}-report.html`);

  return performTestSummary('create-jp', data, ORIGINAL_TEST_CONFIG, options);
}
