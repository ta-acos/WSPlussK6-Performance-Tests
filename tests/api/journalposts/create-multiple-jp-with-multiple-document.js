/**
 * Test: Create Multiple Journal Posts (Incoming & Outgoing) with Multiple Documents
 * Steps: authenticate -> create case -> create 2 incoming JPs + 2 outgoing JPs -> attach 3 documents to each
 * Purpose: Validate bulk JP creation workflow with document attachments for both incoming and outgoing JPs.
 *
 * Env Overrides:
 *  - SCENARIO: select load scenario from config (e.g. smoke_test, load_test)
 *  - INCOMING_COUNT: number of incoming JPs to create (default 2)
 *  - OUTGOING_COUNT: number of outgoing JPs to create (default 2)
 *  - DOC_COUNT: number of documents to attach per JP (default 3)
 *  - USE_BATCH_UPLOAD: use batch upload for documents (default true)
 *  - USE_TEST_DOCS: attach large test documents from testDocuments folder (default false)
 *  - APDEX_T: custom Apdex threshold (ms) for HTML report
 *
 * Quick run:
 *  k6 run tests/create-multiplejp-with-multiple-document.js -e SCENARIO=smoke_test -e INCOMING_COUNT=2 -e OUTGOING_COUNT=2 -e DOC_COUNT=3 --vus 1 --iterations 1
 *
 * With large test documents:
 *  k6 run tests/create-multiplejp-with-multiple-document.js -e INCOMING_COUNT=2 -e OUTGOING_COUNT=2 -e USE_TEST_DOCS=true --vus 1 --iterations 1
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
  generateIncomingJpPayload,
  generateOutgoingJpPayload,
  createJournalPostWithPayload
} from '../../../src/lib/payload-module.js';

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
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<3500'],
    http_req_failed: ['rate<0.05'],
    'group_duration{group:::Authentication}': ['p(95)<2000'],
    'group_duration{group:::Get Case Templates}': ['p(95)<2500'],
    'group_duration{group:::Create New Case}': ['p(95)<3000'],
    'group_duration{group:::Get JP Templates}': ['p(95)<3000'],
    'group_duration{group:::Create Incoming JP}': ['p(95)<3500'],
    'group_duration{group:::Create Outgoing JP}': ['p(95)<3500'],
    'group_duration{group:::Attach Documents to JP}': ['p(95)<5000']
  }
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
function attachDocumentsToJp(config, authHeaders, jpId, jpType, vuId) {
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
    testMeta: testMeta
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

  // Step 1: Authentication
  const authToken = authenticate(testConfig, user, vuId);
  if (!validateAuthentication(authToken, user, vuId)) {
    return;
  }
  const authHeaders = createAuthHeaders(authToken);

  // Step 2: Get Case Templates
  const caseTemplates = getCaseTemplates(testConfig, authHeaders, vuId);
  if (!validateTemplates(caseTemplates, user, vuId, 'case templates')) {
    return;
  }

  randomSleep(testConfig);

  // Step 3: Create New Case
  const caseTestData = generateCaseTestData(`PerfTest-${testId}`, vuId);
  const caseData = createCase(testConfig, authHeaders, caseTemplates, caseTestData, vuId);

  if (!validateCaseCreation(caseData, vuId)) {
    return;
  }

  randomSleep(testConfig);

  // Step 4: Get JP Templates
  const jpTemplates = getJpTemplates(testConfig, authHeaders, caseData.id, vuId);
  if (!validateTemplates(jpTemplates, user, vuId, 'JP templates')) {
    return;
  }

  randomSleep(testConfig);

  // Select template for JPs
  const selectedTemplate = jpTemplates[0];
  console.log(`🎯 ${vuId}: Using JP template: "${selectedTemplate.tittel}" (ID: ${selectedTemplate.id})`);

  // Arrays to store created JPs
  const incomingJPs = [];
  const outgoingJPs = [];

  // Step 5: Create Incoming JPs
  console.log(`\n📥 ${vuId}: Creating ${INCOMING_COUNT} incoming Journal Posts...`);
  for (let i = 0; i < INCOMING_COUNT; i++) {
    const jpTestData = generateJpTestData(`Incoming JP ${i + 1} - ${testId}`, vuId);

    const jpPayload = generateIncomingJpPayload(caseData.id, selectedTemplate, jpTestData, testConfig);
    const jpData = createJournalPostWithPayload(
      testConfig,
      authHeaders,
      caseData.id,
      jpPayload,
      'Incoming',
      jpTestData,
      vuId
    );

    if (jpData && jpData.id) {
      incomingJPs.push(jpData);
    }

    randomSleep(testConfig);
  }

  // Step 6: Create Outgoing JPs
  console.log(`\n📤 ${vuId}: Creating ${OUTGOING_COUNT} outgoing Journal Posts...`);
  for (let i = 0; i < OUTGOING_COUNT; i++) {
    const jpTestData = generateJpTestData(`Outgoing JP ${i + 1} - ${testId}`, vuId);

    const jpPayload = generateOutgoingJpPayload(caseData.id, selectedTemplate, jpTestData, testConfig);
    const jpData = createJournalPostWithPayload(
      testConfig,
      authHeaders,
      caseData.id,
      jpPayload,
      'Outgoing',
      jpTestData,
      vuId
    );

    if (jpData && jpData.id) {
      outgoingJPs.push(jpData);
    }

    randomSleep(testConfig);
  }

  // Step 7: Attach documents to all Incoming JPs
  console.log(`\n📎 ${vuId}: Attaching ${DOC_COUNT} documents to each Incoming JP...`);
  incomingJPs.forEach((jpData, index) => {
    console.log(`\n📥 ${vuId}: Processing Incoming JP ${index + 1}/${incomingJPs.length} (ID: ${jpData.id})`);
    attachDocumentsToJp(testConfig, authHeaders, jpData.id, 'Incoming', vuId);
    randomSleep(testConfig);
  });

  // Step 8: Attach documents to all Outgoing JPs
  console.log(`\n📎 ${vuId}: Attaching ${DOC_COUNT} documents to each Outgoing JP...`);
  outgoingJPs.forEach((jpData, index) => {
    console.log(`\n📤 ${vuId}: Processing Outgoing JP ${index + 1}/${outgoingJPs.length} (ID: ${jpData.id})`);
    attachDocumentsToJp(testConfig, authHeaders, jpData.id, 'Outgoing', vuId);
    randomSleep(testConfig);
  });

  // Summary
  const docCountPerJp = USE_TEST_DOCS ? preloadedTestDocuments.length : DOC_COUNT;
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🏁 ${vuId}: Test Complete`);
  console.log(`   📥 Incoming JPs created: ${incomingJPs.length}/${INCOMING_COUNT}`);
  console.log(`   📤 Outgoing JPs created: ${outgoingJPs.length}/${OUTGOING_COUNT}`);
  console.log(
    `   📎 Documents per JP: ${docCountPerJp}${USE_TEST_DOCS ? ' (test documents)' : ' (synthetic)'}`
  );
  console.log(`   📦 Total documents attached: ${(incomingJPs.length + outgoingJPs.length) * docCountPerJp}`);
  console.log(`${'='.repeat(80)}\n`);

  randomSleep(testConfig);
}

export function teardown(data) {
  performSimpleTeardown('Create Multiple JPs with Multiple Documents');
}

export function handleSummary(data) {
  return performTestSummary('create-multiplejp-with-multiple-document', data, ORIGINAL_TEST_CONFIG, {
    USE_DATA_FILE_CONFIG,
    CONFIG_ENVIRONMENT,
    includeErrorAnalytics: true
  });
}
