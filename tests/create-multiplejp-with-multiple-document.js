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

import { randomSleep } from '../utils/pacing.js';
import {
  loadTestConfig,
  getK6OptionsWithScenarios,
  getK6Options,
  printConfigSummary
} from '../utils/modules/config-manager.js';
import { authenticate, createAuthHeaders } from '../utils/modules/auth-module.js';
import {
  getTemplates as getCaseTemplates,
  createCase,
  generateCaseTestData
} from '../utils/modules/case-module.js';
import {
  getJpTemplates,
  createJournalPost,
  attachDocumentsBatch,
  attachDocument
} from '../utils/modules/jp-module.js';
import { generateHtmlReport } from '../utils/report-generator.js';
import { injectErrorAnalyticsIntoSummary } from '../utils/error-sampler.js';
import { injectErrorAnalytics } from '../utils/error-tracker.js';
import { group, check, sleep } from 'k6';
import http from 'k6/http';
import encoding from 'k6/encoding';

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
let preloadedTestDocuments = [];

if (USE_TEST_DOCS) {
  console.log('📂 Preloading test documents from testDocuments folder...');

  // Get test document paths from config
  const testDocConfig = config?.testDocuments || {
    basePath: '../utils/modules/data/testDocuments',
    files: [
      '1mb.pdf',
      '1mb.docx',
      '3-mb.pdf',
      '5mb.docx',
      '6mb.pdf',
      '10mb.pdf',
      '10mb.docx',
      'PerfTestingGuide.docx',
      'PerfTestScenarios.xlsx',
      'benchmarks.csv'
    ]
  };

  const testDocPaths = testDocConfig.files.map(
    (fileName) => `${testDocConfig.basePath}/${fileName}`
  );

  testDocPaths.forEach((filePath) => {
    try {
      const fileData = open(filePath, 'b'); // Open as binary
      const fileName = filePath.split('/').pop();

      // Determine MIME type based on file extension
      let mimeType = 'application/octet-stream';
      if (fileName.endsWith('.pdf')) {
        mimeType = 'application/pdf';
      } else if (fileName.endsWith('.docx')) {
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      } else if (fileName.endsWith('.xlsx')) {
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      } else if (fileName.endsWith('.csv')) {
        mimeType = 'text/csv';
      }

      preloadedTestDocuments.push({
        name: fileName,
        binaryData: fileData,
        mimeType: mimeType,
        tittel: fileName.replace(/\.[^/.]+$/, ''), // Remove extension for title
        size: fileData.length || 0
      });

      console.log(`   ✅ Loaded: ${fileName} (${mimeType})`);
    } catch (e) {
      console.warn(`   ⚠️  Failed to load ${filePath}: ${e.message}`);
    }
  });

  console.log(`📦 Preloaded ${preloadedTestDocuments.length} test documents`);
}

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

/**
 * Generate Incoming Journal Post creation payload
 * Based on the user-provided incoming JP structure
 */
function generateIncomingJpPayload(caseId, selectedTemplate, testData, config) {
  const jpConfig = config?.apiConfig?.jpConfig || {};

  // Get current date in ISO format with timezone
  const currentDate = new Date();
  const brevDato = currentDate.toISOString().split('T')[0] + 'T00:00:00+02:00';

  // Calculate forfallsDato (21 days from now)
  const forfallsDate = new Date(currentDate);
  forfallsDate.setDate(forfallsDate.getDate() + 21);
  const forfallsDato = forfallsDate.toISOString().split('T')[0] + 'T00:00:00+02:00';

  return {
    sakId: Number(caseId),
    malId: selectedTemplate.id,
    tekstMalId: -1, // As per user's incoming payload
    journalpost: {
      id: -1,
      tittel1: testData.jpName || 'test incoming tit',
      tittel2: testData.jpDescription || 'incoming document test',
      dokTypeId: 1, // Incoming document type
      dokStatusId: 7, // Incoming status
      brevDato: brevDato,
      forfallsDato: forfallsDato,
      mottakere: [],
      kopiMottakere: [],
      nyeKopiMottakere: [
        {
          id: jpConfig.kopiMottakerId || 33,
          sdmId: -1,
          erIdentitet: true,
          navn: jpConfig.kopiMottakerNavn || 'TestAutomation - Saksbehandler',
          epost: jpConfig.kopiMottakerEpost || 'testautomation_u3@acosdemo.onmicrosoft.com',
          gidId: jpConfig.kopiMottakerId || 33,
          offentligNummer: '',
          telefon: '12345678',
          adresse: '',
          adresse2: '',
          adresse3: '',
          adresse4: '',
          postnr: '',
          poststed: '',
          landId: '',
          erPersonNavn: true,
          attention: null,
          referanse: null,
          digitaltReservert: null,
          krrStatus: null,
          gradert: false
        }
      ],
      nyeMottakere: [
        {
          id: jpConfig.mottakerId || 31,
          sdmId: -1,
          erIdentitet: true,
          navn: jpConfig.mottakerNavn || 'TestAutomation - Arkivar',
          epost: jpConfig.mottakerEpost || 'testcomplete4@acosdemo.onmicrosoft.com',
          gidId: jpConfig.mottakerId || 31,
          offentligNummer: '',
          telefon: '',
          adresse: '',
          adresse2: '',
          adresse3: '',
          adresse4: '',
          postnr: '',
          poststed: '',
          landId: '',
          erPersonNavn: true,
          attention: null,
          referanse: null,
          digitaltReservert: null,
          krrStatus: null,
          gradert: false
        }
      ],
      aktivtTilleggsdataSett: null,
      noekkelord: [],
      admEnhet: jpConfig.admEnhet || 4,
      saksbehandlerId: jpConfig.saksbehandlerId || 31,
      kategori: -1,
      setJournaldato: false,
      setBrevdato: false
    },
    standardTekster: []
  };
}

/**
 * Generate Outgoing Journal Post creation payload
 * Uses the standard outgoing JP structure
 */
function generateOutgoingJpPayload(caseId, selectedTemplate, testData, config) {
  const jpConfig = config?.apiConfig?.jpConfig || {};

  const currentDate = new Date();
  const brevDato = currentDate.toISOString().split('T')[0] + 'T00:00:00+02:00';

  return {
    sakId: Number(caseId),
    malId: selectedTemplate.id,
    tekstMalId: selectedTemplate.id,
    journalpost: {
      id: -1,
      tittel1: testData.jpName,
      tittel2: testData.jpDescription,
      dokTypeId: jpConfig.dokTypeId || 4, // Outgoing document type
      dokStatusId: jpConfig.dokStatusId || 6, // Outgoing status
      brevDato: brevDato,
      forfallsDato: null,
      mottakere: [],
      kopiMottakere: [],
      nyeKopiMottakere: [],
      nyeMottakere: [],
      aktivtTilleggsdataSett: null,
      noekkelord: [],
      admEnhet: jpConfig.admEnhet || 4,
      saksbehandlerId: jpConfig.saksbehandlerId || 31,
      kategori: -1,
      setJournaldato: false,
      setBrevdato: false
    },
    standardTekster: [
      {
        key: 'Start',
        id: jpConfig.standardTexterId || 42
      }
    ]
  };
}

/**
 * Create a Journal Post with custom payload
 */
function createJournalPostWithPayload(config, authHeaders, caseId, jpPayload, jpType, testData, vuId) {
  let jpData = null;

  const groupName = `Create ${jpType} JP`;
  group(groupName, () => {
    console.log(`📝 ${vuId}: Creating new ${jpType} Journal Post "${testData.jpName}" in case ${caseId}`);

    const createUrl = `${config.baseUrl}${config.apiConfig.endpoints.jpny}`;
    console.log(`🔗 ${vuId}: JP create URL: ${createUrl}`);

    const createResponse = http.post(createUrl, JSON.stringify(jpPayload), {
      headers: authHeaders,
      timeout: '30s',
      tags: {
        name: `✉️ Create ${jpType} Journal Post`,
        endpoint: 'jp:create',
        group: 'jp',
        method: 'POST',
        case_id: caseId,
        jp_type: jpType,
        url: createUrl
      }
    });

    const createSuccess = check(createResponse, {
      'create_jp: status is 200 or 201': (r) => {
        if (r.status !== 200 && r.status !== 201) {
          console.error(`🔥 ${vuId}: ${jpType} JP creation failed - Status: ${r.status}`);
          console.error(`📥 Response Body: ${r.body}`);
        }
        return r.status === 200 || r.status === 201;
      },
      'create_jp: response time < 3s': (r) => r.timings.duration < 3000
    });

    if (createResponse.status === 200 || createResponse.status === 201) {
      try {
        const createBody = createResponse.body ? JSON.parse(createResponse.body) : {};

        // Extract JP ID
        let jpId = createBody.id || createBody.jpId || createBody.journalpostId;
        if (!jpId && createBody.journalpost) {
          jpId = createBody.journalpost.id || createBody.journalpost.jpId;
        }
        if (!jpId && createBody.data) {
          jpId = createBody.data.id || createBody.data.jpId || createBody.data.journalpostId;
        }
        if (!jpId && createResponse.headers && createResponse.headers['Location']) {
          const loc = createResponse.headers['Location'];
          const match = loc.match(/(\d+)(?!.*\d)/);
          if (match) jpId = match[1];
        }

        jpData = {
          id: jpId,
          caseId: caseId,
          name: testData.jpName,
          description: testData.jpDescription,
          type: jpType,
          response: createBody
        };

        if (jpId) {
          console.log(`✅ ${vuId}: ${jpType} Journal Post created successfully - ID: ${jpId}`);
        } else {
          console.log(`✅ ${vuId}: ${jpType} Journal Post created successfully - ID not returned`);
        }
      } catch (e) {
        console.log(`✅ ${vuId}: ${jpType} JP creation successful (response parse issue)`);
        jpData = {
          id: null,
          caseId: caseId,
          name: testData.jpName,
          description: testData.jpDescription,
          type: jpType,
          response: null
        };
      }
    }
  });

  return jpData;
}

/**
 * Generate document data
 * If USE_TEST_DOCS is true, returns a preloaded test document
 * Otherwise, generates synthetic document data
 */
function generateDocumentData(baseName, index, jpType, testMeta) {
  if (USE_TEST_DOCS && preloadedTestDocuments.length > 0) {
    // Use preloaded test documents (cycle through them)
    const docIndex = index % preloadedTestDocuments.length;
    const testDoc = preloadedTestDocuments[docIndex];

    return {
      name: testDoc.name,
      binaryData: testDoc.binaryData,
      mimeType: testDoc.mimeType,
      tittel: `${jpType}-${testDoc.tittel}`,
      size: testDoc.size
    };
  } else {
    // Generate synthetic document
    const timestamp = new Date().toISOString();
    return {
      name: `${baseName}_${jpType}_doc${index + 1}_${testMeta.testId}.txt`,
      content: `Performance test ${jpType} document #${index + 1} created at ${timestamp} (VU: ${testMeta.vuId})`,
      mimeType: 'text/plain',
      tittel: `${jpType} Document ${index + 1}`,
      size: 512 + index * 10
    };
  }
}

/**
 * Attach documents to a JP (batch or individual)
 */
function attachDocumentsToJp(config, authHeaders, jpId, jpType, vuId) {
  const testMeta = { testId: Date.now().toString(), vuId };

  // Determine number of documents to attach
  const docCount = USE_TEST_DOCS ? preloadedTestDocuments.length : DOC_COUNT;

  group('Attach Documents to JP', () => {
    if (USE_BATCH_UPLOAD && docCount > 1) {
      // Batch upload mode
      console.log(`📦 ${vuId}: Preparing batch upload of ${docCount} documents for ${jpType} JP ${jpId}`);

      const documentsArray = [];
      for (let i = 0; i < docCount; i++) {
        documentsArray.push(generateDocumentData('PerfTest', i, jpType, testMeta));
      }

      const success = attachDocumentsBatch(config, authHeaders, jpId, documentsArray, vuId, 0);

      if (success) {
        console.log(`✅ ${vuId}: ${docCount} documents attached to ${jpType} JP ${jpId}`);
      } else {
        console.error(`❌ ${vuId}: Failed to attach documents to ${jpType} JP ${jpId}`);
      }
    } else {
      // Individual upload mode
      console.log(`📎 ${vuId}: Attaching ${docCount} documents individually to ${jpType} JP ${jpId}`);

      let attachedCount = 0;
      for (let i = 0; i < docCount; i++) {
        const docData = generateDocumentData('PerfTest', i, jpType, testMeta);
        const success = attachDocument(config, authHeaders, jpId, docData, vuId, i, i === 0);

        if (success) {
          attachedCount++;
        }
      }

      console.log(`✅ ${vuId}: ${attachedCount}/${docCount} documents attached to ${jpType} JP ${jpId}`);
    }
  });
}

export default function () {
  const testConfig = config;
  const users = testConfig.users;

  if (!users || users.length === 0) {
    console.error('🔥 No users loaded for multiple JP test');
    return;
  }

  const userIndex = (__VU - 1) % users.length;
  const user = users[userIndex];
  const vuId = `VU${__VU}`;
  const iterationId = `Iter${__ITER}`;
  const testId = `${vuId}-${iterationId}`;

  if (!user?.UserName || !user?.ClientID || !user?.ClientSecret) {
    console.error(`❌ ${vuId}: Invalid user record`, user);
    return;
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`🎯 ${vuId}: Starting iteration ${__ITER + 1}`);
  console.log(`${'='.repeat(80)}\n`);

  // Step 1: Authentication
  const authToken = authenticate(testConfig, user, vuId);
  if (!authToken) {
    console.error(`❌ ${vuId}: Token acquisition failed`);
    return;
  }
  const authHeaders = createAuthHeaders(authToken);

  // Step 2: Get Case Templates
  const caseTemplates = getCaseTemplates(testConfig, authHeaders, vuId);
  if (caseTemplates.length === 0) {
    console.error(`❌ ${vuId}: No case templates retrieved`);
    return;
  }

  randomSleep(testConfig);

  // Step 3: Create New Case
  const caseTestData = generateCaseTestData(`PerfTest-${testId}`, vuId);
  const caseData = createCase(testConfig, authHeaders, caseTemplates, caseTestData, vuId);

  if (!caseData || !caseData.id) {
    console.error(`❌ ${vuId}: Case creation failed`);
    return;
  }

  randomSleep(testConfig);

  // Step 4: Get JP Templates
  const jpTemplates = getJpTemplates(testConfig, authHeaders, caseData.id, vuId);
  if (jpTemplates.length === 0) {
    console.error(`❌ ${vuId}: No JP templates retrieved`);
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
    const jpTestData = {
      jpName: `Incoming JP ${i + 1} - ${testId}`,
      jpDescription: `Performance test incoming JP ${i + 1}`
    };

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
    const jpTestData = {
      jpName: `Outgoing JP ${i + 1} - ${testId}`,
      jpDescription: `Performance test outgoing JP ${i + 1}`
    };

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
  console.log('\n🏁 Create Multiple JPs with Multiple Documents Test complete');
}

export function handleSummary(data) {
  // Call old method first (for group breakdown, but returns empty error arrays due to k6 limitation)
  injectErrorAnalyticsIntoSummary(data);
  
  // Then inject error analytics using NEW k6 metrics-based tracker
  // This WILL capture errors because it uses k6 Custom Metrics and will OVERWRITE the empty arrays!
  injectErrorAnalytics(data);

  const apdexEnv = __ENV.APDEX_T || __ENV.APDex_T;
  const apdexT = apdexEnv ? parseInt(apdexEnv, 10) : 500;
  const html = generateHtmlReport(data, { apdexT });
  // Relative paths that work when running from repo root or k6-tests directory
  return {
    'reports/create-multiplejp-with-multiple-document-summary.json': JSON.stringify(data, null, 2),
    'reports/create-multiplejp-with-multiple-document-report.html': html,
    stdout: ''
  };
}
