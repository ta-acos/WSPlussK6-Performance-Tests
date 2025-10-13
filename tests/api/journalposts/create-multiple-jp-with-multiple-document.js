/**
 * ===================================================================
 * PERFORMANCE TEST: Create Multiple Journal Posts (Incoming & Outgoing) with Documents
 * ===================================================================
 *
 * @author Senthilkumar Sengottuvel
 *
 * WHAT THIS TEST DOES:
 * This test simulates a complex business workflow where users create cases and then
 * add multiple journal posts (both incoming and outgoing) with document attachments.
 * Think of it like processing a batch of emails and letters for a case, each with
 * their own attachments.
 *
 * TEST WORKFLOW STEPS:
 * 1. 🔐 Authenticate user (log in to the system)
 * 2. 📋 Get available case templates
 * 3. 📁 Create a new case
 * 4. 📄 Get available journal post templates
 * 5. 📥 Create incoming journal posts (received emails/documents)
 * 6. 📤 Create outgoing journal posts (sent emails/documents)
 * 7. 📎 Attach multiple documents to each journal post
 * 8. ✅ Verify all documents were attached successfully
 *
 * WHY WE TEST THIS:
 * This is the most comprehensive test that covers bulk journal post creation
 * with document handling. It tests the system's ability to handle:
 * - High document throughput
 * - Different journal post types (incoming vs outgoing)
 * - Batch operations and concurrent processing
 * - Memory usage with multiple large file attachments
 *
 * REAL-WORLD SCENARIO:
 * A busy office processing morning mail where they create cases for new matters
 * and then log multiple emails, letters, and documents for each case.
 *
 * CONFIGURATION OPTIONS (Environment Variables):
 *  - SCENARIO: Test intensity (smoke_test, load_test, stress_test)
 *  - INCOMING_COUNT: Number of incoming JPs to create per case (default: 2)
 *  - OUTGOING_COUNT: Number of outgoing JPs to create per case (default: 2)
 *  - DOC_COUNT: Number of documents to attach per JP (default: 3)
 *  - USE_BATCH_UPLOAD: Upload all documents at once vs individually (default: true)
 *  - USE_TEST_DOCS: Use real files from testDocuments folder vs synthetic data (default: false)
 *  - APDEX_T: Performance satisfaction threshold in milliseconds for reports
 *
 * QUICK TEST COMMANDS:
 *
 * Basic test (synthetic documents):
 *  k6 run tests/api/journalposts/create-multiple-jp-with-multiple-document.js --vus 1 --duration 30s
 *
 * Smoke test (fast validation):
 *  k6 run tests/api/journalposts/create-multiple-jp-with-multiple-document.js -e SCENARIO=smoke_test --vus 1 --iterations 1
 *
 * Large document test (real files):
 *  k6 run tests/api/journalposts/create-multiple-jp-with-multiple-document.js -e USE_TEST_DOCS=true --vus 2 --duration 1m
 *
 * Custom JP counts:
 *  k6 run tests/api/journalposts/create-multiple-jp-with-multiple-document.js -e INCOMING_COUNT=3 -e OUTGOING_COUNT=3 -e DOC_COUNT=5
 */

import { group } from 'k6';
import { randomSleep } from '../../../src/utils/pacing.js';
import {
  loadTestConfig,
  getK6Options,
  getK6OptionsWithScenarios,
  printConfigSummary
} from '../../../src/lib/config-manager.js';
import { authenticate, createAuthHeaders } from '../../../src/lib/auth-module.js';
import { getTemplates as getCaseTemplates, createCase } from '../../../src/lib/case-module.js';
import { getJpTemplates } from '../../../src/lib/jp-module.js';
import { generateCaseTestData, generateJpTestData } from '../../../src/lib/payload-module.js';
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
  preloadTestDocuments,
  attachDocumentsToJournalPost
} from '../../../src/utils/document-attachment.js';
import {
  initVerboseLogging,
  addVerboseLog,
  generateEnhancedVerboseReport,
  logVUActivity,
  logAuth,
  logJPCreation,
  logDocumentAttachment
} from '../../../src/utils/k6-verbose-logger.js';
import {
  generateIncomingJpPayload,
  generateOutgoingJpPayload,
  createJournalPostWithPayload
} from '../../../src/lib/payload-module.js';
// --- Auto classification flags (added 2025-10-10) ---
if (!__ENV.FLOW_TYPE) {
  __ENV.FLOW_TYPE = 'jp';
}
__ENV.JP_ENDPOINT_HIT = 'true';

// ========================================
// CONFIGURATION FLAGS
// ========================================
const USE_DATA_FILE_CONFIG = true; // Use autotest.json + scenarios if true
const CONFIG_ENVIRONMENT = 'autotest'; // Environment config identifier
const SCENARIO_OVERRIDE = __ENV.SCENARIO || null;

// Number of JPs to create
const INCOMING_COUNT = parseInt(__ENV.INCOMING_COUNT || '2', 10) || 2;
const OUTGOING_COUNT = parseInt(__ENV.OUTGOING_COUNT || '2', 10) || 2;
// Number of documents to attach per JP (only used if USE_TEST_DOCS=false)
const DOC_COUNT = parseInt(__ENV.DOC_COUNT || '3', 10) || 3;
// Batch upload mode (faster)
const USE_BATCH_UPLOAD = (__ENV.USE_BATCH_UPLOAD || 'true').toLowerCase() === 'true';
// Use large test documents from testDocuments folder
const USE_TEST_DOCS = (__ENV.USE_TEST_DOCS || 'false').toLowerCase() === 'true';

// Fallback / inline test configuration
const ORIGINAL_TEST_CONFIG = {
  vus: 1,
  duration: '30s'
  // thresholds removed – centrally injected
};

// Load configuration
const config = loadTestConfig(
  'create-multiplejp-with-multiple-document',
  ORIGINAL_TEST_CONFIG,
  USE_DATA_FILE_CONFIG,
  CONFIG_ENVIRONMENT
);

if (!USE_DATA_FILE_CONFIG) {
  ORIGINAL_TEST_CONFIG.vus = config.users.length || ORIGINAL_TEST_CONFIG.vus;
  config.vus = ORIGINAL_TEST_CONFIG.vus;
}

export const options = USE_DATA_FILE_CONFIG
  ? getK6OptionsWithScenarios(config, SCENARIO_OVERRIDE)
  : getK6Options(config);

// ========================================
// PRELOAD TEST DOCUMENTS (INIT PHASE)
// ========================================
const preloadedTestDocuments = USE_TEST_DOCS ? preloadTestDocuments() : [];

export function setup() {
  console.log('🚀 Starting Create Multiple JPs with Multiple Documents Test');
  console.log(`📥 Incoming JPs: ${INCOMING_COUNT}, 📤 Outgoing JPs: ${OUTGOING_COUNT}`);

  // Initialize verbose logging if enabled
  if (__ENV.VERBOSE === 'true' || __ENV.ENABLE_VERBOSE_REPORT === 'true') {
    initVerboseLogging();
    addVerboseLog('🚀 Starting Create Multiple JPs with Multiple Documents Test');
    addVerboseLog(`📥 Incoming JPs: ${INCOMING_COUNT}, 📤 Outgoing JPs: ${OUTGOING_COUNT}`);
  }

  if (USE_TEST_DOCS) {
    console.log(`📎 Using ${preloadedTestDocuments.length} large test documents from testDocuments folder`);
  } else {
    console.log(`📎 Generating ${DOC_COUNT} synthetic documents per JP`);
  }

  console.log(`📦 Batch upload mode: ${USE_BATCH_UPLOAD}`);
  printConfigSummary(config);

  // Return metadata for HTML report
  return {
    started: true,
    configEnvironment: CONFIG_ENVIRONMENT,
    useDataFileConfig: USE_DATA_FILE_CONFIG,
    testName: 'create-multiplejp-with-multiple-document',
    incomingCount: INCOMING_COUNT,
    outgoingCount: OUTGOING_COUNT,
    docCount: DOC_COUNT,
    useBatchUpload: USE_BATCH_UPLOAD,
    useTestDocs: USE_TEST_DOCS,
    preloadedDocsCount: preloadedTestDocuments.length,
    scenarioOverride: SCENARIO_OVERRIDE,
    baseUrl: config.baseUrl
  };
}

// Payload generation functions moved to src/lib/payload-module.js for reusability

/**
 * Attach documents to a JP using the new utility (wrapper for compatibility)
 */
function attachDocumentsToJp(config, authHeaders, jpId, jpType, vuId, caseId) {
  const testMeta = { testId: Date.now().toString(), vuId };
  const docCount = USE_TEST_DOCS ? preloadedTestDocuments.length : DOC_COUNT;

  return attachDocumentsToJournalPost(config, authHeaders, jpId, {
    documentCount: docCount,
    useBatchUpload: USE_BATCH_UPLOAD,
    preloadedDocuments: preloadedTestDocuments,
    useRealDocuments: USE_TEST_DOCS && preloadedTestDocuments.length > 0,
    baseName: 'PerfTest',
    jpType: jpType,
    vuId: vuId,
    testMeta: testMeta,
    caseId: caseId
  });
}

export default function () {
  const testConfig = config;
  const users = testConfig.users;

  const vuId = `VU${__VU}`;
  const iterationId = `Iter${__ITER}`;
  const testId = `${vuId}-${iterationId}`;

  if (!validateUserData(users, vuId)) {
    return;
  }

  const userIndex = (__VU - 1) % users.length;
  const user = users[userIndex];

  if (!validateUser(user, vuId, userIndex, users.length)) {
    return;
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`🎯 ${vuId}: Starting iteration ${__ITER + 1}`);
  console.log(`${'='.repeat(80)}\n`);

  // Log VU activity for verbose reporting
  logVUActivity(vuId, `Starting iteration ${__ITER + 1}`, `Test ID: ${testId}, User: ${user.username}`);

  // Step 1: Authentication
  logVUActivity(vuId, 'Authenticating user', user.username);
  const authToken = group('Authentication', () => {
    return authenticate(testConfig, user, vuId);
  });
  if (!validateAuthentication(authToken, user, vuId)) {
    logAuth(vuId, user.username, false, 'Authentication validation failed');
    return;
  }
  logAuth(vuId, user.username, true);
  const authHeaders = createAuthHeaders(authToken);

  // Step 2: Get Case Templates
  logVUActivity(vuId, 'Retrieving available case templates');
  const caseTemplates = group('Get Case Templates', () => {
    return getCaseTemplates(testConfig, authHeaders, vuId);
  });
  if (!validateTemplates(caseTemplates, user, vuId, 'case templates')) {
    logVUActivity(vuId, 'Failed to retrieve case templates');
    return;
  }
  logVUActivity(vuId, `Retrieved ${caseTemplates.length} case templates`);

  randomSleep(testConfig);

  // Step 3: Create New Case
  const caseTestData = generateCaseTestData(`PerfTest-${testId}`, vuId);
  logVUActivity(vuId, 'Creating new case', `"${caseTestData.tittel}"`);
  const caseData = group('Create New Case', () => {
    return createCase(testConfig, authHeaders, caseTemplates, caseTestData, vuId);
  });

  if (!validateCaseCreation(caseData, vuId)) {
    logVUActivity(vuId, 'Case creation failed');
    return;
  }
  logVUActivity(vuId, `Case created successfully - ID: ${caseData.id}`);

  randomSleep(testConfig);

  // Step 4: Get JP Templates
  logVUActivity(vuId, `Retrieving JP templates for case ${caseData.id}`);
  const jpTemplates = group('Get JP Templates', () => {
    return getJpTemplates(testConfig, authHeaders, caseData.id, vuId);
  });
  if (!validateTemplates(jpTemplates, user, vuId, 'JP templates')) {
    logVUActivity(vuId, 'Failed to retrieve JP templates');
    return;
  }
  logVUActivity(vuId, `Retrieved ${jpTemplates.length} JP templates for case ${caseData.id}`);

  randomSleep(testConfig);

  // Select template for JPs
  const selectedTemplate = jpTemplates[0];
  console.log(`🎯 ${vuId}: Using JP template: "${selectedTemplate.tittel}" (ID: ${selectedTemplate.id})`);

  // Arrays to store created JPs
  const incomingJPs = [];
  const outgoingJPs = [];

  // Step 5: Create Incoming JPs
  console.log(`\n📥 ${vuId}: Creating ${INCOMING_COUNT} incoming Journal Posts...`);
  logVUActivity(vuId, `Creating ${INCOMING_COUNT} incoming Journal Posts`);
  for (let i = 0; i < INCOMING_COUNT; i++) {
    const jpTestData = generateJpTestData(`Incoming JP ${i + 1} - ${testId}`, vuId);
    logVUActivity(
      vuId,
      `Creating new Incoming Journal Post`,
      `"${jpTestData.tittel}" in case ${caseData.id}`
    );

    const jpPayload = generateIncomingJpPayload(caseData.id, selectedTemplate, jpTestData, testConfig);
    const jpData = group('Create Journal Post', () => {
      return createJournalPostWithPayload(
        testConfig,
        authHeaders,
        caseData.id,
        jpPayload,
        'Incoming',
        jpTestData,
        vuId
      );
    });

    if (jpData && jpData.id) {
      incomingJPs.push(jpData);
      logJPCreation(vuId, 'Incoming', jpTestData.tittel, jpData.id, true);
    } else {
      logJPCreation(vuId, 'Incoming', jpTestData.tittel, 'N/A', false);
    }

    randomSleep(testConfig);
  }

  // Step 6: Create Outgoing JPs
  console.log(`\n📤 ${vuId}: Creating ${OUTGOING_COUNT} outgoing Journal Posts...`);
  logVUActivity(vuId, `Creating ${OUTGOING_COUNT} outgoing Journal Posts`);
  for (let i = 0; i < OUTGOING_COUNT; i++) {
    const jpTestData = generateJpTestData(`Outgoing JP ${i + 1} - ${testId}`, vuId);
    logVUActivity(
      vuId,
      `Creating new Outgoing Journal Post`,
      `"${jpTestData.tittel}" in case ${caseData.id}`
    );

    const jpPayload = generateOutgoingJpPayload(caseData.id, selectedTemplate, jpTestData, testConfig);
    const jpData = group('Create Journal Post', () => {
      return createJournalPostWithPayload(
        testConfig,
        authHeaders,
        caseData.id,
        jpPayload,
        'Outgoing',
        jpTestData,
        vuId
      );
    });

    if (jpData && jpData.id) {
      outgoingJPs.push(jpData);
      logJPCreation(vuId, 'Outgoing', jpTestData.tittel, jpData.id, true);
    } else {
      logJPCreation(vuId, 'Outgoing', jpTestData.tittel, 'N/A', false);
    }

    randomSleep(testConfig);
  }

  // Step 7: Attach documents to all Incoming JPs
  console.log(`\n📎 ${vuId}: Attaching ${DOC_COUNT} documents to each Incoming JP...`);
  const docCountPerJp = USE_TEST_DOCS ? preloadedTestDocuments.length : DOC_COUNT;
  logVUActivity(
    vuId,
    `Attaching documents to ${incomingJPs.length} Incoming JPs`,
    `${docCountPerJp} documents per JP`
  );
  incomingJPs.forEach((jpData, index) => {
    console.log(`\n📥 ${vuId}: Processing Incoming JP ${index + 1}/${incomingJPs.length} (ID: ${jpData.id})`);
    logVUActivity(vuId, `Processing Incoming JP ${index + 1}/${incomingJPs.length}`, `ID: ${jpData.id}`);
    const startTime = Date.now();
    group('Attach Documents to JP', () => {
      attachDocumentsToJp(testConfig, authHeaders, jpData.id, 'Incoming', vuId, caseData.id);
    });
    const duration = Date.now() - startTime;
    logDocumentAttachment(vuId, jpData.id, docCountPerJp, true, duration);
    randomSleep(testConfig);
  });

  // Step 8: Attach documents to all Outgoing JPs
  console.log(`\n📎 ${vuId}: Attaching ${docCountPerJp} documents to each Outgoing JP...`);
  logVUActivity(
    vuId,
    `Attaching documents to ${outgoingJPs.length} Outgoing JPs`,
    `${docCountPerJp} documents per JP`
  );
  outgoingJPs.forEach((jpData, index) => {
    console.log(`\n📤 ${vuId}: Processing Outgoing JP ${index + 1}/${outgoingJPs.length} (ID: ${jpData.id})`);
    logVUActivity(vuId, `Processing Outgoing JP ${index + 1}/${outgoingJPs.length}`, `ID: ${jpData.id}`);
    const startTime = Date.now();
    group('Attach Documents to JP', () => {
      attachDocumentsToJp(testConfig, authHeaders, jpData.id, 'Outgoing', vuId, caseData.id);
    });
    const duration = Date.now() - startTime;
    logDocumentAttachment(vuId, jpData.id, docCountPerJp, true, duration);
    randomSleep(testConfig);
  });

  // Summary
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🏁 ${vuId}: Test Complete`);
  console.log(`   📥 Incoming JPs created: ${incomingJPs.length}/${INCOMING_COUNT}`);
  console.log(`   📤 Outgoing JPs created: ${outgoingJPs.length}/${OUTGOING_COUNT}`);
  console.log(
    `   📎 Documents per JP: ${docCountPerJp}${USE_TEST_DOCS ? ' (test documents)' : ' (synthetic)'}`
  );
  console.log(`   📦 Total documents attached: ${(incomingJPs.length + outgoingJPs.length) * docCountPerJp}`);
  console.log(`${'='.repeat(80)}\n`);

  // Log test completion for verbose reporting
  logVUActivity(
    vuId,
    'Test Complete',
    `${incomingJPs.length + outgoingJPs.length} JPs created, ${(incomingJPs.length + outgoingJPs.length) * docCountPerJp} documents attached`
  );

  randomSleep(testConfig);
}

export function teardown(data) {
  // Stop console capture if verbose reporting was enabled
  if (__ENV.VERBOSE === 'true' || __ENV.ENABLE_VERBOSE_REPORT === 'true') {
    // Verbose logging cleanup (no explicit stop needed for K6 verbose logger)
    console.log(`🔍 Console logging stopped - logs will be retrieved by report generator`);
  }

  performSimpleTeardown('Create Multiple JPs with Multiple Documents');
}

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
    ? `create-multiple-jp-with-multiple-document-${scenarioName}`
    : 'create-multiple-jp-with-multiple-document';
  console.log(`📊 Generating report: ${reportName}-report.html`);

  return performTestSummary('create-multiple-jp-with-multiple-document', data, ORIGINAL_TEST_CONFIG, options);
}
