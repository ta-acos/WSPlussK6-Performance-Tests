/**
 * ===================================================================
 * PERFORMANCE TEST: Create Journal Posts with Multiple Documents
 * ===================================================================
 *
 * @author Senthilkumar Sengottuvel
 *
 * WHAT THIS TEST DOES:
 * This test simulates a real user creating a case, then creating a journal post
 * (like an email or document entry), and then attaching multiple files to it.
 * Think of it like someone logging an email into a case management system and
 * attaching several documents to that email entry.
 *
 * TEST WORKFLOW STEPS:
 * 1. 🔐 Log in to the system (authenticate user)
 * 2. 📋 Get available case templates (what types of cases can be created)
 * 3. 📁 Create a new case using a template
 * 4. 📄 Get available journal post templates (types of journal entries)
 * 5. ✉️  Create a journal post in the case (like logging an email)
 * 6. 📎 Attach multiple documents to the journal post
 * 7. ✅ Verify that all documents were successfully attached
 *
 * WHY WE TEST THIS:
 * This tests the complete workflow that users do daily. We measure how fast
 * the system responds when users create cases and attach documents, especially
 * when many users do this at the same time.
 *
 * CONFIGURATION OPTIONS (Environment Variables):
 *  - SCENARIO: Choose test intensity (smoke_test=quick, load_test=normal, stress_test=heavy)
 *  - DOC_COUNT: How many documents to attach per journal post (default: 3)
 *  - ENABLE_JP_ATTACH: Whether to actually attach documents (true/false)
 *  - USE_BATCH_UPLOAD: Upload all documents at once vs one-by-one (faster when true)
 *  - APDEX_T: Performance threshold in milliseconds for "satisfied" response times
 *
 * QUICK TEST COMMAND:
 *  k6 run tests/api/journalposts/create-jp-with-multiple-document.js --vus 1 --duration 10s
 *
 * EXAMPLE RESULTS:
 * - Response times for each step (login, create case, attach documents)
 * - Success/failure rates
 * - How many operations completed per second
 * - Performance metrics compared to acceptable thresholds
 */

import { randomSleep } from '../../../src/utils/pacing.js';
import {
  loadTestConfig,
  getK6Options,
  getK6OptionsWithScenarios,
  printConfigSummary
} from '../../../src/lib/config-manager.js';
import { authenticate, createAuthHeaders } from '../../../src/lib/auth-module.js';
import { getTemplates as getCaseTemplates, createCase } from '../../../src/lib/case-module.js';
import { getJpTemplates, createJournalPost } from '../../../src/lib/jp-module.js';
import { generateCaseTestData, generateJpTestData } from '../../../src/lib/payload-module.js';
// --- Auto classification flags (added 2025-10-10) ---
if (!__ENV.FLOW_TYPE) {
  __ENV.FLOW_TYPE = 'jp';
}
__ENV.JP_ENDPOINT_HIT = 'true';
import {
  validateUserData,
  validateUser,
  validateAuthentication,
  validateTemplates,
  validateCaseCreation
} from '../../../src/utils/test-validation.js';
import { performSimpleTeardown } from '../../../src/utils/test-teardown.js';
import { performTestSummary } from '../../../src/utils/test-summary.js';
import {
  preloadExternalFiles,
  attachDocumentsWithVerification
} from '../../../src/utils/document-attachment.js';
import {
  initVerboseLogging,
  generateEnhancedVerboseReport,
  logVUActivity,
  logAuth,
  logAPIRequest,
  logJPCreation,
  logDocumentAttachment
} from '../../../src/utils/k6-verbose-logger.js';

// ========================================
// CONFIGURATION SETTINGS
// ========================================
// These settings control how the test runs. You can change them by setting
// environment variables when running the test.

// Whether to load test settings from config files (autotest.json) or use built-in defaults
const USE_DATA_FILE_CONFIG = true;

// Which environment to test against (autotest, development, production, etc.)
const CONFIG_ENVIRONMENT = 'autotest';

// Override the test scenario if specified (smoke_test, load_test, stress_test, etc.)
const SCENARIO_OVERRIDE = __ENV.SCENARIO || null;

// How many documents to attach to each journal post (default: 3 documents)
// You can change this by setting DOC_COUNT=5 when running the test
const DOC_COUNT = parseInt(__ENV.DOC_COUNT || __ENV.DOCUMENTS || '3', 10) || 3;

// Whether to actually attach documents or skip that step (useful for testing without documents)
const ENABLE_ATTACH = (__ENV.ENABLE_JP_ATTACH || 'true').toLowerCase() === 'true';

// If you want to use specific files instead of generated test documents,
// list them here separated by commas (e.g., DOC_FILES="file1.pdf,file2.docx")
const RAW_DOC_FILES = (__ENV.DOC_FILES || '')
  .split(',')
  .map((p) => p.trim())
  .filter(Boolean);

// How to handle the document files: 'base64' (binary files) or 'text' (text files)
const DOC_FILE_MODE = (__ENV.DOC_FILE_MODE || 'base64').toLowerCase();

// Whether to reuse the same document files for multiple attachments
const DOC_FILE_REPEAT = (__ENV.DOC_FILE_REPEAT || 'true').toLowerCase() === 'true';

// ========================================
// PERFORMANCE THRESHOLDS & TEST SETTINGS
// ========================================
// These are the backup settings used when config files are not available.
// These define what we consider "acceptable" performance for each operation.

const ORIGINAL_TEST_CONFIG = {
  vus: 5,
  duration: '10s'
  // thresholds removed – now centrally generated from performance-thresholds.json
};

// ========================================
// LOAD TEST CONFIGURATION
// ========================================
// This section loads the test configuration from files or uses the defaults above

const config = loadTestConfig(
  'create-jp-with-multiple-document', // Test name for identification
  ORIGINAL_TEST_CONFIG, // Fallback settings if config files not found
  USE_DATA_FILE_CONFIG, // Whether to try loading from config files
  CONFIG_ENVIRONMENT // Which environment config to use (autotest, dev, etc.)
);

// If not using config files, adjust user count based on available test users
if (!USE_DATA_FILE_CONFIG) {
  ORIGINAL_TEST_CONFIG.vus = config.users.length || ORIGINAL_TEST_CONFIG.vus;
  config.vus = ORIGINAL_TEST_CONFIG.vus;
}

// Export K6 test options - this tells K6 how to run the test
// (how many users, for how long, what performance thresholds to check)
export const options = USE_DATA_FILE_CONFIG
  ? getK6OptionsWithScenarios(config, SCENARIO_OVERRIDE) // Use predefined test scenarios
  : getK6Options(config); // Use simple configuration

// ========================================
// TEST SETUP FUNCTION
// ========================================
// This runs once at the start of the test to prepare everything
export function setup() {
  // Initialize verbose logging for enhanced reporting
  initVerboseLogging();

  console.log('🚀 Starting Create JP with Multiple Documents Test');
  console.log(`📎 Documents per JP: ${DOC_COUNT}`);
  printConfigSummary(config);
  return { started: true };
}

// ========================================
// DOCUMENT PREPARATION
// ========================================
// If specific document files were provided, load them now (before the test starts)
// This happens once and reuses the same documents for all test iterations
const preloadedFileAttachments = preloadExternalFiles(RAW_DOC_FILES, {
  mode: DOC_FILE_MODE, // How to read files (base64 for binary, text for text files)
  allowRepeat: DOC_FILE_REPEAT // Whether to reuse files if we need more than available
});

// ========================================
// MAIN TEST FUNCTION
// ========================================
// This is the main test that runs for each virtual user.
// Each "iteration" of this function represents one user going through
// the complete workflow: login -> create case -> create journal post -> attach documents
export default function () {
  // Get the test configuration and user list
  const testConfig = config;
  const users = testConfig.users;

  // Create a unique identifier for this virtual user (for logging purposes)
  const vuId = `VU${__VU}`;
  const iterationId = `Iter${__ITER}`;
  const testId = `${vuId}-${iterationId}`;

  console.log(`\n${'='.repeat(80)}`);
  console.log(`🎯 ${vuId}: Starting iteration ${__ITER + 1}`);
  console.log(`${'='.repeat(80)}\n`);

  // Log VU activity for verbose reporting
  logVUActivity(vuId, `Starting iteration ${__ITER + 1}`, `Test ID: ${testId}`);

  // ========================================
  // STEP 1: VALIDATE USER DATA
  // ========================================
  // Make sure we have test users configured
  if (!validateUserData(users, vuId)) {
    return; // Stop if no users available
  }

  // Select which test user this virtual user will simulate
  const userIndex = (__VU - 1) % users.length;
  const user = users[userIndex];

  // Validate the selected user has required information (username, password, etc.)
  if (!validateUser(user, vuId, userIndex, users.length)) {
    return; // Stop if user data is invalid
  }

  // ========================================
  // STEP 2: USER LOGIN (AUTHENTICATION)
  // ========================================
  // Simulate a user logging into the system
  logVUActivity(vuId, 'Authenticating user', user.username);
  console.log(`🔐 ${vuId}: Attempting login for user ${user.username}`);
  const accessToken = authenticate(testConfig, user, vuId);
  if (!validateAuthentication(accessToken, user, vuId)) {
    logAuth(vuId, user.username, false, 'Authentication validation failed');
    return; // Stop if login failed
  }

  // Create authorization headers for API calls (like a session cookie)
  const authHeaders = createAuthHeaders(accessToken);
  console.log(`✅ ${vuId}: Successfully logged in`);
  logAuth(vuId, user.username, true);

  // ========================================
  // STEP 3: GET AVAILABLE CASE TEMPLATES
  // ========================================
  // Get the list of case types that the user can create
  logVUActivity(vuId, 'Retrieving case templates', 'Getting available case templates');
  console.log(`📋 ${vuId}: Getting available case templates`);
  const caseTemplates = getCaseTemplates(testConfig, authHeaders, vuId);
  if (!validateTemplates(caseTemplates, user, vuId, 'case templates')) {
    logAPIRequest(vuId, 'Case Templates', false, 'No valid case templates found');
    return; // Stop if no case templates available
  }

  // Choose which case template to use (prefer "Ny sak" if available, otherwise use first one)
  const nySakTemplate = caseTemplates.find((t) => (t.tittel || '').toLowerCase() === 'ny sak');
  const selectedCaseTemplate = nySakTemplate || caseTemplates[0];
  console.log(`📋 ${vuId}: Using case template: ${selectedCaseTemplate.tittel || 'Unknown'}`);
  logAPIRequest(
    vuId,
    'Case Templates',
    true,
    `Retrieved ${caseTemplates.length} templates, using: ${selectedCaseTemplate.tittel}`
  );

  // ========================================
  // STEP 4: CREATE A NEW CASE
  // ========================================
  // Generate test data for the case and create it
  logVUActivity(vuId, 'Creating new case', `Using template: ${selectedCaseTemplate.tittel}`);
  console.log(`📁 ${vuId}: Creating new case`);
  const caseTestData = generateCaseTestData('PerfTestCaseMultiDoc', vuId);
  const caseData = createCase(
    testConfig,
    authHeaders,
    caseTemplates,
    caseTestData,
    vuId,
    selectedCaseTemplate
  );
  if (!validateCaseCreation(caseData, vuId)) {
    logAPIRequest(vuId, 'Case Creation', false, 'Case creation validation failed');
    return; // Stop if case creation failed
  }
  console.log(`✅ ${vuId}: Case created with ID: ${caseData.id}`);
  logAPIRequest(vuId, 'Case Creation', true, `Case ID: ${caseData.id}`);

  // ========================================
  // STEP 5: GET JOURNAL POST TEMPLATES
  // ========================================
  // Get the types of journal posts (document entries) that can be created in this case
  logVUActivity(vuId, 'Getting JP templates', `For case ID: ${caseData.id}`);
  console.log(`📄 ${vuId}: Getting journal post templates for case ${caseData.id}`);
  const jpTemplates = getJpTemplates(testConfig, authHeaders, caseData.id, vuId);
  if (!validateTemplates(jpTemplates, user, vuId, 'JP templates')) {
    logAPIRequest(vuId, 'JP Templates', false, 'No valid JP templates found');
    return; // Stop if no journal post templates available
  }

  // Choose which journal post template to use (prefer "utgående" for outgoing documents)
  const outgoingTemplate = jpTemplates.find((t) => (t.tittel || '').toLowerCase().includes('utgående'));
  if (outgoingTemplate) {
    // Move the preferred template to the front of the list
    const idx = jpTemplates.indexOf(outgoingTemplate);
    if (idx > 0) jpTemplates.unshift(jpTemplates.splice(idx, 1)[0]);
  }
  console.log(`📄 ${vuId}: Using JP template: ${jpTemplates[0]?.tittel || 'Unknown'}`);
  logAPIRequest(
    vuId,
    'JP Templates',
    true,
    `Retrieved ${jpTemplates.length} templates, using: ${jpTemplates[0]?.tittel}`
  );

  // ========================================
  // STEP 6: CREATE JOURNAL POST
  // ========================================
  // Generate test data for the journal post and create it
  logVUActivity(
    vuId,
    'Creating journal post',
    `In case ${caseData.id} using template: ${jpTemplates[0]?.tittel}`
  );
  console.log(`✉️ ${vuId}: Creating journal post in case ${caseData.id}`);
  const jpTestData = generateJpTestData('PerfTestJP-MultiDoc', vuId);
  const jpData = createJournalPost(testConfig, authHeaders, caseData.id, jpTemplates, jpTestData, vuId);

  // Verify the journal post was created successfully
  if (!jpData || !jpData.id) {
    console.warn(`⚠️ ${vuId}: JP creation returned no ID - skipping document attachments`);
    logJPCreation(vuId, jpTestData.jpName, 'unknown', 'JP creation returned no ID');
    randomSleep(0.3, 1.1); // Small delay before ending
    return;
  }
  console.log(`✅ ${vuId}: Journal post created with ID: ${jpData.id}`);
  logJPCreation(vuId, jpTestData.jpName, jpData.id, 'Journal post created successfully');

  // ========================================
  // STEP 7: ATTACH DOCUMENTS TO JOURNAL POST
  // ========================================
  // Now attach multiple documents to the journal post and verify they were attached correctly
  const USE_BATCH_UPLOAD = (__ENV.USE_BATCH_UPLOAD || 'true').toLowerCase() === 'true';

  logVUActivity(
    vuId,
    'Attaching documents',
    `${DOC_COUNT} documents to JP ${jpData.id} via ${USE_BATCH_UPLOAD ? 'batch' : 'individual'} upload`
  );
  console.log(`📎 ${vuId}: Starting document attachment process (${DOC_COUNT} documents)`);
  console.log(`📎 ${vuId}: Upload mode: ${USE_BATCH_UPLOAD ? 'batch' : 'individual'}`);

  // This function handles the complete workflow: attach documents + verify they're there
  const attachResult = attachDocumentsWithVerification(testConfig, authHeaders, jpData.id, {
    documentCount: DOC_COUNT, // How many documents to attach
    useBatchUpload: USE_BATCH_UPLOAD, // Upload all at once vs one-by-one
    preloadedDocuments: preloadedFileAttachments, // Use specific files if provided
    useRealDocuments: preloadedFileAttachments.length > 0, // Whether to use real files or generate test files
    baseName: jpTestData.documentName.replace('.txt', ''), // Base name for generated test documents
    jpType: 'Incoming', // Type of journal post (Incoming/Outgoing)
    vuId: vuId, // Virtual user ID for logging
    testMeta: { testId: jpTestData.testId, vuId }, // Additional metadata for tracking
    enableAttachment: ENABLE_ATTACH, // Whether to actually attach documents
    enableVerification: true, // Whether to verify documents were attached
    verificationDelay: 0.5 // Wait time before checking (0.5 seconds)
  });

  // Log document attachment results
  if (attachResult && attachResult.success !== false) {
    logDocumentAttachment(
      vuId,
      jpData.id,
      DOC_COUNT,
      `Documents attached successfully via ${USE_BATCH_UPLOAD ? 'batch' : 'individual'} upload`
    );
  } else {
    logDocumentAttachment(vuId, jpData.id, 0, 'Document attachment failed or was disabled');
  }

  console.log(`✅ ${vuId}: Completed full workflow - case + journal post + ${DOC_COUNT} documents`);

  console.log(`\n${'='.repeat(80)}`);
  console.log(`🏁 ${vuId}: Test Complete`);
  console.log(`   📁 Case created: ${caseData.id}`);
  console.log(`   📝 Journal post created: ${jpData.id}`);
  console.log(`   📎 Documents attached: ${DOC_COUNT}`);
  console.log(`${'='.repeat(80)}\n`);

  // Add a small random delay between iterations to simulate real user behavior
  randomSleep(0.3, 1.1);
}

// ========================================
// TEST CLEANUP FUNCTIONS
// ========================================

/**
 * TEARDOWN FUNCTION
 * This runs once at the end of the test to clean up and log final results
 */
export function teardown() {
  performSimpleTeardown('Create JP with Multiple Documents');
}

/**
 * SUMMARY FUNCTION
 * This processes the test results and generates reports (HTML dashboard, JSON metrics)
 * It runs after all test iterations are complete and creates performance reports
 * that show response times, success rates, and whether performance thresholds were met.
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
  const reportName = scenarioName
    ? `create-jp-with-multiple-document-${scenarioName}`
    : 'create-jp-with-multiple-document';
  console.log(`📊 Generating report: ${reportName}-report.html`);

  return performTestSummary('create-jp-with-multiple-document', data, ORIGINAL_TEST_CONFIG, options);
}
