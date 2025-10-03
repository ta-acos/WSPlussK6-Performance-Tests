/**
 * Test: Create Journal Post with Multiple Documents (Case + JP + N Docs)
 * Steps: authenticate -> create case -> fetch JP templates -> create JP -> attach multiple documents
 * Purpose: Validate end-to-end workflow latency including document attachments.
 *
 * Env Overrides:
 *  - SCENARIO: select load scenario from config (e.g. smoke_test, load_test)
 *  - DOC_COUNT: number of documents to attach per JP (default 3)
 *  - APDEX_T: custom Apdex threshold (ms) for HTML report
 *
 * Quick run:
 *  k6 run tests/create-jp-with-multiple-document.js --vus 1 --duration 10s
 */

import { randomSleep } from '../utils/pacing.js';
import { loadTestConfig, getK6OptionsWithScenarios, getK6Options, printConfigSummary } from '../utils/modules/config-manager.js';
import { authenticate, createAuthHeaders } from '../utils/modules/auth-module.js';
import { getTemplates as getCaseTemplates, createCase, generateCaseTestData } from '../utils/modules/case-module.js';
import { getJpTemplates, createJournalPost, generateJpTestData, attachDocument, attachDocumentsBatch } from '../utils/modules/jp-module.js';
import { generateHtmlReport } from '../utils/report-generator.js';
import { group, check, sleep } from 'k6';
import http from 'k6/http';
import encoding from 'k6/encoding';

// ========================================
// CONFIGURATION FLAGS
// ========================================
const USE_DATA_FILE_CONFIG = true; // Use autotest.json + scenarios if true
const CONFIG_ENVIRONMENT = 'autotest'; // Environment config identifier
const SCENARIO_OVERRIDE = __ENV.SCENARIO || null;

// Number of documents to attach per Journal Post
const DOC_COUNT = parseInt(__ENV.DOC_COUNT || __ENV.DOCUMENTS || '3', 10) || 3;
// Enable/disable attachment phase (helps suppress warnings while endpoint is unknown)
const ENABLE_ATTACH = (__ENV.ENABLE_JP_ATTACH || 'true').toLowerCase() === 'true';
// External file attachments (comma-separated relative paths)
const RAW_DOC_FILES = (__ENV.DOC_FILES || '')
  .split(',')
  .map((p) => p.trim())
  .filter(Boolean);
const DOC_FILE_MODE = (__ENV.DOC_FILE_MODE || 'base64').toLowerCase(); // 'base64' | 'text'
const DOC_FILE_REPEAT = (__ENV.DOC_FILE_REPEAT || 'true').toLowerCase() === 'true';

// Fallback / inline test configuration when data file usage disabled
const ORIGINAL_TEST_CONFIG = {
  vus: 5,
  duration: '10s',
  thresholds: {
    http_req_duration: ['p(95)<3500'],
    http_req_failed: ['rate<0.05'],
    'group_duration{group:::Authentication}': ['p(95)<2000'],
    'group_duration{group:::Get Case Templates}': ['p(95)<2500'],
    'group_duration{group:::Create New Case}': ['p(95)<3000'],
    'group_duration{group:::Get JP Templates}': ['p(95)<3000'],
    'group_duration{group:::Create Journal Post}': ['p(95)<3500'],
    'group_duration{group:::Attach Document to JP}': ['p(95)<3500'],
    'group_duration{group:::Verify JP Documents}': ['p(95)<2000']
  }
};

// Load configuration
const config = loadTestConfig(
  'create-jp-with-multiple-document',
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

export function setup() {
  console.log('🚀 Starting Create JP with Multiple Documents Test');
  console.log(`📎 Documents per JP: ${DOC_COUNT}`);
  printConfigSummary(config);
  return { started: true };
}

// Helper to generate document data objects
// MIME type + size customization via env vars
const DOC_MIME = __ENV.DOC_MIME || 'text/plain';
const DOC_MIME_LIST = (__ENV.DOC_MIME_LIST || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const DOC_SIZE_BASE = parseInt(__ENV.DOC_SIZE_BASE || '512', 10) || 512;
const DOC_SIZE_STEP = parseInt(__ENV.DOC_SIZE_STEP || '10', 10) || 10;

function resolveMime(index) {
  if (DOC_MIME_LIST.length === 0) return DOC_MIME;
  return DOC_MIME_LIST[index % DOC_MIME_LIST.length];
}

function generateDocumentData(baseName, index, testMeta) {
  const timestamp = new Date().toISOString();
  return {
    name: `${baseName}_${index + 1}_${testMeta.testId}.txt`,
    content: `Performance test document #${index + 1} created at ${timestamp} (VU: ${testMeta.vuId})`,
    mimeType: resolveMime(index),
    size: DOC_SIZE_BASE + index * DOC_SIZE_STEP
  };
}

// ===================== FILE ATTACHMENT PRELOAD (init phase) =====================
function guessMime(fileName) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.json')) return 'application/json';
  if (lower.endsWith('.xml')) return 'application/xml';
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'text/html';
  if (lower.endsWith('.csv')) return 'text/csv';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.txt') || lower.endsWith('.log')) return 'text/plain';
  return 'application/octet-stream';
}

const preloadedFileAttachments = RAW_DOC_FILES.map((relPath) => {
  try {
    // Try binary open first for base64, fallback to text
    let rawBinary = null;
    let binaryOk = false;
    try {
      rawBinary = open(relPath, 'b');
      binaryOk = Array.isArray(rawBinary) || rawBinary instanceof Uint8Array;
    } catch (e) {
      // ignore, will fallback to text
    }
    let textContent = null;
    if (!binaryOk) {
      try {
        textContent = open(relPath);
      } catch (e2) {
        console.error(`🔥 Failed to open attachment file '${relPath}': ${e2.message}`);
        return null;
      }
    }
    const fileName = relPath.split(/[/\\]/).pop();
    const mime = guessMime(fileName);
    if (DOC_FILE_MODE === 'base64') {
      let bytes;
      if (binaryOk) {
        bytes = rawBinary;
      } else {
        // convert string to bytes
        bytes = new TextEncoder().encode(textContent);
      }
      const b64 = encoding.b64encode(bytes, { std: 'RFC4648' });
      return {
        name: fileName,
        mimeType: mime,
        size: bytes.length,
        base64Content: b64,
        originalPath: relPath
      };
    } else {
      // text mode
      const content = binaryOk ? '[BINARY-DATA-NOT-CONVERTED]' : textContent;
      return {
        name: fileName,
        mimeType: mime,
        size: content.length,
        content,
        originalPath: relPath
      };
    }
  } catch (err) {
    console.error(`🔥 Unexpected error preloading '${relPath}': ${err.message}`);
    return null;
  }
}).filter(Boolean);

if (preloadedFileAttachments.length > 0) {
  console.log(
    `📎 Preloaded ${preloadedFileAttachments.length} external attachment file(s) (mode=${DOC_FILE_MODE}, repeat=${DOC_FILE_REPEAT})`
  );
}

export default function () {
  // Reuse global config to avoid repeated init logs (reduces console noise)
  const testConfig = config;
  const users = testConfig.users;

  if (!users || users.length === 0) {
    console.error('🔥 No users loaded for multi-doc JP test');
    return;
  }

  const userIndex = (__VU - 1) % users.length;
  const user = users[userIndex];
  const vuId = `VU${__VU}`;

  if (!user?.UserName || !user?.ClientID || !user?.ClientSecret) {
    console.error(`❌ ${vuId}: Invalid user record`, user);
    return;
  }

  // Authenticate
  const accessToken = authenticate(testConfig, user, vuId);
  if (!accessToken) {
    console.error(`❌ ${vuId}: Token acquisition failed`);
    return;
  }
  const authHeaders = createAuthHeaders(accessToken);

  // Case templates
  const caseTemplates = getCaseTemplates(testConfig, authHeaders, vuId);
  if (caseTemplates.length === 0) {
    console.error(`❌ ${vuId}: No case templates retrieved`);
    return;
  }

  // Prefer template titled "Ny sak"
  const nySakTemplate = caseTemplates.find((t) => (t.tittel || '').toLowerCase() === 'ny sak');
  const selectedCaseTemplate = nySakTemplate || caseTemplates[0];

  // Case data
  const caseTestData = generateCaseTestData('PerfTestCaseMultiDoc', vuId);
  const caseData = createCase(
    testConfig,
    authHeaders,
    caseTemplates,
    caseTestData,
    vuId,
    selectedCaseTemplate
  );
  if (!caseData || !caseData.id) {
    console.error(`❌ ${vuId}: Case creation failed`);
    return;
  }

  // JP templates
  const jpTemplates = getJpTemplates(testConfig, authHeaders, caseData.id, vuId);
  if (jpTemplates.length === 0) {
    console.error(`❌ ${vuId}: No JP templates available`);
    return;
  }

  // Prefer template containing "utgående"
  const outgoingTemplate = jpTemplates.find((t) => (t.tittel || '').toLowerCase().includes('utgående'));
  if (outgoingTemplate) {
    const idx = jpTemplates.indexOf(outgoingTemplate);
    if (idx > 0) jpTemplates.unshift(jpTemplates.splice(idx, 1)[0]);
  }

  // JP test data
  const jpTestData = generateJpTestData('PerfTestJP-MultiDoc', vuId);
  const jpData = createJournalPost(testConfig, authHeaders, caseData.id, jpTemplates, jpTestData, vuId);
  if (!jpData || !jpData.id) {
    console.warn(`⚠️ ${vuId}: JP creation returned no ID - skipping document attachments`);
    randomSleep(0.3, 1.1);
    return;
  }

  let attachedCount = 0;
  if (ENABLE_ATTACH) {
    // WebSak API supports multiple documents using dokuments[] array structure!
    // We can upload all documents in a single batch request OR one by one
    
    const USE_BATCH_UPLOAD = (__ENV.USE_BATCH_UPLOAD || 'true').toLowerCase() === 'true';
    
    if (USE_BATCH_UPLOAD && DOC_COUNT > 1) {
      // Batch upload: Send all documents in one request
      console.log(`📦 ${vuId}: Preparing batch upload of ${DOC_COUNT} documents`);
      
      const documentsArray = [];
      for (let i = 0; i < DOC_COUNT; i++) {
        let docData;
        if (preloadedFileAttachments.length > 0) {
          if (i < preloadedFileAttachments.length) {
            docData = preloadedFileAttachments[i];
          } else if (DOC_FILE_REPEAT) {
            docData = preloadedFileAttachments[i % preloadedFileAttachments.length];
          } else {
            docData = generateDocumentData(jpTestData.documentName.replace('.txt', ''), i, {
              testId: jpTestData.testId,
              vuId
            });
          }
        } else {
          docData = generateDocumentData(jpTestData.documentName.replace('.txt', ''), i, {
            testId: jpTestData.testId,
            vuId
          });
        }
        documentsArray.push(docData);
      }
      
      // Perform batch upload
      const batchSuccess = attachDocumentsBatch(testConfig, authHeaders, jpData.id, documentsArray, vuId, 0);
      if (batchSuccess) {
        attachedCount = DOC_COUNT;
      } else {
        console.error(`❌ ${vuId}: Batch upload failed`);
      }
      
    } else {
      // Individual upload: Send documents one by one
      console.log(`📄 ${vuId}: Uploading ${DOC_COUNT} document(s) individually`);
      
      for (let i = 0; i < DOC_COUNT; i++) {
        let docData;
        if (preloadedFileAttachments.length > 0) {
          if (i < preloadedFileAttachments.length) {
            docData = preloadedFileAttachments[i];
          } else if (DOC_FILE_REPEAT) {
            docData = preloadedFileAttachments[i % preloadedFileAttachments.length];
          } else {
            docData = generateDocumentData(jpTestData.documentName.replace('.txt', ''), i, {
              testId: jpTestData.testId,
              vuId
            });
          }
        } else {
          docData = generateDocumentData(jpTestData.documentName.replace('.txt', ''), i, {
            testId: jpTestData.testId,
            vuId
          });
        }
        
        const isMainDocument = (i === 0);
        const attached = attachDocument(testConfig, authHeaders, jpData.id, docData, vuId, i, isMainDocument);
        if (!attached) {
          const suppressWarn = (__ENV.SUPPRESS_JP_ATTACH_WARN || '').toLowerCase() === 'true';
          const msg = `JP attachment attempt #${i + 1} failed. Early exit.`;
          if (suppressWarn) {
            console.log(`ℹ️ ${vuId}: ${msg}`);
          } else {
            console.warn(`⚠️ ${vuId}: ${msg}`);
          }
          break;
        }
        attachedCount++;
      }
    }

    // Verification step only if at least one attachment succeeded
    if (attachedCount > 0) {
      // Small delay to allow backend to process attachments
      sleep(0.5);
      
      group('Verify JP Documents', () => {
        const listTemplate = testConfig.apiConfig.endpoints.jpDocuments || `${testConfig.apiConfig.endpoints.innholdJp}{jpId}/dokumenter`;
        const listPath = listTemplate.replace(/\{jpId\}/g, jpData.id);
        const listUrl = `${testConfig.baseUrl}${listPath}`;
        
        console.log(`🔍 ${vuId}: Verifying documents at: ${listUrl}`);
        
        const listResp = http.get(listUrl, {
          headers: authHeaders,
          timeout: '30s',
          tags: { name: '📄 List JP Documents', endpoint: 'jp:listDocuments', jp_id: jpData.id, url: listUrl }
        });
        
        // Log response details before check (check might suppress errors)
        if (listResp.status !== 200) {
          console.error(`🔥 ${vuId}: Document list request failed - Status: ${listResp.status}`);
          console.error(`📥 Response Body: ${listResp.body?.slice(0, 500)}`);
        }
        
        const ok = check(listResp, {
          'list_docs: status 200': (r) => r.status === 200,
          'list_docs: has parseable response': (r) => {
            try {
              const body = JSON.parse(r.body);
              // Accept various response structures: array, { data: [] }, { documents: [] }, { dokumenter: [] }, etc.
              const isValid = Array.isArray(body) || 
                             Array.isArray(body?.data) || 
                             Array.isArray(body?.documents) ||
                             Array.isArray(body?.dokumenter) ||  // Norwegian: "documents"
                             Array.isArray(body?.items) ||
                             Array.isArray(body?.result);
              return isValid;
            } catch (e) {
              console.error(`🔥 ${vuId}: Document list parse error: ${e.message}`);
              return false;
            }
          }
        });
        
        if (ok) {
          try {
            const parsed = JSON.parse(listResp.body);
            // Try multiple possible array locations (including Norwegian "dokumenter")
            const docs = Array.isArray(parsed) ? parsed : 
                        (parsed.data || parsed.documents || parsed.dokumenter || parsed.items || parsed.result || []);
            
            if (Array.isArray(docs)) {
              const expectedCount = attachedCount; // Expect the number of documents we uploaded
              if (docs.length === expectedCount) {
                console.log(`✅ ${vuId}: Verified ${docs.length} document(s) (attached ${attachedCount}) - Perfect match!`);
              } else if (docs.length < expectedCount) {
                console.error(`❌ ${vuId}: Document list (${docs.length}) less than expected (${expectedCount})`);
                console.error(`   Some documents may have failed to upload. Check API response and logs.`);
              } else if (docs.length > expectedCount) {
                console.log(`ℹ️ ${vuId}: Found ${docs.length} documents (expected ${expectedCount}) - may include pre-existing documents`);
              }
            } else {
              console.warn(`⚠️ ${vuId}: Could not find document array in response`);
            }
          } catch (e) {
            console.warn(`⚠️ ${vuId}: Could not parse document listing response: ${e.message}`);
          }
        } else {
          console.warn(`⚠️ ${vuId}: Could not verify documents for JP ${jpData.id}. Check the endpoint configuration.`);
        }
      });
    }
  } else {
    console.log(`ℹ️ ${vuId}: Attachment phase disabled (ENABLE_JP_ATTACH=false)`);
  }

  randomSleep(0.3, 1.1);
}

export function teardown() {
  console.log('🏁 Create JP with Multiple Documents Test complete');
}

export function handleSummary(data) {
  const apdexEnv = __ENV.APDex_T || __ENV.APDEX_T;
  const apdexT = apdexEnv ? parseInt(apdexEnv, 10) : 500;
  const html = generateHtmlReport(data, { apdexT });
  // Relative paths that work when running from repo root or k6-tests directory
  return {
    'reports/create-jp-with-multiple-document-summary.json': JSON.stringify(data, null, 2),
    'reports/create-jp-with-multiple-document-report.html': html,
    stdout: ''
  };
}
